const HttpError = require("./HttpError");

/**
 * Agencia explícita en la petición (JWT, query o body).
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function readAgencyCode(req) {
  const code =
    req.user?.agency_code ||
    req.query?.agency ||
    req.body?.agencia ||
    req.body?.agency;
  if (!code) return null;
  return String(code).trim().toUpperCase();
}

/**
 * @param {import('express').Request} req
 * @param {string} [message]
 */
function requireAgencyCode(req, message = "Parámetro agencia es requerido") {
  const code = readAgencyCode(req);
  if (!code) throw new HttpError(400, message);
  return code;
}

/**
 * Agencia de sesión autenticada (sin fallback en código).
 * @param {import('express').Request} req
 */
function requireSessionAgency(req) {
  const code = req.user?.agency_code;
  if (!code) {
    throw new HttpError(400, "La sesión no incluye agencia. Inicie sesión de nuevo.");
  }
  return String(code).trim().toUpperCase();
}

module.exports = {
  readAgencyCode,
  requireAgencyCode,
  requireSessionAgency,
};
