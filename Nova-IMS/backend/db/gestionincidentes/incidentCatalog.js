const { pool } = require('../../config/db');
const { normalizeAgencyCode } = require('./maps');
const { WORKFLOW_RANK_CSJ } = require('./transitions');

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

function sortStatusesForAgency(rows, agencyCode) {
  const code = normalizeAgencyCode(agencyCode);
  if (code !== 'CSJ') return rows;
  return [...rows].sort((a, b) => {
    const rankA = WORKFLOW_RANK_CSJ[a.name] ?? 999;
    const rankB = WORKFLOW_RANK_CSJ[b.name] ?? 999;
    if (rankA !== rankB) return rankA - rankB;
    return String(a.name).localeCompare(String(b.name), 'es');
  });
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
  return sortStatusesForAgency(rows, code);
}

module.exports = {
  listOrigins,
  listIncidentStatuses,
};
