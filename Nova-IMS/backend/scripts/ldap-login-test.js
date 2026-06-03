/**
 * Prueba conexión LDAP y credenciales de un uid.
 * Uso: npm run ldap:test -- <uid> <password>
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const ldapConfig = require("../config/ldap");
const ldapService = require("../services/ldap.service");
const { pool } = require("../config/db");

async function main() {
  const uid = process.argv[2];
  const password = process.argv[3];

  if (!uid || !password) {
    console.error("Uso: npm run ldap:test -- <uid> <password>");
    process.exit(1);
  }

  console.log("LDAP_ENABLED:", ldapConfig.enabled);
  console.log("LDAP_URL:", ldapConfig.url);

  const health = await ldapService.isAvailable();
  console.log("Service account:", health);
  if (!health.ok) process.exit(2);

  const auth = await ldapService.tryAuthenticate(uid, password);
  if (!auth.ok) {
    console.error("Autenticación fallida.", auth.error || "uid o contraseña incorrectos.");
    process.exit(3);
  }
  console.log("LDAP OK:", auth.profile);

  const agency = ldapConfig.defaultAgencyCode;
  const [rows] = await pool.query(
    `SELECT u.username, u.auth_source, a.code AS agency
       FROM users u
       JOIN agencies a ON a.id = u.agency_id
      WHERE u.username = ? AND a.code = ?`,
    [uid, agency],
  );

  if (rows.length) {
    console.log("MySQL (opcional, personaliza rol):", rows[0]);
  } else {
    console.log(`Sin fila en MySQL → login con rol ${ldapConfig.defaultRoleId}, agencia ${agency}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(99);
});
