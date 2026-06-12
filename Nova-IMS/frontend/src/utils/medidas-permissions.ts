import { catalogStatusToUiStatus } from '../models/incident.model';

export type MedidasFieldMode = 'hidden' | 'readonly' | 'editable' | 'auto';

export interface MedidasPermissions {
  showPanel: boolean;
  showOsegBlock: boolean;
  showCerremBlock: boolean;
  showMedidasBlock: boolean;
  servidorJudicial: MedidasFieldMode;
  oficioTramite: MedidasFieldMode;
  tramiteDestino: MedidasFieldMode;
  fechaCerrem: MedidasFieldMode;
  resolucionCerrem: MedidasFieldMode;
  fechaResolucion: MedidasFieldMode;
  nivelRiesgo: MedidasFieldMode;
  tipoEsquema: MedidasFieldMode;
  observaciones: MedidasFieldMode;
  medidasFisicas: MedidasFieldMode;
  canSaveGestion: boolean;
  canSaveMedidas: boolean;
}

const HIDDEN: MedidasPermissions = {
  showPanel: false,
  showOsegBlock: false,
  showCerremBlock: false,
  showMedidasBlock: false,
  servidorJudicial: 'hidden',
  oficioTramite: 'hidden',
  tramiteDestino: 'hidden',
  fechaCerrem: 'hidden',
  resolucionCerrem: 'hidden',
  fechaResolucion: 'hidden',
  nivelRiesgo: 'hidden',
  tipoEsquema: 'hidden',
  observaciones: 'hidden',
  medidasFisicas: 'hidden',
  canSaveGestion: false,
  canSaveMedidas: false,
};

export function isCsjMedidasWorkflow(agency: string): boolean {
  return String(agency ?? '').trim().toUpperCase() === 'CSJ';
}

export interface GestionSnapshot {
  codigo_oficio?: string | null;
  tramite_destino?: string | null;
  resolucion_cerrem?: string | null;
  ID_riesgo?: number | null;
}

export function hasOsegGestionData(gestion: GestionSnapshot | null | undefined): boolean {
  return (
    Boolean(String(gestion?.codigo_oficio ?? '').trim()) &&
    Boolean(String(gestion?.tramite_destino ?? '').trim())
  );
}

export function hasCerremGestionData(gestion: GestionSnapshot | null | undefined): boolean {
  return (
    Boolean(String(gestion?.resolucion_cerrem ?? '').trim()) &&
    Boolean(gestion?.ID_riesgo)
  );
}

/** Etapas del flujo que quedaron con datos guardados (vista de casos cerrados). */
export function describeClosedReviewStages(
  gestion: GestionSnapshot | null | undefined,
  medidasCount: number,
): string {
  const stages: string[] = [];
  if (hasOsegGestionData(gestion)) stages.push('Gestión OSEG');
  if (hasCerremGestionData(gestion)) stages.push('Decisión CERREM');
  if (medidasCount > 0) stages.push('Medidas de seguridad');
  if (!stages.length) return '';
  return `Etapas registradas: ${stages.join(' · ')}.`;
}

/**
 * Incidente cerrado/cancelado: solo bloques con datos guardados.
 * Flujo acumulativo: CERREM muestra OSEG+CERREM; medidas muestra cada etapa registrada.
 */
export function resolveClosedMedidasPermissions(
  gestion: GestionSnapshot | null | undefined,
  medidasCount: number,
): MedidasPermissions {
  const hasOseg = hasOsegGestionData(gestion);
  const hasCerrem = hasCerremGestionData(gestion);
  const hasMedidas = medidasCount > 0;
  const readonly = 'readonly' as MedidasFieldMode;
  const hidden = 'hidden' as MedidasFieldMode;

  const showOsegBlock = hasOseg;
  const showCerremBlock = hasCerrem;
  const showMedidasBlock = hasMedidas;

  if (!showOsegBlock && !showCerremBlock && !showMedidasBlock) {
    return { ...HIDDEN, showPanel: true };
  }

  return {
    showPanel: true,
    showOsegBlock,
    showCerremBlock,
    showMedidasBlock,
    servidorJudicial: hasOseg ? readonly : hidden,
    oficioTramite: hasOseg ? readonly : hidden,
    tramiteDestino: hasOseg ? readonly : hidden,
    fechaCerrem: hasCerrem ? readonly : hidden,
    resolucionCerrem: hasCerrem ? readonly : hidden,
    fechaResolucion: hasCerrem ? readonly : hidden,
    nivelRiesgo: hasCerrem ? readonly : hidden,
    tipoEsquema: hasCerrem ? readonly : hidden,
    observaciones: hasCerrem ? readonly : hidden,
    medidasFisicas: hasMedidas ? readonly : hidden,
    canSaveGestion: false,
    canSaveMedidas: false,
  };
}

export function isClosedWorkflowStatus(status: string): boolean {
  const ui = catalogStatusToUiStatus(status);
  return ui === 'Cerrado' || ui === 'Cancelado';
}

