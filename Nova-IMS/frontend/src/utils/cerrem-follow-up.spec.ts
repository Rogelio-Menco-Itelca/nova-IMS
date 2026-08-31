import { describe, it, expect } from 'vitest';
import {
  calendarDaysSince,
  parseCerremDateOnly,
  daysSinceCerremEnvio,
  isFechaCerremAfterResolucion,
} from './cerrem-follow-up';

describe('parseCerremDateOnly', () => {
  it('parsea YYYY-MM-DD', () => {
    const d = parseCerremDateOnly('2026-07-01');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(6);
    expect(d?.getDate()).toBe(1);
  });
});

describe('calendarDaysSince', () => {
  it('cuenta días calendario completos', () => {
    const from = new Date(2026, 6, 1);
    const to = new Date(2026, 6, 5);
    expect(calendarDaysSince(from, to)).toBe(4);
  });

  it('mismo día = 0', () => {
    const d = new Date(2026, 6, 5, 15, 30);
    expect(calendarDaysSince(d, d)).toBe(0);
  });
});

describe('daysSinceCerremEnvio', () => {
  it('prioriza fecha CERREM sobre auditoría', () => {
    const asOf = new Date(2026, 6, 10);
    expect(
      daysSinceCerremEnvio({
        fechaCerrem: '2026-07-08',
        cerremPhaseSince: new Date(2026, 0, 1),
        asOf,
      }),
    ).toBe(2);
  });

  it('usa ingreso a evaluación CERREM si no hay fecha', () => {
    const ref = new Date(2026, 6, 3);
    const asOf = new Date(2026, 6, 5);
    expect(
      daysSinceCerremEnvio({
        fechaCerrem: null,
        cerremPhaseSince: ref,
        asOf,
      }),
    ).toBe(2);
  });
});

describe('isFechaCerremAfterResolucion', () => {
  it('es inválida si CERREM es posterior a resolución', () => {
    expect(isFechaCerremAfterResolucion('2024-12-05', '2024-05-12')).toBe(true);
  });

  it('permite el mismo día', () => {
    expect(isFechaCerremAfterResolucion('2024-05-12', '2024-05-12')).toBe(false);
  });

  it('permite CERREM anterior a resolución', () => {
    expect(isFechaCerremAfterResolucion('2024-02-12', '2024-05-12')).toBe(false);
  });

  it('no valida si falta alguna fecha', () => {
    expect(isFechaCerremAfterResolucion('2024-12-05', '')).toBe(false);
    expect(isFechaCerremAfterResolucion('', '2024-05-12')).toBe(false);
  });
});
