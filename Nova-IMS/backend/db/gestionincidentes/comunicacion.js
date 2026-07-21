const { pool } = require('../../config/db');
const logger = require('../../utils/logger');
const { resolveUserContext } = require('./users');

function truncateEmail(email) {
  return String(email ?? '').trim().substring(0, 150);
}

async function resolveCanonicalRecipientEmails(recipients) {
  if (!recipients?.length) return [];
  const ph = recipients.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT MIN(Correo) AS email
     FROM correosincidentes
     WHERE LOWER(Correo) IN (${ph})
     GROUP BY LOWER(Correo)`,
    recipients.map((e) => String(e).trim().toLowerCase()),
  );
  return rows.map((r) => r.email);
}

async function insertIncidentEmailCommunications({
  incidentInternalId,
  userId,
  agencyCode,
  recipientEmails,
}) {
  if (!incidentInternalId || !userId || !agencyCode) {
    throw new Error('Faltan datos de incidente, usuario o agencia para comunicacion');
  }

  const canonical = await resolveCanonicalRecipientEmails(recipientEmails);
  if (!canonical.length) {
    throw new Error('No hay destinatarios válidos en correosincidentes');
  }

  const sentAt = new Date();
  for (const dest of canonical) {
    await pool.query(
      `INSERT INTO comunicacion
        (ID_incidente, ID_usuario, ID_Agencia, Fecha_envio, Destinatario)
       VALUES (?,?,?,?,?)`,
      [incidentInternalId, userId, agencyCode, sentAt, truncateEmail(dest)],
    );
  }

  return canonical.length;
}

async function logIncidentEmailCommunications({
  incidentInternalId,
  sessionUser,
  agencyCode,
  recipientEmails,
}) {
  const userCtx = await resolveUserContext(sessionUser?.sub, agencyCode);
  if (!userCtx?.userId) {
    throw new Error('Usuario de sesión no encontrado en usuarios');
  }

  return insertIncidentEmailCommunications({
    incidentInternalId,
    userId: userCtx.userId,
    agencyCode: userCtx.agencyCode,
    recipientEmails,
  });
}

async function safeLog(fn) {
  try {
    return await fn();
  } catch (err) {
    logger.error('[comunicacion]', err.message);
    return null;
  }
}

module.exports = {
  resolveCanonicalRecipientEmails,
  insertIncidentEmailCommunications,
  logIncidentEmailCommunications,
  safeLog,
};
