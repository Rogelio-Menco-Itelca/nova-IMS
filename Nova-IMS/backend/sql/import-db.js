const fs = require("node:fs");
const path = require("node:path");
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
