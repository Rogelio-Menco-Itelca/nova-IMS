const HttpError = require('./HttpError');

/**
 * Agencia de la sesión (JWT). Única fuente de verdad tras el login.
 * El cliente no puede ampliar el alcance con query/body.
 */
function requireSessionAgency(req) {
  const code = req.user?.agency_code;
  if (!code) {
    throw new HttpError(400, 'La sesión no incluye agencia. Inicie sesión de nuevo.');
  }
  return String(code).trim().toUpperCase();
}

/**
 * Resuelve agencia para catálogos:
 * - Con sesión autenticada → siempre la del JWT (ignora override del cliente).
 * - Sin sesión (login) → permite query/body para cargar roles de la agencia elegida.
 */
function requireAgencyCode(req, message = 'Parámetro agencia es requerido') {
  if (req.user?.agency_code) {
    return requireSessionAgency(req);
  }
  const code = req.query?.agency || req.body?.agencia || req.body?.agency;
  if (!code) throw new HttpError(400, message);
  return String(code).trim().toUpperCase();
}

/** @deprecated Prefer requireSessionAgency; kept for callers that only need a best-effort read. */
function readAgencyCode(req) {
  if (req.user?.agency_code) {
    return String(req.user.agency_code).trim().toUpperCase();
  }
  const code = req.query?.agency || req.body?.agencia || req.body?.agency;
  if (!code) return null;
  return String(code).trim().toUpperCase();
}

module.exports = {
  readAgencyCode,
  requireAgencyCode,
  requireSessionAgency,
};
