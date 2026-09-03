const bcrypt = require('bcryptjs');

function isBcryptHash(value) {
  const stored = String(value || '');
  return stored.startsWith('$2a$') || stored.startsWith('$2b$');
}

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), 10);
}

module.exports = { isBcryptHash, hashPassword };
