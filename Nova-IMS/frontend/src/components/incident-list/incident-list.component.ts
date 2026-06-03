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
  PersonRole,
  VehicleRole,
  InvolvedPerson,
  InvolvedVehicle,
  Person,
  DOCUMENT_TYPE_OPTIONS,
  DocumentType,
  PERSON_GENDER_OPTIONS,
  PersonGender,
  ColombiaDepartment,
  ColombiaMunicipality,
} from "../../models/incident.model";
import { Subscription, of, firstValueFrom } from "rxjs";
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
import { AuthService } from "../../services/auth.service";
import { PersonService } from "../../services/person.service";
import { ColombiaGeoService } from "../../services/colombia-geo.service";
import { IncidentEmailModalComponent } from "../incident-email-modal/incident-email-modal.component";
import {
  appendIncidentNote,
  formatNoteForDisplay,
  IncidentNoteEntry,
  buildCommentHistoryView,
} from "../../utils/incident-notes";

declare var google: any;

const priorityOrder: Record<IncidentPriority, number> = {
  Crítica: 4,
  Alta: 3,
  Media: 2,
  Baja: 1,
};

const statusOrder: Record<IncidentStatus, number> = {
  Nuevo: 7,
  Asignado: 6,
  "En camino": 5,
  "En situación": 4,
  Resuelto: 3,
  Cerrado: 2,
  Cancelado: 1,
};

