import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getMedidasPermissions, MedidasPermissions } from '../../utils/medidas-permissions';
import { catalogStatusToUiStatus } from '../../models/incident.model';

interface TipoMedida {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface RiesgoOption {
  id: number;
  nombre: string;
}

interface GestionRecord {
  servidor_judicial?: string | null;
  cedula?: string | null;
  cargo?: string | null;
  codigo_oficio?: string | null;
  tramite_destino?: string | null;
  fecha_cerrem?: string | null;
  resolucion_cerrem?: string | null;
  fecha_resolucion?: string | null;
  ID_riesgo?: number | null;
  tipo_esquema?: string | null;
  observaciones?: string | null;
  ID_gestion?: number;
}

interface MedidaAsignada {
  ID_tipo_medida: number;
  cantidad?: number;
  observacion_medida?: string | null;
}

interface ModuleMessage {
  ok: boolean;
  text: string;
}

@Component({
  selector: 'app-medidas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medidas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MedidasComponent implements OnChanges {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) incidentId!: string;
  @Input({ required: true }) workflowStatus = 'Nuevo';
  @Input({ required: true }) agency = 'CSJ';

  loading = signal(false);
  osegGuardada = signal(false);
  cerremGuardada = signal(false);
  cerremEditing = signal(false);
  medidasEditing = signal(false);
  savingOseg = signal(false);
  savingCerrem = signal(false);
  savingMedidas = signal(false);

  mensajeOseg = signal<ModuleMessage | null>(null);
  mensajeCerrem = signal<ModuleMessage | null>(null);
  mensajeMedidas = signal<ModuleMessage | null>(null);

  tiposMedida = signal<TipoMedida[]>([]);
  riesgos = signal<RiesgoOption[]>([]);
  selectedMedidas = signal<Map<number, { cantidad: number; observacion_medida?: string | null }>>(
    new Map(),
  );

  gestion: GestionRecord = {};

  permissions = computed((): MedidasPermissions =>
    getMedidasPermissions(catalogStatusToUiStatus(this.workflowStatus)),
  );

  displayHint = computed((): string => {
    const ui = catalogStatusToUiStatus(this.workflowStatus);
    if (ui === 'En gestión OSEG' && this.osegGuardada()) {
      return 'Gestión OSEG registrada. Avance el estado a «Enviado a CERREM» en la pestaña Detalle.';
    }
    if (ui === 'En evaluación CERREM' && this.cerremGuardada() && !this.cerremEditing()) {
      return 'Decisión CERREM registrada. Avance a «Medidas asignadas» cuando corresponda.';
    }
    if (this.permissions().isReadOnly) {
      return 'Incidente cerrado: solo consulta de la información registrada.';
    }
    return '';
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['incidentId'] || changes['workflowStatus'] || changes['agency']) {
      void this.reload();
    }
  }

  canEditOseg(): boolean {
    return this.permissions().editGestionOseg && !this.osegGuardada();
  }

  canEditCerrem(): boolean {
    return (
      this.permissions().editDecisionCerrem &&
      (this.cerremEditing() || !this.cerremGuardada())
    );
  }

  canToggleCerremEdit(): boolean {
    return (
      this.permissions().showDecisionCerrem &&
      !this.permissions().isReadOnly &&
      this.cerremGuardada() &&
      this.permissions().editDecisionCerrem === false
    );
  }

  canEditMedidas(): boolean {
    return this.permissions().editMedidasFisicas;
  }

  canToggleMedidasEdit(): boolean {
    return (
      this.permissions().showMedidasFisicas &&
      !this.permissions().isReadOnly &&
      this.selectedMedidas().size > 0 &&
      !this.permissions().editMedidasFisicas
    );
  }

  toggleCerremEdit(): void {
    this.cerremEditing.update((v) => !v);
    this.mensajeCerrem.set(null);
  }

  toggleMedidasEdit(): void {
    this.medidasEditing.update((v) => !v);
    this.mensajeMedidas.set(null);
  }

  isMedidaSelected(id: number): boolean {
    return this.selectedMedidas().has(id);
  }

  toggleMedida(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Map(this.selectedMedidas());
    if (checked) next.set(id, { cantidad: 1 });
    else next.delete(id);
    this.selectedMedidas.set(next);
  }

  async saveOseg(): Promise<void> {
    if (!this.canEditOseg()) return;
    const tramite = String(this.gestion.tramite_destino ?? '').trim();
    if (!tramite) {
      this.mensajeOseg.set({ ok: false, text: 'Indique trámite/destino.' });
      return;
    }
    this.savingOseg.set(true);
    this.mensajeOseg.set(null);
    try {
      const resp = await firstValueFrom(
        this.http.post<{ codigo_oficio?: string }>(`/api/incidents/${this.incidentId}/gestion`, {
          servidor_judicial: this.gestion.servidor_judicial,
          cedula: this.gestion.cedula,
          cargo: this.gestion.cargo,
          tramite_destino: tramite,
        }),
      );
      if (resp?.codigo_oficio) {
        this.gestion.codigo_oficio = resp.codigo_oficio;
      }
      this.osegGuardada.set(true);
      this.mensajeOseg.set({ ok: true, text: 'Gestión OSEG guardada.' });
      await this.loadGestion();
    } catch (err: unknown) {
      this.mensajeOseg.set({ ok: false, text: this.readError(err, 'No se pudo guardar OSEG.') });
    } finally {
      this.savingOseg.set(false);
      this.cdr.markForCheck();
    }
  }

  async saveCerrem(): Promise<void> {
    if (!this.canEditCerrem()) return;
    if (!String(this.gestion.resolucion_cerrem ?? '').trim() || !this.gestion.ID_riesgo) {
      this.mensajeCerrem.set({ ok: false, text: 'Resolución y nivel de riesgo son obligatorios.' });
      return;
    }
    this.savingCerrem.set(true);
    this.mensajeCerrem.set(null);
    try {
      await firstValueFrom(
        this.http.post(`/api/incidents/${this.incidentId}/gestion`, {
          fecha_cerrem: this.gestion.fecha_cerrem || null,
          resolucion_cerrem: this.gestion.resolucion_cerrem,
          fecha_resolucion: this.gestion.fecha_resolucion || null,
          ID_riesgo: this.gestion.ID_riesgo,
          tipo_esquema: this.gestion.tipo_esquema,
          observaciones: this.gestion.observaciones,
        }),
      );
      this.cerremGuardada.set(true);
      this.cerremEditing.set(false);
      this.mensajeCerrem.set({ ok: true, text: 'Decisión CERREM guardada.' });
      await this.loadGestion();
    } catch (err: unknown) {
      this.mensajeCerrem.set({ ok: false, text: this.readError(err, 'No se pudo guardar CERREM.') });
    } finally {
      this.savingCerrem.set(false);
      this.cdr.markForCheck();
    }
  }

  async saveMedidas(): Promise<void> {
    if (!this.canEditMedidas()) return;
    const medidas = [...this.selectedMedidas()].map(([ID_tipo_medida, meta]) => ({
      ID_tipo_medida,
      cantidad: meta.cantidad,
      observacion_medida: meta.observacion_medida ?? null,
    }));
    if (!medidas.length) {
      this.mensajeMedidas.set({ ok: false, text: 'Seleccione al menos una medida.' });
      return;
    }
    this.savingMedidas.set(true);
    this.mensajeMedidas.set(null);
    try {
      await firstValueFrom(
        this.http.post(`/api/incidents/${this.incidentId}/medidas`, { medidas }),
      );
      this.medidasEditing.set(false);
      this.mensajeMedidas.set({ ok: true, text: 'Medidas de seguridad guardadas.' });
    } catch (err: unknown) {
      this.mensajeMedidas.set({
        ok: false,
        text: this.readError(err, 'No se pudieron guardar las medidas.'),
      });
    } finally {
      this.savingMedidas.set(false);
      this.cdr.markForCheck();
    }
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    this.mensajeOseg.set(null);
    this.mensajeCerrem.set(null);
    this.mensajeMedidas.set(null);
    try {
      await Promise.all([this.loadCatalogs(), this.loadGestion()]);
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  private async loadCatalogs(): Promise<void> {
    const [tipos, riesgos] = await Promise.all([
      firstValueFrom(this.http.get<TipoMedida[]>('/api/medidas/tipos')),
      firstValueFrom(this.http.get<RiesgoOption[]>('/api/catalog/riesgos')),
    ]);
    this.tiposMedida.set(tipos ?? []);
    this.riesgos.set(riesgos ?? []);
  }

  private async loadGestion(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<{ gestion: GestionRecord | null; medidas: MedidaAsignada[] }>(
        `/api/incidents/${this.incidentId}/medidas`,
      ),
    );
    this.gestion = { ...(data.gestion ?? {}) };
    this.osegGuardada.set(
      Boolean(String(this.gestion.codigo_oficio ?? '').trim()) &&
        Boolean(String(this.gestion.tramite_destino ?? '').trim()),
    );
    this.cerremGuardada.set(
      Boolean(String(this.gestion.resolucion_cerrem ?? '').trim()) &&
        Boolean(this.gestion.ID_riesgo),
    );
    const map = new Map<number, { cantidad: number; observacion_medida?: string | null }>();
    for (const m of data.medidas ?? []) {
      map.set(m.ID_tipo_medida, {
        cantidad: m.cantidad ?? 1,
        observacion_medida: m.observacion_medida,
      });
    }
    this.selectedMedidas.set(map);
    this.cerremEditing.set(false);
    this.medidasEditing.set(false);
  }

  private readError(err: unknown, fallback: string): string {
    if (typeof err !== 'object' || err === null || !('error' in err)) return fallback;
    const body = (err as { error?: { error?: { message?: string }; message?: string } }).error;
    return body?.error?.message || body?.message || fallback;
  }
}
