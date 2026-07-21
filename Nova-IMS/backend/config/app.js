
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
  defaultAgencyCode,
  legacyAgencyAliases: normalizeAliases(parseLegacyAgencyAliases()),
});
