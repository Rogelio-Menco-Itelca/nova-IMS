export type IncidentStatus = string;

export interface MedidasPermissions {
  showGestionOseg: boolean;
  editGestionOseg: boolean;
  showDecisionCerrem: boolean;
  editDecisionCerrem: boolean;
  showMedidasFisicas: boolean;
  editMedidasFisicas: boolean;
  isReadOnly: boolean;
}

/** Estados del flujo CSJ en pestaña Medidas. */
export const CSJ_MEDIDAS_STATUSES = [
  'En gestión OSEG',
  'Enviado a CERREM',
  'En evaluación CERREM',
  'Medidas asignadas',
  'Cerrado',
] as const;

/** Agencia con flujo de medidas CSJ (pestaña visible). */
export function isCsjMedidasWorkflow(agency: string): boolean {
  return String(agency ?? '').trim().toUpperCase() === 'CSJ';
}

/** Estado pertenece al flujo CSJ de medidas. */
export function isCsjMedidasStatus(status: string): boolean {
  const value = String(status ?? '').trim();
  return (CSJ_MEDIDAS_STATUSES as readonly string[]).includes(value);
}

/** Al cambiar el estado del incidente, abrir pestaña Medidas automáticamente. */
export function shouldNavigateToMedidasTab(status: string): boolean {
  const value = String(status ?? '').trim();
  return (
    value === 'En gestión OSEG' ||
    value === 'En evaluación CERREM' ||
    value === 'Medidas asignadas'
  );
}

/** Mensaje contextual al navegar a Medidas según el estado. */
export function medidasTabHint(status: string): string {
  switch (String(status ?? '').trim()) {
    case 'En gestión OSEG':
      return 'Complete la gestión OSEG (oficio y trámite/destino) en esta pestaña.';
    case 'Enviado a CERREM':
      return 'Incidente enviado a CERREM. Avance a «En evaluación CERREM» cuando corresponda.';
    case 'En evaluación CERREM':
      return 'Registre la decisión CERREM (resolución y nivel de riesgo).';
    case 'Medidas asignadas':
      return 'Asigne al menos una medida de seguridad antes de guardar el incidente.';
    case 'Cerrado':
      return 'Consulte el historial de gestión registrado en las secciones disponibles.';
    default:
      return '';
  }
}

export function getMedidasPermissions(status: IncidentStatus): MedidasPermissions {
  switch (status) {
    case 'En gestión OSEG':
      return {
        showGestionOseg: true,
        editGestionOseg: true,
        showDecisionCerrem: false,
        editDecisionCerrem: false,
        showMedidasFisicas: false,
        editMedidasFisicas: false,
        isReadOnly: false,
      };
    case 'Enviado a CERREM':
      return {
        showGestionOseg: true,
        editGestionOseg: false,
        showDecisionCerrem: false,
        editDecisionCerrem: false,
        showMedidasFisicas: false,
        editMedidasFisicas: false,
        isReadOnly: false,
      };
    case 'En evaluación CERREM':
      return {
        showGestionOseg: true,
        editGestionOseg: false,
        showDecisionCerrem: true,
        editDecisionCerrem: true,
        showMedidasFisicas: false,
        editMedidasFisicas: false,
        isReadOnly: false,
      };
    case 'Medidas asignadas':
      return {
        showGestionOseg: true,
        editGestionOseg: false,
        showDecisionCerrem: true,
        editDecisionCerrem: false,
        showMedidasFisicas: true,
        editMedidasFisicas: true,
        isReadOnly: false,
      };
    case 'Cerrado':
    case 'Cancelado':
      return {
        showGestionOseg: true,
        editGestionOseg: false,
        showDecisionCerrem: true,
        editDecisionCerrem: false,
        showMedidasFisicas: true,
        editMedidasFisicas: false,
        isReadOnly: true,
      };
    default:
      return {
        showGestionOseg: false,
        editGestionOseg: false,
        showDecisionCerrem: false,
        editDecisionCerrem: false,
        showMedidasFisicas: false,
        editMedidasFisicas: false,
        isReadOnly: true,
      };
  }
}
