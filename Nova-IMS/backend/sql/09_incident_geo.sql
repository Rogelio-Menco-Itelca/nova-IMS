-- Ubicación del hecho en incidents (departamento / municipio donde ocurre).
-- Si antes estaba en incident_people, migrate-db.js copia datos y elimina esas columnas.

ALTER TABLE incidents
  ADD COLUMN department_id SMALLINT UNSIGNED NULL AFTER location;

ALTER TABLE incidents
  ADD COLUMN municipality_id INT UNSIGNED NULL AFTER department_id;

ALTER TABLE incidents
  ADD CONSTRAINT fk_incidents_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE incidents
  ADD CONSTRAINT fk_incidents_municipality
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
