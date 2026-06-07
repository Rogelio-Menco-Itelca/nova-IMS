const appConfig = require("../../config/app");
const HttpError = require("../../utils/HttpError");
const { normalizeAgencyCode } = require("./maps");

/**
 * Resuelve agencia desde argumento explícito, JWT o .env (APP_DEFAULT_AGENCY_CODE).
 * No hay códigos quemados en el código fuente.
 */
function resolveAgencyInput(explicit, jwtUser = null) {
  const raw =
    explicit ??
    jwtUser?.agency_code ??
    appConfig.defaultAgencyCode;
  if (!raw) return null;
  return normalizeAgencyCode(raw);
}

function requireAgencyInput(explicit, jwtUser = null) {
  const code = resolveAgencyInput(explicit, jwtUser);
  if (!code) {
    throw new HttpError(400, "Agencia requerida");
  }
  return code;
}

module.exports = { resolveAgencyInput, requireAgencyInput };
