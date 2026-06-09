const bcrypt = require('bcryptjs');
const { pool } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { fullUserName, normalizeAgencyCode } = require('./maps');
const { loadAgencyMap, resolveAgency } = require('./agencies');

/** Token_Contraseña: MUST_CHANGE = primer ingreso; cualquier otro valor = ya cambió */
const MUST_CHANGE_PASSWORD_MARKER = 'MUST_CHANGE';
const PASSWORD_CHANGED_MARKER = 'OK';

function resolveLoginUsername(username) {
  return String(username || '').trim();
}

const USER_SELECT = `
  u.ID_Usuario AS id,
  LOWER(u.ID_Usuario) AS username,
  u.Primer_Nombre AS primer_nombre,
  u.Segundo_Nombre AS segundo_nombre,
  u.Primer_Apellido AS primer_apellido,
  u.Segundo_Apellido AS segundo_apellido,
  TRIM(CONCAT(
    u.Primer_Nombre, ' ',
    IFNULL(CONCAT(u.Segundo_Nombre, ' '), ''),
    u.Primer_Apellido, ' ',
    IFNULL(u.Segundo_Apellido, '')
  )) AS name,
  u.Correo AS email,
  u.Telefono AS telefono,
  u.Contraseña AS password_hash,
  u.estado AS status,
  'local' AS auth_source,
  CASE WHEN u.Token_Contraseña = '${MUST_CHANGE_PASSWORD_MARKER}' THEN 1 ELSE 0 END AS must_change_password,
  u.ID_Rol AS role_id,
  r.Rol AS role_name,
  u.ID_Agencia AS agency_code_raw,
  a.Nombre_Agencia AS agency_name
FROM usuarios u
JOIN roles r ON r.ID_Rol = u.ID_Rol
JOIN agencias a ON a.IDAgencias = u.ID_Agencia`;

function attachAgencyId(row, agencyMap) {
  if (!row) return null;
  const code = normalizeAgencyCode(row.agency_code_raw);
  const agency = agencyMap.byCode[code];
  return {
    ...row,
    agency_id: agency?.id || null,
    agency_code: agency?.code || code,
    agency_name: agency?.name || row.agency_name,
  };
}

async function findUserByLogin(username, agencyCode) {
  const agencyMap = await loadAgencyMap();
  const agency = await resolveAgency(agencyCode);
  const login = resolveLoginUsername(username);
  if (!login) return null;

  const baseSql = `SELECT ${USER_SELECT} WHERE (
    LOWER(u.ID_Usuario) = LOWER(?)
    OR LOWER(u.Correo) = LOWER(?)
  )`;

  if (agency) {
    const [rows] = await pool.query(`${baseSql} AND UPPER(u.ID_Agencia) = ? LIMIT 1`, [
      login,
      login,
      agency.code,
    ]);
    return attachAgencyId(rows[0], agencyMap);
  }

  // Sin agencia válida: buscar en cualquier agencia (compatibilidad legacy)
  const [rows] = await pool.query(`${baseSql} ORDER BY u.FechaRegistro DESC LIMIT 1`, [
    login,
    login,
  ]);
  return attachAgencyId(rows[0], agencyMap);
}

async function findUserById(id, agencyCode = null) {
  const agencyMap = await loadAgencyMap();
  const params = [id];
  let agencyFilter = '';
  if (agencyCode) {
    agencyFilter = ' AND UPPER(u.ID_Agencia) = ?';
    params.push(normalizeAgencyCode(agencyCode));
  }
  const [rows] = await pool.query(
    `SELECT ${USER_SELECT}
     WHERE u.ID_Usuario = ?${agencyFilter}
     LIMIT 1`,
    params,
  );
  return attachAgencyId(rows[0], agencyMap);
}

async function userExists(id) {
  const [rows] = await pool.query(`SELECT ID_Usuario FROM usuarios WHERE ID_Usuario = ? LIMIT 1`, [
    id,
  ]);
  return rows.length > 0;
}

async function verifyPassword(stored, plain) {
  if (stored == null || stored === undefined) return false;
  const value = String(stored);
  if (!value && plain === '') return true;
  if (!value) return false;
  if (value.startsWith('$2a$') || value.startsWith('$2b$')) {
    return bcrypt.compare(plain, value);
  }
  return value === plain;
}

async function updateLastLogin() {
  /* gestionincidentes no tiene last_login; no-op */
}

async function updatePasswordHash(userId, agencyCode, hash) {
  await pool.query(
    `UPDATE usuarios SET Contraseña = ?, Token_Contraseña = ? WHERE ID_Usuario = ? AND UPPER(ID_Agencia) = ?`,
    [hash, PASSWORD_CHANGED_MARKER, userId, normalizeAgencyCode(agencyCode)],
  );
}

