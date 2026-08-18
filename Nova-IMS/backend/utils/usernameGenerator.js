const { pool } = require('../config/db');

function normalizePart(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function buildUsernameBase(primerNombre, primerApellido) {
  const first = normalizePart(primerNombre);
  const last = normalizePart(primerApellido);
  if (!first && !last) return 'user';
  if (!last) return first.slice(0, 20);
  if (!first) return last.slice(0, 20);
  return (first.charAt(0) + last).slice(0, 20);
}

async function generateUniqueUsername(primerNombre, primerApellido) {
  const base = buildUsernameBase(primerNombre, primerApellido);

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

module.exports = { generateUniqueUsername, buildUsernameBase };
