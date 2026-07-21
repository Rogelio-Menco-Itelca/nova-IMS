export const IMS_GEO = {
  countryCode: 'co',
  countryName: 'Colombia',
  dialCode: '57',
  localPhoneLength: 10,
} as const;

export const IMS_DEFAULT_MAP_CENTER = {
  lat: 4.60971,
  lng: -74.08175,
} as const;

export const IMS_MAP_ZOOM = {
  dashboardDefault: 11,
  incidentForm: 15,
  incidentDetail: 17,
  dashboardSingleMarker: 13,
  dashboardFitMax: 15,
  countryMin: 5,
  countryOverviewMax: 6,
} as const;

export const IMS_COORD = {
  precision: 6,
  nullEpsilon: 0.0001,
} as const;

export const IMS_COLOMBIA_BOUNDS = {
  north: 13.51,
  south: -4.25,
  east: -66.84,
  west: -81.85,
} as const;

export function colombiaBoundsLiteral(): google.maps.LatLngBoundsLiteral {
  return { ...IMS_COLOMBIA_BOUNDS };
}

export function colombiaMapRestriction(strictBounds = true): google.maps.MapRestriction {
  return {
    latLngBounds: colombiaBoundsLiteral(),
    strictBounds,
  };
}

export function appendCountryToGeocodeQuery(query: string): string {
  const trimmed = String(query ?? '').trim();
  if (!trimmed) return '';
  const countryPattern = new RegExp(IMS_GEO.countryName, 'i');
  return countryPattern.test(trimmed) ? trimmed : `${trimmed}, ${IMS_GEO.countryName}`;
}

export function googleMapsCountryRestriction(): { country: string } {
  return { country: IMS_GEO.countryCode };
}

export function roundCoord(value: number): number {
  return Number(value.toFixed(IMS_COORD.precision));
}

export function isValidCoordComponent(value: unknown): boolean {
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) > IMS_COORD.nullEpsilon;
}

export function isLatLngWithinColombia(lat: number, lng: number): boolean {
  return (
    lat <= IMS_COLOMBIA_BOUNDS.north &&
    lat >= IMS_COLOMBIA_BOUNDS.south &&
    lng <= IMS_COLOMBIA_BOUNDS.east &&
    lng >= IMS_COLOMBIA_BOUNDS.west
  );
}

export function clampLatLngToColombia(lat: number, lng: number): { lat: number; lng: number } {
  const clamped = {
    lat: Math.min(IMS_COLOMBIA_BOUNDS.north, Math.max(IMS_COLOMBIA_BOUNDS.south, lat)),
    lng: Math.min(IMS_COLOMBIA_BOUNDS.east, Math.max(IMS_COLOMBIA_BOUNDS.west, lng)),
  };
  return { lat: roundCoord(clamped.lat), lng: roundCoord(clamped.lng) };
}

export function colombiaMapViewportOptions(): Pick<
  google.maps.MapOptions,
  'restriction' | 'minZoom'
> {
  return {
    minZoom: IMS_MAP_ZOOM.countryMin,
    restriction: colombiaMapRestriction(true),
  };
}

export function fitMapToColombia(
  map: google.maps.Map,
  padding: number | google.maps.Padding = 28,
): void {
  const bounds = new google.maps.LatLngBounds(
    { lat: IMS_COLOMBIA_BOUNDS.south, lng: IMS_COLOMBIA_BOUNDS.west },
    { lat: IMS_COLOMBIA_BOUNDS.north, lng: IMS_COLOMBIA_BOUNDS.east },
  );
  map.fitBounds(bounds, padding);
}

export function clampMapZoomAfterCountryFit(
  map: google.maps.Map,
  maxZoom = IMS_MAP_ZOOM.countryOverviewMax,
): void {
  const z = map.getZoom();
  if (z != null && z > maxZoom) {
    map.setZoom(maxZoom);
  }
}

export function phoneDigitsOnly(phone: string): string {
  return String(phone ?? '').replace(/\D/g, '');
}

export function toLocalColombianPhone(phone: string): string {
  const digits = phoneDigitsOnly(phone);
  if (digits.startsWith(IMS_GEO.dialCode) && digits.length > IMS_GEO.localPhoneLength) {
    return digits.slice(IMS_GEO.dialCode.length);
  }
  return digits;
}

export function toInternationalColombianPhone(phone: string): string {
  const digits = phoneDigitsOnly(phone);
  if (digits.startsWith(IMS_GEO.dialCode)) return digits;
  return `${IMS_GEO.dialCode}${digits}`;
}

export function validateColombianPhone(phone: string): { valid: boolean; error?: string } {
  const digits = phoneDigitsOnly(phone);

  if (digits.startsWith(IMS_GEO.dialCode)) {
    const expectedLength = IMS_GEO.dialCode.length + IMS_GEO.localPhoneLength;
    if (digits.length !== expectedLength) {
      return {
        valid: false,
        error: `Después de +${IMS_GEO.dialCode} deben ir exactamente ${IMS_GEO.localPhoneLength} dígitos (tiene ${digits.length - IMS_GEO.dialCode.length}).`,
      };
    }
    return { valid: true };
  }

  if (digits.length !== IMS_GEO.localPhoneLength) {
    return {
      valid: false,
      error: `El número colombiano debe tener ${IMS_GEO.localPhoneLength} dígitos (tiene ${digits.length}).`,
    };
  }

  return { valid: true };
}
