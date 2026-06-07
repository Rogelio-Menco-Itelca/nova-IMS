import { environment } from '../environments/environment';
import { isLoopbackUrl } from './public-url-shared';

/** Convierte URL localhost del backend en URL pública https (ngrok / dominio). */
export function resolvePublicShareUrl(rawUrl: string): string {
  const url = String(rawUrl || '').trim();
  if (!url) return url;

  try {
    const parsed = new URL(url);
    if (!isLoopbackUrl(parsed.href)) return url;

    const base = String(environment.publicShareBaseUrl || '').trim().replace(/\/+$/, '');
    if (!base) return url;

    const publicBase = new URL(base);
    parsed.protocol = publicBase.protocol;
    parsed.hostname = publicBase.hostname;
    parsed.port = publicBase.port;
    return parsed.toString();
  } catch {
    return url;
  }
}

export function isMobileShareUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !isLoopbackUrl(u.href);
  } catch {
    return false;
  }
}

export function buildLocationShareMessage(shareUrl: string): string {
  const url = String(shareUrl || "").trim();
  return `${url}\n\nHaz clic en el enlace y permite el acceso para compartir tu ubicación de forma automática.`;
}
