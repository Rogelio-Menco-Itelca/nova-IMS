const { pool } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { normalizeAgencyCode } = require('./maps');
const { resolveDocumentTypeCode } = require('./documentTypes');

const TABLE = 'personas';

let adminCatalogReady = false;

function formatNamePart(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  return trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function normalizeGenderId(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Corrige registros admin guardados con incidente técnico CAT-PERS-* */
async function repairLegacyAdminPersonas() {
  await pool.query(
    `UPDATE personas p
     INNER JOIN incidentes i ON i.ID_incidente = p.ID_incidente
     SET p.ID_incidente = NULL
     WHERE i.ID_visible LIKE 'CAT-PERS-%'`,
  );
}

/** Personas del módulo Admin: ID_incidente NULL (no ligadas a ningún incidente). */
async function ensureAdminPersonasCatalog() {
  if (adminCatalogReady) return;
  const [cols] = await pool.query("SHOW COLUMNS FROM personas LIKE 'ID_incidente'");
  const col = cols[0];
  if (col && String(col.Null).toUpperCase() === 'NO') {
    await pool.query('ALTER TABLE personas MODIFY COLUMN ID_incidente int NULL');
  }
  await repairLegacyAdminPersonas();
  await pool.query(
    `UPDATE personas SET
      Primer_Nombre = CONCAT(UPPER(LEFT(Primer_Nombre, 1)), LOWER(SUBSTRING(Primer_Nombre, 2))),
      Primer_Apellido = CONCAT(UPPER(LEFT(Primer_Apellido, 1)), LOWER(SUBSTRING(Primer_Apellido, 2)))
     WHERE ID_incidente IS NULL
       AND (Primer_Nombre = LOWER(Primer_Nombre) OR Primer_Apellido = LOWER(Primer_Apellido))`,
  );
  adminCatalogReady = true;
}

function parsePersonId(id) {
  const raw = String(id || '').trim();
  const m = raw.match(/^PER-(\d+)$/i);
  if (m) return Number(m[1]);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatPersonId(internalId) {
  return `PER-${internalId}`;
}

function buildDisplayName(row) {
  return [row.primer_nombre, row.segundo_nombre, row.primer_apellido, row.segundo_apellido]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(' ');
}

const PERSON_SELECT = `
  p.ID_persona AS internal_id,
  p.Primer_Nombre AS primer_nombre,
  p.Segundo_Nombre AS segundo_nombre,
  p.Primer_Apellido AS primer_apellido,
  p.Segundo_Apellido AS segundo_apellido,
  p.ID_RolP AS id_rol_p,
  p.Contacto AS contacto,
  p.Tipo_documento AS tipo_documento,
  p.Numero_documento AS numero_documento,
  COALESCE(
    (SELECT cp.Comentarios FROM comentariospersonas cp
     WHERE cp.ID_persona = p.ID_persona
     ORDER BY cp.FechaHora DESC LIMIT 1),
    p.Comentarios
  ) AS comentarios,
  p.ID_genero AS id_genero,
  p.ID_Agencia AS id_agencia,
  p.ID_incidente AS id_incidente,
  p.ID_Usuario AS id_usuario,
  p.FechaRegistro AS created_at,
  rp.Nombre AS role_name,
  g.Descripcion_genero AS gender_name,
  td.Descripcion AS document_type_name
FROM ${TABLE} p
LEFT JOIN rolpersonas rp ON rp.ID_RolP = p.ID_RolP
LEFT JOIN genero g ON g.ID_genero = p.ID_genero
LEFT JOIN tipodocumentos td ON td.Tipo_documento = p.Tipo_documento`;

function adminCatalogWhere(alias = 'p') {
  return `${alias}.ID_incidente IS NULL`;
}

async function listPeople(agencyCode = null) {
  await ensureAdminPersonasCatalog();
  const params = [];
  let where = `WHERE ${adminCatalogWhere('p')}`;
  if (agencyCode) {
    where += ' AND UPPER(p.ID_Agencia) IN (UPPER(?), LOWER(?))';
    params.push(agencyCode, agencyCode);
  }
  const [rows] = await pool.query(
    `SELECT ${PERSON_SELECT} ${where} ORDER BY p.FechaRegistro DESC`,
    params,
  );
  return rows;
}

async function getPersonByInternalId(internalId, adminOnly = false) {
  const params = [internalId];
  let where = 'WHERE p.ID_persona = ?';
  if (adminOnly) {
    where += ` AND ${adminCatalogWhere('p')}`;
  }
  const [rows] = await pool.query(`SELECT ${PERSON_SELECT} ${where} LIMIT 1`, params);
  return rows[0] || null;
}

async function getPerson(id) {
  const internalId = parsePersonId(id);
  if (!internalId) return null;
  return getPersonByInternalId(internalId, true);
}

async function resolvePersonRoleId(roleId, roleName, agencyCode) {
  if (roleId) {
    const [rows] = await pool.query(
      `SELECT ID_RolP FROM rolpersonas
       WHERE ID_RolP = ? AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
       LIMIT 1`,
      [roleId, agencyCode, agencyCode],
    );
    if (rows[0]?.ID_RolP) return rows[0].ID_RolP;
  }
  if (roleName) {
    const [rows] = await pool.query(
      `SELECT ID_RolP FROM rolpersonas
       WHERE Nombre = ? AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
       LIMIT 1`,
      [roleName, agencyCode, agencyCode],
    );
    if (rows[0]?.ID_RolP) return rows[0].ID_RolP;
  }
  return null;
}

function normalizeOptional(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

function normalizeRequired(value, label) {
  const formatted = formatNamePart(value);
  if (!formatted) throw new HttpError(400, `${label} es requerido`);
  return formatted;
}

function normalizeRequiredText(value, label) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) throw new HttpError(400, `${label} es requerido`);
  return trimmed;
}

async function insertPersonComment(executor, personId, text, userId, agencyCode) {
  const commentText = String(text || '').trim();
  if (!commentText || !userId) return;
  await executor.query(
    `INSERT INTO comentariospersonas (ID_persona, ID_Usuario, ID_Agencia, Comentarios)
     VALUES (?,?,?,?)`,
    [personId, userId, normalizeAgencyCode(agencyCode), commentText.substring(0, 200)],
  );
}

async function deletePersonComments(executor, personId) {
  await executor.query(`DELETE FROM comentariospersonas WHERE ID_persona = ?`, [personId]);
}

async function createPerson(data) {
  await ensureAdminPersonasCatalog();
  const agencyCode = normalizeAgencyCode(data.agencyCode);
  const roleId = await resolvePersonRoleId(data.roleId, data.roleName, agencyCode);
  if (!roleId) {
    throw new HttpError(400, 'Rol de persona no válido para la agencia');
  }

  const primerNombre = normalizeRequired(data.primerNombre, 'Primer nombre');
  const primerApellido = normalizeRequired(data.primerApellido, 'Primer apellido');
  const tipoDocumento = await resolveDocumentTypeCode(
    normalizeRequiredText(data.tipoDocumento, 'Tipo de documento'),
  );
  const numeroDocumento = normalizeRequiredText(data.numeroDocumento, 'Número de documento');
  const contacto = normalizeOptional(data.contacto ?? data.phone);
  const commentText = normalizeOptional(data.comentarios ?? data.notes);

  const [result] = await pool.query(
    `INSERT INTO ${TABLE}
      (Primer_Nombre, Segundo_Nombre, Primer_Apellido, Segundo_Apellido, ID_RolP,
       Contacto, Tipo_documento, Numero_documento, Comentarios, ID_incidente,
       ID_Agencia, ID_Usuario, ID_genero)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      primerNombre,
      formatNamePart(data.segundoNombre),
      primerApellido,
      formatNamePart(data.segundoApellido),
      roleId,
      contacto,
      tipoDocumento,
      numeroDocumento,
      null,
      null,
      agencyCode,
      data.userId ?? null,
      normalizeGenderId(data.genderId),
    ],
  );

  if (commentText && data.userId) {
    await insertPersonComment(pool, result.insertId, commentText, data.userId, agencyCode);
  }

  return getPersonByInternalId(result.insertId);
}

async function updatePerson(id, data) {
  await ensureAdminPersonasCatalog();
  const internalId = parsePersonId(id);
  if (!internalId) return null;
  const existing = await getPersonByInternalId(internalId, true);
  if (!existing) return null;

  const agencyCode = normalizeAgencyCode(data.agencyCode || existing.id_agencia);
  let roleId = existing.id_rol_p;
  if (data.roleId != null || data.roleName) {
    roleId = await resolvePersonRoleId(data.roleId, data.roleName, agencyCode);
    if (!roleId) throw new HttpError(400, 'Rol de persona no válido para la agencia');
  }

  const primerNombre = normalizeRequired(
    data.primerNombre ?? existing.primer_nombre,
    'Primer nombre',
  );
  const primerApellido = normalizeRequired(
    data.primerApellido ?? existing.primer_apellido,
    'Primer apellido',
  );
  const tipoDocumento = await resolveDocumentTypeCode(
    normalizeRequiredText(data.tipoDocumento ?? existing.tipo_documento, 'Tipo de documento'),
  );
  const numeroDocumento = normalizeRequiredText(
    data.numeroDocumento ?? existing.numero_documento,
    'Número de documento',
  );
  const contacto = normalizeOptional(data.contacto ?? data.phone ?? existing.contacto);
  const newComment = normalizeOptional(data.comentarios ?? data.notes);
  const previousComment = normalizeOptional(existing.comentarios);

  await pool.query(
    `UPDATE ${TABLE} SET
      Primer_Nombre = ?,
      Segundo_Nombre = ?,
      Primer_Apellido = ?,
      Segundo_Apellido = ?,
      ID_RolP = ?,
      Contacto = ?,
      Tipo_documento = ?,
      Numero_documento = ?,
      Comentarios = NULL,
      ID_genero = ?,
      ID_Agencia = ?,
      ID_Usuario = COALESCE(?, ID_Usuario),
      ID_incidente = NULL
     WHERE ID_persona = ?`,
    [
      primerNombre,
      formatNamePart(data.segundoNombre ?? existing.segundo_nombre),
      primerApellido,
      formatNamePart(data.segundoApellido ?? existing.segundo_apellido),
      roleId,
      contacto,
      tipoDocumento,
      numeroDocumento,
      normalizeGenderId(data.genderId ?? existing.id_genero),
      agencyCode,
      data.userId ?? null,
      internalId,
    ],
  );

  const userId = data.userId ?? existing.id_usuario;
  if (newComment && newComment !== previousComment && userId) {
    await insertPersonComment(pool, internalId, newComment, userId, agencyCode);
  }

  return getPersonByInternalId(internalId);
}

async function deletePerson(id) {
  await ensureAdminPersonasCatalog();
  const internalId = parsePersonId(id);
  if (!internalId) return 0;
  await deletePersonComments(pool, internalId);
  const [r] = await pool.query(
    `DELETE FROM ${TABLE} WHERE ID_persona = ? AND ID_incidente IS NULL`,
    [internalId],
  );
  return r.affectedRows;
}

async function lookupByPhone(candidates) {
  await ensureAdminPersonasCatalog();
  const ph = candidates.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT ${PERSON_SELECT}
     WHERE ${adminCatalogWhere('p')} AND p.Contacto IN (${ph})
     ORDER BY p.FechaRegistro DESC
     LIMIT 1`,
    candidates,
  );
  if (!rows.length) return null;
  return { person: rows[0], documentType: rows[0].tipo_documento };
}

async function listPersonRoles(agencyCode) {
  const code = normalizeAgencyCode(agencyCode);
  const [rows] = await pool.query(
    `SELECT ID_RolP AS id, Nombre AS name
     FROM rolpersonas
     WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     ORDER BY Nombre`,
    [code, code],
  );
  return rows;
}

async function listGenders(agencyCode) {
  const code = normalizeAgencyCode(agencyCode);
  const [rows] = await pool.query(
    `SELECT ID_genero AS id, Descripcion_genero AS name
     FROM genero
     WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     ORDER BY Descripcion_genero`,
    [code, code],
  );
  return rows;
}

async function listDocumentTypes() {
  const [rows] = await pool.query(
    `SELECT Tipo_documento AS code, Descripcion AS name
     FROM tipodocumentos
     ORDER BY Descripcion`,
  );
  return rows;
}

module.exports = {
  formatPersonId,
  buildDisplayName,
  listPeople,
  getPerson,
  createPerson,
  updatePerson,
  deletePerson,
  lookupByPhone,
  listPersonRoles,
  listGenders,
  listDocumentTypes,
  insertPersonComment,
  deletePersonComments,
};
