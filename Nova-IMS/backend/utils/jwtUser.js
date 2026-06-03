/**
 * Utilidades para el usuario de la sesión JWT.
 * Sesiones solo-directorio usan sub "LDAP:uid" (no existe en tabla users).
 */

const { pool } = require("../config/db");

const DIRECTORY_USER_PREFIX = "LDAP:";

function isDirectorySessionId(id) {
  return String(id || "").startsWith(DIRECTORY_USER_PREFIX);
}

/** Id válido para FK a users.id, o null si es sesión LDAP / id desconocido. */
async function resolveDbUserId(jwtUser) {
  const sub = jwtUser?.sub;
  if (!sub || isDirectorySessionId(sub)) {
    return null;
  }
  const [rows] = await pool.query(
    `SELECT id FROM users WHERE id = ? LIMIT 1`,
    [sub],
  );
  return rows.length ? sub : null;
}

/** Id de body/query válido para FK a users.id, o null (p. ej. LDAP:uid). */
async function resolveDbUserIdFromString(id) {
  if (!id || isDirectorySessionId(id)) {
    return null;
  }
  const [rows] = await pool.query(
    `SELECT id FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows.length ? id : null;
}

function sessionDisplayName(jwtUser, fallback = "Sistema") {
  return jwtUser?.name || fallback;
}

module.exports = {
  DIRECTORY_USER_PREFIX,
  isDirectorySessionId,
  resolveDbUserId,
  resolveDbUserIdFromString,
  sessionDisplayName,
};
