import { describe, it, expect } from 'vitest';
import {
  hasMedidasPanelPendingChanges,
  pendingMedidasSections,
  snapshotMedidasDraft,
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
});
