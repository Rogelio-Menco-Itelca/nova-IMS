/**
 * Inicializa BD desde cero (destructivo) cuando se usa --reset.
 * Uso: node sql/init-db.js
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  const isReset = process.argv.includes('--reset');
  if (!isReset) {
    console.error(
      '[INIT] Operación bloqueada para proteger datos existentes.',
    );
    console.error(
      '[INIT] Use "npm run db:migrate" para cambios incrementales.',
    );
    console.error(
      '[INIT] Si realmente desea RECREAR toda la BD, ejecute: npm run db:reset',
    );
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('[INIT] MODO RESET: recreando base de datos completa...');
  console.log('[INIT] Ejecutando schema...');
  const schema = fs.readFileSync(path.join(__dirname, '01_schema.sql'), 'utf8');
  await conn.query(schema);

  console.log('[INIT] Ejecutando seed...');
  const seed = fs.readFileSync(path.join(__dirname, '02_seed.sql'), 'utf8');
  await conn.query(seed);

  await conn.end();

  console.log('[INIT] Sembrando usuarios con bcrypt...');
  await require('./seed_users').seed();

  console.log('[INIT] OK. Base de datos lista.');
  process.exit(0);
}

run().catch(err => {
  console.error('[INIT] ERROR:', err.message);
  process.exit(1);
});
