const { pool } = require('../../config/db');
const { normalizeAgencyCode } = require('./maps');

async function listPlaceRoles(agencyCode) {
  const code = normalizeAgencyCode(agencyCode);
  const [rows] = await pool.query(
    `SELECT ID_Rol_Lugar AS id, Rol_lugar AS name, Descripcion AS description
     FROM roles_lugar
     WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     ORDER BY Rol_lugar`,
    [code, code],
  );
  return rows;
}

module.exports = {
  listPlaceRoles,
};
