import { describe, it, expect } from 'vitest';
import {
  hasMedidasPanelPendingChanges,
  labelsForPendingMedidasSections,
  pendingMedidasSections,
  snapshotMedidasDraft,
  describeMedidasSaveDelta,
  type MedidasPendingContext,
} from './medidas-pending-changes';

const baseCtx: MedidasPendingContext = {
  closed: false,
  osegGuardada: false,
  cerremGuardada: false,
  cerremEditMode: false,
  medidasGuardadas: false,
  medidasEditMode: false,
  showOsegBlock: true,
  showCerremBlock: true,
  showMedidasBlock: true,
};

describe('hasMedidasPanelPendingChanges', () => {
  it('detecta oficio OSEG sin guardar', () => {
    const baseline = snapshotMedidasDraft({}, []);
    const current = snapshotMedidasDraft({ codigo_oficio: 'OSEG-MANUAL-1' }, []);
    expect(hasMedidasPanelPendingChanges(current, baseline, baseCtx)).toBe(true);
  });

  it('detecta trámite OSEG sin guardar', () => {
    const baseline = snapshotMedidasDraft({}, []);
    const current = snapshotMedidasDraft({ tramite_destino: 'UNP' }, []);
    expect(hasMedidasPanelPendingChanges(current, baseline, baseCtx)).toBe(true);
  });

  it('no alerta si OSEG ya está guardada', () => {
    const baseline = snapshotMedidasDraft({ tramite_destino: 'UNP' }, []);
    const current = snapshotMedidasDraft({ tramite_destino: 'UNP' }, []);
    expect(
      hasMedidasPanelPendingChanges(current, baseline, { ...baseCtx, osegGuardada: true }),
    ).toBe(false);
  });

  it('detecta edición CERREM en modo editar', () => {
    const baseline = snapshotMedidasDraft(
      { resolucion_cerrem: 'Aprobado', ID_riesgo: 2 },
      [],
    );
    const current = snapshotMedidasDraft(
      { resolucion_cerrem: 'Aprobado con observaciones', ID_riesgo: 2 },
      [],
    );
    expect(
      hasMedidasPanelPendingChanges(current, baseline, {
        ...baseCtx,
        osegGuardada: true,
        cerremGuardada: true,
        cerremEditMode: true,
        showOsegBlock: false,
      }),
    ).toBe(true);
  });

  it('detecta medidas sin guardar', () => {
    const baseline = snapshotMedidasDraft({}, []);
    const current = snapshotMedidasDraft(
      {},
      [{ ID_tipo_medida: 1, cantidad: 1, observacion_medida: '' }],
    );
    expect(
      hasMedidasPanelPendingChanges(current, baseline, {
        ...baseCtx,
        osegGuardada: true,
        cerremGuardada: true,
        showOsegBlock: false,
        showCerremBlock: false,
      }),
    ).toBe(true);
  });
});

describe('describeMedidasSaveDelta', () => {
  const names = new Map([
    [1, 'Hombre de protección'],
    [2, 'Vehículo blindado'],
    [3, 'Medio de comunicación'],
  ]);
  const resolveName = (id: number) => names.get(id) ?? '';

  it('solo muestra medidas nuevas o incrementadas en este guardado', () => {
    const before = snapshotMedidasDraft(
      {},
      [
        { ID_tipo_medida: 2, cantidad: 1, observacion_medida: '' },
        { ID_tipo_medida: 3, cantidad: 1, observacion_medida: '' },
      ],
    );
    const after = snapshotMedidasDraft(
      {},
      [
        { ID_tipo_medida: 1, cantidad: 2, observacion_medida: '' },
        { ID_tipo_medida: 2, cantidad: 1, observacion_medida: '' },
        { ID_tipo_medida: 3, cantidad: 1, observacion_medida: '' },
      ],
    );
    expect(describeMedidasSaveDelta(before, after, resolveName)).toBe('2× Hombre de protección');
  });
});

describe('pendingMedidasSections', () => {
  it('ordena secciones pendientes', () => {
    const baseline = snapshotMedidasDraft({}, []);
    const current = snapshotMedidasDraft(
      {
        tramite_destino: 'UNP',
        resolucion_cerrem: 'Ok',
        ID_riesgo: 1,
      },
      [{ ID_tipo_medida: 2, cantidad: 1, observacion_medida: '' }],
    );
    expect(pendingMedidasSections(current, baseline, baseCtx)).toEqual([
      'oseg',
      'cerrem',
      'medidas',
    ]);
  });

  it('incluye medidas aunque ya estén guardadas (sin modo edición)', () => {
    const baseline = snapshotMedidasDraft(
      { tipo_esquema: 'Individual' },
      [{ ID_tipo_medida: 2, cantidad: 1, observacion_medida: '' }],
    );
    const current = snapshotMedidasDraft(
      { tipo_esquema: 'Colectivo', observaciones: 'Nueva nota' },
      [{ ID_tipo_medida: 2, cantidad: 3, observacion_medida: 'Obs' }],
    );
    const ctx: MedidasPendingContext = {
      ...baseCtx,
      medidasGuardadas: true,
      medidasEditMode: false,
      showOsegBlock: false,
      showCerremBlock: false,
      showMedidasBlock: true,
    };
    expect(pendingMedidasSections(current, baseline, ctx)).toEqual(['medidas']);
  });
});

describe('labelsForPendingMedidasSections', () => {
  it('devuelve etiquetas legibles por sección', () => {
    const baseline = snapshotMedidasDraft({}, []);
    const current = snapshotMedidasDraft({ tramite_destino: 'UNP' }, []);
    const ctx: MedidasPendingContext = {
      closed: false,
      osegGuardada: false,
      cerremGuardada: false,
      cerremEditMode: false,
      medidasGuardadas: false,
      medidasEditMode: false,
      showOsegBlock: true,
      showCerremBlock: false,
      showMedidasBlock: false,
    };
    expect(labelsForPendingMedidasSections(current, baseline, ctx)).toEqual([
      'Gestión OSEG (oficio / trámite)',
    ]);
  });
});
