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
  untracked,
  NgZone,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormArray,
  FormGroup,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import {
  Incident,
  IncidentStatus,
  IncidentPriority,
  VehicleRole,
  InvolvedPerson,
  InvolvedPlace,
  InvolvedVehicle,
  Person,
  DocumentTypeOption,
  joinPersonName,
  splitPersonName,
  ColombiaDepartment,
  ColombiaMunicipality,
  CatalogOption,
  isVisibleInActiveViews,
  incidentMatchesCatalogStatus,
  catalogStatusToUiStatus,
  incidentIdSortKey,
  isForwardStatusTransition,
  needsCerremGestionForTransition,
  needsOsegGestionForTransition,
  CSJ_STATUS_WORKFLOW_RANK,
} from '../../models/incident.model';
import {
  isCsjMedidasWorkflow,
  medidasTabHint,
  shouldNavigateToMedidasTab,
  isCsjStatusChoiceAllowed,
  requiresMedidasBeforeClose,
  getCsjStatusDisabledReason,
  statusOptionLabel,
  isCsjLegacyEnviadoCerremStatus,
  type GestionSnapshot,
} from '../../utils/medidas-permissions';
import { Subscription, of, firstValueFrom } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  tap,
} from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { IncidentLeaveGuardService } from '../../services/incident-leave-guard.service';
import { ConfigurationService } from '../../services/configuration.service';
import { LocationRequestService, LocationData } from '../../services/location-request.service';
import { IncidentService } from '../../services/incident.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { PersonService } from '../../services/person.service';
import { ColombiaGeoService } from '../../services/colombia-geo.service';
import { AuditClientService } from '../../services/audit-client.service';
import { HttpClient } from '@angular/common/http';
import { IncidentEmailModalComponent } from '../incident-email-modal/incident-email-modal.component';
import { MedidasComponent } from '../medidas/medidas.component';
import {
  createMapPin,
  createPlaceAutocomplete,
  isGoogleMapsLoaded,
  MapPin,
  PlaceAutocompleteControl,
} from '../../utils/google-maps-legacy';
import { loadGoogleMaps } from '../../utils/google-maps-loader';
import {
  appendIncidentNote,
  displayCommentBody,
  formatNoteForDisplay,
  IncidentNoteEntry,
  buildCommentHistoryView,
  noteAuthorInitials,
  enrichCommentAuthors,
  resolveHistoryAuthor,
  countReiteracionNotes,
  parseDmyDateTime,
} from '../../utils/incident-notes';
import { AuditLog } from '../../models/admin.model';

