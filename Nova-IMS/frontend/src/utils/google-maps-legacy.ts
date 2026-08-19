
export type MapPin = google.maps.Marker;

export interface PlaceAutocompleteControl {
  getPlace(): google.maps.places.PlaceResult;
  addListener(eventName: string, handler: () => void): google.maps.MapsEventListener;
  setBounds(bounds: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral): void;
  setStrictBounds(strict: boolean): void;
}

export function createMapPin(options: google.maps.MarkerOptions): MapPin {
  return new google.maps.Marker(options);
}

export function createPlaceAutocomplete(
  input: HTMLInputElement,
  options: google.maps.places.AutocompleteOptions,
): PlaceAutocompleteControl {
  const ac = new google.maps.places.Autocomplete(input, options);
  return {
    getPlace: () => ac.getPlace(),
    addListener: (eventName, handler) => ac.addListener(eventName, handler),
    setBounds: (bounds) => ac.setBounds(bounds),
    setStrictBounds: (strict) => {
      ac.set('strictBounds', strict);
    },
  };
}

export function isGoogleMapsLoaded(): boolean {
  return globalThis.google !== undefined && !!globalThis.google.maps;
}
