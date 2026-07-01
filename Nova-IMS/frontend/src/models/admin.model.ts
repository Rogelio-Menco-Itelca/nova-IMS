import { IncidentPriority } from './incident.model';

export interface Operator {
  id: string;
  name: string;
  username?: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  email: string;
  telefono?: string;
  agency: string;
  agencyName?: string;
  role: string;
  status: 'Activo' | 'Inactivo';
}

export interface OperatorFormPayload {
  username: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  email: string;
  telefono?: string;
  agency: string;
  password?: string;
  role: string;
  status: 'Activo' | 'Inactivo';
}

export interface IncidentType {
  id: string;
  name: string;
  defaultPriority: IncidentPriority;
  description: string;
}

export interface ResponseProtocol {
  id: string;
  name: string;
  incidentTypeName: string; // This should match an IncidentType name
  steps: string[];
}

export interface AuditLog {
  id: string;
  incidentId: string;
  timestamp: string;
  user: string;
  action: string;
  changes: string;
  details?: { field: string; old: string; new: string }[];
}

export interface AdminActionLog {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface UserAuditSummary {
  userId: string;
  userName: string;
  roleName: string;
  agencyCode: string;
  status: 'Activo' | 'Inactivo';
  actionCount: number;
  lastActivity: string | null;
}

export interface UserAuditAction {
  id: string;
  source: 'admin' | 'incident' | 'login' | '2fa';
  action: string;
  details: string | null;
  timestamp: string;
}

export interface RolePermission {
  id: string;
  role: string;
  protected?: boolean;
  permissions: {
    module: string;
    enabled: boolean;
    locks?: {
      enabled: boolean;
      view: boolean;
      create: boolean;
      edit: boolean;
      notify: boolean;
      export: boolean;
    };
    actions: {
      view: boolean;
      create: boolean;
      edit: boolean;
      notify: boolean;
      export: boolean;
    };
  }[];
}
