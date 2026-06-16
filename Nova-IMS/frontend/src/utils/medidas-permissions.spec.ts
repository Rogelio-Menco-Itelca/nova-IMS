import { describe, it, expect } from 'vitest';
import {
  isCsjMedidasWorkflow,
  hasOsegGestionData,
  hasCerremGestionData,
  describeClosedReviewStages,
  resolveClosedMedidasPermissions,
  getMedidasPermissions,
  shouldNavigateToMedidasTab,
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
    expect(p.servidorJudicial).toBe('readonly');
    expect(p.oficioTramite).toBe('auto');
    expect(p.tramiteDestino).toBe('editable');
    expect(p.fechaCerrem).toBe('hidden');
    expect(p.canSaveGestion).toBe(true);
    expect(p.canSaveMedidas).toBe(false);
  });

  it('Enviado a CERREM: OSEG readonly y CERREM editable', () => {
    const p = getMedidasPermissions('Enviado a CERREM', 'CSJ');
    expect(p.showCerremBlock).toBe(true);
    expect(p.showMedidasBlock).toBe(false);
    expect(p.oficioTramite).toBe('readonly');
    expect(p.fechaCerrem).toBe('editable');
    expect(p.nivelRiesgo).toBe('editable');
    expect(p.medidasFisicas).toBe('hidden');
    expect(p.canSaveGestion).toBe(true);
    expect(p.canSaveMedidas).toBe(false);
  });

  it('En evaluación CERREM: misma matriz que Enviado a CERREM', () => {
    const p = getMedidasPermissions('En evaluación CERREM', 'CSJ');
    expect(p.showCerremBlock).toBe(true);
    expect(p.fechaCerrem).toBe('editable');
    expect(p.canSaveGestion).toBe(true);
  });

  it('Medidas asignadas: medidas físicas editables', () => {
    const p = getMedidasPermissions('Medidas asignadas', 'CSJ');
    expect(p.showMedidasBlock).toBe(true);
    expect(p.medidasFisicas).toBe('editable');
    expect(p.observaciones).toBe('readonly');
    expect(p.canSaveGestion).toBe(false);
    expect(p.canSaveMedidas).toBe(true);
  });

  it('Cerrado: todo readonly sin guardar', () => {
    const p = getMedidasPermissions('Cerrado', 'CSJ');
    expect(p.showPanel).toBe(true);
    expect(p.showMedidasBlock).toBe(true);
    expect(p.medidasFisicas).toBe('readonly');
    expect(p.canSaveGestion).toBe(false);
    expect(p.canSaveMedidas).toBe(false);
  });

  it('Cancelado: OSEG readonly, CERREM y medidas ocultos', () => {
    const p = getMedidasPermissions('Cancelado', 'CSJ');
    expect(p.showPanel).toBe(true);
    expect(p.showOsegBlock).toBe(true);
    expect(p.showCerremBlock).toBe(false);
    expect(p.showMedidasBlock).toBe(false);
    expect(p.fechaCerrem).toBe('hidden');
    expect(p.canSaveGestion).toBe(false);
  });
});

describe('shouldNavigateToMedidasTab', () => {
  it('navega en estados del flujo de medidas', () => {
    expect(shouldNavigateToMedidasTab('En gestión OSEG')).toBe(true);
    expect(shouldNavigateToMedidasTab('Enviado a CERREM')).toBe(true);
    expect(shouldNavigateToMedidasTab('En evaluación CERREM')).toBe(true);
    expect(shouldNavigateToMedidasTab('Medidas asignadas')).toBe(true);
  });

  it('no navega en Nuevo, Cerrado o Cancelado', () => {
    expect(shouldNavigateToMedidasTab('Nuevo')).toBe(false);
    expect(shouldNavigateToMedidasTab('Cerrado')).toBe(false);
    expect(shouldNavigateToMedidasTab('Cancelado')).toBe(false);
  });
});
