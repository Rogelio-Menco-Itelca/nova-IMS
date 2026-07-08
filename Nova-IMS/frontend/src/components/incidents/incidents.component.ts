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
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import {
  Incident,
  IncidentStatus,
  IncidentPriority,
  isVisibleInActiveViews,
  isHiddenByDefaultInIncidentList,
  DASHBOARD_ACTIVE_STATUSES,
  catalogStatusToUiStatus,
  incidentMatchesCatalogStatus,
  incidentIdSortKey,
  type CatalogOption,
  PersonRole,
  VehicleRole,
  InvolvedVehicle,
  Person,
  DocumentType,
  DOCUMENT_TYPE_OPTIONS,
  PersonGender,
} from '../../models/incident.model';
import { Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { ConfigurationService } from '../../services/configuration.service';
import { IncidentService } from '../../services/incident.service';
import { PersonService } from '../../services/person.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { AuditClientService } from '../../services/audit-client.service';
import { IncidentEmailModalComponent } from '../incident-email-modal/incident-email-modal.component';
import {
  createMapPin,
  createPlaceAutocomplete,
  isGoogleMapsLoaded,
  MapPin,
  PlaceAutocompleteControl,
} from '../../utils/google-maps-legacy';
import { loadGoogleMaps } from '../../utils/google-maps-loader';

function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPE_OPTIONS as readonly string[]).includes(value);
}

function coerceIncidentPriority(value: string | null | undefined): IncidentPriority {
  if (value === 'Baja' || value === 'Media' || value === 'Alta' || value === 'Crítica') {
    return value;
  }
  return 'Media';
}

function isInvolvedVehicle(value: unknown): value is InvolvedVehicle {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as InvolvedVehicle;
  return typeof v.plate === 'string' && typeof v.role === 'string';
}

function coerceInvolvedVehicles(value: unknown): InvolvedVehicle[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isInvolvedVehicle);
}

