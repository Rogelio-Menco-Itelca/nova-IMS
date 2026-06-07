/**
 * Servicio OTP (One-Time Password) para 2FA
 *
 * - Genera un código numérico de 6 dígitos
 * - Lo almacena en memoria con expiración de 10 minutos
 * - Máximo 5 intentos fallidos antes de invalidar el código
 * - Un código solo puede usarse una vez (se invalida al verificar)
 */

const OTP_EXPIRY_MS  = 10 * 60 * 1000; // 10 minutos
const MAX_ATTEMPTS   = 5;

// Map<userId, { code, expiresAt, attempts }>
const store = new Map();

/**
 * Genera y almacena un OTP para el usuario dado.
 * Si ya existía uno, lo sobreescribe.
 * @returns {string} El código de 6 dígitos
 */
function generate(userId, options = {}) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const prev = store.get(userId);
  store.set(userId, {
    code,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
    loginRegistroId: options.loginRegistroId ?? prev?.loginRegistroId ?? null,
  });
  return code;
}

function getLoginRegistroId(userId) {
  return store.get(userId)?.loginRegistroId ?? null;
}

/**
 * Verifica el código para el userId.
 * @returns {{ ok: boolean, reason?: string }}
 */
function verify(userId, inputCode) {
  const entry = store.get(userId);

  if (!entry) {
    return { ok: false, reason: 'no_code' };
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(userId);
    return { ok: false, reason: 'expired' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(userId);
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (entry.code !== String(inputCode).trim()) {
    entry.attempts += 1;
    return { ok: false, reason: 'invalid_code' };
  }

  // Código correcto → consumir
  store.delete(userId);
  return { ok: true };
}

/**
 * Limpieza periódica de entradas expiradas (cada 15 min)
 */
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now > entry.expiresAt) store.delete(id);
  }
}, 15 * 60 * 1000);

module.exports = { generate, verify, getLoginRegistroId };
