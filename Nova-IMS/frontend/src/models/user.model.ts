export type UserRole = 'admin' | 'supervisor' | 'operator' | 'field_unit' | 'analyst' | 'viewer' | string;

/** Origen de la sesión actual */
export type AuthSource = 'ldap' | 'local';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  agency?: string;
  permissions?: string[];
  /** ldap = directorio activo; local = cuenta en base de datos */
  authSource?: AuthSource;
}
