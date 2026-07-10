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

type MedidaEntry = MedidasDraftSnapshot['medidas'][number];

function describeSingleMedidaDelta(
  afterM: MedidaEntry,
  beforeM: MedidaEntry | undefined,
  nombre: string,
): string | null {
  if (!beforeM) {
    return afterM.cantidad > 1 ? `${afterM.cantidad}× ${nombre}` : nombre;
  }

  const qtyDelta = afterM.cantidad - beforeM.cantidad;
  if (qtyDelta > 0) {
    return qtyDelta > 1 ? `${qtyDelta}× ${nombre}` : nombre;
  }
  if (qtyDelta < 0) {
    return `−${Math.abs(qtyDelta)}× ${nombre}`;
  }
  if (afterM.observacion_medida !== beforeM.observacion_medida) {
    return `${nombre} (observación actualizada)`;
  }
  return null;
}

function describeEsquemaDelta(
  before: MedidasDraftSnapshot | null,
  after: MedidasDraftSnapshot,
): string | null {
  if (before && after.tipo_esquema !== before.tipo_esquema && after.tipo_esquema) {
    return `Esquema: ${after.tipo_esquema}`;
  }
  return null;
}

/** Texto de lo que cambió en este guardado (solo delta, no el listado completo). */
export function describeMedidasSaveDelta(
  before: MedidasDraftSnapshot | null,
  after: MedidasDraftSnapshot,
  resolveName: (id: number) => string,
): string | null {
  const beforeList = before?.medidas ?? [];
  const beforeMap = new Map(beforeList.map((m) => [m.ID_tipo_medida, m]));
  const parts: string[] = [];

  for (const afterM of after.medidas) {
    const beforeM = beforeMap.get(afterM.ID_tipo_medida);
    const nombre = resolveName(afterM.ID_tipo_medida).trim() || `Medida ${afterM.ID_tipo_medida}`;
    const desc = describeSingleMedidaDelta(afterM, beforeM, nombre);
    if (desc) parts.push(desc);
  }

  const esquemaDesc = describeEsquemaDelta(before, after);
  if (esquemaDesc) parts.push(esquemaDesc);

  if (!parts.length) return null;
  if (parts.length <= 4) return parts.join(', ');
  return `${parts.slice(0, 4).join(', ')} (+${parts.length - 4} más)`;
}

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
