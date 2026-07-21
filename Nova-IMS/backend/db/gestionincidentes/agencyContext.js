const appConfig = require('../../config/app');
const HttpError = require('../../utils/HttpError');
const { normalizeAgencyCode } = require('./maps');

function resolveAgencyInput(explicit, jwtUser = null) {
  const raw = explicit ?? jwtUser?.agency_code ?? appConfig.defaultAgencyCode;
  if (!raw) return null;
  return normalizeAgencyCode(raw);
}

function requireAgencyInput(explicit, jwtUser = null) {
  const code = resolveAgencyInput(explicit, jwtUser);
  if (!code) {
    throw new HttpError(400, 'Agencia requerida');
  }
  return code;
}

module.exports = { resolveAgencyInput, requireAgencyInput };
