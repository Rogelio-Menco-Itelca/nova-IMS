import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  signal,
  computed,
  inject,
  OnDestroy,
  OnInit,
  AfterViewInit,
  effect,
  NgZone,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Incident,
  IncidentStatus,
  IncidentPriority,
  isVisibleInActiveViews,
  isHiddenByDefaultInIncidentList,
  catalogStatusToUiStatus,
  incidentMatchesCatalogStatus,
  incidentIdSortKey,
  type CatalogOption,
} from '../../models/incident.model';
import { NotificationService } from '../../services/notification.service';
import { IncidentService } from '../../services/incident.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { AuditClientService } from '../../services/audit-client.service';
import { IncidentEmailModalComponent } from '../incident-email-modal/incident-email-modal.component';
import { createMapPin, isGoogleMapsLoaded, MapPin } from '../../utils/google-maps-legacy';
import { loadGoogleMaps } from '../../utils/google-maps-loader';
import { hasValidIncidentCoords } from '../../utils/incident-location-coords';
import {
  clampMapZoomAfterCountryFit,
  colombiaMapViewportOptions,
  fitMapToColombia,
  IMS_DEFAULT_MAP_CENTER,
  IMS_MAP_ZOOM,
  googleMapsCountryRestriction,
} from '../../utils/ims-geo.constants';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule, IncidentEmailModalComponent],
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  readonly incidentService = inject(IncidentService);
  private readonly authService = inject(AuthService);
  private readonly permissionService = inject(PermissionService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auditClient = inject(AuditClientService);
  private readonly http = inject(HttpClient);
  private readonly host = inject(ElementRef<HTMLElement>);

  emailModalIncident = signal<Incident | null>(null);

  canNotify(): boolean {
    return this.permissionService.canNotify();
  }

  canViewIncident(): boolean {
    return this.permissionService.canViewIncident('Dashboard');
  }

  private dashboardMap: google.maps.Map | null = null;
  private readonly dashboardMarkers = new Map<
    string,
    {
      marker: MapPin;
      infoWindow: google.maps.InfoWindow;
    }
  >();
  private dashboardInfoWindow: google.maps.InfoWindow | null = null;
  private dashboardMapClickListener: google.maps.MapsEventListener | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  private dashboardMapResizeObserver: ResizeObserver | null = null;
  private dashboardListResizeObserver: ResizeObserver | null = null;
  private onDestroyDashboardListResize: (() => void) | null = null;

  @ViewChild('dashboardMapHost') dashboardMapHost?: ElementRef<HTMLElement>;

  incidents = this.incidentService.incidents;
  filterText = signal('');
  filterStatus = signal('');
  incidentStatuses = signal<CatalogOption[]>([]);
  dashboardStatusFilterOptions = computed(() =>
    this.incidentStatuses().filter((st) => {
      const ui = catalogStatusToUiStatus(st.name);
      return ui !== 'Cerrado' && ui !== 'Cancelado' && ui !== 'Resuelto';
    }),
  );
  private static readonly DASHBOARD_PAGE_MIN = 3;
  private static readonly DASHBOARD_PAGE_MAX = 30;
  dashboardPageSize = signal(10);
  dashboardCurrentPage = signal(1);
  selectedDashboardIncidentId = signal<string | null>(null);
  resolvedAddresses = signal<Record<string, string>>({});
  resolvedCoords = signal<Record<string, { lat: number; lng: number }>>({});
  private readonly resolvingAddressIds = new Set<string>();
  private readonly resolvingCoordIds = new Set<string>();

  constructor() {
    effect(() => {
      const list = this.incidents();
      const selectedId = this.selectedDashboardIncidentId();
      this.prefetchActiveAddresses(list);
      if (!this.dashboardMap) return;
      this.renderDashboardIncidents(selectedId);
    });

    effect(() => {
      const listLength = this.paginatedDashboardIncidents().length;
      const page = this.dashboardCurrentPage();
      const filter = this.filterText();
      const resizeKey = `${listLength}:${page}:${filter}`;
      queueMicrotask(() => {
        if (!this.dashboardMap || !resizeKey) return;
        this.triggerDashboardMapResize();
      });
    });

    effect(() => {
      this.filteredIncidents().length;
      this.dashboardPageSize();
      const pages = this.dashboardTotalPages();
      if (this.dashboardCurrentPage() > pages) {
        this.dashboardCurrentPage.set(pages);
      }
      queueMicrotask(() => this.connectDashboardListObserver());
    });
  }

  private triggerDashboardMapResize(): void {
    if (!this.dashboardMap) return;
    google.maps.event.trigger(this.dashboardMap, 'resize');
  }

  private attachDashboardMapResizeObserver(): void {
    const el = this.dashboardMapHost?.nativeElement;
    if (!el || this.dashboardMapResizeObserver) return;

    this.dashboardMapResizeObserver = new ResizeObserver(() => {
      this.triggerDashboardMapResize();
    });
    this.dashboardMapResizeObserver.observe(el);
  }

  private async waitForGoogleMaps(): Promise<boolean> {
    if (isGoogleMapsLoaded()) return true;

    try {
      await loadGoogleMaps();
    } catch {
      return false;
    }

    if (isGoogleMapsLoaded()) return true;

    const deadline = Date.now() + 15000;
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (isGoogleMapsLoaded()) {
          clearInterval(interval);
          resolve(true);
          return;
        }
        if (Date.now() > deadline) {
          clearInterval(interval);
          resolve(false);
        }
      }, 200);
    });
  }

  private async initDashboardMap(): Promise<void> {
    await this.waitForGoogleMaps();

    const mapEl = document.getElementById('incident-map');

    if (!mapEl) {
      return;
    }

    this.dashboardMap = new google.maps.Map(mapEl, {
      center: IMS_DEFAULT_MAP_CENTER,
      zoom: IMS_MAP_ZOOM.countryMin,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      ...colombiaMapViewportOptions(),
    });

    fitMapToColombia(this.dashboardMap);
    google.maps.event.addListenerOnce(this.dashboardMap, 'idle', () => {
      clampMapZoomAfterCountryFit(this.dashboardMap!);
    });

    this.dashboardInfoWindow = new google.maps.InfoWindow();

    this.dashboardMapClickListener = this.dashboardMap.addListener('click', () => {
      this.ngZone.run(() => this.clearDashboardSelection());
    });

    setTimeout(() => {
      if (!this.dashboardMap) return;
      this.triggerDashboardMapResize();
      this.renderDashboardIncidents();
      this.attachDashboardMapResizeObserver();
    }, 100);
    setTimeout(() => this.triggerDashboardMapResize(), 350);
  }

  private resetDashboardMapToColombia(): void {
    if (!this.dashboardMap) return;
    fitMapToColombia(this.dashboardMap);
    google.maps.event.addListenerOnce(this.dashboardMap, 'idle', () => {
      clampMapZoomAfterCountryFit(this.dashboardMap!);
    });
  }

  private clampDashboardMapZoom(maxZoom = IMS_MAP_ZOOM.dashboardFitMax): void {
    if (!this.dashboardMap) return;
    const z = this.dashboardMap.getZoom();
    if (z != null && z > maxZoom) {
      this.dashboardMap.setZoom(maxZoom);
    }
  }

  private fitAllDashboardMarkers(): void {
    if (!this.dashboardMap) return;

    const placable = this.getDashboardActiveIncidents().filter((inc) => this.hasValidCoords(inc));
    if (placable.length === 0) {
      this.resetDashboardMapToColombia();
      return;
    }

    const positions = this.spreadOverlappingPositions(placable);
    const bounds = new google.maps.LatLngBounds();
    placable.forEach((inc) => {
      const pos = positions.get(inc.id);
      if (pos) bounds.extend(pos);
    });

    if (placable.length > 1) {
      this.dashboardMap.fitBounds(bounds, {
        top: 48,
        right: 48,
        bottom: 48,
        left: 48,
      });
      google.maps.event.addListenerOnce(this.dashboardMap, 'idle', () => {
        this.clampDashboardMapZoom();
      });
    } else {
      this.dashboardMap.setCenter(bounds.getCenter());
      this.dashboardMap.setZoom(IMS_MAP_ZOOM.dashboardSingleMarker);
    }
  }

  clearDashboardSelection(): void {
    if (!this.selectedDashboardIncidentId()) return;

    this.selectedDashboardIncidentId.set(null);
    this.dashboardInfoWindow?.close();
    this.renderDashboardIncidents();
    this.cdr.markForCheck();
  }

  @HostListener('click', ['$event'])
  onDashboardAreaClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('tr[data-incident-id]')) return;
    if (target.closest('#incident-map')) return;
    if (target.closest('button')) return;
    this.clearDashboardSelection();
  }

  dashboardActiveIncidents = computed(() =>
    this.incidents().filter((inc) => isVisibleInActiveViews(inc.status)),
  );

  private getDashboardActiveIncidents(): Incident[] {
    return this.dashboardActiveIncidents();
  }

  getIncidentPosition(incident: Incident): { lat: number; lng: number } | null {
    if (hasValidIncidentCoords(incident.lat, incident.lng)) {
      return { lat: Number(incident.lat), lng: Number(incident.lng) };
    }

    const resolved = this.resolvedCoords()[incident.id];
    if (resolved) return resolved;

    return null;
  }

  private hasValidCoords(incident: Incident): boolean {
    return this.getIncidentPosition(incident) !== null;
  }

  private spreadOverlappingPositions(
    incidents: Incident[],
  ): Map<string, { lat: number; lng: number }> {
    const result = new Map<string, { lat: number; lng: number }>();
    const groups = new Map<string, Incident[]>();

    for (const inc of incidents) {
      const pos = this.getIncidentPosition(inc);
      if (!pos) continue;
      const key = `${pos.lat.toFixed(5)}|${pos.lng.toFixed(5)}`;
      const group = groups.get(key) ?? [];
      group.push(inc);
      groups.set(key, group);
    }

    const radius = 0.0018;
    groups.forEach((group) => {
      if (group.length === 1) {
        const pos = this.getIncidentPosition(group[0])!;
        result.set(group[0].id, pos);
        return;
      }
      group.forEach((inc, index) => {
        const base = this.getIncidentPosition(inc)!;
        const angle = (2 * Math.PI * index) / group.length;
        result.set(inc.id, {
          lat: base.lat + radius * Math.cos(angle),
          lng: base.lng + radius * Math.sin(angle),
        });
      });
    });

    return result;
  }

  mapMarkersCount = computed(() => {
    return this.getDashboardActiveIncidents().filter((inc) => this.hasValidCoords(inc)).length;
  });

  getMarkerColor(incident: Incident): string {
    if (isHiddenByDefaultInIncidentList(incident.status)) {
      if (incident.status === 'Cancelado') return '#991b1b';
      return '#6b7280';
    }
    switch (incident.priority) {
      case 'Crítica':
        return '#ef4444';
      case 'Alta':
        return '#f97316';
      case 'Media':
        return '#eab308';
      case 'Baja':
        return '#4ade80';
      default:
        break;
    }
    switch (incident.status) {
      case 'Nuevo':
        return '#3b82f6';
      case 'En gestión OSEG':
        return '#6366f1';
      case 'Reiteraciones':
        return '#dc2626';
      case 'Enviado a CERREM':
        return '#8b5cf6';
      case 'En evaluación CERREM':
        return '#a855f7';
      case 'Medidas asignadas':
        return '#f97316';
      case 'Asignado':
        return '#6366f1';
      case 'En camino':
        return '#eab308';
      case 'En proceso':
        return '#f97316';
      default:
        return '#9ca3af';
    }
  }

  private buildMarkerIcon(incident: Incident, selected: boolean): google.maps.Symbol {
    const color = this.getMarkerColor(incident);
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: selected ? 12 : 9,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: selected ? '#ffffff' : '#1f2937',
      strokeWeight: selected ? 3 : 1.5,
    };
  }

  getExactAddress(incident: Incident): string {
    const cached = this.resolvedAddresses()[incident.id];
    if (cached) return cached;
    const stored = incident.location?.trim();
    if (stored) return stored;
    return '';
  }

  getIncidentCoordsLabel(incident: Incident): string {
    const pos = this.getIncidentPosition(incident);
    if (!pos) return '';
    return `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
  }

  isAddressLoading(incidentId: string): boolean {
    return this.resolvingAddressIds.has(incidentId);
  }

  private escapeHtml(text: string): string {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  private buildInfoWindowContent(incident: Incident): string {
    const priorityColor = this.getMarkerColor(incident);
    const address = this.getExactAddress(incident);
    const coords = this.getIncidentCoordsLabel(incident);
    const addressBlock = (() => {
      if (address) return this.escapeHtml(address);
      if (this.isAddressLoading(incident.id)) return 'Obteniendo dirección exacta…';
      return 'Sin dirección registrada';
    })();
    return `
      <div style="min-width:260px;color:#111827;font-family:system-ui,sans-serif;">
        <h3 style="margin:0 0 8px;font-size:15px;">${this.escapeHtml(incident.id)}</h3>
        <p style="margin:4px 0;"><strong>Tipo:</strong> ${this.escapeHtml(incident.type)}</p>
        <p style="margin:4px 0;"><strong>Prioridad:</strong>
          <span style="color:${priorityColor};font-weight:700;">${this.escapeHtml(incident.priority)}</span>
        </p>
        <p style="margin:4px 0;"><strong>Estado:</strong> ${this.escapeHtml(incident.status)}</p>
        <p style="margin:4px 0;"><strong>Operador:</strong> ${this.escapeHtml(incident.operator || 'Sin asignar')}</p>
        <p style="margin:6px 0 2px;"><strong>Dirección exacta:</strong></p>
        <p style="margin:0 0 6px;line-height:1.4;">${addressBlock}</p>
        ${coords ? `<p style="margin:4px 0;font-size:12px;color:#4b5563;"><strong>Coordenadas:</strong> ${coords}</p>` : ''}
      </div>
    `;
  }

  private prefetchActiveAddresses(incidents: Incident[]): void {
    incidents
      .filter((inc) => isVisibleInActiveViews(inc.status))
      .forEach((inc) => {
        if (this.hasValidCoords(inc)) {
          this.resolveAddressForIncident(inc);
        } else if (inc.location?.trim()) {
          this.resolveCoordsForIncident(inc);
        }
      });
  }

  private resolveCoordsForIncident(incident: Incident): void {
    if (this.hasValidCoords(incident)) return;
    const address = incident.location?.trim();
    if (!address) return;
    if (this.resolvingCoordIds.has(incident.id)) return;

    this.resolvingCoordIds.add(incident.id);
    this.waitForGoogleMaps()
      .then(() => {
        this.geocoder ??= new google.maps.Geocoder();
        this.geocoder.geocode(
          { address, componentRestrictions: googleMapsCountryRestriction() },
          (results, status) => {
            this.ngZone.run(() => this.applyCoordsGeocodeResult(incident, results, status));
          },
        );
      })
      .catch(() => void 0);
  }

  private applyCoordsGeocodeResult(
    incident: Incident,
    results: google.maps.GeocoderResult[] | null,
    status: string,
  ): void {
    this.resolvingCoordIds.delete(incident.id);
    if (status === 'OK' && results?.[0]?.geometry?.location) {
      const lat = results[0].geometry.location.lat();
      const lng = results[0].geometry.location.lng();
      this.resolvedCoords.update((m) => ({
        ...m,
        [incident.id]: { lat, lng },
      }));
      this.renderDashboardIncidents();
    }
    this.cdr.markForCheck();
  }

  private resolveAddressForIncident(incident: Incident): void {
    if (this.resolvedAddresses()[incident.id]) return;
    const stored = incident.location?.trim();
    if (stored) {
      this.resolvedAddresses.update((m) => ({
        ...m,
        [incident.id]: stored,
      }));
      return;
    }
    if (!this.hasValidCoords(incident)) return;
    if (this.resolvingAddressIds.has(incident.id)) return;

    this.resolvingAddressIds.add(incident.id);
    this.waitForGoogleMaps()
      .then(() => {
        this.geocoder ??= new google.maps.Geocoder();
        const pos = this.getIncidentPosition(incident);
        if (!pos) return;
        this.geocoder.geocode({ location: pos }, (results, status) => {
          this.ngZone.run(() => this.applyAddressGeocodeResult(incident, results, status));
        });
      })
      .catch(() => void 0);
  }

  private applyAddressGeocodeResult(
    incident: Incident,
    results: google.maps.GeocoderResult[] | null,
    status: string,
  ): void {
    this.resolvingAddressIds.delete(incident.id);
    if (status === 'OK' && results?.[0]?.formatted_address) {
      this.resolvedAddresses.update((m) => ({
        ...m,
        [incident.id]: results[0].formatted_address,
      }));
      const markerData = this.dashboardMarkers.get(incident.id);
      if (markerData) {
        markerData.infoWindow.setContent(this.buildInfoWindowContent(incident));
      }
      if (this.selectedDashboardIncidentId() === incident.id) {
        this.refreshSelectedInfoWindow(incident);
      }
    }
    this.cdr.markForCheck();
  }

  private refreshSelectedInfoWindow(incident: Incident): void {
    if (!this.dashboardInfoWindow || !this.dashboardMap) return;
    const markerData = this.dashboardMarkers.get(incident.id);
    if (!markerData) return;
    this.dashboardInfoWindow.setContent(this.buildInfoWindowContent(incident));
    this.dashboardInfoWindow.open({
      anchor: markerData.marker,
      map: this.dashboardMap,
    });
  }

  private renderDashboardIncidents(selectedId = this.selectedDashboardIncidentId()): void {
    if (!this.dashboardMap) return;

    this.dashboardMarkers.forEach(({ marker, infoWindow }) => {
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
      infoWindow.close();
    });
    this.dashboardMarkers.clear();
    this.dashboardInfoWindow?.close();

    const activeIncidents = this.getDashboardActiveIncidents();
    const placable = activeIncidents.filter((inc) => this.hasValidCoords(inc));
    const positions = this.spreadOverlappingPositions(placable);
    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    placable.forEach((incident) => {
      const position = positions.get(incident.id);
      if (!position) return;

      const isSelected = selectedId === incident.id;

      const marker = createMapPin({
        map: this.dashboardMap,
        position,
        title: `${incident.id} — ${incident.type}`,
        icon: this.buildMarkerIcon(incident, isSelected),
        zIndex: isSelected ? 1000 : 1,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: this.buildInfoWindowContent(incident),
      });

      marker.addListener('click', () => {
        this.ngZone.run(() => this.selectDashboardIncident(incident));
      });

      this.dashboardMarkers.set(incident.id, { marker, infoWindow });
      bounds.extend(position);
      hasCoords = true;
    });

    if (!hasCoords) {
      this.resetDashboardMapToColombia();
      return;
    }

    if (selectedId) {
      const selected = activeIncidents.find((i) => i.id === selectedId);
      if (selected && this.hasValidCoords(selected)) {
        this.focusIncidentOnDashboardMap(selected, false);
        return;
      }
    }

    this.fitAllDashboardMarkers();
  }

  selectDashboardIncident(incident: Incident): void {
    if (!this.hasValidCoords(incident)) {
      if (incident.location?.trim()) {
        this.resolveCoordsForIncident(incident);
        this.notificationService.addNotification(
          'Ubicando incidente',
          `Buscando coordenadas de ${incident.id} en el mapa…`,
        );
      } else {
        this.notificationService.addNotification(
          'Sin ubicación',
          `El incidente ${incident.id} no tiene dirección ni coordenadas.`,
        );
      }
      return;
    }

    if (this.selectedDashboardIncidentId() === incident.id) {
      this.clearDashboardSelection();
      return;
    }

    this.selectedDashboardIncidentId.set(incident.id);
    this.auditClient.mapGeolocation('Dashboard', incident.id);
    this.resolveAddressForIncident(incident);
    if (!this.dashboardMap) {
      setTimeout(() => this.selectDashboardIncident(incident), 400);
      return;
    }
    this.renderDashboardIncidents();
    setTimeout(() => {
      document
        .querySelector(`[data-incident-id="${incident.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    this.cdr.markForCheck();
  }

  selectedDashboardIncident = computed(() => {
    const id = this.selectedDashboardIncidentId();
    if (!id) return null;
    return this.incidents().find((i) => i.id === id) ?? null;
  });

  private focusIncidentOnDashboardMap(incident: Incident, scrollToRow = false): void {
    if (!this.dashboardMap) return;

    const markerData = this.dashboardMarkers.get(incident.id);
    if (!markerData) {
      this.renderDashboardIncidents();
      setTimeout(() => this.focusIncidentOnDashboardMap(incident, scrollToRow), 150);
      return;
    }

    const { marker } = markerData;
    const position = marker.getPosition();
    if (!position) return;

    this.dashboardMarkers.forEach((data, id) => {
      const inc = this.incidents().find((i) => i.id === id);
      if (!inc) return;
      const selected = id === incident.id;
      data.marker.setIcon(this.buildMarkerIcon(inc, selected));
      data.marker.setZIndex(selected ? 1000 : 1);
    });

    this.dashboardMap.panTo(position);
    this.dashboardMap.setZoom(16);

    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 1400);

    if (this.dashboardInfoWindow) {
      this.dashboardInfoWindow.setContent(this.buildInfoWindowContent(incident));
      this.dashboardInfoWindow.open({
        anchor: marker,
        map: this.dashboardMap,
      });
    }

    if (scrollToRow) {
      setTimeout(() => {
        document
          .querySelector(`[data-incident-id="${incident.id}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }

  filteredIncidents = computed(() => {
    const text = this.filterText().toLowerCase();
    const statusFilter = this.filterStatus();
    const incidents = this.getDashboardActiveIncidents().filter((incident) => {
      const textMatch =
        !text ||
        incident.id.toLowerCase().includes(text) ||
        incident.type.toLowerCase().includes(text) ||
        incident.location.toLowerCase().includes(text) ||
        (incident.operator || '').toLowerCase().includes(text);
      const statusMatch =
        !statusFilter || incidentMatchesCatalogStatus(incident.status, statusFilter);
      return textMatch && statusMatch;
    });
    return this.sortIncidents(incidents);
  });

  dashboardTotalPages = computed(() => {
    const total = this.filteredIncidents().length;
    const size = this.dashboardPageSize();
    return total > 0 ? Math.max(1, Math.ceil(total / size)) : 1;
  });

  paginatedDashboardIncidents = computed(() => {
    const all = this.filteredIncidents();
    if (!all.length) return all;
    const size = this.dashboardPageSize();
    const page = Math.min(this.dashboardCurrentPage(), this.dashboardTotalPages());
    const start = (page - 1) * size;
    return all.slice(start, start + size);
  });

  activeIncidentsCount = computed(() => this.dashboardActiveIncidents().length);
  criticalPriorityCount = computed(
    () => this.dashboardActiveIncidents().filter((inc) => inc.priority === 'Crítica').length,
  );
  reiteracionesActivasCount = computed(
    () => this.incidents().filter((inc) => inc.status === 'Reiteraciones').length,
  );

  avgProteccionLabel = computed(() => {
    const metric = this.incidentService.dashboardMetrics()?.proteccion;
    if (!metric || metric.sampleCount <= 0 || !metric.formatted) return 'N/A';
    return metric.formatted;
  });

  avgProteccionHint = computed(() => {
    const count = this.incidentService.dashboardMetrics()?.proteccion.sampleCount ?? 0;
    if (count <= 0) return 'Sin casos con medidas aún';
    return count === 1 ? '1 caso con medidas' : `${count} casos con medidas`;
  });

  avgProteccionTitle = computed(
    () =>
      `Promedio desde la creación del incidente hasta la primera asignación de medidas de seguridad. ${this.avgProteccionHint()}`,
  );

  avgProteccionValueClass = computed(() =>
    this.avgProteccionLabel().length > 8
      ? 'ims-dashboard-kpi__value ims-dashboard-kpi__value--muted text-white'
      : 'ims-dashboard-kpi__value text-white',
  );

  private sortIncidents(incidents: Incident[]): Incident[] {
    return incidents
      .slice()
      .sort((a, b) => incidentIdSortKey(b.id) - incidentIdSortKey(a.id));
  }

  formatCreationDate(timestamp: string | null | undefined): string {
    const raw = String(timestamp ?? '').trim();
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }

  ngOnInit() {
    // Siempre recargar: no reutilizar lista en memoria de otra sesión/agencia.
    this.incidentService.getIncidents();
    this.loadDashboardStatusCatalog();
    setTimeout(() => this.initDashboardMap(), 300);
  }

  ngAfterViewInit(): void {
    this.attachDashboardMapResizeObserver();
    const recalc = () => this.recalcDashboardPageSize();
    this.dashboardListResizeObserver = new ResizeObserver(() => recalc());
    window.addEventListener('resize', recalc);
    this.onDestroyDashboardListResize = () => window.removeEventListener('resize', recalc);
    this.connectDashboardListObserver();
  }

  private connectDashboardListObserver(): void {
    queueMicrotask(() => {
      const panel = this.host.nativeElement.querySelector(
        '.ims-dashboard-panel--list',
      ) as HTMLElement | null;
      if (panel && this.dashboardListResizeObserver) {
        this.dashboardListResizeObserver.disconnect();
        this.dashboardListResizeObserver.observe(panel);
      }
      requestAnimationFrame(() => requestAnimationFrame(() => this.recalcDashboardPageSize()));
    });
  }

  private applyDashboardPageSize(size: number): void {
    this.dashboardPageSize.set(size);
    const pages = Math.max(1, Math.ceil(this.filteredIncidents().length / size));
    if (this.dashboardCurrentPage() > pages) this.dashboardCurrentPage.set(pages);
    this.cdr.markForCheck();
  }

  private recalcDashboardPageSize(): void {
    const size = this.measureDashboardPageSize();
    if (size === null || size === this.dashboardPageSize()) return;
    this.applyDashboardPageSize(size);

    queueMicrotask(() => {
      requestAnimationFrame(() => {
        const refined = this.measureDashboardPageSize();
        if (refined !== null && refined < this.dashboardPageSize()) {
          this.applyDashboardPageSize(refined);
        }
      });
    });
  }

  private measureDashboardPageSize(): number | null {
    const panel = this.host.nativeElement.querySelector(
      '.ims-dashboard-panel--list',
    ) as HTMLElement | null;
    if (!panel || panel.clientHeight <= 0) return null;

    const head = panel.querySelector('.ims-dashboard-panel__head') as HTMLElement | null;
    const nav = panel.querySelector('nav[aria-label]') as HTMLElement | null;
    const cards = panel.querySelector('.ims-dashboard-cards') as HTMLElement | null;
    const tableWrap = panel.querySelector('.ims-dashboard-table-wrap') as HTMLElement | null;
    const cardsVisible = !!cards && getComputedStyle(cards).display !== 'none';
    const listEl = cardsVisible ? cards : tableWrap;
    if (!listEl) return null;

    const panelH = panel.clientHeight || panel.getBoundingClientRect().height;
    const headH = head?.getBoundingClientRect().height ?? 48;
    const navH = nav?.getBoundingClientRect().height || 36;
    const panelStyle = getComputedStyle(panel);
    const gap = Number.parseFloat(panelStyle.rowGap || panelStyle.gap || '0') || 8;
    const thead = !cardsVisible
      ? (tableWrap?.querySelector('thead') as HTMLElement | null)
      : null;
    const theadH = thead?.getBoundingClientRect().height ?? (cardsVisible ? 0 : 40);
    const wrapH = listEl.clientHeight || listEl.getBoundingClientRect().height;
    const fromWrap = wrapH > 0 ? wrapH - theadH : 0;
    const fromPanel = panelH - headH - navH - gap * 2 - theadH;
    const listArea =
      fromWrap > 40 && fromPanel > 40
        ? Math.min(fromWrap, fromPanel)
        : Math.max(fromWrap, fromPanel);
    if (listArea < 40) return null;

    let rowH = cardsVisible ? 64 : 48;
    if (cardsVisible) {
      const card = cards?.querySelector('.ims-dashboard-card') as HTMLElement | null;
      const h = card?.getBoundingClientRect().height ?? 0;
      if (h > 24) rowH = h + 6;
    } else {
      const rows = Array.from(tableWrap?.querySelectorAll('tbody tr') ?? []).filter(
        (row) => !row.querySelector('td[colspan]'),
      );
      let measured = 0;
      for (let i = 0; i < Math.min(rows.length, 3); i++) {
        measured = Math.max(measured, rows[i].getBoundingClientRect().height);
      }
      if (measured > 24) rowH = measured;
    }

    const count = Math.floor((listArea - 4) / rowH);
    if (count < 1) return IncidentsComponent.DASHBOARD_PAGE_MIN;
    return Math.min(
      IncidentsComponent.DASHBOARD_PAGE_MAX,
      Math.max(IncidentsComponent.DASHBOARD_PAGE_MIN, count),
    );
  }

  openIncidentEmailModal(incident: Incident): void {
    this.emailModalIncident.set(incident);
  }

  closeIncidentEmailModal(): void {
    this.emailModalIncident.set(null);
  }


  sendIncidentByEmail(incident: Incident) {
    this.openIncidentEmailModal(incident);
  }


  viewIncident(incident: Incident): void {
    if (!this.canViewIncident()) return;
    this.incidentService.requestOpenIncident(incident.id);
    this.authService.currentView.set('incidents');
  }

  onFilterText(event: Event) {
    this.filterText.set((event.target as HTMLInputElement).value);
    this.dashboardCurrentPage.set(1);
  }

  onFilterStatus(event: Event) {
    this.filterStatus.set((event.target as HTMLSelectElement).value);
    this.dashboardCurrentPage.set(1);
  }

  private loadDashboardStatusCatalog(): void {
    const agency = this.authService.currentUser()?.agency ?? 'CSJ';
    this.http.get<CatalogOption[]>('/api/incident-statuses', { params: { agency } }).subscribe({
      next: (rows) => {
        this.incidentStatuses.set(Array.isArray(rows) ? rows : []);
        this.cdr.markForCheck();
      },
      error: () => {
        this.incidentStatuses.set([]);
        this.cdr.markForCheck();
      },
    });
  }

  goToDashboardPage(page: number): void {
    const total = this.dashboardTotalPages();
    if (page >= 1 && page <= total) {
      this.dashboardCurrentPage.set(page);
    }
  }

  previousDashboardPage(): void {
    this.goToDashboardPage(this.dashboardCurrentPage() - 1);
  }

  nextDashboardPage(): void {
    this.goToDashboardPage(this.dashboardCurrentPage() + 1);
  }

  getStatusColor(status: IncidentStatus): string {
    switch (status) {
      case 'Nuevo':
        return 'bg-blue-600/80 text-blue-100';
      case 'En gestión OSEG':
        return 'bg-indigo-600/80 text-indigo-100';
      case 'Reiteraciones':
        return 'bg-red-600/80 text-red-100';
      case 'Enviado a CERREM':
        return 'bg-violet-600/80 text-violet-100';
      case 'En evaluación CERREM':
        return 'bg-purple-600/80 text-purple-100';
      case 'Medidas asignadas':
        return 'bg-orange-600/80 text-orange-100';
      case 'Asignado':
        return 'bg-indigo-600/80 text-indigo-100';
      case 'En camino':
        return 'bg-yellow-600/80 text-yellow-100';
      case 'En proceso':
        return 'bg-orange-600/80 text-orange-100';
      case 'Resuelto':
        return 'bg-green-600/80 text-green-100';
      case 'Cerrado':
        return 'bg-gray-600/80 text-gray-200';
      case 'Cancelado':
        return 'bg-red-800/80 text-red-200';
      default:
        return 'bg-gray-500/80 text-gray-100';
    }
  }

  getPriorityColor(priority: IncidentPriority): string {
    switch (priority) {
      case 'Baja':
        return 'text-green-400';
      case 'Media':
        return 'text-yellow-400';
      case 'Alta':
        return 'text-orange-400';
      case 'Crítica':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  }

  ngOnDestroy() {
    this.dashboardListResizeObserver?.disconnect();
    this.dashboardListResizeObserver = null;
    this.onDestroyDashboardListResize?.();
    this.onDestroyDashboardListResize = null;
    this.dashboardMapResizeObserver?.disconnect();
    this.dashboardMapResizeObserver = null;
    if (this.dashboardMapClickListener) {
      google.maps.event.removeListener(this.dashboardMapClickListener);
      this.dashboardMapClickListener = null;
    }
    this.dashboardMarkers.forEach(({ marker }) => {
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
    });
    this.dashboardMarkers.clear();
    this.dashboardInfoWindow?.close();
    this.dashboardMap = null;
    this.geocoder = null;
  }
}
