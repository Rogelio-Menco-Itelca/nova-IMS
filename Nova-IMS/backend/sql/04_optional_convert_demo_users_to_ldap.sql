-- =====================================================================
-- Migración 04 — (OPCIONAL) Convertir usuarios demo a LDAP
-- =====================================================================
-- Este script es SOLO para pruebas con el entorno local ldap-dev
-- (OpenLDAP en Docker con los 5 usuarios demo precargados).
-- NO ejecutar en producción sin validar que los usuarios existen
-- también en el Active Directory real.
--
-- Convierte 4 usuarios demo a autenticación LDAP y deja 'admin'
-- como local a propósito: queda como cuenta de respaldo en caso
-- de que el servidor LDAP esté caído. Esta es una buena práctica
-- en producción — siempre hay que tener al menos una cuenta admin
-- local que no dependa de servicios externos.
-- =====================================================================

USE ims_db;

UPDATE users
   SET auth_source   = 'ldap',
       password_hash = NULL
 WHERE username IN ('jperez', 'mgarcia', 'supervisor', 'operador');

-- Verificación: vista del estado final
SELECT username,
       auth_source,
       CASE WHEN password_hash IS NULL THEN 'NULL' ELSE 'SET' END AS password_hash_status,
       status
  FROM users
 ORDER BY auth_source, username;