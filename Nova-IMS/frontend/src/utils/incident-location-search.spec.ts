import { describe, it, expect } from 'vitest';
import { LOCATION_SEARCH_MIN_CHARS, pickColombiaGeocodeResult, suggestionFallbackQuery } from './incident-location-search';

describe('incident-location-search', () => {
  it('suggestionFallbackQuery une texto secundario', () => {
    expect(
      suggestionFallbackQuery({
        placeId: 'x',
        primary: 'Palacio de Justicia',
        secondary: 'Cali, Valle del Cauca',
      }),
    ).toBe('Palacio de Justicia, Cali, Valle del Cauca');
    expect(
      suggestionFallbackQuery({
        placeId: 'x',
        primary: 'Calle 26',
        secondary: '',
      }),
    ).toBe('Calle 26');
  });

  it('LOCATION_SEARCH_MIN_CHARS exige tres letras', () => {
    expect(LOCATION_SEARCH_MIN_CHARS).toBe(3);
  });

  it('pickColombiaGeocodeResult prefiere un punto dentro de Colombia', () => {
    const outside = {
      formatted_address: 'Madrid',
      geometry: { location: { lat: () => 40.41, lng: () => -3.7 } },
    } as unknown as google.maps.GeocoderResult;
    const inside = {
      formatted_address: 'Cali',
      geometry: { location: { lat: () => 3.45, lng: () => -76.53 } },
    } as unknown as google.maps.GeocoderResult;

    expect(pickColombiaGeocodeResult([outside, inside], 'OK' as google.maps.GeocoderStatusString)).toBe(
      inside,
    );
    expect(pickColombiaGeocodeResult([], 'ZERO_RESULTS' as google.maps.GeocoderStatusString)).toBeNull();
  });
});
