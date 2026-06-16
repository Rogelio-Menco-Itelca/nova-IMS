import { environment } from '../environments/environment';

let loadPromise: Promise<void> | null = null;

function apiBase(): string {
  return String(environment.apiUrl || '').replace(/\/$/, '');
}

async function fetchMapsKeyFromBackend(): Promise<string> {
  const res = await fetch(`${apiBase()}/api/config/public`);
  if (!res.ok) return '';
  const data = (await res.json()) as { googleMapsApiKey?: string };
  return String(data.googleMapsApiKey || '').trim();
}

async function resolveGoogleMapsApiKey(): Promise<string> {
  const fromBuild = String(environment.googleMapsApiKey || '').trim();
  if (fromBuild && !fromBuild.startsWith('REEMPLAZAR')) {
    return fromBuild;
  }
  try {
    return await fetchMapsKeyFromBackend();
  } catch {
    return '';
  }
}

function waitForGoogleMapsApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 15000;
    const poll = () => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error('Google Maps no terminó de cargar'));
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  });
}

function injectMapsScript(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geocoding&loading=async`;
    script.onload = () => waitForGoogleMapsApi().then(resolve, reject);
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps'));
    document.head.appendChild(script);
  });
}

export function loadGoogleMaps(): Promise<void> {
  if (typeof google !== 'undefined' && google.maps) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = resolveGoogleMapsApiKey().then(async (key) => {
    if (!key) {
      throw new Error(
        'Sin clave de Google Maps. Agregue GOOGLE_MAPS_API_KEY en backend/.env y reinicie el backend (pnpm dev).',
      );
    }
    await injectMapsScript(key);
  });

  return loadPromise;
}
