/**
 * Prueba conexión LDAP y credenciales de un uid.
 * Uso: npm run ldap:test -- <uid> <password>
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ldapConfig = require('../config/ldap');
const ldapService = require('../services/ldap.service');
const giUsers = require('../db/gestionincidentes/users');

async function main() {
  const uid = process.argv[2];
  const password = process.argv[3];

  if (!uid || !password) {
    console.error('Uso: npm run ldap:test -- <uid> <password>');
    process.exit(1);
  }

  console.log('LDAP_ENABLED:', ldapConfig.enabled);
  console.log('LDAP_URL:', ldapConfig.url);

  const health = await ldapService.isAvailable();
  console.log('Service account:', health);
  if (!health.ok) process.exit(2);

  const auth = await ldapService.tryAuthenticate(uid, password);
  if (!auth.ok) {
    console.error('Autenticación fallida.', auth.error || 'uid o contraseña incorrectos.');
    process.exit(3);
  }
  console.log('LDAP OK:', auth.profile);

  const agency = ldapConfig.defaultAgencyCode;
  const dbUser = await giUsers.findUserByLogin(uid, agency);

  if (dbUser) {
    console.log('MySQL (opcional, personaliza rol):', {
      id: dbUser.id,
      agency: dbUser.agency_code,
      role: dbUser.role_name,
      auth_source: dbUser.auth_source,
    });
  } else {
    console.log(
      `Sin fila en usuarios → login con rol ${ldapConfig.defaultRoleId}, agencia ${agency}`,
    );
  }

  const { pool } = require('../config/db');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(99);
});
