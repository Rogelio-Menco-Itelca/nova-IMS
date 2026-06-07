import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  signal,
  computed,
  inject,
  OnDestroy,
  OnInit,
  effect,
  NgZone,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormArray,
  FormGroup,
} from "@angular/forms";
import {
  Incident,
  IncidentStatus,
  IncidentPriority,
  isVisibleInActiveViews,
  isHiddenByDefaultInIncidentList,
  DASHBOARD_ACTIVE_STATUSES,
  PersonRole,
  VehicleRole,
  InvolvedPerson,
  InvolvedVehicle,
  Person,
  DocumentType,
  DOCUMENT_TYPE_OPTIONS,
  PersonGender,
} from "../../models/incident.model";
import { Subscription, of } from "rxjs";
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
} from "rxjs/operators";
import { NotificationService } from "../../services/notification.service";
import { ConfigurationService } from "../../services/configuration.service";
import { LocationRequestService } from "../../services/location-request.service";
import { IncidentService } from "../../services/incident.service";
import { PersonService } from "../../services/person.service";
import { IncidentEmailModalComponent } from "../incident-email-modal/incident-email-modal.component";

declare var google: any;

const priorityOrder: Record<IncidentPriority, number> = {
  Crítica: 4,
  Alta: 3,
  Media: 2,
  Baja: 1,
};

const statusOrder: Record<string, number> = {
  Nuevo: 7,
  "En gestión OSGE": 6,
  "Enviado a CERREM": 5,
  "En evaluación CERREM": 4,
  "Aprobado con medidas": 3,
  "Medidas asignadas": 2,
  "Seguimiento activo": 1,
  Asignado: 6,
  "En camino": 5,
  "En situación": 4,
  Resuelto: 0,
  "Resuelto con medidas": 0,
  Cerrado: 0,
  "Cerrado sin medidas": 0,
  "Cerrado con solución": 0,
  Cancelado: 0,
};

/** Vista inicial del mapa del dashboard (Bogotá D.C.) */
const BOGOTA_CENTER = { lat: 4.651, lng: -74.072 };
const BOGOTA_DEFAULT_ZOOM = 11;
const BOGOTA_FIT_MAX_ZOOM = 13;
const BOGOTA_BOUNDS = {
  north: 4.84,
  south: 4.47,
  east: -73.98,
  west: -74.22,
};

