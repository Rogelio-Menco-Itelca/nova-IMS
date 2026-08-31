
const TRANSITIONS = {
  Nuevo: {
    next: [
      'En gestión OSEG',
      'En gestión UNP',
      'Reiteraciones',
      'En gestión Ponal',
      'Cerrado',
      'Cancelado',
    ],
    requiresMedidas: false,
  },
  'En gestión OSEG': {
    next: ['En gestión UNP', 'Reiteraciones', 'En gestión Ponal', 'Cerrado', 'Cancelado'],
    requiresMedidas: false,
    requiredFields: ['codigo_oficio'],
  },
  'En gestión UNP': {
    next: ['En gestión OSEG', 'Reiteraciones', 'En gestión Ponal', 'Cerrado', 'Cancelado'],
    requiresMedidas: false,
    requiredFields: ['resolucion_cerrem', 'ID_riesgo'],
  },
  Reiteraciones: {
    next: ['Reiteraciones', 'En gestión OSEG', 'En gestión UNP', 'En gestión Ponal', 'Cerrado', 'Cancelado'],
    requiresMedidas: false,
    requiresComment: true,
  },
  'En gestión Ponal': {
    next: ['En gestión OSEG', 'En gestión UNP', 'Reiteraciones', 'Cerrado', 'Cancelado'],
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

const WORKFLOW_RANK_CSJ = {
  Nuevo: 0,
  'En gestión OSEG': 1,
  Reiteraciones: 2,
  'En gestión UNP': 3,
  'En gestión Ponal': 4,
  Cerrado: 5,
  Cancelado: 5,
};

const WORKFLOW_RANK_POL = {
  Nuevo: 0,
  'En progreso': 1,
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

function isForwardStatusTransition(fromStatus, toStatus, agency) {
  if (!toStatus || fromStatus === toStatus) return true;

  const code = String(agency || 'CSJ')
    .trim()
    .toUpperCase();
  if (code !== 'POL') {
    if (isFinalState(fromStatus)) return false;
    if (toStatus === 'Nuevo') return false;
    return true;
  }

  const fromRank = statusWorkflowRank(fromStatus, agency);
  const toRank = statusWorkflowRank(toStatus, agency);
  if (fromRank === undefined || toRank === undefined) return true;

  return toRank > fromRank;
}

function getAllowedNextStates(currentStatus) {
  return TRANSITIONS[currentStatus]?.next ?? [];
}

function isTransitionAllowed(fromStatus, toStatus) {
  const allowed = getAllowedNextStates(fromStatus);
  return allowed.includes(toStatus);
}

function requiresMedidas(status) {
  return TRANSITIONS[status]?.requiresMedidas ?? false;
}

function isFinalState(status) {
  return TRANSITIONS[status]?.final ?? false;
}

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
