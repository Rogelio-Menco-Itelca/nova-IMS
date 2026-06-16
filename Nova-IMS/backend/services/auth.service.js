/**
 * Autenticación híbrida: directorio LDAP primero, MySQL local como respaldo.
 *
 * @module services/auth.service
 */

const jwt = require('jsonwebtoken');
const HttpError = require('../utils/HttpError');
const ldapConfig = require('../config/ldap');
const ldapService = require('./ldap.service');
const { isDirectorySessionId, DIRECTORY_USER_PREFIX } = require('../utils/jwtUser');
const giUsers = require('../db/gestionincidentes/users');
const giAgencies = require('../db/gestionincidentes/agencies');
const loginLogs = require('../db/gestionincidentes/loginLogs');

const INVALID_MSG = 'Credenciales incorrectas. Por favor, intente de nuevo.';

function isDirectoryOnlyId(id) {
  return isDirectorySessionId(id);
}

function normalizeAuthSource(value) {
  return String(value || 'local').toLowerCase();
}

async function findDbUser(username, agencyCode) {
  return giUsers.findUserByLogin(username, agencyCode);
}

async function buildDirectorySession(username, agencyCode, ldapProfile) {
  const agency = await giAgencies.resolveAgency(agencyCode);
  if (!agency) {
    throw new HttpError(401, INVALID_MSG);
  }

  const roleId = ldapConfig.defaultRoleId;
  const { pool } = require('../config/db');
  const [roleRows] = await pool.query(`SELECT Rol AS name FROM roles WHERE ID_Rol = ? LIMIT 1`, [
    roleId,
  ]);

  return {
    id: `${DIRECTORY_USER_PREFIX}${username}`,
    username,
    name: ldapProfile.displayName || ldapProfile.cn || username,
    email: ldapProfile.mail || `${username}@ims.local`,
    auth_source: 'ldap',
    must_change_password: 0,
    role_id: roleId,
    role_name: roleRows[0]?.name || 'Operador / Despachador',
    agency_id: agency.id,
    agency_code: agency.code,
    agency_name: agency.name,
  };
}

function assertActive(user) {
  const status = String(user.status || 'Activo');
  if (status.toLowerCase() !== 'activo') {
    throw new HttpError(403, 'Usuario inactivo. Contacte al administrador.');
  }
}

async function recordFailedLogin(user, agencyCode, description, rememberUser = false) {
  if (!user?.id || !user?.role_id) return;
  await loginLogs.safeLog(() =>
    loginLogs.insertLoginRecord({
      action: 'Inicio de sesión',
      description,
      userId: user.id,
      agencyCode: user.agency_code || agencyCode,
      roleId: user.role_id,
      rememberUser,
      status: 'Fallido',
    }),
  );
}

async function recordSuccessfulLogin(user, meta = {}) {
  if (!user?.id || !user?.role_id || isDirectoryOnlyId(user.id)) return;
  await loginLogs.safeLog(() =>
    loginLogs.insertLoginRecord({
      action: 'Inicio de sesión',
      description: meta.description || 'Inicio de sesión exitoso',
      userId: user.id,
      agencyCode: user.agency_code || meta.agencyCode,
      roleId: user.role_id,
      rememberUser: !!meta.rememberUser,
      status: 'Exitoso',
    }),
  );
}

function buildTokenResponse(user) {
  const authSource = normalizeAuthSource(user.auth_source);
  const mustChangePassword = authSource === 'ldap' ? false : !!user.must_change_password;

  if (!isDirectoryOnlyId(user.id)) {
    giUsers.updateLastLogin().catch(() => {});
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
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  return {
    token,
    mustChangePassword,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.telefono || null,
      role: user.role_name,
      role_id: user.role_id,
      agency: user.agency_code,
      agencyName: user.agency_name || null,
      authSource,
    },
  };
}

async function verifyLocalPassword(user, password, agencyCode, rememberUser = false) {
  if (!user.password_hash) {
    await recordFailedLogin(user, agencyCode, 'Usuario sin contraseña local', rememberUser);
    throw new HttpError(401, INVALID_MSG);
  }
  const ok = await giUsers.verifyPassword(user.password_hash, password);
  if (!ok) {
    await recordFailedLogin(user, agencyCode, 'Contraseña incorrecta', rememberUser);
    throw new HttpError(401, INVALID_MSG);
  }
}

async function rethrowInactiveLogin(err, user, agencyCode, rememberUser) {
  if (err instanceof HttpError && err.status === 403) {
    await recordFailedLogin(user, agencyCode, err.message, rememberUser);
  }
  throw err;
}

async function assertActiveUser(user, agencyCode, rememberUser) {
  try {
    assertActive(user);
  } catch (err) {
    await rethrowInactiveLogin(err, user, agencyCode, rememberUser);
  }
}

