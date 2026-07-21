
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutos
const MAX_ATTEMPTS = 5;

const store = new Map();

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

  store.delete(userId);
  return { ok: true };
}

setInterval(
  () => {
    const now = Date.now();
    for (const [id, entry] of store) {
      if (now > entry.expiresAt) store.delete(id);
    }
  },
  15 * 60 * 1000,
);

module.exports = { generate, verify, getLoginRegistroId };
