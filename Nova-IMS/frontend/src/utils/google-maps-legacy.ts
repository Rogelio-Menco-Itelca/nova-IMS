/**
 * Encapsula APIs legacy de Google Maps (Marker, Autocomplete) pendientes de migrar
 * a AdvancedMarkerElement / PlaceAutocompleteElement.
 */

/** Alias del marcador legacy; compatible con InfoWindow.open({ anchor }). */
export type MapPin = google.maps.Marker;

export interface PlaceAutocompleteControl {
  getPlace(): google.maps.places.PlaceResult;
  addListener(eventName: string, handler: () => void): google.maps.MapsEventListener;
}

export function createMapPin(options: google.maps.MarkerOptions): MapPin {
  return new google.maps.Marker(options);
}

export function createPlaceAutocomplete(
  input: HTMLInputElement,
  options: google.maps.places.AutocompleteOptions,
): PlaceAutocompleteControl {
  return new google.maps.places.Autocomplete(input, options) as PlaceAutocompleteControl;
}

export function isGoogleMapsLoaded(): boolean {
  return globalThis.google !== undefined && !!globalThis.google.maps;
}
