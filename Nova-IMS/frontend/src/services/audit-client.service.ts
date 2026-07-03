import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type ClientAuditType = 'incident_view' | 'report_download' | 'map_geolocation';
type AuditModule = 'Dashboard' | 'Incidentes' | 'Reportes' | 'Administración';

interface ClientAuditPayload {
  type: ClientAuditType;
  module?: AuditModule;
  incidentId?: string;
  reportName?: string;
  format?: string;
}

/**
 * Registra en auditoría acciones significativas que ocurren solo en el cliente
 * y no pasan por un endpoint de negocio: ver un incidente (desde la lista ya
 * cargada), descargar un reporte o consultar el mapa de geolocalización.
 *
 * Es best-effort: si falla no interrumpe la experiencia del usuario. Aplica un
 * dedupe corto para no registrar el mismo evento repetidamente.
 */
@Injectable({ providedIn: 'root' })
export class AuditClientService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/audit/client-event';
  private readonly lastSent = new Map<string, number>();
  private readonly DEDUPE_MS = 60_000;

  /** El usuario abrió la información de un incidente específico (dato sensible). */
  incidentView(incidentId: string | number, module: 'Dashboard' | 'Incidentes' = 'Incidentes'): void {
    const id = String(incidentId ?? '').trim();
    if (!id) return;
    if (this.isRecent(`view:${module}:${id}`)) return;
    this.send({ type: 'incident_view', incidentId: id, module });
  }

  /** El usuario descargó un reporte. */
  reportDownload(reportName: string, format?: string): void {
    this.send({ type: 'report_download', reportName, format });
  }

  /** El usuario consultó la geolocalización en el mapa (dashboard o formulario). */
  mapGeolocation(module: 'Dashboard' | 'Incidentes', incidentId?: string | number): void {
    const id = incidentId != null ? String(incidentId).trim() : '';
    if (this.isRecent(`map:${module}:${id || '*'}`)) return;
    this.send({ type: 'map_geolocation', module, incidentId: id || undefined });
  }

  private isRecent(key: string): boolean {
    const now = Date.now();
    const last = this.lastSent.get(key) ?? 0;
    if (now - last < this.DEDUPE_MS) return true;
    this.lastSent.set(key, now);
    return false;
  }

  private send(payload: ClientAuditPayload): void {
    this.http.post(this.url, payload).subscribe({ error: () => void 0 });
  }
}
