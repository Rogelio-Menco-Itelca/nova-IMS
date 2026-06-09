const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const authService = require('../services/auth.service');
const ldapConfig = require('../config/ldap');
const ldapService = require('../services/ldap.service');
const otpService = require('../services/otp.service');
const { sendOtpEmail } = require('../services/email.service');
const jwt = require('jsonwebtoken');
const HttpError = require('../utils/HttpError');
const giUsers = require('../db/gestionincidentes/users');
const loginLogs = require('../db/gestionincidentes/loginLogs');

function maskEmail(email) {
  if (!email) return '****';
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

const OTP_FAIL_REASONS = {
  expired: 'Código OTP expirado',
  too_many_attempts: 'Demasiados intentos fallidos de OTP',
  invalid_code: 'Código OTP incorrecto',
  no_code: 'No hay código OTP activo',
};

async function startOtpFlow(user, rememberUser, resend = false) {
  let registroId =
    otpService.getLoginRegistroId(user.id) ||
    (await loginLogs.findPendingRegistro(user.id, user.agency_code));

  if (registroId) {
    await loginLogs.safeLog(() =>
      loginLogs.updateLoginStatus(
        registroId,
        'Pendiente',
        resend
          ? 'Reenvío de código OTP solicitado'
          : 'Contraseña validada, pendiente verificación 2FA',
      ),
    );
  } else {
    registroId = await loginLogs.safeLog(() =>
      loginLogs.insertLoginRecord({
        action: 'Inicio de sesión',
        description: 'Contraseña validada, pendiente verificación 2FA',
        userId: user.id,
        agencyCode: user.agency_code,
        roleId: user.role_id,
        rememberUser,
        status: 'Pendiente',
      }),
    );
  }

  const code = otpService.generate(user.id, { loginRegistroId: registroId });
  try {
    await sendOtpEmail({ to: user.email, name: user.name, code });
  } catch (err) {
    logger.error('[2FA] Error enviando OTP:', err.message);
  }

  await loginLogs.safeLog(() =>
    loginLogs.insert2faRecord({
      action: resend
        ? 'Reenvío de código OTP al correo electrónico'
        : 'Envío código OTP al correo electrónico',
      userId: user.id,
      agencyCode: user.agency_code,
      email: user.email,
      registroId,
    }),
  );

  return {
    requiresOtp: true,
    userId: user.id,
    otpTarget: maskEmail(user.email),
  };
}

exports.login = asyncHandler(async (req, res) => {
  const { agencia, usuario, password, rememberMe } = req.body || {};
  const rememberUser = !!rememberMe;

  if (ldapConfig.enabled) {
    const directoryResult = await ldapService.tryAuthenticate(usuario, password);

    if (directoryResult.error) {
      throw new HttpError(503, directoryResult.error);
    }

    if (directoryResult.ok) {
      const result = await authService.login(req.body || {}, { logSuccess: true });
      return res.json(result);
    }
  }

  await authService.login(req.body || {}, { logSuccess: false });

  const user = await giUsers.findUserByLogin(usuario, agencia);
  if (!user) {
    const elsewhere = await giUsers.findUserByLogin(usuario, null);
    if (elsewhere) {
      await authService.recordFailedLogin(
        elsewhere,
        elsewhere.agency_code,
        `Intento en agencia incorrecta (${String(agencia).toUpperCase()})`,
        rememberUser,
      );
      throw new HttpError(
        401,
        `El usuario no pertenece a la agencia ${String(agencia).toUpperCase()}. Seleccione ${elsewhere.agency_code}.`,
      );
    }
    throw new HttpError(401, 'Credenciales incorrectas.');
  }

  res.json(await startOtpFlow(user, rememberUser, false));
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const { userId, code, agencia } = req.body || {};
  if (!userId || !code) {
    throw new HttpError(400, 'userId y code son requeridos');
  }

  const user = await giUsers.findUserById(userId, agencia);
  if (!user) {
    throw new HttpError(
      401,
      'Usuario no encontrado en la agencia seleccionada. Inicie sesión de nuevo.',
    );
  }

  const registroId =
    otpService.getLoginRegistroId(userId) ||
    (await loginLogs.findPendingRegistro(userId, user.agency_code));

  const result = otpService.verify(userId, code);

  if (!result.ok) {
    const messages = {
      expired: 'El código ha expirado. Inicie sesión de nuevo.',
      too_many_attempts: 'Demasiados intentos fallidos. Inicie sesión de nuevo.',
      invalid_code: 'Código incorrecto. Verifique el correo e intente de nuevo.',
      no_code: 'No hay código activo. Inicie sesión de nuevo.',
    };

    await loginLogs.safeLog(() =>
      loginLogs.insert2faRecord({
        action: OTP_FAIL_REASONS[result.reason] || 'Verificación OTP fallida',
        userId: user.id,
        agencyCode: user.agency_code,
        email: user.email,
        registroId,
      }),
    );

    if (registroId && (result.reason === 'expired' || result.reason === 'too_many_attempts')) {
      await loginLogs.safeLog(() =>
        loginLogs.updateLoginStatus(registroId, 'Fallido', OTP_FAIL_REASONS[result.reason]),
      );
    }

    throw new HttpError(401, messages[result.reason] || 'Código inválido.');
  }

  await loginLogs.safeLog(async () => {
    if (registroId) {
      await loginLogs.updateLoginStatus(
        registroId,
        'Exitoso',
        'Autenticación de dos factores completada',
      );
      await loginLogs.insert2faRecord({
        action: 'Verificación OTP exitosa',
        userId: user.id,
        agencyCode: user.agency_code,
        email: user.email,
        registroId,
      });
      return;
    }

    await loginLogs.insertLoginRecord({
      action: 'Inicio de sesión',
      description: 'Autenticación 2FA completada',
      userId: user.id,
      agencyCode: user.agency_code,
      roleId: user.role_id,
      status: 'Exitoso',
    });
  });

  const payload = {
    sub: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    role_name: user.role_name,
    agency_id: user.agency_id,
    agency_code: user.agency_code,
    auth_source: 'local',
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  res.json({
    token,
    mustChangePassword: !!user.must_change_password,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      role_id: user.role_id,
      agency: user.agency_code,
      agencyName: user.agency_name || null,
      authSource: 'local',
    },
  });
});

exports.me = asyncHandler(async (req, res) => {
  res.json(await authService.getProfile(req.user));
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const result = await authService.changePassword(req.user, currentPassword, newPassword);
  res.json(result);
});

exports.ldapHealth = asyncHandler(async (req, res) => {
  if (!ldapConfig.enabled) {
    return res.json({ enabled: false, ok: false, error: 'LDAP deshabilitado' });
  }
  const result = await ldapService.isAvailable();
  res.json({ enabled: true, ...result });
});