/** Vista inicial del mapa del dashboard (Bogotá D.C.) */
const BOGOTA_CENTER = { lat: 4.651, lng: -74.072 };
const BOGOTA_DEFAULT_ZOOM = 11;
const DASHBOARD_SINGLE_MARKER_ZOOM = 13;
const DASHBOARD_FIT_MAX_ZOOM = 15;
/** Límite de pan del mapa: territorio colombiano completo */
const COLOMBIA_BOUNDS = {
  north: 13.5,
  south: -4.5,
  east: -66.5,
  west: -79.5,
};

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IncidentEmailModalComponent],
  templateUrl: './incidents.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export class IncidentsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly platePattern = /^[A-Za-z0-9-]{5,8}$/;

  private inferDocumentType(documentId: string): DocumentType | '' {
    const id = String(documentId || '').trim();
    if (!id) return '';
    if (/[A-Za-z]/.test(id)) return 'Pasaporte';
    const digits = id.replaceAll(/\D/g, '');
    if (digits.length >= 6 && digits.length <= 11) return 'Cédula de Ciudadanía';
    return '';
  }

  private resolveDocumentTypeFromPerson(person: Person): DocumentType | '' {
    const raw = String(person.documentType || '').trim();
    if (raw && isDocumentType(raw)) {
      return raw;
    }
    return this.inferDocumentType(person.documentId);
  }

  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly configService = inject(ConfigurationService);
  readonly incidentService = inject(IncidentService);
  private readonly authService = inject(AuthService);
  readonly permissionService = inject(PermissionService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auditClient = inject(AuditClientService);
  private readonly http = inject(HttpClient);

  // Tab Management
  openIncidentTabs = signal<Incident[]>([]);
  showNewIncidentTab = signal(false);
  activeTabId = signal<string | null>(null);
  selectedIncidentTypeName = signal<string | null>(null);
  isProtocolVisible = signal(true);
  newIncidentFormState = signal<Partial<Incident> | null>(null);
  readonly MAX_TABS = 5;

  emailModalIncident = signal<Incident | null>(null);

  canNotify(): boolean {
    return this.permissionService.canNotify();
  }

  canViewIncident(): boolean {
    return this.permissionService.canViewIncident();
  }

  canCreate(): boolean {
    return this.permissionService.canModuleAction('Incidentes', 'create');
  }

  // Google Maps
  private map: google.maps.Map | null = null;
  private marker: MapPin | null = null;

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
  private autocomplete: PlaceAutocompleteControl | null = null;
  private dashboardMapResizeObserver: ResizeObserver | null = null;

  @ViewChild('dashboardMapHost') dashboardMapHost?: ElementRef<HTMLElement>;

  private typeSub: Subscription | undefined;
  private phoneSub: Subscription | undefined;
  /** Evita pisar la prioridad que el operador eligió manualmente. */
  private lastIncidentTypeName: string | null = null;
  private lastTypeDefaultPriority: IncidentPriority | null = null;
  private readonly personLookupNotified = new Set<string>();

  incidents = this.incidentService.incidents;
  auditLogs = this.configService.auditLogs;
  filterText = signal('');
  filterStatus = signal('');
  incidentStatuses = signal<CatalogOption[]>([]);
  /** Opciones del filtro: mismos estados que Incidentes, sin cerrados (solo activos en dashboard). */
  dashboardStatusFilterOptions = computed(() =>
    this.incidentStatuses().filter((st) => {
      const ui = catalogStatusToUiStatus(st.name);
      return ui !== 'Cerrado' && ui !== 'Cancelado' && ui !== 'Resuelto';
    }),
  );
  readonly dashboardPageSize = 10;
  dashboardCurrentPage = signal(1);
  priorities: IncidentPriority[] = ['Baja', 'Media', 'Alta', 'Crítica'];
  statuses: IncidentStatus[] = [...DASHBOARD_ACTIVE_STATUSES];
  incidentTypes = this.configService.incidentTypes;
  personRoles: PersonRole[] = ['Víctima', 'Victimario', 'Testigo'];
  vehicleRoles: VehicleRole[] = ['Vehículo Víctima', 'Vehículo Victimario', 'Vehículo Involucrado'];
  selectedDashboardIncidentId = signal<string | null>(null);
  /** Dirección exacta por geocodificación inversa (id → formatted_address) */
  resolvedAddresses = signal<Record<string, string>>({});
  /** Coordenadas obtenidas por geocodificar la dirección escrita */
  resolvedCoords = signal<Record<string, { lat: number; lng: number }>>({});
  private readonly resolvingAddressIds = new Set<string>();
  private readonly resolvingCoordIds = new Set<string>();
  personService = inject(PersonService);

  incidentForm = this.fb.group({
    event_id: ['', Validators.required],
    priority_id: ['', Validators.required],
    status: ['Nuevo' as IncidentStatus, Validators.required],
    origin: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern('^[0-9+ ]*$')]],
    location: ['', Validators.required],
    lat: [null as number | null, Validators.required],
    lng: [null as number | null, Validators.required],
    details: ['', Validators.required],
    comments: [''],
    type: [''],
    priority: ['Media' satisfies IncidentPriority],
    locationPhoneNumber: [{ value: '', disabled: true }],
    involvedPeople: this.fb.array([]),
    involvedVehicles: this.fb.array([]),
  });

  constructor() {
    effect(() => {
      const tabId = this.activeTabId();

      this.releaseMap();

      if (tabId === 'new') {
        const savedState = this.newIncidentFormState();
        if (savedState) {
          this.populateFormWithState(savedState);
        } else {
          this.resetFormForNewIncident();
        }

        this.scheduleNewIncidentMapInit(savedState);
      } else if (tabId) {
        const incident = this.openIncidentTabs().find((inc) => inc.id === tabId);
        if (incident) {
          this.populateFormWithState(incident);
          setTimeout(() => this.initMap(incident.lat, incident.lng), 350);
        }
      }
    });

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

  private scheduleNewIncidentMapInit(savedState: Partial<Incident> | null): void {
    setTimeout(() => {
      const lat = this.incidentForm.get('lat')?.value || 4.645368;
      const lng = this.incidentForm.get('lng')?.value || -74.1131;
      this.initMap(lat, lng)
        .then(() => {
          if (savedState?.lat != null && savedState?.lng != null) {
            setTimeout(() => this.reverseGeocode(savedState.lat, savedState.lng), 300);
          }
        })
        .catch(() => void 0);
    }, 350);
  }

  private releaseMap() {
    if (this.marker) {
      google.maps.event.clearInstanceListeners(this.marker);
      this.marker.setMap(null);
    }
    if (this.map) {
      google.maps.event.clearInstanceListeners(this.map);
    }
    this.map = null;
    this.marker = null;
    this.geocoder = null;
    this.autocomplete = null;
  }

  private destroyMap() {
    this.releaseMap();
    const mapEl = document.getElementById('map');
    if (mapEl) mapEl.replaceChildren();
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

  private async initMap(lat = 4.645368, lng = -74.1131): Promise<void> {
    const mapsOk = await this.waitForGoogleMaps();
    if (!mapsOk) return;

    const mapEl = document.getElementById('map');
    if (!mapEl) {
      return;
    }

    this.releaseMap();

    this.geocoder = new google.maps.Geocoder();

    this.map = new google.maps.Map(mapEl, {
      center: { lat, lng },
      zoom: 17,
      disableDefaultUI: false,
      mapTypeControl: false,
      streetViewControl: false,
    });

    this.marker = createMapPin({
      map: this.map,
      position: { lat, lng },
      draggable: true,
      title: 'Ubicación del incidente',
    });

    const map = this.map;
    const marker = this.marker;
    if (!map || !marker) return;

    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      marker.setPosition(e.latLng);
      const clickLat = e.latLng.lat();
      const clickLng = e.latLng.lng();
      this.ngZone.run(() => {
        this.updateFormCoords(clickLat, clickLng);
        this.reverseGeocode(clickLat, clickLng);
      });
    });

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (!pos) return;
      this.ngZone.run(() => {
        this.updateFormCoords(pos.lat(), pos.lng());
        this.reverseGeocode(pos.lat(), pos.lng());
      });
    });

    this.initAutocomplete();
  }

  private async initDashboardMap(): Promise<void> {
    await this.waitForGoogleMaps();

    const mapEl = document.getElementById('incident-map');

    if (!mapEl) {
      return;
    }

    this.dashboardMap = new google.maps.Map(mapEl, {
      center: BOGOTA_CENTER,
      zoom: BOGOTA_DEFAULT_ZOOM,
      minZoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      restriction: {
        latLngBounds: COLOMBIA_BOUNDS,
        strictBounds: false,
      },
    });

    this.dashboardInfoWindow = new google.maps.InfoWindow();

    this.dashboardMapClickListener = this.dashboardMap.addListener('click', () => {
      this.ngZone.run(() => this.clearDashboardSelection());
    });

    setTimeout(() => {
      google.maps.event.trigger(this.dashboardMap, 'resize');
      this.renderDashboardIncidents();
      this.attachDashboardMapResizeObserver();
    }, 100);
  }

  private resetDashboardMapToBogota(): void {
    if (!this.dashboardMap) return;
    this.dashboardMap.setCenter(BOGOTA_CENTER);
    this.dashboardMap.setZoom(BOGOTA_DEFAULT_ZOOM);
  }

  /** Tras fitBounds con varios marcadores cercanos, evita acercar de más. */
  private clampDashboardMapZoom(maxZoom = DASHBOARD_FIT_MAX_ZOOM): void {
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
      this.resetDashboardMapToBogota();
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
      this.dashboardMap.setZoom(DASHBOARD_SINGLE_MARKER_ZOOM);
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
    const resolved = this.resolvedCoords()[incident.id];
    if (resolved) return resolved;

    const lat = Number(incident.lat);
    const lng = Number(incident.lng);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001)
    ) {
      return { lat, lng };
    }
    return null;
  }

  private hasValidCoords(incident: Incident): boolean {
    return this.getIncidentPosition(incident) !== null;
  }

  /** Separa marcadores que comparten las mismas coordenadas */
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
          { address, componentRestrictions: { country: 'co' } },
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
      this.resetDashboardMapToBogota();
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

  private initAutocomplete() {
    const locationInput = document.getElementById('location');
    if (!(locationInput instanceof HTMLInputElement)) return;

    this.autocomplete = createPlaceAutocomplete(locationInput, {
      componentRestrictions: { country: 'co' },
      fields: ['geometry', 'formatted_address'],
    });

    this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete!.getPlace();
      if (!place.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      this.ngZone.run(() => {
        this.updateFormCoords(lat, lng);
        this.incidentForm.patchValue({ location: place.formatted_address });
        this.map?.setCenter({ lat, lng });
        this.map?.setZoom(17);
        this.marker?.setPosition({ lat, lng });
      });
    });
  }

  private updateFormCoords(lat: number, lng: number) {
    this.incidentForm.patchValue({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    });
  }

  private reverseGeocode(lat: number, lng: number) {
    if (globalThis.google === undefined) return;
    this.geocoder ??= new google.maps.Geocoder();
    this.geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      this.ngZone.run(() => {
        if (status === 'OK' && results?.[0]) {
          this.incidentForm.patchValue({
            location: results[0].formatted_address,
          });
          this.cdr.detectChanges();
        }
      });
    });
  }

  activeIncident = computed(() => {
    const tabId = this.activeTabId();
    if (!tabId || tabId === 'new') return null;
    return this.openIncidentTabs().find((inc) => inc.id === tabId) ?? null;
  });

  incidentAuditLogs = computed(() => {
    const incident = this.activeIncident();
    if (!incident) return [];
    return this.auditLogs().filter((log) => log.incidentId === incident.id);
  });

  get involvedPeople(): FormArray {
    return this.incidentForm.get('involvedPeople') as FormArray;
  }
  get involvedVehicles(): FormArray {
    return this.incidentForm.get('involvedVehicles') as FormArray;
  }

  createPersonGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      role: ['Testigo' as PersonRole, Validators.required],
      contact: [''],
      details: [''],
      phone: [''],
      documentType: ['' as DocumentType | '', Validators.required],
      documentId: [''],
      gender: ['' as PersonGender | '', Validators.required],
    });
  }
  addPerson(): void {
    if (this.involvedPeople.length < 4) this.involvedPeople.push(this.createPersonGroup());
  }
  removePerson(index: number): void {
    this.involvedPeople.removeAt(index);
  }

  createVehicleGroup(): FormGroup {
    return this.fb.group({
      plate: ['', [Validators.required, Validators.pattern(this.platePattern)]],
      role: ['Vehículo Involucrado' as VehicleRole, Validators.required],
      make: [''],
      model: [''],
      color: [''],
      details: [''],
    });
  }
  addVehicle(): void {
    if (this.involvedVehicles.length < 4) this.involvedVehicles.push(this.createVehicleGroup());
  }
  removeVehicle(index: number): void {
    this.involvedVehicles.removeAt(index);
  }

  normalizeVehiclePlate(index: number): void {
    const control = this.involvedVehicles.at(index)?.get('plate');
    if (!control) return;
    const cleaned = String(control.value || '')
      .toUpperCase()
      .replaceAll(/\s+/g, '')
      .replaceAll(/[^A-Z0-9-]/g, '');
    control.setValue(cleaned, { emitEvent: false });
    control.markAsTouched();
  }

  selectedIncidentType = computed(() => {
    const typeName = this.selectedIncidentTypeName();
    if (!typeName) return null;
    return this.incidentTypes().find((t) => t.name === typeName) || null;
  });

  recommendedProtocol = computed(() => {
    const incidentType = this.selectedIncidentType();
    if (!incidentType) return null;
    return (
      this.configService
        .responseProtocols()
        .find((p) => p.incidentTypeName === incidentType.name) || null
    );
  });

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
    return Math.max(1, Math.ceil(total / this.dashboardPageSize));
  });

  paginatedDashboardIncidents = computed(() => {
    const all = this.filteredIncidents();
    const page = Math.min(this.dashboardCurrentPage(), this.dashboardTotalPages());
    const start = (page - 1) * this.dashboardPageSize;
    return all.slice(start, start + this.dashboardPageSize);
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
      ? 'ml-auto mr-4 shrink-0 text-2xl font-bold leading-tight tabular-nums text-white'
      : 'ml-auto mr-8 shrink-0 text-4xl font-bold tabular-nums text-white',
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
    if (this.incidentService.incidents().length === 0) this.incidentService.getIncidents();
    this.loadDashboardStatusCatalog();

    this.typeSub = this.incidentForm.get('event_id')?.valueChanges.subscribe((typeName) => {
      this.selectedIncidentTypeName.set(typeName || null);
      const selectedType = this.incidentTypes().find((t) => t.name === typeName);
      if (!selectedType) return;

      const currentPriority = String(this.incidentForm.get('priority_id')?.value ?? '').trim();
      const typeChanged = typeName !== this.lastIncidentTypeName;
      const priorityEmpty = !currentPriority;
      const priorityMatchesPreviousDefault =
        !!this.lastTypeDefaultPriority && currentPriority === this.lastTypeDefaultPriority;
      const applyDefaultPriority = typeChanged && (priorityEmpty || priorityMatchesPreviousDefault);

      const patch: { type: string; priority_id?: IncidentPriority; priority?: IncidentPriority } = {
        type: selectedType.name,
      };
      if (applyDefaultPriority) {
        patch.priority_id = selectedType.defaultPriority;
        patch.priority = selectedType.defaultPriority;
      }

      this.lastIncidentTypeName = typeName;
      this.lastTypeDefaultPriority = selectedType.defaultPriority;

      this.incidentForm.patchValue(patch, { emitEvent: false });
    });

    this.setupPhoneLookup();
    setTimeout(() => this.initDashboardMap(), 300);
  }

  ngAfterViewInit(): void {
    this.attachDashboardMapResizeObserver();
  }

  private normalizePhone(phone: string): string {
    return phone.replaceAll(/\D/g, '');
  }

  private setupPhoneLookup(): void {
    this.phoneSub?.unsubscribe();
    const phoneControl = this.incidentForm.get('phone');
    if (!phoneControl) return;

    this.phoneSub = phoneControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        filter((phone): phone is string => !!phone && this.normalizePhone(phone).length >= 7),
        switchMap((phone) =>
          this.personService.lookupByPhone(phone).pipe(catchError(() => of(null))),
        ),
      )
      .subscribe((person) => this.applyPersonLookupResult(person));
  }

  private applyPersonLookupResult(person: Person | null): void {
    if (!person) return;

    const phone = String(this.incidentForm.get('phone')?.value ?? '');
    const notifyKey = `${this.normalizePhone(phone)}:${person.id}`;
    if (!this.personLookupNotified.has(notifyKey)) {
      this.personLookupNotified.add(notifyKey);
      this.notificationService.addNotification(
        'Persona Identificada',
        `${person.name} reconocido por el sistema.`,
      );
    }

    if (!this.involvedPeople.length) {
      this.addRegisteredPersonToInvolved(person);
    }
  }

  addRegisteredPersonToInvolved(person: Person) {
    const documentType = this.resolveDocumentTypeFromPerson(person);
    const group = this.createPersonGroup();
    group.patchValue({
      name: person.name,
      role: 'Víctima',
      contact: person.phone,
      phone: person.phone,
      documentType,
      documentId: person.documentId,
    });
    this.involvedPeople.push(group);
  }

  toggleRegistrationForm() {
    if (this.showNewIncidentTab()) {
      this.closeNewIncidentTab();
    } else {
      this.showNewIncidentTab.set(true);
      this.setActiveTab('new');
    }
  }

  openIncidentTab(incident: Incident) {
    this.selectDashboardIncident(incident);

    const alreadyOpen = this.openIncidentTabs().some((tab) => tab.id === incident.id);

    if (alreadyOpen) {
      this.setActiveTab(incident.id);
      return;
    }

    if (this.openIncidentTabs().length >= this.MAX_TABS) {
      this.notificationService.addNotification(
        'Límite Alcanzado',
        'Cierre una pestaña para abrir una nueva.',
      );
      return;
    }

    this.openIncidentTabs.update((tabs) => [...tabs, incident]);

    this.setActiveTab(incident.id);

    this.notificationService.addNotification(
      'Pestaña Abierta',
      `Se abrió el incidente #${incident.id}.`,
      incident.id,
    );
  }

  setActiveTab(tabId: string) {
    if (this.activeTabId() === tabId) {
      this.activeTabId.set(null);
      setTimeout(() => this.activeTabId.set(tabId), 50);
      return;
    }
    if (this.activeTabId() === 'new') {
      this.newIncidentFormState.set(this.incidentForm.getRawValue() as Partial<Incident>);
    }
    this.activeTabId.set(tabId);
  }

  closeIncidentTab(idToClose: string, event: MouseEvent) {
    event.stopPropagation();
    const tabs = this.openIncidentTabs();
    const index = tabs.findIndex((t) => t.id === idToClose);
    if (this.activeTabId() === idToClose) {
      const nextTabId =
        tabs[index - 1]?.id ?? tabs[index + 1]?.id ?? (this.showNewIncidentTab() ? 'new' : null);
      this.activeTabId.set(nextTabId);
    }
    this.openIncidentTabs.update((t) => t.filter((tab) => tab.id !== idToClose));
  }

  closeNewIncidentTab(event?: MouseEvent) {
    event?.stopPropagation();
    this.showNewIncidentTab.set(false);
    this.newIncidentFormState.set(null);
    if (this.activeTabId() === 'new')
      this.activeTabId.set(this.openIncidentTabs().at(-1)?.id ?? null);
  }

  registerIncident() {
    if (this.incidentForm.invalid) {
      this.incidentForm.markAllAsTouched();
      return;
    }
    const formValue = this.incidentForm.getRawValue();
    const newIncident: Incident = {
      id: '',
      timestamp: new Date().toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
      status: formValue.status ?? 'Nuevo',
      event_id: formValue.event_id ?? '',
      priority_id: formValue.priority_id ?? '',
      origin: formValue.origin ?? '',
      phone: formValue.phone ?? '',
      location: formValue.location ?? '',
      lat: formValue.lat ?? 0,
      lng: formValue.lng ?? 0,
      details: formValue.details ?? '',
      comments: formValue.comments ?? '',
      type: formValue.event_id ?? '',
      priority: coerceIncidentPriority(formValue.priority ?? formValue.priority_id),
      operator: this.authService.currentUser()?.name ?? 'Sistema',
      ani: formValue.phone ?? 'N/A',
      locationPhoneNumber: formValue.locationPhoneNumber ?? '',
      involvedPeople: formValue.involvedPeople ?? [],
      involvedVehicles: coerceInvolvedVehicles(formValue.involvedVehicles),
    };
    this.incidentService.addIncident(newIncident);

    setTimeout(() => {
      this.renderDashboardIncidents();
    }, 200);
    this.notificationService.addNotification(
      'Incidente Registrado',
      `Se creó el incidente #${newIncident.id}.`,
      newIncident.id,
    );
    this.closeNewIncidentTab();
    this.openIncidentTab(newIncident);
  }

  updateIncident() {
    if (this.incidentForm.invalid || !this.activeIncident()) return;
    const updatedData = this.incidentForm.getRawValue();
    const incidentId = this.activeIncident()!.id;
    const finalData: Incident = {
      ...this.activeIncident()!,
      status: updatedData.status ?? 'Nuevo',
      event_id: updatedData.event_id ?? '',
      priority_id: updatedData.priority_id ?? '',
      origin: updatedData.origin ?? '',
      phone: updatedData.phone ?? '',
      location: updatedData.location ?? '',
      lat: updatedData.lat ?? 0,
      lng: updatedData.lng ?? 0,
      details: updatedData.details ?? '',
      comments: updatedData.comments ?? '',
      type: updatedData.event_id ?? '',
      priority: coerceIncidentPriority(updatedData.priority ?? updatedData.priority_id),
      involvedPeople: updatedData.involvedPeople ?? [],
      involvedVehicles: coerceInvolvedVehicles(updatedData.involvedVehicles),
    };
    this.incidentService.updateIncident(finalData, (saved) => {
      this.openIncidentTabs.update((tabs) => tabs.map((t) => (t.id === incidentId ? saved : t)));
      this.configService.getAuditLogs().catch(() => void 0);
      this.cdr.markForCheck();
    });
    this.notificationService.addNotification(
      'Incidente Actualizado',
      `Se guardaron los cambios para #${incidentId}.`,
      incidentId,
    );
  }

  private resetFormForNewIncident() {
    this.selectedIncidentTypeName.set(null);
    this.lastIncidentTypeName = null;
    this.lastTypeDefaultPriority = null;
    this.incidentForm.reset({
      event_id: '',
      priority_id: 'Media',
      status: 'Nuevo',
      origin: '',
      phone: '',
      location: '',
      details: '',
      comments: '',
    });
    this.involvedPeople.clear();
    this.involvedVehicles.clear();
    this.incidentForm.enable();
  }

  private populateFormWithState(state: Partial<Incident>) {
    this.selectedIncidentTypeName.set(state.type || state.event_id || null);
    this.incidentForm.reset(undefined, { emitEvent: false });
    this.incidentForm.patchValue(state, { emitEvent: false });
    const typeName = state.type || state.event_id || null;
    this.lastIncidentTypeName = typeName;
    const selectedType = this.incidentTypes().find((t) => t.name === typeName);
    this.lastTypeDefaultPriority = selectedType?.defaultPriority ?? null;
    this.involvedPeople.clear();
    state.involvedPeople?.forEach((p) =>
      this.involvedPeople.push(
        this.fb.group({
          name: [p.name ?? '', Validators.required],
          role: [p.role ?? 'Testigo', Validators.required],
          contact: [p.contact],
          details: [p.details ?? p.comentarios],
          phone: [p.phone],
          documentType: [(p.documentType || '') as DocumentType | '', Validators.required],
          documentId: [p.documentId],
          gender: [(p.gender ?? '') as PersonGender | '', Validators.required],
        }),
      ),
    );
    this.involvedVehicles.clear();
    state.involvedVehicles?.forEach((v) =>
      this.involvedVehicles.push(
        this.fb.group({
          plate: [v.plate, [Validators.required, Validators.pattern(this.platePattern)]],
          role: [v.role, Validators.required],
          make: [v.make],
          model: [v.model],
          color: [v.color],
          details: [v.details],
        }),
      ),
    );
    this.incidentForm.enable();
  }

  openIncidentEmailModal(incident: Incident): void {
    this.emailModalIncident.set(incident);
  }

  closeIncidentEmailModal(): void {
    this.emailModalIncident.set(null);
  }

  sendNewIncidentByEmail(): void {
    const tabId = this.activeTabId();
    if (tabId && tabId !== 'new') {
      const inc = this.openIncidentTabs().find((i) => i.id === tabId);
      if (inc) {
        this.openIncidentEmailModal(inc);
        return;
      }
    }
    this.notificationService.addNotification(
      'Guarde el incidente',
      'Debe guardar el incidente antes de enviar la notificación por correo.',
    );
  }

  sendIncidentByEmail(incident: Incident) {
    this.openIncidentEmailModal(incident);
  }

  sendSingleIncidentByEmail(incident: Incident) {
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
    this.destroyMap();
    this.typeSub?.unsubscribe();
    this.phoneSub?.unsubscribe();
  }
}
