/**
 * Reglas de transición de estados para incidentes CSJ
 * Cada estado define a cuáles puede pasar y si requiere medidas
 */

const TRANSITIONS = {
  Nuevo: {
    next: ['En gestión OSEG', 'Cerrado', 'Cancelado'],
    requiresMedidas: false,
  },
  'En gestión OSEG': {
    next: ['En evaluación CERREM', 'Cerrado', 'Cancelado'],
    requiresMedidas: false,
    requiredFields: ['codigo_oficio'],
  },
  /** Legacy: casos históricos; ya no se ofrece en el selector CSJ. */
  'Enviado a CERREM': {
    next: ['En evaluación CERREM', 'Medidas asignadas', 'Cerrado', 'Cancelado'],
    requiresMedidas: false,
  },
  'En evaluación CERREM': {
    next: ['Reiteraciones', 'Medidas asignadas', 'Cerrado'],
    requiresMedidas: false,
    requiredFields: ['resolucion_cerrem', 'ID_riesgo'],
  },
  Reiteraciones: {
    next: ['Reiteraciones', 'Medidas asignadas'],
    requiresMedidas: false,
    requiresComment: true,
  },
  'Medidas asignadas': {
    next: ['Cerrado'],
    requiresMedidas: true,
  },
  Cerrado: {
    next: [],
    requiresMedidas: false,
    final: true,
  },
  Cancelado: {
    next: [],
    requiresMedidas: false,
    final: true,
  },
};

/** Orden del flujo CSJ: mayor número = más avanzado (solo hacia adelante). */
const WORKFLOW_RANK_CSJ = {
  Nuevo: 0,
  'En gestión OSEG': 1,
  'Enviado a CERREM': 2,
  'En evaluación CERREM': 3,
  Reiteraciones: 4,
  'Medidas asignadas': 5,
  Cerrado: 6,
  Cancelado: 6,
};

/** Orden del flujo POL. */
const WORKFLOW_RANK_POL = {
  Nuevo: 0,
  'En proceso': 1,
  Asignado: 2,
  'En camino': 3,
  Resuelto: 4,
  Cerrado: 4,
  Cancelado: 5,
};

function getWorkflowRanks(agency) {
  const code = String(agency || 'CSJ')
    .trim()
    .toUpperCase();
  return code === 'POL' ? WORKFLOW_RANK_POL : WORKFLOW_RANK_CSJ;
}

function statusWorkflowRank(status, agency) {
  const ranks = getWorkflowRanks(agency);
  return ranks[status];
}

/**
 * Solo permite avanzar en el flujo; nunca retroceder a un estado anterior.
 */
function isForwardStatusTransition(fromStatus, toStatus, agency) {
  if (!toStatus || fromStatus === toStatus) return true;

  const fromRank = statusWorkflowRank(fromStatus, agency);
  const toRank = statusWorkflowRank(toStatus, agency);
  if (fromRank === undefined || toRank === undefined) return true;

  return toRank > fromRank;
}

/**
 * Retorna los estados permitidos desde el estado actual
 */
function getAllowedNextStates(currentStatus) {
  return TRANSITIONS[currentStatus]?.next ?? [];
}

/**
 * Valida si una transición es permitida
 */
function isTransitionAllowed(fromStatus, toStatus) {
  const allowed = getAllowedNextStates(fromStatus);
  return allowed.includes(toStatus);
}

/**
 * Retorna si el estado requiere medidas asignadas
 */
function requiresMedidas(status) {
  return TRANSITIONS[status]?.requiresMedidas ?? false;
}

/**
 * Retorna si el estado es final (no puede transitar)
 */
function isFinalState(status) {
  return TRANSITIONS[status]?.final ?? false;
}

/**
 * Retorna los campos requeridos para entrar a un estado
 */
function getRequiredFields(toStatus) {
  return TRANSITIONS[toStatus]?.requiredFields ?? [];
}

function requiresComment(status) {
  return TRANSITIONS[status]?.requiresComment ?? false;
}

module.exports = {
  TRANSITIONS,
  WORKFLOW_RANK_CSJ,
  WORKFLOW_RANK_POL,
  getWorkflowRanks,
  statusWorkflowRank,
  isForwardStatusTransition,
  getAllowedNextStates,
  isTransitionAllowed,
  requiresMedidas,
  isFinalState,
  getRequiredFields,
  requiresComment,
};
