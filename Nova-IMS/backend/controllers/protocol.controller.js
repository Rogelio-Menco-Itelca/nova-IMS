const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { nextId } = require('../utils/ids');

async function hydrateSteps(protocols) {
  if (!protocols.length) return [];
  const ids = protocols.map(p => p.id);
  const placeholders = ids.map(() => '?').join(',');
  const [steps] = await pool.query(
    `SELECT protocol_id, description FROM protocol_steps
      WHERE protocol_id IN (${placeholders}) ORDER BY protocol_id, step_order`, ids);
  const stepsByP = {};
  steps.forEach(s => (stepsByP[s.protocol_id] = stepsByP[s.protocol_id] || []).push(s.description));
  return protocols.map(p => ({
    id: p.id,
    name: p.name,
    incidentTypeName: p.type_name || '',
    steps: stepsByP[p.id] || [],
  }));
}

// GET /api/response-protocols
exports.list = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT rp.id, rp.name, it.name AS type_name
       FROM response_protocols rp
       LEFT JOIN incident_types it ON it.id = rp.incident_type_id
      ORDER BY rp.created_at DESC`);
  res.json(await hydrateSteps(rows));
});

// POST /api/response-protocols
exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.incidentTypeName || !Array.isArray(b.steps))
    throw new HttpError(400, 'name, incidentTypeName y steps[] son requeridos');

  const [tr] = await pool.query(`SELECT id FROM incident_types WHERE name = ? LIMIT 1`,
    [b.incidentTypeName]);
  if (!tr.length) throw new HttpError(400, `Tipo de incidente no encontrado: ${b.incidentTypeName}`);

  const id = await nextId('response_protocols', 'id', 'RPR', 2);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO response_protocols (id, name, incident_type_id) VALUES (?,?,?)`,
      [id, b.name, tr[0].id]);
    for (let i = 0; i < b.steps.length; i++) {
      await conn.query(
        `INSERT INTO protocol_steps (protocol_id, step_order, description) VALUES (?,?,?)`,
        [id, i + 1, b.steps[i]]);
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }

  const [rows] = await pool.query(
    `SELECT rp.id, rp.name, it.name AS type_name
       FROM response_protocols rp
       LEFT JOIN incident_types it ON it.id = rp.incident_type_id
      WHERE rp.id = ?`, [id]);
  const [out] = await hydrateSteps(rows);
  res.status(201).json(out);
});

// PUT /api/response-protocols/:id
exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const [existing] = await pool.query(`SELECT id FROM response_protocols WHERE id = ?`, [id]);
  if (!existing.length) throw new HttpError(404, 'Protocolo no encontrado');

  let typeId = null;
  if (b.incidentTypeName) {
    const [tr] = await pool.query(`SELECT id FROM incident_types WHERE name = ? LIMIT 1`,
      [b.incidentTypeName]);
    if (!tr.length) throw new HttpError(400, `Tipo no encontrado: ${b.incidentTypeName}`);
    typeId = tr[0].id;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE response_protocols SET
          name = COALESCE(?, name),
          incident_type_id = COALESCE(?, incident_type_id)
        WHERE id = ?`, [b.name ?? null, typeId, id]);

    if (Array.isArray(b.steps)) {
      await conn.query(`DELETE FROM protocol_steps WHERE protocol_id = ?`, [id]);
      for (let i = 0; i < b.steps.length; i++) {
        await conn.query(
          `INSERT INTO protocol_steps (protocol_id, step_order, description) VALUES (?,?,?)`,
          [id, i + 1, b.steps[i]]);
      }
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }

  const [rows] = await pool.query(
    `SELECT rp.id, rp.name, it.name AS type_name
       FROM response_protocols rp
       LEFT JOIN incident_types it ON it.id = rp.incident_type_id
      WHERE rp.id = ?`, [id]);
  const [out] = await hydrateSteps(rows);
  res.json(out);
});

// DELETE /api/response-protocols/:id
exports.remove = asyncHandler(async (req, res) => {
  const [r] = await pool.query(`DELETE FROM response_protocols WHERE id = ?`, [req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Protocolo no encontrado');
  res.status(204).send();
});
