const { pool } = require('../../config/db');
const { parseTrailingDigits } = require('../../utils/ids');
const { mapPriorityFromGi, mapPriorityToGi, normalizeAgencyCode } = require('./maps');

async function listIncidentTypes(agencyCode) {
  const [rows] = await pool.query(
    `SELECT CONCAT('IT-', LPAD(e.ID_evento, 2, '0')) AS id,
            e.TipoEvento AS name,
            p.Prioridad AS default_priority_raw,
            e.Descripcion AS description
     FROM eventos e
     JOIN prioridades p ON p.ID_prioridad = e.prioridad_por_defecto
     WHERE UPPER(e.ID_Agencia) IN (UPPER(?), LOWER(?))
     ORDER BY e.ID_evento`,
    [agencyCode, agencyCode],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    default_priority: mapPriorityFromGi(r.default_priority_raw),
    description: r.description || '',
  }));
}

async function createIncidentType(id, name, defaultPriority, description, agencyCode) {
  const priorityName = mapPriorityToGi(defaultPriority || 'Media');
  const [pri] = await pool.query(
    `SELECT ID_prioridad FROM prioridades WHERE Prioridad = ? LIMIT 1`,
    [priorityName],
  );
  await pool.query(
    `INSERT INTO eventos (ID_Agencia, Descripcion, TipoEvento, prioridad_por_defecto)
     VALUES (?,?,?,?)`,
    [normalizeAgencyCode(agencyCode), description || name, name, pri[0]?.ID_prioridad || 2],
  );
  const [rows] = await pool.query(`SELECT ID_evento FROM eventos ORDER BY ID_evento DESC LIMIT 1`);
  const newId = `IT-${String(rows[0].ID_evento).padStart(2, '0')}`;
  return {
    id: newId,
    name,
    defaultPriority: defaultPriority || 'Media',
    description: description || '',
  };
}

async function updateIncidentType(id, { name, defaultPriority, description }) {
  const eventoId = parseTrailingDigits(id);
  if (eventoId == null) return null;
  const sets = [];
  const params = [];
  if (name != null) {
    sets.push('TipoEvento = ?');
    params.push(name);
  }
  if (description != null) {
    sets.push('Descripcion = ?');
    params.push(description);
  }
  if (defaultPriority != null) {
    const priorityName = mapPriorityToGi(defaultPriority);
    const [pri] = await pool.query(
      `SELECT ID_prioridad FROM prioridades WHERE Prioridad = ? LIMIT 1`,
      [priorityName],
    );
    sets.push('prioridad_por_defecto = ?');
    params.push(pri[0]?.ID_prioridad || 2);
  }
  if (sets.length) {
    params.push(eventoId);
    await pool.query(`UPDATE eventos SET ${sets.join(', ')} WHERE ID_evento = ?`, params);
  }
  const [rows] = await pool.query(
    `SELECT CONCAT('IT-', LPAD(ID_evento, 2, '0')) AS id, TipoEvento AS name,
            prioridad_por_defecto FROM eventos WHERE ID_evento = ?`,
    [eventoId],
  );
  if (!rows.length) return null;
  const [priRow] = await pool.query(`SELECT Prioridad FROM prioridades WHERE ID_prioridad = ?`, [
    rows[0].prioridad_por_defecto,
  ]);
  return {
    id: rows[0].id,
    name: rows[0].name,
    defaultPriority: mapPriorityFromGi(priRow[0]?.Prioridad),
    description: description || '',
  };
}

async function deleteIncidentType(id) {
  const eventoId = parseTrailingDigits(id);
  if (eventoId == null) return 0;
  const [r] = await pool.query(`DELETE FROM eventos WHERE ID_evento = ?`, [eventoId]);
  return r.affectedRows;
}

async function incidentTypeExists(id) {
  const eventoId = parseTrailingDigits(id);
  if (eventoId == null) return false;
  const [rows] = await pool.query(`SELECT ID_evento FROM eventos WHERE ID_evento = ?`, [eventoId]);
  return rows.length > 0;
}

async function findIncidentTypeIdByName(name, agencyCode) {
  if (!agencyCode) return null;
  const [rows] = await pool.query(
    `SELECT ID_evento FROM eventos
     WHERE TipoEvento = ? AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     LIMIT 1`,
    [name, agencyCode, agencyCode],
  );
  if (!rows.length) return null;
  return `IT-${String(rows[0].ID_evento).padStart(2, '0')}`;
}

module.exports = {
  listIncidentTypes,
  createIncidentType,
  updateIncidentType,
  deleteIncidentType,
  incidentTypeExists,
  findIncidentTypeIdByName,
};
