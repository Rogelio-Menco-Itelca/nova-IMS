const { pool } = require('../config/db');

async function generateUniqueUsername(fullName) {
  const base = String(fullName || 'user')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 12) || 'user';

  let candidate = base;
  let n = 1;
  while (await exists(candidate)) {
    candidate = `${base}${n}`;
    n += 1;
  }
  return candidate;
}

async function exists(username) {
  const [rows] = await pool.query(
    `SELECT ID_Usuario FROM usuarios WHERE LOWER(ID_Usuario) = LOWER(?) LIMIT 1`,
    [username],
  );
  return rows.length > 0;
}

module.exports = { generateUniqueUsername };
