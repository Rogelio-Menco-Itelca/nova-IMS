import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  computed,
  OnInit,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
} from '../../models/admin.model';
import { ConfigurationService, NotificationEmailEntry } from '../../services/configuration.service';
import { IncidentService } from '../../services/incident.service';
import { PersonService } from '../../services/person.service';
import { AuthService } from '../../services/auth.service';
import { Agency, RoleOption } from '../../models/user.model';
import { AdminPaginationComponent } from './admin-pagination.component';

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

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminPaginationComponent],
  templateUrl: './admin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export class AdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  configService = inject(ConfigurationService);
  incidentService = inject(IncidentService);
  personService = inject(PersonService);
  private authService = inject(AuthService);

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
  allIncidents = this.incidentService.incidents;
  selectedIncidentIdForHistory = signal<string>('all');
  incidentHistorySearchTerm = signal('');
  historySubTab = signal<'details' | 'history'>('details');

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
  permissionsPage = signal(1);
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

  permissionsTotalPages = computed(() => adminTotalPages(this.rolePermissions().length));

  paginatedRolePermissions = computed(() =>
    adminSlicePage(this.rolePermissions(), this.permissionsPage()),
  );

  constructor() {
    effect(() => {
      this.displayedNotificationEmails();
      const pages = this.notificationEmailTotalPages();
      if (pages > 0 && this.notificationEmailPage() > pages) {
        this.notificationEmailPage.set(pages);
      }
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
    } catch (err: any) {
      const msg =
        err?.error?.error?.message || err?.error?.message || 'No se pudo guardar la persona.';
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
    } catch (err: any) {
      const msg =
        err?.error?.error?.message || err?.error?.message || 'No se pudo cambiar el estado.';
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
      this.refreshIncidentHistoryView().catch(() => {});
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
    this.refreshIncidentHistoryView().catch(() => {});
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

  previousPermissionsPage(): void {
    this.permissionsPage.update((p) => Math.max(1, p - 1));
  }

  nextPermissionsPage(): void {
    this.permissionsPage.update((p) => Math.min(this.permissionsTotalPages(), p + 1));
  }

  async refreshIncidentHistoryView(): Promise<void> {
    await this.configService.getAuditLogs();
    this.incidentService.getIncidents();
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
    } catch (err: any) {
      const msg =
        err?.error?.error?.message || err?.error?.message || 'No se pudo guardar el usuario.';
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
    } catch (err: any) {
      const msg =
        err?.error?.error?.message ||
        err?.error?.message ||
        'No se pudo registrar el correo.';
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
    } catch (err: any) {
      const msg =
        err?.error?.error?.message || err?.error?.message || 'No se pudo cambiar el estado.';
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

  async deleteRole(id: string): Promise<void> {
    await this.configService.deleteRolePermission(id);
    this.notificationService.addNotification(
      'Rol Eliminado',
      'Se ha eliminado el rol correctamente',
    );
  }

  async togglePermission(
    roleId: string,
    moduleIndex: number,
    action: 'view' | 'create' | 'edit' | 'delete' | 'enabled',
  ): Promise<void> {
    const role = this.rolePermissions().find((r) => r.id === roleId);
    if (!role) return;

    const updatedPermissions = [...role.permissions];
    const modulePerm = { ...updatedPermissions[moduleIndex] };

    if (action === 'enabled') {
      modulePerm.enabled = !modulePerm.enabled;
    } else {
      modulePerm.actions = { ...modulePerm.actions, [action]: !modulePerm.actions[action] };
    }

    updatedPermissions[moduleIndex] = modulePerm;
    await this.configService.updateRolePermission(roleId, { permissions: updatedPermissions });
    this.notificationService.addNotification(
      'Permisos Actualizados',
      `Se han actualizado los permisos para el rol ${role.role}`,
    );
  }
}
