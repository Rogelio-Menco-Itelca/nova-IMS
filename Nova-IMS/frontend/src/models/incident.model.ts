export type IncidentStatus = 'Nuevo' | 'Asignado' | 'En camino' | 'En situación' | 'Resuelto' | 'Cerrado' | 'Cancelado';
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

export const PERSON_GENDER_OPTIONS: readonly PersonGender[] = [
  'Masculino',
  'Femenino',
] as const;

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
  name: string;
  role: PersonRole;
  contact?: string;
  details?: string;
  phone?: string;
  documentType?: DocumentType | '';
  documentId?: string;
  address?: string;
  gender?: PersonGender | '';
}

export interface Person {
  id: string;
  name: string;
  documentId: string;
  documentType?: DocumentType | '';
  phone: string;
  address: string;
  email?: string;
  birthDate?: string;
  notes?: string;
  createdAt: string;
}

export interface InvolvedVehicle {
  plate: string;
  role: VehicleRole;
  make?: string;
  model?: string;
  color?: string;
  details?: string;
  /** Fecha y hora en que se registró el vehículo en este incidente */
  incidentDate?: string;
}

export interface Incident {
  id: string;
  timestamp: string;
  status: IncidentStatus;
  event_id: string;      // ID_evento
  incident_type_id?: string;
  priority_id: string;   // ID_prioridad
  origin: string;
  phone: string;        // Telefono
  location: string;     // Direccion
  /** Ubicación del Incidente (no confundir con domicilio de personas involucradas). */
  departmentId?: number | null;
  municipalityId?: number | null;
  departmentName?: string;
  municipalityName?: string;
  comments: string;     // Comentarios
  lat: number;
  lng: number;
  details: string;      // Descripcion
  
  // Legacy/Additional
  type: string;
  priority: IncidentPriority;
  operator: string;
  ani: string;
  contactInfo?: string;
  involvedPeople?: InvolvedPerson[];
  involvedVehicles?: InvolvedVehicle[];
  locationPhoneNumber?: string;
}