@Component({
  selector: "app-incidents",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IncidentEmailModalComponent],
  templateUrl: "./incidents.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentsComponent implements OnInit, OnDestroy {
  private readonly platePattern = /^[A-Za-z0-9-]{5,8}$/;

  private inferDocumentType(documentId: string): DocumentType | "" {
    const id = String(documentId || "").trim();
    if (!id) return "";
    if (/[A-Za-z]/.test(id)) return "Pasaporte";
    const digits = id.replace(/\D/g, "");
    if (digits.length >= 6 && digits.length <= 11) return "Cédula de Ciudadanía";
    return "";
  }

  private resolveDocumentTypeFromPerson(person: Person): DocumentType | "" {
    const raw = String(person.documentType || "").trim();
    if (raw && DOCUMENT_TYPE_OPTIONS.includes(raw as DocumentType)) {
      return raw as DocumentType;
    }
    return this.inferDocumentType(person.documentId);
  }

  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private configService = inject(ConfigurationService);
  private locationService = inject(LocationRequestService);
  incidentService = inject(IncidentService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  // Tab Management
  openIncidentTabs = signal<Incident[]>([]);
  showNewIncidentTab = signal(false);
  activeTabId = signal<string | "new" | null>(null);
  selectedIncidentTypeName = signal<string | null>(null);
  isProtocolVisible = signal(true);
  newIncidentFormState = signal<any | null>(null);
  readonly MAX_TABS = 5;

  emailModalIncident = signal<Incident | null>(null);

  // Google Maps
  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;

  private dashboardMap: google.maps.Map | null = null;
  private dashboardMarker: google.maps.Marker | null = null;
  private dashboardMarkers = new Map<
    string,
    {
      marker: google.maps.Marker;
      infoWindow: google.maps.InfoWindow;
    }
  >();
  private dashboardInfoWindow: google.maps.InfoWindow | null = null;
  private dashboardMapClickListener: google.maps.MapsEventListener | null = null;

  private geocoder: google.maps.Geocoder | null = null;
  private autocomplete: google.maps.places.Autocomplete | null = null;

  private typeSub: Subscription | undefined;
  private phoneSub: Subscription | undefined;
  private readonly personLookupNotified = new Set<string>();

  incidents = this.incidentService.incidents;
  auditLogs = this.configService.auditLogs;
  filterText = signal("");
  filterStatus = signal<IncidentStatus | "">("");
  priorities: IncidentPriority[] = ["Baja", "Media", "Alta", "Crítica"];
  statuses: IncidentStatus[] = [...DASHBOARD_ACTIVE_STATUSES];
  incidentTypes = this.configService.incidentTypes;
  personRoles: PersonRole[] = ["Víctima", "Victimario", "Testigo"];
  vehicleRoles: VehicleRole[] = [
    "Vehículo Víctima",
    "Vehículo Victimario",
    "Vehículo Involucrado",
  ];
  sortColumn = signal<"priority" | "status" | "default">("default");
  sortDirection = signal<"asc" | "desc">("desc");
  selectedDashboardIncidentId = signal<string | null>(null);
  /** Dirección exacta por geocodificación inversa (id → formatted_address) */
  resolvedAddresses = signal<Record<string, string>>({});
  /** Coordenadas obtenidas por geocodificar la dirección escrita */
  resolvedCoords = signal<Record<string, { lat: number; lng: number }>>({});
  private readonly resolvingAddressIds = new Set<string>();
  private readonly resolvingCoordIds = new Set<string>();
  personService = inject(PersonService);

  incidentForm = this.fb.group({
    event_id: ["", Validators.required],
    priority_id: ["", Validators.required],
    status: ["Nuevo" as IncidentStatus, Validators.required],
    origin: ["", Validators.required],
    phone: ["", [Validators.required, Validators.pattern("^[0-9+ ]*$")]],
    location: ["", Validators.required],
    lat: [null as number | null, Validators.required],
    lng: [null as number | null, Validators.required],
    details: ["", Validators.required],
    comments: [""],
    type: [""],
    priority: ["Media" as IncidentPriority],
    locationPhoneNumber: [{ value: "", disabled: true }],
    involvedPeople: this.fb.array([]),
    involvedVehicles: this.fb.array([]),
  });

  constructor() {
    effect(() => {
      const locationData = this.locationService.locationReceived();
      if (!locationData) return;

      const lat = Number(locationData.lat.toFixed(6));
      const lng = Number(locationData.lng.toFixed(6));

      // Limpiar señal inmediatamente para evitar re-triggers
      this.locationService.clearLocation();

      // Actualizar formulario (ubicación solo desde GPS, no desde persona registrada)
      this.incidentForm.patchValue({
        lat,
        lng,
        location: "",
        origin:
          this.incidentForm.get("origin")?.value || "Solicitud de Ubicación",
        locationPhoneNumber: locationData.phoneNumber || "",
      });

      // Abrir pestaña si no existe
      if (!this.showNewIncidentTab()) {
        this.showNewIncidentTab.set(true);
      }

      if (this.activeTabId() === "new") {
        // Ya estamos en "new": mover mapa directamente
        this.moveMapToLocation(lat, lng);
      } else {
        // Cambiar tab y mover mapa una vez renderizado
        this.activeTabId.set("new");
        setTimeout(() => this.moveMapToLocation(lat, lng), 500);
      }

      this.cdr.detectChanges();
    });

    effect(() => {
      const tabId = this.activeTabId();

      this.releaseMap();

      if (tabId === "new") {
        const savedState = this.newIncidentFormState();
        if (savedState) {
          this.populateFormWithState(savedState);
        } else {
          this.resetFormForNewIncident();
        }

        setTimeout(() => {
          const lat = this.incidentForm.get("lat")?.value || 4.645368;
          const lng = this.incidentForm.get("lng")?.value || -74.1131;
          this.initMap(lat, lng).then(() => {
            if (savedState?.lat && savedState?.lng) {
              setTimeout(
                () => this.reverseGeocode(savedState.lat, savedState.lng),
                300,
              );
            }
          });
        }, 350);
      } else if (tabId) {
        console.log("TAB ACTIVO:", tabId);
        console.log("MAP:", this.map);
        console.log("MARKER:", this.marker);
        console.log("INCIDENTES:", this.incidents());
        const incident = this.openIncidentTabs().find(
          (inc) => inc.id === tabId,
        );
        if (incident) {
          this.populateFormWithState(incident);
          setTimeout(() => this.initMap(incident.lat, incident.lng), 350);
        }
      }
    });

    effect(() => {
      const list = this.incidents();
      this.selectedDashboardIncidentId();
      this.prefetchActiveAddresses(list);
      if (!this.dashboardMap) return;
      this.renderDashboardIncidents();
    });
  }

  private moveMapToLocation(lat: number, lng: number) {
    if (this.map && this.marker) {
      this.map.setCenter({ lat, lng });
      this.map.setZoom(17);
      this.marker.setPosition({ lat, lng });
      google.maps.event.trigger(this.map, "resize");
      setTimeout(() => this.reverseGeocode(lat, lng), 300);
    } else {
      this.initMap(lat, lng).then(() => {
        setTimeout(() => this.reverseGeocode(lat, lng), 300);
      });
    }
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
    const mapEl = document.getElementById("map");
    if (mapEl) mapEl.replaceChildren();
  }

  private waitForGoogleMaps(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof google !== "undefined" && google.maps) {
        resolve();
        return;
      }
      const interval = setInterval(() => {
        if (typeof google !== "undefined" && google.maps) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });
  }

  private async initMap(lat = 4.645368, lng = -74.1131): Promise<void> {
    await this.waitForGoogleMaps();

    const mapEl = document.getElementById("map");
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

    this.marker = new google.maps.Marker({
      map: this.map,
      position: { lat, lng },
      draggable: true,
      title: "Ubicación del incidente",
    });

    this.map!.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !this.marker) return;
      this.marker.setPosition(e.latLng);
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      this.ngZone.run(() => {
        this.updateFormCoords(lat, lng);
        this.reverseGeocode(lat, lng);
      });
    });

    this.marker!.addListener("dragend", () => {
      const pos = this.marker?.getPosition();
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

    const mapEl = document.getElementById("incident-map");

    if (!mapEl) {
      return;
    }

    this.dashboardMap = new google.maps.Map(mapEl, {
      center: BOGOTA_CENTER,
      zoom: BOGOTA_DEFAULT_ZOOM,
      minZoom: 10,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      restriction: {
        latLngBounds: BOGOTA_BOUNDS,
        strictBounds: false,
      },
    });

    this.dashboardInfoWindow = new google.maps.InfoWindow();

    this.dashboardMapClickListener = this.dashboardMap.addListener("click", () => {
      this.ngZone.run(() => this.clearDashboardSelection());
    });

    setTimeout(() => {
      google.maps.event.trigger(this.dashboardMap, "resize");
      this.renderDashboardIncidents();
    }, 100);
  }

  private resetDashboardMapToBogota(): void {
    if (!this.dashboardMap) return;
    this.dashboardMap.setCenter(BOGOTA_CENTER);
    this.dashboardMap.setZoom(BOGOTA_DEFAULT_ZOOM);
  }

  /** Tras fitBounds, no acercar más de lo necesario: se debe reconocer Bogotá. */
  private clampDashboardMapZoom(maxZoom = BOGOTA_FIT_MAX_ZOOM): void {
    if (!this.dashboardMap) return;
    const z = this.dashboardMap.getZoom();
    if (z != null && z > maxZoom) {
      this.dashboardMap.setZoom(maxZoom);
    }
  }

  private fitAllDashboardMarkers(): void {
    if (!this.dashboardMap) return;

    const placable = this.getDashboardActiveIncidents().filter((inc) =>
      this.hasValidCoords(inc),
    );
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
      google.maps.event.addListenerOnce(this.dashboardMap, "idle", () => {
        this.clampDashboardMapZoom();
        const z = this.dashboardMap?.getZoom();
        if (z != null && z < BOGOTA_DEFAULT_ZOOM) {
          this.dashboardMap?.setZoom(BOGOTA_DEFAULT_ZOOM);
        }
      });
    } else {
      this.dashboardMap.setCenter(bounds.getCenter());
      this.dashboardMap.setZoom(BOGOTA_FIT_MAX_ZOOM);
    }
  }

  clearDashboardSelection(): void {
    if (!this.selectedDashboardIncidentId()) return;

    this.selectedDashboardIncidentId.set(null);
    this.dashboardInfoWindow?.close();
    this.renderDashboardIncidents();
    this.cdr.markForCheck();
  }

  onDashboardAreaClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest("tr[data-incident-id]")) return;
    if (target.closest("#incident-map")) return;
    if (target.closest("button")) return;
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
    return this.getDashboardActiveIncidents().filter((inc) =>
      this.hasValidCoords(inc),
    ).length;
  });

  getMarkerColor(incident: Incident): string {
    if (isHiddenByDefaultInIncidentList(incident.status)) {
      if (incident.status === "Cancelado") return "#991b1b";
      return "#6b7280";
    }
    switch (incident.priority) {
      case "Crítica":
        return "#ef4444";
      case "Alta":
        return "#f97316";
      case "Media":
        return "#eab308";
      case "Baja":
        return "#4ade80";
      default:
        break;
    }
    switch (incident.status) {
      case "Nuevo":
        return "#3b82f6";
      case "En gestión OSGE":
        return "#6366f1";
      case "Enviado a CERREM":
        return "#8b5cf6";
      case "En evaluación CERREM":
        return "#a855f7";
      case "Aprobado con medidas":
        return "#eab308";
      case "Medidas asignadas":
        return "#f97316";
      case "Seguimiento activo":
        return "#22c55e";
      case "Asignado":
        return "#6366f1";
      case "En camino":
        return "#eab308";
      case "En situación":
        return "#f97316";
      default:
        return "#9ca3af";
    }
  }

  private buildMarkerIcon(incident: Incident, selected: boolean): google.maps.Symbol {
    const color = this.getMarkerColor(incident);
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: selected ? 12 : 9,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: selected ? "#ffffff" : "#1f2937",
      strokeWeight: selected ? 3 : 1.5,
    };
  }

  getExactAddress(incident: Incident): string {
    const cached = this.resolvedAddresses()[incident.id];
    if (cached) return cached;
    const stored = incident.location?.trim();
    if (stored) return stored;
    return "";
  }

  getIncidentCoordsLabel(incident: Incident): string {
    const pos = this.getIncidentPosition(incident);
    if (!pos) return "";
    return `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
  }

  isAddressLoading(incidentId: string): boolean {
    return this.resolvingAddressIds.has(incidentId);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private buildInfoWindowContent(incident: Incident): string {
    const priorityColor = this.getMarkerColor(incident);
    const address = this.getExactAddress(incident);
    const coords = this.getIncidentCoordsLabel(incident);
    const addressBlock = address
      ? this.escapeHtml(address)
      : this.isAddressLoading(incident.id)
        ? "Obteniendo dirección exacta…"
        : "Sin dirección registrada";
    return `
      <div style="min-width:260px;color:#111827;font-family:system-ui,sans-serif;">
        <h3 style="margin:0 0 8px;font-size:15px;">${this.escapeHtml(incident.id)}</h3>
        <p style="margin:4px 0;"><strong>Tipo:</strong> ${this.escapeHtml(incident.type)}</p>
        <p style="margin:4px 0;"><strong>Prioridad:</strong>
          <span style="color:${priorityColor};font-weight:700;">${this.escapeHtml(incident.priority)}</span>
        </p>
        <p style="margin:4px 0;"><strong>Estado:</strong> ${this.escapeHtml(incident.status)}</p>
        <p style="margin:4px 0;"><strong>Operador:</strong> ${this.escapeHtml(incident.operator || "Sin asignar")}</p>
        <p style="margin:6px 0 2px;"><strong>Dirección exacta:</strong></p>
        <p style="margin:0 0 6px;line-height:1.4;">${addressBlock}</p>
        ${coords ? `<p style="margin:4px 0;font-size:12px;color:#4b5563;"><strong>Coordenadas:</strong> ${coords}</p>` : ""}
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
    this.waitForGoogleMaps().then(() => {
      if (!this.geocoder) this.geocoder = new google.maps.Geocoder();
      this.geocoder!.geocode(
        { address, componentRestrictions: { country: "co" } },
        (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
          this.ngZone.run(() => {
            this.resolvingCoordIds.delete(incident.id);
            if (status === "OK" && results?.[0]?.geometry?.location) {
              const lat = results[0].geometry.location.lat();
              const lng = results[0].geometry.location.lng();
              this.resolvedCoords.update((m) => ({
                ...m,
                [incident.id]: { lat, lng },
              }));
              this.renderDashboardIncidents();
            }
            this.cdr.markForCheck();
          });
        },
      );
    });
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
    this.waitForGoogleMaps().then(() => {
      if (!this.geocoder) this.geocoder = new google.maps.Geocoder();
      const pos = this.getIncidentPosition(incident);
      if (!pos) return;
      this.geocoder!.geocode(
        { location: pos },
        (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
          this.ngZone.run(() => {
            this.resolvingAddressIds.delete(incident.id);
            if (status === "OK" && results?.[0]?.formatted_address) {
              this.resolvedAddresses.update((m) => ({
                ...m,
                [incident.id]: results[0].formatted_address,
              }));
              const markerData = this.dashboardMarkers.get(incident.id);
              if (markerData) {
                markerData.infoWindow.setContent(
                  this.buildInfoWindowContent(incident),
                );
              }
              if (this.selectedDashboardIncidentId() === incident.id) {
                this.refreshSelectedInfoWindow(incident);
              }
            }
            this.cdr.markForCheck();
          });
        },
      );
    });
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

  private renderDashboardIncidents(): void {
    if (!this.dashboardMap) return;

    this.dashboardMarkers.forEach(({ marker, infoWindow }) => {
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
      infoWindow.close();
    });
    this.dashboardMarkers.clear();
    this.dashboardInfoWindow?.close();

    const activeIncidents = this.getDashboardActiveIncidents();
    const selectedId = this.selectedDashboardIncidentId();
    const placable = activeIncidents.filter((inc) => this.hasValidCoords(inc));
    const positions = this.spreadOverlappingPositions(placable);
    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    placable.forEach((incident) => {
      const position = positions.get(incident.id);
      if (!position) return;

      const isSelected = selectedId === incident.id;

      const marker = new google.maps.Marker({
        map: this.dashboardMap,
        position,
        title: `${incident.id} — ${incident.type}`,
        icon: this.buildMarkerIcon(incident, isSelected),
        zIndex: isSelected ? 1000 : 1,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: this.buildInfoWindowContent(incident),
      });

      marker.addListener("click", () => {
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
          "Ubicando incidente",
          `Buscando coordenadas de ${incident.id} en el mapa…`,
        );
      } else {
        this.notificationService.addNotification(
          "Sin ubicación",
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
    this.resolveAddressForIncident(incident);
    if (!this.dashboardMap) {
      setTimeout(() => this.selectDashboardIncident(incident), 400);
      return;
    }
    this.renderDashboardIncidents();
    setTimeout(() => {
      document
        .querySelector(`[data-incident-id="${incident.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
    this.cdr.markForCheck();
  }

  selectedDashboardIncident = computed(() => {
    const id = this.selectedDashboardIncidentId();
    if (!id) return null;
    return this.incidents().find((i) => i.id === id) ?? null;
  });

  private focusIncidentOnDashboardMap(
    incident: Incident,
    scrollToRow = false,
  ): void {
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
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }

  private initAutocomplete() {
    const locationInput = document.getElementById(
      "location",
    ) as HTMLInputElement;
    if (!locationInput) return;

    this.autocomplete = new google.maps.places.Autocomplete(locationInput, {
      componentRestrictions: { country: "co" },
      fields: ["geometry", "formatted_address"],
    });

    this.autocomplete!.addListener("place_changed", () => {
      const place = this.autocomplete!.getPlace();
      if (!place.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      this.ngZone.run(() => {
        this.updateFormCoords(lat, lng);
        this.incidentForm.patchValue({ location: place.formatted_address });
        this.map?.setCenter({ lat, lng });
        this.map?.setZoom(17);
        if (this.marker) (this.marker as any).setPosition({ lat, lng });
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
    if (!this.geocoder) {
      if (typeof google === "undefined") return;
      this.geocoder = new google.maps.Geocoder();
    }
    this.geocoder!.geocode(
      { location: { lat, lng } },
      (results: any, status: any) => {
        this.ngZone.run(() => {
          if (status === "OK" && results?.[0]) {
            this.incidentForm.patchValue({
              location: results[0].formatted_address,
            });
            this.cdr.detectChanges();
          }
        });
      },
    );
  }

  activeIncident = computed(() => {
    const tabId = this.activeTabId();
    if (!tabId || tabId === "new") return null;
    return this.openIncidentTabs().find((inc) => inc.id === tabId) ?? null;
  });

  incidentAuditLogs = computed(() => {
    const incident = this.activeIncident();
    if (!incident) return [];
    return this.auditLogs().filter((log) => log.incidentId === incident.id);
  });

  get involvedPeople(): FormArray {
    return this.incidentForm.get("involvedPeople") as FormArray;
  }
  get involvedVehicles(): FormArray {
    return this.incidentForm.get("involvedVehicles") as FormArray;
  }

  createPersonGroup(): FormGroup {
    return this.fb.group({
      name: ["", Validators.required],
      role: ["Testigo" as PersonRole, Validators.required],
      contact: [""],
      details: [""],
      phone: [""],
      documentType: ["" as DocumentType | "", Validators.required],
      documentId: [""],
      gender: ["" as PersonGender | "", Validators.required],
    });
  }
  addPerson(): void {
    if (this.involvedPeople.length < 4)
      this.involvedPeople.push(this.createPersonGroup());
  }
  removePerson(index: number): void {
    this.involvedPeople.removeAt(index);
  }

  createVehicleGroup(): FormGroup {
    return this.fb.group({
      plate: [
        "",
        [Validators.required, Validators.pattern(this.platePattern)],
      ],
      role: ["Vehículo Involucrado" as VehicleRole, Validators.required],
      make: [""],
      model: [""],
      color: [""],
      details: [""],
    });
  }
  addVehicle(): void {
    if (this.involvedVehicles.length < 4)
      this.involvedVehicles.push(this.createVehicleGroup());
  }
  removeVehicle(index: number): void {
    this.involvedVehicles.removeAt(index);
  }

  normalizeVehiclePlate(index: number): void {
    const control = this.involvedVehicles.at(index)?.get("plate");
    if (!control) return;
    const cleaned = String(control.value || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[^A-Z0-9-]/g, "");
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
    const status = this.filterStatus();
    const sourceIncidents = status
      ? this.incidents()
      : this.getDashboardActiveIncidents();
    const incidents = sourceIncidents.filter((incident) => {
      const textMatch =
        !text ||
        incident.id.toLowerCase().includes(text) ||
        incident.type.toLowerCase().includes(text) ||
        incident.location.toLowerCase().includes(text) ||
        (incident.operator || "").toLowerCase().includes(text);
      const statusMatch = !status || incident.status === status;
      return textMatch && statusMatch;
    });
    return this.sortIncidents(incidents);
  });

  activeIncidentsCount = computed(() => this.dashboardActiveIncidents().length);
  criticalPriorityCount = computed(
    () =>
      this.dashboardActiveIncidents().filter(
        (inc) => inc.priority === "Crítica",
      ).length,
  );
  closedCount = computed(
    () =>
      this.incidents().filter((inc) =>
        isHiddenByDefaultInIncidentList(inc.status),
      ).length,
  );

  private sortIncidents(incidents: Incident[]): Incident[] {
    const sorted = incidents.slice();
    const column = this.sortColumn();
    const direction = this.sortDirection();
    if (column === "default") {
      return sorted.sort(
        (a, b) =>
          priorityOrder[b.priority] - priorityOrder[a.priority] ||
          statusOrder[b.status] - statusOrder[a.status],
      );
    }
    const dir = direction === "asc" ? 1 : -1;
    return sorted.sort((a, b) => {
      const valA =
        column === "priority"
          ? priorityOrder[a.priority]
          : statusOrder[a.status];
      const valB =
        column === "priority"
          ? priorityOrder[b.priority]
          : statusOrder[b.status];
      return (valA - valB) * dir;
    });
  }

  ngOnInit() {
    if (this.incidentService.incidents().length === 0)
      this.incidentService.getIncidents();

    this.typeSub = this.incidentForm
      .get("event_id")
      ?.valueChanges.subscribe((typeName) => {
        this.selectedIncidentTypeName.set(typeName || null);
        const selectedType = this.incidentTypes().find(
          (t) => t.name === typeName,
        );
        if (selectedType) {
          this.incidentForm.patchValue(
            {
              priority_id: selectedType.defaultPriority,
              type: selectedType.name,
              priority: selectedType.defaultPriority as IncidentPriority,
            },
            { emitEvent: false },
          );
        }
      });

    this.setupPhoneLookup();
    setTimeout(() => this.initDashboardMap(), 300);
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  private setupPhoneLookup(): void {
    this.phoneSub?.unsubscribe();
    const phoneControl = this.incidentForm.get("phone");
    if (!phoneControl) return;

    this.phoneSub = phoneControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        filter(
          (phone): phone is string =>
            !!phone && this.normalizePhone(phone).length >= 7,
        ),
        switchMap((phone) =>
          this.personService.lookupByPhone(phone).pipe(
            catchError(() => of(null)),
          ),
        ),
      )
      .subscribe((person) => this.applyPersonLookupResult(person));
  }

  private applyPersonLookupResult(person: Person | null): void {
    if (!person) return;

    const phone = this.incidentForm.get("phone")?.value as string;
    const notifyKey = `${this.normalizePhone(phone)}:${person.id}`;
    if (!this.personLookupNotified.has(notifyKey)) {
      this.personLookupNotified.add(notifyKey);
      this.notificationService.addNotification(
        "Persona Identificada",
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
      role: "Víctima",
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
      this.setActiveTab("new");
    }
  }

  openIncidentTab(incident: Incident) {
    this.selectDashboardIncident(incident);

    const alreadyOpen = this.openIncidentTabs().some(
      (tab) => tab.id === incident.id,
    );

    if (alreadyOpen) {
      this.setActiveTab(incident.id);
      return;
    }

    if (this.openIncidentTabs().length >= this.MAX_TABS) {
      this.notificationService.addNotification(
        "Límite Alcanzado",
        "Cierre una pestaña para abrir una nueva.",
      );
      return;
    }

    this.openIncidentTabs.update((tabs) => [...tabs, incident]);

    this.setActiveTab(incident.id);

    this.notificationService.addNotification(
      "Pestaña Abierta",
      `Se abrió el incidente #${incident.id}.`,
      incident.id,
    );
  }

  setActiveTab(tabId: string | "new") {
    if (this.activeTabId() === tabId) {
      this.activeTabId.set(null);
      setTimeout(() => this.activeTabId.set(tabId), 50);
      return;
    }
    if (this.activeTabId() === "new") {
      this.newIncidentFormState.set(this.incidentForm.getRawValue());
    }
    this.activeTabId.set(tabId);
  }

  closeIncidentTab(idToClose: string, event: MouseEvent) {
    event.stopPropagation();
    const tabs = this.openIncidentTabs();
    const index = tabs.findIndex((t) => t.id === idToClose);
    if (this.activeTabId() === idToClose) {
      const nextTabId =
        tabs[index - 1]?.id ??
        tabs[index + 1]?.id ??
        (this.showNewIncidentTab() ? "new" : null);
      this.activeTabId.set(nextTabId);
    }
    this.openIncidentTabs.update((t) =>
      t.filter((tab) => tab.id !== idToClose),
    );
  }

  closeNewIncidentTab(event?: MouseEvent) {
    event?.stopPropagation();
    this.showNewIncidentTab.set(false);
    this.newIncidentFormState.set(null);
    if (this.activeTabId() === "new")
      this.activeTabId.set(this.openIncidentTabs().at(-1)?.id ?? null);
  }

  registerIncident() {
    if (this.incidentForm.invalid) {
      this.incidentForm.markAllAsTouched();
      return;
    }
    const formValue = this.incidentForm.getRawValue();
    const newIncident: Incident = {
      id: "",
      timestamp: new Date().toLocaleString("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      status: (formValue.status || "Nuevo") as IncidentStatus,
      event_id: formValue.event_id ?? "",
      priority_id: formValue.priority_id ?? "",
      origin: formValue.origin ?? "",
      phone: formValue.phone ?? "",
      location: formValue.location ?? "",
      lat: formValue.lat ?? 0,
      lng: formValue.lng ?? 0,
      details: formValue.details ?? "",
      comments: formValue.comments ?? "",
      type: formValue.event_id ?? "",
      priority: (formValue.priority_id ?? "Media") as IncidentPriority,
      operator: "N/A",
      ani: formValue.phone ?? "N/A",
      locationPhoneNumber: formValue.locationPhoneNumber ?? "",
      involvedPeople: (formValue.involvedPeople ?? []) as InvolvedPerson[],
      involvedVehicles: (formValue.involvedVehicles ?? []) as InvolvedVehicle[],
    };
    this.incidentService.addIncident(newIncident);

    setTimeout(() => {
      this.renderDashboardIncidents();
    }, 200);
    this.notificationService.addNotification(
      "Incidente Registrado",
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
      status: (updatedData.status || "Nuevo") as IncidentStatus,
      event_id: updatedData.event_id ?? "",
      priority_id: updatedData.priority_id ?? "",
      origin: updatedData.origin ?? "",
      phone: updatedData.phone ?? "",
      location: updatedData.location ?? "",
      lat: updatedData.lat ?? 0,
      lng: updatedData.lng ?? 0,
      details: updatedData.details ?? "",
      comments: updatedData.comments ?? "",
      type: updatedData.event_id ?? "",
      priority: (updatedData.priority_id ?? "Media") as IncidentPriority,
      involvedPeople: (updatedData.involvedPeople ?? []) as InvolvedPerson[],
      involvedVehicles: (updatedData.involvedVehicles ??
        []) as InvolvedVehicle[],
    };
    this.incidentService.updateIncident(finalData, () => {
      void this.configService.getAuditLogs();
      this.cdr.markForCheck();
    });
    this.openIncidentTabs.update((tabs) =>
      tabs.map((t) => (t.id === incidentId ? finalData : t)),
    );
    this.notificationService.addNotification(
      "Incidente Actualizado",
      `Se guardaron los cambios para #${incidentId}.`,
      incidentId,
    );
  }

  private resetFormForNewIncident() {
    this.selectedIncidentTypeName.set(null);
    this.incidentForm.reset({
      event_id: "",
      priority_id: "Media",
      status: "Nuevo",
      origin: "",
      phone: "",
      location: "",
      details: "",
      comments: "",
    });
    this.involvedPeople.clear();
    this.involvedVehicles.clear();
    this.incidentForm.enable();
  }

  private populateFormWithState(state: Partial<Incident>) {
    this.selectedIncidentTypeName.set(
      state.type || (state as any).event_id || null,
    );
    this.incidentForm.reset(undefined, { emitEvent: false });
    this.incidentForm.patchValue(state, { emitEvent: false });
    this.involvedPeople.clear();
    state.involvedPeople?.forEach((p) =>
      this.involvedPeople.push(
        this.fb.group({
          name: [p.name ?? "", Validators.required],
          role: [p.role ?? "Testigo", Validators.required],
          contact: [p.contact],
          details: [p.details ?? p.comentarios],
          phone: [p.phone],
          documentType: [
            (p.documentType || "") as DocumentType | "",
            Validators.required,
          ],
          documentId: [p.documentId],
          gender: [(p.gender ?? "") as PersonGender | "", Validators.required],
        }),
      ),
    );
    this.involvedVehicles.clear();
    state.involvedVehicles?.forEach((v) =>
      this.involvedVehicles.push(
        this.fb.group({
          plate: [
            v.plate,
            [Validators.required, Validators.pattern(this.platePattern)],
          ],
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
    if (tabId && tabId !== "new") {
      const inc = this.openIncidentTabs().find((i) => i.id === tabId);
      if (inc) {
        this.openIncidentEmailModal(inc);
        return;
      }
    }
    this.notificationService.addNotification(
      "Guarde el incidente",
      "Debe guardar el incidente antes de enviar la notificación por correo.",
    );
  }

  sendIncidentByEmail(incident: Incident) {
    this.openIncidentEmailModal(incident);
  }

  sendSingleIncidentByEmail(incident: Incident) {
    this.openIncidentEmailModal(incident);
  }

  onFilterText(event: Event) {
    this.filterText.set((event.target as HTMLInputElement).value);
  }
  onFilterStatus(event: Event) {
    this.filterStatus.set(
      (event.target as HTMLSelectElement).value as IncidentStatus | "",
    );
  }

  setSort(column: "priority" | "status"): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === "desc" ? "asc" : "desc");
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set("desc");
    }
  }

  getStatusColor(status: IncidentStatus): string {
    switch (status) {
      case "Nuevo":
        return "bg-blue-600/80 text-blue-100";
      case "En gestión OSGE":
        return "bg-indigo-600/80 text-indigo-100";
      case "Enviado a CERREM":
        return "bg-violet-600/80 text-violet-100";
      case "En evaluación CERREM":
        return "bg-purple-600/80 text-purple-100";
      case "Aprobado con medidas":
        return "bg-yellow-600/80 text-yellow-100";
      case "Medidas asignadas":
        return "bg-orange-600/80 text-orange-100";
      case "Seguimiento activo":
        return "bg-green-600/80 text-green-100";
      case "Asignado":
        return "bg-indigo-600/80 text-indigo-100";
      case "En camino":
        return "bg-yellow-600/80 text-yellow-100";
      case "En situación":
        return "bg-orange-600/80 text-orange-100";
      case "Resuelto":
      case "Resuelto con medidas":
        return "bg-green-600/80 text-green-100";
      case "Cerrado":
      case "Cerrado sin medidas":
        return "bg-gray-600/80 text-gray-200";
      case "Cerrado con solución":
        return "bg-teal-600/80 text-teal-100";
      case "Cancelado":
        return "bg-red-800/80 text-red-200";
      default:
        return "bg-gray-500/80 text-gray-100";
    }
  }

  getPriorityColor(priority: IncidentPriority): string {
    switch (priority) {
      case "Baja":
        return "text-green-400";
      case "Media":
        return "text-yellow-400";
      case "Alta":
        return "text-orange-400";
      case "Crítica":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  }

  ngOnDestroy() {
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
