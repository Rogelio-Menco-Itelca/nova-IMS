const appConfig = require('../../config/app');
const HttpError = require('../../utils/HttpError');
const { normalizeAgencyCode } = require('./maps');

/**
 * Agencia del usuario autenticado (JWT). No acepta override del cliente.
 * Tras el login, cada agencia es un tenant independiente.
 */
function requireUserAgency(jwtUser) {
  const raw = jwtUser?.agency_code;
  if (!raw) {
    throw new HttpError(400, 'La sesión no incluye agencia. Inicie sesión de nuevo.');
  }
  return normalizeAgencyCode(raw);
}

/** @deprecated Prefer requireUserAgency for authenticated writes. */
function resolveAgencyInput(explicit, jwtUser = null) {
  const raw = explicit ?? jwtUser?.agency_code ?? appConfig.defaultAgencyCode;
  if (!raw) return null;
  return normalizeAgencyCode(raw);
}

/** @deprecated Prefer requireUserAgency for authenticated writes. */
function requireAgencyInput(explicit, jwtUser = null) {
  const code = resolveAgencyInput(explicit, jwtUser);
  if (!code) {
    throw new HttpError(400, 'Agencia requerida');
  }
  return code;
}

module.exports = { resolveAgencyInput, requireAgencyInput, requireUserAgency };
