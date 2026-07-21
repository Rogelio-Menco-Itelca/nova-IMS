const { Client } = require('ldapts');
const ldapConfig = require('../config/ldap');
const logger = require('../utils/logger');

const ErrorCode = Object.freeze({
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  USER_NOT_FOUND: 'USER_NOT_FOUND',

  SERVER_ERROR: 'SERVER_ERROR',

  CONFIG_ERROR: 'CONFIG_ERROR',

  DISABLED: 'DISABLED',
});

class LdapAuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LdapAuthError';
    this.code = code;
  }
}

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

function isInvalidCredentialsError(err) {
  if (!err) return false;
  if (err.code === 49 || err.resultCode === 49) return true;
  const msg = String(err.message || '').toLowerCase();
  return /0x31|invalid ?credentials/.test(msg);
}

async function authenticate(username, password) {
  if (!ldapConfig.enabled) {
    throw new LdapAuthError(ErrorCode.DISABLED, 'Módulo LDAP deshabilitado');
  }
  if (!username || !password) {
    throw new LdapAuthError(ErrorCode.INVALID_CREDENTIALS, 'Credenciales vacías');
  }

  const client = createClient();

  try {
    try {
      await client.bind(ldapConfig.bindDn, ldapConfig.bindPassword);
    } catch (err) {
      throw new LdapAuthError(
        ErrorCode.CONFIG_ERROR,
        `No se pudo autenticar el service account "${ldapConfig.bindDn}": ${err.message}`,
      );
    }

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
    await client.unbind().catch(() => {
    });
  }
}

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