/**
 * Configuración de aplicación (solo variables de entorno).
 * No incluir usuarios, contraseñas ni códigos de agencia en el código fuente.
 *
 * @module config/app
 */

const logger = require('../utils/logger');

function parseLegacyAgencyAliases() {
  const raw = process.env.LEGACY_AGENCY_ALIASES;
  if (!raw || !String(raw).trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    logger.warn('[config] LEGACY_AGENCY_ALIASES no es JSON válido; se ignora.');
    return {};
  }
}

function normalizeAliases(map) {
  const out = {};
  for (const [key, value] of Object.entries(map)) {
    const k = String(key || '')
      .trim()
      .toUpperCase();
    const v = String(value || '')
      .trim()
      .toUpperCase();
    if (k && v) out[k] = v;
  }
  return out;
}

const defaultAgencyCode = process.env.APP_DEFAULT_AGENCY_CODE
  ? String(process.env.APP_DEFAULT_AGENCY_CODE).trim().toUpperCase()
  : null;

module.exports = Object.freeze({
  /** Solo si está definido en .env (opcional, evitar usar en flujos de login) */
  defaultAgencyCode,
  /** Mapa opcional LEGACY→real, p. ej. {"CENTRAL":"CSJ"} en .env */
  legacyAgencyAliases: normalizeAliases(parseLegacyAgencyAliases()),
});
