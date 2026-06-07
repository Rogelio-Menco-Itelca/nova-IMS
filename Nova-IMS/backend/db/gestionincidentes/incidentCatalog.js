const { pool } = require("../../config/db");
const { normalizeAgencyCode } = require("./maps");

async function listOrigins(agencyCode) {
  const code = normalizeAgencyCode(agencyCode);
  const [rows] = await pool.query(
    `SELECT ID_Origen AS id, Nombre AS name, Descripcion AS description
     FROM origen
     WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     ORDER BY Nombre`,
    [code, code],
  );
  return rows;
}

async function listIncidentStatuses(agencyCode) {
  const code = normalizeAgencyCode(agencyCode);
  const [rows] = await pool.query(
    `SELECT ID_estado AS id, Nombre_estado AS name, Descripcion AS description
     FROM estadosincidentes
     WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     ORDER BY ID_estado`,
    [code, code],
  );
  return rows;
}

module.exports = {
  listOrigins,
  listIncidentStatuses,
};
