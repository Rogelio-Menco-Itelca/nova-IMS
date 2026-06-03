const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");
const ldapConfig = require("../config/ldap");
const ldapService = require("../services/ldap.service");
const otpService = require("../services/otp.service");
const { sendOtpEmail } = require("../services/email.service");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const HttpError = require("../utils/HttpError");

function maskEmail(email) {
  if (!email) return "****";
  const [local, domain] = email.split("@");
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

/**
 * POST /api/auth/login
 * - Usuarios LDAP/AD  → authService.login() → JWT directo (sin OTP)
 * - Usuarios locales  → bcrypt + OTP → requiere /verify-otp
 */
exports.login = asyncHandler(async (req, res) => {
  const { agencia, usuario, password } = req.body || {};

  // Intentar LDAP primero (authService.login lo maneja internamente)
  if (ldapConfig.enabled) {
    const directoryResult = await ldapService.tryAuthenticate(usuario, password);

    if (directoryResult.error) {
      throw new HttpError(503, directoryResult.error);
    }

    if (directoryResult.ok) {
      // Usuario AD → JWT directo
      const result = await authService.login(req.body || {});
      return res.json(result);
    }
  }

  // Usuario local → validar con bcrypt + enviar OTP
  const result = await authService.login(req.body || {});
  // Si authService retornó token = usuario local autenticado correctamente
  // Ahora enviamos OTP en lugar de retornar el token directamente
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email FROM users u
      JOIN agencies a ON a.id = u.agency_id
     WHERE u.username = ? AND a.code = ?`,
    [usuario, agencia],
  );

  if (!rows.length) throw new HttpError(401, "Credenciales incorrectas.");
  const user = rows[0];

  const code = otpService.generate(user.id);
  try {
    await sendOtpEmail({ to: user.email, name: user.name, code });
  } catch (err) {
    console.error("[2FA] Error enviando OTP:", err.message);
  }

  res.json({
    requiresOtp: true,
    userId: user.id,
    otpTarget: maskEmail(user.email),
  });
});

/**
 * POST /api/auth/verify-otp
 * Solo usuarios locales — verifica OTP y emite JWT
 */
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { userId, code } = req.body || {};
  if (!userId || !code) {
    throw new HttpError(400, "userId y code son requeridos");
  }

  const result = otpService.verify(userId, code);

  if (!result.ok) {
    const messages = {
      expired:           "El código ha expirado. Inicie sesión de nuevo.",
      too_many_attempts: "Demasiados intentos fallidos. Inicie sesión de nuevo.",
      invalid_code:      "Código incorrecto. Verifique el correo e intente de nuevo.",
      no_code:           "No hay código activo. Inicie sesión de nuevo.",
    };
    throw new HttpError(401, messages[result.reason] || "Código inválido.");
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.name, u.email, u.must_change_password,
            u.auth_source, u.role_id, r.name AS role_name,
            a.id AS agency_id, a.code AS agency_code
       FROM users u
       JOIN roles r    ON r.id = u.role_id
       JOIN agencies a ON a.id = u.agency_id
      WHERE u.id = ?`,
    [userId],
  );
  if (!rows.length) throw new HttpError(404, "Usuario no encontrado");
  const user = rows[0];

  pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]).catch(() => {});

  const payload = {
    sub:         user.id,
    username:    user.username,
    name:        user.name,
    email:       user.email,
    role_id:     user.role_id,
    role_name:   user.role_name,
    agency_id:   user.agency_id,
    agency_code: user.agency_code,
    auth_source: "local",
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  res.json({
    token,
    mustChangePassword: !!user.must_change_password,
    user: {
      id:       user.id,
      name:     user.name,
      email:    user.email,
      role:     user.role_name,
      role_id:  user.role_id,
      agency:   user.agency_code,
      authSource: "local",
    },
  });
});

// GET /api/auth/me — igual que el base
exports.me = asyncHandler(async (req, res) => {
  res.json(await authService.getProfile(req.user));
});

// POST /api/auth/change-password — igual que el base
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const result = await authService.changePassword(req.user, currentPassword, newPassword);
  res.json(result);
});

// GET /api/auth/ldap-health — igual que el base
exports.ldapHealth = asyncHandler(async (req, res) => {
  if (!ldapConfig.enabled) {
    return res.json({ enabled: false, ok: false, error: "LDAP deshabilitado" });
  }
  const result = await ldapService.isAvailable();
  res.json({ enabled: true, ...result });
});
