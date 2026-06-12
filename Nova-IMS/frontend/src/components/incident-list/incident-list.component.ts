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
  isForwardStatusTransition,
  needsCerremGestionForTransition,
  needsOsegGestionForTransition,
  CSJ_STATUS_WORKFLOW_RANK,
} from '../../models/incident.model';
import {
  isCsjMedidasWorkflow,
  medidasTabHint,
  shouldNavigateToMedidasTab,
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
import { PersonService } from '../../services/person.service';
import { ColombiaGeoService } from '../../services/colombia-geo.service';
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
import {
  appendIncidentNote,
  formatNoteForDisplay,
  IncidentNoteEntry,
  buildCommentHistoryView,
  noteAuthorInitials,
  enrichCommentAuthors,
} from '../../utils/incident-notes';

declare let google: any;

const priorityOrder: Record<IncidentPriority, number> = {
  Crítica: 4,
  Alta: 3,
  Media: 2,
  Baja: 1,
};

const statusOrder: Record<IncidentStatus, number> = {
  Nuevo: 11,
  'En gestión OSEG': 10,
  'Enviado a CERREM': 9,
  'En evaluación CERREM': 8,
  'Medidas asignadas': 7,
  Asignado: 6,
  'En camino': 5,
  'En proceso': 4,
  Resuelto: 3,
  Cerrado: 2,
  Cancelado: 1,
};

@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IncidentEmailModalComponent, MedidasComponent],
  templateUrl: './incident-list.component.html',
  styleUrls: ['./incident-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentListComponent implements OnInit, OnDestroy {
  private readonly platePattern = /^[A-Za-z0-9-]{5,8}$/;

  /** Placa opcional en BD; si se escribe, debe cumplir el formato. */
  private validateOptionalPlate = (control: AbstractControl): ValidationErrors | null => {
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
  private vehicleLookupTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private vehicleLastLookupPlate = new Map<number, string>();
  private placeDeptSubs: Subscription[] = [];
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private incidentLeaveGuard = inject(IncidentLeaveGuardService);
  private configService = inject(ConfigurationService);
  private locationService = inject(LocationRequestService);

  /** Teléfono opcional; si se escribe, solo dígitos/+ y formato colombiano válido. */
  private validateOptionalPhone = (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (!raw) return null;
    if (!/^[0-9+ ]+$/.test(raw)) return { phoneChars: true };
    return this.locationService.validateColombianPhone(raw).valid ? null : { phoneFormat: true };
  };

  private incidentService = inject(IncidentService);
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private colombiaGeo = inject(ColombiaGeoService);
  private http = inject(HttpClient);

  // --- Tab Management State ---
  openIncidentTabs = signal<Incident[]>([]);
  showNewIncidentTab = signal(false);
  activeTabId = signal<string | 'new' | null>(null);
  detailTab = signal<'detalle' | 'medidas'>('detalle');
  mapReady = signal(false);
  selectedIncidentTypeName = signal<string | null>(null);
  isProtocolVisible = signal(true);
  newIncidentFormState = signal<any | null>(null);
  readonly MAX_TABS = 5;

  emailModalIncident = signal<Incident | null>(null);
  leaveConfirmOpen = signal(false);
  /** true = modal abierto desde pestaña «Nuevo incidente» */
  leaveConfirmForNewTab = signal(false);
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
  private skipStatusNav = false;
  /** Evita pisar la prioridad que el operador eligió manualmente. */
  private lastIncidentTypeName: string | null = null;
  private lastTypeDefaultPriority: IncidentPriority | null = null;
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
  incidentStatuses = signal<CatalogOption[]>([]);
  allowedStatuses = signal<string[]>([]);
  currentIncidentUiStatus = signal('');
  /** Municipios por fila de lugar involucrado (índice del FormArray). */
  placeMunicipalities = signal<Map<number, ColombiaMunicipality[]>>(new Map());
  departments = signal<ColombiaDepartment[]>([]);
  /** Municipios del Ubicación del Incidente(según departamento del incidente). */
  incidentMunicipalities = signal<ColombiaMunicipality[]>([]);
  vehicleRoles: VehicleRole[] = ['Vehículo Víctima', 'Vehículo Victimario', 'Vehículo Involucrado'];
  sortColumn = signal<'priority' | 'status' | 'default'>('default');
  sortDirection = signal<'asc' | 'desc'>('desc');
  personService = inject(PersonService);

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
        this.applyReceivedLocation(locationData, lat, lng).catch(() => {});
      }, 150);

      this.locationService.clearLocation();
    });

    effect(() => {
      const tabId = this.activeTabId();
      // Solo reaccionar al cambio de pestaña; no re-ejecutar cuando carguen catálogos (incidentStatuses).
      untracked(() => {
        this.destroyMap();
        this.detailTab.set('detalle');

        const agency = this.authService.currentUser()?.agency ?? 'CSJ';

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
              this.applyDepartmentMunicipalityFromGeocode(results[0]).catch(() => {});
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
        this.incidentForm.get('origin')?.value || this.pickOriginForLocationChannel('whatsapp'),
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
      error: () => {},
    });
  }

  // ------ Google Maps ------

  private waitForGoogleMaps(): Promise<void> {
    return new Promise((resolve) => {
      if (isGoogleMapsLoaded()) {
        resolve();
        return;
      }
      const interval = setInterval(() => {
        if (isGoogleMapsLoaded()) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });
  }

  private async initMap(lat?: number, lng?: number) {
    await this.waitForGoogleMaps();
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
        this.applyLocationFromGeocode(lat, lng, place.formatted_address, place).catch(() => {});
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
    this.forwardGeocodeAddress(address).catch(() => {});
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
        ).catch(() => {});
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

  private findBestCatalogMatch<T extends { name: string }>(
    catalog: T[],
    candidates: string[],
  ): T | null {
    let best: { item: T; score: number } | null = null;

    for (const item of catalog) {
      const itemName = this.normalizeGeoName(item.name);
      for (const raw of candidates) {
        const candidate = this.normalizeGeoName(raw);
        if (!candidate) continue;

        if (itemName === candidate) return item;

        let score = 0;
        if (candidate.includes(itemName)) {
          score = itemName.length;
        } else if (itemName.includes(candidate) && candidate.length >= 4) {
          score = candidate.length;
        }
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

  private runReverseGeocode(lat: number, lng: number, fromGpsRequest: boolean) {
    this.ensureGeocoderReady()
      .then(() => {
        if (!this.geocoder) return;

        this.geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          this.ngZone.run(() => {
            if (status === 'OK' && results?.[0]) {
              const address = results[0].formatted_address;
              if (fromGpsRequest) {
                this.incidentForm.patchValue({ location: address }, { emitEvent: false });
              } else {
                const current = String(this.incidentForm.get('location')?.value || '').trim();
                if (!current) {
                  this.incidentForm.patchValue({ location: address }, { emitEvent: false });
                }
              }
              this.applyDepartmentMunicipalityFromGeocode(results[0]).catch(() => {});
              this.cdr.markForCheck();
            }
          });
        });
      })
      .catch(() => {});
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
      .filter((log) => log.incidentId === incident.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

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
      this.cdr.markForCheck();
      return;
    }
    try {
      const list = await firstValueFrom(this.colombiaGeo.getMunicipalities(deptId));
      this.incidentMunicipalities.set(list);
    } catch {
      this.incidentMunicipalities.set([]);
      this.notificationService.addNotification(
        'Municipios no disponibles',
        'No se pudo cargar la lista de municipios. Seleccione el departamento de nuevo.',
      );
    }
    this.cdr.markForCheck();
  }

  private async loadIncidentMunicipalities(
    departmentId: number | null | undefined,
    municipalityId?: number | null,
  ): Promise<void> {
    const deptId = Number(departmentId);
    if (!deptId) {
      this.incidentMunicipalities.set([]);
      return;
    }
    try {
      const list = await firstValueFrom(this.colombiaGeo.getMunicipalities(deptId));
      this.incidentMunicipalities.set(list);
      if (municipalityId != null) {
        this.incidentForm.patchValue({ municipalityId }, { emitEvent: false });
      }
      this.cdr.markForCheck();
    } catch {
      this.incidentMunicipalities.set([]);
    }
  }

  private setupIncidentDepartmentFilter(): void {
    this.incidentDeptSub?.unsubscribe();
    const control = this.incidentForm.get('departmentId');
    if (!control) return;
    this.incidentDeptSub = control.valueChanges.subscribe((val) => {
      this.refreshIncidentMunicipalities(Number(val)).catch(() => {});
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
    this.involvedPeople.removeAt(index);
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

  private loadIncidentCatalogs(): void {
    const agency = this.authService.currentUser()?.agency ?? 'CSJ';
    this.http.get<CatalogOption[]>('/api/origins', { params: { agency } }).subscribe({
      next: (rows) => {
        this.origins.set(rows);
        this.cdr.markForCheck();
      },
      error: () => this.origins.set([]),
    });
    this.loadAllIncidentStatuses(agency);
  }

  isStatusAllowed(catalogName: string): boolean {
    const name = String(catalogName ?? '').trim();
    const currentFormValue = String(this.incidentForm.get('status')?.value ?? '').trim();
    const effectiveCurrent =
      currentFormValue ||
      this.statusNameForForm(String(this.activeIncident()?.status ?? '').trim());
    if (name === effectiveCurrent) return true;

    // Incidente ya creado: solo estados hacia adelante en el flujo (nunca retroceder).
    if (this.activeTabId() !== 'new') {
      const savedStatusUi = catalogStatusToUiStatus(
        String(this.activeIncident()?.status ?? '').trim(),
      );
      const agency = this.authService.currentUser()?.agency ?? 'CSJ';
      if (!isForwardStatusTransition(savedStatusUi, name, agency)) {
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
    return catalogStatusToUiStatus(catalogName);
  }

  private loadAllIncidentStatuses(agency: string, afterLoad?: () => void): void {
    this.http.get<CatalogOption[]>('/api/incident-statuses', { params: { agency } }).subscribe({
      next: (rows) => {
        this.incidentStatuses.set(rows);
        afterLoad?.();
        this.cdr.markForCheck();
      },
      error: () => this.incidentStatuses.set([]),
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
    const group = this.involvedPlaces.at(index) as FormGroup | undefined;
    const control = group?.get('departmentId');
    if (!control) return;
    const sub = control.valueChanges.subscribe((val) => {
      this.refreshPlaceMunicipalities(index, Number(val)).catch(() => {});
    });
    this.placeDeptSubs.push(sub);
  }

  /** Al cambiar departamento: limpia municipio y carga solo los de ese departamento. */
  private async refreshPlaceMunicipalities(index: number, deptId: number): Promise<void> {
    const group = this.involvedPlaces.at(index) as FormGroup | undefined;
    group?.patchValue({ municipalityId: null }, { emitEvent: false });
    if (!deptId) {
      this.setPlaceMunicipalities(index, []);
      return;
    }
    try {
      const rows = await firstValueFrom(this.colombiaGeo.getMunicipalities(deptId));
      this.setPlaceMunicipalities(index, rows);
    } catch {
      this.setPlaceMunicipalities(index, []);
      this.notificationService.addNotification(
        'Municipios no disponibles',
        'No se pudo cargar la lista de municipios. Seleccione el departamento de nuevo.',
      );
    }
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
    try {
      const rows = await firstValueFrom(this.colombiaGeo.getMunicipalities(deptId));
      this.setPlaceMunicipalities(index, rows);
      if (municipalityId != null) {
        const group = this.involvedPlaces.at(index) as FormGroup | undefined;
        group?.patchValue({ municipalityId }, { emitEvent: false });
      }
    } catch {
      this.setPlaceMunicipalities(index, []);
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
    const group = this.involvedVehicles.at(index) as FormGroup | undefined;
    if (!group) return;
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
    const group = this.involvedVehicles.at(index) as FormGroup | undefined;
    if (!group) return;
    const plate = String(group.get('plate')?.value || '').trim();
    if (!plate) {
      this.clearVehicleRow(index);
      this.vehicleLastLookupPlate.delete(index);
      return;
    }
    if (group.get('plate')?.invalid) return;

    this.incidentService.lookupVehicleByPlate(plate).subscribe({
      next: (vehicle) => {
        // Solo datos del vehículo; rol y detalles son propios de este incidente.
        const patch: Partial<InvolvedVehicle> = {
          make: vehicle.make || '',
          model: vehicle.model || '',
          color: vehicle.color || '',
        };
        group.patchValue(patch, { emitEvent: false });
        this.vehicleLastLookupPlate.set(index, plate.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        this.notificationService.addNotification(
          'Vehículo identificado',
          `Se cargó información previa para la placa ${plate}.`,
        );
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
    const group = this.involvedVehicles.at(index) as FormGroup | undefined;
    if (!group) return;
    group.patchValue({ make: '', model: '', color: '' }, { emitEvent: false });
    this.cdr.markForCheck();
  }

  private clearVehicleRow(index: number): void {
    const group = this.involvedVehicles.at(index) as FormGroup | undefined;
    if (!group) return;
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
    const sorted = incidents.slice();
    const column = this.sortColumn();
    const direction = this.sortDirection();
    if (column === 'default') {
      return sorted.sort(
        (a, b) =>
          priorityOrder[b.priority] - priorityOrder[a.priority] ||
          statusOrder[b.status] - statusOrder[a.status],
      );
    }
    const dir = direction === 'asc' ? 1 : -1;
    return sorted.sort((a, b) => {
      const valA = column === 'priority' ? priorityOrder[a.priority] : statusOrder[a.status];
      const valB = column === 'priority' ? priorityOrder[b.priority] : statusOrder[b.status];
      return (valA - valB) * dir;
    });
  }

  ngOnInit() {
    this.incidentLeaveGuard.register(
      () => this.shouldConfirmLeave(),
      (action) => this.requestLeaveOr(action),
    );

    if (this.incidentService.incidents().length === 0) this.incidentService.getIncidents();

    this.configService.getIncidentTypes().catch(() => {});
    this.configService.getResponseProtocols().catch(() => {});
    this.configService.getAuditLogs().catch(() => {});
    this.loadDepartments().catch(() => {});
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
    this.setupStatusChangeHandler();
  }

  private setupStatusChangeHandler(): void {
    this.statusSub?.unsubscribe();
    this.statusSub = this.incidentForm.get('status')?.valueChanges.subscribe((statusValue) => {
      if (this.skipStatusNav || this.activeTabId() === 'new') return;
      const uiStatus = catalogStatusToUiStatus(String(statusValue ?? ''));
      if (!shouldNavigateToMedidasTab(uiStatus)) return;
      this.detailTab.set('medidas');
      const hint = medidasTabHint(uiStatus);
      if (hint) {
        this.notificationService.addNotification('Pestaña Medidas', hint);
      }
      this.cdr.markForCheck();
    });
  }

  currentAgency(): string {
    return this.authService.currentUser()?.agency ?? 'CSJ';
  }

  showMedidasTab(): boolean {
    return isCsjMedidasWorkflow(this.currentAgency()) && this.activeTabId() !== 'new';
  }

  workflowStatusForMedidas(): string {
    const formStatus = catalogStatusToUiStatus(
      String(this.incidentForm.get('status')?.value ?? '').trim(),
    );
    const savedStatus = catalogStatusToUiStatus(
      String(this.activeIncident()?.status ?? '').trim(),
    );
    const formRank = CSJ_STATUS_WORKFLOW_RANK[formStatus as keyof typeof CSJ_STATUS_WORKFLOW_RANK];
    const savedRank =
      CSJ_STATUS_WORKFLOW_RANK[savedStatus as keyof typeof CSJ_STATUS_WORKFLOW_RANK];
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

  setActiveTab(tabId: string | 'new') {
    if (this.activeTabId() === tabId) return;
    this.requestLeaveOr(() => this.applyActiveTab(tabId));
  }

  private applyActiveTab(tabId: string | 'new') {
    if (this.activeTabId() === 'new') {
      this.newIncidentFormState.set(this.incidentForm.getRawValue());
    }
    this.activeTabId.set(tabId);
  }

  private hasPendingIncidentSave(): boolean {
    const tabId = this.activeTabId();
    if (!tabId || tabId === 'new') return false;
    if (String(this.incidentForm.get('agregarComentario')?.value ?? '').trim()) return true;
    if (this.incidentForm.dirty) return true;
    const incident = this.activeIncident();
    if (!incident) return false;
    const formStatus = catalogStatusToUiStatus(
      String(this.incidentForm.get('status')?.value ?? '').trim(),
    );
    const savedStatus = catalogStatusToUiStatus(String(incident.status ?? '').trim());
    return formStatus !== savedStatus;
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
    action?.();
    this.cdr.markForCheck();
  }

  saveAndLeave(): void {
    this.leaveAfterSave = true;
    if (this.activeTabId() === 'new') {
      this.registerIncident();
    } else {
      this.updateIncident();
    }
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
    this.detailTab.set(tab);
    if (tab === 'detalle') {
      this.destroyMap();
      setTimeout(() => {
        const incident = this.activeIncident();
        const lat = this.incidentForm.get('lat')?.value ?? incident?.lat;
        const lng = this.incidentForm.get('lng')?.value ?? incident?.lng;
        this.initMap(
          lat != null ? Number(lat) : undefined,
          lng != null ? Number(lng) : undefined,
        ).catch(() => {});
      }, 0);
    }
    this.cdr.markForCheck();
  }

  private requiresMedidasForSave(statusValue: string): boolean {
    return catalogStatusToUiStatus(String(statusValue ?? '').trim()) === 'Medidas asignadas';
  }

  private hasAssignedMedidas(incidentId: string) {
    return this.http.get<{
      gestion: {
        codigo_oficio?: string;
        tramite_destino?: string;
        resolucion_cerrem?: string;
        ID_riesgo?: number;
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
    const operator =
      this.activeIncident()?.operator?.trim() ||
      this.authService.currentUser()?.name?.trim() ||
      '';
    this.commentsHistory.set(
      enrichCommentAuthors(buildCommentHistoryView(storedComments, legacyDetails), operator),
    );
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

    return {
      id: '',
      timestamp: new Date().toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
      status: (formValue.status || this.defaultStatusName()) as IncidentStatus,
      event_id: selectedType?.id ?? formValue.event_id ?? '',
      incident_type_id: selectedType?.id,
      priority_id: formValue.priority_id ?? '',
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
      priority: formValue.priority_id as IncidentPriority,
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

    if (!this.validateBeforeSave()) {
      this.abortLeaveAfterSave();
      return;
    }

    const updatedData = this.incidentForm.getRawValue();
    const incidentId = this.activeIncident()!.id;

    const targetStatus = catalogStatusToUiStatus(String(updatedData.status ?? ''));
    const agency = this.authService.currentUser()?.agency ?? 'CSJ';

    if (targetStatus === 'Cerrado') {
      this.commitIncidentUpdate(updatedData);
      return;
    }

    if (isCsjMedidasWorkflow(agency)) {
      this.hasAssignedMedidas(incidentId).subscribe({
        next: ({ gestion, medidas }) => {
          const gestionRecord = gestion as {
            codigo_oficio?: string;
            tramite_destino?: string;
            resolucion_cerrem?: string;
            ID_riesgo?: number;
          } | null;
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
          if (this.requiresMedidasForSave(targetStatus) && !medidas?.length) {
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
          if (this.requiresMedidasForSave(targetStatus)) {
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
    const incidentId = this.activeIncident()!.id;
    const base = this.activeIncident()!;
    const draftComment = String(updatedData.agregarComentario ?? '').trim();
    const mergedComments = this.mergeCommentHistory(base.comments ?? '', draftComment);

    const selectedType = this.incidentTypes().find((t) => t.name === updatedData.event_id);
    const finalData: Incident = {
      ...base,
      status: catalogStatusToUiStatus(
        String(updatedData.status || this.defaultStatusName()),
      ) as IncidentStatus,
      event_id: selectedType?.id ?? updatedData.event_id ?? '',
      incident_type_id: selectedType?.id,
      priority_id: updatedData.priority_id ?? '',
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
      priority: updatedData.priority_id as IncidentPriority,
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
      this.configService.getAuditLogs().catch(() => {});
      this.notificationService.addNotification(
        'Incidente Actualizado',
        `Se guardaron los cambios para #${incidentId}.`,
        incidentId,
      );
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
    this.commentsHistory.set([]);
    this.involvedPeople.clear();
    this.involvedPlaces.clear();
    this.involvedVehicles.clear();
    this.placeMunicipalities.set(new Map());
    this.detachPlaceDepartmentWatchers();
    this.incidentForm.enable();
  }

  private populateFormWithState(state: Partial<Incident>) {
    this.selectedIncidentTypeName.set(state.type || (state as any).event_id || null);
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
    this.loadCommentsHistory(comments, details);
    if (state.type) {
      this.incidentForm.get('event_id')?.setValue(state.type, { emitEvent: false });
    }
    const typeName = state.type || null;
    this.lastIncidentTypeName = typeName;
    const selectedType = this.incidentTypes().find((t) => t.name === typeName);
    this.lastTypeDefaultPriority = selectedType?.defaultPriority ?? null;
    this.loadIncidentMunicipalities(state.departmentId, state.municipalityId).catch(() => {});
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
      this.loadPlaceMunicipalitiesForRow(index, pl.departmentId, pl.municipalityId).catch(() => {});
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
    if (this.incidentForm.dirty) {
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

  setSort(column: 'priority' | 'status'): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'desc' ? 'asc' : 'desc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
    this.listCurrentPage.set(1);
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
    this.destroyMap();
    this.typeSub?.unsubscribe();
    this.phoneSub?.unsubscribe();
    this.statusSub?.unsubscribe();
    this.incidentDeptSub?.unsubscribe();
    this.detachPlaceDepartmentWatchers();
  }
}
