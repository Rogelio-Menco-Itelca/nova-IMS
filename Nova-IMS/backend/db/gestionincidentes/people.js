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

async function repairLegacyAdminPersonas() {
  await pool.query(
    `UPDATE personas p
     INNER JOIN incidentes i ON i.ID_incidente = p.ID_incidente
     SET p.ID_incidente = NULL
     WHERE i.ID_visible LIKE 'CAT-PERS-%'`,
  );
}

async function ensurePersonStatusColumn() {
  const [cols] = await pool.query("SHOW COLUMNS FROM personas LIKE 'estado'");
  if (!cols.length) {
    await pool.query(
      `ALTER TABLE personas ADD COLUMN estado varchar(20) NOT NULL DEFAULT 'Activo'`,
    );
  }
  await pool.query(`UPDATE personas SET estado = 'Activo' WHERE estado IS NULL OR estado = ''`);
}

let personSharePointReady = false;

async function ensurePersonSharePointStorage() {
  if (personSharePointReady) return;
  const [cols] = await pool.query("SHOW COLUMNS FROM personas LIKE 'Comentarios'");
  const col = cols[0];
  const match = col && /varchar\((\d+)\)/i.exec(String(col.Type || ''));
  const len = match ? Number(match[1]) : 0;
  if (len > 0 && len < 500) {
    await pool.query('ALTER TABLE personas MODIFY COLUMN Comentarios varchar(500) NULL');
  }
  personSharePointReady = true;
}

async function ensureAdminPersonasCatalog() {
  if (adminCatalogReady) return;
  const [cols] = await pool.query("SHOW COLUMNS FROM personas LIKE 'ID_incidente'");
  const col = cols[0];
  if (col && String(col.Null).toUpperCase() === 'NO') {
    await pool.query('ALTER TABLE personas MODIFY COLUMN ID_incidente int NULL');
  }
  await ensurePersonStatusColumn();
  await ensurePersonSharePointStorage();
  await repairLegacyAdminPersonas();
  await backfillCatalogFromIncidentPeople();
  await pool.query(
    `UPDATE personas SET
      Primer_Nombre = CONCAT(UPPER(LEFT(Primer_Nombre, 1)), LOWER(SUBSTRING(Primer_Nombre, 2))),
      Primer_Apellido = CONCAT(UPPER(LEFT(Primer_Apellido, 1)), LOWER(SUBSTRING(Primer_Apellido, 2)))
     WHERE ID_incidente IS NULL
       AND (Primer_Nombre = LOWER(Primer_Nombre) OR Primer_Apellido = LOWER(Primer_Apellido))`,
  );
  adminCatalogReady = true;
}

const PER_ID_RE = /^PER-(\d+)$/i;

