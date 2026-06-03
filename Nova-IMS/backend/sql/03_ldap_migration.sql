-- =====================================================================
-- Migración 03 — Columna auth_source (opcional, para perfiles locales vinculados)
-- El login por directorio NO exige fila en users; esta columna solo etiqueta cuentas en BD.
-- =====================================================================
-- IDEMPOTENTE: detecta qué cambios ya fueron aplicados y omite los
-- que ya existen. Es seguro ejecutar varias veces.
--
-- Aplicar en bases existentes que ya tenían el esquema original.
-- Para bases recién creadas desde 01_schema.sql actualizado, este script
-- detectará que los cambios ya existen y no hará nada.
--
-- Cambios:
--   1. password_hash pasa a ser NULL (los usuarios LDAP no lo usan).
--   2. Se agrega columna auth_source ('local' | 'ldap').
--   3. Se indexa auth_source para reportes/estadísticas.
--
-- Seguridad: la migración es no-destructiva. Todos los usuarios
-- existentes quedan con auth_source='local' (el default), así que
-- su comportamiento no cambia. Para migrar un usuario a LDAP hay
-- que hacer UPDATE explícito.
-- =====================================================================

USE ims_db;

-- ---------------------------------------------------------------------
-- [1] Permitir password_hash NULL (usuarios LDAP no almacenan hash local)
-- ---------------------------------------------------------------------
-- ALTER MODIFY es idempotente por naturaleza: aplicarlo a una columna
-- que ya está NULL no produce error, simplemente no hace nada nuevo.
ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- ---------------------------------------------------------------------
-- [2] Agregar columna auth_source si no existe
-- ---------------------------------------------------------------------
-- Verificamos en information_schema antes de ejecutar el ALTER, porque
-- "ADD COLUMN IF NOT EXISTS" no es soportado en versiones viejas de MySQL.
SET @col_exists := (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'users'
     AND COLUMN_NAME  = 'auth_source'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN auth_source ENUM(''local'',''ldap'') NOT NULL DEFAULT ''local'' AFTER password_hash',
  'SELECT ''[skip] auth_source ya existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- [3] Crear índice si no existe
-- ---------------------------------------------------------------------
SET @idx_exists := (
  SELECT COUNT(*)
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'users'
     AND INDEX_NAME   = 'idx_users_auth_source'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_users_auth_source ON users(auth_source)',
  'SELECT ''[skip] idx_users_auth_source ya existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- Verificación final
-- ---------------------------------------------------------------------
SELECT auth_source, COUNT(*) AS total
  FROM users
 GROUP BY auth_source;