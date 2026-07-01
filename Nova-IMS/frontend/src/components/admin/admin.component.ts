import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  computed,
  OnInit,
  effect,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import {
  IncidentPriority,
  Person,
  PersonFormPayload,
  CatalogOption,
  DocumentTypeOption,
} from '../../models/incident.model';
import {
  Operator,
  OperatorFormPayload,
  IncidentType,
  ResponseProtocol,
  RolePermission,
} from '../../models/admin.model';
import { ConfigurationService, NotificationEmailEntry } from '../../services/configuration.service';
import { IncidentService } from '../../services/incident.service';
import { PersonService } from '../../services/person.service';
import { AuthService } from '../../services/auth.service';
import { Agency, RoleOption } from '../../models/user.model';
import { AdminPaginationComponent } from './admin-pagination.component';
import { AuditLog } from '../../models/admin.model';
import { Incident, InvolvedPerson, InvolvedVehicle, joinPersonName } from '../../models/incident.model';
import {
  buildCommentHistoryView,
  displayCommentBody,
  formatNoteForDisplay,
  latestIncidentCommentEntry,
  noteAuthorInitials,
  resolveHistoryAuthor,
} from '../../utils/incident-notes';

type AdminTab =
  | 'users'
  | 'people'
  | 'incidents'
  | 'responses'
  | 'notifications'
  | 'admin_logs'
  | 'permissions'
  | 'incident_history';

const ADMIN_PAGE_SIZE = 15;

const PERMISSION_MODULE_HINTS: Record<string, string> = {
  Dashboard: 'Vista general y métricas del sistema',
  Incidentes: 'Registro y seguimiento de incidentes',
  Reportes: 'Informes y exportaciones',
  Administración: 'Usuarios, catálogos y configuración',
};

function adminTotalPages(count: number): number {
  return count > 0 ? Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE)) : 1;
}

function adminSlicePage<T>(items: T[], page: number): T[] {
  if (!items.length) return items;
  const totalPages = adminTotalPages(items.length);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * ADMIN_PAGE_SIZE;
  return items.slice(start, start + ADMIN_PAGE_SIZE);
}

interface IncidentHistoryGestion {
  codigo_oficio?: string | null;
  tramite_destino?: string | null;
  resolucion_cerrem?: string | null;
  nivel_riesgo?: string | null;
  tipo_esquema?: string | null;
  fecha_cerrem?: string | null;
  fecha_resolucion?: string | null;
  observaciones?: string | null;
  compartido_con?: string | null;
}

interface IncidentHistoryMedida {
  ID_tipo_medida: number;
  nombre: string;
  cantidad: number;
  observacion_medida?: string | null;
}

interface IncidentHistoryMedidasPayload {
  gestion: IncidentHistoryGestion | null;
  medidas: IncidentHistoryMedida[];
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminPaginationComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export class AdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  readonly configService = inject(ConfigurationService);
  readonly incidentService = inject(IncidentService);
  readonly personService = inject(PersonService);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  activeTab = signal<AdminTab>('users');

  // People Management
  people = this.personService.people;
  showPersonForm = signal(false);
  isEditModePerson = signal(false);
  selectedPerson = signal<Person | null>(null);
  personRoles = signal<CatalogOption[]>([]);
  genders = signal<CatalogOption[]>([]);
  personRolesLoading = signal(false);
  documentTypes = signal<DocumentTypeOption[]>([]);
  personForm = this.fb.group({
    primerNombre: ['', Validators.required],
    segundoNombre: [''],
    primerApellido: ['', Validators.required],
    segundoApellido: [''],
    tipoDocumento: ['', Validators.required],
    numeroDocumento: ['', Validators.required],
    contacto: [''],
    roleId: [null as number | null, Validators.required],
    genderId: [null as number | null],
    comentarios: [''],
    status: ['Activo' as 'Activo' | 'Inactivo', Validators.required],
  });

  // Admin Logs
  adminLogs = this.configService.adminLogs;
  adminLogSearch = signal('');