function parsePersonId(id) {
  const raw = String(id || '').trim();
  const m = PER_ID_RE.exec(raw);
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

let personCommentColumnPromise = null;

async function resolvePersonCommentColumn() {
  if (!personCommentColumnPromise) {
    personCommentColumnPromise = pool
      .query('SHOW COLUMNS FROM comentariospersonas')
      .then(([cols]) => {
        const names = new Set((cols || []).map((c) => c.Field));
        if (names.has('Comentarios')) return 'Comentarios';
        if (names.has('RutaDeSharePoint')) return 'RutaDeSharePoint';
        return null;
      });
  }
  return personCommentColumnPromise;
}

async function personCommentHistoryExpr(alias = 'comentarios') {
  const col = await resolvePersonCommentColumn();
  if (!col) return `p.Comentarios AS ${alias}`;
  return `COALESCE(
    NULLIF(TRIM((SELECT cp.\`${col}\` FROM comentariospersonas cp
     WHERE cp.ID_persona = p.ID_persona
     ORDER BY cp.FechaHora DESC, cp.ID_transaccion_persona DESC LIMIT 1)), ''),
    NULLIF(TRIM(p.Comentarios), '')
  ) AS ${alias}`;
}

const PERSON_IDENTITY_FROM = `
FROM ${TABLE} p
LEFT JOIN rolpersonas rp ON rp.ID_RolP = p.ID_RolP
LEFT JOIN cargos_juez cj ON cj.ID_Cargo = p.ID_Cargo
LEFT JOIN genero g ON g.ID_genero = p.ID_genero
LEFT JOIN tipodocumentos td ON td.Tipo_documento = p.Tipo_documento`;

const PERSON_IDENTITY_COLUMNS = `
  p.ID_persona AS internal_id,
  p.Primer_Nombre AS primer_nombre,
  p.Segundo_Nombre AS segundo_nombre,
  p.Primer_Apellido AS primer_apellido,
  p.Segundo_Apellido AS segundo_apellido,
  p.ID_RolP AS id_rol_p,
  p.ID_Cargo AS id_cargo,
  cj.Cargo AS cargo_name,
  p.Contacto AS contacto,
  p.Tipo_documento AS tipo_documento,
  p.Numero_documento AS numero_documento,
  p.ID_genero AS id_genero,
  p.ID_Agencia AS id_agencia,
  p.ID_incidente AS id_incidente,
  p.ID_Usuario AS id_usuario,
  p.FechaRegistro AS created_at,
  COALESCE(NULLIF(p.estado, ''), 'Activo') AS estado,
  rp.Nombre AS role_name,
  g.Descripcion_genero AS gender_name,
  td.Descripcion AS document_type_name`;

const PERSON_LOOKUP_SELECT = `
  ${PERSON_IDENTITY_COLUMNS},
  NULL AS comentarios
${PERSON_IDENTITY_FROM}`;

async function getPersonSelect() {
  const comments = await personCommentHistoryExpr('comentarios');
  return `
  ${PERSON_IDENTITY_COLUMNS},
  ${comments}
${PERSON_IDENTITY_FROM}`;
}

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
    `SELECT ${await getPersonSelect()} ${where} ORDER BY p.FechaRegistro DESC`,
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
  const [rows] = await pool.query(
    `SELECT ${await getPersonSelect()} ${where} LIMIT 1`,
    params,
  );
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

function normalizePersonStatus(value) {
  return String(value || 'Activo').trim() === 'Inactivo' ? 'Inactivo' : 'Activo';
}

async function insertPersonComment(executor, personId, text, userId, agencyCode) {
  const commentText = String(text || '').trim();
  if (!commentText || !userId || !personId) return;
  await ensurePersonSharePointStorage();
  const col = (await resolvePersonCommentColumn()) || 'Comentarios';
  const maxLen = col === 'RutaDeSharePoint' ? 500 : 200;
  await executor.query(
    `INSERT INTO comentariospersonas (ID_persona, ID_Usuario, ID_Agencia, \`${col}\`)
     VALUES (?,?,?,?)`,
    [personId, userId, normalizeAgencyCode(agencyCode), commentText.substring(0, maxLen)],
  );
}

async function deletePersonComments(executor, personId) {
  await executor.query(`DELETE FROM comentariospersonas WHERE ID_persona = ?`, [personId]);
}

async function resolveJudgeCargoId(roleId, cargoId, agencyCode) {
  if (cargoId == null || cargoId === '') return null;
  const n = Number(cargoId);
  if (!Number.isFinite(n) || n <= 0) return null;
  const [rows] = await pool.query(
    `SELECT ID_Cargo FROM cargos_juez
     WHERE ID_Cargo = ?
       AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
       AND (ID_RolP IS NULL OR ID_RolP = ?)
     LIMIT 1`,
    [n, agencyCode, agencyCode, roleId],
  );
  return rows[0]?.ID_Cargo ?? null;
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
  if (!/^\d+$/.test(numeroDocumento)) {
    throw new HttpError(400, 'Número de documento solo debe contener números');
  }
  const contacto = normalizeOptional(data.contacto ?? data.phone);
  if (contacto && !/^\d+$/.test(contacto)) {
    throw new HttpError(400, 'Contacto / teléfono solo debe contener números');
  }
  const commentTextRaw = normalizeOptional(data.comentarios ?? data.notes);
  const commentText = commentTextRaw ? commentTextRaw.substring(0, 200) : null;
  const cargoId = await resolveJudgeCargoId(roleId, data.cargoId, agencyCode);

  const [result] = await pool.query(
    `INSERT INTO ${TABLE}
      (Primer_Nombre, Segundo_Nombre, Primer_Apellido, Segundo_Apellido, ID_RolP, ID_Cargo,
       Contacto, Tipo_documento, Numero_documento, Comentarios, ID_incidente,
       ID_Agencia, ID_Usuario, ID_genero, estado)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      primerNombre,
      formatNamePart(data.segundoNombre),
      primerApellido,
      formatNamePart(data.segundoApellido),
      roleId,
      cargoId,
      contacto,
      tipoDocumento,
      numeroDocumento,
      commentText,
      null,
      agencyCode,
      data.userId ?? null,
      normalizeGenderId(data.genderId),
      normalizePersonStatus(data.status),
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
  if (data.roleId ?? data.roleName) {
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
  if (!/^\d+$/.test(numeroDocumento)) {
    throw new HttpError(400, 'Número de documento solo debe contener números');
  }
  const contacto = normalizeOptional(data.contacto ?? data.phone ?? existing.contacto);
  if (contacto && !/^\d+$/.test(contacto)) {
    throw new HttpError(400, 'Contacto / teléfono solo debe contener números');
  }
  const newCommentRaw = normalizeOptional(data.comentarios ?? data.notes);
  const newComment = newCommentRaw ? newCommentRaw.substring(0, 200) : null;
  const previousComment = normalizeOptional(existing.comentarios);
  const estado = normalizePersonStatus(data.status ?? existing.estado);
  const cargoId =
    data.cargoId !== undefined
      ? await resolveJudgeCargoId(roleId, data.cargoId, agencyCode)
      : (existing.id_cargo ?? null);

  await pool.query(
    `UPDATE ${TABLE} SET
      Primer_Nombre = ?,
      Segundo_Nombre = ?,
      Primer_Apellido = ?,
      Segundo_Apellido = ?,
      ID_RolP = ?,
      ID_Cargo = ?,
      Contacto = ?,
      Tipo_documento = ?,
      Numero_documento = ?,
      Comentarios = ?,
      ID_genero = ?,
      ID_Agencia = ?,
      ID_Usuario = COALESCE(?, ID_Usuario),
      ID_incidente = NULL,
      estado = ?
     WHERE ID_persona = ?`,
    [
      primerNombre,
      formatNamePart(data.segundoNombre ?? existing.segundo_nombre),
      primerApellido,
      formatNamePart(data.segundoApellido ?? existing.segundo_apellido),
      roleId,
      cargoId,
      contacto,
      tipoDocumento,
      numeroDocumento,
      newComment,
      normalizeGenderId(data.genderId ?? existing.id_genero),
      agencyCode,
      data.userId ?? null,
      estado,
      internalId,
    ],
  );

  const userId = data.userId ?? existing.id_usuario;
  if (newComment && newComment !== previousComment && userId) {
    await insertPersonComment(pool, internalId, newComment, userId, agencyCode);
  }

  return getPersonByInternalId(internalId);
}

async function setPersonStatus(id, status) {
  await ensureAdminPersonasCatalog();
  const internalId = parsePersonId(id);
  if (!internalId) return null;
  const existing = await getPersonByInternalId(internalId, true);
  if (!existing) return null;

  const estado = normalizePersonStatus(status);
  await pool.query(
    `UPDATE ${TABLE} SET estado = ? WHERE ID_persona = ? AND ID_incidente IS NULL`,
    [estado, internalId],
  );
  return getPersonByInternalId(internalId);
}

async function ensureCatalogPerson(executor, data, agencyCode) {
  const primerNombre = formatNamePart(data.primerNombre);
  const primerApellido = formatNamePart(data.primerApellido);
  if (!primerNombre || !primerApellido) return null;

  const numeroDocumento = String(data.numeroDocumento || '').replace(/\D/g, '') || null;
  const contacto = String(data.contacto || '').replace(/\D/g, '') || null;
  if ((!numeroDocumento || numeroDocumento.length < 5) && (!contacto || contacto.length < 7)) {
    return null;
  }

  const code = normalizeAgencyCode(agencyCode || data.agencyCode);
  const params = [code, code];
  let where = `WHERE ${adminCatalogWhere('p')} AND UPPER(p.ID_Agencia) IN (UPPER(?), LOWER(?))`;

  if (numeroDocumento && numeroDocumento.length >= 5) {
    where += ` AND REPLACE(REPLACE(REPLACE(IFNULL(p.Numero_documento, ''), '.', ''), '-', ''), ' ', '') = ?`;
    params.push(numeroDocumento);
  } else {
    where += ` AND REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(p.Contacto, ''), '+', ''), '-', ''), ' ', ''), '.', '') IN (?, ?)`;
    params.push(contacto);
    params.push(contacto.length === 10 ? `57${contacto}` : String(contacto).replace(/^57/, ''));
  }

  const [rows] = await executor.query(
    `SELECT p.ID_persona FROM ${TABLE} p ${where} LIMIT 1`,
    params,
  );
  if (rows[0]?.ID_persona) return rows[0].ID_persona;

  const [result] = await executor.query(
    `INSERT INTO ${TABLE}
      (Primer_Nombre, Segundo_Nombre, Primer_Apellido, Segundo_Apellido, ID_RolP, ID_Cargo,
       Contacto, Tipo_documento, Numero_documento, Comentarios, ID_incidente,
       ID_Agencia, ID_Usuario, ID_genero, estado)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      primerNombre,
      formatNamePart(data.segundoNombre),
      primerApellido,
      formatNamePart(data.segundoApellido),
      data.roleId || 1,
      data.cargoId ?? null,
      contacto,
      data.tipoDocumento || null,
      numeroDocumento,
      null,
      null,
      code,
      data.userId ?? null,
      normalizeGenderId(data.genderId),
      'Activo',
    ],
  );
  return result.insertId || null;
}

