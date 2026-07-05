import { catalogStatusToUiStatus } from '../models/incident.model';
import {
  isRiesgoExtraordinario,
  isRiesgoOrdinario,
  requiresMedidasForRiesgo,
  type RiesgoGestionSnapshot,
} from './riesgo-nivel';

export type { RiesgoGestionSnapshot };

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

export interface GestionSnapshot extends RiesgoGestionSnapshot {
  codigo_oficio?: string | null;
  tramite_destino?: string | null;
  resolucion_cerrem?: string | null;
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

/** Matriz CSJ acordada: habilitación por estado del incidente y nivel de riesgo CERREM. */
export function getMedidasPermissions(
  status: string,
  agency = 'CSJ',
  gestion?: GestionSnapshot | null,
): MedidasPermissions {
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
      if (!isRiesgoExtraordinario(gestion)) {
        return {
          showPanel: true,
          showOsegBlock: true,
          showCerremBlock: true,
          showMedidasBlock: false,
          servidorJudicial: 'readonly',
          oficioTramite: 'readonly',
          tramiteDestino: 'readonly',
          fechaCerrem: 'readonly',
          resolucionCerrem: 'readonly',
          fechaResolucion: 'readonly',
          nivelRiesgo: 'readonly',
          tipoEsquema: 'readonly',
          observaciones: 'readonly',
          medidasFisicas: 'hidden',
          canSaveGestion: false,
          canSaveMedidas: false,
        };
      }
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

/** Pasos del flujo CSJ mostrados en la pestaña Medidas cuando el incidente aún está en «Nuevo». */
export const CSJ_MEDIADAS_WORKFLOW_STEPS = [
  'Nuevo',
  'En gestión OSEG',
  'Enviado a CERREM',
  'Medidas asignadas',
] as const;

export function isNuevoLockedMedidasPanel(status: string, agency = 'CSJ'): boolean {
  return isCsjMedidasWorkflow(agency) && catalogStatusToUiStatus(status) === 'Nuevo';
}

export function shouldNavigateToMedidasTab(status: string): boolean {
  const ui = catalogStatusToUiStatus(status);
  return (MEDIADAS_WORKFLOW_STATUSES as readonly string[]).includes(ui);
}

export function medidasTabHint(status: string, gestion?: GestionSnapshot | null): string {
  const ui = catalogStatusToUiStatus(status);
  switch (ui) {
    case 'En gestión OSEG':
      return 'Escriba el trámite/destino (a dónde se envía el oficio, ej. CERREM). El código de oficio se genera al abrir esta pestaña o al guardar.';
    case 'Enviado a CERREM':
      return 'La gestión OSEG quedó registrada. Complete la decisión CERREM o cierre el caso en «Cerrado» (pestaña Detalle).';
    case 'En evaluación CERREM':
      if (isRiesgoExtraordinario(gestion)) {
        return 'Riesgo Extraordinario: registre la decisión CERREM, pase a «Medidas asignadas» y asigne medidas antes de cerrar.';
      }
      if (isRiesgoOrdinario(gestion)) {
        return 'Riesgo Ordinario: registre la decisión CERREM y cierre el incidente en «Cerrado» sin medidas de seguridad.';
      }
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

export function requiresMedidasBeforeClose(gestion?: GestionSnapshot | null): boolean {
  return requiresMedidasForRiesgo(gestion);
}

/** Riesgo Ordinario ya guardado en CERREM (resolución + nivel de riesgo). */
export function isOrdinarioCerremGuardado(gestion?: GestionSnapshot | null): boolean {
  return hasCerremGestionData(gestion) && isRiesgoOrdinario(gestion);
}

/** Extraordinario ya guardado en CERREM. */
export function isExtraordinarioCerremGuardado(gestion?: GestionSnapshot | null): boolean {
  return hasCerremGestionData(gestion) && isRiesgoExtraordinario(gestion);
}

/** Filtra transiciones de estado CSJ según nivel de riesgo CERREM guardado. */
export function isCsjStatusChoiceAllowed(
  fromStatus: string,
  toStatus: string,
  gestion?: GestionSnapshot | null,
): boolean {
  const to = catalogStatusToUiStatus(toStatus);

  if (to === 'Medidas asignadas' && isOrdinarioCerremGuardado(gestion)) {
    return false;
  }

  const from = catalogStatusToUiStatus(fromStatus);
  if (from === 'En evaluación CERREM' && to === 'Cerrado' && isExtraordinarioCerremGuardado(gestion)) {
    return false;
  }

  return true;
}

export function getCsjStatusDisabledReason(
  fromStatus: string,
  toStatus: string,
  gestion?: GestionSnapshot | null,
): string | null {
  const to = catalogStatusToUiStatus(toStatus);
  if (to === 'Medidas asignadas' && isOrdinarioCerremGuardado(gestion)) {
    return 'Riesgo Ordinario guardado: no requiere medidas de seguridad. Cierre en «Cerrado».';
  }
  const from = catalogStatusToUiStatus(fromStatus);
  if (from === 'En evaluación CERREM' && to === 'Cerrado' && isExtraordinarioCerremGuardado(gestion)) {
    return 'Riesgo Extraordinario: asigne medidas antes de cerrar.';
  }
  return null;
}

export function statusOptionLabel(
  catalogName: string,
  _fromStatus: string,
  gestion?: GestionSnapshot | null,
  agency = 'CSJ',
): string {
  const label = catalogStatusToUiStatus(catalogName);
  if (
    !isCsjMedidasWorkflow(agency) ||
    catalogStatusToUiStatus(catalogName) !== 'Medidas asignadas' ||
    !isOrdinarioCerremGuardado(gestion)
  ) {
    return label;
  }
  return `${label} (no aplica — Ordinario)`;
}

export function medidasPanelLockedMessage(status: string, agency = 'CSJ'): string {
  if (!isCsjMedidasWorkflow(agency)) {
    return 'La gestión OSEG / CERREM aplica solo al flujo CSJ.';
  }

  const ui = catalogStatusToUiStatus(status);
  if (ui === 'Nuevo') {
    return 'En la pestaña Detalle cambie el estado a «En gestión OSEG» y guarde para habilitar OSEG, CERREM y medidas.';
  }

  return `Estado «${ui}». Esta pestaña se habilita desde «En gestión OSEG» en adelante.`;
}
