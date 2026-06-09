import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

const TRUSTED_PBI_HOSTS = new Set(['app.powerbi.com', 'powerbi.com']);

function isTrustedPowerBiHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (TRUSTED_PBI_HOSTS.has(host)) return true;
  return host.endsWith('.powerbi.com');
}

/**
 * Marca como segura una URL de embed de Power BI ya validada (HTTPS + dominio Microsoft).
 * Solo usar con valores de configuración (`environment`), nunca con entrada del usuario.
 */
export function trustedPowerBiEmbedUrl(sanitizer: DomSanitizer, embedUrl: string): SafeResourceUrl {
  const parsed = new URL(embedUrl);
  if (parsed.protocol !== 'https:' || !isTrustedPowerBiHost(parsed.hostname)) {
    throw new Error('URL de embed Power BI no permitida');
  }
  return sanitizer.bypassSecurityTrustResourceUrl(parsed.toString()); // NOSONAR typescript:S6268
}
