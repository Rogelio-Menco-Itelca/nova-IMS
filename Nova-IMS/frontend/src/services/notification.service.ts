import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { apiUrl } from '../utils/api-base';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface StoredNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const STORAGE_KEY = 'ims_session_notifications';
const MAX_NOTIFICATIONS = 10;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = apiUrl('/api/notifications');

  private readonly _notifications = signal<AppNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();
  readonly lastNotification = signal<AppNotification | null>(null);

  readonly maxNotifications = MAX_NOTIFICATIONS;

  unreadCount = computed(() => this._notifications().filter((n) => !n.read).length);

  /** Recupera la bandeja al recargar la página (misma sesión de navegador). */
  restoreSession(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredNotification[];
      const restored = parsed
        .map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: new Date(n.timestamp),
          read: Boolean(n.read),
        }))
        .filter((n) => n.id && n.title)
        .slice(0, MAX_NOTIFICATIONS);
      this._notifications.set(restored);
      this.lastNotification.set(restored[0] ?? null);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  addNotification(title: string, message: string, incidentId?: string) {
    const recent = this._notifications()[0];
    if (
      recent?.title === title &&
      recent?.message === message &&
      Date.now() - (recent?.timestamp.getTime() ?? Number.POSITIVE_INFINITY) < 3000
    ) {
      return;
    }

    const user = this.authService.currentUser();
    const triggeredBy = this.authService.isDirectorySession() ? null : (user?.id ?? null);

    const newNotification: AppNotification = {
      id: crypto.randomUUID(),
      title,
      message,
      timestamp: new Date(),
      read: false,
    };

    const next = [newNotification, ...this._notifications()].slice(0, MAX_NOTIFICATIONS);
    this._notifications.set(next);
    this.lastNotification.set(newNotification);
    this.persistSession(next);

    this.http
      .post(this.apiUrl, {
        id: newNotification.id,
        title,
        message,
        triggeredBy,
        incidentId: incidentId ?? null,
      })
      .subscribe({
        error: (err) => console.error('Error guardando notificación:', err),
      });
  }

  markAllAsRead() {
    const userId = this.authService.isDirectorySession()
      ? undefined
      : this.authService.currentUser()?.id;
    this.http.patch(`${this.apiUrl}/mark-all-read`, { userId }).subscribe();
    const next = this._notifications().map((n) => ({ ...n, read: true }));
    this._notifications.set(next);
    this.persistSession(next);
  }

  /** Bandeja vacía al iniciar sesión nueva o al cerrar sesión. */
  clearSessionNotifications(): void {
    this._notifications.set([]);
    this.lastNotification.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private persistSession(notifications: AppNotification[]): void {
    const payload: StoredNotification[] = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp.toISOString(),
      read: n.read,
    }));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
}