async function listOperators() {
  const agencyMap = await loadAgencyMap();
  const [rows] = await pool.query(
    `SELECT ${USER_SELECT}
     ORDER BY u.FechaRegistro DESC`,
  );
  return rows.map((r) => attachAgencyId(r, agencyMap));
}

async function findRoleIdByName(name, agencyCode) {
  if (!agencyCode) return null;
  const [rows] = await pool.query(
    `SELECT ID_Rol AS id FROM roles
     WHERE Rol = ? AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     LIMIT 1`,
    [name, agencyCode, agencyCode],
  );
  return rows[0]?.id || null;
}

async function emailExists(email, excludeUserId = null) {
  const params = [email.trim().toLowerCase()];
  let sql = `SELECT ID_Usuario FROM usuarios WHERE LOWER(Correo) = ?`;
  if (excludeUserId) {
    sql += ` AND ID_Usuario <> ?`;
    params.push(excludeUserId);
  }
  sql += ` LIMIT 1`;
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}

async function usernameExists(username, agencyCode = null) {
  const params = [username];
  let sql = `SELECT ID_Usuario FROM usuarios WHERE LOWER(ID_Usuario) = LOWER(?)`;
  if (agencyCode) {
    sql += ` AND UPPER(ID_Agencia) = ?`;
    params.push(normalizeAgencyCode(agencyCode));
  }
  sql += ` LIMIT 1`;
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}

function normalizeOptionalName(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

function normalizeRequiredName(value, fieldLabel) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) throw new HttpError(400, `${fieldLabel} es requerido`);
  return trimmed;
}

function normalizeOptionalPhone(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

async function createOperator({
  id,
  primerNombre,
  segundoNombre,
  primerApellido,
  segundoApellido,
  email,
  telefono,
  passwordHash,
  roleId,
  agencyCode,
  status,
}) {
  await pool.query(
    `INSERT INTO usuarios
      (ID_Usuario, Primer_Nombre, Segundo_Nombre, Primer_Apellido, Segundo_Apellido,
       ID_Rol, ID_Agencia, Correo, Telefono, Contraseña, estado, Token_Contraseña)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      normalizeRequiredName(primerNombre, 'Primer nombre'),
      normalizeOptionalName(segundoNombre),
      normalizeRequiredName(primerApellido, 'Primer apellido'),
      normalizeOptionalName(segundoApellido),
      roleId,
      normalizeAgencyCode(agencyCode),
      email.trim().toLowerCase(),
      normalizeOptionalPhone(telefono),
      passwordHash,
      status || 'Activo',
      MUST_CHANGE_PASSWORD_MARKER,
    ],
  );
}

async function updateOperator(
  id,
  {
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido,
    email,
    telefono,
    roleId,
    status,
    agencyCode,
  },
) {
  const sets = [];
  const params = [];
  if (
    primerNombre != null ||
    segundoNombre != null ||
    primerApellido != null ||
    segundoApellido != null
  ) {
    sets.push(
      'Primer_Nombre = ?',
      'Segundo_Nombre = ?',
      'Primer_Apellido = ?',
      'Segundo_Apellido = ?',
    );
    params.push(
      normalizeRequiredName(primerNombre, 'Primer nombre'),
      normalizeOptionalName(segundoNombre),
      normalizeRequiredName(primerApellido, 'Primer apellido'),
      normalizeOptionalName(segundoApellido),
    );
  }
  if (email != null) {
    sets.push('Correo = ?');
    params.push(email.trim().toLowerCase());
  }
  if (telefono !== undefined) {
    sets.push('Telefono = ?');
    params.push(normalizeOptionalPhone(telefono));
  }
  if (roleId != null) {
    sets.push('ID_Rol = ?');
    params.push(roleId);
  }
  if (status != null) {
    sets.push('estado = ?');
    params.push(status);
  }
  if (!sets.length) return;
  params.push(id);
  let sql = `UPDATE usuarios SET ${sets.join(', ')} WHERE ID_Usuario = ?`;
  if (agencyCode) {
    sql += ` AND UPPER(ID_Agencia) = ?`;
    params.push(normalizeAgencyCode(agencyCode));
  }
  await pool.query(sql, params);
}

async function deleteOperator(id) {
  const [result] = await pool.query(`DELETE FROM usuarios WHERE ID_Usuario = ?`, [id]);
  return result.affectedRows;
}

async function resolveUserContext(userId, agencyCode) {
  if (!userId) return null;
  const user = await findUserById(userId, agencyCode);
  if (!user) return { userId: null, agencyCode: normalizeAgencyCode(agencyCode) };
  return {
    userId: user.id,
    agencyCode: user.agency_code,
  };
}

module.exports = {
  findUserByLogin,
  findUserById,
  userExists,
  verifyPassword,
  updateLastLogin,
  updatePasswordHash,
  listOperators,
  findRoleIdByName,
  emailExists,
  usernameExists,
  createOperator,
  updateOperator,
  deleteOperator,
  resolveUserContext,
  fullUserName,
};