/** Matriz CSJ acordada: habilitación por estado del incidente. */
export function getMedidasPermissions(status: string, agency = 'CSJ'): MedidasPermissions {
  if (!isCsjMedidasWorkflow(agency)) {
    return { ...HIDDEN, showPanel: false };
  }

  const ui = catalogStatusToUiStatus(status);

  switch (ui) {
    case 'Nuevo':
      return { ...HIDDEN };

    case 'En gestión OSEG':
      return {
        showPanel: true,
        showOsegBlock: true,
        showCerremBlock: false,
        showMedidasBlock: false,
        servidorJudicial: 'readonly',
        oficioTramite: 'auto',
        tramiteDestino: 'editable',
        fechaCerrem: 'hidden',
        resolucionCerrem: 'hidden',
        fechaResolucion: 'hidden',
        nivelRiesgo: 'hidden',
        tipoEsquema: 'hidden',
        observaciones: 'hidden',
        medidasFisicas: 'hidden',
        canSaveGestion: true,
        canSaveMedidas: false,
      };

    case 'Enviado a CERREM':
      return {
        showPanel: true,
        showOsegBlock: true,
        showCerremBlock: true,
        showMedidasBlock: false,
        servidorJudicial: 'readonly',
        oficioTramite: 'readonly',
        tramiteDestino: 'readonly',
        fechaCerrem: 'editable',
        resolucionCerrem: 'editable',
        fechaResolucion: 'editable',
        nivelRiesgo: 'editable',
        tipoEsquema: 'editable',
        observaciones: 'editable',
        medidasFisicas: 'hidden',
        canSaveGestion: true,
        canSaveMedidas: false,
      };

    case 'En evaluación CERREM':
      return {
        showPanel: true,
        showOsegBlock: true,
        showCerremBlock: true,
        showMedidasBlock: false,
        servidorJudicial: 'readonly',
        oficioTramite: 'readonly',
        tramiteDestino: 'readonly',
        fechaCerrem: 'editable',
        resolucionCerrem: 'editable',
        fechaResolucion: 'editable',
        nivelRiesgo: 'editable',
        tipoEsquema: 'editable',
        observaciones: 'editable',
        medidasFisicas: 'hidden',
        canSaveGestion: true,
        canSaveMedidas: false,
      };

    case 'Medidas asignadas':
      return {
        showPanel: true,
        showOsegBlock: true,
        showCerremBlock: true,
        showMedidasBlock: true,
        servidorJudicial: 'readonly',
        oficioTramite: 'readonly',
        tramiteDestino: 'readonly',
        fechaCerrem: 'readonly',
        resolucionCerrem: 'readonly',
        fechaResolucion: 'readonly',
        nivelRiesgo: 'readonly',
        tipoEsquema: 'readonly',
        observaciones: 'readonly',
        medidasFisicas: 'editable',
        canSaveGestion: false,
        canSaveMedidas: true,
      };

    case 'Cerrado':
      return {
        showPanel: true,
        showOsegBlock: true,
        showCerremBlock: true,
        showMedidasBlock: true,
        servidorJudicial: 'readonly',
        oficioTramite: 'readonly',
        tramiteDestino: 'readonly',
        fechaCerrem: 'readonly',
        resolucionCerrem: 'readonly',
        fechaResolucion: 'readonly',
        nivelRiesgo: 'readonly',
        tipoEsquema: 'readonly',
        observaciones: 'readonly',
        medidasFisicas: 'readonly',
        canSaveGestion: false,
        canSaveMedidas: false,
      };

    case 'Cancelado':
      return {
        showPanel: true,
        showOsegBlock: true,
        showCerremBlock: false,
        showMedidasBlock: false,
        servidorJudicial: 'readonly',
        oficioTramite: 'readonly',
        tramiteDestino: 'readonly',
        fechaCerrem: 'hidden',
        resolucionCerrem: 'hidden',
        fechaResolucion: 'hidden',
        nivelRiesgo: 'hidden',
        tipoEsquema: 'hidden',
        observaciones: 'hidden',
        medidasFisicas: 'hidden',
        canSaveGestion: false,
        canSaveMedidas: false,
      };

    default:
      return { ...HIDDEN, showPanel: true };
  }
}

export const MEDIADAS_WORKFLOW_STATUSES = [
  'En gestión OSEG',
  'Enviado a CERREM',
  'En evaluación CERREM',
  'Medidas asignadas',
] as const;

export function shouldNavigateToMedidasTab(status: string): boolean {
  const ui = catalogStatusToUiStatus(status);
  return (MEDIADAS_WORKFLOW_STATUSES as readonly string[]).includes(ui);
}

export function medidasTabHint(status: string): string {
  const ui = catalogStatusToUiStatus(status);
  switch (ui) {
    case 'En gestión OSEG':
      return 'Escriba el trámite/destino (a dónde se envía el oficio, ej. CERREM). El código de oficio se genera al abrir esta pestaña o al guardar.';
    case 'Enviado a CERREM':
      return 'La gestión OSEG quedó registrada. Complete la decisión CERREM o cierre el caso en «Cerrado» (pestaña Detalle).';
    case 'En evaluación CERREM':
      return 'Registre la decisión CERREM: fechas, resolución y nivel de riesgo.';
    case 'Medidas asignadas':
      return 'Asigne al menos una medida de seguridad y pulse «Asignar medidas» antes de actualizar el incidente.';
    case 'Cerrado':
    case 'Cancelado':
      return 'Historial del caso. Solo se muestran las etapas que quedaron registradas antes del cierre.';
    default:
      return '';
  }
}
