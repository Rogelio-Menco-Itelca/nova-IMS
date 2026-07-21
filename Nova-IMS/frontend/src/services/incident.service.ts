import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardResponseMetrics, Incident, InvolvedVehicle } from '../models/incident.model';
import { isValidCoordComponent } from '../utils/ims-geo.constants';
import { SocketService } from './socket.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly http = inject(HttpClient);
  private readonly socketService = inject(SocketService);
  private readonly notificationService = inject(NotificationService);
  private readonly apiUrl = '/api/incidents';

  incidents = signal<Incident[]>([]);
  dashboardMetrics = signal<DashboardResponseMetrics | null>(null);
  isLoading = signal(false);
  pendingOpenIncidentId = signal<string | null>(null);

  constructor() {
    this.socketService.on('incident:created', (newIncident: Incident) => {
      this.incidents.update((list) => [newIncident, ...list]);
      this.refreshDashboardMetrics();
    });

    this.socketService.on('incident:updated', (updatedIncident: Incident) => {
      this.incidents.update((list) =>
        list.map((i) => (i.id === updatedIncident.id ? updatedIncident : i)),
      );
      this.refreshDashboardMetrics();
    });
  }

  private dedupeIncidents(list: Incident[]): Incident[] {
    const byId = new Map<string, Incident>();
    const pickCoord = (a: number | null | undefined, b: number | null | undefined) => {
      const na = a == null ? Number.NaN : Number(a);
      const nb = b == null ? Number.NaN : Number(b);
      if (isValidCoordComponent(na)) return na;
      if (isValidCoordComponent(nb)) return nb;
      return a ?? b ?? 0;
    };

    for (const inc of list) {
      const prev = byId.get(inc.id);
      if (!prev) {
        byId.set(inc.id, inc);
        continue;
      }
      byId.set(inc.id, {
        ...prev,
        location: prev.location || inc.location,
        lat: pickCoord(inc.lat, prev.lat),
        lng: pickCoord(inc.lng, prev.lng),
      });
    }
    return [...byId.values()];
  }

  getIncidents(): void {
    this.isLoading.set(true);
    this.http.get<Incident[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.incidents.set(this.dedupeIncidents(data));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al conectar con el backend:', err);
        this.isLoading.set(false);
      },
    });
    this.refreshDashboardMetrics();
  }

  refreshDashboardMetrics(): void {
    this.http.get<DashboardResponseMetrics>(`${this.apiUrl}/dashboard-metrics`).subscribe({
      next: (metrics) => this.dashboardMetrics.set(metrics),
      error: () => this.dashboardMetrics.set(null),
    });
  }

  createIncident(incident: Incident): Observable<Incident> {
    return this.http.post<Incident>(this.apiUrl, incident);
  }

  addIncident(incident: Incident): void {
    this.createIncident(incident).subscribe({
      next: () => {
      },
      error: (err) => this.handleCreateError(err),
    });
  }

  handleCreateError(err: unknown): void {
    console.error('Error al crear incidente:', err);
    const e = err as { error?: { error?: { message?: string }; message?: string } };
    const msg =
      e?.error?.error?.message ||
      e?.error?.message ||
      'No se pudo guardar el incidente en el servidor.';
    this.notificationService.addNotification('Error al guardar', msg);
  }

  updateIncident(updatedIncident: Incident, onSuccess?: (saved: Incident) => void): void {
    this.http.put<Incident>(`${this.apiUrl}/${updatedIncident.id}`, updatedIncident).subscribe({
      next: (saved) => {
        this.incidents.update((list) =>
          list.map((i) => (i.id === saved.id ? { ...i, ...saved } : i)),
        );
        onSuccess?.(saved);
      },
      error: (err) => {
        console.error('Error al actualizar incidente:', err);
        const msg =
          err?.error?.error?.message ||
          err?.error?.message ||
          'No se pudo actualizar el incidente en el servidor.';
        this.notificationService.addNotification('Error al guardar', msg);
      },
    });
  }

  lookupVehicleByPlate(plate: string) {
    return this.http.get<InvolvedVehicle>(
      `${this.apiUrl}/vehicle-lookup/${encodeURIComponent(plate)}`,
    );
  }

  sendIncidentEmail(incidentId: string, recipients: string[]) {
    return this.http.post<{
      ok: boolean;
      message: string;
      recipients: string[];
      mode: string;
    }>(`${this.apiUrl}/${encodeURIComponent(incidentId)}/send-email`, {
      recipients,
    });
  }

  requestOpenIncident(incidentId: string): void {
    this.pendingOpenIncidentId.set(incidentId);
  }

  clearPendingOpenIncident(): void {
    this.pendingOpenIncidentId.set(null);
  }
}
