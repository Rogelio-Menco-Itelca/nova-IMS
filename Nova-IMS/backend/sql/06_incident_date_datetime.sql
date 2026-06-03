-- Migración incremental: incident_date pasa de DATE a DATETIME (fecha + hora de registro).

ALTER TABLE incident_vehicles
  MODIFY COLUMN incident_date DATETIME NULL;

-- Registros que solo tenían fecha (00:00:00) recuperan la hora del incidente
UPDATE incident_vehicles iv
JOIN incidents i ON i.id = iv.incident_id
SET iv.incident_date = i.created_at
WHERE iv.incident_date IS NOT NULL
  AND TIME(iv.incident_date) = '00:00:00';
