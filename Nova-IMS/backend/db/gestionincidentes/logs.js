const { pool } = require('../../config/db');
const { resolveUserContext } = require('./users');
const { requireAgencyInput } = require('./agencyContext');

async function writeAdminLog(jwtUser, action, details) {
  const id = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const agencyCode = requireAgencyInput(null, jwtUser);
  const ctx = await resolveUserContext(jwtUser?.sub, agencyCode);
  await pool.query(
    `INSERT INTO auditoria_general
      (ID_Auditoria, Tabla_Afectada, Accion, Detalle, ID_Usuario, ID_Agencia)
     VALUES (?,?,?,?,?,?)`,
    [id, 'admin', action, details, ctx.userId || jwtUser?.sub || 'SYSTEM', ctx.agencyCode],
  );
  return {
    id,
    user: jwtUser?.name || 'Sistema',
    action,
    details,
    timestamp: new Date(),
  };
}

async function listAdminLogs() {
  const [rows] = await pool.query(
    `SELECT ID_Auditoria AS id, ID_Usuario AS user_id, Accion AS action,
            Detalle AS details, FechaCambio AS created_at
     FROM auditoria_general
     WHERE Tabla_Afectada = 'admin'
     ORDER BY FechaCambio DESC
     LIMIT 200`,
  );
  return rows.map((r) => ({
    id: r.id,
    user: r.user_id || 'Sistema',
    action: r.action,
    details: r.details,
    timestamp: r.created_at,
  }));
}

async function listAuditLogs() {
  const [rows] = await pool.query(
    `SELECT a.id_transaccion_incidentes AS id,
            i.ID_visible AS incidentId,
            a.accion AS action,
            a.Numero_de_Cambios AS changes,
            a.detalles AS details_json,
            a.fecha AS timestamp,
            a.usuarios_id AS user_id
     FROM auditoria_incidente a
     LEFT JOIN incidentes i ON i.ID_incidente = a.incidentes_id
     ORDER BY a.fecha DESC
     LIMIT 500`,
  );
  return rows.map((r) => ({
    id: r.id,
    incidentId: r.incidentId,
    user: r.user_id || 'Sistema',
    action: r.action,
    changes: r.changes,
    details_json: r.details_json,
    timestamp: r.timestamp,
  }));
}

module.exports = {
  writeAdminLog,
  listAdminLogs,
  listAuditLogs,
};
