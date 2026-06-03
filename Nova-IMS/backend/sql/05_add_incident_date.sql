-- Migración incremental (NO destructiva)
-- Agrega incident_date en incident_vehicles si no existe.
-- Compatible con MySQL sin "ADD COLUMN IF NOT EXISTS".

SET @col_exists := (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'incident_vehicles'
     AND COLUMN_NAME  = 'incident_date'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE incident_vehicles ADD COLUMN incident_date DATETIME NULL',
  'SELECT ''[skip] incident_date ya existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill para registros existentes tomando fecha y hora de creación del incidente
UPDATE incident_vehicles iv
JOIN incidents i ON i.id = iv.incident_id
SET iv.incident_date = i.created_at
WHERE iv.incident_date IS NULL;
