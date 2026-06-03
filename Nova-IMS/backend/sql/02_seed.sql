-- =====================================================================
-- Seed de catálogos (datos no-sensibles).
-- NOTA: autenticación principal vía directorio LDAP (Docker).
-- Cuentas locales opcionales: backend/sql/seed_users.js o panel Administración.
-- AUTO_SEED_USERS=false por defecto en .env.example.
-- =====================================================================

USE ims_db;

-- ---- Agencias ----
INSERT INTO agencies (id, code, name) VALUES
  (1, 'CENTRAL', 'Central de Emergencias'),
  (2, 'NORTE',   'Sede Norte'),
  (3, 'SUR',     'Sede Sur');

-- ---- Módulos ----
INSERT INTO modules (id, name) VALUES
  (1, 'Dashboard'),
  (2, 'Incidentes'),
  (3, 'Reportes'),
  (4, 'Administración');

-- ---- Roles ----
INSERT INTO roles (id, name, description, is_system) VALUES
  ('RP-1', 'Administrador del sistema',  'Control total del sistema',              1),
  ('RP-2', 'Supervisor / Coordinador',    'Gestiona equipos y aprueba cambios',    1),
  ('RP-3', 'Operador / Despachador',      'Crea y actualiza incidentes',           1),
  ('RP-4', 'Unidad / Agente de campo',    'Atiende y actualiza en terreno',        1),
  ('RP-5', 'Analista / Informes',         'Consulta reportes e indicadores',       1),
  ('RP-6', 'Usuario Consulta',            'Solo lectura',                          1);

-- ---- Permisos por rol (enabled, view, create, edit, delete) ----
INSERT INTO role_permissions (role_id, module_id, enabled, can_view, can_create, can_edit, can_delete) VALUES
  ('RP-1',1,1,1,1,1,1),('RP-1',2,1,1,1,1,1),('RP-1',3,1,1,1,1,1),('RP-1',4,1,1,1,1,1),
  ('RP-2',1,1,1,1,1,0),('RP-2',2,1,1,1,1,0),('RP-2',3,1,1,0,0,0),('RP-2',4,0,0,0,0,0),
  ('RP-3',1,1,1,0,0,0),('RP-3',2,1,1,1,1,0),('RP-3',3,0,0,0,0,0),('RP-3',4,0,0,0,0,0),
  ('RP-4',1,1,1,0,0,0),('RP-4',2,1,1,0,1,0),('RP-4',3,0,0,0,0,0),('RP-4',4,0,0,0,0,0),
  ('RP-5',1,1,1,0,0,0),('RP-5',2,1,1,0,0,0),('RP-5',3,1,1,0,0,0),('RP-5',4,0,0,0,0,0),
  ('RP-6',1,1,1,0,0,0),('RP-6',2,1,1,0,0,0),('RP-6',3,1,1,0,0,0),('RP-6',4,0,0,0,0,0);

-- ---- Tipos de incidente ----
INSERT INTO incident_types (id, name, default_priority, description) VALUES
  ('IT-01','Accidente de Tráfico', 'Alta',    'Colisión entre dos o más vehículos en vías públicas.'),
  ('IT-02','Incendio Estructural', 'Crítica', 'Fuego descontrolado en una edificación.'),
  ('IT-03','Emergencia Médica',    'Alta',    'Situación que requiere asistencia médica de urgencia.'),
  ('IT-04','Robo / Asalto',        'Alta',    'Sustracción de bienes con uso de violencia o intimidación.');

-- ---- Protocolos ----
INSERT INTO response_protocols (id, name, incident_type_id) VALUES
  ('RPR-01','Protocolo Colisión Vehicular Leve','IT-01'),
  ('RPR-02','Protocolo Conato de Incendio',     'IT-02'),
  ('RPR-03','Protocolo Atención Primaria SVB',  'IT-03');

INSERT INTO protocol_steps (protocol_id, step_order, description) VALUES
  ('RPR-01',1,'Verificar estado de los ocupantes.'),
  ('RPR-01',2,'Solicitar unidad de tránsito.'),
  ('RPR-01',3,'Asegurar el área del accidente.'),
  ('RPR-01',4,'Reportar a la aseguradora si es necesario.'),
  ('RPR-02',1,'Activar la alarma de evacuación del edificio.'),
  ('RPR-02',2,'Despachar la unidad de bomberos más cercana.'),
  ('RPR-02',3,'Notificar a la red de emergencias.'),
  ('RPR-02',4,'Cortar suministros de gas y electricidad si es seguro.'),
  ('RPR-03',1,'Evaluar la escena y garantizar la seguridad.'),
  ('RPR-03',2,'Verificar el estado de consciencia del paciente.'),
  ('RPR-03',3,'Evaluar respiración y pulso.'),
  ('RPR-03',4,'Iniciar RCP si es necesario y despachar ambulancia.');

-- ---- Personas ----
INSERT INTO people (id, name, document_id, phone, address, email) VALUES
  ('PER-001','Dilan Novoa','12345678','3001234567','Calle 100 #15-30','dilan@example.com'),
  ('PER-002','Alba Lucia', '87654321','3109876543','Carrera 7 #72-10','alba@example.com');

-- ---- Emails de notificación ----
INSERT INTO notification_emails (email) VALUES
  ('supervisor@central.ims'),
  ('reportes@central.ims');

-- ---- Incidentes demo ----
INSERT INTO incidents
  (id, event_id, incident_type_id, type_name, priority, status, origin, phone, ani,
   location, lat, lng, details, operator_id, operator_name)
VALUES
  ('INC-001','EVT-1001','IT-01','Accidente de Tráfico','Alta','Asignado','Llamada 911','555-1234','555-1234',
   'Av. Principal & Calle 1', 4.6097100, -74.0817500, 'Colisión de dos vehículos.', NULL, 'Juan Perez'),
  ('INC-002','EVT-1002','IT-02','Incendio Estructural','Crítica','En situación','Alarma de incendios','555-5678','555-5678',
   'Zona Industrial, Bodega 5', 4.6243350, -74.0636440, 'Humo visible saliendo del techo.', NULL, 'Maria Garcia');