async function backfillCatalogFromIncidentPeople() {
  const [rows] = await pool.query(
    `SELECT p.Primer_Nombre AS primerNombre,
            p.Segundo_Nombre AS segundoNombre,
            p.Primer_Apellido AS primerApellido,
            p.Segundo_Apellido AS segundoApellido,
            p.ID_RolP AS roleId,
            p.ID_Cargo AS cargoId,
            p.Contacto AS contacto,
            p.Tipo_documento AS tipoDocumento,
            p.Numero_documento AS numeroDocumento,
            p.ID_Agencia AS agencyCode,
            p.ID_Usuario AS userId,
            p.ID_genero AS genderId
     FROM personas p
     INNER JOIN (
       SELECT MAX(ID_persona) AS id
       FROM personas
       WHERE ID_incidente IS NOT NULL
       GROUP BY ID_Agencia,
                COALESCE(
                  NULLIF(REPLACE(REPLACE(REPLACE(IFNULL(Numero_documento, ''), '.', ''), '-', ''), ' ', ''), ''),
                  CONCAT('TEL:', REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(Contacto, ''), '+', ''), '-', ''), ' ', ''), '.', ''))
                )
     ) latest ON latest.id = p.ID_persona`,
  );
  for (const row of rows) {
    await ensureCatalogPerson(pool, row, row.agencyCode);
  }
}

