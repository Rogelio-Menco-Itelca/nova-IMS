const LDAP_ONLY_TOKEN = 'LDAP_ONLY';

function passwordToken(user) {
  return String(user?.password_token || '').trim();
}

function isLocalPasswordUser(user) {
  if (!user) return false;
  return passwordToken(user) !== LDAP_ONLY_TOKEN;
}

function shouldAttemptDirectoryAuth(ldapEnabled, user) {
  return Boolean(ldapEnabled) && !isLocalPasswordUser(user);
}

module.exports = {
  LDAP_ONLY_TOKEN,
  isLocalPasswordUser,
  shouldAttemptDirectoryAuth,
};
