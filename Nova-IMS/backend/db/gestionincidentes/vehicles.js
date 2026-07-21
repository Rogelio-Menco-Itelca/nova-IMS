const { pool } = require('../../config/db');
const { normalizeAgencyCode } = require('./maps');

function normalizePlate(plate) {
  return String(plate || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

async function lookupByPlate(plate) {
  const normalized = normalizePlate(plate);
  if (!normalized || normalized.length < 5) return null;

  const [rows] = await pool.query(
    `SELECT v.Placa AS plate, v.Marca AS make, v.Modelo_linea AS model, v.Color AS color
     FROM vehiculos v
     WHERE UPPER(REPLACE(REPLACE(REPLACE(v.Placa, '-', ''), ' ', ''), '.', '')) = ?
     ORDER BY v.FechaRegistro DESC, v.ID_vehiculo DESC
     LIMIT 1`,
    [normalized],
  );
  return rows[0] || null;
}

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
  normalizePlate,
  lookupByPlate,
  insertVehicleComment,
  deleteVehicleCommentsForIncident,
};
