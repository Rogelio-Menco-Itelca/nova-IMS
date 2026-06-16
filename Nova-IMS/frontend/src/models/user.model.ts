/** Origen de la sesión actual */
export type AuthSource = 'ldap' | 'local';

export interface Agency {
  id: number;
  code: string;
  name: string;
}

export interface RoleOption {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  agency?: string;
  agencyName?: string;
  permissions?: string[];
  /** ldap = directorio activo; local = cuenta en base de datos */
  authSource?: AuthSource;
}
