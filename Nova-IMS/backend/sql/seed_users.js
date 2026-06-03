/**
 * Siembra opcional de cuentas LOCALES en MySQL (bcrypt).
 * Idempotente: si ya existen, no los duplica.
 *
 * Los usuarios del directorio (OpenLDAP/AD en Docker) NO van aquí:
 * autentican contra LDAP y no requieren fila en `users`.
 *
 * Para añadir una cuenta local de respaldo, agrega un objeto a
 * LOCAL_BOOTSTRAP_USERS y ejecuta: npm run db:seed-users
 *
 * Uso: node sql/seed_users.js
 */
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { pool } = require("../config/db");P

/** Vacío por defecto: identidades reales en el directorio LDAP. */
const LOCAL_BOOTSTRAP_USERS = [];

async function seed() {
  if (!LOCAL_BOOTSTRAP_USERS.length) {
    console.log(
      "[SEED] Sin usuarios locales configurados (LOCAL_BOOTSTRAP_USERS vacío).",
    );
    console.log(
      "[SEED] Use el directorio LDAP o cree operadores desde Administración.",
    );
    return { inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;

  for (const u of LOCAL_BOOTSTRAP_USERS) {
    const [exists] = await pool.query(
      `SELECT id FROM users WHERE id = ? OR username = ?`,
      [u.id, u.username],
    );

    if (exists.length) {
      skipped++;
      continue;
    }

    const passwordHash =
      u.auth_source === "ldap"
        ? null
        : await bcrypt.hash(u.password || "changeme", 10);

    await pool.query(
      `INSERT INTO users (id, username, name, email, password_hash, auth_source, role_id, agency_id, status)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        u.id,
        u.username,
        u.name,
        u.email,
        passwordHash,
        u.auth_source || "local",
        u.role_id,
        u.agency_id,
        u.status || "Activo",
      ],
    );

    inserted++;
  }

  console.log(`[SEED] Usuarios locales: ${inserted} creados, ${skipped} ya existían.`);
  return { inserted, skipped };
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[SEED] ERROR:", err);
      process.exit(1);
    });
}

module.exports = { seed };
