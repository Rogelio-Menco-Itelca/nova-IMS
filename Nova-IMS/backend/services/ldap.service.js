/**
 * Servicio de autenticación contra LDAP.
 *
 * Implementa el patrón estándar "search-then-bind":
 *   1. Bind del service account (permite buscar en el directorio).
 *   2. Búsqueda del usuario por atributo configurable (uid / sAMAccountName).
 *   3. Re-bind con el DN encontrado y la contraseña provista.
 *      Si este bind tiene éxito → credenciales correctas.
 *
 * La función `authenticate()` lanza `LdapAuthError` con códigos tipados
 * para que el controller distinga:
 *   - credenciales inválidas (caso esperado, devuelve 401 al cliente)
 *   - errores de servidor (caso anormal, devuelve 503 y se loggea)
 *
 * Seguridad:
 *   - NUNCA se loggea la contraseña del usuario final.
 *   - El filtro LDAP escapa caracteres especiales (RFC 4515) para
 *     evitar inyección.
 *   - La conexión siempre se cierra con `unbind()` en un bloque finally,
 *     aún cuando haya errores.
 *
 * @module services/ldap.service
 *
 * NOTA TEMPORAL DE DEBUG: se agregaron 2 console.log en el paso [3] para
 * diagnosticar un fallo de bind. Quitarlos una vez resuelto el problema.
 */

const { Client } = require('ldapts');
const ldapConfig = require('../config/ldap');
const logger = require('../utils/logger');

/**
 * Códigos de error del módulo.
 * @readonly
 */
const ErrorCode = Object.freeze({
  /** Password incorrecta (LDAP respondió 0x31 / 49) */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  /** El search no devolvió ningún entry para ese username */
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  /** Error de red / timeout / TLS / servidor caído */
  SERVER_ERROR: 'SERVER_ERROR',

  /** Configuración inválida (bindDN/password del service account mal) */
  CONFIG_ERROR: 'CONFIG_ERROR',

  /** LDAP_ENABLED=false — no se intentó autenticar */
  DISABLED: 'DISABLED',
});

/**
 * Error tipado del módulo LDAP. Permite al controller decidir qué HTTP
 * status devolver y qué loggear según el tipo de falla.
 */
class LdapAuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LdapAuthError';
    this.code = code;
  }
}

/**
 * Escapa valores para usarlos en un filtro LDAP (RFC 4515).
 * Previene inyección si el username contiene `*`, `(`, `)`, `\` o nulos.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeFilter(value) {
  const str = String(value).replaceAll('\0', String.raw`\00`);
  return str.replace(/[()*\\]/g, (c) => `\\${c.codePointAt(0).toString(16).padStart(2, '0')}`);
}

function entryDn(entry) {
  if (!entry?.dn) return '';
  return typeof entry.dn === 'string' ? entry.dn : String(entry.dn);
}

function firstAttr(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** Crea un cliente ldapts con timeouts y TLS según la configuración. */
function createClient() {
  const options = {
    url: ldapConfig.url,
    timeout: ldapConfig.timeoutMs,
    connectTimeout: ldapConfig.timeoutMs,
  };
  if (ldapConfig.url?.startsWith('ldaps://')) {
    options.tlsOptions = { rejectUnauthorized: ldapConfig.tlsRejectUnauthorized };
  }
  return new Client(options);
}

/**
 * Detecta si un error de ldapts corresponde a "credenciales inválidas".
 * Verifica múltiples formas en que ldapts puede exponer el código:
 *   - err.code === 49
 *   - err.resultCode === 49
 *   - mensaje contiene '0x31' o 'invalid credentials'
 */
function isInvalidCredentialsError(err) {
  if (!err) return false;
  if (err.code === 49 || err.resultCode === 49) return true;
  const msg = String(err.message || '').toLowerCase();
  return /0x31|invalid ?credentials/.test(msg);
}

/**
 * Autentica a un usuario contra el directorio LDAP.
 *
 * @param {string} username  Valor del atributo configurado (uid / sAMAccountName)
 * @param {string} password  Contraseña en claro (NO se loggea)
 * @returns {Promise<{dn:string, cn:string, mail:string, displayName:string}>}
 *          Datos básicos del usuario si la autenticación fue exitosa.
 * @throws {LdapAuthError}
 */
