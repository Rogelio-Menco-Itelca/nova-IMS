const { normalizeAgencyCode } = require('./maps');

async function insertVehicleComment(executor, vehicleId, text, userId, agencyCode) {
  const commentText = String(text || '').trim();
  if (!commentText || !userId || !vehicleId) return;
  await executor.query(
    `INSERT INTO comentariosvehiculos (ID_vehiculo, ID_Usuario, ID_Agencia, Comentarios)
     VALUES (?,?,?,?)`,
    [vehicleId, userId, normalizeAgencyCode(agencyCode), commentText.substring(0, 200)],
  );
}

async function deleteVehicleCommentsForIncident(executor, internalId) {
  await executor.query(
    `DELETE cv FROM comentariosvehiculos cv
     INNER JOIN vehiculos v ON v.ID_vehiculo = cv.ID_vehiculo
     WHERE v.ID_incidente = ?`,
    [internalId],
  );
}

module.exports = {
  insertVehicleComment,
  deleteVehicleCommentsForIncident,
};
