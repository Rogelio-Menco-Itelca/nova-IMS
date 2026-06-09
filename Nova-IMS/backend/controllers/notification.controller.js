const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { requireSessionAgency } = require('../utils/requestAgency');
const giNotifications = require('../db/gestionincidentes/notifications');
exports.list = asyncHandler(async (req, res) => {
  const rows = await giNotifications.listNotificationEmails();
  res.json(rows.map((r) => r.email));
});

exports.add = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) throw new HttpError(400, 'email requerido');
  const agency = requireSessionAgency(req);
  await giNotifications.addNotificationEmail(email, agency);
  const rows = await giNotifications.listNotificationEmails();
  res.status(201).json(rows.map((r) => r.email));
});

exports.remove = asyncHandler(async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  await giNotifications.deleteNotificationEmail(email);
  const rows = await giNotifications.listNotificationEmails();
  res.json(rows.map((r) => r.email));
});