async function authenticate(username, password) {
  if (!ldapConfig.enabled) {
    throw new LdapAuthError(ErrorCode.DISABLED, 'Módulo LDAP deshabilitado');
  }
  if (!username || !password) {
    throw new LdapAuthError(ErrorCode.INVALID_CREDENTIALS, 'Credenciales vacías');
  }

  const client = createClient();

  try {
    // [1] Bind del service account
    try {
      await client.bind(ldapConfig.bindDn, ldapConfig.bindPassword);
    } catch (err) {
      throw new LdapAuthError(
        ErrorCode.CONFIG_ERROR,
        `No se pudo autenticar el service account "${ldapConfig.bindDn}": ${err.message}`,
      );
    }

    // [2] Búsqueda del usuario
    const filter = `(${ldapConfig.userAttribute}=${escapeFilter(username)})`;
    let entry;
    try {
      const { searchEntries } = await client.search(ldapConfig.baseDn, {
        scope: 'sub',
        filter,
        attributes: ['cn', 'mail', 'displayName'],
        sizeLimit: 2, // Si match > 1, el filtro es ambiguo → CONFIG_ERROR
      });

      if (!searchEntries.length) {
        throw new LdapAuthError(ErrorCode.USER_NOT_FOUND, `Usuario no encontrado para ${filter}`);
      }
      if (searchEntries.length > 1) {
        throw new LdapAuthError(
          ErrorCode.CONFIG_ERROR,
          `Filtro ambiguo: ${searchEntries.length} usuarios coinciden con ${filter}`,
        );
      }
      entry = searchEntries[0];
    } catch (err) {
      if (err instanceof LdapAuthError) throw err;

      // AD LDS (a diferencia de OpenLDAP) a veces responde "No such object"
      // (código LDAP 32 / 0x20) cuando una búsqueda simplemente no encuentra
      // ninguna coincidencia, en vez de responder éxito con 0 resultados.
      // Sin este ajuste, un usuario que solo existe en MySQL (no en el
      // directorio) bloquearía el login entero con un falso error de servidor.
      const msg = String(err.message || '').toLowerCase();
      const isAdLdsEmptyResult = err.code === 32 || /no_object|0x20/.test(msg);
      if (isAdLdsEmptyResult) {
        throw new LdapAuthError(
          ErrorCode.USER_NOT_FOUND,
          `Usuario no encontrado (AD LDS NO_OBJECT) para ${filter}`,
        );
      }

      throw new LdapAuthError(ErrorCode.SERVER_ERROR, `Error al buscar en LDAP: ${err.message}`);
    }

    const userDn = entryDn(entry);
    if (!userDn) {
      throw new LdapAuthError(ErrorCode.SERVER_ERROR, 'Entrada LDAP sin DN válido');
    }

    // [3] Bind con las credenciales del usuario → ésta es la verificación real
    try {
      await client.bind(userDn, password);
    } catch (err) {
      if (isInvalidCredentialsError(err)) {
        throw new LdapAuthError(ErrorCode.INVALID_CREDENTIALS, 'Password incorrecta');
      }
      throw new LdapAuthError(
        ErrorCode.SERVER_ERROR,
        `Error al hacer bind del usuario: ${err.message}`,
      );
    }

    const cn = firstAttr(entry.cn);
    return {
      dn: userDn,
      cn,
      mail: firstAttr(entry.mail),
      displayName: firstAttr(entry.displayName) || cn,
    };
  } finally {
    // Siempre cerrar la conexión, tanto en éxito como en error
    await client.unbind().catch(() => {
      /* silencioso */
    });
  }
}

/**
 * Health check: prueba que el directorio sea alcanzable y que el service
 * account pueda bind. Útil para un endpoint /health/ldap o para diagnóstico.
 *
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
/**
 * Intenta autenticar sin lanzar excepción en credenciales inválidas.
 * @returns {Promise<{ok:true, profile: object}|{ok:false, error?: string}>}
 */
async function tryAuthenticate(username, password) {
  if (!ldapConfig.enabled) {
    return { ok: false };
  }

  try {
    const profile = await authenticate(username, password);
    return { ok: true, profile };
  } catch (err) {
    if (!(err instanceof LdapAuthError)) {
      throw err;
    }
    if (err.code === ErrorCode.INVALID_CREDENTIALS || err.code === ErrorCode.USER_NOT_FOUND) {
      return { ok: false };
    }
    if (err.code === ErrorCode.DISABLED) {
      return {
        ok: false,
        error: 'Autenticación con directorio no disponible. Contacte al administrador.',
      };
    }
    logger.error('[LDAP]', err.code, err.message);
    return {
      ok: false,
      error: 'No se pudo validar con el directorio. Intente más tarde.',
    };
  }
}

async function isAvailable() {
  if (!ldapConfig.enabled) {
    return { ok: false, error: 'LDAP deshabilitado' };
  }
  const client = createClient();
  try {
    await client.bind(ldapConfig.bindDn, ldapConfig.bindPassword);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    await client.unbind().catch(() => {});
  }
}

module.exports = {
  authenticate,
  tryAuthenticate,
  isAvailable,
  LdapAuthError,
  ErrorCode,
};