import { describe, it, expect } from 'vitest';
import {
  isCsjMedidasWorkflow,
  hasOsegGestionData,
  hasCerremGestionData,
  describeClosedReviewStages,
  resolveClosedMedidasPermissions,
  getMedidasPermissions,
  shouldNavigateToMedidasTab,
  isCsjStatusChoiceAllowed,
  isOrdinarioCerremGuardado,
  requiresMedidasBeforeClose,
  getCsjStatusDisabledReason,
  statusOptionLabel,
  type MedidasPermissions,
} from './medidas-permissions';

function expectHidden(p: MedidasPermissions) {
  expect(p.showPanel).toBe(false);
  expect(p.showOsegBlock).toBe(false);
  expect(p.showCerremBlock).toBe(false);
  expect(p.showMedidasBlock).toBe(false);
  expect(p.canSaveGestion).toBe(false);
  expect(p.canSaveMedidas).toBe(false);
}

const ordinarioGuardado = {
  resolucion_cerrem: 'RES-1',
  ID_riesgo: 1,
  nivel_riesgo: 'Ordinario',
};

const extraordinarioGuardado = {
  resolucion_cerrem: 'RES-2',
  ID_riesgo: 2,
  nivel_riesgo: 'Extraordinario',
};

describe('isCsjMedidasWorkflow', () => {
  it('acepta CSJ en distintas mayúsculas', () => {
    expect(isCsjMedidasWorkflow('CSJ')).toBe(true);
    expect(isCsjMedidasWorkflow('csj')).toBe(true);
    expect(isCsjMedidasWorkflow(' Csj ')).toBe(true);
  });

  it('rechaza otras agencias', () => {
    expect(isCsjMedidasWorkflow('POL')).toBe(false);
    expect(isCsjMedidasWorkflow('CENTRAL')).toBe(false);
  });
});

describe('hasOsegGestionData', () => {
  it('requiere oficio y trámite destino', () => {
    expect(hasOsegGestionData({ codigo_oficio: 'OF-1', tramite_destino: 'CERREM' })).toBe(true);
    expect(hasOsegGestionData({ codigo_oficio: 'OF-1' })).toBe(false);
    expect(hasOsegGestionData(null)).toBe(false);
  });
});

describe('hasCerremGestionData', () => {
  it('requiere resolución y nivel de riesgo', () => {
    expect(hasCerremGestionData({ resolucion_cerrem: 'RES-1', ID_riesgo: 2 })).toBe(true);
    expect(hasCerremGestionData({ resolucion_cerrem: 'RES-1' })).toBe(false);
    expect(hasCerremGestionData({ ID_riesgo: 2 })).toBe(false);
  });
});

describe('isOrdinarioCerremGuardado', () => {
  it('requiere CERREM guardado con riesgo Ordinario', () => {
    expect(isOrdinarioCerremGuardado(ordinarioGuardado)).toBe(true);
    expect(isOrdinarioCerremGuardado(extraordinarioGuardado)).toBe(false);
    expect(isOrdinarioCerremGuardado({ ID_riesgo: 1 })).toBe(false);
  });
});

describe('isCsjStatusChoiceAllowed', () => {
  it('Ordinario guardado: bloquea Medidas asignadas desde cualquier estado', () => {
    expect(
      isCsjStatusChoiceAllowed('En evaluación CERREM', 'Medidas asignadas', ordinarioGuardado),
    ).toBe(false);
    expect(
      isCsjStatusChoiceAllowed('En evaluación CERREM', 'Medidas asignadas', ordinarioGuardado),
    ).toBe(false);
    expect(isCsjStatusChoiceAllowed('En evaluación CERREM', 'Cerrado', ordinarioGuardado)).toBe(
      true,
    );
  });

  it('sin CERREM guardado: no bloquea Medidas asignadas aún', () => {
    expect(isCsjStatusChoiceAllowed('En evaluación CERREM', 'Medidas asignadas', null)).toBe(true);
    expect(
      isCsjStatusChoiceAllowed('En evaluación CERREM', 'Medidas asignadas', { ID_riesgo: 1 }),
    ).toBe(true);
  });

  it('Extraordinario guardado: bloquea Cerrado directo desde CERREM', () => {
    expect(
      isCsjStatusChoiceAllowed('En evaluación CERREM', 'Cerrado', extraordinarioGuardado),
    ).toBe(false);
    expect(
      isCsjStatusChoiceAllowed('En evaluación CERREM', 'Medidas asignadas', extraordinarioGuardado),
    ).toBe(true);
  });

  it('Extraordinario guardado: bloquea Cerrado directo desde Reiteraciones', () => {
    expect(isCsjStatusChoiceAllowed('Reiteraciones', 'Cerrado', extraordinarioGuardado)).toBe(
      false,
    );
  });

  it('Ordinario guardado: bloquea Reiteraciones', () => {
    expect(
      isCsjStatusChoiceAllowed('En evaluación CERREM', 'Reiteraciones', ordinarioGuardado),
    ).toBe(false);
  });

  it('Extraordinario guardado: permite Reiteraciones desde CERREM', () => {
    expect(
      isCsjStatusChoiceAllowed('En evaluación CERREM', 'Reiteraciones', extraordinarioGuardado),
    ).toBe(true);
    expect(
      isCsjStatusChoiceAllowed('Reiteraciones', 'Reiteraciones', extraordinarioGuardado),
    ).toBe(true);
  });
});

