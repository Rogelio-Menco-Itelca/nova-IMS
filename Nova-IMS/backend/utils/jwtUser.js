const giUsers = require('../db/gestionincidentes/users');

const DIRECTORY_USER_PREFIX = 'LDAP:';

function isDirectorySessionId(id) {
  return String(id || '').startsWith(DIRECTORY_USER_PREFIX);
}

async function resolveDbUserId(jwtUser) {
  const sub = jwtUser?.sub;
  if (!sub || isDirectorySessionId(sub)) {
    return null;
  }
  const exists = await giUsers.userExists(sub);
  return exists ? sub : null;
}

async function resolveDbUserIdFromString(id) {
  if (!id || isDirectorySessionId(id)) {
    return null;
  }
  const exists = await giUsers.userExists(id);
  return exists ? id : null;
}

function sessionDisplayName(jwtUser, fallback = 'Sistema') {
  return jwtUser?.name || fallback;
}

module.exports = {
  DIRECTORY_USER_PREFIX,
  isDirectorySessionId,
  resolveDbUserId,
  resolveDbUserIdFromString,
  sessionDisplayName,
};
