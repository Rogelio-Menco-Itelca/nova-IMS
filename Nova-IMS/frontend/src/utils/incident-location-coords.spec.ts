import { describe, it, expect } from 'vitest';
import {
  IncidentLocationCoordSync,
  buildGeocodeQuery,
  buildLocationFingerprint,
  geoCatalogNamesLooselyEqual,
  hasValidIncidentCoords,
  parseIncidentCoords,
  shouldApplyIncomingGpsLocation,
} from './incident-location-coords';
import { IMS_GEO } from './ims-geo.constants';

describe('incident-location-coords', () => {
  it('buildLocationFingerprint normaliza espacios y mayúsculas', () => {
    expect(
      buildLocationFingerprint({
        location: '  Sincelejo, Sucre ',
        departmentId: 70,
        municipalityId: 1,
      }),
    ).toBe('sincelejo, sucre|70|1');
  });

  it('hasValidIncidentCoords rechaza null y 0,0', () => {
    expect(hasValidIncidentCoords(null, null)).toBe(false);
    expect(hasValidIncidentCoords(0, 0)).toBe(false);
    expect(hasValidIncidentCoords(4.645771, -74.11311)).toBe(true);
    expect(hasValidIncidentCoords('4.622381', '-74.130277')).toBe(true);
  });

  it('parseIncidentCoords convierte strings de DECIMAL a número', () => {
    expect(parseIncidentCoords('4.622381', '-74.130277')).toEqual({
      lat: 4.622381,
      lng: -74.130277,
    });
    expect(parseIncidentCoords(0, 0)).toBeNull();
  });

  it('IncidentLocationCoordSync invalida coords huérfanas', () => {
    const sync = new IncidentLocationCoordSync();
    const snap = { location: 'Sincelejo', departmentId: 70, municipalityId: 1 };
    expect(sync.shouldInvalidate(snap, true)).toBe(true);
    sync.markSynced(snap);
    expect(sync.shouldInvalidate(snap, true)).toBe(false);
    expect(sync.shouldInvalidate({ ...snap, location: 'Bogotá' }, true)).toBe(true);
  });

  it('IncidentLocationCoordSync no invalida durante runPatch', () => {
    const sync = new IncidentLocationCoordSync();
    const snap = { location: 'Sincelejo', departmentId: 70, municipalityId: 1 };
    sync.markSynced(snap);
    sync.runPatch(() => {
      expect(sync.shouldInvalidate({ ...snap, location: 'Bogotá' }, true)).toBe(false);
    });
  });

  it('buildGeocodeQuery agrega municipio, departamento y país', () => {
    const query = buildGeocodeQuery(
      { location: 'Calle 1', departmentId: 70, municipalityId: 1 },
      (id) => (id === 70 ? 'Sucre' : undefined),
      (id) => (id === 1 ? 'Sincelejo' : undefined),
    );
    expect(query).toContain('Calle 1');
    expect(query).toContain('Sincelejo');
    expect(query).toContain('Sucre');
    expect(query).toContain(IMS_GEO.countryName);
  });

  it('shouldApplyIncomingGpsLocation bloquea GPS de otro teléfono si el formulario ya tiene datos', () => {
    expect(
      shouldApplyIncomingGpsLocation({
        incomingPhone: '3001111111',
        formPhone: '3002222222',
        locationPhone: '',
        pendingPhone: '',
        hasCoords: true,
        hasAddress: true,
      }),
    ).toBe(false);

    expect(
      shouldApplyIncomingGpsLocation({
        incomingPhone: '3001111111',
        formPhone: '3001111111',
        locationPhone: '',
        pendingPhone: '',
        hasCoords: true,
        hasAddress: true,
      }),
    ).toBe(true);
  });

  it('geoCatalogNamesLooselyEqual no confunde CALI con CALIMA', () => {
    expect(geoCatalogNamesLooselyEqual('CALIMA', 'CALI')).toBe(false);
    expect(geoCatalogNamesLooselyEqual('CALI', 'CALI')).toBe(true);
    expect(geoCatalogNamesLooselyEqual('SANTIAGO DE CALI', 'CALI')).toBe(true);
    expect(geoCatalogNamesLooselyEqual('BOGOTA D C', 'BOGOTA')).toBe(true);
  });
});
