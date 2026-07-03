const { pool } = require('../../config/db');

function parseAuditActorFromDetails(raw) {
  if (raw == null) return null;
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const name = value.actorDisplayName || value.creatorDisplayName;
  const trimmed = String(name || '').trim();
  return trimmed || null;
}

async function listAdminLogs() {
  const [rows] = await pool.query(
    `SELECT ID_Auditoria AS id, Nombre_Usuario AS actor_name, ID_Usuario AS user_id,
            Accion AS action, Detalle AS details, FechaCambio AS created_at
     FROM auditoria_general
     WHERE Categoria = 'administracion'
     ORDER BY FechaCambio DESC
     LIMIT 200`,
  );
  return rows.map((r) => ({
    id: r.id,
    user: r.actor_name || r.user_id || 'Sistema',
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
    user: parseAuditActorFromDetails(r.details_json) || r.user_id || 'Sistema',
    action: r.action,
    changes: r.changes,
    details_json: r.details_json,
    timestamp: r.timestamp,
  }));
}

async function listUsersWithActivitySummary() {
  const [rows] = await pool.query(
    `SELECT
        u.ID_Usuario AS userId,
        TRIM(CONCAT(
          u.Primer_Nombre, ' ',
          IFNULL(CONCAT(u.Segundo_Nombre, ' '), ''),
          u.Primer_Apellido, ' ',
          IFNULL(u.Segundo_Apellido, '')
        )) AS userName,
        r.Rol AS roleName,
        u.ID_Agencia AS agencyCode,
        u.estado AS status,
        (SELECT COUNT(*) FROM auditoria_general a WHERE a.ID_Usuario = u.ID_Usuario) AS actionCount,
        (SELECT MAX(a.FechaCambio) FROM auditoria_general a WHERE a.ID_Usuario = u.ID_Usuario) AS lastActivity
     FROM usuarios u
     LEFT JOIN roles r ON r.ID_Rol = u.ID_Rol
     ORDER BY lastActivity IS NULL, lastActivity DESC, userName ASC`,
  );
  return rows.map((r) => ({
    userId: r.userId,
    userName: r.userName?.trim() || r.userId,
    roleName: r.roleName || '—',
    agencyCode: r.agencyCode,
    status: r.status,
    actionCount: Number(r.actionCount) || 0,
    lastActivity: r.lastActivity,
  }));
}

async function listActionsByUser(userId) {
  const [rows] = await pool.query(
    `SELECT
        a.ID_Auditoria AS id,
        a.Categoria AS source,
        a.Modulo AS module,
        a.Accion AS action,
        a.Resultado AS outcome,
        a.Detalle AS details,
        a.Tabla_Afectada AS affectedTable,
        a.FechaCambio AS timestamp
     FROM auditoria_general a
     WHERE a.ID_Usuario = ?
     ORDER BY a.FechaCambio DESC, a.ID_Auditoria DESC
     LIMIT 1000`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    source: r.source || 'administracion',
    module: r.module || null,
    action: r.action,
    outcome: r.outcome || null,
    details: r.details || null,
    affectedTable: r.affectedTable || null,
    timestamp: r.timestamp,
  }));
}

module.exports = {
  listAdminLogs,
  listAuditLogs,
  parseAuditActorFromDetails,
  listUsersWithActivitySummary,
  listActionsByUser,
};
