const { pool } = require('../../config/db');

let emailStatusColumnReady = false;

/**
 * Compatibilidad con BD creadas antes de `estado` en 01_schema.sql.
 * Sin dependencias de incidents/notifications (evita require circular).
 */
async function ensureEmailStatusColumn() {
  if (emailStatusColumnReady) return;
  const [cols] = await pool.query("SHOW COLUMNS FROM correosincidentes LIKE 'estado'");
  if (!cols.length) {
    await pool.query(
      `ALTER TABLE correosincidentes ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'Activo'`,
    );
  }
  emailStatusColumnReady = true;
}

function normalizeEmailStatus(status) {
  const valid = ['Activo', 'Inactivo'];
  const normalized = String(status || 'Activo').trim();
  return valid.includes(normalized) ? normalized : 'Activo';
}

module.exports = {
  ensureEmailStatusColumn,
  normalizeEmailStatus,
};
