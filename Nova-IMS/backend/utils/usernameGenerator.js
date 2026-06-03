const { pool } = require('../config/db');

function normalize(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function suggestUsername(fullName) {
  if (!fullName) return '';

  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  const firstInitial = normalize(words[0]).charAt(0);
  if (!firstInitial) return '';

  let surname = '';

  if (words.length === 2) {
    surname = normalize(words[1]);
  } else if (words.length >= 3) {
    surname = normalize(words[words.length - 2]);
  }

  return (firstInitial + surname).slice(0, 20);
}

async function generateUniqueUsername(fullName) {
  const base = suggestUsername(fullName);
  if (!base) throw new Error('No se pudo generar username');

  const [rows] = await pool.query(
    `SELECT username FROM users WHERE username LIKE ?`,
    [`${base}%`]
  );

  const taken = new Set(rows.map(r => r.username));

  if (!taken.has(base)) return base;

  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}${i}`;
    if (!taken.has(candidate)) return candidate;
  }

  throw new Error('No se pudo generar username único');
}

module.exports = { suggestUsername, generateUniqueUsername };