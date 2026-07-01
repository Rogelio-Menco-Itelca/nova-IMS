import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IncidentType,
  ResponseProtocol,
  Operator,
  OperatorFormPayload,
  AuditLog,
  RolePermission,
  AdminActionLog,
  UserAuditSummary,
  UserAuditAction,
} from '../models/admin.model';
import { SocketService } from './socket.service';

export interface NotificationEmailEntry {
  email: string;
  status: 'Activo' | 'Inactivo';
}

@Injectable({ providedIn: 'root' })
export class ConfigurationService {
  private readonly http = inject(HttpClient);
  private readonly socketService = inject(SocketService);

  // ---------- Señales públicas ----------
  adminLogs = signal<AdminActionLog[]>([]);
  operators = signal<Operator[]>([]);
  incidentTypes = signal<IncidentType[]>([]);
  responseProtocols = signal<ResponseProtocol[]>([]);
  notificationEmails = signal<NotificationEmailEntry[]>([]);
  auditLogs = signal<AuditLog[]>([]);
  rolePermissions = signal<RolePermission[]>([]);
  usersAuditSummary = signal<UserAuditSummary[]>([]);
  selectedUserActions = signal<UserAuditAction[]>([]);
  selectedUserId = signal<string | null>(null);
  loadingUserActions = signal(false);

  constructor() {
    // Eventos de tiempo real
    this.socketService.on('admin:log', (log: AdminActionLog) => {
      this.adminLogs.update((logs) => [log, ...logs]);
    });
  }

  // ---------- Admin logs ----------
  getAdminLogs(): void {
    this.http.get<AdminActionLog[]>('/api/admin-logs').subscribe((logs) => {
      this.adminLogs.set(logs);
    });
  }

  // ---------- Operadores ----------
  async getOperators(): Promise<void> {
    const ops = await firstValueFrom(this.http.get<Operator[]>('/api/operators'));
    this.operators.set(ops);
  }

  async addOperator(operatorData: OperatorFormPayload): Promise<void> {
    const created = await firstValueFrom(this.http.post<Operator>('/api/operators', operatorData));
    this.operators.update((ops) => [created, ...ops]);
  }

  async updateOperator(operatorId: string, updates: OperatorFormPayload): Promise<void> {
    const updated = await firstValueFrom(
      this.http.put<Operator>(`/api/operators/${operatorId}`, updates),
    );
    this.operators.update((ops) => ops.map((o) => (o.id === operatorId ? updated : o)));
  }

  async setOperatorStatus(operatorId: string, status: 'Activo' | 'Inactivo'): Promise<void> {
    const updated = await firstValueFrom(
      this.http.put<Operator>(`/api/operators/${operatorId}`, { status }),
    );
    this.operators.update((ops) => ops.map((o) => (o.id === operatorId ? updated : o)));
  }

  async deleteOperator(operatorId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/operators/${operatorId}`));
    this.operators.update((ops) => ops.filter((o) => o.id !== operatorId));
  }

  // ---------- Tipos de incidente ----------
  async getIncidentTypes(): Promise<void> {
    const types = await firstValueFrom(this.http.get<IncidentType[]>('/api/incident-types'));
    this.incidentTypes.set(types);
  }

  async addIncidentType(data: Omit<IncidentType, 'id'>): Promise<void> {
    const created = await firstValueFrom(this.http.post<IncidentType>('/api/incident-types', data));
    this.incidentTypes.update((list) => [created, ...list]);
  }

  async updateIncidentType(typeId: string, updates: Partial<IncidentType>): Promise<void> {
    const updated = await firstValueFrom(
      this.http.put<IncidentType>(`/api/incident-types/${typeId}`, updates),
    );
    this.incidentTypes.update((list) => list.map((t) => (t.id === typeId ? updated : t)));
  }

  // ---------- Protocolos ----------
  async getResponseProtocols(): Promise<void> {
    const protos = await firstValueFrom(
      this.http.get<ResponseProtocol[]>('/api/response-protocols'),
    );
    this.responseProtocols.set(protos);
  }

  async addResponseProtocol(data: Omit<ResponseProtocol, 'id'>): Promise<void> {
    const created = await firstValueFrom(
      this.http.post<ResponseProtocol>('/api/response-protocols', data),
    );
    this.responseProtocols.update((list) => [created, ...list]);
  }

  async updateResponseProtocol(
    protocolId: string,
    updates: Partial<ResponseProtocol>,
  ): Promise<void> {
    const updated = await firstValueFrom(
      this.http.put<ResponseProtocol>(`/api/response-protocols/${protocolId}`, updates),
    );
    this.responseProtocols.update((list) => list.map((p) => (p.id === protocolId ? updated : p)));
  }

  // ---------- Emails de notificación ----------
  async getNotificationEmails(): Promise<void> {
    const emails = await firstValueFrom(
      this.http.get<NotificationEmailEntry[]>('/api/notification-emails'),
    );
    this.notificationEmails.set(emails);
  }

  async addNotificationEmail(email: string): Promise<void> {
    const list = await firstValueFrom(
      this.http.post<NotificationEmailEntry[]>('/api/notification-emails', { email }),
    );
    this.notificationEmails.set(list);
  }

  async setNotificationEmailStatus(
    email: string,
    status: 'Activo' | 'Inactivo',
  ): Promise<void> {
    const list = await firstValueFrom(
      this.http.patch<NotificationEmailEntry[]>(
        `/api/notification-emails/${encodeURIComponent(email)}/status`,
        { status },
      ),
    );
    this.notificationEmails.set(list);
  }

  activeNotificationEmailAddresses(): string[] {
    return this.notificationEmails()
      .filter((entry) => entry.status === 'Activo')
      .map((entry) => entry.email);
  }

  // ---------- Audit logs ----------
  async getAuditLogs(): Promise<void> {
    const logs = await firstValueFrom(this.http.get<AuditLog[]>('/api/audit-logs'));
    this.auditLogs.set(logs);
  }

  // ---------- Roles y permisos ----------
  async getRolePermissions(): Promise<void> {
    const roles = await firstValueFrom(
      this.http.get<RolePermission[]>('/api/roles', {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      })
    );
    this.rolePermissions.set(roles);
  }

  async addRolePermission(roleName: string): Promise<void> {
    const roles = await firstValueFrom(
      this.http.post<RolePermission[]>('/api/roles', { role: roleName }),
    );
    this.rolePermissions.set(roles);
  }

  async updateRolePermission(id: string, updates: Partial<RolePermission>): Promise<void> {
    await firstValueFrom(this.http.put<void>(`/api/roles/${id}`, updates));
    await this.getRolePermissions();
  }

  async getUsersAuditSummary(): Promise<void> {
    const summary = await firstValueFrom(
      this.http.get<UserAuditSummary[]>('/api/users-audit-summary'),
    );
    this.usersAuditSummary.set(summary);
  }

  async selectUserForAudit(userId: string): Promise<void> {
    this.selectedUserId.set(userId);
    this.loadingUserActions.set(true);
    try {
      const actions = await firstValueFrom(
        this.http.get<UserAuditAction[]>(
          `/api/users-audit-summary/${encodeURIComponent(userId)}/actions`,
        ),
      );
      this.selectedUserActions.set(actions);
    } finally {
      this.loadingUserActions.set(false);
    }
  }
}
