/**
 * Importa gestionincidentes desde los SQL del repo.
 *
 *   node sql/import-db.js --reset     → 01_schema + 02_seed_catalogs + 03_seed_geo
 *   node sql/import-db.js --full      → gestionincidentes_dump.sql (dump completo)
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function runSqlFile(conn, filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  console.log(`[IMPORT] ${path.basename(filePath)}`);
  await conn.query(sql);
}

async function run() {
  const full = process.argv.includes("--full");
  const reset = process.argv.includes("--reset");

  if (!full && !reset) {
    console.error("[IMPORT] Indique --reset (esquema + catálogos) o --full (dump completo).");
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  const sqlDir = __dirname;

  try {
    if (full) {
      await runSqlFile(conn, path.join(sqlDir, "gestionincidentes_dump.sql"));
    } else {
      await runSqlFile(conn, path.join(sqlDir, "01_schema.sql"));
      await runSqlFile(conn, path.join(sqlDir, "02_seed_catalogs.sql"));
      await runSqlFile(conn, path.join(sqlDir, "03_seed_geo.sql"));
    }
    console.log("[IMPORT] OK");
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("[IMPORT] ERROR:", err.message);
  process.exit(1);
});
