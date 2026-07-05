export interface MedidasDraftSnapshot {
  tramite_destino: string;
  fecha_cerrem: string;
  resolucion_cerrem: string;
  fecha_resolucion: string;
  ID_riesgo: number | null;
  tipo_esquema: string | null;
  compartido_con: string;
  observaciones: string;
  medidas: {
    ID_tipo_medida: number;
    cantidad: number;
    observacion_medida: string;
  }[];
}

export interface MedidasPendingContext {
  closed: boolean;
  osegGuardada: boolean;
  cerremGuardada: boolean;
  cerremEditMode: boolean;
  medidasGuardadas: boolean;
  medidasEditMode: boolean;
  showOsegBlock: boolean;
  showCerremBlock: boolean;
  showMedidasBlock: boolean;
}

function norm(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return '';
}

function normId(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function snapshotMedidasDraft(
  form: {
    tramite_destino?: string | null;
    fecha_cerrem?: string | null;
    resolucion_cerrem?: string | null;
    fecha_resolucion?: string | null;
    ID_riesgo?: number | null;
    tipo_esquema?: string | null;
    compartido_con?: string | null;
    observaciones?: string | null;
  },
  medidas: {
    ID_tipo_medida: number;
    cantidad?: number | null;
    observacion_medida?: string | null;
  }[],
): MedidasDraftSnapshot {
  return {
    tramite_destino: norm(form.tramite_destino),
    fecha_cerrem: norm(form.fecha_cerrem),
    resolucion_cerrem: norm(form.resolucion_cerrem),
    fecha_resolucion: norm(form.fecha_resolucion),
    ID_riesgo: normId(form.ID_riesgo),
    tipo_esquema: form.tipo_esquema ? String(form.tipo_esquema) : null,
    compartido_con: norm(form.compartido_con),
    observaciones: norm(form.observaciones),
    medidas: [...medidas]
      .map((m) => ({
        ID_tipo_medida: m.ID_tipo_medida,
        cantidad: Math.max(1, Number(m.cantidad) || 1),
        observacion_medida: norm(m.observacion_medida),
      }))
      .sort((a, b) => a.ID_tipo_medida - b.ID_tipo_medida),
  };
}

function osegChanged(current: MedidasDraftSnapshot, baseline: MedidasDraftSnapshot): boolean {
  return current.tramite_destino !== baseline.tramite_destino;
}

function cerremChanged(current: MedidasDraftSnapshot, baseline: MedidasDraftSnapshot): boolean {
  return (
    current.fecha_cerrem !== baseline.fecha_cerrem ||
    current.resolucion_cerrem !== baseline.resolucion_cerrem ||
    current.fecha_resolucion !== baseline.fecha_resolucion ||
    current.ID_riesgo !== baseline.ID_riesgo
  );
}

function medidasMetaChanged(current: MedidasDraftSnapshot, baseline: MedidasDraftSnapshot): boolean {
  return (
    current.tipo_esquema !== baseline.tipo_esquema ||
    current.compartido_con !== baseline.compartido_con ||
    current.observaciones !== baseline.observaciones
  );
}

function medidasListChanged(current: MedidasDraftSnapshot, baseline: MedidasDraftSnapshot): boolean {
  return JSON.stringify(current.medidas) !== JSON.stringify(baseline.medidas);
}

export function hasMedidasPanelPendingChanges(
  current: MedidasDraftSnapshot,
  baseline: MedidasDraftSnapshot | null,
  ctx: MedidasPendingContext,
): boolean {
  return pendingMedidasSections(current, baseline, ctx).length > 0;
}

export type MedidasPendingSection = 'oseg' | 'cerrem' | 'medidas';

export function pendingMedidasSections(
  current: MedidasDraftSnapshot,
  baseline: MedidasDraftSnapshot | null,
  ctx: MedidasPendingContext,
): MedidasPendingSection[] {
  if (ctx.closed || !baseline) return [];
  const sections: MedidasPendingSection[] = [];
  if (osegChanged(current, baseline) && ctx.showOsegBlock && !ctx.osegGuardada) {
    sections.push('oseg');
  }
  if (
    cerremChanged(current, baseline) &&
    ctx.showCerremBlock &&
    (!ctx.cerremGuardada || ctx.cerremEditMode)
  ) {
    sections.push('cerrem');
  }
  const medidasChanged = medidasListChanged(current, baseline) || medidasMetaChanged(current, baseline);
  if (
    medidasChanged &&
    ctx.showMedidasBlock &&
    (!ctx.medidasGuardadas || ctx.medidasEditMode)
  ) {
    sections.push('medidas');
  }
  return sections;
}