describe('statusOptionLabel', () => {
  it('marca Medidas asignadas como no aplicable con Ordinario guardado', () => {
    expect(
      statusOptionLabel('Medidas asignadas', 'En evaluación CERREM', ordinarioGuardado, 'CSJ'),
    ).toContain('no aplica');
  });

  it('marca Reiteraciones como no aplicable con Ordinario guardado', () => {
    expect(
      statusOptionLabel('Reiteraciones', 'En evaluación CERREM', ordinarioGuardado, 'CSJ'),
    ).toContain('no aplica');
  });
});

describe('getCsjStatusDisabledReason', () => {
  it('explica bloqueo de Medidas asignadas con Ordinario guardado', () => {
    expect(
      getCsjStatusDisabledReason('En evaluación CERREM', 'Medidas asignadas', ordinarioGuardado),
    ).toContain('Ordinario');
  });
});

describe('describeClosedReviewStages', () => {
  it('enumera etapas registradas', () => {
    const text = describeClosedReviewStages(
      { codigo_oficio: 'OF-1', tramite_destino: 'CERREM', resolucion_cerrem: 'R-1', ID_riesgo: 1 },
      2,
    );
    expect(text).toContain('Gestión OSEG');
    expect(text).toContain('Decisión CERREM');
    expect(text).toContain('Medidas de seguridad');
  });

  it('devuelve cadena vacía sin datos', () => {
    expect(describeClosedReviewStages(null, 0)).toBe('');
  });
});

describe('resolveClosedMedidasPermissions', () => {
  it('muestra panel vacío si no hay datos guardados', () => {
    const p = resolveClosedMedidasPermissions(null, 0);
    expect(p.showPanel).toBe(true);
    expect(p.showOsegBlock).toBe(false);
    expect(p.canSaveGestion).toBe(false);
  });

  it('muestra bloques readonly según datos guardados', () => {
    const p = resolveClosedMedidasPermissions(
      { codigo_oficio: 'OF-1', tramite_destino: 'CERREM' },
      0,
    );
    expect(p.showOsegBlock).toBe(true);
    expect(p.oficioTramite).toBe('readonly');
    expect(p.medidasFisicas).toBe('hidden');
  });
});

describe('getMedidasPermissions — agencia no CSJ', () => {
  it('oculta todo el panel', () => {
    const p = getMedidasPermissions('En gestión OSEG', 'POL');
    expectHidden(p);
  });
});

describe('getMedidasPermissions — flujo CSJ', () => {
  it('Nuevo: panel oculto', () => {
    expectHidden(getMedidasPermissions('Nuevo', 'CSJ'));
  });

  it('En gestión OSEG: solo bloque OSEG editable', () => {
    const p = getMedidasPermissions('En gestión OSEG', 'CSJ');
    expect(p.showPanel).toBe(true);
    expect(p.showOsegBlock).toBe(true);
    expect(p.showCerremBlock).toBe(false);
    expect(p.showMedidasBlock).toBe(false);
    expect(p.canSaveGestion).toBe(true);
    expect(p.canSaveMedidas).toBe(false);
  });

  it('Medidas asignadas: solo Extraordinario habilita medidas físicas', () => {
    const p = getMedidasPermissions('Medidas asignadas', 'CSJ', extraordinarioGuardado);
    expect(p.showMedidasBlock).toBe(true);
    expect(p.medidasFisicas).toBe('editable');
    expect(p.tipoEsquema).toBe('editable');
    expect(p.observaciones).toBe('editable');
    expect(p.canSaveMedidas).toBe(true);
  });

  it('En evaluación CERREM: esquema y observaciones ocultos hasta medidas', () => {
    const p = getMedidasPermissions('En evaluación CERREM', 'CSJ');
    expect(p.tipoEsquema).toBe('hidden');
    expect(p.observaciones).toBe('hidden');
    expect(p.resolucionCerrem).toBe('editable');
  });

  it('Medidas asignadas: Ordinario no habilita medidas físicas', () => {
    const p = getMedidasPermissions('Medidas asignadas', 'CSJ', ordinarioGuardado);
    expect(p.showMedidasBlock).toBe(false);
    expect(p.canSaveMedidas).toBe(false);
  });
});

describe('requiresMedidasBeforeClose', () => {
  it('solo Extraordinario exige medidas al cerrar', () => {
    expect(requiresMedidasBeforeClose(extraordinarioGuardado)).toBe(true);
    expect(requiresMedidasBeforeClose(ordinarioGuardado)).toBe(false);
  });
});

describe('shouldNavigateToMedidasTab', () => {
  it('navega en estados del flujo de medidas', () => {
    expect(shouldNavigateToMedidasTab('En gestión OSEG')).toBe(true);
    expect(shouldNavigateToMedidasTab('En evaluación CERREM')).toBe(true);
    expect(shouldNavigateToMedidasTab('Medidas asignadas')).toBe(true);
  });

  it('no navega en Reiteraciones (panel en Detalle)', () => {
    expect(shouldNavigateToMedidasTab('Reiteraciones')).toBe(false);
  });

  it('no navega en Nuevo, Cerrado o Cancelado', () => {
    expect(shouldNavigateToMedidasTab('Nuevo')).toBe(false);
    expect(shouldNavigateToMedidasTab('Cerrado')).toBe(false);
  });
});
