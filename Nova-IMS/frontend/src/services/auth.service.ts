import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthSource, User, Agency, RoleOption } from '../models/user.model';

interface LoginPayload {
  agencia: string;
  usuario: string;
  password: string;
  rol?: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  token: string;
  mustChangePassword: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    role_id: string;
    agency: string;
    agencyName?: string | null;
    authSource?: AuthSource;
  };
}

// Respuesta cuando el backend pide OTP (usuarios locales)
interface LoginOtpResponse {
  requiresOtp: true;
  userId: string;
  otpTarget: string;
}

// Respuesta después de verificar OTP
interface VerifyOtpResponse {
  token: string;
  mustChangePassword: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    role_id: string;
    agency: string;
    agencyName?: string | null;
    authSource?: AuthSource;
  };
}

const TOKEN_KEY = 'ims_token';
const USER_KEY = 'ims_currentUser';
const MUST_CHANGE_KEY = 'ims_mustChangePassword';

function normalizeAuthSource(value: unknown): AuthSource {
  if (typeof value !== 'string') {
    return 'local';
  }
  return value.toLowerCase() === 'ldap' ? 'ldap' : 'local';
}

function authSourceFromToken(token: string): AuthSource | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    if (payload.auth_source) {
      return normalizeAuthSource(payload.auth_source);
    }
  } catch {
    /* ignore */
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = '/api/auth';

  isAuthenticated = signal(false);
  currentUser = signal<User | null>(null);
  token = signal<string | null>(null);
  mustChangePassword = signal(false);
  currentView = signal<'dashboard' | 'incidents' | 'reports' | 'admin' | 'change-password'>(
    'dashboard',
  );

  authSourceLabel = computed(() => {
    const source = this.currentUser()?.authSource ?? 'local';
    return source === 'ldap' ? 'Directorio activo' : 'Cuenta local';
  });

  /** Código de la agencia de la sesión actual (ej. CSJ, POL). */
  sessionAgencyLabel = computed(() => String(this.currentUser()?.agency || '').trim());

  isDirectorySession = computed(() => (this.currentUser()?.authSource ?? 'local') === 'ldap');

  checkAuth(): void {
    const storedToken = sessionStorage.getItem(TOKEN_KEY);
    const storedUser = sessionStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as User;
        const fromToken = authSourceFromToken(storedToken);
        this.token.set(storedToken);
        this.currentUser.set({
          ...parsed,
          authSource: normalizeAuthSource(parsed.authSource ?? fromToken ?? 'local'),
        });
        this.isAuthenticated.set(true);
        this.mustChangePassword.set(sessionStorage.getItem(MUST_CHANGE_KEY) === 'true');
      } catch {
        this.logout();
      }
    }
  }

  login(payload: LoginPayload): Observable<LoginResponse | LoginOtpResponse> {
    return this.http.post<LoginResponse | LoginOtpResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((resp) => {
        // Solo guardar sesión si es respuesta LDAP (token directo)
        if ('token' in resp) {
          const user: User = {
            id: resp.user.id,
            name: resp.user.name,
            email: resp.user.email,
            role: resp.user.role,
            agency: resp.user.agency,
            agencyName: resp.user.agencyName ?? undefined,
            authSource: normalizeAuthSource(resp.user.authSource),
          };
          sessionStorage.setItem(TOKEN_KEY, resp.token);
          sessionStorage.setItem(USER_KEY, JSON.stringify(user));
          this.token.set(resp.token);
          this.currentUser.set(user);
          this.isAuthenticated.set(true);
          this.mustChangePassword.set(resp.mustChangePassword);
          if (resp.mustChangePassword) {
            sessionStorage.setItem(MUST_CHANGE_KEY, 'true');
          } else {
            sessionStorage.removeItem(MUST_CHANGE_KEY);
          }
        }
        // Si llega requiresOtp, el login.component maneja el paso 2
      }),
      catchError((err) => {
        const msg =
          err?.error?.error?.message || 'Credenciales incorrectas. Por favor, intente de nuevo.';
        return throwError(() => new Error(msg));
      }),
    );
  }

  /** Paso 2 (usuarios locales): verifica OTP y guarda sesión */
  verifyOtp(userId: string, code: string, agencia?: string): Observable<VerifyOtpResponse> {
    return this.http
      .post<VerifyOtpResponse>(`${this.apiUrl}/verify-otp`, { userId, code, agencia })
      .pipe(
        tap((resp) => {
          const user: User = {
            id: resp.user.id,
            name: resp.user.name,
            email: resp.user.email,
            role: resp.user.role,
            agency: resp.user.agency,
            agencyName: resp.user.agencyName ?? undefined,
            authSource: normalizeAuthSource(resp.user.authSource ?? 'local'),
          };
          sessionStorage.setItem(TOKEN_KEY, resp.token);
          sessionStorage.setItem(USER_KEY, JSON.stringify(user));
          this.token.set(resp.token);
          this.currentUser.set(user);
          this.isAuthenticated.set(true);
          this.mustChangePassword.set(resp.mustChangePassword);
          if (resp.mustChangePassword) {
            sessionStorage.setItem(MUST_CHANGE_KEY, 'true');
          } else {
            sessionStorage.removeItem(MUST_CHANGE_KEY);
          }
        }),
        catchError((err) => {
          const msg = err?.error?.error?.message || 'Código incorrecto o expirado.';
          return throwError(() => new Error(msg));
        }),
      );
  }

  changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/change-password`, data);
  }

  clearMustChangePassword(): void {
    this.mustChangePassword.set(false);
    sessionStorage.removeItem(MUST_CHANGE_KEY);
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(MUST_CHANGE_KEY);
    this.token.set(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.mustChangePassword.set(false);
  }

  getToken(): string | null {
    return this.token() || sessionStorage.getItem(TOKEN_KEY);
  }

  /** Catálogo público de agencias (login) */
  getAgencies(): Observable<Agency[]> {
    return this.http.get<Agency[]>('/api/agencies');
  }

  /** Catálogo público de roles (login) — filtrados por agencia en BD */
  getRoles(agencyCode: string): Observable<RoleOption[]> {
    return this.http.get<RoleOption[]>('/api/roles/list', {
      params: { agency: agencyCode },
    });
  }
}
