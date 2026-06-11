const { pool } = require('../../config/db');

/**
 * Asegura que la columna 'estado' exista en correosincidentes
 */
async function ensureEmailStatusColumn() {
  try {
    await pool.query(`
      ALTER TABLE correosincidentes 
      ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'Activo'
    `);
  } catch (e) {
    // Columna ya existe — ignorar
  }
}

/**
 * Normaliza el estado del correo
 */
function normalizeEmailStatus(status) {
  const valid = ['Activo', 'Inactivo'];
  const normalized = String(status || 'Activo').trim();
  return valid.includes(normalized) ? normalized : 'Activo';
}

module.exports = {
  ensureEmailStatusColumn,
  normalizeEmailStatus,
};