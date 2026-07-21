const { pool } = require('../config/db');

async function nextId(table, column, prefix, width = 3) {
  const like = `${prefix}-%`;
  const [rows] = await pool.query(
    `SELECT ${column} AS id FROM ${table} WHERE ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`,
    [like],
  );
  let next = 1;
  if (rows.length) {
    const last = rows[0].id;
    const num = Number.parseInt(last.split('-')[1], 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `${prefix}-${String(next).padStart(width, '0')}`;
}

function logId(prefix = 'LOG') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

const TRAILING_DIGITS_RE = /(\d+)/;

function parseTrailingDigits(value) {
  const m = TRAILING_DIGITS_RE.exec(String(value ?? ''));
  return m ? Number(m[1]) : null;
}

module.exports = { nextId, logId, parseTrailingDigits };
