const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/notification-emails  -> array de strings
exports.list = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`SELECT email FROM notification_emails ORDER BY id`);
  res.json(rows.map(r => r.email));
});

// POST /api/notification-emails  { email }
exports.add = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) throw new HttpError(400, 'email requerido');
  await pool.query(
    `INSERT IGNORE INTO notification_emails (email) VALUES (?)`, [email]);
  const [rows] = await pool.query(`SELECT email FROM notification_emails ORDER BY id`);
  res.status(201).json(rows.map(r => r.email));
});

// DELETE /api/notification-emails/:email
exports.remove = asyncHandler(async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  await pool.query(`DELETE FROM notification_emails WHERE email = ?`, [email]);
  const [rows] = await pool.query(`SELECT email FROM notification_emails ORDER BY id`);
  res.json(rows.map(r => r.email));
});
