const { pool } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { locationChannelToGi, locationChannelFromGi } = require('./maps');
const { resolveActorForDb } = require('../../utils/jwtUser');
const { getInternalId } = require('./incidents');
const { requireAgencyInput } = require('./agencyContext');

const NO_DB_USER_MSG =
  'No se pudo registrar el operador de esta sesión en MySQL. Verifique LDAP_DEFAULT_ROLE_ID y LDAP_DEFAULT_AGENCY_CODE en backend/.env.';

async function createLocationRequest({ phone, channel, incidentId, user, requestUrl }) {
  requireAgencyInput(null, user);
  const actor = await resolveActorForDb(user);
  if (!actor?.userId) {
    throw new HttpError(400, NO_DB_USER_MSG);
  }
  const internalIncident = incidentId ? await getInternalId(incidentId) : null;

  const [result] = await pool.query(
    `INSERT INTO ubicacion
      (Numero_ubicacion, Canal, ID_incidente, url_peticion, ID_usuario, ID_Agencia)
     VALUES (?,?,?,?,?,?)`,
    [
      String(phone).replace(/\D/g, ''),
      locationChannelToGi(channel),
      internalIncident,
      requestUrl,
      actor.userId,
      actor.agencyCode,
    ],
  );
  return result.insertId;
}

async function receiveLocation(id, lat, lng) {
  await pool.query(
    `UPDATE ubicacion SET lat = ?, \`long\` = ?, FechaHora_recibido = NOW() WHERE ID_solicitud = ?`,
    [lat, lng, id],
  );
  const [rows] = await pool.query(`SELECT * FROM ubicacion WHERE ID_solicitud = ?`, [id]);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.ID_solicitud,
    lat: Number(r.lat),
    lng: Number(r.long),
    phoneNumber: r.Numero_ubicacion,
    timestamp: Date.now(),
  };
}

async function getLocationRequest(id) {
  const [rows] = await pool.query(`SELECT * FROM ubicacion WHERE ID_solicitud = ?`, [id]);
  return rows[0] || null;
}

async function listLocationRequests() {
  const [rows] = await pool.query(
    `SELECT ID_solicitud AS id, Numero_ubicacion AS phone,
            LOWER(Canal) AS channel, url_peticion AS requestUrl,
            lat AS lat, \`long\` AS lng,
            FechaHora_recibido AS receivedAt, FechaHora_envio AS createdAt
     FROM ubicacion ORDER BY FechaHora_envio DESC LIMIT 100`,
  );
  return rows.map((r) => ({
    ...r,
    channel: locationChannelFromGi(r.channel),
  }));
}

async function updateLocationByRequestUrl(requestId, lat, lng, address = null) {
  const params = [lat, lng];
  let sql = `UPDATE ubicacion SET lat = ?, \`long\` = ?, FechaHora_recibido = NOW()`;
  if (address) {
    sql += `, direccion = ?`;
    params.push(String(address).substring(0, 100));
  }
  sql += ` WHERE url_peticion LIKE ?`;
  params.push(`%request_id=${requestId}%`);
  await pool.query(sql, params);
}

async function linkLocationToIncident(
  internalIncidentId,
  { requestId, solicitudId, phone } = {},
  executor = pool,
) {
  if (!internalIncidentId) return 0;

  if (solicitudId) {
    const [r] = await executor.query(
      `UPDATE ubicacion SET ID_incidente = ?
       WHERE ID_solicitud = ? AND ID_incidente IS NULL`,
      [internalIncidentId, solicitudId],
    );
    return r.affectedRows;
  }

  if (requestId) {
    const [r] = await executor.query(
      `UPDATE ubicacion SET ID_incidente = ?
       WHERE url_peticion LIKE ? AND ID_incidente IS NULL`,
      [internalIncidentId, `%request_id=${requestId}%`],
    );
    if (r.affectedRows > 0) return r.affectedRows;
  }

  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone) return 0;

  const [r] = await executor.query(
    `UPDATE ubicacion u
     INNER JOIN (
       SELECT ID_solicitud
       FROM ubicacion
       WHERE ID_incidente IS NULL
         AND Numero_ubicacion = ?
         AND lat IS NOT NULL
       ORDER BY FechaHora_recibido DESC, ID_solicitud DESC
       LIMIT 1
     ) latest ON latest.ID_solicitud = u.ID_solicitud
     SET u.ID_incidente = ?`,
    [cleanPhone, internalIncidentId],
  );
  return r.affectedRows;
}

async function findByRequestUrlPattern(requestId) {
  const [rows] = await pool.query(
    `SELECT * FROM ubicacion WHERE url_peticion LIKE ? ORDER BY ID_solicitud DESC LIMIT 1`,
    [`%request_id=${requestId}%`],
  );
  return rows[0] || null;
}

module.exports = {
  createLocationRequest,
  receiveLocation,
  getLocationRequest,
  listLocationRequests,
  updateLocationByRequestUrl,
  findByRequestUrlPattern,
  linkLocationToIncident,
  locationChannelFromGi,
};