async function lookupByDocument(documentId, agencyCode = null) {
  await ensureAdminPersonasCatalog();
  const digits = String(documentId || '').replace(/\D/g, '');
  if (!digits || digits.length < 5) return null;

  const params = [digits, digits];
  let agencyClause = '';
  if (agencyCode) {
    agencyClause = ' AND UPPER(p.ID_Agencia) IN (UPPER(?), LOWER(?))';
    params.push(agencyCode, agencyCode);
  }

  const [rows] = await pool.query(
    `SELECT ${PERSON_LOOKUP_SELECT}
     WHERE ${adminCatalogWhere('p')}
       AND COALESCE(NULLIF(p.estado, ''), 'Activo') = 'Activo'
       AND (
         p.Numero_documento = ?
         OR REPLACE(REPLACE(REPLACE(IFNULL(p.Numero_documento, ''), '.', ''), '-', ''), ' ', '') = ?
       )
       ${agencyClause}
     ORDER BY p.FechaRegistro DESC
     LIMIT 1`,
    params,
  );
  return rows[0] || null;
}

async function lookupByPhone(candidates, agencyCode = null) {
  await ensureAdminPersonasCatalog();
  const list = [...new Set((candidates || []).map((v) => String(v || '').trim()).filter(Boolean))];
  if (!list.length) return null;
  const ph = list.map(() => '?').join(',');
  const params = [...list, ...list];
  let agencyClause = '';
  if (agencyCode) {
    agencyClause = ' AND UPPER(p.ID_Agencia) IN (UPPER(?), LOWER(?))';
    params.push(agencyCode, agencyCode);
  }
  const [rows] = await pool.query(
    `SELECT ${PERSON_LOOKUP_SELECT}
     WHERE ${adminCatalogWhere('p')}
       AND COALESCE(NULLIF(p.estado, ''), 'Activo') = 'Activo'
       AND (
         p.Contacto IN (${ph})
         OR REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(p.Contacto, ''), '+', ''), '-', ''), ' ', ''), '.', '') IN (${ph})
       )
       ${agencyClause}
     ORDER BY p.FechaRegistro DESC
     LIMIT 1`,
    params,
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

async function listJudgeCargos(agencyCode, roleId = null) {
  const code = normalizeAgencyCode(agencyCode);
  const params = [code, code];
  let roleFilter = '';
  if (roleId != null && roleId !== '') {
    const n = Number(roleId);
    if (Number.isFinite(n) && n > 0) {
      roleFilter = ' AND ID_RolP = ?';
      params.push(n);
    }
  }
  const [rows] = await pool.query(
    `SELECT ID_Cargo AS id, Cargo AS name, Descripcion AS description, ID_RolP AS roleId
     FROM cargos_juez
     WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))${roleFilter}
     ORDER BY Cargo`,
    params,
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
  setPersonStatus,
  lookupByPhone,
  lookupByDocument,
  listPersonRoles,
  listGenders,
  listDocumentTypes,
  listJudgeCargos,
  insertPersonComment,
  deletePersonComments,
  personCommentHistoryExpr,
  ensureCatalogPerson,
  ensurePersonSharePointStorage,
};
