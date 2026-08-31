export type MapPin = google.maps.Marker;

export interface PlacePredictionItem {
  placeId: string;
  primary: string;
  secondary: string;
  lat?: number;
  lng?: number;
}

let autocompleteService: google.maps.places.AutocompleteService | null = null;
let placesService: google.maps.places.PlacesService | null = null;

function mapsPlacesReady(): boolean {
  return typeof google !== 'undefined' && !!google.maps?.places;
}

function getAutocompleteService(): google.maps.places.AutocompleteService | null {
  if (!mapsPlacesReady() || !google.maps.places.AutocompleteService) return null;
  autocompleteService ??= new google.maps.places.AutocompleteService();
  return autocompleteService;
}

function getPlacesService(): google.maps.places.PlacesService | null {
  if (!mapsPlacesReady() || !google.maps.places.PlacesService) return null;
  placesService ??= new google.maps.places.PlacesService(document.createElement('div'));
  return placesService;
}

export function createMapPin(options: google.maps.MarkerOptions): MapPin {
  return new google.maps.Marker(options);
}

export function fetchPlacePredictions(
  request: google.maps.places.AutocompletionRequest,
): Promise<PlacePredictionItem[]> {
  return new Promise((resolve) => {
    const service = getAutocompleteService();
    if (!service) {
      resolve([]);
      return;
    }
    service.getPlacePredictions(request, (predictions, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions?.length) {
        resolve([]);
        return;
      }
      resolve(
        predictions.map((prediction) => ({
          placeId: prediction.place_id,
          primary: prediction.structured_formatting?.main_text || prediction.description,
          secondary: prediction.structured_formatting?.secondary_text || '',
        })),
      );
    });
  });
}

export function fetchPlaceDetails(
  placeId: string,
  fields: readonly string[],
): Promise<google.maps.places.PlaceResult | null> {
  return new Promise((resolve) => {
    const service = getPlacesService();
    if (!service || !placeId) {
      resolve(null);
      return;
    }
    service.getDetails({ placeId, fields: [...fields] }, (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
        resolve(null);
        return;
      }
      resolve(place);
    });
  });
}

export function isGoogleMapsLoaded(): boolean {
  return globalThis.google !== undefined && !!globalThis.google.maps;
}
