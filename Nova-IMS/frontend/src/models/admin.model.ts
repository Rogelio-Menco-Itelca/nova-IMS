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

export interface RolePermission {
  id: string;
  role: string;
  permissions: {
    module: string;
    enabled: boolean;
    actions: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    };
  }[];
}
