/**
 * Configuración del módulo de autenticación LDAP.
 *
 * Lee y valida las variables de entorno relacionadas con LDAP.
 * Expone un objeto frozen (inmutable) que el resto del backend consume
 * sin tocar process.env directamente — esto centraliza la configuración
 * y facilita testear/mockear.
 *
 * Principio: fail-fast. Si LDAP_ENABLED=true pero falta configuración,
 * el servidor NO arranca en lugar de fallar silenciosamente en runtime.
 *
 * @module config/ldap
 */

const REQUIRED_WHEN_ENABLED = [
  'LDAP_URL',
  'LDAP_BIND_DN',
  'LDAP_BIND_PASSWORD',
  'LDAP_BASE_DN',
  'LDAP_DEFAULT_ROLE_ID',
  'LDAP_DEFAULT_AGENCY_CODE',
];

const enabled =
  String(process.env.LDAP_ENABLED || 'false').toLowerCase() === 'true';

if (enabled) {
  const missing = REQUIRED_WHEN_ENABLED.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `[LDAP] LDAP_ENABLED=true pero faltan variables requeridas: ` +
      `${missing.join(', ')}. Revisa tu archivo .env`
    );
  }
}

const config = Object.freeze({
  enabled,
  url: process.env.LDAP_URL,
  bindDn: process.env.LDAP_BIND_DN,
  bindPassword: process.env.LDAP_BIND_PASSWORD,
  baseDn: process.env.LDAP_BASE_DN,
  userAttribute: process.env.LDAP_USER_ATTRIBUTE || 'uid',
  timeoutMs: Number.parseInt(process.env.LDAP_TIMEOUT_MS || '5000', 10),
  tlsRejectUnauthorized:
    String(process.env.LDAP_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() === 'true',
  /** Rol/agencia por defecto si el uid solo existe en el directorio (no en MySQL) — solo .env */
  defaultRoleId: process.env.LDAP_DEFAULT_ROLE_ID,
  defaultAgencyCode: process.env.LDAP_DEFAULT_AGENCY_CODE
    ? String(process.env.LDAP_DEFAULT_AGENCY_CODE).trim().toUpperCase()
    : null,
});

module.exports = config;