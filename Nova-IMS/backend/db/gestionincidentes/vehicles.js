const { pool } = require('../../config/db');
const { normalizeAgencyCode } = require('./maps');

async function listVehicleRoles(agencyCode) {
  const code = normalizeAgencyCode(agencyCode);
  const [rows] = await pool.query(
    `SELECT ID_RolVehiculo AS id, Nombre AS name, Descripcion AS description
     FROM rolesvehiculo
     WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     ORDER BY Nombre`,
    [code, code],
  );
  return rows;
}

module.exports = {
  listVehicleRoles,
};
