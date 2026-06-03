/**
 * Autenticación híbrida: directorio LDAP primero, MySQL local como respaldo.
 *
 * - Usuario solo en LDAP → entra sin fila en `users` (rol/agencia por .env).
 * - Usuario en LDAP + MySQL → rol/agencia desde MySQL.
 * - Usuario solo en MySQL (local) → bcrypt (creado en Administración).
 *
 * @module services/auth.service
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const HttpError = require("../utils/HttpError");
const ldapConfig = require("../config/ldap");
const ldapService = require("./ldap.service");
const {
  isDirectorySessionId,
  DIRECTORY_USER_PREFIX,
} = require("../utils/jwtUser");

const INVALID_MSG = "Credenciales incorrectas. Por favor, intente de nuevo.";

function isDirectoryOnlyId(id) {
  return isDirectorySessionId(id);
}

function normalizeAuthSource(value) {
  return String(value || "local").toLowerCase();
}

async function findDbUser(username, agencyCode) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.name, u.email, u.password_hash, u.status,
            u.auth_source, u.must_change_password,
            u.role_id, r.name AS role_name,
            a.id AS agency_id, a.code AS agency_code, a.name AS agency_name
       FROM users u
       JOIN roles r    ON r.id = u.role_id
       JOIN agencies a ON a.id = u.agency_id
      WHERE u.username = ? AND a.code = ?`,
    [username, agencyCode],
  );
  return rows[0] || null;
}

async function buildDirectorySession(username, agencyCode, ldapProfile) {
  const [agencyRows] = await pool.query(
    `SELECT id, code, name FROM agencies WHERE code = ? LIMIT 1`,
    [agencyCode],
  );
  if (!agencyRows.length) {
    throw new HttpError(401, INVALID_MSG);
  }

  const roleId = ldapConfig.defaultRoleId;
  const [roleRows] = await pool.query(
    `SELECT name FROM roles WHERE id = ? LIMIT 1`,
    [roleId],
  );

  return {
    id: `${DIRECTORY_USER_PREFIX}${username}`, // sub JWT; no es FK a users
    username,
    name: ldapProfile.displayName || ldapProfile.cn || username,
    email: ldapProfile.mail || `${username}@ims.local`,
    auth_source: "ldap",
    must_change_password: 0,
    role_id: roleId,
    role_name: roleRows[0]?.name || "Operador / Despachador",
    agency_id: agencyRows[0].id,
    agency_code: agencyRows[0].code,
    agency_name: agencyRows[0].name,
  };
}

function assertActive(user) {
  if (user.status !== "Activo") {
    throw new HttpError(403, "Usuario inactivo. Contacte al administrador.");
  }
}

function buildTokenResponse(user) {
  const authSource = normalizeAuthSource(user.auth_source);
  const mustChangePassword =
    authSource === "ldap" ? false : !!user.must_change_password;

  if (!isDirectoryOnlyId(user.id)) {
    pool
      .query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id])
      .catch(() => {});
  }

  const payload = {
    sub: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    role_name: user.role_name,
    agency_id: user.agency_id,
    agency_code: user.agency_code,
    auth_source: authSource,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  return {
    token,
    mustChangePassword,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      role_id: user.role_id,
      agency: user.agency_code,
      authSource,
    },
  };
}

async function verifyLocalPassword(user, password) {
  if (!user.password_hash) {
    throw new HttpError(401, INVALID_MSG);
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw new HttpError(401, INVALID_MSG);
  }
}

/**
 * @param {{ agencia: string, usuario: string, password: string }} credentials
 */
async function login(credentials) {
  const { agencia, usuario, password } = credentials;
  if (!usuario || !password || !agencia) {
    throw new HttpError(400, "agencia, usuario y password son requeridos");
  }

  const dbUser = await findDbUser(usuario, agencia);
  const directoryResult = await ldapService.tryAuthenticate(usuario, password);

  if (directoryResult.ok) {
    if (dbUser) {
      assertActive(dbUser);
      return buildTokenResponse({ ...dbUser, auth_source: "ldap" });
    }
    const session = await buildDirectorySession(
      usuario,
      agencia,
      directoryResult.profile,
    );
    return buildTokenResponse(session);
  }

  if (directoryResult.error) {
    throw new HttpError(503, directoryResult.error);
  }

  if (!dbUser) {
    throw new HttpError(401, INVALID_MSG);
  }

  assertActive(dbUser);

  if (normalizeAuthSource(dbUser.auth_source) === "ldap") {
    throw new HttpError(401, INVALID_MSG);
  }

  await verifyLocalPassword(dbUser, password);
  return buildTokenResponse(dbUser);
}

async function getProfile(jwtUser) {
  if (isDirectoryOnlyId(jwtUser.sub)) {
    return {
      id: jwtUser.sub,
      name: jwtUser.name,
      email: jwtUser.email,
      role: jwtUser.role_name,
      role_id: jwtUser.role_id,
      agency: jwtUser.agency_code,
      authSource: normalizeAuthSource(jwtUser.auth_source || "ldap"),
    };
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.auth_source, u.role_id, r.name AS role_name, a.code AS agency
       FROM users u
       JOIN roles r    ON r.id = u.role_id
       JOIN agencies a ON a.id = u.agency_id
      WHERE u.id = ?`,
    [jwtUser.sub],
  );
  if (!rows.length) {
    throw new HttpError(404, "Usuario no encontrado");
  }
  const u = rows[0];
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role_name,
    role_id: u.role_id,
    agency: u.agency,
    authSource: normalizeAuthSource(
      u.auth_source || jwtUser.auth_source || "local",
    ),
  };
}

async function changePassword(jwtUser, currentPassword, newPassword) {
  if (isDirectoryOnlyId(jwtUser.sub)) {
    throw new HttpError(
      400,
      "Los usuarios del directorio corporativo gestionan su contraseña fuera de esta aplicación.",
    );
  }

  if (!currentPassword || !newPassword) {
    throw new HttpError(400, "Contraseña actual y nueva son requeridas");
  }

  const [rows] = await pool.query(
    `SELECT password_hash, auth_source FROM users WHERE id = ?`,
    [jwtUser.sub],
  );
  if (!rows.length) {
    throw new HttpError(404, "Usuario no encontrado");
  }

  const user = rows[0];
  if (normalizeAuthSource(user.auth_source) === "ldap") {
    throw new HttpError(
      400,
      "Los usuarios del directorio corporativo gestionan su contraseña fuera de esta aplicación.",
    );
  }

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) {
    throw new HttpError(401, "La contraseña actual es incorrecta");
  }

  const { validatePassword } = require("../utils/passwordPolicy");
  const check = validatePassword(newPassword);
  if (!check.ok) {
    throw new HttpError(400, check.errors.join(" "));
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    `UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`,
    [newHash, jwtUser.sub],
  );

  return { message: "Contraseña actualizada correctamente" };
}

module.exports = {
  login,
  getProfile,
  changePassword,
};
