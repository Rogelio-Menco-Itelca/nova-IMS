const HttpError = require('./HttpError');

function readAgencyCode(req) {
  const code = req.user?.agency_code || req.query?.agency || req.body?.agencia || req.body?.agency;
  if (!code) return null;
  return String(code).trim().toUpperCase();
}

function requireAgencyCode(req, message = 'Parámetro agencia es requerido') {
  const code = readAgencyCode(req);
  if (!code) throw new HttpError(400, message);
  return code;
}

function requireSessionAgency(req) {
  const code = req.user?.agency_code;
  if (!code) {
    throw new HttpError(400, 'La sesión no incluye agencia. Inicie sesión de nuevo.');
  }
  return String(code).trim().toUpperCase();
}

module.exports = {
  readAgencyCode,
  requireAgencyCode,
  requireSessionAgency,
};
