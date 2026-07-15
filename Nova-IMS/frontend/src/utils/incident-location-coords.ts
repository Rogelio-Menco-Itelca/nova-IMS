import {
  IMS_COORD,
  IMS_GEO,
  appendCountryToGeocodeQuery,
  roundCoord,
} from './ims-geo.constants';

export interface IncidentLocationSnapshot {
  location: string;
  departmentId: number | null;
  municipalityId: number | null;
}

export interface GeocodedLocation {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

export function buildLocationFingerprint(snapshot: IncidentLocationSnapshot): string {
  const location = String(snapshot.location ?? '')
    .trim()
    .toLowerCase();
  return `${location}|${snapshot.departmentId ?? ''}|${snapshot.municipalityId ?? ''}`;
}

export function hasValidIncidentCoords(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  return (
    Number.isFinite(la) &&
    Number.isFinite(ln) &&
    !(
      Math.abs(la) < IMS_COORD.nullEpsilon &&
      Math.abs(ln) < IMS_COORD.nullEpsilon
    )
  );
}

export function buildGeocodeQuery(
  snapshot: IncidentLocationSnapshot,
  resolveDeptName?: (id: number) => string | undefined,
  resolveMuniName?: (id: number) => string | undefined,
): string {
  const parts: string[] = [];
  const location = String(snapshot.location ?? '').trim();
  if (location) parts.push(location);

  const muniName =
    snapshot.municipalityId != null
      ? String(resolveMuniName?.(snapshot.municipalityId) ?? '').trim()
      : '';
  const deptName =
    snapshot.departmentId != null
      ? String(resolveDeptName?.(snapshot.departmentId) ?? '').trim()
      : '';

  const joined = parts.join(', ').toLowerCase();
  if (muniName && !joined.includes(muniName.toLowerCase())) parts.push(muniName);
  if (deptName && !parts.join(', ').toLowerCase().includes(deptName.toLowerCase())) {
    parts.push(deptName);
  }

  if (!parts.length) return '';
  return appendCountryToGeocodeQuery(parts.join(', '));
}

export function geocodeAddressQuery(
  geocoder: google.maps.Geocoder,
  query: string,
): Promise<GeocodedLocation | null> {
  const trimmed = String(query ?? '').trim();
  if (!trimmed) return Promise.resolve(null);

  return new Promise((resolve) => {
    geocoder.geocode(
      { address: trimmed, region: IMS_GEO.countryCode },
      (results, status) => {
        if (status !== 'OK' || !results?.[0]?.geometry?.location) {
          resolve(null);
          return;
        }
        const loc = results[0].geometry.location;
        resolve({
          lat: roundCoord(loc.lat()),
          lng: roundCoord(loc.lng()),
          formattedAddress: results[0].formatted_address,
        });
      },
    );
  });
}

export class IncidentLocationCoordSync {
  private suppressDepth = 0;
  private fingerprint: string | null = null;

  runPatch(fn: () => void): void {
    this.suppressDepth += 1;
    try {
      fn();
    } finally {
      this.suppressDepth -= 1;
    }
  }

  markSynced(snapshot: IncidentLocationSnapshot): void {
    this.fingerprint = buildLocationFingerprint(snapshot);
  }

  clearSync(): void {
    this.fingerprint = null;
  }

  isSynced(snapshot: IncidentLocationSnapshot): boolean {
    if (!this.fingerprint) return false;
    return this.fingerprint === buildLocationFingerprint(snapshot);
  }

  shouldInvalidate(snapshot: IncidentLocationSnapshot, hasCoords: boolean): boolean {
    if (this.suppressDepth > 0 || !hasCoords) return false;
    if (!this.fingerprint) return true;
    return !this.isSynced(snapshot);
  }

  isPatching(): boolean {
    return this.suppressDepth > 0;
  }
}

export function shouldApplyIncomingGpsLocation(input: {
  incomingPhone?: string;
  formPhone: string;
  locationPhone: string;
  pendingPhone: string;
  hasCoords: boolean;
  hasAddress: boolean;
}): boolean {
  const incoming = String(input.incomingPhone ?? '').trim();
  if (!incoming) return true;

  const matches =
    incoming === input.formPhone ||
    incoming === input.locationPhone ||
    incoming === input.pendingPhone;

  if (matches) return true;
  if (!input.hasCoords && !input.hasAddress) return true;
  return false;
}
