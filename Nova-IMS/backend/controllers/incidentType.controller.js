const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { nextId } = require('../utils/ids');

const map = (r) => ({
  id: r.id, name: r.name, defaultPriority: r.default_priority, description: r.description || '',
});

// GET /api/incident-types
exports.list = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`SELECT * FROM incident_types ORDER BY id`);
  res.json(rows.map(map));
});

// POST /api/incident-types
exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name) throw new HttpError(400, 'name requerido');
  const id = await nextId('incident_types', 'id', 'IT', 2);
  await pool.query(
    `INSERT INTO incident_types (id, name, default_priority, description) VALUES (?,?,?,?)`,
    [id, b.name, b.defaultPriority || 'Media', b.description || null]);
  const [rows] = await pool.query(`SELECT * FROM incident_types WHERE id = ?`, [id]);
  res.status(201).json(map(rows[0]));
});

// PUT /api/incident-types/:id
exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const [existing] = await pool.query(`SELECT id FROM incident_types WHERE id = ?`, [id]);
  if (!existing.length) throw new HttpError(404, 'Tipo de incidente no encontrado');

  await pool.query(
    `UPDATE incident_types SET
        name = COALESCE(?, name),
        default_priority = COALESCE(?, default_priority),
        description = COALESCE(?, description)
      WHERE id = ?`,
    [b.name ?? null, b.defaultPriority ?? null, b.description ?? null, id]);
  const [rows] = await pool.query(`SELECT * FROM incident_types WHERE id = ?`, [id]);
  res.json(map(rows[0]));
});

// DELETE /api/incident-types/:id
exports.remove = asyncHandler(async (req, res) => {
  const [result] = await pool.query(`DELETE FROM incident_types WHERE id = ?`, [req.params.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Tipo no encontrado');
  res.status(204).send();
});
