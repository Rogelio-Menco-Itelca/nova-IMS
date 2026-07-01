const { pool } = require('../../config/db');
const { resolveUserContext } = require('./users');
const { requireAgencyInput } = require('./agencyContext');

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
        (SELECT COUNT(*) FROM auditoria_general g WHERE g.ID_Usuario = u.ID_Usuario) +
        (SELECT COUNT(*) FROM auditoria_incidente ai WHERE ai.usuarios_id = u.ID_Usuario) +
        (SELECT COUNT(*) FROM registro_logueos rl WHERE rl.ID_Usuario = u.ID_Usuario) +
        (SELECT COUNT(*) FROM registrodobleautentificacion tfa WHERE tfa.ID_Usuario = u.ID_Usuario) AS actionCount,
        (SELECT MAX(t) FROM (
          SELECT MAX(g.FechaCambio) AS t FROM auditoria_general g WHERE g.ID_Usuario = u.ID_Usuario
          UNION ALL
          SELECT MAX(ai.fecha) AS t FROM auditoria_incidente ai WHERE ai.usuarios_id = u.ID_Usuario
          UNION ALL
          SELECT MAX(rl.Fecha) AS t FROM registro_logueos rl WHERE rl.ID_Usuario = u.ID_Usuario
          UNION ALL
          SELECT MAX(tfa.Fecha) AS t FROM registrodobleautentificacion tfa WHERE tfa.ID_Usuario = u.ID_Usuario
        ) combined) AS lastActivity
     FROM usuarios u
     LEFT JOIN roles r ON r.ID_Rol = u.ID_Rol
     ORDER BY userName ASC`,
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
    `SELECT id, source, action, details, timestamp FROM (
        SELECT g.ID_Auditoria AS id, 'admin' AS source, g.Accion AS action,
          g.Detalle AS details, g.FechaCambio AS timestamp
        FROM auditoria_general g WHERE g.ID_Usuario = ?
        UNION ALL
        SELECT ai.id_transaccion_incidentes AS id, 'incident' AS source,
          CONCAT(ai.accion, IFNULL(CONCAT(' (Incidente ', i.ID_visible, ')'), '')) AS action,
          COALESCE(ai.Numero_de_Cambios, ai.detalles) AS details, ai.fecha AS timestamp
        FROM auditoria_incidente ai
        LEFT JOIN incidentes i ON i.ID_incidente = ai.incidentes_id
        WHERE ai.usuarios_id = ?
        UNION ALL
        SELECT CONCAT('LOGIN-', rl.ID_registro) AS id, 'login' AS source,
          CONCAT(rl.Accion, ' (', rl.Login_exitoso, ')') AS action,
          rl.Descripcion_accion AS details, rl.Fecha AS timestamp
        FROM registro_logueos rl WHERE rl.ID_Usuario = ?
        UNION ALL
        SELECT CONCAT('2FA-', tfa.ID_accion) AS id, '2fa' AS source,
          tfa.accion AS action, CONCAT('Correo: ', tfa.Correo) AS details,
          tfa.Fecha AS timestamp
        FROM registrodobleautentificacion tfa WHERE tfa.ID_Usuario = ?
     ) combined
     ORDER BY timestamp DESC, id DESC`,
    [userId, userId, userId, userId],
  );
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    action: r.action,
    details: r.details,
    timestamp: r.timestamp,
  }));
}

module.exports = {
  writeAdminLog,
  listAdminLogs,
  listAuditLogs,
  parseAuditActorFromDetails,
  listUsersWithActivitySummary,
  listActionsByUser,
};