@Component({
  selector: "app-incident-list",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IncidentEmailModalComponent],
  templateUrl: "./incident-list.component.html",
  styleUrls: ["./incident-list.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentListComponent implements OnInit, OnDestroy {
  private readonly platePattern = /^[A-Za-z0-9-]{5,8}$/;

  /** Tipo de documento cuando el registro maestro no lo trae (p. ej. lookup por teléfono). */
  private inferDocumentType(documentId: string): DocumentType | "" {
    const id = String(documentId || "").trim();
    if (!id) return "";
    if (/[A-Za-z]/.test(id)) return "Pasaporte";
    const digits = id.replace(/\D/g, "");
    if (digits.length >= 6 && digits.length <= 11) return "Cédula de Ciudadanía";
    return "";
  }

  private resolveDocumentType(person: Person): DocumentType | "" {
    const raw = String(person.documentType || "").trim();
    if (
      raw &&
      DOCUMENT_TYPE_OPTIONS.includes(raw as DocumentType)
    ) {
      return raw as DocumentType;
    }
    return this.inferDocumentType(person.documentId);
  }
  private vehicleLookupTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private vehicleLastLookupPlate = new Map<number, string>();
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private configService = inject(ConfigurationService);
  private locationService = inject(LocationRequestService);
  private incidentService = inject(IncidentService);
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private colombiaGeo = inject(ColombiaGeoService);

  // --- Tab Management State ---
  openIncidentTabs = signal<Incident[]>([]);
  showNewIncidentTab = signal(false);
  activeTabId = signal<string | "new" | null>(null);
  selectedIncidentTypeName = signal<string | null>(null);
  isProtocolVisible = signal(true);
  newIncidentFormState = signal<any | null>(null);
  readonly MAX_TABS = 5;

  emailModalIncident = signal<Incident | null>(null);
  commentsHistory = signal<IncidentNoteEntry[]>([]);
  readonly formatNoteHeader = formatNoteForDisplay;

  // Google Maps
  private map: google.maps.Map | null = null;
  private marker: google.maps.marker.AdvancedMarkerElement | null = null;
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
  statuses: IncidentStatus[] = [
    "Nuevo",
    "Asignado",
    "En camino",
    "En situación",
    "Resuelto",
    "Cerrado",
    "Cancelado",
  ];
  incidentTypes = this.configService.incidentTypes;
  personRoles: PersonRole[] = ["Víctima", "Victimario", "Testigo"];
  readonly documentTypeOptions = DOCUMENT_TYPE_OPTIONS;
  readonly genderOptions = PERSON_GENDER_OPTIONS;
  departments = signal<ColombiaDepartment[]>([]);
  /** Municipios del Ubicación del Incidente(según departamento del incidente). */
  incidentMunicipalities = signal<ColombiaMunicipality[]>([]);
  vehicleRoles: VehicleRole[] = [
    "Vehículo Víctima",
    "Vehículo Victimario",
    "Vehículo Involucrado",
  ];
  sortColumn = signal<"priority" | "status" | "default">("default");
  sortDirection = signal<"asc" | "desc">("desc");
  personService = inject(PersonService);

  incidentForm = this.fb.group({
    event_id: ["", Validators.required],
    priority_id: ["", Validators.required],
    status: ["Nuevo" as IncidentStatus, Validators.required],
    origin: ["", Validators.required],
    phone: ["", [Validators.required, Validators.pattern("^[0-9+ ]*$")]],
    location: ["", Validators.required],
    departmentId: [null as number | null, Validators.required],
    municipalityId: [null as number | null, Validators.required],
    lat: [null as number | null, Validators.required],
    lng: [null as number | null, Validators.required],
    agregarComentario: [""],
    type: [""],
    priority: ["Media" as IncidentPriority],
    locationPhoneNumber: [{ value: "", disabled: true }],
    involvedPeople: this.fb.array([]),
    involvedVehicles: this.fb.array([]),
  });

  constructor() {
    effect(() => {
      if (this.locationService.triggerNewIncident()) {
        this.showNewIncidentTab.set(true);
        this.setActiveTab("new");
        this.locationService.clearNewIncidentTrigger();
      }
    });

    effect(() => {
      const locationData = this.locationService.locationReceived();
      if (!locationData) return;

      this.showNewIncidentTab.set(true);
      this.setActiveTab("new");

      setTimeout(() => {
        const patch: Record<string, unknown> = {
          lat: Number(locationData.lat.toFixed(6)),
          lng: Number(locationData.lng.toFixed(6)),
          origin: "Solicitud de Ubicación",
        };
        if (locationData.phoneNumber) {
          patch["phone"] = locationData.phoneNumber;
        }
        this.incidentForm.patchValue(patch);
        if (locationData.phoneNumber) {
          const locationPhoneCtrl = this.incidentForm.get("locationPhoneNumber");
          locationPhoneCtrl?.enable({ emitEvent: false });
          locationPhoneCtrl?.setValue(locationData.phoneNumber, {
            emitEvent: false,
          });
          locationPhoneCtrl?.disable({ emitEvent: false });
          this.lookupPersonByPhone(locationData.phoneNumber);
        }
        // Ubicación del incidente: solo GPS (geocodificación) o texto del operador, nunca dirección guardada de la persona.
        this.incidentForm.patchValue({ location: "" }, { emitEvent: false });
        this.reverseGeocodeFromGps(locationData.lat, locationData.lng);
        this.cdr.detectChanges();
      }, 350);

      this.locationService.clearLocation();
    });

    effect(() => {
      const tabId = this.activeTabId();
      this.destroyMap();

      if (tabId === "new") {
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
        const incident = this.openIncidentTabs().find(
          (inc) => inc.id === tabId,
        );
        if (incident) {
          this.populateFormWithState(incident);
          setTimeout(() => this.initMap(incident.lat, incident.lng), 0);
        }
      }
    });
  }

  /** SMS/WhatsApp: teléfono del enlace de ubicación; si no, N/A en vitácora. */
  private resolveLocationPhoneForSave(raw: unknown): string {
    const v = String(raw ?? "").trim();
    return v || "N/A";
  }

  private toLocalPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("57") && digits.length > 10) {
      return digits.slice(2);
    }
    return digits;
  }

  private applyPhoneFromLocationRequest(phone: string): void {
    const local = this.toLocalPhone(phone);
    this.incidentForm.patchValue({
      phone: local,
      origin:
        this.incidentForm.get("origin")?.value || "Solicitud de Ubicación",
    });
    const locationPhoneCtrl = this.incidentForm.get("locationPhoneNumber");
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

  private async initMap(lat = 4.60971, lng = -74.08175) {
    await this.waitForGoogleMaps();

    const mapEl = document.getElementById("map");
    if (!mapEl || this.map) return;

    this.geocoder = new google.maps.Geocoder();

    this.map = new google.maps.Map(mapEl, {
      center: { lat, lng },
      zoom: 15,
      mapId: "DEMO_MAP_ID",
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

    // Click en el
    this.map!.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !this.marker) return;
      (this.marker as any).setPosition(e.latLng);
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      this.ngZone.run(() => {
        this.updateFormCoords(lat, lng);
        this.reverseGeocode(lat, lng);
      });
    });

    // Drag del marcador
    this.marker!.addListener("dragend", (e: any) => {
      const pos = (this.marker as any).getPosition();
      if (!pos) return;
      this.ngZone.run(() => {
        this.updateFormCoords(pos.lat(), pos.lng());
        this.reverseGeocode(pos.lat(), pos.lng());
      });
    });

    this.initAutocomplete();
  }

  private initAutocomplete() {
    const locationInput = document.getElementById(
      "location",
    ) as HTMLInputElement;
    if (!locationInput) return;

    this.autocomplete = new google.maps.places.Autocomplete(locationInput, {
      componentRestrictions: { country: "co" }, // Restricción a Colombia
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
        if (this.marker) {
          (this.marker as any).setPosition({ lat, lng });
        }
      });
    });
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
    if (!this.geocoder) return;

    this.geocoder.geocode(
      { location: { lat, lng } },
      (results: any, status: any) => {
        this.ngZone.run(() => {
          if (status === "OK" && results?.[0]) {
            const address = results[0].formatted_address;
            if (fromGpsRequest) {
              this.incidentForm.patchValue(
                { location: address },
                { emitEvent: false },
              );
            } else {
              const current = String(
                this.incidentForm.get("location")?.value || "",
              ).trim();
              if (!current) {
                this.incidentForm.patchValue(
                  { location: address },
                  { emitEvent: false },
                );
              }
            }
            this.cdr.markForCheck();
          }
        });
      },
    );
  }

  private destroyMap() {
    if (this.map) {
      google.maps.event.clearInstanceListeners(this.map);
      this.map = null;
      this.marker = null;
      this.geocoder = null;
      this.autocomplete = null;
    }
  }
  activeIncident = computed(() => {
    const tabId = this.activeTabId();
    if (!tabId || tabId === "new") return null;
    return this.openIncidentTabs().find((inc) => inc.id === tabId) ?? null;
  });

  incidentAuditLogs = computed(() => {
    const incident = this.activeIncident();
    if (!incident) return [];
    return this.auditLogs()
      .filter((log) => log.incidentId === incident.id)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  });

  formatLogTime(timestamp: string): string {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return timestamp;
    return d.toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  get involvedPeople(): FormArray {
    return this.incidentForm.get("involvedPeople") as FormArray;
  }
  get involvedVehicles(): FormArray {
    return this.incidentForm.get("involvedVehicles") as FormArray;
  }

  private async loadDepartments(): Promise<void> {
    try {
      const rows = await this.colombiaGeo.getDepartments();
      this.departments.set(rows);
      this.cdr.markForCheck();
    } catch {
      this.notificationService.addNotification(
        "Catálogo geográfico",
        "No se pudieron cargar los departamentos. Ejecute npm run db:migrate en el backend.",
      );
    }
  }

  async onIncidentDepartmentChange(): Promise<void> {
    this.incidentForm.patchValue({ municipalityId: null }, { emitEvent: false });
    const deptId = Number(this.incidentForm.get("departmentId")?.value);
    if (!deptId) {
      this.incidentMunicipalities.set([]);
      this.cdr.markForCheck();
      return;
    }
    try {
      const list = await firstValueFrom(
        this.colombiaGeo.getMunicipalities(deptId),
      );
      this.incidentMunicipalities.set(list);
    } catch {
      this.incidentMunicipalities.set([]);
      this.notificationService.addNotification(
        "Municipios",
        "No se pudo cargar la lista de municipios.",
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
    await this.onIncidentDepartmentChange();
    if (municipalityId != null) {
      this.incidentForm.patchValue(
        { municipalityId },
        { emitEvent: false },
      );
    }
  }

  private buildPersonGroup(p?: Partial<InvolvedPerson>): FormGroup {
    return this.fb.group({
      name: [p?.name ?? "", Validators.required],
      role: [(p?.role ?? "") as PersonRole | "", Validators.required],
      contact: [p?.contact ?? ""],
      details: [p?.details ?? ""],
      phone: [p?.phone ?? ""],
      documentType: [
        (p?.documentType ?? "") as DocumentType | "",
        Validators.required,
      ],
      documentId: [p?.documentId ?? ""],
      gender: [(p?.gender ?? "") as PersonGender | "", Validators.required],
      address: [p?.address ?? ""],
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

  createVehicleGroup(): FormGroup {
    return this.fb.group({
      plate: [
        "",
        [Validators.required, Validators.pattern(this.platePattern)],
      ],
      role: ["" as VehicleRole | "", Validators.required],
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
    const timer = this.vehicleLookupTimers.get(index);
    if (timer) clearTimeout(timer);
    this.vehicleLookupTimers.delete(index);
    this.vehicleLastLookupPlate.delete(index);
    this.involvedVehicles.removeAt(index);
  }

  onVehiclePlateInput(index: number): void {
    const group = this.involvedVehicles.at(index) as FormGroup | undefined;
    if (!group) return;
    const currentPlate = String(group.get("plate")?.value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const previousPlate = this.vehicleLastLookupPlate.get(index) || "";
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
    const control = this.involvedVehicles.at(index)?.get("plate");
    if (!control) return;
    const cleaned = String(control.value || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[^A-Z0-9-]/g, "");
    control.setValue(cleaned, { emitEvent: false });
    control.markAsTouched();
  }

  normalizeAndLookupVehicle(index: number): void {
    this.normalizeVehiclePlate(index);
    const group = this.involvedVehicles.at(index) as FormGroup | undefined;
    if (!group) return;
    const plate = String(group.get("plate")?.value || "").trim();
    if (!plate) {
      this.clearVehicleRow(index);
      this.vehicleLastLookupPlate.delete(index);
      return;
    }
    if (group.get("plate")?.invalid) return;

    this.incidentService.lookupVehicleByPlate(plate).subscribe({
      next: (vehicle) => {
        // Solo datos del vehículo; rol y detalles son propios de este incidente.
        const patch: Partial<InvolvedVehicle> = {
          make: vehicle.make || "",
          model: vehicle.model || "",
          color: vehicle.color || "",
        };
        group.patchValue(patch, { emitEvent: false });
        this.vehicleLastLookupPlate.set(
          index,
          plate.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        );
        this.notificationService.addNotification(
          "Vehículo identificado",
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
          "Error de consulta",
          "No se pudo consultar la información del vehículo por placa.",
        );
      },
    });
  }

  private clearVehicleCatalogFields(index: number): void {
    const group = this.involvedVehicles.at(index) as FormGroup | undefined;
    if (!group) return;
    group.patchValue(
      { make: "", model: "", color: "" },
      { emitEvent: false },
    );
    this.cdr.markForCheck();
  }

  private clearVehicleRow(index: number): void {
    const group = this.involvedVehicles.at(index) as FormGroup | undefined;
    if (!group) return;
    group.patchValue(
      {
        role: "",
        make: "",
        model: "",
        color: "",
        details: "",
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
    const status = this.filterStatus();
    const incidents = this.incidents().filter((incident) => {
      const textMatch =
        !text ||
        incident.id.toLowerCase().includes(text) ||
        incident.type.toLowerCase().includes(text) ||
        incident.location.toLowerCase().includes(text) ||
        incident.operator.toLowerCase().includes(text);
      const hiddenByDefault = !status && incident.status === "Cerrado";
      const statusMatch = !status || incident.status === status;
      return textMatch && statusMatch && !hiddenByDefault;
    });
    return this.sortIncidents(incidents);
  });

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

    void this.configService.getIncidentTypes();
    void this.configService.getResponseProtocols();
    void this.configService.getAuditLogs();
    void this.loadDepartments();

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

    this.fillOrAddInvolvedPerson(person);
    this.cdr.markForCheck();
  }

  private fillOrAddInvolvedPerson(person: Person): void {
    const personKey = this.normalizePhone(person.phone);
    const existingIndex = this.involvedPeople.controls.findIndex((ctrl) => {
      const doc = String(ctrl.get("documentId")?.value || "");
      const contact = this.normalizePhone(
        String(ctrl.get("contact")?.value || ctrl.get("phone")?.value || ""),
      );
      return doc === person.documentId || (personKey && contact === personKey);
    });

    const documentType = this.resolveDocumentType(person);
    const personValue: Partial<InvolvedPerson> = {
      name: person.name,
      role: "Víctima" as PersonRole,
      contact: person.phone,
      phone: person.phone,
      documentType,
      documentId: person.documentId,
      address: person.address,
      gender: "",
    };

    if (existingIndex >= 0) {
      this.involvedPeople.at(existingIndex).patchValue(personValue);
      return;
    }

    const emptyIndex = this.involvedPeople.controls.findIndex(
      (ctrl) => !String(ctrl.get("name")?.value || "").trim(),
    );
    if (emptyIndex >= 0) {
      this.involvedPeople.at(emptyIndex).patchValue(personValue);
      return;
    }

    this.addRegisteredPersonToInvolved(person);
  }

  addRegisteredPersonToInvolved(person: Person) {
    const group = this.buildPersonGroup({
      name: person.name,
      role: "Víctima",
      contact: person.phone,
      phone: person.phone,
      documentType: this.resolveDocumentType(person),
      documentId: person.documentId,
      address: person.address,
    });
    this.involvedPeople.push(group);
    this.cdr.markForCheck();
  }

  private pruneEmptyInvolvedEntries(): void {
    for (let i = this.involvedPeople.length - 1; i >= 0; i--) {
      const name = String(this.involvedPeople.at(i).get("name")?.value || "").trim();
      if (!name) this.involvedPeople.removeAt(i);
    }
    for (let i = this.involvedVehicles.length - 1; i >= 0; i--) {
      const group = this.involvedVehicles.at(i) as FormGroup;
      const plate = String(group.get("plate")?.value || "").trim();
      const role = String(group.get("role")?.value || "").trim();
      const hasCatalog =
        !!String(group.get("make")?.value || "").trim() ||
        !!String(group.get("model")?.value || "").trim() ||
        !!String(group.get("color")?.value || "").trim() ||
        !!String(group.get("details")?.value || "").trim();
      if (!plate && !role && !hasCatalog) {
        this.involvedVehicles.removeAt(i);
      }
    }
  }

  private describeFormErrors(): string {
    const labels: Record<string, string> = {
      event_id: "Tipo de evento",
      priority_id: "Prioridad",
      origin: "Origen",
      phone: "Teléfono",
      location: "Dirección del hecho",
      departmentId: "Departamento (Ubicación del Incidente)",
      municipalityId: "Municipio / ciudad (Ubicación del Incidente)",
      lat: "Ubicación en mapa (latitud)",
      lng: "Ubicación en mapa (longitud)",
    };
    const missing: string[] = [];
    for (const [key, label] of Object.entries(labels)) {
      if (this.incidentForm.get(key)?.invalid) missing.push(label);
    }
    for (const g of this.involvedPeople.controls) {
      const name = String(g.get("name")?.value || "").trim();
      if (!name) continue;
      if (!String(g.get("role")?.value || "").trim()) {
        missing.push("Rol de persona involucrada");
      }
      if (!String(g.get("documentType")?.value || "").trim()) {
        missing.push("Tipo de documento de persona involucrada");
      }
    }
    for (const g of this.involvedVehicles.controls) {
      const plate = String(g.get("plate")?.value || "").trim();
      if (!plate) continue;
      if (g.get("plate")?.invalid) {
        missing.push(
          `Placa inválida (${plate}: use 5-8 caracteres, letras o números)`,
        );
      }
      if (!String(g.get("role")?.value || "").trim()) {
        missing.push(`Rol del vehículo con placa ${plate}`);
      }
    }
    const unique = [...new Set(missing)];
    return unique.length
      ? `Complete: ${unique.join(", ")}.`
      : "Revise los campos obligatorios.";
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
    if (this.openIncidentTabs().some((tab) => tab.id === incident.id)) {
      this.setActiveTab(incident.id);
    } else if (this.openIncidentTabs().length < this.MAX_TABS) {
      this.openIncidentTabs.update((tabs) => [...tabs, incident]);
      this.setActiveTab(incident.id);
      this.notificationService.addNotification(
        "Pestaña Abierta",
        `Se abrió el incidente #${incident.id}.`,
        incident.id,
      );
    } else {
      this.notificationService.addNotification(
        "Límite Alcanzado",
        "Cierre una pestaña para abrir una nueva.",
      );
    }
  }

  setActiveTab(tabId: string | "new") {
    if (this.activeTabId() === tabId) return;
    if (this.activeTabId() === "new")
      this.newIncidentFormState.set(this.incidentForm.getRawValue());
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

  private noteAuthor(): string {
    return this.authService.currentUser()?.name ?? "Operador";
  }

  private loadCommentsHistory(
    storedComments?: string,
    legacyDetails?: string,
  ): void {
    this.commentsHistory.set(
      buildCommentHistoryView(storedComments, legacyDetails),
    );
  }

  private clearAgregarComentario(): void {
    this.incidentForm.patchValue({ agregarComentario: "" }, { emitEvent: false });
  }

  /** Pasa el texto de "Agregar comentario" al historial (columna comments) y deja el campo vacío. */
  private mergeCommentHistory(
    storedComments: string,
    draft: string | null | undefined,
  ): string {
    const text = String(draft ?? "").trim();
    if (!text) return storedComments ?? "";
    return appendIncidentNote(storedComments, this.noteAuthor(), text);
  }

  registerIncident() {
    const newIncident = this.buildNewIncidentFromForm();
    if (!newIncident) return;

    this.incidentService.createIncident(newIncident).subscribe({
      next: (saved) => this.finalizeNewIncident(saved),
      error: (err) => {
        this.incidentService.handleCreateError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private buildNewIncidentFromForm(): Incident | null {
    this.pruneEmptyInvolvedEntries();

    if (this.incidentForm.invalid) {
      this.incidentForm.markAllAsTouched();
      this.notificationService.addNotification(
        "No se puede guardar",
        this.describeFormErrors(),
      );
      this.cdr.markForCheck();
      return null;
    }

    const formValue = this.incidentForm.getRawValue();
    const draft = String(formValue.agregarComentario ?? "").trim();
    if (!draft) {
      this.incidentForm.get("agregarComentario")?.markAsTouched();
      this.notificationService.addNotification(
        "No se puede guardar",
        "Escriba un comentario en «Agregar comentario».",
      );
      this.cdr.markForCheck();
      return null;
    }

    const comments = this.mergeCommentHistory("", draft);
    const selectedType = this.incidentTypes().find(
      (t) => t.name === formValue.event_id,
    );

    return {
      id: `INC-${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}`,
      timestamp: new Date().toLocaleString("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      status: (formValue.status || "Nuevo") as IncidentStatus,
      event_id: selectedType?.id ?? formValue.event_id ?? "",
      incident_type_id: selectedType?.id,
      priority_id: formValue.priority_id ?? "",
      origin: formValue.origin ?? "",
      phone: formValue.phone ?? "",
      location: formValue.location ?? "",
      departmentId: formValue.departmentId ?? null,
      municipalityId: formValue.municipalityId ?? null,
      lat: formValue.lat ?? 0,
      lng: formValue.lng ?? 0,
      details: "",
      comments,
      type: selectedType?.name ?? formValue.event_id ?? "",
      priority: (formValue.priority_id ?? "Media") as IncidentPriority,
      operator: "N/A",
      ani: formValue.phone ?? "N/A",
      locationPhoneNumber: this.resolveLocationPhoneForSave(
        formValue.locationPhoneNumber,
      ),
      involvedPeople: (
        (formValue.involvedPeople ?? []) as InvolvedPerson[]
      ).filter((p) => String(p.name || "").trim()),
      involvedVehicles: (
        (formValue.involvedVehicles ?? []) as InvolvedVehicle[]
      ).filter((v) => String(v.plate || "").trim()),
    };
  }

  private finalizeNewIncident(saved: Incident): void {
    this.notificationService.addNotification(
      "Incidente Registrado",
      `Se creó el incidente #${saved.id}.`,
      saved.id,
    );
    this.closeNewIncidentTab();
    this.openIncidentTab(saved);
    this.cdr.markForCheck();
  }

  updateIncident() {
    this.pruneEmptyInvolvedEntries();

    if (!this.activeIncident()) return;

    if (this.incidentForm.invalid) {
      this.incidentForm.markAllAsTouched();
      this.notificationService.addNotification(
        "No se puede guardar",
        this.describeFormErrors(),
      );
      this.cdr.markForCheck();
      return;
    }

    const updatedData = this.incidentForm.getRawValue();
    const incidentId = this.activeIncident()!.id;
    const base = this.activeIncident()!;
    const mergedComments = this.mergeCommentHistory(
      base.comments ?? "",
      updatedData.agregarComentario,
    );

    const selectedType = this.incidentTypes().find(
      (t) => t.name === updatedData.event_id,
    );
    const finalData: Incident = {
      ...base,
      status: (updatedData.status || "Nuevo") as IncidentStatus,
      event_id: selectedType?.id ?? updatedData.event_id ?? "",
      incident_type_id: selectedType?.id,
      priority_id: updatedData.priority_id ?? "",
      origin: updatedData.origin ?? "",
      phone: updatedData.phone ?? "",
      location: updatedData.location ?? "",
      lat: updatedData.lat ?? 0,
      lng: updatedData.lng ?? 0,
      ani: updatedData.phone ?? base.ani ?? "N/A",
      locationPhoneNumber: this.resolveLocationPhoneForSave(
        updatedData.locationPhoneNumber,
      ),
      details: "",
      comments: mergedComments,
      type: selectedType?.name ?? updatedData.event_id ?? "",
      priority: (updatedData.priority_id ?? "Media") as IncidentPriority,
      involvedPeople: (
        (updatedData.involvedPeople ?? []) as InvolvedPerson[]
      ).filter((p) => String(p.name || "").trim()),
      involvedVehicles: (
        (updatedData.involvedVehicles ?? []) as InvolvedVehicle[]
      ).filter((v) => String(v.plate || "").trim()),
    };
    this.incidentService.updateIncident(finalData, (saved) => {
      this.openIncidentTabs.update((tabs) =>
        tabs.map((t) => (t.id === incidentId ? saved : t)),
      );
      this.populateFormWithState(saved);
      void this.configService.getAuditLogs();
      this.cdr.markForCheck();
    });
    this.notificationService.addNotification(
      "Incidente Actualizado",
      `Se guardaron los cambios para #${incidentId}.`,
      incidentId,
    );
    this.loadCommentsHistory(mergedComments);
    this.clearAgregarComentario();
    this.incidentForm.markAsPristine();
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
      departmentId: null,
      municipalityId: null,
      agregarComentario: "",
    });
    this.incidentMunicipalities.set([]);
    this.commentsHistory.set([]);
    this.involvedPeople.clear();
    this.involvedVehicles.clear();
    this.incidentForm.enable();
  }

  private populateFormWithState(state: Partial<Incident>) {
    this.selectedIncidentTypeName.set(
      state.type || (state as any).event_id || null,
    );
    this.incidentForm.reset(undefined, { emitEvent: false });
    const { comments, details, ...rest } = state;
    this.incidentForm.patchValue(
      { ...rest, agregarComentario: "" },
      { emitEvent: false },
    );
    this.loadCommentsHistory(comments, details);
    if (state.type) {
      this.incidentForm
        .get("event_id")
        ?.setValue(state.type, { emitEvent: false });
    }
    void this.loadIncidentMunicipalities(
      state.departmentId,
      state.municipalityId,
    );
    this.involvedPeople.clear();
    const people = state.involvedPeople ?? [];
    for (const p of people) {
      this.involvedPeople.push(this.buildPersonGroup(p));
    }
    this.involvedVehicles.clear();
    state.involvedVehicles?.forEach((v) =>
      this.involvedVehicles.push(
        this.fb.group({
          plate: [
            v.plate,
            [Validators.required, Validators.pattern(this.platePattern)],
          ],
          role: [(v.role || "") as VehicleRole | "", Validators.required],
          make: [v.make],
          model: [v.model],
          color: [v.color],
          details: [v.details],
        }),
      ),
    );
    this.incidentForm.enable();
    this.incidentForm.markAsPristine();
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
        "Guarde los cambios",
        "Actualice el incidente antes de enviar el correo.",
      );
      return;
    }
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
      case "Asignado":
        return "bg-indigo-600/80 text-indigo-100";
      case "En camino":
        return "bg-yellow-600/80 text-yellow-100";
      case "En situación":
        return "bg-orange-600/80 text-orange-100";
      case "Resuelto":
        return "bg-green-600/80 text-green-100";
      case "Cerrado":
        return "bg-gray-600/80 text-gray-200";
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
    this.vehicleLookupTimers.forEach((t) => clearTimeout(t));
    this.vehicleLookupTimers.clear();
    this.vehicleLastLookupPlate.clear();
    this.destroyMap();
    this.typeSub?.unsubscribe();
    this.phoneSub?.unsubscribe();
  }
}
