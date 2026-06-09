const { pool } = require('../../config/db');
const { getInternalId } = require('./incidents');
const { resolveUserContext } = require('./users');
const { normalizeAgencyCode } = require('./maps');
const { requireAgencyInput } = require('./agencyContext');

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

async function createNotification({ id, title, message, triggeredBy, incidentId, agencyCode }) {
  const agency = requireAgencyInput(agencyCode);
  const ctx = await resolveUserContext(triggeredBy, agency);
  const internalIncident = incidentId ? await getInternalId(incidentId) : null;

  await pool.query(
    `INSERT INTO notificaciones_usuarios
      (id_notificaciones, incidente_id, triggered_by, titulo, mensaje, fue_leida, ID_agencia, ID_usuario)
     VALUES (?,?,?,?,?,0,?,?)`,
    [id, internalIncident, ctx.userId, title, message, ctx.agencyCode, ctx.userId],
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

async function listNotificationEmails() {
  const [rows] = await pool.query(
    `SELECT Correo AS email FROM correosincidentes GROUP BY Correo ORDER BY Correo`,
  );
  return rows.map((r, i) => ({ id: i + 1, email: r.email }));
}

async function addNotificationEmail(email, agencyCode) {
  await pool.query(`INSERT IGNORE INTO correosincidentes (Correo, ID_Agencia) VALUES (?,?)`, [
    email.trim().toLowerCase(),
    normalizeAgencyCode(agencyCode),
  ]);
}

async function deleteNotificationEmail(email) {
  const [r] = await pool.query(`DELETE FROM correosincidentes WHERE LOWER(Correo) = ?`, [
    email.toLowerCase(),
  ]);
  return r.affectedRows;
}

module.exports = {
  listNotifications,
  createNotification,
  markAllRead,
  listNotificationEmails,
  addNotificationEmail,
  deleteNotificationEmail,
};
