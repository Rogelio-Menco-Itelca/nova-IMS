export type IncidentStatus =
  | 'Nuevo'
  | 'En gestión OSEG'
  | 'Enviado a CERREM'
  | 'En evaluación CERREM'
  | 'Reiteraciones'
  | 'Medidas asignadas'
  | 'Cerrado'
  | 'Cancelado'
  | 'Asignado'
  | 'En camino'
  | 'En proceso'
  | 'Resuelto';

/** Estados visibles en el dashboard (incidentes que requieren seguimiento). */
export const DASHBOARD_ACTIVE_STATUSES: readonly IncidentStatus[] = [
  'Nuevo',
  'En gestión OSEG',
  'En evaluación CERREM',
  'Reiteraciones',
  'Medidas asignadas',
] as const;

/** Estados cerrados: no aparecen en el dashboard. */
export const DASHBOARD_CLOSED_STATUSES: readonly IncidentStatus[] = [
  'Cerrado',
  'Cancelado',
  'Resuelto',
] as const;

export function isDashboardActiveStatus(status: string | null | undefined): boolean {
  const value = String(status ?? '').trim();
  const ui = catalogStatusToUiStatus(value);
  if (ui === 'Enviado a CERREM') return true;
  return (DASHBOARD_ACTIVE_STATUSES as readonly string[]).includes(value);
}

export function isDashboardClosedStatus(status: string | null | undefined): boolean {
  const value = String(status ?? '').trim();
  return (DASHBOARD_CLOSED_STATUSES as readonly string[]).includes(value);
}

/** Mapeo nombre catálogo BD → estado UI del API (alineado con backend maps.js). */
export const CATALOG_STATUS_TO_UI: Record<string, IncidentStatus> = {
  Nuevo: 'Nuevo',
  'En gestión OSEG': 'En gestión OSEG',
  'Enviado a CERREM': 'Enviado a CERREM',
  'En evaluación CERREM': 'En evaluación CERREM',
  Reiteraciones: 'Reiteraciones',
  'Medidas asignadas': 'Medidas asignadas',
  Cerrado: 'Cerrado',
  Cancelado: 'Cancelado',
  Asignado: 'Asignado',
  'En camino': 'En camino',
  'En proceso': 'En proceso',
  Resuelto: 'Resuelto',
};

export function catalogStatusToUiStatus(catalogName: string): string {
  const name = String(catalogName ?? '').trim();
  return CATALOG_STATUS_TO_UI[name] || name;
}

/** Orden del flujo CSJ: mayor número = más avanzado (solo hacia adelante). */
export const CSJ_STATUS_WORKFLOW_RANK: Record<string, number> = {
  Nuevo: 0,
  'En gestión OSEG': 1,
  'Enviado a CERREM': 2,
  'En evaluación CERREM': 3,
  Reiteraciones: 4,
  'Medidas asignadas': 5,
  Cerrado: 6,
  Cancelado: 6,
};

/** Orden del flujo POL. */
export const POL_STATUS_WORKFLOW_RANK: Record<string, number> = {
  Nuevo: 0,
  'En proceso': 1,
  Asignado: 2,
  'En camino': 3,
  Resuelto: 4,
  Cerrado: 4,
  Cancelado: 5,
};

export function statusWorkflowRank(status: string, agency = 'CSJ'): number | undefined {
  const ui = catalogStatusToUiStatus(status);
  const ranks =
    String(agency).trim().toUpperCase() === 'POL'
      ? POL_STATUS_WORKFLOW_RANK
      : CSJ_STATUS_WORKFLOW_RANK;
  return ranks[ui];
}

/** Un incidente creado solo puede avanzar en el flujo, nunca retroceder. */
export function isForwardStatusTransition(
  fromStatus: string,
  toStatus: string,
  agency = 'CSJ',
): boolean {
  const fromUi = catalogStatusToUiStatus(fromStatus);
  const toUi = catalogStatusToUiStatus(toStatus);
  if (!toUi || fromUi === toUi) return true;

  const fromRank = statusWorkflowRank(fromUi, agency);
  const toRank = statusWorkflowRank(toUi, agency);
  if (fromRank === undefined || toRank === undefined) return true;

  return toRank > fromRank;
}

