const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { nextId } = require('../utils/ids');
const { writeAdminLog } = require('../utils/adminLog');

function mapPerson(r) {
  return {
    id: r.id,
    name: r.name,
    documentId: r.document_id,
    phone: r.phone,
    address: r.address,
    email: r.email || undefined,
    birthDate: r.birth_date || undefined,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  };
}

// GET /api/people
exports.list = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`SELECT * FROM people ORDER BY created_at DESC`);
  res.json(rows.map(mapPerson));
});

// POST /api/people
exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.documentId || !b.phone || !b.address) {
    throw new HttpError(400, 'name, documentId, phone y address son requeridos');
  }
  const id = await nextId('people', 'id', 'PER');
  await pool.query(
    `INSERT INTO people (id, name, document_id, phone, address, email, notes)
     VALUES (?,?,?,?,?,?,?)`,
    [id, b.name, b.documentId, b.phone, b.address, b.email || null, b.notes || null]
  );
  const [rows] = await pool.query(`SELECT * FROM people WHERE id = ?`, [id]);
  await writeAdminLog(req.user, 'Creación de Persona', `Se registró a ${b.name} (${id})`);
  res.status(201).json(mapPerson(rows[0]));
});

// PUT /api/people/:id
exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const [existing] = await pool.query(`SELECT id FROM people WHERE id = ?`, [id]);
  if (!existing.length) throw new HttpError(404, 'Persona no encontrada');

  await pool.query(
    `UPDATE people SET
        name        = COALESCE(?, name),
        document_id = COALESCE(?, document_id),
        phone       = COALESCE(?, phone),
        address     = COALESCE(?, address),
        email       = COALESCE(?, email),
        notes       = COALESCE(?, notes)
      WHERE id = ?`,
    [b.name ?? null, b.documentId ?? null, b.phone ?? null,
     b.address ?? null, b.email ?? null, b.notes ?? null, id]
  );
  const [rows] = await pool.query(`SELECT * FROM people WHERE id = ?`, [id]);
  await writeAdminLog(req.user, 'Actualización de Persona', `Se actualizó información de ID: ${id}`);
  res.json(mapPerson(rows[0]));
});

// DELETE /api/people/:id
exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.query(`DELETE FROM people WHERE id = ?`, [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Persona no encontrada');
  await writeAdminLog(req.user, 'Eliminación de Persona', `Se eliminó la persona ID: ${id}`);
  res.status(204).send();
});

// GET /api/telephony/lookup/:phone
exports.lookupByPhone = asyncHandler(async (req, res) => {
  const raw = decodeURIComponent(req.params.phone || '');
  const digits = raw.replace(/\D/g, '');
  const candidates = new Set([raw, digits]);
  if (digits.startsWith('57') && digits.length > 10) {
    candidates.add(digits.slice(2));
  } else if (digits.length === 10) {
    candidates.add(`57${digits}`);
    candidates.add(`+57${digits}`);
  }
  const list = [...candidates].filter(Boolean);
  const placeholders = list.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT * FROM people WHERE phone IN (${placeholders}) LIMIT 1`,
    list,
  );
  if (!rows.length) throw new HttpError(404, 'Número no registrado');

  const person = mapPerson(rows[0]);
  const [docRows] = await pool.query(
    `SELECT document_type
       FROM incident_people
      WHERE document_type IS NOT NULL
        AND TRIM(document_type) <> ''
        AND (person_id = ? OR document_id = ? OR phone IN (${placeholders}))
      ORDER BY id DESC
      LIMIT 1`,
    [person.id, person.documentId, ...list],
  );
  if (docRows.length) {
    person.documentType = docRows[0].document_type;
  }

  res.json(person);
});
