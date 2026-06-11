const TRANSITIONS = {
    Nuevo: {
      next: ['En gestión OSEG', 'Cancelado'],
      requiresMedidas: false,
    },
    'En gestión OSEG': {
      next: ['Enviado a CERREM', 'Cancelado'],
      requiresMedidas: false,
      requiredFields: ['codigo_oficio'],
    },
    'Enviado a CERREM': {
      next: ['En evaluación CERREM', 'Cancelado'],
      requiresMedidas: false,
    },
    'En evaluación CERREM': {
      next: ['Medidas asignadas', 'Cerrado'],
      requiresMedidas: false,
      requiredFields: ['resolucion_cerrem', 'ID_riesgo'],
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
    // POL
    Asignado: { next: ['En camino', 'Cancelado'], requiresMedidas: false },
    'En camino': { next: ['En situación', 'Cancelado'], requiresMedidas: false },
    'En situación': { next: ['Resuelto'], requiresMedidas: false },
    Resuelto: { next: [], requiresMedidas: false, final: true },
  };
  
  function getAllowedNextStates(currentStatus) {
    return TRANSITIONS[currentStatus]?.next ?? [];
  }
  
  function isTransitionAllowed(fromStatus, toStatus) {
    return getAllowedNextStates(fromStatus).includes(toStatus);
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
  
  module.exports = {
    TRANSITIONS,
    getAllowedNextStates,
    isTransitionAllowed,
    requiresMedidas,
    isFinalState,
    getRequiredFields,
  };