async function completeDirectoryDbLogin(dbUser, agencia, rememberUser, logSuccess) {
  await assertActiveUser(dbUser, agencia, rememberUser);
  if (logSuccess) {
    await recordSuccessfulLogin(dbUser, {
      agencyCode: agencia,
      rememberUser,
      description: 'Inicio de sesión LDAP exitoso',
    });
  }
  return buildTokenResponse({ ...dbUser, auth_source: 'ldap' });
}

async function completeLocalLogin(dbUser, password, agencia, rememberUser, logSuccess) {
  await assertActiveUser(dbUser, agencia, rememberUser);

  if (normalizeAuthSource(dbUser.auth_source) === 'ldap') {
    await recordFailedLogin(
      dbUser,
      agencia,
      'Usuario LDAP debe autenticarse por directorio',
      rememberUser,
    );
    throw new HttpError(401, INVALID_MSG);
  }

  await verifyLocalPassword(dbUser, password, agencia, rememberUser);
  if (logSuccess) {
    await recordSuccessfulLogin(dbUser, {
      agencyCode: agencia,
      rememberUser,
      description: 'Inicio de sesión exitoso',
    });
  }
  return buildTokenResponse(dbUser);
}

async function login(credentials, options = {}) {
  const { agencia, usuario, password, rememberMe } = credentials;
  const rememberUser = !!rememberMe;
  const logSuccess = options.logSuccess !== false;
  if (!usuario || !password || !agencia) {
    throw new HttpError(400, 'agencia, usuario y password son requeridos');
  }

  const dbUser = await findDbUser(usuario, agencia);
  const directoryResult = await ldapService.tryAuthenticate(usuario, password);

  if (directoryResult.ok) {
    if (dbUser) {
      return completeDirectoryDbLogin(dbUser, agencia, rememberUser, logSuccess);
    }
    const session = await buildDirectorySession(usuario, agencia, directoryResult.profile);
    return buildTokenResponse(session);
  }

  if (directoryResult.error) {
    throw new HttpError(503, directoryResult.error);
  }

  if (!dbUser) {
    throw new HttpError(401, INVALID_MSG);
  }

  return completeLocalLogin(dbUser, password, agencia, rememberUser, logSuccess);
}

async function getProfile(jwtUser) {
  if (isDirectoryOnlyId(jwtUser.sub)) {
    const agency = await giAgencies.resolveAgency(jwtUser.agency_code);
    return {
      id: jwtUser.sub,
      name: jwtUser.name,
      email: jwtUser.email,
      phone: null,
      role: jwtUser.role_name,
      role_id: jwtUser.role_id,
      agency: jwtUser.agency_code,
      agencyName: agency?.name || null,
      authSource: normalizeAuthSource(jwtUser.auth_source || 'ldap'),
    };
  }

  const u = await giUsers.findUserById(jwtUser.sub, jwtUser.agency_code);
  if (!u) {
    throw new HttpError(404, 'Usuario no encontrado');
  }
  const agency = await giAgencies.resolveAgency(u.agency_code);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.telefono || null,
    role: u.role_name,
    role_id: u.role_id,
    agency: u.agency_code,
    agencyName: u.agency_name || agency?.name || null,
    authSource: normalizeAuthSource(u.auth_source || jwtUser.auth_source || 'local'),
  };
}

async function changePassword(jwtUser, currentPassword, newPassword) {
  if (isDirectoryOnlyId(jwtUser.sub)) {
    throw new HttpError(
      400,
      'Los usuarios del directorio corporativo gestionan su contraseña fuera de esta aplicación.',
    );
  }

  if (!currentPassword || !newPassword) {
    throw new HttpError(400, 'Contraseña actual y nueva son requeridas');
  }

  const user = await giUsers.findUserById(jwtUser.sub, jwtUser.agency_code);
  if (!user) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  if (normalizeAuthSource(user.auth_source) === 'ldap') {
    throw new HttpError(
      400,
      'Los usuarios del directorio corporativo gestionan su contraseña fuera de esta aplicación.',
    );
  }

  const ok = await giUsers.verifyPassword(user.password_hash, currentPassword);
  if (!ok) {
    throw new HttpError(401, 'La contraseña actual es incorrecta');
  }

  const { validatePassword } = require('../utils/passwordPolicy');
  const check = validatePassword(newPassword);
  if (!check.ok) {
    throw new HttpError(400, check.errors.join(' '));
  }

  await giUsers.updatePasswordHash(user.id, user.agency_code, newPassword);

  return {
    message: 'Contraseña actualizada correctamente. Inicie sesión con su nueva contraseña.',
  };
}

module.exports = {
  login,
  getProfile,
  changePassword,
  recordFailedLogin,
  recordSuccessfulLogin,
};
