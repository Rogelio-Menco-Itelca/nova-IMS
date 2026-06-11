const { pool } = require('../../config/db');
const { parseTrailingDigits } = require('../../utils/ids');
const { findIncidentTypeIdByName } = require('./incidentTypes');
const { normalizeAgencyCode } = require('./maps');

async function listProtocols() {
  const [rows] = await pool.query(
    `SELECT p.ID_Protocolo AS internal_id,
            CONCAT('RPR-', LPAD(p.ID_Protocolo, 2, '0')) AS id,
            p.Protocolo AS name,
            e.TipoEvento AS type_name
     FROM protocolos p
     LEFT JOIN eventos e ON e.ID_evento = p.ID_evento
     ORDER BY p.FechaRegistro DESC`,
  );
  return hydrateSteps(rows);
}

async function hydrateSteps(protocols) {
  if (!protocols.length) return [];
  const ids = protocols.map((p) => p.internal_id);
  const ph = ids.map(() => '?').join(',');
  const [steps] = await pool.query(
    `SELECT ID_Protocolo AS protocol_id, Descripcion AS description
     FROM pasosprotocolo
     WHERE ID_Protocolo IN (${ph})
     ORDER BY ID_Protocolo, NumeroPaso`,
    ids,
  );
  const byP = {};
  steps.forEach((s) => {
    (byP[s.protocol_id] = byP[s.protocol_id] || []).push(s.description);
  });
  return protocols.map((p) => ({
    id: p.id,
    name: p.name,
    incidentTypeName: p.type_name || '',
    steps: byP[p.internal_id] || [],
  }));
}

async function createProtocol({ name, incidentTypeName, steps, agencyCode }) {
  const typeId = await findIncidentTypeIdByName(incidentTypeName, agencyCode);
  if (!typeId) throw new Error(`Tipo no encontrado: ${incidentTypeName}`);
  const eventoId = parseTrailingDigits(typeId);
  if (eventoId == null) throw new Error(`ID de tipo inválido: ${typeId}`);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.query(
      `INSERT INTO protocolos (Protocolo, ID_evento, ID_Agencia, Descripcion)
       VALUES (?,?,?,?)`,
      [name, eventoId, normalizeAgencyCode(agencyCode), name],
    );
    const protocolId = ins.insertId;
    for (let i = 0; i < steps.length; i++) {
      await conn.query(
        `INSERT INTO pasosprotocolo (ID_Protocolo, NumeroPaso, Descripcion) VALUES (?,?,?)`,
        [protocolId, i + 1, steps[i]],
      );
    }
    await conn.commit();
    return `RPR-${String(protocolId).padStart(2, '0')}`;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updateProtocol(id, { name, incidentTypeName, steps, agencyCode }) {
  const protocolId = parseTrailingDigits(id);
  if (protocolId == null) return null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let eventoId = null;
    if (incidentTypeName) {
      const typeId = await findIncidentTypeIdByName(incidentTypeName, agencyCode);
      if (!typeId) throw new Error(`Tipo no encontrado: ${incidentTypeName}`);
      eventoId = parseTrailingDigits(typeId);
      if (eventoId == null) throw new Error(`ID de tipo inválido: ${typeId}`);
    }
    await conn.query(
      `UPDATE protocolos SET
         Protocolo = COALESCE(?, Protocolo),
         ID_evento = COALESCE(?, ID_evento),
         Descripcion = COALESCE(?, Descripcion)
       WHERE ID_Protocolo = ?`,
      [name ?? null, eventoId, name ?? null, protocolId],
    );
    if (Array.isArray(steps)) {
      await conn.query(`DELETE FROM pasosprotocolo WHERE ID_Protocolo = ?`, [protocolId]);
      for (let i = 0; i < steps.length; i++) {
        await conn.query(
          `INSERT INTO pasosprotocolo (ID_Protocolo, NumeroPaso, Descripcion) VALUES (?,?,?)`,
          [protocolId, i + 1, steps[i]],
        );
      }
    }
    await conn.commit();
    return id;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function deleteProtocol(id) {
  const protocolId = parseTrailingDigits(id);
  if (protocolId == null) return 0;
  await pool.query(`DELETE FROM pasosprotocolo WHERE ID_Protocolo = ?`, [protocolId]);
  const [r] = await pool.query(`DELETE FROM protocolos WHERE ID_Protocolo = ?`, [protocolId]);
  return r.affectedRows;
}

async function protocolExists(id) {
  const protocolId = parseTrailingDigits(id);
  if (protocolId == null) return false;
  const [rows] = await pool.query(`SELECT ID_Protocolo FROM protocolos WHERE ID_Protocolo = ?`, [
    protocolId,
  ]);
  return rows.length > 0;
}

module.exports = {
  listProtocols,
  createProtocol,
  updateProtocol,
  deleteProtocol,
  protocolExists,
};
