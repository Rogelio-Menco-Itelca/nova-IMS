-- =====================================================================
-- Incident Management System - Esquema MySQL 8.x
-- Compatible con MySQL Workbench (Forward Engineering / Import)
-- Autor: Backend IMS
-- =====================================================================

DROP DATABASE IF EXISTS ims_db;
CREATE DATABASE ims_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ims_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. AGENCIAS
-- ---------------------------------------------------------------------
CREATE TABLE agencies (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(30)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. ROLES
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id          VARCHAR(20)  PRIMARY KEY,       -- Ej: 'RP-1'
  name        VARCHAR(100) NOT NULL UNIQUE,   -- Ej: 'Administrador del sistema'
  description VARCHAR(255) NULL,
  is_system   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. MÓDULOS DEL SISTEMA
-- ---------------------------------------------------------------------
CREATE TABLE modules (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE    -- Dashboard, Incidentes, Reportes, Administración
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. PERMISOS POR ROL (role x módulo)
-- ---------------------------------------------------------------------
CREATE TABLE role_permissions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  role_id     VARCHAR(20)  NOT NULL,
  module_id   INT          NOT NULL,
  enabled     TINYINT(1)   NOT NULL DEFAULT 0,
  can_view    TINYINT(1)   NOT NULL DEFAULT 0,
  can_create  TINYINT(1)   NOT NULL DEFAULT 0,
  can_edit    TINYINT(1)   NOT NULL DEFAULT 0,
  can_delete  TINYINT(1)   NOT NULL DEFAULT 0,
  UNIQUE KEY uk_role_module (role_id, module_id),
  CONSTRAINT fk_rp_role    FOREIGN KEY (role_id)   REFERENCES roles(id)   ON DELETE CASCADE,
  CONSTRAINT fk_rp_module  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. USUARIOS / OPERADORES
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            VARCHAR(20)   PRIMARY KEY,      -- Ej: 'USR-001' / 'OP-001'
  username      VARCHAR(50)   NOT NULL UNIQUE,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  role_id       VARCHAR(20)   NOT NULL,
  agency_id     INT           NOT NULL,
  status        ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  last_login    DATETIME      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role   FOREIGN KEY (role_id)   REFERENCES roles(id),
  CONSTRAINT fk_users_agency FOREIGN KEY (agency_id) REFERENCES agencies(id),
  INDEX idx_users_role (role_id),
  INDEX idx_users_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. PERSONAS (registro civil del sistema)
-- ---------------------------------------------------------------------
CREATE TABLE people (
  id           VARCHAR(20)   PRIMARY KEY,    -- Ej: 'PER-001'
  name         VARCHAR(150)  NOT NULL,
  document_id  VARCHAR(30)   NOT NULL,
  phone        VARCHAR(30)   NOT NULL,
  address      VARCHAR(255)  NOT NULL,
  email        VARCHAR(150)  NULL,
  birth_date   DATE          NULL,
  notes        TEXT          NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_people_document (document_id),
  INDEX idx_people_phone (phone),
  INDEX idx_people_name (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. TIPOS DE INCIDENTE
-- ---------------------------------------------------------------------
CREATE TABLE incident_types (
  id                VARCHAR(20)  PRIMARY KEY, -- Ej: 'IT-01'
  name              VARCHAR(120) NOT NULL UNIQUE,
  default_priority  ENUM('Baja','Media','Alta','Crítica') NOT NULL DEFAULT 'Media',
  description       TEXT         NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. PROTOCOLOS DE RESPUESTA + PASOS
-- ---------------------------------------------------------------------
CREATE TABLE response_protocols (
  id                VARCHAR(20)  PRIMARY KEY, -- Ej: 'RP-01'
  name              VARCHAR(150) NOT NULL,
  incident_type_id  VARCHAR(20)  NOT NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_protocol_type FOREIGN KEY (incident_type_id) REFERENCES incident_types(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE protocol_steps (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  protocol_id VARCHAR(20)  NOT NULL,
  step_order  INT          NOT NULL,
  description VARCHAR(500) NOT NULL,
  CONSTRAINT fk_ps_protocol FOREIGN KEY (protocol_id) REFERENCES response_protocols(id) ON DELETE CASCADE,
  INDEX idx_ps_protocol_order (protocol_id, step_order)
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------
-- DEPARTAMENTOS Y MUNICIPIOS (DIVIPOLA)
-- ---------------------------------------------------------------------
CREATE TABLE departments (
  id           SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dane_code    CHAR(2) NOT NULL,
  name         VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_departments_dane (dane_code),
  UNIQUE KEY uk_departments_name (name)
) ENGINE=InnoDB;

CREATE TABLE municipalities (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_id  SMALLINT UNSIGNED NOT NULL,
  dane_code      VARCHAR(5) NOT NULL,
  name           VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_municipalities_dane (dane_code),
  KEY idx_municipalities_department (department_id),
  CONSTRAINT fk_municipalities_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. INCIDENTES
-- ---------------------------------------------------------------------
CREATE TABLE incidents (
  id                     VARCHAR(20)  PRIMARY KEY,  -- Ej: 'INC-001'
  event_id               VARCHAR(50)  NULL,
  incident_type_id       VARCHAR(20)  NULL,
  type_name              VARCHAR(120) NULL, -- denormalizado: el frontend lo usa como string
  priority               ENUM('Baja','Media','Alta','Crítica') NOT NULL DEFAULT 'Media',
  status                 ENUM('Nuevo','Asignado','En camino','En situación','Resuelto','Cerrado','Cancelado')
                           NOT NULL DEFAULT 'Nuevo',
  origin                 VARCHAR(100) NULL,
  phone                  VARCHAR(30)  NULL,
  ani                    VARCHAR(30)  NULL,
  location               VARCHAR(255) NULL,
  department_id          SMALLINT UNSIGNED NULL,
  municipality_id        INT UNSIGNED NULL,
  lat                    DECIMAL(10,7) NULL,
  lng                    DECIMAL(10,7) NULL,
  comments               TEXT         NULL,
  details                TEXT         NULL,
  contact_info           VARCHAR(255) NULL,
  location_phone_number  VARCHAR(30)  NULL,
  operator_id            VARCHAR(20)  NULL,
  operator_name          VARCHAR(120) NULL, -- snapshot legible
  created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_incidents_type     FOREIGN KEY (incident_type_id) REFERENCES incident_types(id) ON DELETE SET NULL,
  CONSTRAINT fk_incidents_operator     FOREIGN KEY (operator_id)      REFERENCES users(id)           ON DELETE SET NULL,
  CONSTRAINT fk_incidents_department   FOREIGN KEY (department_id)    REFERENCES departments(id)     ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_incidents_municipality FOREIGN KEY (municipality_id)  REFERENCES municipalities(id)  ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_incidents_status (status),
  INDEX idx_incidents_priority (priority),
  INDEX idx_incidents_created (created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. PERSONAS INVOLUCRADAS EN INCIDENTES
-- ---------------------------------------------------------------------
CREATE TABLE incident_people (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  incident_id  VARCHAR(20) NOT NULL,
  person_id    VARCHAR(20) NULL,                 -- FK opcional al registro civil
  name         VARCHAR(150) NOT NULL,
  role         ENUM('Víctima','Victimario','Testigo') NOT NULL,
  contact      VARCHAR(150) NULL,
  phone        VARCHAR(30)  NULL,
  document_id  VARCHAR(30)  NULL,
  document_type VARCHAR(40) NULL,
  gender       ENUM('Masculino','Femenino') NULL,
  address      VARCHAR(255) NULL,
  details      TEXT         NULL,
  CONSTRAINT fk_ip_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
  CONSTRAINT fk_ip_person   FOREIGN KEY (person_id)   REFERENCES people(id)    ON DELETE SET NULL,
  INDEX idx_ip_incident (incident_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 11. VEHÍCULOS INVOLUCRADOS
-- ---------------------------------------------------------------------
CREATE TABLE incident_vehicles (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  incident_id  VARCHAR(20) NOT NULL,
  plate        VARCHAR(20) NOT NULL,
  role         ENUM('Vehículo Víctima','Vehículo Victimario','Vehículo Involucrado') NOT NULL,
  make         VARCHAR(50)  NULL,
  model        VARCHAR(50)  NULL,
  color        VARCHAR(30)  NULL,
  details      TEXT         NULL,
  incident_date DATETIME    NULL,
  CONSTRAINT fk_iv_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
  INDEX idx_iv_incident (incident_id),
  INDEX idx_iv_plate (plate)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 12. AUDITORÍA POR INCIDENTE (cambios de estado, asignaciones, notas)
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
  id           VARCHAR(30)   PRIMARY KEY,  -- Ej: 'LOG-<ts>'
  incident_id  VARCHAR(20)   NOT NULL,
  user_id      VARCHAR(20)   NULL,
  user_name    VARCHAR(120)  NOT NULL,
  action       VARCHAR(120)  NOT NULL,
  changes      VARCHAR(500)  NULL,
  details_json JSON          NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_user     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE SET NULL,
  INDEX idx_audit_incident (incident_id),
  INDEX idx_audit_created  (created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 13. LOG DE ACCIONES ADMINISTRATIVAS
-- ---------------------------------------------------------------------
CREATE TABLE admin_logs (
  id          VARCHAR(30)   PRIMARY KEY,  -- Ej: 'LOG-<ts>'
  user_id     VARCHAR(20)   NULL,
  user_name   VARCHAR(120)  NOT NULL,
  action      VARCHAR(150)  NOT NULL,
  details     VARCHAR(500)  NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_adminlog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_adminlog_created (created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 14. EMAILS DE NOTIFICACIÓN
-- ---------------------------------------------------------------------
CREATE TABLE notification_emails (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(150) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 15. SOLICITUDES DE UBICACIÓN (WhatsApp / SMS)
-- ---------------------------------------------------------------------
CREATE TABLE location_requests (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  phone        VARCHAR(30)  NOT NULL,
  channel      ENUM('whatsapp','sms') NOT NULL,
  request_url  VARCHAR(500) NULL,
  requested_by VARCHAR(20)  NULL,
  incident_id VARCHAR(50) NULL,
  received_lat DECIMAL(10,7) NULL,
  received_lng DECIMAL(10,7) NULL,
  received_at  DATETIME     NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_locreq_user FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_locreq_phone (phone)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 16. NOTIFICACIONES DEL SISTEMA
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
  id              VARCHAR(36) PRIMARY KEY,
  incident_id     VARCHAR(20) NULL,
  triggered_by    VARCHAR(20) NULL,
  title           VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,
  is_read         TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notifications_incident
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL,

  CONSTRAINT fk_notifications_triggered_by
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_notifications_triggered (triggered_by),
  INDEX idx_notifications_created (created_at),
  INDEX idx_notifications_incident (incident_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;