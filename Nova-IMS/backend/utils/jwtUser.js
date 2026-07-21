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

async function resolveActorForDb(jwtUser) {
  if (!jwtUser?.sub) return null;

  if (isDirectorySessionId(jwtUser.sub)) {
    const username =
      jwtUser.username || jwtUser.sub.slice(DIRECTORY_USER_PREFIX.length);
    const linked = await giUsers.findUserByLogin(username, jwtUser.agency_code);
    if (linked) {
      return { userId: linked.id, agencyCode: linked.agency_code };
    }
    return giUsers.ensureDirectoryActor(jwtUser);
  }

  const exists = await giUsers.userExists(jwtUser.sub);
  if (!exists) return null;
  return { userId: jwtUser.sub, agencyCode: jwtUser.agency_code };
}

function sessionDisplayName(jwtUser, fallback = 'Sistema') {
  return jwtUser?.name || fallback;
}

module.exports = {
  DIRECTORY_USER_PREFIX,
  isDirectorySessionId,
  resolveDbUserId,
  resolveDbUserIdFromString,
  resolveActorForDb,
  sessionDisplayName,
};
