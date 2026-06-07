const { pool } = require('../config/db');

/**
 * Genera el próximo ID con prefijo, buscando el máximo numérico existente
 * en la tabla/columna dadas. Ejemplo: nextId('incidents','id','INC') -> 'INC-003'
 */
async function nextId(table, column, prefix, width = 3) {
  const like = `${prefix}-%`;
  const [rows] = await pool.query(
    `SELECT ${column} AS id FROM ${table} WHERE ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`,
    [like]
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

module.exports = { nextId, logId };
