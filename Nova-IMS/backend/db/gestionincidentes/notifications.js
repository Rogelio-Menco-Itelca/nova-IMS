const { pool } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { resolveUserContext } = require('./users');
const { resolveActorForDb } = require('../../utils/jwtUser');
const { normalizeAgencyCode } = require('./maps');
const { requireAgencyInput } = require('./agencyContext');
const { ensureEmailStatusColumn, normalizeEmailStatus } = require('./correosSchema');

async function listNotifications() {
  const [rows] = await pool.query(
    `SELECT n.id_notificaciones AS id,
            i.ID_visible AS incident_id,
            n.triggered_by,
            n.titulo AS title,
            n.mensaje AS message,
            n.fue_leida AS is_read,
            n.fecha_creacion AS created_at,
            TRIM(CONCAT(u.Primer_Nombre, ' ', u.Primer_Apellido)) AS triggered_by_name
     FROM notificaciones_usuarios n
     LEFT JOIN incidentes i ON i.ID_incidente = n.incidente_id
     LEFT JOIN usuarios u ON u.ID_Usuario = n.triggered_by AND u.ID_Agencia = n.ID_agencia
     ORDER BY n.fecha_creacion DESC
     LIMIT 50`,
  );
  return rows;
}

async function createNotification({
  id,
  title,
  message,
  triggeredBy,
  incidentId,
  agencyCode,
  jwtUser,
}) {
  const { getInternalId } = require('./incidents');
  const agency = requireAgencyInput(agencyCode);
  const actor =
    (jwtUser && (await resolveActorForDb(jwtUser))) ||
    (triggeredBy ? await resolveUserContext(triggeredBy, agency) : null);
  if (!actor?.userId) {
    return;
  }
  const internalIncident = incidentId ? await getInternalId(incidentId) : null;

  await pool.query(
    `INSERT INTO notificaciones_usuarios
      (id_notificaciones, incidente_id, triggered_by, titulo, mensaje, fue_leida, ID_agencia, ID_usuario)
     VALUES (?,?,?,?,?,0,?,?)`,
    [id, internalIncident, actor.userId, title, message, actor.agencyCode, actor.userId],
  );
}

async function markAllRead(userId, agencyCode) {
  const ctx = await resolveUserContext(userId, agencyCode);
  if (ctx.userId) {
    await pool.query(
      `UPDATE notificaciones_usuarios SET fue_leida = 1, fecha_visualizacion = NOW()
       WHERE fue_leida = 0 AND ID_usuario = ? AND UPPER(ID_agencia) = ?`,
      [ctx.userId, ctx.agencyCode],
    );
  } else {
    await pool.query(
      `UPDATE notificaciones_usuarios SET fue_leida = 1, fecha_visualizacion = NOW()
       WHERE fue_leida = 0`,
    );
  }
}

async function listNotificationEmails(agencyCode) {
  await ensureEmailStatusColumn();
  const code = normalizeAgencyCode(agencyCode);
  const [rows] = await pool.query(
    `SELECT Correo AS email, COALESCE(NULLIF(estado, ''), 'Activo') AS status
     FROM correosincidentes
     WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     ORDER BY Correo`,
    [code, code],
  );
  return rows.map((r) => ({
    email: r.email,
    status: normalizeEmailStatus(r.status),
  }));
}

async function addNotificationEmail(email, agencyCode) {
  await ensureEmailStatusColumn();
  const normalized = email.trim().toLowerCase();
  const code = normalizeAgencyCode(agencyCode);
  const [existing] = await pool.query(
    `SELECT COALESCE(NULLIF(estado, ''), 'Activo') AS status
     FROM correosincidentes
     WHERE LOWER(Correo) = ? AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     LIMIT 1`,
    [normalized, code, code],
  );
  if (existing.length) {
    const status = normalizeEmailStatus(existing[0].status);
    if (status === 'Activo') {
      throw new HttpError(409, 'Este correo ya está activo en la lista.');
    }
    throw new HttpError(
      409,
      'Este correo ya existe pero está inactivo. Actívelo desde Acciones.',
    );
  }
  await pool.query(
    `INSERT INTO correosincidentes (Correo, ID_Agencia, estado) VALUES (?,?, 'Activo')`,
    [normalized, code],
  );
}

async function setNotificationEmailStatus(email, agencyCode, status) {
  await ensureEmailStatusColumn();
  const estado = normalizeEmailStatus(status);
  const code = normalizeAgencyCode(agencyCode);
  const [r] = await pool.query(
    `UPDATE correosincidentes SET estado = ?
     WHERE LOWER(Correo) = ? AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))`,
    [estado, email.toLowerCase(), code, code],
  );
  return r.affectedRows;
}

module.exports = {
  listNotifications,
  createNotification,
  markAllRead,
  listNotificationEmails,
  addNotificationEmail,
  setNotificationEmailStatus,
};
