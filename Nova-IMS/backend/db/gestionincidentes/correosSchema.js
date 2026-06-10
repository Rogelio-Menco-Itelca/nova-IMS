const { pool } = require('../../config/db');

let emailStatusColumnReady = false;

async function ensureEmailStatusColumn() {
  if (emailStatusColumnReady) return;
  const [cols] = await pool.query("SHOW COLUMNS FROM correosincidentes LIKE 'estado'");
  if (!cols.length) {
    await pool.query(
      `ALTER TABLE correosincidentes ADD COLUMN estado varchar(20) NOT NULL DEFAULT 'Activo'`,
    );
  }
  await pool.query(
    `UPDATE correosincidentes SET estado = 'Activo' WHERE estado IS NULL OR estado = ''`,
  );
  emailStatusColumnReady = true;
}

function normalizeEmailStatus(value) {
  return String(value || 'Activo').trim() === 'Inactivo' ? 'Inactivo' : 'Activo';
}

module.exports = {
  ensureEmailStatusColumn,
  normalizeEmailStatus,
};
