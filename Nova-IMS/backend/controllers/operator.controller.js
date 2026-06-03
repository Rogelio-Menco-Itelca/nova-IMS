const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { nextId } = require('../utils/ids');
const { writeAdminLog } = require('../utils/adminLog');
const { generateUniqueUsername } = require('../utils/usernameGenerator');
const { validatePassword } = require('../utils/passwordPolicy');
const { sendWelcomeEmail } = require('../services/email.service');

function mapOperator(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role_name,
    status: r.status,
  };
}

// GET /api/operators
exports.list = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.status, r.name AS role_name
       FROM users u JOIN roles r ON r.id = u.role_id
      ORDER BY u.created_at DESC`);
  res.json(rows.map(mapOperator));
});

// POST /api/operators
exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.role) throw new HttpError(400, 'name, email y role son requeridos');

  // Encontrar role_id a partir del nombre
  const [roleRows] = await pool.query(`SELECT id FROM roles WHERE name = ? LIMIT 1`, [b.role]);
  if (!roleRows.length) throw new HttpError(400, `Rol no encontrado: ${b.role}`);

  const id = await nextId('users', 'id', 'OP');
  // generar username automático
const username = await generateUniqueUsername(b.name);

// 🔥 NORMALIZAR EMAIL
const email = b.email.trim().toLowerCase();

// 🔍 VALIDAR EMAIL DUPLICADO
const [emailExists] = await pool.query(
  `SELECT id FROM users WHERE email = ? LIMIT 1`,
  [email]
);

if (emailExists.length) {
  throw new HttpError(409, 'Ya existe un usuario con ese correo');
}

// 🔍 VALIDAR USERNAME DUPLICADO
const [userExists] = await pool.query(
  `SELECT id FROM users WHERE username = ? LIMIT 1`,
  [username]
);

if (userExists.length) {
  throw new HttpError(409, 'El nombre de usuario ya existe');
}

// validar que venga contraseña
if (!b.password) {
  throw new HttpError(400, 'La contraseña es requerida');
}

// validar política de contraseña
const check = validatePassword(b.password);
if (!check.ok) {
  throw new HttpError(400, check.errors.join(' '));
}

// hashear contraseña
const hash = await bcrypt.hash(b.password, 12);

  try {
    await pool.query(
      `INSERT INTO users (id, username, name, email, password_hash, auth_source, must_change_password, role_id, agency_id, status)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        username,
        b.name,
        email,
        hash,
        "local",
        1,
        roleRows[0].id,
        1,
        b.status || "Activo",
      ],
    );
  } catch (err) {
    if (err.code !== "ER_BAD_FIELD_ERROR") throw err;
    await pool.query(
      `INSERT INTO users (id, username, name, email, password_hash, must_change_password, role_id, agency_id, status)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        id,
        username,
        b.name,
        email,
        hash,
        1,
        roleRows[0].id,
        1,
        b.status || "Activo",
      ],
    );
  }
  // No bloquear la respuesta por demoras SMTP
  sendWelcomeEmail({
    to: email,
    name: b.name,
    username,
    password: b.password,
  }).catch((err) => {
    console.warn('[MAIL] No se pudo enviar correo de bienvenida:', err.message);
  });

  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.status, r.name AS role_name
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`, [id]);

  await writeAdminLog(req.user, 'Creación de Operador', `Se creó el operador ${b.name} (${id})`);
  res.status(201).json(mapOperator(rows[0]));
});

// PUT /api/operators/:id
exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const [existing] = await pool.query(`SELECT id FROM users WHERE id = ?`, [id]);
  if (!existing.length) throw new HttpError(404, 'Operador no encontrado');

  let roleId = null;
  if (b.role) {
    const [rr] = await pool.query(`SELECT id FROM roles WHERE name = ? LIMIT 1`, [b.role]);
    if (!rr.length) throw new HttpError(400, `Rol no encontrado: ${b.role}`);
    roleId = rr[0].id;
  }

  await pool.query(
    `UPDATE users SET
        name    = COALESCE(?, name),
        email   = COALESCE(?, email),
        role_id = COALESCE(?, role_id),
        status  = COALESCE(?, status)
      WHERE id = ?`,
    [b.name ?? null, b.email ?? null, roleId, b.status ?? null, id]
  );

  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.status, r.name AS role_name
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`, [id]);

  await writeAdminLog(req.user, 'Actualización de Operador', `Se actualizó el operador ${id}`);
  res.json(mapOperator(rows[0]));
});

// DELETE /api/operators/:id
exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.query(`DELETE FROM users WHERE id = ?`, [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Operador no encontrado');
  await writeAdminLog(req.user, 'Eliminación de Operador', `Se eliminó el operador ${id}`);
  res.status(204).send();
});
