const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { requireSessionAgency } = require('../utils/requestAgency');
const { isValidEmail, normalizeEmail } = require('../utils/emailValidation');
const giNotifications = require('../db/gestionincidentes/notifications');

async function listForAgency(req) {
  const agency = requireSessionAgency(req);
  return giNotifications.listNotificationEmails(agency);
}

exports.list = asyncHandler(async (req, res) => {
  res.json(await listForAgency(req));
});

exports.add = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) throw new HttpError(400, 'email requerido');
  if (!isValidEmail(email)) {
    throw new HttpError(400, 'El correo debe ser válido e incluir @ (ejemplo: usuario@dominio.com).');
  }
  const agency = requireSessionAgency(req);
  await giNotifications.addNotificationEmail(normalizeEmail(email), agency);
  res.status(201).json(await giNotifications.listNotificationEmails(agency));
});

exports.setStatus = asyncHandler(async (req, res) => {
  const email = decodeURIComponent(req.params.email || '');
  const { status } = req.body || {};
  if (!email) throw new HttpError(400, 'email requerido');
  if (!status) throw new HttpError(400, 'status es requerido (Activo o Inactivo)');
  const agency = requireSessionAgency(req);
  const affected = await giNotifications.setNotificationEmailStatus(email, agency, status);
  if (!affected) throw new HttpError(404, 'Correo no encontrado para esta agencia');
  res.json(await giNotifications.listNotificationEmails(agency));
});