  filteredAdminLogs = computed(() => {
    const term = this.adminLogSearch().toLowerCase();
    if (!term) return this.adminLogs();
    return this.adminLogs().filter(
      (log) =>
        log.user.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term),
    );
  });

  // Data signals from service
  operators = this.configService.operators;
  incidentTypes = this.configService.incidentTypes;
  responseProtocols = this.configService.responseProtocols;
  notificationEmails = this.configService.notificationEmails;
  auditLogs = this.configService.auditLogs;
  rolePermissions = this.configService.rolePermissions;
  selectedPermissionsRoleId = signal('');
  permissionsDraft = signal<RolePermission['permissions']>([]);
  permissionsSnapshot = signal('');
  isSavingPermissions = signal(false);
  private _skipDraftSync = false;

  hasUnsavedPermissions = computed(() => {
    const snap = this.permissionsSnapshot();
    return snap !== '' && snap !== JSON.stringify(this.permissionsDraft());
  });

  activeRolePermission = computed(() => {
    const roles = this.rolePermissions();
    if (!roles.length) return null;
    const selected = this.selectedPermissionsRoleId();
    return roles.find((role) => role.id === selected) ?? roles[0];
  });
  allIncidents = this.incidentService.incidents;
  selectedIncidentIdForHistory = signal<string>('all');
  incidentHistorySearchTerm = signal('');
  historySubTab = signal<'details' | 'history'>('details');
  incidentHistoryMedidasPayload = signal<IncidentHistoryMedidasPayload | null>(null);
  incidentHistoryMedidasLoading = signal(false);

  incidentHistoryGestion = computed(() => this.incidentHistoryMedidasPayload()?.gestion ?? null);
  incidentHistoryAssignedMedidas = computed(
    () => this.incidentHistoryMedidasPayload()?.medidas ?? [],
  );

  private readonly incidentHistoryMedidasEffect = effect((onCleanup) => {
    const id = this.selectedIncidentIdForHistory();
    if (id === 'all') {
      this.incidentHistoryMedidasPayload.set(null);
      this.incidentHistoryMedidasLoading.set(false);
      return;
    }

    this.incidentHistoryMedidasLoading.set(true);
    const sub = this.http.get<IncidentHistoryMedidasPayload>(`/api/incidents/${id}/medidas`).subscribe({
      next: (data) => {
        if (this.selectedIncidentIdForHistory() !== id) return;
        this.incidentHistoryMedidasPayload.set({
          gestion: data?.gestion ?? null,
          medidas: Array.isArray(data?.medidas) ? data.medidas : [],
        });
        this.incidentHistoryMedidasLoading.set(false);
      },
      error: () => {
        if (this.selectedIncidentIdForHistory() !== id) return;
        this.incidentHistoryMedidasPayload.set({ gestion: null, medidas: [] });
        this.incidentHistoryMedidasLoading.set(false);
      },
    });
    onCleanup(() => sub.unsubscribe());
  });

  showOperatorForm = signal(false);
  isEditMode = signal(false);
  selectedOperator = signal<Operator | null>(null);
  operatorPasswordError = signal<string | null>(null);
  operatorFormError = signal<string | null>(null);
  agencies = signal<Agency[]>([]);
  agencyRoles = signal<RoleOption[]>([]);
  rolesLoading = signal(false);

  // Delete confirmation
  userSearchTerm = signal('');
  operatorsPage = signal(1);
  incidentTypesPage = signal(1);
  peoplePage = signal(1);
  responseProtocolsPage = signal(1);
  adminLogsPage = signal(1);
  incidentHistoryPage = signal(1);
  readonly adminPageSize = ADMIN_PAGE_SIZE;

  operatorForm = this.fb.group({
    primerNombre: ['', Validators.required],
    segundoNombre: [''],
    primerApellido: ['', Validators.required],
    segundoApellido: [''],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    agency: ['', Validators.required],
    password: ['', Validators.required],
    role: [{ value: '', disabled: true }, Validators.required],
    status: ['Activo' as 'Activo' | 'Inactivo', Validators.required],
  });

  priorities: IncidentPriority[] = ['Baja', 'Media', 'Alta', 'Crítica'];
  showIncidentTypeForm = signal(false);
  isEditModeIncidentType = signal(false);
  selectedIncidentTypeId = signal<string | null>(null);

  incidentTypeForm = this.fb.group({
    name: ['', Validators.required],
    defaultPriority: ['Media' as IncidentPriority, Validators.required],
    description: ['', Validators.required],
  });

  showResponseProtocolForm = signal(false);
  isEditModeResponseProtocol = signal(false);
  selectedResponseProtocolId = signal<string | null>(null);

  responseProtocolForm = this.fb.group({
    name: ['', Validators.required],
    incidentTypeName: ['', Validators.required],
    steps: this.fb.array([this.fb.control('', Validators.required)]),
  });

  newEmailControl = this.fb.control('', [Validators.email]);
  notificationEmailFilter = signal('');
  notificationEmailPage = signal(1);
  notificationEmailFeedback = signal<{
    type: 'success' | 'warn' | 'info';
    message: string;
  } | null>(null);

  readonly notificationEmailPageSize = ADMIN_PAGE_SIZE;

  displayedNotificationEmails = computed(() => {
    const term = this.notificationEmailFilter().trim().toLowerCase();
    const all = this.notificationEmails();
    if (!term) return all;
    return all.filter((entry) => entry.email.toLowerCase().includes(term));
  });

  notificationEmailTotalPages = computed(() =>
    adminTotalPages(this.displayedNotificationEmails().length),
  );

  paginatedNotificationEmails = computed(() =>
    adminSlicePage(this.displayedNotificationEmails(), this.notificationEmailPage()),
  );

  searchedOperators = computed(() => {
    const term = this.userSearchTerm().toLowerCase();
    if (!term) return this.operators();
    return this.operators().filter(
      (op) =>
        op.name.toLowerCase().includes(term) ||
        op.email.toLowerCase().includes(term) ||
        op.id.toLowerCase().includes(term) ||
        op.role.toLowerCase().includes(term),
    );
  });

  operatorsTotalPages = computed(() => adminTotalPages(this.searchedOperators().length));

  paginatedOperators = computed(() =>
    adminSlicePage(this.searchedOperators(), this.operatorsPage()),
  );

  incidentTypesTotalPages = computed(() => adminTotalPages(this.incidentTypes().length));

  paginatedIncidentTypes = computed(() =>
    adminSlicePage(this.incidentTypes(), this.incidentTypesPage()),
  );

  peopleTotalPages = computed(() => adminTotalPages(this.people().length));

  paginatedPeople = computed(() => adminSlicePage(this.people(), this.peoplePage()));

  responseProtocolsTotalPages = computed(() =>
    adminTotalPages(this.responseProtocols().length),
  );

  paginatedResponseProtocols = computed(() =>
    adminSlicePage(this.responseProtocols(), this.responseProtocolsPage()),
  );

  adminLogsTotalPages = computed(() => adminTotalPages(this.filteredAdminLogs().length));

  paginatedAdminLogs = computed(() =>
    adminSlicePage(this.filteredAdminLogs(), this.adminLogsPage()),
  );

  incidentHistoryTotalPages = computed(() =>
    adminTotalPages(this.filteredIncidentsForHistory().length),
  );

  paginatedIncidentsForHistory = computed(() =>
    adminSlicePage(this.filteredIncidentsForHistory(), this.incidentHistoryPage()),
  );

  constructor() {
    effect(() => {
      this.displayedNotificationEmails();
      const pages = this.notificationEmailTotalPages();
      if (pages > 0 && this.notificationEmailPage() > pages) {
        this.notificationEmailPage.set(pages);
      }
    });

    effect(() => {
      const roles = this.rolePermissions();
      if (!roles.length) {
        this.selectedPermissionsRoleId.set('');
        return;
      }
      const selected = this.selectedPermissionsRoleId();
      if (!roles.some((role) => role.id === selected)) {
        this.selectedPermissionsRoleId.set(roles[0].id);
      }
    });

    effect(() => {
      const role = this.activeRolePermission();
      if (this._skipDraftSync) return;
      if (!role) {
        this.permissionsDraft.set([]);
        this.permissionsSnapshot.set('');
        return;
      }
      const copy = role.permissions.map((p) => ({
        ...p,
        actions: { ...p.actions },
        locks: p.locks ? { ...p.locks } : undefined,
      }));
      this.permissionsDraft.set(copy);
      this.permissionsSnapshot.set(JSON.stringify(copy));
    });
  }

  ngOnInit() {
    this.loadInitialData();
    this.configService.getAdminLogs();
    this.loadAgencies();

    const suggestFromNames = () => {
      const { primerNombre, primerApellido } = this.operatorForm.getRawValue();
      const suggested = this.suggestUsername(primerNombre || '', primerApellido || '');
      const usernameCtrl = this.operatorForm.controls.username;
      if (!this.isEditMode() && (!usernameCtrl.dirty || !usernameCtrl.value)) {
        usernameCtrl.setValue(suggested, { emitEvent: false });
      }
    };

    this.operatorForm.controls.primerNombre.valueChanges.subscribe(() => suggestFromNames());
    this.operatorForm.controls.primerApellido.valueChanges.subscribe(() => suggestFromNames());

    this.operatorForm.controls.agency.valueChanges.subscribe((code) => {
      if (!code) {
        this.agencyRoles.set([]);
        this.operatorForm.controls.role.disable({ emitEvent: false });
        this.operatorForm.controls.role.setValue('', { emitEvent: false });
        return;
      }
      if (!this.isEditMode()) {
        this.operatorForm.controls.role.enable({ emitEvent: false });
        this.operatorForm.controls.role.setValue('', { emitEvent: false });
      }
      this.loadRolesForAgency(code);
    });

    this.operatorForm.controls.password.valueChanges.subscribe(() => {
      if (this.operatorPasswordError()) {
        this.operatorPasswordError.set(null);
      }
    });
  }

  private loadAgencies(): void {
    this.authService.getAgencies().subscribe({
      next: (list) => this.agencies.set(list),
      error: () => this.agencies.set([]),
    });
  }

  private loadRolesForAgency(agencyCode: string): void {
    this.rolesLoading.set(true);
    this.authService.getRoles(agencyCode).subscribe({
      next: (roles) => {
        this.agencyRoles.set(roles);
        this.rolesLoading.set(false);
      },
      error: () => {
        this.agencyRoles.set([]);
        this.rolesLoading.set(false);
      },
    });
  }

  suggestUsername(primerNombre: string, primerApellido: string): string {
    const normalize = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    const first = normalize(primerNombre);
    const last = normalize(primerApellido);
    if (!first && !last) return '';
    if (!last) return first.slice(0, 20);
    if (!first) return last.slice(0, 20);
    return (first.charAt(0) + last).slice(0, 20);
  }

  // --- Person Methods ---
  private loadPersonCatalogs(): void {
    const agency = this.authService.currentUser()?.agency;
    if (!agency) return;
    this.personRolesLoading.set(true);
    this.personService.getPersonRoles(agency).subscribe({
      next: (roles) => {
        this.personRoles.set(roles);
        this.personRolesLoading.set(false);
      },
      error: () => {
        this.personRoles.set([]);
        this.personRolesLoading.set(false);
      },
    });
    this.personService.getGenders(agency).subscribe({
      next: (list) => this.genders.set(list),
      error: () => this.genders.set([]),
    });
    this.personService.getDocumentTypes().subscribe({
      next: (list) => this.documentTypes.set(list),
      error: () => this.documentTypes.set([]),
    });
  }

  openAddPersonForm(): void {
    this.isEditModePerson.set(false);
    this.selectedPerson.set(null);
    this.personForm.reset({ status: 'Activo' });
    this.loadPersonCatalogs();
    this.showPersonForm.set(true);
  }

  openEditPersonForm(person: Person): void {
    this.isEditModePerson.set(true);
    this.selectedPerson.set(person);
    this.loadPersonCatalogs();
    this.personForm.patchValue({
      primerNombre: person.primerNombre ?? person.name.split(' ')[0] ?? '',
      segundoNombre: person.segundoNombre ?? '',
      primerApellido: person.primerApellido ?? '',
      segundoApellido: person.segundoApellido ?? '',
      tipoDocumento: person.documentType ?? '',
      numeroDocumento: person.documentId ?? '',
      contacto: person.contacto ?? person.phone ?? '',
      roleId: person.roleId ?? null,
      genderId: person.genderId ?? null,
      comentarios: person.comentarios ?? person.notes ?? '',
      status: person.status ?? 'Activo',
    });
    this.showPersonForm.set(true);
  }

  async savePerson(): Promise<void> {
    if (this.personForm.invalid || this.personForm.controls.roleId.value == null) {
      this.personForm.markAllAsTouched();
      return;
    }
    const raw = this.personForm.getRawValue();
    const payload: PersonFormPayload = {
      primerNombre: raw.primerNombre!.trim(),
      segundoNombre: raw.segundoNombre?.trim() || '',
      primerApellido: raw.primerApellido!.trim(),
      segundoApellido: raw.segundoApellido?.trim() || '',
      tipoDocumento: raw.tipoDocumento!,
      numeroDocumento: raw.numeroDocumento!.trim(),
      contacto: raw.contacto?.trim() || '',
      roleId: Number(raw.roleId),
      genderId: raw.genderId ?? null,
      comentarios: raw.comentarios?.trim() || '',
      status: raw.status ?? 'Activo',
    };
    try {
      if (this.isEditModePerson()) {
        await this.personService.updatePerson(this.selectedPerson()!.id, payload);
        this.notificationService.addNotification(
          'Persona Actualizada',
          'Los datos han sido guardados.',
        );
      } else {
        await this.personService.addPerson(payload);
        this.notificationService.addNotification(
          'Persona Registrada',
          'Se ha guardado el nuevo registro.',
        );
      }
      this.showPersonForm.set(false);
    } catch (err: unknown) {
      const e = err as { error?: { error?: { message?: string }; message?: string } };
      const msg = e?.error?.error?.message || e?.error?.message || 'No se pudo guardar la persona.';
      this.notificationService.addNotification('Error', msg);
    }
  }

  async togglePersonStatus(person: Person): Promise<void> {
    const nextStatus = (person.status ?? 'Activo') === 'Activo' ? 'Inactivo' : 'Activo';
    const message =
      nextStatus === 'Inactivo'
        ? `¿Desactivar a ${person.name}? No aparecerá en búsquedas por teléfono.`
        : `¿Activar a ${person.name}?`;
    if (!confirm(message)) return;

    try {
      await this.personService.setPersonStatus(person.id, nextStatus);
      this.notificationService.addNotification(
        nextStatus === 'Inactivo' ? 'Persona Desactivada' : 'Persona Activada',
        `${person.name} quedó en estado ${nextStatus}.`,
      );
    } catch (err: unknown) {
      const e = err as { error?: { error?: { message?: string }; message?: string } };
      const msg = e?.error?.error?.message || e?.error?.message || 'No se pudo cambiar el estado.';
      this.notificationService.addNotification('Error', msg);
    }
  }

  loadInitialData() {
    this.configService.getOperators();
    this.configService.getIncidentTypes();
    this.configService.getResponseProtocols();
    this.configService.getNotificationEmails();
    this.configService.getAuditLogs();
    this.configService.getRolePermissions();
    this.incidentService.getIncidents();
  }

  filteredAuditLogs = computed(() => {
    const selectedId = this.selectedIncidentIdForHistory();
    const logs = this.auditLogs();
    if (selectedId === 'all') return logs;
    return logs.filter((log) => log.incidentId === selectedId);
  });

  sortedAuditLogsForHistory = computed(() =>
    [...this.filteredAuditLogs()].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ),
  );

  selectedIncidentForHistory = computed(() => {
    const id = this.selectedIncidentIdForHistory();
    if (id === 'all') return null;
    return this.allIncidents().find((i) => i.id === id) || null;
  });

  filteredIncidentsForHistory = computed(() => {
    const term = this.incidentHistorySearchTerm().toLowerCase();
    if (!term) return this.allIncidents();
    return this.allIncidents().filter(
      (i) =>
        i.id.toLowerCase().includes(term) ||
        i.type.toLowerCase().includes(term) ||
        i.location.toLowerCase().includes(term),
    );
  });

  setTab(tab: AdminTab) {
    this.activeTab.set(tab);
    if (tab === 'incident_history') {
      this.refreshIncidentHistoryView().catch(() => void 0);
    }
  }

  onSearch(event: Event): void {
    this.userSearchTerm.set((event.target as HTMLInputElement).value);
    this.operatorsPage.set(1);
  }

  onAdminLogSearch(event: Event): void {
    this.adminLogSearch.set((event.target as HTMLInputElement).value);
    this.adminLogsPage.set(1);
  }

  onIncidentHistorySearch(event: Event): void {
    this.incidentHistorySearchTerm.set((event.target as HTMLInputElement).value);
    this.incidentHistoryPage.set(1);
  }

  onIncidentHistorySearchInput(event: Event): void {
    this.onIncidentHistorySearch(event);
    this.selectedIncidentIdForHistory.set('all');
    this.refreshIncidentHistoryView().catch(() => void 0);
  }

  onPermissionsRoleSelect(event: Event): void {
    this.selectedPermissionsRoleId.set((event.target as HTMLSelectElement).value);
  }

  permissionModuleHint(module: string): string {
    return PERMISSION_MODULE_HINTS[module] ?? '';
  }

  isLockedAction(perm: RolePermission['permissions'][number], action: string): boolean {
    return !!(perm.locks as Record<string, boolean> | undefined)?.[action];
  }

  enabledModulesCount(role: { permissions: { enabled: boolean }[] }): number {
    return role.permissions.filter((perm) => perm.enabled).length;
  }

  previousOperatorsPage(): void {
    this.operatorsPage.update((p) => Math.max(1, p - 1));
  }

  nextOperatorsPage(): void {
    this.operatorsPage.update((p) => Math.min(this.operatorsTotalPages(), p + 1));
  }

  previousIncidentTypesPage(): void {
    this.incidentTypesPage.update((p) => Math.max(1, p - 1));
  }

  nextIncidentTypesPage(): void {
    this.incidentTypesPage.update((p) => Math.min(this.incidentTypesTotalPages(), p + 1));
  }

  previousPeoplePage(): void {
    this.peoplePage.update((p) => Math.max(1, p - 1));
  }

  nextPeoplePage(): void {
    this.peoplePage.update((p) => Math.min(this.peopleTotalPages(), p + 1));
  }

  previousResponseProtocolsPage(): void {
    this.responseProtocolsPage.update((p) => Math.max(1, p - 1));
  }

  nextResponseProtocolsPage(): void {
    this.responseProtocolsPage.update((p) => Math.min(this.responseProtocolsTotalPages(), p + 1));
  }

  previousAdminLogsPage(): void {
    this.adminLogsPage.update((p) => Math.max(1, p - 1));
  }

  nextAdminLogsPage(): void {
    this.adminLogsPage.update((p) => Math.min(this.adminLogsTotalPages(), p + 1));
  }

  previousIncidentHistoryPage(): void {
    this.incidentHistoryPage.update((p) => Math.max(1, p - 1));
  }

  nextIncidentHistoryPage(): void {
    this.incidentHistoryPage.update((p) => Math.min(this.incidentHistoryTotalPages(), p + 1));
  }

  async refreshIncidentHistoryView(): Promise<void> {
    await this.configService.getAuditLogs();
    this.incidentService.getIncidents();
  }

  clearIncidentHistorySelection(): void {
    this.selectedIncidentIdForHistory.set('all');
    this.historySubTab.set('details');
  }

  historyAuthorName(raw: string | null | undefined, incident?: Incident | null): string {
    const value = String(raw ?? '').trim();
    if (value.includes(' ')) return value;

    const current = this.authService.currentUser();
    if (current?.name && current.id && current.id.toLowerCase() === value.toLowerCase()) {
      return current.name;
    }

    const operator = this.operators().find(
      (o) =>
        o.id.toLowerCase() === value.toLowerCase() ||
        (o.username && o.username.toLowerCase() === value.toLowerCase()),
    );
    if (operator?.name) return operator.name;

    const fallback = incident?.operator?.trim() || current?.name?.trim() || '';
    return resolveHistoryAuthor(raw, fallback);
  }

  historyUserInitials(name: string): string {
    return noteAuthorInitials(this.historyAuthorName(name));
  }

  incidentDescriptionEntries(incident: Incident): string[] {
    const entries = buildCommentHistoryView(incident.comments, incident.details);
    return entries
      .map((e) =>
        displayCommentBody(e.text, this.historyAuthorName(e.author, incident)),
      )
      .map((line) => line.trim())
      .filter((line) => line && !/^\[[^\]]+\]/.test(line));
  }

  incidentDescriptionText(incident: Incident): string {
    const lines = this.incidentDescriptionEntries(incident);
    return lines.length ? lines.join('\n\n') : '—';
  }

  formatHistoryTimestamp(raw: string): string {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  incidentOperatorName(incident: Incident): string {
    const direct = String(incident.operator ?? '').trim();
    if (direct.includes(' ')) return direct;
    return this.historyAuthorName(direct || null, incident);
  }

  incidentOperatorInitials(incident: Incident): string {
    return noteAuthorInitials(this.incidentOperatorName(incident));
  }

  formatGeoDisplayName(name: string | null | undefined): string {
    return String(name ?? '')
      .trim()
      .toLowerCase()
      .replace(/\b[\p{L}]/gu, (char) => char.toUpperCase());
  }

  incidentFullAddress(incident: Incident): string {
    return String(incident.location ?? '').trim() || '—';
  }

  incidentMunicipalityDisplay(incident: Incident): string {
    const municipality = this.formatGeoDisplayName(incident.municipalityName);
    const department = this.formatGeoDisplayName(incident.departmentName);
    if (municipality && department) return `${municipality}, ${department}`;
    return municipality || department || '—';
  }

  incidentCoordinatesDisplay(incident: Incident): string {
    const lat = incident.lat;
    const lng = incident.lng;
    if (lat == null || lng == null) return '—';
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return '—';
    return `${latN.toFixed(4)}, ${lngN.toFixed(4)}`;
  }

  incidentRiesgoEsquemaDisplay(gestion: IncidentHistoryGestion | null): string {
    if (!gestion) return '—';
    const riesgo = String(gestion.nivel_riesgo ?? '').trim();
    const esquema = String(gestion.tipo_esquema ?? '').trim();
    if (riesgo && esquema) return `${riesgo} · ${esquema}`;
    return riesgo || esquema || '—';
  }

  showIncidentGestionSection(incident: Incident): boolean {
    if (this.incidentHistoryMedidasLoading()) return true;
    if (this.incidentHistoryAssignedMedidas().length) return true;
    const gestion = this.incidentHistoryGestion();
    if (gestion) {
      const fields = [
        gestion.codigo_oficio,
        gestion.tramite_destino,
        gestion.resolucion_cerrem,
        gestion.nivel_riesgo,
        gestion.tipo_esquema,
      ];
      if (fields.some((v) => String(v ?? '').trim())) return true;
    }
    return /medidas asignadas|en gesti[oó]n|cerrem|oseg/i.test(String(incident.status ?? ''));
  }

  medidaQuantity(medida: IncidentHistoryMedida): number {
    const qty = Number(medida.cantidad ?? 1);
    return Number.isFinite(qty) && qty > 0 ? qty : 1;
  }

  isMedidasAsignadasStatus(incident: Incident): boolean {
    return /medidas asignadas/i.test(String(incident.status ?? ''));
  }

  personDisplayName(person: InvolvedPerson): string {
    const joined = joinPersonName(person);
    return joined || String(person.name ?? '').trim() || '—';
  }

  personPhone(person: InvolvedPerson): string {
    return String(person.phone || person.contact || '').trim();
  }

  personComments(person: InvolvedPerson): string {
    return String(person.comentarios || person.details || '').trim();
  }

  personDocumentLabel(person: InvolvedPerson): string {
    const label = String(person.documentTypeName || '').trim();
    if (label) return label;
    const code = String(person.documentType || '').trim().toUpperCase();
    const labels: Record<string, string> = {
      CC: 'Cédula de ciudadanía',
      CE: 'Cédula de extranjería',
      TI: 'Tarjeta de identidad',
      PA: 'Pasaporte',
      NIT: 'NIT',
    };
    return labels[code] || String(person.documentType || '').trim();
  }

  incidentDescriptionDisplay(incident: Incident): string {
    return this.incidentLatestCommentDisplay(incident);
  }

  incidentLatestCommentDisplay(incident: Incident): string {
    const entry = latestIncidentCommentEntry(
      incident.comments,
      incident.details,
      this.incidentOperatorName(incident),
    );
    if (!entry) return '—';
    const body = displayCommentBody(
      entry.text,
      this.historyAuthorName(entry.author, incident),
    ).trim();
    return body || '—';
  }

  incidentLatestCommentMeta(incident: Incident): string {
    const entry = latestIncidentCommentEntry(
      incident.comments,
      incident.details,
      this.incidentOperatorName(incident),
    );
    if (!entry) return '';
    const author = this.historyAuthorName(entry.author, incident);
    const when = entry.timestamp ? formatNoteForDisplay(entry) : '';
    if (author && when) return `${author} · ${when}`;
    return author || when;
  }

  vehicleMetaLine(vehicle: InvolvedVehicle): string {
    return [vehicle.role, vehicle.color].map((v) => String(v ?? '').trim()).filter(Boolean).join(' · ');
  }

  vehicleDetails(vehicle: InvolvedVehicle): string {
    return String(vehicle.details ?? '').trim();
  }

  priorityLabel(priority: string): string {
    return `Prioridad ${String(priority || '').toLowerCase()}`;
  }

  priorityShortLabel(priority: string): string {
    return String(priority || '—').trim() || '—';
  }

  statusBadgeClass(status: string): string {
    if (/medidas asignadas/i.test(String(status ?? ''))) return 'ih-badge-status-ok';
    if (/cerrado|cancelado/i.test(String(status ?? ''))) return 'ih-badge-status-muted';
    return 'ih-badge-status-default';
  }

  personMetaLine(person: InvolvedPerson): string {
    return [person.gender, person.role].map((v) => String(v ?? '').trim()).filter(Boolean).join(' · ');
  }

  isProtectionMedida(medida: IncidentHistoryMedida): boolean {
    return /protecci[oó]n|escolta|guardia/i.test(String(medida.nombre ?? ''));
  }

  auditActionKind(log: AuditLog): 'medidas' | 'status' | 'comment' | 'create' | 'gestion' | 'update' {
    const action = String(log.action || '');
    if (/creaci/i.test(action)) return 'create';
    if (/cambio de estado/i.test(action)) return 'status';
    if (/medidas de seguridad/i.test(action)) return 'medidas';
    if (/gesti[oó]n oseg|cerrem/i.test(action)) return 'gestion';
    if (/comentario/i.test(action) || log.details?.some((d) => /comentario/i.test(d.field))) {
      return 'comment';
    }
    return 'update';
  }

  auditActionLabel(log: AuditLog): string {
    const kind = this.auditActionKind(log);
    switch (kind) {
      case 'create':
        return 'Creación';
      case 'status':
        return 'Cambio de estado';
      case 'medidas':
        return 'Medidas de seguridad';
      case 'gestion':
        return 'Gestión OSEG/CERREM';
      case 'comment':
        return 'Comentario';
      default:
        return log.action || 'Actualización';
    }
  }

  auditChangeSummary(log: AuditLog): string {
    if (this.auditActionKind(log) === 'create') return 'Incidente creado';
    if (this.auditActionKind(log) === 'comment') {
      const detail = log.details?.find((d) => /comentario/i.test(d.field));
      if (detail?.new) {
        const text = String(detail.new).replace(/^[^:]+:\s*/i, '').trim();
        return `Comentario agregado: '${text}'`;
      }
    }
    if (!log.details?.length) return log.changes || '—';
    return '';
  }

  vehicleLabel(vehicle: InvolvedVehicle): string {
    const parts = [vehicle.make, vehicle.model, vehicle.color].filter(Boolean);
    return parts.length ? parts.join(' ') : vehicle.plate;
  }

  openAddForm(): void {
    this.isEditMode.set(false);
    this.selectedOperator.set(null);
    this.operatorForm.reset({ status: 'Activo' });
    this.operatorForm.controls.password.setValidators([Validators.required]);
    this.operatorForm.controls.password.updateValueAndValidity();
    this.operatorForm.controls.username.enable({ emitEvent: false });
    this.operatorForm.controls.agency.enable({ emitEvent: false });
    this.operatorForm.controls.role.disable({ emitEvent: false });
    this.agencyRoles.set([]);
    this.operatorPasswordError.set(null);
    this.operatorFormError.set(null);
    this.showOperatorForm.set(true);
  }

  openEditForm(operator: Operator): void {
    this.isEditMode.set(true);
    this.selectedOperator.set(operator);
    this.operatorForm.patchValue({
      primerNombre: operator.primerNombre,
      segundoNombre: operator.segundoNombre ?? '',
      primerApellido: operator.primerApellido,
      segundoApellido: operator.segundoApellido ?? '',
      username: operator.username ?? operator.id,
      email: operator.email,
      telefono: operator.telefono ?? '',
      agency: operator.agency,
      password: '',
      role: operator.role,
      status: operator.status,
    });
    this.operatorForm.controls.password.clearValidators();
    this.operatorForm.controls.password.updateValueAndValidity();
    this.operatorForm.controls.username.disable({ emitEvent: false });
    this.operatorForm.controls.agency.disable({ emitEvent: false });
    this.operatorForm.controls.role.enable({ emitEvent: false });
    if (operator.agency) {
      this.loadRolesForAgency(operator.agency);
    }
    this.operatorPasswordError.set(null);
    this.operatorFormError.set(null);
    this.showOperatorForm.set(true);
  }

  async saveOperator(): Promise<void> {
    const formValue = this.operatorForm.getRawValue() as OperatorFormPayload & {
      password?: string;
    };
    if (
      this.operatorForm.invalid ||
      !formValue.agency ||
      !formValue.role ||
      !formValue.primerNombre?.trim() ||
      !formValue.primerApellido?.trim()
    ) {
      this.operatorForm.markAllAsTouched();
      return;
    }
    this.operatorPasswordError.set(null);
    this.operatorFormError.set(null);
    if (!this.isEditMode()) {
      const passwordError = this.validateOperatorPassword(String(formValue.password || ''));
      if (passwordError) {
        this.operatorPasswordError.set(passwordError);
        this.operatorForm.controls.password.markAsTouched();
        return;
      }
    }
    const payload: OperatorFormPayload = {
      username: formValue.username,
      primerNombre: formValue.primerNombre.trim(),
      segundoNombre: formValue.segundoNombre?.trim() || '',
      primerApellido: formValue.primerApellido.trim(),
      segundoApellido: formValue.segundoApellido?.trim() || '',
      email: formValue.email,
      telefono: formValue.telefono?.trim() || '',
      agency: formValue.agency,
      role: formValue.role,
      status: formValue.status,
    };
    if (!this.isEditMode()) {
      payload.password = formValue.password;
    }
    try {
      if (this.isEditMode()) {
        const operatorId = this.selectedOperator()!.id;
        await this.configService.updateOperator(operatorId, payload);
      } else {
        await this.configService.addOperator(payload);
      }
      this.closeForm();
    } catch (err: unknown) {
      const e = err as { error?: { error?: { message?: string }; message?: string } };
      const msg = e?.error?.error?.message || e?.error?.message || 'No se pudo guardar el usuario.';
      if (/contraseña|password/i.test(msg)) {
        this.operatorPasswordError.set(msg);
        this.operatorFormError.set(null);
      } else {
        this.operatorFormError.set(msg);
        this.operatorPasswordError.set(null);
      }
      this.notificationService.addNotification('Error al crear usuario', msg);
    }
  }

  private validateOperatorPassword(password: string): string | null {
    const missing: string[] = [];
    if (!password) {
      return 'Ingrese una contraseña.';
    }
    if (password.length < 8) missing.push('mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) missing.push('una mayúscula (A-Z)');
    if (!/[a-z]/.test(password)) missing.push('una minúscula (a-z)');
    if (!/\d/.test(password)) missing.push('un número (0-9)');
    if (!/[^A-Za-z0-9]/.test(password)) missing.push('un símbolo (#, @, !, etc.)');
    if (/\s/.test(password)) missing.push('sin espacios');
    if (!missing.length) return null;
    return `La contraseña no es válida. Falta: ${missing.join(', ')}.`;
  }

  closeForm(): void {
    this.showOperatorForm.set(false);
    this.selectedOperator.set(null);
  }

  openAddIncidentTypeForm(): void {
    this.isEditModeIncidentType.set(false);
    this.selectedIncidentTypeId.set(null);
    this.incidentTypeForm.reset({ defaultPriority: 'Media' });
    this.showIncidentTypeForm.set(true);
  }

  openEditIncidentTypeForm(incidentType: IncidentType): void {
    this.isEditModeIncidentType.set(true);
    this.selectedIncidentTypeId.set(incidentType.id);
    this.incidentTypeForm.patchValue(incidentType);
    this.showIncidentTypeForm.set(true);
  }

  async saveIncidentType(): Promise<void> {
    if (this.incidentTypeForm.invalid) return;
    const formValue = this.incidentTypeForm.value;
    if (this.isEditModeIncidentType()) {
      const typeId = this.selectedIncidentTypeId()!;
      await this.configService.updateIncidentType(typeId, formValue as Partial<IncidentType>);
    } else {
      await this.configService.addIncidentType(formValue as Omit<IncidentType, 'id'>);
    }
    this.closeIncidentTypeForm();
  }

  closeIncidentTypeForm(): void {
    this.showIncidentTypeForm.set(false);
  }

  get steps() {
    return this.responseProtocolForm.get('steps') as FormArray;
  }
  addStep() {
    this.steps.push(this.fb.control('', Validators.required));
  }
  removeStep(index: number) {
    if (this.steps.length > 1) this.steps.removeAt(index);
  }

  openAddResponseProtocolForm(): void {
    this.isEditModeResponseProtocol.set(false);
    this.selectedResponseProtocolId.set(null);
    this.responseProtocolForm.reset({ incidentTypeName: '' });
    this.steps.clear();
    this.addStep();
    this.showResponseProtocolForm.set(true);
  }

  openEditResponseProtocolForm(protocol: ResponseProtocol): void {
    this.isEditModeResponseProtocol.set(true);
    this.selectedResponseProtocolId.set(protocol.id);
    this.responseProtocolForm.patchValue(protocol);
    this.steps.clear();
    protocol.steps.forEach((step) => this.steps.push(this.fb.control(step, Validators.required)));
    this.showResponseProtocolForm.set(true);
  }

  async saveResponseProtocol(): Promise<void> {
    if (this.responseProtocolForm.invalid) return;
    const formValue = this.responseProtocolForm.value;
    const protocolData = {
      name: formValue.name!,
      incidentTypeName: formValue.incidentTypeName!,
      steps: formValue.steps!,
    };
    if (this.isEditModeResponseProtocol()) {
      const protocolId = this.selectedResponseProtocolId()!;
      await this.configService.updateResponseProtocol(protocolId, protocolData);
    } else {
      await this.configService.addResponseProtocol(protocolData);
    }
    this.closeResponseProtocolForm();
  }

  closeResponseProtocolForm(): void {
    this.showResponseProtocolForm.set(false);
  }

  async createNotificationEmail(): Promise<void> {
    this.newEmailControl.markAsTouched();
    const raw = (this.newEmailControl.value || '').trim().toLowerCase();
    if (!raw) {
      this.notificationEmailFeedback.set({
        type: 'warn',
        message: 'Ingrese un correo electrónico.',
      });
      return;
    }
    if (this.newEmailControl.invalid) {
      this.notificationEmailFeedback.set({
        type: 'warn',
        message: 'Ingrese un correo electrónico válido.',
      });
      return;
    }
    const existing = this.notificationEmails().find((e) => e.email.toLowerCase() === raw);
    if (existing) {
      this.notificationEmailFeedback.set({
        type: 'warn',
        message:
          existing.status === 'Activo'
            ? 'Ese correo ya está activo en la lista.'
            : 'Este correo ya existe. Actívelo desde la columna Acciones.',
      });
      this.notificationEmailFilter.set(raw);
      this.notificationEmailPage.set(1);
      return;
    }
    try {
      await this.configService.addNotificationEmail(raw);
    } catch (err: unknown) {
      const e = err as { error?: { error?: { message?: string }; message?: string } };
      const msg = e?.error?.error?.message || e?.error?.message || 'No se pudo registrar el correo.';
      this.notificationEmailFeedback.set({ type: 'warn', message: msg });
      return;
    }
    this.newEmailControl.reset();
    this.notificationEmailFilter.set('');
    this.notificationEmailPage.set(1);
    this.notificationEmailFeedback.set({
      type: 'success',
      message: 'Correo agregado a la lista de distribución.',
    });
    this.notificationService.addNotification(
      'Correo registrado',
      `${raw} fue añadido a las notificaciones.`,
    );
  }

  searchNotificationEmails(): void {
    const raw = (this.newEmailControl.value || '').trim();
    if (!raw) {
      this.notificationEmailFilter.set('');
      this.notificationEmailPage.set(1);
      this.notificationEmailFeedback.set({
        type: 'info',
        message: 'Ingrese un correo o texto para buscar en la lista.',
      });
      return;
    }
    this.notificationEmailFilter.set(raw.toLowerCase());
    this.notificationEmailPage.set(1);
    const count = this.displayedNotificationEmails().length;
    this.notificationEmailFeedback.set(
      count === 0
        ? {
            type: 'warn',
            message: 'No hay correos que coincidan con la búsqueda.',
          }
        : {
            type: 'info',
            message: `${count} correo(s) encontrado(s).`,
          },
    );
  }

  clearNotificationEmailSearch(): void {
    this.notificationEmailFilter.set('');
    this.notificationEmailPage.set(1);
    this.notificationEmailFeedback.set(null);
  }

  goToNotificationEmailPage(page: number): void {
    const pages = this.notificationEmailTotalPages();
    if (pages < 1) return;
    this.notificationEmailPage.set(Math.min(Math.max(1, page), pages));
  }

  previousNotificationEmailPage(): void {
    this.goToNotificationEmailPage(this.notificationEmailPage() - 1);
  }

  nextNotificationEmailPage(): void {
    this.goToNotificationEmailPage(this.notificationEmailPage() + 1);
  }

  async toggleNotificationEmailStatus(entry: NotificationEmailEntry): Promise<void> {
    const nextStatus = entry.status === 'Activo' ? 'Inactivo' : 'Activo';
    const message =
      nextStatus === 'Inactivo'
        ? `¿Desactivar ${entry.email}? No recibirá nuevos envíos, pero el historial se conserva.`
        : `¿Activar ${entry.email}?`;
    if (!confirm(message)) return;

    try {
      await this.configService.setNotificationEmailStatus(entry.email, nextStatus);
      this.notificationService.addNotification(
        nextStatus === 'Inactivo' ? 'Correo desactivado' : 'Correo activado',
        `${entry.email} quedó en estado ${nextStatus}.`,
      );
    } catch (err: unknown) {
      const e = err as { error?: { error?: { message?: string }; message?: string } };
      const msg = e?.error?.error?.message || e?.error?.message || 'No se pudo cambiar el estado.';
      this.notificationService.addNotification('Error', msg);
    }
  }

  showRoleForm = signal(false);
  newRoleName = signal('');

  async addRole(): Promise<void> {
    const name = this.newRoleName();
    if (name) {
      await this.configService.addRolePermission(name);
      this.newRoleName.set('');
      this.showRoleForm.set(false);
      this.notificationService.addNotification('Rol Creado', `Se ha creado el nuevo rol: ${name}`);
    }
  }

  togglePermission(
    roleId: string,
    moduleIndex: number,
    action: 'view' | 'create' | 'edit' | 'notify' | 'export' | 'enabled',
  ): void {
    const draft = this.permissionsDraft();
    const perm = draft[moduleIndex];
    if (!perm) return;

    if (action === 'enabled' && perm.locks?.enabled) return;
    if (action !== 'enabled' && this.isLockedAction(perm, action)) return;

    this.permissionsDraft.update((current) => {
      const updated = current.map((p, i) => {
        if (i !== moduleIndex) return p;
        if (action === 'enabled') {
          return { ...p, enabled: !p.enabled, actions: { ...p.actions }, locks: p.locks };
        }
        return {
          ...p,
          locks: p.locks,
          actions: {
            ...p.actions,
            [action]: !p.actions[action as keyof typeof p.actions],
          },
        };
      });
      return updated;
    });
    this.cdr.markForCheck();
  }

  async savePermissions(): Promise<void> {
    const role = this.activeRolePermission();
    if (!role || this.isSavingPermissions()) return;
    this.isSavingPermissions.set(true);
    this._skipDraftSync = true;
    try {
      await this.configService.updateRolePermission(role.id, {
        permissions: this.permissionsDraft(),
      });
      const updated = this.configService.rolePermissions().find((r) => r.id === role.id);
      if (updated) {
        const copy = updated.permissions.map((p) => ({
          ...p,
          actions: { ...p.actions },
          locks: p.locks ? { ...p.locks } : undefined,
        }));
        this.permissionsDraft.set(copy);
        this.permissionsSnapshot.set(JSON.stringify(copy));
      }
      await this.authService.bootstrapSessionPermissions();
      this.notificationService.addNotification('Permisos guardados', `Rol «${role.role}» actualizado.`);
    } catch (err: unknown) {
      const e = err as { error?: { error?: { message?: string }; message?: string } };
      const msg = e?.error?.error?.message || e?.error?.message || 'No se pudieron guardar los permisos.';
      this.notificationService.addNotification('Error', msg);
    } finally {
      this._skipDraftSync = false;
      this.isSavingPermissions.set(false);
      this.cdr.markForCheck();
    }
  }

  async discardPermissions(): Promise<void> {
    const role = this.activeRolePermission();
    if (!role) return;
    await this.configService.getRolePermissions();
    const fresh = this.configService.rolePermissions().find((r) => r.id === role.id);
    const source = fresh ?? role;
    const copy = source.permissions.map((p) => ({
      ...p,
      actions: { ...p.actions },
      locks: p.locks ? { ...p.locks } : undefined,
    }));
    this.permissionsDraft.set(copy);
    this.permissionsSnapshot.set(JSON.stringify(copy));
    this.cdr.markForCheck();
  }
}
