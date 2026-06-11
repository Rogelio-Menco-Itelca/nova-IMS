const { pool } = require('../../config/db');

/**
 * Asegura que la columna 'estado' exista en correosincidentes
 */
async function ensureEmailStatusColumn() {
  const [cols] = await pool.query("SHOW COLUMNS FROM correosincidentes LIKE 'estado'");
  if (!cols.length) {
    await pool.query(
      `ALTER TABLE correosincidentes ADD COLUMN estado VARCHAR(20) DEFAULT 'Activo'`,
    );
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