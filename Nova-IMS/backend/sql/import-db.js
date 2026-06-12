/**
 * Importa esquema y catálogos base en MySQL (gestionincidentes).
 *
 *   node sql/import-db.js
 *
 * Geo, usuarios, correos e incidentes: ya en la BD del cliente (dump MySQL).
 * No se versionan en este repositorio.
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
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  const sqlDir = __dirname;

  try {
    await runSqlFile(conn, path.join(sqlDir, "01_schema.sql"));
    await runSqlFile(conn, path.join(sqlDir, "02_catalogos_referencia.sql"));
    console.log("[IMPORT] OK — catálogos base. Datos operativos: usar dump del cliente en MySQL.");
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("[IMPORT] ERROR:", err.message);
  process.exit(1);
});