/** ¿Requiere datos CERREM al guardar según destino del flujo CSJ? */
export function needsCerremGestionForTransition(targetStatus: string): boolean {
  const target = catalogStatusToUiStatus(targetStatus);
  if (target === 'Cerrado' || target === 'Cancelado') return false;
  const targetRank = CSJ_STATUS_WORKFLOW_RANK[target];
  if (targetRank === undefined) return false;
  return targetRank >= CSJ_STATUS_WORKFLOW_RANK['En evaluación CERREM'];
}

/** ¿Requiere gestión OSEG al guardar según destino del flujo CSJ? */
export function needsOsegGestionForTransition(targetStatus: string): boolean {
  const target = catalogStatusToUiStatus(targetStatus);
  if (target === 'Cerrado' || target === 'Cancelado') return false;
  const targetRank = CSJ_STATUS_WORKFLOW_RANK[target];
  if (targetRank === undefined) return false;
  return targetRank >= CSJ_STATUS_WORKFLOW_RANK['En gestión OSEG'];
}

export function incidentMatchesCatalogStatus(
  incidentUiStatus: string,
  catalogName: string,
): boolean {
  const ui = catalogStatusToUiStatus(catalogName);
  return incidentUiStatus === ui || incidentUiStatus === catalogName;
}

/** Los 3 estados finales del flujo CSJ: ocultos en "Todos los activos", visibles al filtrar. */
export const INCIDENT_LIST_HIDDEN_BY_DEFAULT: readonly IncidentStatus[] = [
  'Cerrado',
  'Cancelado',
  'Resuelto',
] as const;

export function isHiddenByDefaultInIncidentList(status: string | null | undefined): boolean {
  const ui = catalogStatusToUiStatus(String(status ?? '').trim());
  return (INCIDENT_LIST_HIDDEN_BY_DEFAULT as readonly string[]).includes(ui);
}

/** Incidentes visibles en dashboard y lista por defecto (todos excepto los 3 cerrados CSJ). */
export function isVisibleInActiveViews(status: string | null | undefined): boolean {
  return !isHiddenByDefaultInIncidentList(status);
}
export type IncidentPriority = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export type PersonRole = 'Víctima' | 'Victimario' | 'Testigo';

/** Tipos de documento de identidad (Colombia) */
export type DocumentType =
  | 'Registro Civil'
  | 'Tarjeta de Identidad'
  | 'Cédula de Ciudadanía'
  | 'Pasaporte';

export const DOCUMENT_TYPE_OPTIONS: readonly DocumentType[] = [
  'Registro Civil',
  'Tarjeta de Identidad',
  'Cédula de Ciudadanía',
  'Pasaporte',
] as const;

export type VehicleRole = 'Vehículo Víctima' | 'Vehículo Victimario' | 'Vehículo Involucrado';

export type PersonGender = 'Masculino' | 'Femenino';

export const PERSON_GENDER_OPTIONS: readonly PersonGender[] = ['Masculino', 'Femenino'] as const;

export interface ColombiaDepartment {
  id: number;
  daneCode: string;
  name: string;
}

export interface ColombiaMunicipality {
  id: number;
  departmentId: number;
  daneCode: string;
  name: string;
}

export interface InvolvedPerson {
  id?: string;
  /** Nombre completo (legacy / visualización) */
  name?: string;
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  role?: string;
  roleId?: number | null;
  contact?: string;
  /** Comentarios del solicitante (tabla comentariospersonas) */
  comentarios?: string;
  details?: string;
  phone?: string;
  documentType?: string;
  documentTypeName?: string;
  documentId?: string;
  gender?: string;
  genderId?: number | null;
}

