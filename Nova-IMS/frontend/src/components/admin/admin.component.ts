import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  computed,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  effect,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import {
  IncidentPriority,
  IncidentStatus,
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

const ADMIN_PAGE_SIZE_DEFAULT = 15;
const ADMIN_PAGE_SIZE_MIN = 3;
const ADMIN_PAGE_SIZE_MAX = 30;

const ADAPTIVE_PAGE_TABS: ReadonlySet<AdminTab> = new Set([
  'users',
  'incidents',
  'responses',
  'notifications',
  'incident_history',
  'people',
]);

const PERMISSION_MODULE_HINTS: Record<string, string> = {
  Dashboard: 'Vista general y métricas del sistema',
  Incidentes: 'Registro y seguimiento de incidentes',
  Reportes: 'Informes y exportaciones',
  Administración: 'Usuarios, catálogos y configuración',
};

function adminTotalPages(count: number, pageSize: number): number {
  return count > 0 ? Math.max(1, Math.ceil(count / pageSize)) : 1;
}

function adminSlicePage<T>(items: T[], page: number, pageSize: number): T[] {
  if (!items.length) return items;
  const totalPages = adminTotalPages(items.length, pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
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
export class AdminComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
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
  personStatusConfirm = signal<{ person: Person; nextStatus: 'Activo' | 'Inactivo' } | null>(null);
  emailStatusConfirm = signal<{ entry: NotificationEmailEntry; nextStatus: 'Activo' | 'Inactivo' } | null>(null);
  operatorStatusConfirm = signal<{ operator: Operator; nextStatus: 'Activo' | 'Inactivo' } | null>(null);
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

  usersAuditSummary = this.configService.usersAuditSummary;
  selectedUserActions = this.configService.selectedUserActions;
  selectedUserId = this.configService.selectedUserId;
  loadingUserActions = this.configService.loadingUserActions;
  userAuditSearch = signal('');
  userActionSearch = signal('');

  filteredUsersAuditSummary = computed(() => {
    const term = this.userAuditSearch().toLowerCase();
    const list = this.usersAuditSummary();
    if (!term) return list;
    return list.filter(
      (u) =>
        u.userName.toLowerCase().includes(term) ||
        u.userId.toLowerCase().includes(term) ||
        u.roleName.toLowerCase().includes(term),
    );
  });

  selectedUserSummary = computed(() => {
    const id = this.selectedUserId();
    if (!id) return null;
    return this.usersAuditSummary().find((u) => u.userId === id) ?? null;
  });

  filteredSelectedUserActions = computed(() => {
    const term = this.userActionSearch().toLowerCase();
    const list = this.selectedUserActions();
    if (!term) return list;
    return list.filter(
      (a) =>
        a.action.toLowerCase().includes(term) ||
        (a.details || '').toLowerCase().includes(term),
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
  responseProtocolSearch = signal('');
  adminLogsPage = signal(1);
  incidentHistoryPage = signal(1);
  /** Filas visibles según alto de pantalla; el resto pasa a la siguiente página. */
  adminListPageSize = signal(ADMIN_PAGE_SIZE_DEFAULT);
  private adminListResizeObserver: ResizeObserver | null = null;
  private onDestroyAdminListResize: (() => void) | null = null;

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

  displayedNotificationEmails = computed(() => {
    const term = this.notificationEmailFilter().trim().toLowerCase();
    const all = this.notificationEmails();
    if (!term) return all;
    return all.filter((entry) => entry.email.toLowerCase().includes(term));
  });

  notificationEmailTotalPages = computed(() =>
    adminTotalPages(this.displayedNotificationEmails().length, this.adminListPageSize()),
  );

  paginatedNotificationEmails = computed(() =>
    adminSlicePage(
      this.displayedNotificationEmails(),
      this.notificationEmailPage(),
      this.adminListPageSize(),
    ),
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

  operatorsTotalPages = computed(() =>
    adminTotalPages(this.searchedOperators().length, this.adminListPageSize()),
  );

  paginatedOperators = computed(() =>
    adminSlicePage(this.searchedOperators(), this.operatorsPage(), this.adminListPageSize()),
  );

  incidentTypesTotalPages = computed(() =>
    adminTotalPages(this.incidentTypes().length, this.adminListPageSize()),
  );

  paginatedIncidentTypes = computed(() =>
    adminSlicePage(this.incidentTypes(), this.incidentTypesPage(), this.adminListPageSize()),
  );

  peopleTotalPages = computed(() =>
    adminTotalPages(this.people().length, this.adminListPageSize()),
  );

  paginatedPeople = computed(() =>
    adminSlicePage(this.people(), this.peoplePage(), this.adminListPageSize()),
  );

  filteredResponseProtocols = computed(() => {
    const term = this.responseProtocolSearch().trim().toLowerCase();
    const list = this.responseProtocols();
    if (!term) return list;
    return list.filter(
      (protocol) =>
        protocol.name.toLowerCase().includes(term) ||
        protocol.incidentTypeName.toLowerCase().includes(term) ||
        protocol.steps.some((step) => step.toLowerCase().includes(term)),
    );
  });

  responseProtocolsTotalPages = computed(() =>
    adminTotalPages(this.filteredResponseProtocols().length, this.adminListPageSize()),
  );

  paginatedResponseProtocols = computed(() =>
    adminSlicePage(
      this.filteredResponseProtocols(),
      this.responseProtocolsPage(),
      this.adminListPageSize(),
    ),
  );

  adminLogsTotalPages = computed(() =>
    adminTotalPages(this.filteredAdminLogs().length, this.adminListPageSize()),
  );

  paginatedAdminLogs = computed(() =>
    adminSlicePage(this.filteredAdminLogs(), this.adminLogsPage(), this.adminListPageSize()),
  );

  incidentHistoryTotalPages = computed(() =>
    adminTotalPages(this.filteredIncidentsForHistory().length, this.adminListPageSize()),
  );

  paginatedIncidentsForHistory = computed(() =>
    adminSlicePage(
      this.filteredIncidentsForHistory(),
      this.incidentHistoryPage(),
      this.adminListPageSize(),
    ),
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

    effect(() => {
      this.adminListPageSize();
      this.clampActiveListPage();
    });

    effect(() => {
      const tab = this.activeTab();
      const detailOpen =
        tab === 'incident_history' && !!this.selectedIncidentForHistory();
      // Recalcular cuando cambia la pestaña o llegan/cambian datos de la lista.
      this.searchedOperators().length;
      this.incidentTypes().length;
      this.filteredResponseProtocols().length;
      this.displayedNotificationEmails().length;
      this.filteredIncidentsForHistory().length;
      this.people().length;
      if (!ADAPTIVE_PAGE_TABS.has(tab) || detailOpen) return;
      queueMicrotask(() => this.connectAdminListPanelObserver());
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

  ngAfterViewInit(): void {
    const recalc = () => this.recalcAdminListPageSize();
    this.adminListResizeObserver = new ResizeObserver(() => recalc());
    window.addEventListener('resize', recalc);
    this.onDestroyAdminListResize = () => window.removeEventListener('resize', recalc);
    this.connectAdminListPanelObserver();
  }

  ngOnDestroy(): void {
    this.adminListResizeObserver?.disconnect();
    this.adminListResizeObserver = null;
    this.onDestroyAdminListResize?.();
    this.onDestroyAdminListResize = null;
  }

  private isAdaptiveListVisible(): boolean {
    const tab = this.activeTab();
    if (!ADAPTIVE_PAGE_TABS.has(tab)) return false;
    if (tab === 'incident_history' && this.selectedIncidentForHistory()) return false;
    return true;
  }

  private getActiveListPanel(): HTMLElement | null {
    return this.host.nativeElement.querySelector('.admin-list-panel');
  }

  private connectAdminListPanelObserver(): void {
    if (!this.isAdaptiveListVisible()) return;

    queueMicrotask(() => {
      const panel = this.getActiveListPanel();
      if (panel && this.adminListResizeObserver) {
        this.adminListResizeObserver.disconnect();
        this.adminListResizeObserver.observe(panel);
      }
      requestAnimationFrame(() => requestAnimationFrame(() => this.recalcAdminListPageSize()));
    });
  }

  private recalcAdminListPageSize(): void {
    if (!this.isAdaptiveListVisible()) return;

    const size = this.measureAdminListPageSize();
    if (size === null || size === this.adminListPageSize()) return;

    this.adminListPageSize.set(size);
    this.clampActiveListPage();
    this.cdr.markForCheck();

    queueMicrotask(() => {
      requestAnimationFrame(() => {
        const refined = this.measureAdminListPageSize();
        if (refined !== null && refined < this.adminListPageSize()) {
          this.adminListPageSize.set(refined);
          this.clampActiveListPage();
          this.cdr.markForCheck();
        }
      });
    });
  }

  private measureAdminListPageSize(): number | null {
    const panel = this.getActiveListPanel();
    if (!panel) return null;

    const tableWrap = panel.querySelector('.admin-list-table-wrap') as HTMLElement | null;
    if (!tableWrap) return null;

    const thead = tableWrap.querySelector('thead') as HTMLElement | null;
    const theadH = thead?.getBoundingClientRect().height || 40;
    const pagination = panel.querySelector('app-admin-pagination') as HTMLElement | null;
    const paginationH = pagination?.getBoundingClientRect().height || 36;

    const panelStyle = getComputedStyle(panel);
    const gap = Number.parseFloat(panelStyle.rowGap || panelStyle.gap || '0') || 0;
    let chromeH = 0;
    let chromeBlocks = 0;
    for (const child of Array.from(panel.children)) {
      if (child === tableWrap || child.contains(tableWrap)) {
        // Contenedor anidado (ej. correos): restar paginación interna ya contemplada.
        if (child !== tableWrap) {
          for (const nested of Array.from(child.children)) {
            if (nested === tableWrap || nested.tagName === 'APP-ADMIN-PAGINATION') continue;
            chromeH += (nested as HTMLElement).getBoundingClientRect().height;
            chromeBlocks += 1;
          }
        }
        continue;
      }
      if (child.tagName === 'APP-ADMIN-PAGINATION') continue;
      chromeH += (child as HTMLElement).getBoundingClientRect().height;
      chromeBlocks += 1;
    }

    // Preferir alto del panel (acotado por flex); si aún no hay layout, usar el wrap.
    const panelH = panel.clientHeight || panel.getBoundingClientRect().height;
    const wrapH = tableWrap.clientHeight || tableWrap.getBoundingClientRect().height;
    const availablePanel = panelH - chromeH - paginationH - gap * Math.max(chromeBlocks, 1);
    const listArea = Math.max(wrapH > 0 ? wrapH - theadH : 0, availablePanel - theadH);
    if (listArea < 36) return null;

    const rows = Array.from(tableWrap.querySelectorAll('tbody tr')).filter(
      (row) => !row.querySelector('td[colspan]'),
    );
    let rowH = this.activeTab() === 'responses' ? 72 : 52;
    if (rows.length) {
      let measured = 0;
      for (let i = 0; i < Math.min(rows.length, 3); i++) {
        measured = Math.max(measured, rows[i].getBoundingClientRect().height);
      }
      if (measured > 24) rowH = measured;
    }

    const count = Math.floor((listArea - 2) / rowH);
    if (count < 1) return ADMIN_PAGE_SIZE_MIN;
    return Math.min(ADMIN_PAGE_SIZE_MAX, Math.max(ADMIN_PAGE_SIZE_MIN, count));
  }

  private clampActiveListPage(): void {
    const size = this.adminListPageSize();
    const clamp = (page: number, count: number, setPage: (n: number) => void) => {
      const pages = adminTotalPages(count, size);
      if (page > pages) setPage(pages);
    };

    switch (this.activeTab()) {
      case 'users':
        clamp(this.operatorsPage(), this.searchedOperators().length, (n) =>
          this.operatorsPage.set(n),
        );
        break;
      case 'incidents':
        clamp(this.incidentTypesPage(), this.incidentTypes().length, (n) =>
          this.incidentTypesPage.set(n),
        );
        break;
      case 'responses':
        clamp(this.responseProtocolsPage(), this.filteredResponseProtocols().length, (n) =>
          this.responseProtocolsPage.set(n),
        );
        break;
      case 'notifications':
        clamp(this.notificationEmailPage(), this.displayedNotificationEmails().length, (n) =>
          this.notificationEmailPage.set(n),
        );
        break;
      case 'incident_history':
        clamp(this.incidentHistoryPage(), this.filteredIncidentsForHistory().length, (n) =>
          this.incidentHistoryPage.set(n),
        );
        break;
      case 'people':
        clamp(this.peoplePage(), this.people().length, (n) => this.peoplePage.set(n));
        break;
      default:
        break;
    }
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
    this.personStatusConfirm.set({ person, nextStatus });
  }

  async confirmPersonStatusChange(): Promise<void> {
    const data = this.personStatusConfirm();
    if (!data) return;
    this.personStatusConfirm.set(null);
    try {
      await this.personService.setPersonStatus(data.person.id, data.nextStatus);
      this.notificationService.addNotification(
        data.nextStatus === 'Inactivo' ? 'Persona Desactivada' : 'Persona Activada',
        `${data.person.name} quedó en estado ${data.nextStatus}.`,
      );
    } catch (err: unknown) {
      const e = err as { error?: { error?: { message?: string }; message?: string } };
      const msg = e?.error?.error?.message || e?.error?.message || 'No se pudo cambiar el estado.';
      this.notificationService.addNotification('Error', msg);
    }
  }

  toggleOperatorStatus(operator: Operator): void {
    const nextStatus = operator.status === 'Activo' ? 'Inactivo' : 'Activo';
    this.operatorStatusConfirm.set({ operator, nextStatus });
  }

  async confirmOperatorStatusChange(): Promise<void> {
    const data = this.operatorStatusConfirm();
    if (!data) return;
    this.operatorStatusConfirm.set(null);
    try {
      await this.configService.setOperatorStatus(data.operator.id, data.nextStatus);
      this.notificationService.addNotification(
        data.nextStatus === 'Inactivo' ? 'Usuario Desactivado' : 'Usuario Activado',
        `${data.operator.name} quedó en estado ${data.nextStatus}.`,
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
    if (tab === 'admin_logs') {
      this.configService.getUsersAuditSummary().catch(() => void 0);
    }
  }

  onSearch(event: Event): void {
    this.userSearchTerm.set((event.target as HTMLInputElement).value);
    this.operatorsPage.set(1);
  }

  onResponseProtocolSearch(event: Event): void {
    this.responseProtocolSearch.set((event.target as HTMLInputElement).value);
    this.responseProtocolsPage.set(1);
  }

  onAdminLogSearch(event: Event): void {
    this.adminLogSearch.set((event.target as HTMLInputElement).value);
    this.adminLogsPage.set(1);
  }

  onUserAuditSearch(event: Event): void {
    this.userAuditSearch.set((event.target as HTMLInputElement).value);
  }

  onUserActionSearch(event: Event): void {
    this.userActionSearch.set((event.target as HTMLInputElement).value);
  }

  selectUserForAudit(userId: string): void {
    this.userActionSearch.set('');
    this.configService.selectUserForAudit(userId).catch(() => void 0);
  }

  clearSelectedUserAudit(): void {
    this.configService.selectedUserId.set(null);
    this.configService.selectedUserActions.set([]);
  }

  userActionSourceLabel(source: string): string {
    switch (source) {
      // Categorías nuevas (auditoría unificada)
      case 'sesion':
        return 'Sesión';
      case 'seguridad':
        return 'Seguridad';
      case 'incidente':
        return 'Incidente';
      case 'administracion':
        return 'Administración';
      case 'configuracion':
        return 'Configuración';
      case 'comunicacion':
        return 'Comunicación';
      case 'consulta':
        return 'Consulta';
      // Compatibilidad con datos antiguos
      case 'admin':
        return 'Administración';
      case 'incident':
        return 'Incidente';
      case 'login':
        return 'Sesión';
      case '2fa':
        return 'Verificación 2FA';
      default:
        return source;
    }
  }

  userActionSourceClasses(source: string): string {
    switch (source) {
      case 'sesion':
      case 'login':
        return 'border border-amber-500/30 bg-amber-500/10 text-amber-400';
      case 'seguridad':
      case '2fa':
        return 'border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400';
      case 'incidente':
      case 'incident':
        return 'border border-sky-500/30 bg-sky-500/10 text-sky-400';
      case 'configuracion':
        return 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      case 'comunicacion':
        return 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-400';
      case 'consulta':
        return 'border border-slate-500/30 bg-slate-500/10 text-slate-400';
      default:
        return 'border border-indigo-500/30 bg-indigo-500/10 text-indigo-400';
    }
  }

  userActionModuleClasses(module: string | null | undefined): string {
    switch (module) {
      case 'Autenticación':
        return 'border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300';
      case 'Incidentes':
        return 'border border-sky-500/30 bg-sky-500/10 text-sky-300';
      case 'Administración':
        return 'border border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
      case 'Reportes':
        return 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
      case 'Dashboard':
        return 'border border-amber-500/30 bg-amber-500/10 text-amber-300';
      default:
        return 'border border-gray-600/40 bg-gray-600/10 text-gray-400';
    }
  }

  userActionOutcomeClasses(outcome: string | null | undefined): string {
    switch (outcome) {
      case 'exitoso':
        return 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      case 'fallido':
        return 'border border-red-500/30 bg-red-500/10 text-red-400';
      case 'pendiente':
        return 'border border-amber-500/30 bg-amber-500/10 text-amber-400';
      default:
        return '';
    }
  }

  userActionOutcomeLabel(outcome: string | null | undefined): string {
    switch (outcome) {
      case 'exitoso':
        return 'Exitoso';
      case 'fallido':
        return 'Fallido';
      case 'pendiente':
        return 'Pendiente';
      default:
        return '';
    }
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

  isViewIncidentNA(module: string): boolean {
    return module === 'Reportes' || module === 'Administración';
  }

  isLockedAction(perm: RolePermission['permissions'][number], action: string): boolean {
    if (action === 'viewIncident' && this.isViewIncidentNA(perm.module)) {
      return true;
    }
    return !!(perm.locks as Record<string, boolean> | undefined)?.[action];
  }

  viewIncidentLockTitle(perm: RolePermission['permissions'][number]): string {
    return this.isViewIncidentNA(perm.module)
      ? 'No aplica para este módulo'
      : 'Permiso obligatorio del rol protegido';
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

  openIncidentHistoryDetail(incidentId: string): void {
    this.selectedIncidentIdForHistory.set(incidentId);
    this.historySubTab.set('details');
    void this.refreshIncidentHistoryView();
  }

  incidentHistoryDateLabel(timestamp: string): string {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return timestamp;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  incidentHistoryTimeLabel(timestamp: string): string {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  incidentHistoryRecordLabel(timestamp: string): string {
    const date = this.incidentHistoryDateLabel(timestamp);
    const time = this.incidentHistoryTimeLabel(timestamp);
    return time ? `${date} ${time}` : date;
  }

  incidentHistoryStatusBadgeClass(status: IncidentStatus | string): string {
    const base =
      'text-xs font-medium px-2.5 py-1 rounded-full border ';
    const value = String(status ?? '');
    if (/cerrado|cancelado/i.test(value)) {
      return base + 'bg-red-900/40 text-red-300 border-red-500/30';
    }
    if (/resuelto|medidas asignadas/i.test(value)) {
      return base + 'bg-green-900/50 text-green-300 border-green-500/30';
    }
    if (/reiteraciones/i.test(value)) {
      return base + 'bg-amber-900/40 text-amber-200 border-amber-500/30';
    }
    if (/nuevo/i.test(value)) {
      return base + 'bg-sky-900/40 text-sky-200 border-sky-500/30';
    }
    if (/gesti[oó]n|cerrem|evaluaci[oó]n|asignado|camino|proceso|enviado/i.test(value)) {
      return base + 'bg-indigo-900/40 text-indigo-300 border-indigo-500/30';
    }
    return base + 'bg-green-900/50 text-green-300 border-green-500/30';
  }

  incidentHistoryPriorityBadgeClass(priority: string): string {
    const base = 'text-xs font-medium px-2.5 py-1 rounded-full border ';
    switch (priority) {
      case 'Crítica':
        return base + 'bg-red-900/50 text-red-300 border-red-500/30';
      case 'Alta':
        return base + 'bg-orange-900/40 text-orange-300 border-orange-500/30';
      case 'Media':
        return base + 'bg-amber-900/40 text-amber-200 border-amber-500/30';
      case 'Baja':
        return base + 'bg-slate-700/60 text-slate-300 border-slate-500/30';
      default:
        return base + 'bg-slate-700/60 text-slate-300 border-slate-500/30';
    }
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
    if (current?.id?.toLowerCase() === value.toLowerCase() && current?.name) {
      return current.name;
    }

    const operator = this.operators().find(
      (o) =>
        o.id.toLowerCase() === value.toLowerCase() ||
        o.username?.toLowerCase() === value.toLowerCase(),
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
      .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
  }

  incidentFullAddress(incident: Incident): string {
    return String(incident.location ?? '').trim() || '—';
  }

  incidentDepartmentDisplay(incident: Incident): string {
    return this.formatGeoDisplayName(incident.departmentName) || '—';
  }

  incidentMunicipalityDisplay(incident: Incident): string {
    return this.formatGeoDisplayName(incident.municipalityName) || '—';
  }

  formatGestionDate(raw: string | null | undefined): string {
    const value = String(raw ?? '').trim();
    if (!value) return '—';
    const d = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
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

  isExtraordinarioRiesgo(nivel: string | null | undefined): boolean {
    return /extraordinario/i.test(String(nivel ?? ''));
  }

  private hasIncidentGestionData(gestion: IncidentHistoryGestion | null): boolean {
    if (!gestion) return false;
    return [
      gestion.codigo_oficio,
      gestion.tramite_destino,
      gestion.resolucion_cerrem,
      gestion.nivel_riesgo,
      gestion.tipo_esquema,
      gestion.fecha_cerrem,
      gestion.fecha_resolucion,
      gestion.observaciones,
      gestion.compartido_con,
    ].some((v) => String(v ?? '').trim());
  }

  showIncidentGestionSection(incident: Incident): boolean {
    if (this.incidentHistoryMedidasLoading()) return true;
    if (this.incidentHistoryAssignedMedidas().length) return true;
    if (this.hasIncidentGestionData(this.incidentHistoryGestion())) return true;
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
    this.emailStatusConfirm.set({ entry, nextStatus });
  }

  async confirmEmailStatusChange(): Promise<void> {
    const data = this.emailStatusConfirm();
    if (!data) return;
    this.emailStatusConfirm.set(null);
    try {
      await this.configService.setNotificationEmailStatus(data.entry.email, data.nextStatus);
      this.notificationService.addNotification(
        data.nextStatus === 'Inactivo' ? 'Correo desactivado' : 'Correo activado',
        `${data.entry.email} quedó en estado ${data.nextStatus}.`,
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
    action: 'view' | 'viewIncident' | 'create' | 'edit' | 'notify' | 'export' | 'enabled',
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
        const nextAction = action as 'view' | 'create' | 'edit' | 'delete' | 'notify';
        return {
          ...p,
          locks: p.locks,
          actions: {
            ...p.actions,
            [nextAction]: !p.actions[nextAction],
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
