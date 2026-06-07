import { Injectable, signal, computed, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "./auth.service";

// ✅ Define la interfaz aquí
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

@Injectable({ providedIn: "root" })
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = "http://localhost:3000/api/notifications";

  private _notifications = signal<AppNotification[]>([]); // ✅ AppNotification
  readonly notifications = this._notifications.asReadonly();
  lastNotification = signal<AppNotification | null>(null); // ✅ AppNotification

  unreadCount = computed(
    () => this._notifications().filter((n) => !n.read).length,
  );

  addNotification(title: string, message: string, incidentId?: string) {
    const recent = this._notifications()[0];
    if (
      recent?.title === title &&
      recent?.message === message &&
      Date.now() - (recent?.timestamp.getTime() ?? Number.POSITIVE_INFINITY) <
        3000
    ) {
      return;
    }

    const user = this.authService.currentUser();
    const triggeredBy =
      this.authService.isDirectorySession() ? null : (user?.id ?? null);

    const newNotification: AppNotification = {
      // ✅ AppNotification
      id: crypto.randomUUID(),
      title,
      message,
      timestamp: new Date(),
      read: false,
    };

    this._notifications.update((current) =>
      [newNotification, ...current].slice(0, 15),
    );
    this.lastNotification.set(newNotification);

    this.http
      .post(this.apiUrl, {
        id: newNotification.id,
        title,
        message,
        triggeredBy,
        incidentId: incidentId ?? null,
      })
      .subscribe({
        error: (err) => console.error("Error guardando notificación:", err),
      });
  }

  markAllAsRead() {
    const userId = this.authService.isDirectorySession()
      ? undefined
      : this.authService.currentUser()?.id;
    this.http.patch(`${this.apiUrl}/mark-all-read`, { userId }).subscribe();
    this._notifications.update((current) =>
      current.map((n) => ({ ...n, read: true })),
    );
  }

  /** Bandeja vacía al iniciar o cerrar sesión (estado solo en memoria de la SPA). */
  clearSessionNotifications(): void {
    this._notifications.set([]);
    this.lastNotification.set(null);
  }
}
