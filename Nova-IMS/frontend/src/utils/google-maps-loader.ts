import { environment } from '../environments/environment';

let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof google !== 'undefined' && google.maps) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  const key = String(environment.googleMapsApiKey || '').trim();
  if (!key || key.startsWith('REEMPLAZAR')) {
    console.warn(
      '[Maps] googleMapsApiKey no configurada. Defínela en environment.prod.ts antes del build.',
    );
    return Promise.resolve();
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geocoding&loading=async`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps'));
    document.head.appendChild(script);
  });

  return loadPromise;
}
