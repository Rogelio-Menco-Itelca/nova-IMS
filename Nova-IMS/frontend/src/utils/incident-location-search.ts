import {
  IMS_GEO,
  appendCountryToGeocodeQuery,
  colombiaBoundsLiteral,
  googleMapsCountryRestriction,
  isLatLngWithinColombia,
} from './ims-geo.constants';
import {
  fetchPlaceDetails,
  fetchPlacePredictions,
  PlacePredictionItem,
} from './google-maps-legacy';

export type { PlacePredictionItem };

export const LOCATION_SEARCH_MIN_CHARS = 3;
export const LOCATION_SUGGEST_DEBOUNCE_MS = 220;
export const LOCATION_SUGGEST_BLUR_MS = 160;

const MAX_GEOCODE_SUGGESTIONS = 6;

const PLACE_DETAIL_FIELDS = [
  'geometry',
  'formatted_address',
  'address_components',
  'name',
];

interface ResolvedLocationSuggestion {
  lat: number;
  lng: number;
  label: string;
  place?: google.maps.places.PlaceResult;
}

export function newPlacesSessionToken(): google.maps.places.AutocompleteSessionToken | undefined {
  if (typeof google === 'undefined' || !google.maps?.places?.AutocompleteSessionToken) {
    return undefined;
  }
  return new google.maps.places.AutocompleteSessionToken();
}

function colombiaPlacesRequest(
  input: string,
  sessionToken?: google.maps.places.AutocompleteSessionToken,
): google.maps.places.AutocompletionRequest {
  const request: google.maps.places.AutocompletionRequest = {
    input,
    componentRestrictions: googleMapsCountryRestriction(),
    language: 'es',
    bounds: colombiaBoundsLiteral(),
  };
  if (sessionToken) request.sessionToken = sessionToken;
  return request;
}

function colombiaAddressRequest(address: string): google.maps.GeocoderRequest {
  const country = colombiaBoundsLiteral();
  return {
    address: appendCountryToGeocodeQuery(address),
    region: IMS_GEO.countryCode,
    componentRestrictions: { country: IMS_GEO.countryCode.toUpperCase() },
    bounds: new google.maps.LatLngBounds(
      { lat: country.south, lng: country.west },
      { lat: country.north, lng: country.east },
    ),
  };
}

export function geocodeColombia(
  geocoder: google.maps.Geocoder,
  address: string,
): Promise<{
  results: google.maps.GeocoderResult[] | null;
  status: google.maps.GeocoderStatusString;
}> {
  const trimmed = address.trim();
  if (!trimmed) {
    return Promise.resolve({ results: null, status: 'ZERO_RESULTS' });
  }
  return new Promise((resolve) => {
    geocoder.geocode(colombiaAddressRequest(trimmed), (results, status) => {
      resolve({ results: results ?? null, status });
    });
  });
}

export function pickColombiaGeocodeResult(
  results: google.maps.GeocoderResult[] | null,
  status: google.maps.GeocoderStatusString,
): google.maps.GeocoderResult | null {
  if (status !== 'OK' || !results?.length) return null;
  return (
    results.find((result) => {
      const loc = result.geometry?.location;
      return !!loc && isLatLngWithinColombia(loc.lat(), loc.lng());
    }) ?? results[0]
  );
}

function predictionsFromGeocodeResults(
  results: google.maps.GeocoderResult[] | null,
  query: string,
): PlacePredictionItem[] {
  if (!results?.length) return [];
  return results.slice(0, MAX_GEOCODE_SUGGESTIONS).map((result) => {
    const loc = result.geometry?.location;
    return {
      placeId: result.place_id || '',
      primary: result.formatted_address || query,
      secondary: '',
      lat: loc ? loc.lat() : undefined,
      lng: loc ? loc.lng() : undefined,
    };
  });
}

export async function searchColombiaPlaces(
  query: string,
  sessionToken: google.maps.places.AutocompleteSessionToken | undefined,
  geocoder: google.maps.Geocoder | null,
): Promise<PlacePredictionItem[]> {
  const trimmed = query.trim();
  if (trimmed.length < LOCATION_SEARCH_MIN_CHARS) return [];

  const predictions = await fetchPlacePredictions(
    colombiaPlacesRequest(trimmed, sessionToken),
  );
  if (predictions.length || !geocoder) return predictions;

  const { results, status } = await geocodeColombia(geocoder, trimmed);
  if (status !== 'OK') return [];
  return predictionsFromGeocodeResults(results, trimmed);
}

export async function resolveLocationSuggestion(
  item: PlacePredictionItem,
): Promise<ResolvedLocationSuggestion | null> {
  if (item.lat != null && item.lng != null && !item.placeId) {
    return { lat: item.lat, lng: item.lng, label: item.primary };
  }

  const place = item.placeId
    ? await fetchPlaceDetails(item.placeId, PLACE_DETAIL_FIELDS)
    : null;
  const loc = place?.geometry?.location;
  if (loc && place) {
    return {
      lat: loc.lat(),
      lng: loc.lng(),
      label: String(place.formatted_address || item.primary || '').trim(),
      place,
    };
  }
  if (item.lat != null && item.lng != null) {
    return { lat: item.lat, lng: item.lng, label: item.primary };
  }
  return null;
}

export function suggestionFallbackQuery(item: PlacePredictionItem): string {
  return item.secondary ? `${item.primary}, ${item.secondary}` : item.primary;
}