export function joinPersonName(
  p: Pick<InvolvedPerson, 'primerNombre' | 'segundoNombre' | 'primerApellido' | 'segundoApellido'>,
): string {
  return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

export function splitPersonName(
  full: string,
): Pick<InvolvedPerson, 'primerNombre' | 'segundoNombre' | 'primerApellido' | 'segundoApellido'> {
  const parts = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return { primerNombre: '', primerApellido: '' };
  }
  if (parts.length === 1) {
    return { primerNombre: parts[0], primerApellido: '' };
  }
  if (parts.length === 2) {
    return { primerNombre: parts[0], primerApellido: parts[1] };
  }
  if (parts.length === 3) {
    return {
      primerNombre: parts[0],
      primerApellido: parts[1],
      segundoApellido: parts[2],
    };
  }
  return {
    primerNombre: parts[0],
    segundoNombre: parts[1],
    primerApellido: parts.at(-2) ?? '',
    segundoApellido: parts.at(-1) ?? '',
  };
}

export interface Person {
  id: string;
  name: string;
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  documentId: string;
  documentType?: string;
  documentTypeName?: string;
  phone: string;
  contacto?: string;
  roleId?: number;
  roleName?: string;
  genderId?: number | null;
  gender?: string;
  comentarios?: string;
  agency?: string;
  address?: string;
  email?: string;
  birthDate?: string;
  notes?: string;
  status?: 'Activo' | 'Inactivo';
  createdAt: string;
}

export interface PersonFormPayload {
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  tipoDocumento: string;
  numeroDocumento: string;
  contacto?: string;
  roleId: number;
  genderId?: number | null;
  comentarios?: string;
  status?: 'Activo' | 'Inactivo';
}

export interface CatalogOption {
  id: number;
  name: string;
}

export interface DocumentTypeOption {
  code: string;
  name: string;
}

export interface InvolvedPlace {
  id?: string;
  name: string;
  address: string;
  departmentId?: number | null;
  municipalityId?: number | null;
  departmentName?: string;
  municipalityName?: string;
  contact?: string;
  roleId?: number;
  roleName?: string;
  /** Comentarios del lugar (tabla comentarios_lugar) */
  comments?: string;
  commentsHistory?: { text: string; at?: string; user?: string }[];
}

export interface InvolvedVehicle {
  plate: string;
  role: VehicleRole;
  make?: string;
  model?: string;
  color?: string;
  /** Comentarios del vehículo (tabla comentariosvehiculos) */
  details?: string;
  /** Fecha y hora en que se registró el vehículo en este incidente */
  incidentDate?: string;
}

export interface DashboardTimeMetric {
  avgSeconds: number | null;
  formatted: string | null;
  sampleCount: number;
}

export interface DashboardResponseMetrics {
  agency: 'CSJ';
  gestion: DashboardTimeMetric;
  proteccion: DashboardTimeMetric;
}

export interface Incident {
  id: string;
  timestamp: string;
  status: IncidentStatus;
  event_id: string; // ID_evento
  incident_type_id?: string;
  priority_id: string; // ID_prioridad
  origin: string;
  phone: string; // Telefono
  location: string; // Direccion
  /** Ubicación del Incidente (no confundir con domicilio de personas involucradas). */
  departmentId?: number | null;
  municipalityId?: number | null;
  departmentName?: string;
  municipalityName?: string;
  comments: string; /** Historial operador → comentarios_incidentes */
  lat: number;
  lng: number;
  details: string; // Descripcion

  // Legacy/Additional
  type: string;
  priority: IncidentPriority;
  operator: string;
  ani: string;
  contactInfo?: string;
  involvedPeople?: InvolvedPerson[];
  involvedPlaces?: InvolvedPlace[];
  involvedVehicles?: InvolvedVehicle[];
  locationPhoneNumber?: string;
  /** request_id del enlace WhatsApp/SMS (ubicacion.url_peticion) */
  locationRequestId?: string;
  /** ID_solicitud en tabla ubicacion */
  locationSolicitudId?: number;
}