@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IncidentEmailModalComponent, MedidasComponent],
  templateUrl: './incident-list.component.html',
  styleUrls: ['./incident-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentListComponent implements OnInit, OnDestroy {
  @ViewChild(MedidasComponent) medidasPanel?: MedidasComponent;
  @ViewChild('agregarComentarioField') agregarComentarioField?: ElementRef<HTMLTextAreaElement>;

  private readonly platePattern = /^[A-Za-z0-9-]{5,8}$/;

  /** Placa opcional en BD; si se escribe, debe cumplir el formato. */
  private readonly validateOptionalPlate = (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    return this.platePattern.test(value) ? null : { pattern: true };
  };

  private isVehicleRowFilled(group: FormGroup): boolean {
    const plate = String(group.get('plate')?.value || '').trim();
    const role = String(group.get('role')?.value || '').trim();
    const hasCatalog =
      !!String(group.get('make')?.value || '').trim() ||
      !!String(group.get('model')?.value || '').trim() ||
      !!String(group.get('color')?.value || '').trim() ||
      !!String(group.get('details')?.value || '').trim();
    return !!(plate || role || hasCatalog);
  }

  /** Inferir código de catálogo (CC, PA, …) cuando el lookup no trae tipo. */
  private inferDocumentType(documentId: string): string {
    const id = String(documentId || '').trim();
    if (!id) return '';
    if (/[A-Za-z]/.test(id)) return 'PA';
    const digits = id.replace(/\D/g, '');
    if (digits.length >= 6 && digits.length <= 11) return 'CC';
    return '';
  }

  private resolveDocumentType(person: Person): string {
    const raw = String(person.documentType || '').trim();
    if (raw) {
      const byCode = this.documentTypes().find((d) => d.code === raw);
      if (byCode) return byCode.code;
      const byName = this.documentTypes().find((d) => d.name.toLowerCase() === raw.toLowerCase());
      if (byName) return byName.code;
      return raw;
    }
    return this.inferDocumentType(person.documentId);
  }
  private readonly vehicleLookupTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly vehicleLastLookupPlate = new Map<number, string>();
  private readonly vehicleLookupNotified = new Set<string>();
  private readonly personLookupTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly personLastLookupKey = new Map<number, string>();
  private placeDeptSubs: Subscription[] = [];
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly incidentLeaveGuard = inject(IncidentLeaveGuardService);
  private readonly configService = inject(ConfigurationService);
  private readonly locationService = inject(LocationRequestService);

  /** Teléfono opcional; si se escribe, solo dígitos/+ y formato colombiano válido. */
  private readonly validateOptionalPhone = (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (!raw) return null;
    if (!/^[0-9+ ]+$/.test(raw)) return { phoneChars: true };
    return this.locationService.validateColombianPhone(raw).valid ? null : { phoneFormat: true };
  };

  private readonly incidentService = inject(IncidentService);
  private readonly authService = inject(AuthService);
  readonly permissionService = inject(PermissionService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly colombiaGeo = inject(ColombiaGeoService);
  private readonly http = inject(HttpClient);
  private readonly auditClient = inject(AuditClientService);

  // --- Tab Management State ---
  openIncidentTabs = signal<Incident[]>([]);
  showNewIncidentTab = signal(false);
  activeTabId = signal<string | null>(null);
  detailTab = signal<'detalle' | 'medidas'>('detalle');
  mapReady = signal(false);
  mapsError = signal<string | null>(null);
  selectedIncidentTypeName = signal<string | null>(null);
  isProtocolVisible = signal(true);
  newIncidentFormState = signal<Partial<Incident> | null>(null);
  readonly MAX_TABS = 5;
  /** Mensajes inline cuando un catálogo queda vacío tras cargar (sin referencias técnicas). */
  readonly catalogEmptyHints = {
    statuses: 'No hay estados disponibles para su agencia. Contacte al administrador del sistema.',
    origins: 'No hay orígenes disponibles para su agencia. Contacte al administrador del sistema.',
    municipalities:
      'No hay municipios disponibles para este departamento. Contacte al administrador del sistema.',
  } as const;

  emailModalIncident = signal<Incident | null>(null);

  canNotify(): boolean {
    return this.permissionService.canNotify();
  }

  canCreate(): boolean {
    return this.permissionService.canModuleAction('Incidentes', 'create');
  }

  canViewIncident(): boolean {
    return this.permissionService.canViewIncident();
  }

  leaveConfirmOpen = signal(false);
  /** Borrador sin guardar en pestaña Medidas (OSEG / CERREM / medidas). */
  medidasPendingChanges = signal(false);
  /** true = modal abierto desde pestaña «Nuevo incidente» */
  leaveConfirmForNewTab = signal(false);
  updateConfirmOpen = signal(false);
  private pendingLeaveAction: (() => void) | null = null;
  private leaveAfterSave = false;
  commentsHistory = signal<IncidentNoteEntry[]>([]);
  readonly formatNoteHeader = formatNoteForDisplay;
  readonly commentAuthorInitials = noteAuthorInitials;

  // Google Maps
  private map: google.maps.Map | null = null;
  private marker: MapPin | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  private autocomplete: PlaceAutocompleteControl | null = null;

  private typeSub: Subscription | undefined;
  private phoneSub: Subscription | undefined;
  private statusSub: Subscription | undefined;
  private formDirtySub: Subscription | undefined;
  private skipStatusNav = false;
  /** Evita pisar la prioridad que el operador eligió manualmente. */
  private lastIncidentTypeName: string | null = null;
  private lastTypeDefaultPriority: IncidentPriority | null = null;
  private priorityManuallyOverridden = false;
  private incidentDeptSub: Subscription | undefined;
  private readonly personLookupNotified = new Set<string>();

  incidents = this.incidentService.incidents;
  auditLogs = this.configService.auditLogs;
  filterText = signal('');
  filterStatus = signal('');
  readonly listPageSize = 15;
  listCurrentPage = signal(1);
  priorities: IncidentPriority[] = ['Baja', 'Media', 'Alta', 'Crítica'];
  incidentTypes = this.configService.incidentTypes;
  personRoles = signal<CatalogOption[]>([]);
  genders = signal<CatalogOption[]>([]);
  documentTypes = signal<DocumentTypeOption[]>([]);
  placeRoles = signal<CatalogOption[]>([]);
  origins = signal<CatalogOption[]>([]);
  originsLoaded = signal(false);
  incidentStatuses = signal<CatalogOption[]>([]);
  incidentStatusesLoaded = signal(false);
  allowedStatuses = signal<string[]>([]);
  workflowGestion = signal<GestionSnapshot | null>(null);
  currentIncidentUiStatus = signal('');
  /** Municipios por fila de lugar involucrado (índice del FormArray). */
  placeMunicipalities = signal<Map<number, ColombiaMunicipality[]>>(new Map());
  departments = signal<ColombiaDepartment[]>([]);
  /** Municipios del Ubicación del Incidente(según departamento del incidente). */
  incidentMunicipalities = signal<ColombiaMunicipality[]>([]);
  incidentMunicipalitiesLoaded = signal(false);
  /** Municipios cargados por fila de lugar involucrado (índice → listo). */
  placeMunicipalitiesLoaded = signal<Map<number, boolean>>(new Map());
  vehicleRoles: VehicleRole[] = ['Vehículo Víctima', 'Vehículo Victimario', 'Vehículo Involucrado'];
  readonly personService = inject(PersonService);

  incidentForm = this.fb.group({
    event_id: ['', Validators.required],
    priority_id: ['', Validators.required],
    status: ['', Validators.required],
    origin: ['', Validators.required],
    phone: ['', this.validateOptionalPhone],
    location: ['', Validators.required],
    departmentId: [null as number | null],
    municipalityId: [null as number | null],
    lat: [null as number | null, Validators.required],
    lng: [null as number | null, Validators.required],
    agregarComentario: [''],
    type: [''],
    priority: ['' as IncidentPriority],
    locationPhoneNumber: [{ value: '', disabled: true }],
    involvedPeople: this.fb.array([]),
    involvedPlaces: this.fb.array([]),
    involvedVehicles: this.fb.array([]),
  });

  constructor() {
    effect(() => {
      if (this.locationService.triggerNewIncident()) {
        this.showNewIncidentTab.set(true);
        this.setActiveTab('new');
        this.locationService.clearNewIncidentTrigger();
      }
    });

    effect(() => {
      const pendingId = this.incidentService.pendingOpenIncidentId();
      const view = this.authService.currentView();
      if (!pendingId || view !== 'incidents') return;
      const incident = this.incidents().find((i) => i.id === pendingId);
      if (!incident) return;
      this.openIncidentTab(incident);
      this.incidentService.clearPendingOpenIncident();
    });

    effect(() => {
      const locationData = this.locationService.locationReceived();
      if (!locationData) return;

      const lat = Number(locationData.lat.toFixed(6));
      const lng = Number(locationData.lng.toFixed(6));

      this.showNewIncidentTab.set(true);
      this.setActiveTab('new');

      setTimeout(() => {
        this.applyReceivedLocation(locationData, lat, lng).catch(() => void 0);
      }, 150);

      this.locationService.clearLocation();
      this.notificationService.addNotification(
        'Ubicación recibida',
        'Complete el formulario y pulse Guardar para registrar el incidente en activos.',
      );
    });

    effect(() => {
      this.auditLogs();
      this.cdr.markForCheck();
    });

    effect(() => {
      const tabId = this.activeTabId();
      // Solo reaccionar al cambio de pestaña; no re-ejecutar cuando carguen catálogos (incidentStatuses).
      untracked(() => {
        this.destroyMap();
        this.detailTab.set('detalle');

        const agency = this.sessionAgency();
        this.loadOrigins(agency);

        if (tabId === 'new') {
          this.setupStatusDropdownForNew(agency);
          const pendingPhone = this.locationService.pendingPhone();
          const savedState = this.newIncidentFormState();

          if (pendingPhone) {
            this.resetFormForNewIncident();
            setTimeout(() => {
              this.applyPhoneFromLocationRequest(pendingPhone);
              this.locationService.clearPendingPhone();
            }, 0);
          } else if (savedState) {
            this.populateFormWithState(savedState);
          } else {
            this.resetFormForNewIncident();
          }

          setTimeout(() => this.initMap(), 0);
        } else if (tabId) {
          const incident = this.resolveIncidentForTab(tabId);
          if (incident) {
            this.setupStatusDropdownForEdit(agency, incident.status);
            this.populateFormWithState(incident);
            this.refreshWorkflowGestion(incident.id);
            if (shouldNavigateToMedidasTab(String(incident.status ?? ''))) {
              this.applyDetailTab('medidas');
            }
            setTimeout(() => this.initMap(incident.lat, incident.lng), 0);
          }
        }
      });
    });
  }

  /** SMS/WhatsApp: teléfono del enlace de ubicación; si no, N/A en vitácora. */
  private resolveLocationPhoneForSave(raw: unknown): string {
    const v = typeof raw === 'string' ? raw.trim() : '';
    return v || 'N/A';
  }

  private toLocalPhone(phone: string): string {
    const digits = phone.replaceAll(/\D/g, '');
    if (digits.startsWith('57') && digits.length > 10) {
      return digits.slice(2);
    }
    return digits;
  }

  private async ensureGeocoderReady(): Promise<void> {
    await this.waitForGoogleMaps();
    this.geocoder ??= new google.maps.Geocoder();
  }

  private async applyReceivedLocation(
    locationData: LocationData,
    lat: number,
    lng: number,
  ): Promise<void> {
    const patch: Record<string, unknown> = {
      lat,
      lng,
      origin: this.pickOriginForLocationChannel(locationData.channel),
    };
    if (locationData.phoneNumber) {
      patch['phone'] = locationData.phoneNumber;
    }
    if (locationData.address) {
      patch['location'] = locationData.address;
    }
    this.incidentForm.patchValue(patch);
    if (locationData.phoneNumber) {
      const locationPhoneCtrl = this.incidentForm.get('locationPhoneNumber');
      locationPhoneCtrl?.enable({ emitEvent: false });
      locationPhoneCtrl?.setValue(locationData.phoneNumber, {
        emitEvent: false,
      });
      locationPhoneCtrl?.disable({ emitEvent: false });
      this.lookupPersonByPhone(locationData.phoneNumber);
    }
    await this.syncMapToCoords(lat, lng);
    await this.ensureGeocoderReady();
    const addressFromServer = locationData.address?.trim();
    if (addressFromServer) {
      this.incidentForm.patchValue({ location: addressFromServer }, { emitEvent: false });
      if (this.geocoder) {
        this.geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          this.ngZone.run(() => {
            if (status === 'OK' && results?.[0]) {
              this.applyDepartmentMunicipalityFromGeocode(results[0]).catch(() => void 0);
              this.cdr.markForCheck();
            }
          });
        });
      }
    } else {
      this.reverseGeocodeFromGps(locationData.lat, locationData.lng);
    }
    this.cdr.detectChanges();
  }

  private applyPhoneFromLocationRequest(phone: string): void {
    const local = this.toLocalPhone(phone);
    this.incidentForm.patchValue({
      phone: local,
      origin:
        this.incidentForm.get('origin')?.value ||
        this.pickOriginForLocationChannel(this.locationService.getLastRequestChannel()),
    });
    const locationPhoneCtrl = this.incidentForm.get('locationPhoneNumber');
    locationPhoneCtrl?.enable({ emitEvent: false });
    locationPhoneCtrl?.setValue(local, { emitEvent: false });
    locationPhoneCtrl?.disable({ emitEvent: false });
    this.lookupPersonByPhone(local);
    this.cdr.detectChanges();
  }

  private lookupPersonByPhone(phone: string): void {
    const local = this.toLocalPhone(phone);
    if (local.length < 7) return;

    this.personService.lookupByPhone(local).subscribe({
      next: (person) => this.applyPersonLookupResult(person),
      error: () => void 0,
    });
  }

  // ------ Google Maps ------

  private async waitForGoogleMaps(): Promise<boolean> {
    if (isGoogleMapsLoaded()) return true;

    try {
      await loadGoogleMaps();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo cargar Google Maps';
      this.mapsError.set(msg);
      this.cdr.markForCheck();
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
          this.mapsError.set(
            'Google Maps no cargó a tiempo. Verifique GOOGLE_MAPS_API_KEY en backend/.env.',
          );
          this.cdr.markForCheck();
          resolve(false);
        }
      }, 200);
    });
  }

  private async initMap(lat?: number, lng?: number) {
    this.mapsError.set(null);
    const mapsOk = await this.waitForGoogleMaps();
    if (!mapsOk) return;
    await this.ensureGeocoderReady();

    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    if (this.map) {
      this.destroyMap();
    }

    const formLat = this.incidentForm.get('lat')?.value;
    const formLng = this.incidentForm.get('lng')?.value;
    const centerLat = lat ?? formLat ?? 4.60971;
    const centerLng = lng ?? formLng ?? -74.08175;

    this.map = new google.maps.Map(mapEl, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 15,
      mapId: 'DEMO_MAP_ID',
      disableDefaultUI: false,
      mapTypeControl: false,
      streetViewControl: false,
    });

    this.marker = createMapPin({
      map: this.map,
      position: { lat: centerLat, lng: centerLng },
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
    this.mapReady.set(true);
    this.cdr.markForCheck();
  }

  /** Centra el mapa y el marcador en las coordenadas del incidente. */
  private async syncMapToCoords(lat: number, lng: number, zoom = 17): Promise<void> {
    await this.waitForGoogleMaps();
    if (!this.map) {
      await this.initMap(lat, lng);
      return;
    }
    this.map.setCenter({ lat, lng });
    this.map.setZoom(zoom);
    if (this.marker) {
      this.marker.setPosition({ lat, lng });
    } else {
      this.marker = createMapPin({
        map: this.map,
        position: { lat, lng },
        draggable: true,
        title: 'Ubicación del incidente',
      });
    }
  }

  private initAutocomplete() {
    const locationInput = document.getElementById('location');
    if (!(locationInput instanceof HTMLInputElement)) return;

    this.autocomplete = createPlaceAutocomplete(locationInput, {
      componentRestrictions: { country: 'co' },
      fields: ['geometry', 'formatted_address', 'address_components'],
    });

    this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete!.getPlace();
      if (!place.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      this.ngZone.run(() => {
        this.applyLocationFromGeocode(lat, lng, place.formatted_address, place).catch(() => void 0);
      });
    });
  }

  /** Dirección escrita a mano: geocodificar con Enter. */
  geocodeManualLocation(): void {
    const address = String(this.incidentForm.get('location')?.value || '').trim();
    if (!address) {
      this.notificationService.addNotification(
        'Dirección vacía',
        'Escriba una dirección o referencia antes de buscar.',
      );
      return;
    }
    this.forwardGeocodeAddress(address).catch(() => void 0);
  }

  private async ensureGeocoder(): Promise<google.maps.Geocoder | null> {
    await this.waitForGoogleMaps();
    this.geocoder ??= new google.maps.Geocoder();
    return this.geocoder;
  }

  private async forwardGeocodeAddress(address: string): Promise<void> {
    const geocoder = await this.ensureGeocoder();
    if (!geocoder) return;

    const query = /colombia/i.test(address) ? address : `${address}, Colombia`;

    geocoder.geocode({ address: query, region: 'co' }, (results, status) => {
      this.ngZone.run(() => {
        if (status !== 'OK' || !results?.[0]?.geometry?.location) {
          this.notificationService.addNotification(
            'Dirección no encontrada',
            'No se pudo ubicar esa dirección. Revise el texto o elija una sugerencia del listado.',
          );
          this.cdr.markForCheck();
          return;
        }
        const loc = results[0].geometry.location;
        this.applyLocationFromGeocode(
          loc.lat(),
          loc.lng(),
          results[0].formatted_address,
          results[0],
        ).catch(() => void 0);
      });
    });
  }

  private async applyLocationFromGeocode(
    lat: number,
    lng: number,
    formattedAddress?: string,
    geocodeResult?: google.maps.GeocoderResult | google.maps.places.PlaceResult,
  ): Promise<void> {
    this.updateFormCoords(lat, lng);
    if (formattedAddress) {
      this.incidentForm.patchValue({ location: formattedAddress }, { emitEvent: false });
    }
    if (geocodeResult) {
      await this.applyDepartmentMunicipalityFromGeocode(geocodeResult);
    }
    await this.syncMapToCoords(lat, lng);
    this.cdr.markForCheck();
  }

  private normalizeGeoName(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private geocodeComponent(
    components: google.maps.GeocoderAddressComponent[],
    ...types: string[]
  ): string {
    for (const type of types) {
      const hit = components.find((c) => c.types.includes(type));
      if (hit?.long_name) return hit.long_name;
    }
    return '';
  }

  private isExactCatalogNameMatch(itemName: string, candidate: string): boolean {
    return Boolean(candidate) && itemName === candidate;
  }

  private catalogPartialMatchScore(itemName: string, candidate: string): number {
    if (!candidate) return 0;
    if (candidate.includes(itemName)) return itemName.length;
    if (itemName.includes(candidate) && candidate.length >= 4) return candidate.length;
    return 0;
  }

  private findBestCatalogMatch<T extends { name: string }>(
    catalog: T[],
    candidates: string[],
  ): T | null {
    let best: { item: T; score: number } | null = null;

    for (const item of catalog) {
      const itemName = this.normalizeGeoName(item.name);
      for (const raw of candidates) {
        const candidate = this.normalizeGeoName(raw);
        if (this.isExactCatalogNameMatch(itemName, candidate)) return item;

        const score = this.catalogPartialMatchScore(itemName, candidate);
        if (score > (best?.score ?? 0)) {
          best = { item, score };
        }
      }
    }

    return best?.item ?? null;
  }

  private parseFormattedAddressSegments(formattedAddress: string): string[] {
    const parts = formattedAddress
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length && this.normalizeGeoName(parts.at(-1)!) === 'COLOMBIA') {
      parts.pop();
    }
    return parts;
  }

  private inferDeptAndCityFromFormattedAddress(
    formattedAddress: string,
    departments: ColombiaDepartment[],
  ): { department: ColombiaDepartment | null; cityCandidate: string } {
    const segments = this.parseFormattedAddressSegments(formattedAddress);
    let department: ColombiaDepartment | null = null;
    let deptIndex = -1;
    let bestScore = 0;

    segments.forEach((segment, index) => {
      const match = this.findBestCatalogMatch(departments, [segment]);
      if (!match) return;
      const score = this.normalizeGeoName(match.name).length;
      if (score > bestScore) {
        bestScore = score;
        department = match;
        deptIndex = index;
      }
    });

    const cityCandidate = deptIndex > 0 ? segments[deptIndex - 1] : '';
    return { department, cityCandidate };
  }

  private matchDepartment(
    departments: ColombiaDepartment[],
    candidates: string[],
  ): ColombiaDepartment | null {
    const normalized = candidates.map((s) => this.normalizeGeoName(s)).filter(Boolean);
    if (normalized.some((c) => c.includes('BOGOTA'))) {
      return departments.find((d) => this.normalizeGeoName(d.name).includes('BOGOTA')) ?? null;
    }
    return this.findBestCatalogMatch(departments, candidates);
  }

  private matchMunicipality(
    municipalities: ColombiaMunicipality[],
    candidates: string[],
  ): ColombiaMunicipality | null {
    const normalized = candidates.map((s) => this.normalizeGeoName(s)).filter(Boolean);
    if (normalized.some((c) => c.includes('BOGOTA'))) {
      return (
        municipalities.find((m) => this.normalizeGeoName(m.name) === 'BOGOTA') ??
        municipalities.find((m) => this.normalizeGeoName(m.name).includes('BOGOTA')) ??
        null
      );
    }
    return this.findBestCatalogMatch(municipalities, candidates);
  }

  private async applyDepartmentMunicipalityFromGeocode(
    result: google.maps.GeocoderResult | google.maps.places.PlaceResult,
  ): Promise<void> {
    const components = result.address_components ?? [];
    const formattedAddress =
      'formatted_address' in result ? String(result.formatted_address ?? '') : '';

    const locality = this.geocodeComponent(
      components,
      'locality',
      'postal_town',
      'administrative_area_level_2',
    );
    const admin1 = this.geocodeComponent(components, 'administrative_area_level_1');

    let departments = this.departments();
    if (!departments.length) {
      await this.loadDepartments();
      departments = this.departments();
    }

    const parsed = formattedAddress
      ? this.inferDeptAndCityFromFormattedAddress(formattedAddress, departments)
      : { department: null, cityCandidate: '' };

    const department =
      parsed.department ??
      this.matchDepartment(departments, [admin1, formattedAddress].filter(Boolean));
    if (!department) return;

    const municipalityCandidates = [locality, parsed.cityCandidate].filter(Boolean);

    try {
      const municipalities = await firstValueFrom(
        this.colombiaGeo.getMunicipalities(department.id),
      );
      this.incidentMunicipalities.set(municipalities);
      const municipality = this.matchMunicipality(municipalities, municipalityCandidates);
      this.incidentForm.patchValue(
        {
          departmentId: department.id,
          municipalityId: municipality?.id ?? null,
        },
        { emitEvent: false },
      );
    } catch {
      this.incidentMunicipalities.set([]);
    }
  }

  private updateFormCoords(lat: number, lng: number) {
    this.incidentForm.patchValue({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    });
  }

  /** Mapa / arrastre de marcador: rellena dirección desde coordenadas. */
  private reverseGeocode(lat: number, lng: number) {
    this.runReverseGeocode(lat, lng, false);
  }

  /** Ubicación recibida por SMS/WhatsApp: solo esta fuente llena el campo Ubicación. */
  private reverseGeocodeFromGps(lat: number, lng: number) {
    this.runReverseGeocode(lat, lng, true);
  }

  private geocodeLatLng(
    geocoder: google.maps.Geocoder,
    lat: number,
    lng: number,
  ): Promise<{
    results: google.maps.GeocoderResult[] | null;
    status: google.maps.GeocoderStatusString;
  }> {
    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        resolve({ results: results ?? null, status });
      });
    });
  }

  private patchLocationFromReverseGeocode(address: string, fromGpsRequest: boolean): void {
    if (fromGpsRequest) {
      this.incidentForm.patchValue({ location: address }, { emitEvent: false });
      return;
    }
    const current = String(this.incidentForm.get('location')?.value || '').trim();
    if (!current) {
      this.incidentForm.patchValue({ location: address }, { emitEvent: false });
    }
  }

  private handleReverseGeocodeResult(
    results: google.maps.GeocoderResult[] | null,
    status: google.maps.GeocoderStatusString,
    fromGpsRequest: boolean,
  ): void {
    if (status !== 'OK' || !results?.[0]) return;

    this.patchLocationFromReverseGeocode(results[0].formatted_address, fromGpsRequest);
    this.applyDepartmentMunicipalityFromGeocode(results[0]).catch(() => void 0);
    this.cdr.markForCheck();
  }

  private async runReverseGeocode(lat: number, lng: number, fromGpsRequest: boolean) {
    try {
      await this.ensureGeocoderReady();
      if (!this.geocoder) return;

      const { results, status } = await this.geocodeLatLng(this.geocoder, lat, lng);
      this.ngZone.run(() => {
        this.handleReverseGeocodeResult(results, status, fromGpsRequest);
      });
    } catch {
      // Sin Maps/geocoder: se mantienen coordenadas ya aplicadas.
    }
  }

  private destroyMap() {
    if (this.map) {
      google.maps.event.clearInstanceListeners(this.map);
      this.map = null;
      this.marker = null;
      this.geocoder = null;
      this.autocomplete = null;
    }
    this.mapReady.set(false);
  }
  activeIncident = computed(() => {
    const tabId = this.activeTabId();
    if (!tabId || tabId === 'new') return null;
    return this.openIncidentTabs().find((inc) => inc.id === tabId) ?? null;
  });

  incidentAuditLogs = computed(() => {
    const incident = this.activeIncident();
    if (!incident) return [];
    return this.auditLogs()
      .filter(
        (log) => log.incidentId === incident.id && !this.isCommentOnlyAuditLog(log),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  /** Los comentarios ya tienen su propia sección; no duplicarlos en cambios. */
  private isCommentOnlyAuditLog(log: AuditLog): boolean {
    if (/creaci/i.test(log.action)) return false;
    if (/cambio de estado/i.test(log.action)) return false;
    const details = log.details ?? [];
    if (!details.length) return false;
    return details.every((d) => /comentario/i.test(String(d.field ?? '')));
  }

  formatTimelineTime(timestamp: string | null | undefined): string {
    const raw = String(timestamp ?? '').trim();
    if (!raw) return '';

    const parsed = this.parseTimelineDate(raw);
    if (!parsed) return raw;

    const now = new Date();
    const timeLabel = parsed.toLocaleString('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (parsed.toDateString() === now.toDateString()) {
      return `hoy, ${timeLabel}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (parsed.toDateString() === yesterday.toDateString()) {
      return `ayer, ${timeLabel}`;
    }

    return parsed.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }

  timelineUserInitials(name: string): string {
    return noteAuthorInitials(this.historyAuthorName(name));
  }

  private historyFallbackAuthor(): string {
    return (
      this.activeIncident()?.operator?.trim() ||
      this.authService.currentUser()?.name?.trim() ||
      ''
    );
  }

  historyAuthorName(raw: string | null | undefined): string {
    const value = String(raw ?? '').trim();
    if (value.includes(' ')) return value;

    const current = this.authService.currentUser();
    if (current?.id?.toLowerCase() === value.toLowerCase() && current?.name) {
      return current.name;
    }

    const operator = this.configService
      .operators()
      .find(
        (o) =>
          o.id.toLowerCase() === value.toLowerCase() ||
          o.username?.toLowerCase() === value.toLowerCase(),
      );
    if (operator?.name) return operator.name;

    return resolveHistoryAuthor(raw, this.historyFallbackAuthor());
  }

  auditTimelineKind(log: AuditLog): 'create' | 'status' | 'comment' | 'medidas' | 'gestion' | 'update' {
    if (/creaci/i.test(log.action)) return 'create';
    if (/cambio de estado/i.test(log.action)) return 'status';
    if (/medidas de seguridad/i.test(log.action)) return 'medidas';
    if (/gesti[oó]n oseg|cerrem/i.test(log.action)) return 'gestion';
    if (log.details?.some((d) => /comentario/i.test(d.field))) return 'comment';
    return 'update';
  }

  auditTimelineSummary(log: AuditLog): string {
    const user = this.historyAuthorName(log.user);
    switch (this.auditTimelineKind(log)) {
      case 'create':
        return `${user} creó el incidente`;
      case 'status':
        return `${user} cambió el estado`;
      case 'medidas':
        return `${user} actualizó medidas de seguridad`;
      case 'gestion':
        return `${user} actualizó gestión OSEG/CERREM`;
      case 'comment':
        return `${user} agregó un comentario`;
      default:
        return `${user} actualizó el incidente`;
    }
  }

  auditTimelineFieldChanges(log: AuditLog): { field: string; old: string; new: string }[] {
    const kind = this.auditTimelineKind(log);
    if (kind === 'status' || kind === 'comment') return [];
    return (log.details ?? []).filter((d) => String(d.field || '').trim());
  }

  auditTimelineCommentBody(log: AuditLog): string | null {
    const detail = log.details?.find((d) => /comentario/i.test(d.field));
    if (!detail?.new) return null;
    return this.displayCommentBody(detail.new, this.historyAuthorName(log.user));
  }

  auditTimelineStatusChange(log: AuditLog): { old: string; new: string } | null {
    const detail = log.details?.find((d) => /estado/i.test(d.field));
    if (detail?.new) {
      return {
        old: detail.old?.trim() || '—',
        new: detail.new.trim(),
      };
    }
    const match = /->\s*(.+)$/i.exec(log.action);
    if (match && /estado/i.test(log.action)) {
      return { old: 'Nuevo', new: match[1].trim() };
    }
    return null;
  }

  commentTimelineTime(entry: IncidentNoteEntry): string {
    if (entry.timestamp) {
      return this.formatTimelineTime(entry.timestamp);
    }
    return '';
  }

  readonly displayCommentBody = displayCommentBody;

  private static readonly MERIDIEM_RE = /(a\.\s*m\.|p\.\s*m\.|am|pm)/i;

  private parseTimelineMeridiem(raw: string): 'am' | 'pm' | null {
    const match = IncidentListComponent.MERIDIEM_RE.exec(raw);
    if (!match) return null;
    return match[0].toLowerCase().includes('p') ? 'pm' : 'am';
  }

  private parseTimelineDate(raw: string): Date | null {
    const value = String(raw ?? '').trim();
    if (!value) return null;

    const direct = Date.parse(value);
    if (!Number.isNaN(direct)) return new Date(direct);

    const parsed = parseDmyDateTime(value);
    if (!parsed) return null;

    const meridiem = this.parseTimelineMeridiem(value);
    if (!meridiem) return parsed;

    let hour = parsed.getHours();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      hour,
      parsed.getMinutes(),
      parsed.getSeconds(),
    );
  }

  formatLogTime(timestamp: string): string {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return timestamp;
    return d.toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  get involvedPeople(): FormArray {
    return this.incidentForm.get('involvedPeople') as FormArray;
  }
  get involvedPlaces(): FormArray {
    return this.incidentForm.get('involvedPlaces') as FormArray;
  }
  get involvedVehicles(): FormArray {
    return this.incidentForm.get('involvedVehicles') as FormArray;
  }

  private async loadDepartments(): Promise<void> {
    try {
      const rows = await this.colombiaGeo.getDepartments();
      this.departments.set(rows);
      this.cdr.markForCheck();
    } catch {
      this.notificationService.addNotification(
        'No se cargó el mapa',
        'No pudimos obtener los departamentos. Verifique la conexión o contacte al administrador.',
      );
    }
  }

  private async refreshIncidentMunicipalities(deptId: number): Promise<void> {
    this.incidentForm.patchValue({ municipalityId: null }, { emitEvent: false });
    if (!deptId) {
      this.incidentMunicipalities.set([]);
      this.incidentMunicipalitiesLoaded.set(false);
      this.cdr.markForCheck();
      return;
    }
    this.incidentMunicipalitiesLoaded.set(false);
    try {
      const list = await firstValueFrom(this.colombiaGeo.getMunicipalities(deptId));
      this.incidentMunicipalities.set(list);
    } catch {
      this.incidentMunicipalities.set([]);
      this.notificationService.addNotification(
        'Municipios no disponibles',
        'No se pudo cargar la lista de municipios. Intente seleccionar el departamento de nuevo.',
      );
    }
    this.incidentMunicipalitiesLoaded.set(true);
    this.cdr.markForCheck();
  }

  private async loadIncidentMunicipalities(
    departmentId: number | null | undefined,
    municipalityId?: number | null,
  ): Promise<void> {
    const deptId = Number(departmentId);
    if (!deptId) {
      this.incidentMunicipalities.set([]);
      this.incidentMunicipalitiesLoaded.set(false);
      return;
    }
    this.incidentMunicipalitiesLoaded.set(false);
    try {
      const list = await firstValueFrom(this.colombiaGeo.getMunicipalities(deptId));
      this.incidentMunicipalities.set(list);
      if (municipalityId != null) {
        this.incidentForm.patchValue({ municipalityId }, { emitEvent: false });
      }
      this.incidentMunicipalitiesLoaded.set(true);
      this.cdr.markForCheck();
    } catch {
      this.incidentMunicipalities.set([]);
      this.incidentMunicipalitiesLoaded.set(true);
    }
  }

  private setupIncidentDepartmentFilter(): void {
    this.incidentDeptSub?.unsubscribe();
    const control = this.incidentForm.get('departmentId');
    if (!control) return;
    this.incidentDeptSub = control.valueChanges.subscribe((val) => {
      this.refreshIncidentMunicipalities(Number(val)).catch(() => void 0);
    });
  }

  private buildPersonGroup(p?: Partial<InvolvedPerson>): FormGroup {
    const split =
      p?.primerNombre || !p?.name
        ? {
            primerNombre: p?.primerNombre ?? '',
            segundoNombre: p?.segundoNombre ?? '',
            primerApellido: p?.primerApellido ?? '',
            segundoApellido: p?.segundoApellido ?? '',
          }
        : splitPersonName(p.name);
    return this.fb.group({
      primerNombre: [split.primerNombre ?? ''],
      segundoNombre: [split.segundoNombre ?? ''],
      primerApellido: [split.primerApellido ?? ''],
      segundoApellido: [split.segundoApellido ?? ''],
      roleId: [p?.roleId ?? null],
      documentType: [p?.documentType ?? ''],
      documentId: [p?.documentId ?? ''],
      genderId: [p?.genderId ?? null],
      contact: [p?.contact ?? p?.phone ?? ''],
      comentarios: [p?.comentarios ?? p?.details ?? ''],
    });
  }

  createPersonGroup(): FormGroup {
    return this.buildPersonGroup();
  }

  addPerson(): void {
    if (this.involvedPeople.length < 4) {
      this.involvedPeople.push(this.createPersonGroup());
      this.cdr.markForCheck();
    }
  }

  removePerson(index: number): void {
    const timer = this.personLookupTimers.get(index);
    if (timer) clearTimeout(timer);
    this.personLookupTimers.delete(index);
    this.personLastLookupKey.delete(index);
    this.involvedPeople.removeAt(index);
    this.cdr.markForCheck();
  }

  onPersonDocumentInput(index: number): void {
    this.scheduleInvolvedPersonLookup(index, 'document');
  }

  onPersonContactInput(index: number): void {
    this.scheduleInvolvedPersonLookup(index, 'contact');
  }

  lookupInvolvedPerson(index: number, field: 'document' | 'contact'): void {
    const group = this.involvedPeople.at(index);
    if (!(group instanceof FormGroup)) return;

    if (field === 'document') {
      const digits = String(group.get('documentId')?.value ?? '').replace(/\D/g, '');
      if (digits.length < 5) return;
      this.personService.lookupByDocument(digits).subscribe((person) => {
        if (!person) return;
        this.applyInvolvedPersonLookup(index, person, `doc:${digits}`);
      });
      return;
    }

    const contact = String(group.get('contact')?.value ?? '').trim();
    if (this.normalizePhone(contact).length < 7) return;
    const phoneKey = this.normalizePhone(contact);
    this.personService.lookupRegisteredByPhone(contact).subscribe((person) => {
      if (!person) return;
      this.applyInvolvedPersonLookup(index, person, `phone:${phoneKey}`);
    });
  }

  private scheduleInvolvedPersonLookup(index: number, field: 'document' | 'contact'): void {
    const group = this.involvedPeople.at(index);
    if (!(group instanceof FormGroup)) return;

    const lookupKey =
      field === 'document'
        ? `doc:${String(group.get('documentId')?.value ?? '').replace(/\D/g, '')}`
        : `phone:${this.normalizePhone(String(group.get('contact')?.value ?? ''))}`;

    const previous = this.personLastLookupKey.get(index);
    if (previous && previous !== lookupKey) {
      if (field === 'document' && previous.startsWith('doc:')) {
        this.clearInvolvedPersonRegistryFields(index, 'document');
        this.personLastLookupKey.delete(index);
      }
      if (field === 'contact' && previous.startsWith('phone:')) {
        this.clearInvolvedPersonRegistryFields(index, 'contact');
        this.personLastLookupKey.delete(index);
      }
    }

    const prev = this.personLookupTimers.get(index);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      this.lookupInvolvedPerson(index, field);
      this.personLookupTimers.delete(index);
    }, 450);
    this.personLookupTimers.set(index, timer);
  }

  private clearInvolvedPersonRegistryFields(
    index: number,
    changedField: 'document' | 'contact',
  ): void {
    const group = this.involvedPeople.at(index);
    if (!(group instanceof FormGroup)) return;
    const patch: Record<string, unknown> = {
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      roleId: null,
      documentType: '',
      genderId: null,
    };
    if (changedField === 'document') {
      patch['contact'] = '';
    } else {
      patch['documentId'] = '';
    }
    group.patchValue(patch, { emitEvent: false });
  }

  private applyInvolvedPersonLookup(index: number, person: Person, lookupKey: string): void {
    const group = this.involvedPeople.at(index);
    if (!(group instanceof FormGroup)) return;

    const patch: Partial<InvolvedPerson> = {
      primerNombre: person.primerNombre,
      segundoNombre: person.segundoNombre,
      primerApellido: person.primerApellido,
      segundoApellido: person.segundoApellido,
      name: person.name,
      contact: person.phone || person.contacto,
      phone: person.phone,
      documentType: this.resolveDocumentType(person),
      documentId: person.documentId,
      genderId: person.genderId ?? null,
      roleId: person.roleId ?? null,
    };
    if (!patch.primerNombre && person.name) {
      Object.assign(patch, splitPersonName(person.name));
    }

    group.patchValue(
      {
        primerNombre: patch.primerNombre ?? '',
        segundoNombre: patch.segundoNombre ?? '',
        primerApellido: patch.primerApellido ?? '',
        segundoApellido: patch.segundoApellido ?? '',
        roleId: patch.roleId ?? null,
        documentType: patch.documentType ?? '',
        documentId: patch.documentId ?? '',
        genderId: patch.genderId ?? null,
        contact: patch.contact ?? '',
      },
      { emitEvent: false },
    );

    this.personLastLookupKey.set(index, lookupKey);
    const notifyKey = `solicitante:${lookupKey}:${person.id}`;
    if (!this.personLookupNotified.has(notifyKey)) {
      this.personLookupNotified.add(notifyKey);
      this.notificationService.addNotification(
        'Persona encontrada',
        `${person.name} cargada desde el registro.`,
      );
    }
    this.cdr.markForCheck();
  }

  private isPersonRowPartiallyFilled(group: FormGroup): boolean {
    const v = group.getRawValue();
    return !!(
      String(v.primerNombre || '').trim() ||
      String(v.primerApellido || '').trim() ||
      String(v.segundoNombre || '').trim() ||
      String(v.segundoApellido || '').trim() ||
      String(v.documentId || '').trim() ||
      String(v.contact || '').trim() ||
      String(v.comentarios || '').trim()
    );
  }

  private isPersonRowSaveable(group: FormGroup): boolean {
    const v = group.getRawValue();
    return !!(
      String(v.primerNombre || '').trim() &&
      String(v.primerApellido || '').trim() &&
      v.roleId != null
    );
  }

  private personGroupToInvolvedPerson(group: FormGroup): InvolvedPerson | null {
    if (!this.isPersonRowSaveable(group)) return null;
    const v = group.getRawValue();
    const roleName = this.personRoles().find((r) => r.id === v.roleId)?.name ?? '';
    return {
      primerNombre: String(v.primerNombre).trim(),
      segundoNombre: String(v.segundoNombre || '').trim() || undefined,
      primerApellido: String(v.primerApellido).trim(),
      segundoApellido: String(v.segundoApellido || '').trim() || undefined,
      name: joinPersonName(v),
      role: roleName,
      roleId: v.roleId,
      documentType: v.documentType || undefined,
      documentId: String(v.documentId || '').trim() || undefined,
      genderId: v.genderId,
      contact: String(v.contact || '').trim() || undefined,
      phone: String(v.contact || '').trim() || undefined,
      comentarios: String(v.comentarios || '').trim() || undefined,
      details: String(v.comentarios || '').trim() || undefined,
    };
  }

  private involvedPeopleForSave(): InvolvedPerson[] {
    const rows: InvolvedPerson[] = [];
    for (const g of this.involvedPeople.controls) {
      const person = this.personGroupToInvolvedPerson(g as FormGroup);
      if (person) rows.push(person);
    }
    return rows;
  }

  private vehicleGroupToInvolvedVehicle(group: FormGroup): InvolvedVehicle | null {
    if (!this.isVehicleRowFilled(group)) return null;
    const v = group.getRawValue();
    const role = String(v.role || '').trim() as VehicleRole;
    return {
      plate:
        String(v.plate || '')
          .trim()
          .toUpperCase() || '',
      role,
      make: String(v.make || '').trim() || undefined,
      model: String(v.model || '').trim() || undefined,
      color: String(v.color || '').trim() || undefined,
      details: String(v.details || '').trim() || undefined,
    };
  }

  private involvedVehiclesForSave(): InvolvedVehicle[] {
    const rows: InvolvedVehicle[] = [];
    for (const g of this.involvedVehicles.controls) {
      const vehicle = this.vehicleGroupToInvolvedVehicle(g as FormGroup);
      if (vehicle) rows.push(vehicle);
    }
    return rows;
  }

  private loadPersonCatalogs(): void {
    const agency = this.authService.currentUser()?.agency ?? 'CSJ';
    this.personService.getPersonRoles(agency).subscribe({
      next: (rows) => {
        this.personRoles.set(rows);
        this.cdr.markForCheck();
      },
      error: () => this.personRoles.set([]),
    });
    this.personService.getGenders(agency).subscribe({
      next: (rows) => {
        this.genders.set(rows);
        this.cdr.markForCheck();
      },
      error: () => this.genders.set([]),
    });
    this.personService.getDocumentTypes().subscribe({
      next: (rows) => {
        this.documentTypes.set(rows);
        this.cdr.markForCheck();
      },
      error: () => this.documentTypes.set([]),
    });
  }

  private sessionAgency(): string {
    const code = String(this.authService.currentUser()?.agency ?? '').trim();
    return code || 'CSJ';
  }

  private loadOrigins(agency: string): void {
    this.originsLoaded.set(false);
    this.http.get<CatalogOption[]>('/api/origins', { params: { agency } }).subscribe({
      next: (rows) => {
        this.origins.set(Array.isArray(rows) ? rows : []);
        this.originsLoaded.set(true);
        this.cdr.markForCheck();
      },
      error: () => {
        this.origins.set([]);
        this.originsLoaded.set(true);
        this.cdr.markForCheck();
      },
    });
  }

  private loadIncidentCatalogs(): void {
    const agency = this.sessionAgency();
    this.loadOrigins(agency);
    this.loadAllIncidentStatuses(agency);
  }

  isStatusAllowed(catalogName: string): boolean {
    const name = String(catalogName ?? '').trim();
    const currentFormValue = String(this.incidentForm.get('status')?.value ?? '').trim();
    const effectiveCurrent =
      currentFormValue ||
      this.statusNameForForm(String(this.activeIncident()?.status ?? '').trim());
    if (name === effectiveCurrent) return true;

    const agency = this.authService.currentUser()?.agency ?? 'CSJ';
    if (
      isCsjMedidasWorkflow(agency) &&
      isCsjLegacyEnviadoCerremStatus(name) &&
      name !== effectiveCurrent &&
      catalogStatusToUiStatus(name) !== catalogStatusToUiStatus(effectiveCurrent)
    ) {
      return false;
    }

    // Incidente ya creado: solo estados hacia adelante en el flujo (nunca retroceder).
    if (this.activeTabId() !== 'new') {
      const savedStatusUi = catalogStatusToUiStatus(
        String(this.activeIncident()?.status ?? '').trim(),
      );
      if (!isForwardStatusTransition(savedStatusUi, name, agency)) {
        return false;
      }
      if (
        isCsjMedidasWorkflow(agency) &&
        !isCsjStatusChoiceAllowed(savedStatusUi, name, this.workflowGestion())
      ) {
        return false;
      }
      return this.incidentStatuses().some((st) => st.name === name);
    }

    const nameUi = catalogStatusToUiStatus(name);
    if (nameUi === 'Nuevo') return true;

    return this.allowedStatuses().some(
      (allowed) =>
        allowed === name ||
        allowed === nameUi ||
        catalogStatusToUiStatus(allowed) === nameUi,
    );
  }

  statusLabel(catalogName: string): string {
    if (isCsjLegacyEnviadoCerremStatus(catalogName)) {
      return 'En evaluación CERREM';
    }
    return catalogStatusToUiStatus(catalogName);
  }

  statusFromForDropdown(): string {
    return catalogStatusToUiStatus(
      String(this.activeIncident()?.status ?? this.incidentForm.get('status')?.value ?? '').trim(),
    );
  }

  isStatusDisabled(catalogName: string): boolean {
    const name = String(catalogName ?? '').trim();
    if (!name) return true;

    const currentFormValue = String(this.incidentForm.get('status')?.value ?? '').trim();
    const effectiveCurrent =
      currentFormValue ||
      this.statusNameForForm(String(this.activeIncident()?.status ?? '').trim());
    if (name === effectiveCurrent) return false;

    if (this.isStatusAllowed(name)) return false;
    return true;
  }

  statusOptionLabel(catalogName: string): string {
    const agency = this.authService.currentUser()?.agency ?? 'CSJ';
    if (!isCsjMedidasWorkflow(agency) || this.activeTabId() === 'new') {
      return this.statusLabel(catalogName);
    }
    return statusOptionLabel(
      catalogName,
      this.statusFromForDropdown(),
      this.workflowGestion(),
      agency,
    );
  }

  statusDisabledReason(catalogName: string): string {
    const agency = this.authService.currentUser()?.agency ?? 'CSJ';
    if (!isCsjMedidasWorkflow(agency) || this.activeTabId() === 'new') return '';
    return (
      getCsjStatusDisabledReason(
        this.statusFromForDropdown(),
        catalogName,
        this.workflowGestion(),
      ) ?? ''
    );
  }

  private loadAllIncidentStatuses(agency: string, afterLoad?: () => void): void {
    this.incidentStatusesLoaded.set(false);
    this.http.get<CatalogOption[]>('/api/incident-statuses', { params: { agency } }).subscribe({
      next: (rows) => {
        this.incidentStatuses.set(Array.isArray(rows) ? rows : []);
        this.incidentStatusesLoaded.set(true);
        afterLoad?.();
        this.cdr.markForCheck();
      },
      error: () => {
        this.incidentStatuses.set([]);
        this.incidentStatusesLoaded.set(true);
        this.cdr.markForCheck();
      },
    });
  }

  private setupStatusDropdownForNew(agency: string): void {
    this.currentIncidentUiStatus.set('Nuevo');
    this.loadAllIncidentStatuses(agency, () => {
      this.allowedStatuses.set(['Nuevo']);
      if (this.activeTabId() === 'new') {
        this.incidentForm
          .get('status')
          ?.setValue(this.nuevoStatusCatalogName(), { emitEvent: false });
      }
      this.cdr.markForCheck();
    });
  }

  private setupStatusDropdownForEdit(agency: string, currentUiStatus: string): void {
    this.currentIncidentUiStatus.set(currentUiStatus);
    this.loadAllIncidentStatuses(agency, () => this.syncStatusControlFromActiveIncident());
  }

  /** Reaplica el estado guardado cuando el catálogo de estados termina de cargar. */
  private syncStatusControlFromActiveIncident(): void {
    if (this.activeTabId() === 'new') return;
    const incident = this.activeIncident();
    if (!incident) return;
    const resolved = this.statusNameForForm(String(incident.status ?? ''));
    const ctrl = this.incidentForm.get('status');
    if (!resolved || !ctrl || ctrl.value === resolved) return;
    ctrl.setValue(resolved, { emitEvent: false });
    this.cdr.markForCheck();
  }

  private pickOriginForLocationChannel(channel?: string): string {
    const list = this.origins();
    const ch = String(channel || 'whatsapp').toLowerCase();
    const keywords = ch === 'sms' ? ['sms'] : ['whatsapp', 'whats'];
    const hit = list.find((o) =>
      keywords.some((k) =>
        String(o.name || '')
          .toLowerCase()
          .includes(k),
      ),
    );
    return hit?.name || '';
  }

  private nuevoStatusCatalogName(): string {
    const list = this.incidentStatuses();
    if (list.some((s) => s.name === 'Nuevo')) return 'Nuevo';
    return list[0]?.name ?? '';
  }

  private defaultStatusName(): string {
    return this.nuevoStatusCatalogName();
  }

  private statusNameForForm(uiStatus: string): string {
    const name = String(uiStatus ?? '').trim();
    if (!name) return '';
    const list = this.incidentStatuses();
    if (!list.length) return name;
    if (list.some((s) => s.name === name)) return name;
    const ui = catalogStatusToUiStatus(name);
    const byUi = list.find((s) => catalogStatusToUiStatus(s.name) === ui);
    if (byUi) return byUi.name;
    return name;
  }

  private ensureDefaultStatus(): void {
    const ctrl = this.incidentForm.get('status');
    if (!ctrl || String(ctrl.value || '').trim()) return;
    const def = this.defaultStatusName();
    if (def) ctrl.setValue(def, { emitEvent: false });
  }

  formatPlaceRoleLabel(name: string): string {
    return String(name || '').replaceAll('_', ' ');
  }

  private buildPlaceGroup(p?: Partial<InvolvedPlace>): FormGroup {
    return this.fb.group({
      name: [p?.name ?? '', Validators.required],
      address: [p?.address ?? '', Validators.required],
      departmentId: [p?.departmentId ?? null],
      municipalityId: [p?.municipalityId ?? null],
      contact: [p?.contact ?? ''],
      roleId: [p?.roleId ?? null, Validators.required],
      comments: [p?.comments ?? ''],
    });
  }

  createPlaceGroup(): FormGroup {
    return this.buildPlaceGroup();
  }

  addPlace(): void {
    if (this.involvedPlaces.length < 4) {
      this.involvedPlaces.push(this.createPlaceGroup());
      this.attachPlaceDepartmentWatcher(this.involvedPlaces.length - 1);
      this.cdr.markForCheck();
    }
  }

  removePlace(index: number): void {
    const oldMap = this.placeMunicipalities();
    this.involvedPlaces.removeAt(index);
    const next = new Map<number, ColombiaMunicipality[]>();
    for (let newIdx = 0; newIdx < this.involvedPlaces.length; newIdx++) {
      const oldIdx = newIdx < index ? newIdx : newIdx + 1;
      const list = oldMap.get(oldIdx);
      if (list) next.set(newIdx, list);
    }
    this.placeMunicipalities.set(next);
    this.reattachPlaceDepartmentWatchers();
    this.cdr.markForCheck();
  }

  placeMunicipalitiesFor(index: number): ColombiaMunicipality[] {
    return this.placeMunicipalities().get(index) ?? [];
  }

  placeMunicipalitiesReady(index: number): boolean {
    return this.placeMunicipalitiesLoaded().get(index) ?? false;
  }

  private setPlaceMunicipalitiesLoaded(index: number, loaded: boolean): void {
    this.placeMunicipalitiesLoaded.update((map) => {
      const next = new Map(map);
      next.set(index, loaded);
      return next;
    });
  }

  private detachPlaceDepartmentWatchers(): void {
    for (const sub of this.placeDeptSubs) sub.unsubscribe();
    this.placeDeptSubs = [];
  }

  private reattachPlaceDepartmentWatchers(): void {
    this.detachPlaceDepartmentWatchers();
    for (let i = 0; i < this.involvedPlaces.length; i++) {
      this.attachPlaceDepartmentWatcher(i);
    }
  }

  private attachPlaceDepartmentWatcher(index: number): void {
    const group = this.involvedPlaces.at(index);
    if (!(group instanceof FormGroup)) return;
    const control = group.get('departmentId');
    if (!control) return;
    const sub = control.valueChanges.subscribe((val) => {
      this.refreshPlaceMunicipalities(index, Number(val)).catch(() => void 0);
    });
    this.placeDeptSubs.push(sub);
  }

  /** Al cambiar departamento: limpia municipio y carga solo los de ese departamento. */
  private async refreshPlaceMunicipalities(index: number, deptId: number): Promise<void> {
    const group = this.involvedPlaces.at(index);
    if (!(group instanceof FormGroup)) return;
    group.patchValue({ municipalityId: null }, { emitEvent: false });
    if (!deptId) {
      this.setPlaceMunicipalities(index, []);
      this.setPlaceMunicipalitiesLoaded(index, false);
      return;
    }
    this.setPlaceMunicipalitiesLoaded(index, false);
    try {
      const rows = await firstValueFrom(this.colombiaGeo.getMunicipalities(deptId));
      this.setPlaceMunicipalities(index, rows);
    } catch {
      this.setPlaceMunicipalities(index, []);
      this.notificationService.addNotification(
        'Municipios no disponibles',
        'No se pudo cargar la lista de municipios. Intente seleccionar el departamento de nuevo.',
      );
    }
    this.setPlaceMunicipalitiesLoaded(index, true);
  }

  private setPlaceMunicipalities(index: number, rows: ColombiaMunicipality[]): void {
    this.placeMunicipalities.update((map) => {
      const next = new Map(map);
      next.set(index, rows);
      return next;
    });
    this.cdr.markForCheck();
  }

  private async loadPlaceMunicipalitiesForRow(
    index: number,
    departmentId?: number | null,
    municipalityId?: number | null,
  ): Promise<void> {
    const deptId = Number(departmentId);
    if (!deptId) return;
    this.setPlaceMunicipalitiesLoaded(index, false);
    try {
      const rows = await firstValueFrom(this.colombiaGeo.getMunicipalities(deptId));
      this.setPlaceMunicipalities(index, rows);
      if (municipalityId != null) {
        const group = this.involvedPlaces.at(index);
        if (group instanceof FormGroup) {
          group.patchValue({ municipalityId }, { emitEvent: false });
        }
      }
      this.setPlaceMunicipalitiesLoaded(index, true);
    } catch {
      this.setPlaceMunicipalities(index, []);
      this.setPlaceMunicipalitiesLoaded(index, true);
    }
  }

  private loadPlaceRoles(): void {
    const agency = this.authService.currentUser()?.agency ?? 'CSJ';
    this.http.get<CatalogOption[]>('/api/place-roles', { params: { agency } }).subscribe({
      next: (rows) => this.placeRoles.set(rows),
      error: () => this.placeRoles.set([]),
    });
  }

  createVehicleGroup(): FormGroup {
    return this.fb.group({
      plate: ['', this.validateOptionalPlate],
      role: ['' as VehicleRole | '', Validators.required],
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
    const timer = this.vehicleLookupTimers.get(index);
    if (timer) clearTimeout(timer);
    this.vehicleLookupTimers.delete(index);
    this.vehicleLastLookupPlate.delete(index);
    this.involvedVehicles.removeAt(index);
  }

  onVehiclePlateInput(index: number): void {
    const group = this.involvedVehicles.at(index);
    if (!(group instanceof FormGroup)) return;
    const currentPlate = String(group.get('plate')?.value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const previousPlate = this.vehicleLastLookupPlate.get(index) || '';
    if (!currentPlate) {
      this.clearVehicleRow(index);
      this.vehicleLastLookupPlate.delete(index);
    } else if (previousPlate && previousPlate !== currentPlate) {
      // Si cambia de placa, solo limpiamos catálogo (marca/modelo/color); rol y detalles son de este incidente.
      this.clearVehicleCatalogFields(index);
    }

    const prev = this.vehicleLookupTimers.get(index);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      this.normalizeAndLookupVehicle(index);
      this.vehicleLookupTimers.delete(index);
    }, 450);
    this.vehicleLookupTimers.set(index, timer);
  }

  normalizeVehiclePlate(index: number): void {
    const control = this.involvedVehicles.at(index)?.get('plate');
    if (!control) return;
    const cleaned = String(control.value || '')
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9-]/g, '');
    control.setValue(cleaned, { emitEvent: false });
    control.markAsTouched();
  }

  normalizeAndLookupVehicle(index: number): void {
    this.normalizeVehiclePlate(index);
    const group = this.involvedVehicles.at(index);
    if (!(group instanceof FormGroup)) return;
    const plate = String(group.get('plate')?.value || '').trim();
    if (!plate) {
      this.clearVehicleRow(index);
      this.vehicleLastLookupPlate.delete(index);
      return;
    }
    if (group.get('plate')?.invalid) return;

    const normalizedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalizedPlate.length < 5) return;
    if (this.vehicleLastLookupPlate.get(index) === normalizedPlate) return;

    this.incidentService.lookupVehicleByPlate(plate).subscribe({
      next: (vehicle) => {
        // Solo datos del vehículo en `vehiculos`; rol y comentarios son de este incidente.
        const patch: Partial<InvolvedVehicle> = {
          make: vehicle.make || '',
          model: vehicle.model || '',
          color: vehicle.color || '',
        };
        group.patchValue(patch, { emitEvent: false });
        this.vehicleLastLookupPlate.set(index, normalizedPlate);
        const notifyKey = `vehicle:${normalizedPlate}`;
        if (!this.vehicleLookupNotified.has(notifyKey)) {
          this.vehicleLookupNotified.add(notifyKey);
          this.notificationService.addNotification(
            'Vehículo encontrado',
            `Marca, modelo y color cargados para la placa ${plate}.`,
          );
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err?.status === 404) {
          this.clearVehicleCatalogFields(index);
          this.vehicleLastLookupPlate.delete(index);
          return;
        }
        this.notificationService.addNotification(
          'Error de consulta',
          'No se pudo consultar la información del vehículo por placa.',
        );
      },
    });
  }

  private clearVehicleCatalogFields(index: number): void {
    const group = this.involvedVehicles.at(index);
    if (!(group instanceof FormGroup)) return;
    group.patchValue({ make: '', model: '', color: '' }, { emitEvent: false });
    this.cdr.markForCheck();
  }

  private clearVehicleRow(index: number): void {
    const group = this.involvedVehicles.at(index);
    if (!(group instanceof FormGroup)) return;
    group.patchValue(
      {
        role: '',
        make: '',
        model: '',
        color: '',
        details: '',
      },
      { emitEvent: false },
    );
    this.cdr.markForCheck();
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
    const incidents = this.incidents().filter((incident) => {
      const textMatch =
        !text ||
        incident.id.toLowerCase().includes(text) ||
        incident.type.toLowerCase().includes(text) ||
        incident.location.toLowerCase().includes(text) ||
        (incident.operator || '').toLowerCase().includes(text);
      const defaultListMatch = statusFilter || isVisibleInActiveViews(incident.status);
      const statusMatch =
        !statusFilter || incidentMatchesCatalogStatus(incident.status, statusFilter);
      return textMatch && defaultListMatch && statusMatch;
    });
    return this.sortIncidents(incidents);
  });

  listTotalPages = computed(() => {
    const total = this.filteredIncidents().length;
    return Math.max(1, Math.ceil(total / this.listPageSize));
  });

  paginatedListIncidents = computed(() => {
    const all = this.filteredIncidents();
    const page = Math.min(this.listCurrentPage(), this.listTotalPages());
    const start = (page - 1) * this.listPageSize;
    return all.slice(start, start + this.listPageSize);
  });

  private sortIncidents(incidents: Incident[]): Incident[] {
    return incidents
      .slice()
      .sort((a, b) => incidentIdSortKey(b.id) - incidentIdSortKey(a.id));
  }

  ngOnInit() {
    this.incidentLeaveGuard.register(
      () => this.shouldConfirmLeave(),
      (action) => this.requestLeaveOr(action),
    );

    if (this.incidentService.incidents().length === 0) this.incidentService.getIncidents();

    this.configService.getIncidentTypes().catch(() => void 0);
    this.configService.getResponseProtocols().catch(() => void 0);
    this.configService.getAuditLogs().catch(() => void 0);
    this.configService.getOperators().catch(() => void 0);
    this.loadDepartments().catch(() => void 0);
    this.loadPlaceRoles();
    this.loadPersonCatalogs();
    this.loadIncidentCatalogs();
    this.setupIncidentDepartmentFilter();

    this.typeSub = this.incidentForm.get('event_id')?.valueChanges.subscribe((typeName) => {
      this.selectedIncidentTypeName.set(typeName || null);
      const selectedType = this.incidentTypes().find((t) => t.name === typeName);
      if (!selectedType) return;

      const currentPriority = String(this.incidentForm.get('priority_id')?.value ?? '').trim();
      const typeChanged = typeName !== this.lastIncidentTypeName;
      const priorityEmpty = !currentPriority;
      const priorityMatchesPreviousDefault =
        !!this.lastTypeDefaultPriority && currentPriority === this.lastTypeDefaultPriority;
      const applyDefaultPriority =
        typeChanged &&
        !this.priorityManuallyOverridden &&
        (priorityEmpty || priorityMatchesPreviousDefault);

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

    this.incidentForm.get('priority_id')?.valueChanges.subscribe((priority) => {
      const value = String(priority ?? '').trim();
      if (!value) return;
      this.priorityManuallyOverridden = true;
      this.incidentForm.patchValue({ priority: value as IncidentPriority }, { emitEvent: false });
    });

    this.setupPhoneLookup();
    this.setupStatusChangeHandler();
    this.formDirtySub = this.incidentForm.valueChanges.subscribe(() => this.cdr.markForCheck());
  }

  private lastValidStatus = '';

  private syncLastValidStatus(): void {
    this.lastValidStatus = String(this.incidentForm.get('status')?.value ?? '').trim();
  }

  private setupStatusChangeHandler(): void {
    this.statusSub?.unsubscribe();
    const ctrl = this.incidentForm.get('status');
    if (!ctrl) return;

    this.lastValidStatus = String(ctrl.value ?? '').trim();

    this.statusSub = ctrl.valueChanges.subscribe((statusValue) => {
      const name = String(statusValue ?? '').trim();

      if (this.isStatusAllowed(name)) {
        this.lastValidStatus = name;
        if (!this.skipStatusNav && this.activeTabId() !== 'new') {
          this.navigateForWorkflowStatus(name);
        }
        return;
      }

      ctrl.setValue(this.lastValidStatus, { emitEvent: false });
      const reason = this.statusDisabledReason(name);
      this.notificationService.addNotification(
        'Estado no permitido',
        reason ||
          'Ese cambio de estado no está permitido en el flujo actual del incidente.',
      );
      this.cdr.markForCheck();
    });
  }

  /** Abre Medidas o enfoca comentarios según el estado elegido en el selector. */
  private navigateForWorkflowStatus(catalogStatusName: string): void {
    const uiStatus = catalogStatusToUiStatus(catalogStatusName);
    if (uiStatus === 'Reiteraciones') {
      this.applyDetailTab('detalle');
      this.scrollToAgregarComentario();
      this.cdr.markForCheck();
      return;
    }
    if (shouldNavigateToMedidasTab(catalogStatusName)) {
      this.applyDetailTab('medidas');
      const hint = medidasTabHint(uiStatus, this.workflowGestion());
      if (hint) {
        this.notificationService.addNotification('Pestaña Medidas', hint);
      }
      this.cdr.markForCheck();
    }
  }

  currentAgency(): string {
    return this.authService.currentUser()?.agency ?? 'CSJ';
  }

  showMedidasTab(): boolean {
    return isCsjMedidasWorkflow(this.currentAgency()) && this.activeTabId() !== 'new';
  }

  private scrollToAgregarComentario(): void {
    setTimeout(() => {
      const el = this.agregarComentarioField?.nativeElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
    }, 80);
  }

  /** Comentario obligatorio al pasar a «Reiteraciones» desde otro estado. */
  requiresReiteracionCommentOnSave(): boolean {
    if (!isCsjMedidasWorkflow(this.currentAgency()) || this.activeTabId() === 'new') {
      return false;
    }
    const selected = catalogStatusToUiStatus(
      String(this.incidentForm.get('status')?.value ?? '').trim(),
    );
    const saved = catalogStatusToUiStatus(String(this.activeIncident()?.status ?? '').trim());
    return selected === 'Reiteraciones' && saved !== 'Reiteraciones';
  }

  commentFieldPlaceholder(): string {
    if (this.activeTabId() === 'new') {
      return 'Descripción del incidente, hechos reportados, notas...';
    }
    if (this.requiresReiteracionCommentOnSave()) {
      return 'Describa la reiteración ante UNP/Policía; al guardar pasará al historial de comentarios...';
    }
    const saved = catalogStatusToUiStatus(String(this.activeIncident()?.status ?? '').trim());
    if (saved === 'Reiteraciones') {
      return 'Nueva reiteración o comentario; al guardar pasa al historial y este campo se limpia...';
    }
    return 'Nuevo comentario; al guardar pasa al historial y este campo se limpia...';
  }

  // ── Seguimiento «Reiteraciones» (lista / badges) ──
  private statusChangeLogsFor(incidentId: string): AuditLog[] {
    return this.auditLogs()
      .filter(
        (log) =>
          log.incidentId === incidentId && /cambio de estado/i.test(String(log.action ?? '')),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private readonly statusArrowRe = /→\s*(.+)$/;

  private logChangedStatusTo(log: AuditLog, uiStatus: string): boolean {
    const detail = (log.details ?? []).find((d) => /estado/i.test(String(d.field ?? '')));
    if (detail) return catalogStatusToUiStatus(String(detail.new ?? '').trim()) === uiStatus;
    const m = this.statusArrowRe.exec(String(log.action ?? ''));
    return m ? catalogStatusToUiStatus(m[1].trim()) === uiStatus : false;
  }

  /** Cuántas reiteraciones lleva el caso (comentarios de reiteración; respaldo auditoría). */
  reiteracionesCount(incident: Incident | null | undefined): number {
    if (!incident) return 0;
    const fromComments = countReiteracionNotes(incident.comments);
    const fromAudit = this.statusChangeLogsFor(incident.id).filter((log) =>
      this.logChangedStatusTo(log, 'Reiteraciones'),
    ).length;
    return Math.max(fromComments, fromAudit);
  }

  workflowStatusForMedidas(): string {
    const formStatus = catalogStatusToUiStatus(
      String(this.incidentForm.get('status')?.value ?? '').trim(),
    );
    const savedStatus = catalogStatusToUiStatus(
      String(this.activeIncident()?.status ?? '').trim(),
    );
    const formRank = CSJ_STATUS_WORKFLOW_RANK[formStatus];
    const savedRank = CSJ_STATUS_WORKFLOW_RANK[savedStatus];
    if (formRank !== undefined && savedRank !== undefined) {
      return formRank >= savedRank ? formStatus : savedStatus;
    }
    return formStatus || savedStatus || 'Nuevo';
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private sanitizePhoneControl(ctrl: AbstractControl | null): boolean {
    if (!ctrl) return false;
    const sanitized = String(ctrl.value ?? '').replace(/[^0-9+ ]/g, '');
    if (sanitized === ctrl.value) return false;
    ctrl.setValue(sanitized, { emitEvent: false });
    ctrl.markAsDirty();
    ctrl.updateValueAndValidity({ emitEvent: false });
    return true;
  }

  private setupPhoneLookup(): void {
    this.phoneSub?.unsubscribe();
    const phoneControl = this.incidentForm.get('phone');
    if (!phoneControl) return;

    this.phoneSub = phoneControl.valueChanges
      .pipe(
        tap(() => {
          if (this.sanitizePhoneControl(phoneControl)) {
            this.cdr.markForCheck();
          }
        }),
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

    const phone = this.incidentForm.get('phone')?.value as string;
    const notifyKey = `${this.normalizePhone(phone)}:${person.id}`;
    if (!this.personLookupNotified.has(notifyKey)) {
      this.personLookupNotified.add(notifyKey);
      this.notificationService.addNotification(
        'Persona Identificada',
        `${person.name} reconocido por el sistema.`,
      );
    }

    this.fillOrAddInvolvedPerson(person);
    this.cdr.markForCheck();
  }

  private fillOrAddInvolvedPerson(person: Person): void {
    const personKey = this.normalizePhone(person.phone);
    const existingIndex = this.involvedPeople.controls.findIndex((ctrl) => {
      const doc = String(ctrl.get('documentId')?.value || '');
      const contact = this.normalizePhone(String(ctrl.get('contact')?.value || ''));
      return doc === person.documentId || (personKey && contact === personKey);
    });

    const patch: Partial<InvolvedPerson> = {
      primerNombre: person.primerNombre,
      segundoNombre: person.segundoNombre,
      primerApellido: person.primerApellido,
      segundoApellido: person.segundoApellido,
      name: person.name,
      contact: person.phone || person.contacto,
      phone: person.phone,
      documentType: this.resolveDocumentType(person),
      documentId: person.documentId,
      genderId: person.genderId ?? null,
      roleId: person.roleId ?? null,
    };
    if (!patch.primerNombre && person.name) {
      Object.assign(patch, splitPersonName(person.name));
    }

    const formPatch = {
      primerNombre: patch.primerNombre ?? '',
      segundoNombre: patch.segundoNombre ?? '',
      primerApellido: patch.primerApellido ?? '',
      segundoApellido: patch.segundoApellido ?? '',
      roleId: patch.roleId ?? null,
      documentType: patch.documentType ?? '',
      documentId: patch.documentId ?? '',
      genderId: patch.genderId ?? null,
      contact: patch.contact ?? '',
    };

    if (existingIndex >= 0) {
      this.involvedPeople.at(existingIndex).patchValue(formPatch);
      return;
    }

    const emptyIndex = this.involvedPeople.controls.findIndex(
      (ctrl) => !this.isPersonRowPartiallyFilled(ctrl as FormGroup),
    );
    if (emptyIndex >= 0) {
      this.involvedPeople.at(emptyIndex).patchValue(formPatch);
      return;
    }

    if (this.involvedPeople.length < 4) {
      this.involvedPeople.push(this.buildPersonGroup(patch));
    }
  }

  isFormSelectEmpty(controlName: string): boolean {
    const value = this.incidentForm.get(controlName)?.value;
    return value == null || value === '';
  }

  private pruneEmptyInvolvedEntries(): void {
    for (let i = this.involvedPeople.length - 1; i >= 0; i--) {
      if (!this.isPersonRowPartiallyFilled(this.involvedPeople.at(i) as FormGroup)) {
        this.involvedPeople.removeAt(i);
      }
    }
    for (let i = this.involvedVehicles.length - 1; i >= 0; i--) {
      const group = this.involvedVehicles.at(i) as FormGroup;
      if (!this.isVehicleRowFilled(group)) {
        this.involvedVehicles.removeAt(i);
      }
    }
    for (let i = this.involvedPlaces.length - 1; i >= 0; i--) {
      const group = this.involvedPlaces.at(i) as FormGroup;
      const name = String(group.get('name')?.value || '').trim();
      const address = String(group.get('address')?.value || '').trim();
      if (!name && !address) this.involvedPlaces.removeAt(i);
    }
  }

  private collectTopLevelFormErrors(): string[] {
    const labels: Record<string, string> = {
      event_id: 'Tipo de evento',
      priority_id: 'Prioridad',
      status: 'Estado',
      origin: 'Origen',
      location: 'Dirección del hecho',
      lat: 'Ubicación en mapa (latitud)',
      lng: 'Ubicación en mapa (longitud)',
      phone: 'Teléfono (formato inválido)',
    };
    const missing: string[] = [];
    for (const [key, label] of Object.entries(labels)) {
      if (this.incidentForm.get(key)?.invalid) missing.push(label);
    }
    return missing;
  }

  private collectInvolvedPeopleErrors(): string[] {
    for (const g of this.involvedPeople.controls) {
      const group = g as FormGroup;
      if (!this.isPersonRowPartiallyFilled(group)) continue;
      if (!this.isPersonRowSaveable(group)) {
        return ['Persona involucrada (primer nombre, primer apellido y rol)'];
      }
    }
    return [];
  }

  private collectInvolvedPlacesErrors(): string[] {
    const missing: string[] = [];
    for (const g of this.involvedPlaces.controls) {
      const name = String(g.get('name')?.value || '').trim();
      const address = String(g.get('address')?.value || '').trim();
      if (!name && !address) continue;
      if (!name) missing.push('Nombre del lugar involucrado');
      if (!address) missing.push('Dirección del lugar involucrado');
      if (g.get('roleId')?.value == null) {
        missing.push('Rol/tipo del lugar involucrado');
      }
    }
    return missing;
  }

  private collectInvolvedVehiclesErrors(): string[] {
    const missing: string[] = [];
    for (const g of this.involvedVehicles.controls) {
      const group = g as FormGroup;
      if (!this.isVehicleRowFilled(group)) continue;
      const plate = String(group.get('plate')?.value || '').trim();
      if (!String(group.get('role')?.value || '').trim()) {
        missing.push('Rol del vehículo involucrado');
      }
      if (plate && group.get('plate')?.invalid) {
        missing.push(`Placa inválida (${plate}: use 5-8 caracteres, letras o números)`);
      }
    }
    return missing;
  }

  private describeFormErrors(): string {
    const missing = [
      ...this.collectTopLevelFormErrors(),
      ...this.collectInvolvedPeopleErrors(),
      ...this.collectInvolvedPlacesErrors(),
      ...this.collectInvolvedVehiclesErrors(),
    ];
    const unique = [...new Set(missing)];
    return unique.length ? `Complete: ${unique.join(', ')}.` : 'Revise los campos obligatorios.';
  }

  toggleRegistrationForm() {
    if (!this.showNewIncidentTab() && !this.canCreate()) return;
    if (this.showNewIncidentTab()) {
      this.closeNewIncidentTab();
    } else {
      this.showNewIncidentTab.set(true);
      this.setActiveTab('new');
    }
  }

  private resolveIncidentForTab(tabId: string): Incident | undefined {
    const fromTabs = this.openIncidentTabs().find((inc) => inc.id === tabId);
    const fresh = this.incidentService.incidents().find((inc) => inc.id === tabId);
    const merged = fresh ? { ...(fromTabs ?? fresh), ...fresh } : fromTabs;
    if (fresh && fromTabs) {
      this.openIncidentTabs.update((tabs) =>
        tabs.map((t) => (t.id === tabId ? { ...t, ...fresh } : t)),
      );
    }
    return merged;
  }

  openIncidentTab(incident: Incident) {
    const fresh =
      this.incidentService.incidents().find((i) => i.id === incident.id) ?? incident;
    this.auditClient.incidentView(fresh.id, 'Incidentes');
    if (this.openIncidentTabs().some((tab) => tab.id === fresh.id)) {
      this.openIncidentTabs.update((tabs) =>
        tabs.map((t) => (t.id === fresh.id ? { ...t, ...fresh } : t)),
      );
      this.setActiveTab(fresh.id);
    } else if (this.openIncidentTabs().length < this.MAX_TABS) {
      this.openIncidentTabs.update((tabs) => [...tabs, fresh]);
      this.setActiveTab(fresh.id);
      this.notificationService.addNotification(
        'Pestaña Abierta',
        `Se abrió el incidente #${incident.id}.`,
        incident.id,
      );
    } else {
      this.notificationService.addNotification(
        'Límite Alcanzado',
        'Cierre una pestaña para abrir una nueva.',
      );
    }
  }

  setActiveTab(tabId: string) {
    if (this.activeTabId() === tabId) return;
    this.requestLeaveOr(() => this.applyActiveTab(tabId));
  }

  private applyActiveTab(tabId: string) {
    if (this.activeTabId() === 'new') {
      this.newIncidentFormState.set(this.incidentForm.getRawValue() as Partial<Incident>);
    }
    this.medidasPendingChanges.set(false);
    this.activeTabId.set(tabId);
  }

  private hasPendingMedidasChanges(): boolean {
    return (
      this.medidasPendingChanges() || (this.medidasPanel?.hasPendingChanges() ?? false)
    );
  }

  onMedidasPendingChanges(pending: boolean): void {
    this.medidasPendingChanges.set(pending);
    this.cdr.markForCheck();
  }

  private hasPendingIncidentSave(): boolean {
    const tabId = this.activeTabId();
    if (!tabId || tabId === 'new') return false;
    if (String(this.incidentForm.get('agregarComentario')?.value ?? '').trim()) return true;
    if (this.hasPendingMedidasChanges()) return true;
    const incident = this.activeIncident();
    if (!incident) return false;
    return this.incidentFormDiffersFromSaved(incident);
  }

  /** Compara el formulario con el incidente guardado (más fiable que incidentForm.dirty). */
  private incidentFormDiffersFromSaved(incident: Incident): boolean {
    const form = this.incidentForm.getRawValue();
    const formStatus = catalogStatusToUiStatus(String(form.status ?? '').trim());
    const savedStatus = catalogStatusToUiStatus(String(incident.status ?? '').trim());
    if (formStatus !== savedStatus) return true;

    const selectedType = this.incidentTypes().find((t) => t.name === form.event_id);
    const formTypeKey = String(selectedType?.id ?? form.event_id ?? '').trim();
    const savedTypeKey = String(incident.incident_type_id ?? incident.event_id ?? '').trim();
    if (formTypeKey !== savedTypeKey) return true;

    const formPriority = String(form.priority_id ?? '').trim();
    const savedPriority = String(incident.priority_id ?? incident.priority ?? '').trim();
    if (formPriority !== savedPriority) return true;

    if (String(form.origin ?? '').trim() !== String(incident.origin ?? '').trim()) return true;
    if (
      this.normalizePhone(String(form.phone ?? '')) !==
      this.normalizePhone(String(incident.phone ?? ''))
    ) {
      return true;
    }
    if (String(form.location ?? '').trim() !== String(incident.location ?? '').trim()) return true;

    const formLat = Number(form.lat);
    const formLng = Number(form.lng);
    const savedLat = Number(incident.lat);
    const savedLng = Number(incident.lng);
    if (
      !Number.isFinite(formLat) ||
      !Number.isFinite(formLng) ||
      Math.abs(formLat - savedLat) > 0.000001 ||
      Math.abs(formLng - savedLng) > 0.000001
    ) {
      return true;
    }

    if ((form.departmentId ?? null) !== (incident.departmentId ?? null)) return true;
    if ((form.municipalityId ?? null) !== (incident.municipalityId ?? null)) return true;

    const formLocationPhone = this.resolveLocationPhoneForSave(form.locationPhoneNumber);
    const savedLocationPhone = String(incident.locationPhoneNumber ?? '').trim() || undefined;
    if (String(formLocationPhone ?? '') !== String(savedLocationPhone ?? '')) return true;

    if (
      !this.jsonStableEqual(
        this.involvedPeopleSnapshot(this.involvedPeopleForSave()),
        this.involvedPeopleSnapshot(incident.involvedPeople ?? []),
      )
    ) {
      return true;
    }
    if (
      !this.jsonStableEqual(
        this.involvedPlacesSnapshot(
          ((form.involvedPlaces ?? []) as InvolvedPlace[]).filter(
            (p) => String(p.name || '').trim() && String(p.address || '').trim(),
          ),
        ),
        this.involvedPlacesSnapshot(incident.involvedPlaces ?? []),
      )
    ) {
      return true;
    }
    if (
      !this.jsonStableEqual(
        this.involvedVehiclesSnapshot(this.involvedVehiclesForSave()),
        this.involvedVehiclesSnapshot(incident.involvedVehicles ?? []),
      )
    ) {
      return true;
    }

    return false;
  }

  private jsonStableEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private involvedPeopleSnapshot(people: InvolvedPerson[]): unknown[] {
    return people.map((p) => ({
      primerNombre: String(p.primerNombre ?? '').trim(),
      segundoNombre: String(p.segundoNombre ?? '').trim(),
      primerApellido: String(p.primerApellido ?? '').trim(),
      segundoApellido: String(p.segundoApellido ?? '').trim(),
      roleId: p.roleId ?? null,
      documentType: String(p.documentType ?? '').trim(),
      documentId: String(p.documentId ?? '').trim(),
      genderId: p.genderId ?? null,
      contact: String(p.contact ?? p.phone ?? '').trim(),
      comentarios: String(p.comentarios ?? p.details ?? '').trim(),
    }));
  }

  private involvedPlacesSnapshot(places: InvolvedPlace[]): unknown[] {
    return places.map((p) => ({
      name: String(p.name ?? '').trim(),
      address: String(p.address ?? '').trim(),
      departmentId: p.departmentId ?? null,
      municipalityId: p.municipalityId ?? null,
      contact: String(p.contact ?? '').trim(),
      roleId: p.roleId ?? null,
      comments: String(p.comments ?? '').trim(),
    }));
  }

  private involvedVehiclesSnapshot(vehicles: InvolvedVehicle[]): unknown[] {
    return vehicles.map((v) => ({
      plate: String(v.plate ?? '')
        .trim()
        .toUpperCase(),
      role: String(v.role ?? '').trim(),
      make: String(v.make ?? '').trim(),
      model: String(v.model ?? '').trim(),
      color: String(v.color ?? '').trim(),
      details: String(v.details ?? '').trim(),
    }));
  }

  private notifyNoIncidentChanges(): void {
    this.notificationService.addNotification(
      'Sin cambios',
      'No hay nada por actualizar en este incidente.',
    );
  }

  private medidasSavedNotificationMessage(
    incidentId: string,
    suffix: string,
    saveDelta?: string,
  ): string {
    const medidas = String(saveDelta ?? '').trim();
    if (medidas) {
      return `Se registró en ${incidentId}: ${medidas}. ${suffix}`;
    }
    return suffix;
  }

  private buildIncidentUpdateNotification(
    incidentId: string,
    base: Incident,
    final: Incident,
    draftComment: string,
    reiterationNumber?: number,
  ): { title: string; message: string } {
    const details: string[] = [];
    const baseStatus = catalogStatusToUiStatus(String(base.status ?? '').trim());
    const newStatus = catalogStatusToUiStatus(String(final.status ?? '').trim());

    if (baseStatus !== newStatus) {
      details.push(`estado cambiado de «${baseStatus}» a «${newStatus}»`);
    }

    const comment = String(draftComment ?? '').trim();
    if (comment) {
      const excerpt = comment.length > 72 ? `${comment.slice(0, 71)}…` : comment;
      if (newStatus === 'Reiteraciones' && reiterationNumber != null) {
        details.push(`reiteración N.º ${reiterationNumber}: «${excerpt}»`);
      } else {
        details.push(`comentario agregado: «${excerpt}»`);
      }
    }

    const basePriority = String(base.priority_id ?? base.priority ?? '').trim();
    const newPriority = String(final.priority_id ?? final.priority ?? '').trim();
    if (basePriority && newPriority && basePriority !== newPriority) {
      details.push(`prioridad actualizada a ${newPriority}`);
    }

    if (String(base.origin ?? '').trim() !== String(final.origin ?? '').trim()) {
      details.push(`origen: ${String(final.origin ?? '').trim()}`);
    }

    if (String(base.location ?? '').trim() !== String(final.location ?? '').trim()) {
      details.push('ubicación del incidente modificada');
    }

    const basePeople = base.involvedPeople?.length ?? 0;
    const newPeople = final.involvedPeople?.length ?? 0;
    if (basePeople !== newPeople) {
      details.push(`personas involucradas: ${newPeople}`);
    }

    const intro = `Se actualizó ${incidentId}.`;
    const message = details.length
      ? `${intro} ${details.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join('. ')}.`
      : `${intro} Cambios guardados.`;

    if (newStatus === 'Reiteraciones' && reiterationNumber != null) {
      return { title: 'Reiteración registrada', message };
    }

    return { title: 'Incidente actualizado', message };
  }

  private abortUpdateWithoutChanges(): void {
    this.notifyNoIncidentChanges();
    this.abortLeaveAfterSave();
    this.incidentForm.markAsPristine();
    this.cdr.markForCheck();
  }

  hasPendingIncidentChanges(): boolean {
    return this.hasPendingIncidentSave();
  }

  onIncidentFormSubmit(): void {
    if (this.activeTabId() === 'new') {
      this.registerIncident();
      return;
    }
    if (!this.hasPendingIncidentChanges()) {
      this.notifyNoIncidentChanges();
      return;
    }
    this.openUpdateConfirm();
  }

  openUpdateConfirm(): void {
    this.updateConfirmOpen.set(true);
    this.cdr.markForCheck();
  }

  cancelUpdateConfirm(): void {
    this.updateConfirmOpen.set(false);
    this.cdr.markForCheck();
  }

  confirmUpdateIncident(): void {
    this.updateConfirmOpen.set(false);
    if (!this.hasPendingIncidentChanges()) {
      this.abortUpdateWithoutChanges();
      return;
    }
    this.updateIncident();
    this.cdr.markForCheck();
  }

  private hasPendingNewIncidentDraft(): boolean {
    if (this.activeTabId() !== 'new' || !this.incidentForm.dirty) return false;
    const v = this.incidentForm.getRawValue();
    if (String(v.event_id || '').trim() || String(v.location || '').trim()) return true;
    if (String(v.agregarComentario || '').trim()) return true;
    if (this.involvedPeople.length > 0) return true;
    if (this.involvedPlaces.length > 0) return true;
    if (this.involvedVehicles.length > 0) return true;
    return false;
  }

  private shouldConfirmLeave(): boolean {
    const tabId = this.activeTabId();
    if (!tabId) return false;
    if (tabId === 'new') return this.hasPendingNewIncidentDraft();
    return this.hasPendingIncidentSave();
  }

  private requestLeaveOr(action: () => void): void {
    if (!this.shouldConfirmLeave()) {
      action();
      return;
    }
    this.pendingLeaveAction = action;
    this.leaveConfirmForNewTab.set(this.activeTabId() === 'new');
    this.leaveConfirmOpen.set(true);
    this.cdr.markForCheck();
  }

  cancelLeaveConfirm(): void {
    this.pendingLeaveAction = null;
    this.leaveAfterSave = false;
    this.leaveConfirmOpen.set(false);
    this.leaveConfirmForNewTab.set(false);
    this.cdr.markForCheck();
  }

  discardLeaveAndContinue(): void {
    const action = this.pendingLeaveAction;
    this.pendingLeaveAction = null;
    this.leaveAfterSave = false;
    this.leaveConfirmOpen.set(false);
    this.leaveConfirmForNewTab.set(false);
    this.incidentForm.markAsPristine();
    this.medidasPanel?.discardPendingChanges();
    this.medidasPendingChanges.set(false);
    action?.();
    this.cdr.markForCheck();
  }

  saveAndLeave(): void {
    this.leaveAfterSave = true;
    if (this.activeTabId() === 'new') {
      this.registerIncident();
      return;
    }
    void this.saveMedidasThenUpdateIncident();
  }

  private async saveMedidasThenUpdateIncident(): Promise<void> {
    const panel = this.medidasPanel;
    if (panel?.hasPendingChanges()) {
      const ok = await panel.savePendingChanges();
      if (!ok) {
        this.abortLeaveAfterSave();
        this.cdr.markForCheck();
        return;
      }
      this.medidasPendingChanges.set(false);
    }

    if (this.hasPendingIncidentSave()) {
      this.updateIncident();
      return;
    }

    this.completePendingLeaveAfterSave();
  }

  private completePendingLeaveAfterSave(): void {
    if (!this.leaveAfterSave) return;
    this.leaveAfterSave = false;
    this.leaveConfirmOpen.set(false);
    this.leaveConfirmForNewTab.set(false);
    const action = this.pendingLeaveAction;
    this.pendingLeaveAction = null;
    action?.();
    this.cdr.markForCheck();
  }

  private abortLeaveAfterSave(): void {
    this.leaveAfterSave = false;
  }

  setDetailTab(tab: 'detalle' | 'medidas') {
    if (this.detailTab() === tab) return;
    this.applyDetailTab(tab);
  }

  private applyDetailTab(tab: 'detalle' | 'medidas') {
    this.detailTab.set(tab);
    if (tab === 'detalle') {
      this.destroyMap();
      setTimeout(() => {
        const incident = this.activeIncident();
        const lat = this.incidentForm.get('lat')?.value ?? incident?.lat;
        const lng = this.incidentForm.get('lng')?.value ?? incident?.lng;
        this.initMap(
          lat == null ? undefined : Number(lat),
          lng == null ? undefined : Number(lng),
        ).catch(() => void 0);
      }, 0);
    }
    this.cdr.markForCheck();
  }

  private requiresMedidasForSave(
    statusValue: string,
    gestion?: GestionSnapshot | null,
  ): boolean {
    const ui = catalogStatusToUiStatus(String(statusValue ?? '').trim());
    if (ui === 'Medidas asignadas') return true;
    if (ui === 'Cerrado') return requiresMedidasBeforeClose(gestion);
    return false;
  }

  refreshWorkflowGestion(incidentId: string): void {
    if (!isCsjMedidasWorkflow(this.currentAgency())) {
      this.workflowGestion.set(null);
      return;
    }
    this.http
      .get<{
        gestion: {
          codigo_oficio?: string;
          tramite_destino?: string;
          resolucion_cerrem?: string;
          fecha_cerrem?: string;
          ID_riesgo?: number;
          nivel_riesgo?: string;
        } | null;
      }>(`/api/incidents/${incidentId}/medidas`)
      .subscribe({
        next: ({ gestion }) => {
          this.workflowGestion.set(gestion ?? null);
          this.cdr.markForCheck();
        },
        error: () => {
          this.workflowGestion.set(null);
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Guardar medidas usa POST /medidas y no marca el formulario del incidente.
   * Tras guardar, preseleccionamos «Medidas asignadas» para habilitar «Actualizar incidente».
   */
  onMedidasAsignadasGuardadas(incidentId: string, saveDelta?: string): void {
    this.refreshWorkflowGestion(incidentId);
    this.hasAssignedMedidas(incidentId).subscribe({
      next: ({ medidas }) => {
        if (!medidas?.length) return;

        const savedStatus = catalogStatusToUiStatus(
          String(this.activeIncident()?.status ?? '').trim(),
        );

        if (savedStatus === 'Medidas asignadas') {
          this.notificationService.addNotification(
            'Medidas guardadas',
            this.medidasSavedNotificationMessage(
              incidentId,
              'Las medidas quedaron registradas. El incidente ya está en «Medidas asignadas».',
              saveDelta,
            ),
          );
          this.cdr.markForCheck();
          return;
        }

        const targetName = this.statusNameForForm('Medidas asignadas');
        if (!targetName || !this.isStatusAllowed(targetName)) {
          this.notificationService.addNotification(
            'Medidas guardadas',
            this.medidasSavedNotificationMessage(
              incidentId,
              'Seleccione «Medidas asignadas» en Detalle y pulse «Actualizar incidente».',
              saveDelta,
            ),
          );
          this.cdr.markForCheck();
          return;
        }

        this.incidentForm.get('status')?.setValue(targetName);
        this.incidentForm.markAsDirty();
        this.syncLastValidStatus();
        this.detailTab.set('detalle');
        this.notificationService.addNotification(
          'Medidas guardadas',
          this.medidasSavedNotificationMessage(
            incidentId,
            'Se preseleccionó «Medidas asignadas». Pulse «Actualizar incidente» para registrar el estado.',
            saveDelta,
          ),
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.notificationService.addNotification(
          'Medidas guardadas',
          'Revise el estado en Detalle y pulse «Actualizar incidente» si aún no está en «Medidas asignadas».',
        );
        this.cdr.markForCheck();
      },
    });
  }

  private hasAssignedMedidas(incidentId: string) {
    return this.http.get<{
      gestion: {
        codigo_oficio?: string;
        tramite_destino?: string;
        resolucion_cerrem?: string;
        ID_riesgo?: number;
        nivel_riesgo?: string;
      } | null;
      medidas: unknown[];
    }>(`/api/incidents/${incidentId}/medidas`);
  }

  closeIncidentTab(idToClose: string, event: MouseEvent) {
    event.stopPropagation();
    const doClose = () => this.applyCloseIncidentTab(idToClose);
    if (this.activeTabId() === idToClose && this.hasPendingIncidentSave()) {
      this.requestLeaveOr(doClose);
      return;
    }
    doClose();
  }

  private applyCloseIncidentTab(idToClose: string): void {
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
    const doClose = () => this.applyCloseNewIncidentTab();
    if (this.activeTabId() === 'new' && this.hasPendingNewIncidentDraft()) {
      this.requestLeaveOr(doClose);
      return;
    }
    doClose();
  }

  private applyCloseNewIncidentTab(): void {
    this.showNewIncidentTab.set(false);
    this.newIncidentFormState.set(null);
    this.incidentForm.markAsPristine();
    if (this.activeTabId() === 'new') {
      this.activeTabId.set(this.openIncidentTabs().at(-1)?.id ?? null);
    }
  }

  private noteAuthor(): string {
    return this.authService.currentUser()?.name ?? 'Operador';
  }

  private loadCommentsHistory(storedComments?: string, legacyDetails?: string): void {
    const operator = this.historyFallbackAuthor();
    const chronological = enrichCommentAuthors(
      buildCommentHistoryView(storedComments, legacyDetails),
      operator,
    );
    this.commentsHistory.set([...chronological].reverse());
  }

  private clearAgregarComentario(): void {
    this.incidentForm.patchValue({ agregarComentario: '' }, { emitEvent: false });
  }

  /** Pasa el texto de "Agregar comentario" al historial (columna comments) y deja el campo vacío. */
  private mergeCommentHistory(storedComments: string, draft: string | null | undefined): string {
    const text = String(draft ?? '').trim();
    if (!text) return storedComments ?? '';
    return appendIncidentNote(storedComments, this.noteAuthor(), text);
  }

  registerIncident() {
    const newIncident = this.buildNewIncidentFromForm();
    if (!newIncident) {
      this.abortLeaveAfterSave();
      return;
    }

    this.incidentService.createIncident(newIncident).subscribe({
      next: (saved) => this.finalizeNewIncident(saved),
      error: (err) => {
        this.abortLeaveAfterSave();
        this.incidentService.handleCreateError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private validateBeforeSave(): boolean {
    if (this.incidentForm.invalid) {
      this.incidentForm.markAllAsTouched();
      this.notificationService.addNotification('No se puede guardar', this.describeFormErrors());
      this.cdr.markForCheck();
      return false;
    }
    for (const g of this.involvedPeople.controls) {
      const group = g as FormGroup;
      if (this.isPersonRowPartiallyFilled(group) && !this.isPersonRowSaveable(group)) {
        this.involvedPeople.markAllAsTouched();
        this.notificationService.addNotification('No se puede guardar', this.describeFormErrors());
        this.cdr.markForCheck();
        return false;
      }
    }
    return true;
  }

  private resolveFormPriority(formValue: {
    priority_id?: string | null;
    priority?: string | null;
  }): IncidentPriority {
    const value = String(formValue.priority_id ?? formValue.priority ?? '').trim();
    if (value === 'Baja' || value === 'Media' || value === 'Alta' || value === 'Crítica') {
      return value;
    }
    return 'Media';
  }

  private buildNewIncidentFromForm(): Incident | null {
    this.pruneEmptyInvolvedEntries();

    if (!this.validateBeforeSave()) {
      return null;
    }

    const formValue = this.incidentForm.getRawValue();
    const draft = String(formValue.agregarComentario ?? '').trim();
    if (!draft) {
      this.incidentForm.get('agregarComentario')?.markAsTouched();
      this.notificationService.addNotification(
        'No se puede guardar',
        'Escriba un comentario en «Agregar comentario».',
      );
      this.cdr.markForCheck();
      return null;
    }

    const comments = draft;
    const selectedType = this.incidentTypes().find((t) => t.name === formValue.event_id);
    const formPriority = this.resolveFormPriority(formValue);

    return {
      id: '',
      timestamp: new Date().toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
      status: (formValue.status || this.defaultStatusName()) as IncidentStatus,
      event_id: selectedType?.id ?? formValue.event_id ?? '',
      incident_type_id: selectedType?.id,
      priority_id: formPriority,
      origin: formValue.origin ?? '',
      phone: formValue.phone ?? '',
      location: formValue.location ?? '',
      departmentId: formValue.departmentId ?? null,
      municipalityId: formValue.municipalityId ?? null,
      lat: formValue.lat ?? 0,
      lng: formValue.lng ?? 0,
      details: '',
      comments,
      type: selectedType?.name ?? formValue.event_id ?? '',
      priority: formPriority,
      operator: this.noteAuthor(),
      ani: formValue.phone ?? 'N/A',
      locationPhoneNumber: this.resolveLocationPhoneForSave(formValue.locationPhoneNumber),
      locationRequestId: this.locationService.getLastLocationRequestId() ?? undefined,
      locationSolicitudId: this.locationService.getLastLocationSolicitudId() ?? undefined,
      involvedPeople: this.involvedPeopleForSave(),
      involvedPlaces: ((formValue.involvedPlaces ?? []) as InvolvedPlace[]).filter(
        (p) => String(p.name || '').trim() && String(p.address || '').trim(),
      ),
      involvedVehicles: this.involvedVehiclesForSave(),
    };
  }

  private finalizeNewIncident(saved: Incident): void {
    this.notificationService.addNotification(
      'Incidente Registrado',
      `Se creó el incidente #${saved.id}.`,
      saved.id,
    );
    this.incidentForm.markAsPristine();
    this.showNewIncidentTab.set(false);
    this.newIncidentFormState.set(null);

    const fresh =
      this.incidentService.incidents().find((i) => i.id === saved.id) ?? saved;
    if (this.openIncidentTabs().some((tab) => tab.id === fresh.id)) {
      this.openIncidentTabs.update((tabs) =>
        tabs.map((t) => (t.id === fresh.id ? { ...t, ...fresh } : t)),
      );
    } else if (this.openIncidentTabs().length < this.MAX_TABS) {
      this.openIncidentTabs.update((tabs) => [...tabs, fresh]);
    }

    // Tras crear: cambiar de pestaña sin confirmación (el borrador ya se guardó).
    this.applyActiveTab(fresh.id);
    this.completePendingLeaveAfterSave();
    this.cdr.markForCheck();
  }

  updateIncident() {
    this.pruneEmptyInvolvedEntries();

    if (!this.activeIncident()) {
      this.abortLeaveAfterSave();
      return;
    }

    if (!this.hasPendingIncidentChanges()) {
      this.abortUpdateWithoutChanges();
      return;
    }

    if (!this.validateBeforeSave()) {
      this.abortLeaveAfterSave();
      return;
    }

    const updatedData = this.incidentForm.getRawValue();
    const incidentId = this.activeIncident()!.id;

    const targetStatus = catalogStatusToUiStatus(String(updatedData.status ?? ''));
    const agency = this.authService.currentUser()?.agency ?? 'CSJ';
    const savedStatus = catalogStatusToUiStatus(
      String(this.activeIncident()?.status ?? '').trim(),
    );

    if (
      isCsjMedidasWorkflow(agency) &&
      targetStatus === 'Reiteraciones' &&
      savedStatus !== 'Reiteraciones' &&
      !String(updatedData.agregarComentario ?? '').trim()
    ) {
      this.detailTab.set('detalle');
      this.incidentForm.get('agregarComentario')?.markAsTouched();
      this.scrollToAgregarComentario();
      this.notificationService.addNotification(
        'Comentario obligatorio',
        'Escriba la reiteración en «Agregar comentario» antes de actualizar el incidente.',
      );
      this.abortLeaveAfterSave();
      this.cdr.markForCheck();
      return;
    }

    if (isCsjMedidasWorkflow(agency)) {
      this.hasAssignedMedidas(incidentId).subscribe({
        next: ({ gestion, medidas }) => {
          const gestionRecord = gestion as GestionSnapshot | null;
          if (needsOsegGestionForTransition(targetStatus)) {
            if (
              !gestionRecord?.codigo_oficio?.trim() ||
              !String(gestionRecord?.tramite_destino ?? '').trim()
            ) {
              this.detailTab.set('medidas');
              this.notificationService.addNotification(
                'No se puede guardar',
                'Complete la gestión OSEG en la pestaña Medidas (trámite/destino).',
              );
              this.abortLeaveAfterSave();
              this.cdr.markForCheck();
              return;
            }
          }
          if (needsCerremGestionForTransition(targetStatus)) {
            if (!gestionRecord?.resolucion_cerrem?.trim() || !gestionRecord?.ID_riesgo) {
              this.detailTab.set('medidas');
              this.notificationService.addNotification(
                'No se puede guardar',
                'Complete la decisión CERREM en la pestaña Medidas (resolución y nivel de riesgo).',
              );
              this.abortLeaveAfterSave();
              this.cdr.markForCheck();
              return;
            }
          }
          if (
            (savedStatus === 'En evaluación CERREM' || savedStatus === 'Reiteraciones') &&
            targetStatus === 'Cerrado' &&
            !isCsjStatusChoiceAllowed(savedStatus, targetStatus, gestionRecord)
          ) {
            this.detailTab.set('medidas');
            this.notificationService.addNotification(
              'No se puede guardar',
              'Riesgo Extraordinario: pase a «Medidas asignadas» y asigne medidas antes de cerrar.',
            );
            this.abortLeaveAfterSave();
            this.cdr.markForCheck();
            return;
          }
          if (
            targetStatus === 'Medidas asignadas' &&
            !isCsjStatusChoiceAllowed(savedStatus, targetStatus, gestionRecord)
          ) {
            this.detailTab.set('medidas');
            this.notificationService.addNotification(
              'No se puede guardar',
              'Riesgo Ordinario: cierre el incidente en «Cerrado» sin medidas de seguridad.',
            );
            this.abortLeaveAfterSave();
            this.cdr.markForCheck();
            return;
          }
          if (this.requiresMedidasForSave(targetStatus, gestionRecord) && !medidas?.length) {
            this.detailTab.set('medidas');
            this.notificationService.addNotification(
              'No se puede guardar',
              targetStatus === 'Cerrado'
                ? 'Riesgo Extraordinario: asigne al menos una medida de seguridad antes de cerrar.'
                : 'Debe asignar al menos una medida de seguridad antes de actualizar el incidente.',
            );
            this.abortLeaveAfterSave();
            this.cdr.markForCheck();
            return;
          }
          this.commitIncidentUpdate(updatedData);
        },
        error: () => {
          if (this.requiresMedidasForSave(targetStatus, this.workflowGestion())) {
            this.detailTab.set('medidas');
            this.notificationService.addNotification(
              'No se puede guardar',
              'Complete la información en la pestaña Medidas.',
            );
            this.abortLeaveAfterSave();
            this.cdr.markForCheck();
          } else {
            this.commitIncidentUpdate(updatedData);
          }
        },
      });
      return;
    }

    if (this.requiresMedidasForSave(String(updatedData.status ?? ''))) {
      this.hasAssignedMedidas(incidentId).subscribe({
        next: ({ medidas }) => {
          if (!medidas?.length) {
            this.detailTab.set('medidas');
            this.notificationService.addNotification(
              'No se puede guardar',
              'Debe asignar al menos una medida de seguridad antes de actualizar el incidente.',
            );
            this.abortLeaveAfterSave();
            this.cdr.markForCheck();
            return;
          }
          this.commitIncidentUpdate(updatedData);
        },
        error: () => {
          this.detailTab.set('medidas');
          this.notificationService.addNotification(
            'No se puede guardar',
            'Debe asignar al menos una medida de seguridad antes de actualizar el incidente.',
          );
          this.abortLeaveAfterSave();
          this.cdr.markForCheck();
        },
      });
      return;
    }

    this.commitIncidentUpdate(updatedData);
  }

  private commitIncidentUpdate(updatedData: ReturnType<typeof this.incidentForm.getRawValue>) {
    if (!this.hasPendingIncidentChanges()) {
      this.abortUpdateWithoutChanges();
      return;
    }

    const incidentId = this.activeIncident()!.id;
    const base = this.activeIncident()!;
    const draftComment = String(updatedData.agregarComentario ?? '').trim();
    const mergedComments = this.mergeCommentHistory(base.comments ?? '', draftComment);

    const selectedType = this.incidentTypes().find((t) => t.name === updatedData.event_id);
    const formPriority = this.resolveFormPriority(updatedData);
    const finalData: Incident = {
      ...base,
      status: catalogStatusToUiStatus(
        String(updatedData.status || this.defaultStatusName()),
      ) as IncidentStatus,
      event_id: selectedType?.id ?? updatedData.event_id ?? '',
      incident_type_id: selectedType?.id,
      priority_id: formPriority,
      origin: updatedData.origin ?? '',
      phone: updatedData.phone ?? '',
      location: updatedData.location ?? '',
      lat: updatedData.lat ?? 0,
      lng: updatedData.lng ?? 0,
      ani: updatedData.phone ?? base.ani ?? 'N/A',
      locationPhoneNumber: this.resolveLocationPhoneForSave(updatedData.locationPhoneNumber),
      details: '',
      comments: mergedComments,
      type: selectedType?.name ?? updatedData.event_id ?? '',
      priority: formPriority,
      involvedPeople: this.involvedPeopleForSave(),
      involvedPlaces: ((updatedData.involvedPlaces ?? []) as InvolvedPlace[]).filter(
        (p) => String(p.name || '').trim() && String(p.address || '').trim(),
      ),
      involvedVehicles: this.involvedVehiclesForSave(),
    };
    this.incidentService.updateIncident(finalData, (saved) => {
      const agency = this.authService.currentUser()?.agency ?? 'CSJ';
      this.openIncidentTabs.update((tabs) => tabs.map((t) => (t.id === incidentId ? saved : t)));
      this.setupStatusDropdownForEdit(agency, saved.status);
      this.populateFormWithState(saved);
      this.refreshWorkflowGestion(incidentId);
      this.configService.getAuditLogs().catch(() => void 0);
      const savedUiStatus = catalogStatusToUiStatus(String(saved.status ?? '').trim());
      const reiterationNumber =
        savedUiStatus === 'Reiteraciones' && draftComment
          ? this.reiteracionesCount(base) + 1
          : undefined;
      const notice = this.buildIncidentUpdateNotification(
        incidentId,
        base,
        finalData,
        draftComment,
        reiterationNumber,
      );
      if (savedUiStatus === 'Reiteraciones') {
        this.applyDetailTab('detalle');
      } else if (shouldNavigateToMedidasTab(savedUiStatus)) {
        this.applyDetailTab('medidas');
      }
      this.notificationService.addNotification(notice.title, notice.message, incidentId);
      this.loadCommentsHistory(mergedComments);
      this.clearAgregarComentario();
      this.incidentForm.markAsPristine();
      this.completePendingLeaveAfterSave();
      this.cdr.markForCheck();
    });
  }

  private resetFormForNewIncident() {
    this.selectedIncidentTypeName.set(null);
    this.lastIncidentTypeName = null;
    this.lastTypeDefaultPriority = null;
    this.priorityManuallyOverridden = false;
    this.incidentForm.reset({
      event_id: '',
      priority_id: '',
      status: this.defaultStatusName(),
      origin: '',
      phone: '',
      location: '',
      departmentId: null,
      municipalityId: null,
      agregarComentario: '',
    });
    this.incidentMunicipalities.set([]);
    this.incidentMunicipalitiesLoaded.set(false);
    this.commentsHistory.set([]);
    this.involvedPeople.clear();
    this.involvedPlaces.clear();
    this.involvedVehicles.clear();
    this.placeMunicipalities.set(new Map());
    this.placeMunicipalitiesLoaded.set(new Map());
    this.detachPlaceDepartmentWatchers();
    this.incidentForm.enable();
    this.syncLastValidStatus();
  }

  private populateFormWithState(state: Partial<Incident>) {
    this.selectedIncidentTypeName.set(state.type || state.event_id || null);
    this.skipStatusNav = true;
    this.incidentForm.reset(undefined, { emitEvent: false });
    const {
      comments,
      details,
      involvedPeople,
      involvedPlaces: placesState,
      involvedVehicles: vehiclesState,
      ...rest
    } = state;
    this.incidentForm.patchValue(
      {
        ...rest,
        status: this.statusNameForForm(String(rest.status || '')),
        agregarComentario: '',
      },
      { emitEvent: false },
    );
    this.syncLastValidStatus();
    this.loadCommentsHistory(comments, details);
    if (state.type) {
      this.incidentForm.get('event_id')?.setValue(state.type, { emitEvent: false });
    }
    const typeName = state.type || null;
    this.lastIncidentTypeName = typeName;
    const selectedType = this.incidentTypes().find((t) => t.name === typeName);
    this.lastTypeDefaultPriority = selectedType?.defaultPriority ?? null;
    const savedPriority = this.resolveFormPriority({
      priority_id: state.priority_id,
      priority: state.priority,
    });
    this.priorityManuallyOverridden =
      !!savedPriority &&
      !!this.lastTypeDefaultPriority &&
      savedPriority !== this.lastTypeDefaultPriority;
    this.loadIncidentMunicipalities(state.departmentId, state.municipalityId).catch(() => void 0);
    this.involvedPeople.clear();
    for (const p of involvedPeople ?? []) {
      this.involvedPeople.push(this.buildPersonGroup(p));
    }
    this.involvedPlaces.clear();
    this.placeMunicipalities.set(new Map());
    this.detachPlaceDepartmentWatchers();
    const places = placesState ?? [];
    places.forEach((pl, index) => {
      this.involvedPlaces.push(this.buildPlaceGroup(pl));
      this.loadPlaceMunicipalitiesForRow(index, pl.departmentId, pl.municipalityId).catch(() => void 0);
    });
    this.reattachPlaceDepartmentWatchers();
    this.involvedVehicles.clear();
    vehiclesState?.forEach((v) =>
      this.involvedVehicles.push(
        this.fb.group({
          plate: [v.plate ?? '', this.validateOptionalPlate],
          role: [(v.role || '') as VehicleRole | '', Validators.required],
          make: [v.make],
          model: [v.model],
          color: [v.color],
          details: [v.details],
        }),
      ),
    );
    this.incidentForm.enable();
    this.incidentForm.markAsPristine();
    this.skipStatusNav = false;
  }

  openIncidentEmailModal(incident: Incident): void {
    this.emailModalIncident.set(incident);
  }

  closeIncidentEmailModal(): void {
    this.emailModalIncident.set(null);
  }

  sendSingleIncidentByEmail(incident: Incident) {
    if (this.hasPendingIncidentChanges()) {
      this.notificationService.addNotification(
        'Guarde los cambios',
        'Actualice el incidente antes de enviar el correo.',
      );
      return;
    }
    this.openIncidentEmailModal(incident);
  }

  onFilterText(event: Event) {
    this.filterText.set((event.target as HTMLInputElement).value);
    this.listCurrentPage.set(1);
  }

  /** Select sin valor real: muestra la opción guía en gris (estilo placeholder). */
  selectShowsPlaceholder(controlName: string): boolean {
    const value = this.incidentForm.get(controlName)?.value;
    return value == null || value === '';
  }

  involvedSelectEmpty(index: number, field: string): boolean {
    const group = this.involvedPeople.at(index);
    if (!(group instanceof FormGroup)) return true;
    const value = group.get(field)?.value;
    return value == null || value === '';
  }

  involvedPlaceSelectEmpty(index: number, field: string): boolean {
    const group = this.involvedPlaces.at(index);
    if (!(group instanceof FormGroup)) return true;
    const value = group.get(field)?.value;
    return value == null || value === '';
  }

  involvedVehicleSelectEmpty(index: number, field: string): boolean {
    const group = this.involvedVehicles.at(index);
    if (!(group instanceof FormGroup)) return true;
    const value = group.get(field)?.value;
    return value == null || value === '';
  }
  onFilterStatus(event: Event) {
    this.filterStatus.set((event.target as HTMLSelectElement).value);
    this.listCurrentPage.set(1);
  }

  goToListPage(page: number): void {
    const total = this.listTotalPages();
    if (page >= 1 && page <= total) {
      this.listCurrentPage.set(page);
    }
  }

  previousListPage(): void {
    this.goToListPage(this.listCurrentPage() - 1);
  }

  nextListPage(): void {
    this.goToListPage(this.listCurrentPage() + 1);
  }

  getStatusColor(status: IncidentStatus): string {
    switch (status) {
      case 'Nuevo':
        return 'bg-blue-600/80 text-blue-100';
      case 'En gestión OSEG':
        return 'bg-indigo-600/80 text-indigo-100';
      case 'Enviado a CERREM':
        return 'bg-violet-600/80 text-violet-100';
      case 'En evaluación CERREM':
        return 'bg-purple-600/80 text-purple-100';
      case 'Reiteraciones':
        return 'bg-red-600/80 text-red-100';
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
    this.incidentLeaveGuard.unregister();
    this.vehicleLookupTimers.forEach((t) => clearTimeout(t));
    this.vehicleLookupTimers.clear();
    this.vehicleLastLookupPlate.clear();
    this.personLookupTimers.forEach((t) => clearTimeout(t));
    this.personLookupTimers.clear();
    this.personLastLookupKey.clear();
    this.destroyMap();
    this.typeSub?.unsubscribe();
    this.phoneSub?.unsubscribe();
    this.statusSub?.unsubscribe();
    this.formDirtySub?.unsubscribe();
    this.incidentDeptSub?.unsubscribe();
    this.detachPlaceDepartmentWatchers();
  }
}
