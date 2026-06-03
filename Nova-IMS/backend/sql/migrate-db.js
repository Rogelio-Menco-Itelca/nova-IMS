/**
 * Ejecuta migraciones incrementales (NO destructivo).
 * Uso: node sql/migrate-db.js
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const IGNORE_ERR = new Set([
  "ER_DUP_FIELDNAME",
  "ER_DUP_KEYNAME",
  "ER_FK_DUP_NAME",
  "ER_CANT_CREATE_TABLE",
  "ER_CANT_DROP_FIELD_OR_KEY",
]);

async function columnExists(conn, table, column) {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS n
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number(row.n) > 0;
}

/** Versión anterior guardaba depto/municipio en personas; pasa al incidente. */
async function relocateGeoFromPeopleToIncident(conn) {
  if (!(await columnExists(conn, "incident_people", "department_id"))) {
    return;
  }

  console.log(
    "[MIGRATE] Moviendo departamento/municipio de incident_people → incidents...",
  );

  await conn.query(`
    UPDATE incidents i
    INNER JOIN (
      SELECT ip.incident_id, ip.department_id, ip.municipality_id
        FROM incident_people ip
       WHERE ip.department_id IS NOT NULL
       ORDER BY ip.id ASC
    ) src ON src.incident_id = i.id
       SET i.department_id = COALESCE(i.department_id, src.department_id),
           i.municipality_id = COALESCE(i.municipality_id, src.municipality_id)
     WHERE i.department_id IS NULL
  `);

  for (const fk of ["fk_ip_department", "fk_ip_municipality"]) {
    try {
      await conn.query(
        `ALTER TABLE incident_people DROP FOREIGN KEY \`${fk}\``,
      );
    } catch (err) {
      if (!IGNORE_ERR.has(err.code)) throw err;
    }
  }

  for (const col of ["municipality_id", "department_id"]) {
    try {
      await conn.query(`ALTER TABLE incident_people DROP COLUMN \`${col}\``);
    } catch (err) {
      if (err.code !== "ER_BAD_FIELD_ERROR" && !IGNORE_ERR.has(err.code)) {
        throw err;
      }
    }
  }
}

async function runSqlFile(conn, filePath, label) {
  if (!fs.existsSync(filePath)) return;
  const sql = fs.readFileSync(filePath, "utf8");
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("--"));

  console.log(`[MIGRATE] Ejecutando ${label}...`);
  for (const statement of statements) {
    try {
      await conn.query(statement);
    } catch (err) {
      if (IGNORE_ERR.has(err.code)) continue;
      throw err;
    }
  }
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "ims_db",
    multipleStatements: true,
  });

  const sqlDir = __dirname;
  const legacy = ["05_add_incident_date.sql", "06_incident_date_datetime.sql"];
  for (const file of legacy) {
    await runSqlFile(conn, path.join(sqlDir, file), file);
  }

  await runSqlFile(conn, path.join(sqlDir, "07_colombia_geo.sql"), "07_colombia_geo.sql");

  const [[{ count }]] = await conn.query(
    "SELECT COUNT(*) AS count FROM departments",
  );
  if (Number(count) === 0) {
    await runSqlFile(
      conn,
      path.join(sqlDir, "08_colombia_geo_seed.sql"),
      "08_colombia_geo_seed.sql (seed inicial)",
    );
  } else {
    console.log(
      "[MIGRATE] Catálogo Colombia ya cargado; omitiendo 08_colombia_geo_seed.sql",
    );
  }

  await runSqlFile(
    conn,
    path.join(sqlDir, "09_incident_geo.sql"),
    "09_incident_geo.sql",
  );
  await relocateGeoFromPeopleToIncident(conn);

  await conn.end();
  console.log("[MIGRATE] OK. Migraciones aplicadas sin borrar datos.");
  process.exit(0);
}

run().catch((err) => {
  console.error("[MIGRATE] ERROR:", err.message);
  process.exit(1);
});
