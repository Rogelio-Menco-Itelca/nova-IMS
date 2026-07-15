import { describe, expect, it } from 'vitest';
import {
  clampLatLngToColombia,
  IMS_COLOMBIA_BOUNDS,
  isLatLngWithinColombia,
  toInternationalColombianPhone,
  toLocalColombianPhone,
  validateColombianPhone,
} from './ims-geo.constants';

const SAMPLE_LOCAL = '3001234567';
const SAMPLE_INTL = '573001234567';

describe('ims-geo.constants', () => {
  describe('mapa Colombia', () => {
    it('isLatLngWithinColombia acepta puntos en territorio nacional', () => {
      expect(isLatLngWithinColombia(4.60971, -74.08175)).toBe(true);
      expect(isLatLngWithinColombia(12.5847, -81.7005)).toBe(true);
    });

    it('isLatLngWithinColombia rechaza puntos fuera de fronteras', () => {
      expect(isLatLngWithinColombia(40.0, -74.0)).toBe(false);
      expect(isLatLngWithinColombia(4.0, -120.0)).toBe(false);
    });

    it('clampLatLngToColombia limita al encuadre nacional', () => {
      const out = clampLatLngToColombia(50, -120);
      expect(out.lat).toBe(IMS_COLOMBIA_BOUNDS.north);
      expect(out.lng).toBe(IMS_COLOMBIA_BOUNDS.west);
    });
  });

  describe('teléfono Colombia', () => {
    it('toLocalColombianPhone quita indicativo 57', () => {
      expect(toLocalColombianPhone(`+${SAMPLE_INTL}`)).toBe(SAMPLE_LOCAL);
      expect(toLocalColombianPhone(SAMPLE_LOCAL)).toBe(SAMPLE_LOCAL);
    });

    it('toInternationalColombianPhone agrega 57 sin duplicar', () => {
      expect(toInternationalColombianPhone(SAMPLE_LOCAL)).toBe(SAMPLE_INTL);
      expect(toInternationalColombianPhone(SAMPLE_INTL)).toBe(SAMPLE_INTL);
    });

    it('validateColombianPhone acepta formatos locales e internacionales', () => {
      expect(validateColombianPhone(SAMPLE_LOCAL).valid).toBe(true);
      expect(validateColombianPhone(SAMPLE_INTL).valid).toBe(true);
      expect(validateColombianPhone('123').valid).toBe(false);
    });
  });
});
