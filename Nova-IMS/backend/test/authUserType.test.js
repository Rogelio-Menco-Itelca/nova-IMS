const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  LDAP_ONLY_TOKEN,
  isLocalPasswordUser,
  shouldAttemptDirectoryAuth,
} = require('../utils/authUserType');

describe('isLocalPasswordUser', () => {
  it('es falso si no hay fila en usuarios', () => {
    assert.equal(isLocalPasswordUser(null), false);
    assert.equal(isLocalPasswordUser(undefined), false);
  });

  it('es verdadero para Token_Contraseña local (OK / MUST_CHANGE)', () => {
    assert.equal(isLocalPasswordUser({ password_token: 'OK' }), true);
    assert.equal(isLocalPasswordUser({ password_token: 'MUST_CHANGE' }), true);
  });

  it('es falso para usuarios solo de directorio', () => {
    assert.equal(isLocalPasswordUser({ password_token: LDAP_ONLY_TOKEN }), false);
  });
});

describe('shouldAttemptDirectoryAuth', () => {
  it('no llama LDAP si está deshabilitado', () => {
    assert.equal(shouldAttemptDirectoryAuth(false, null), false);
    assert.equal(shouldAttemptDirectoryAuth(false, { password_token: 'OK' }), false);
  });

  it('no llama LDAP para usuarios locales aunque LDAP esté activo', () => {
    assert.equal(shouldAttemptDirectoryAuth(true, { password_token: 'OK' }), false);
  });

  it('sí llama LDAP si no hay usuario en BD o es LDAP_ONLY', () => {
    assert.equal(shouldAttemptDirectoryAuth(true, null), true);
    assert.equal(shouldAttemptDirectoryAuth(true, { password_token: LDAP_ONLY_TOKEN }), true);
  });
});
