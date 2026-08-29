const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
};

const COMMON_PASSWORDS = new Set([
  'password1!',
  'password12!',
  'password1@',
  'passw0rd!',
  'admin123!',
  'welcome1!',
  'bienvenido1!',
  'contraseña1!',
  'contrasena1!',
  'qwerty123!',
  'imsnova1!',
  'nova1234!',
  'cambiar1!',
  'usuario1!',
  '12345678a!',
  'abcdefg1!',
]);

const SEQUENCES = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function hasObviousSequence(password) {
  const lower = String(password).toLowerCase();
  return SEQUENCES.some((seq) => {
    for (let i = 0; i <= seq.length - 4; i += 1) {
      const chunk = seq.slice(i, i + 4);
      const reversed = chunk.split('').reverse().join('');
      if (lower.includes(chunk) || lower.includes(reversed)) return true;
    }
    return false;
  });
}

function validatePassword(password, options = {}) {
  const errors = [];
  const currentPassword = String(options.currentPassword || '');
  const username = String(options.username || '').trim();

  if (typeof password !== 'string' || !password) {
    return { ok: false, errors: ['La contraseña es requerida.'] };
  }

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Debe tener al menos ${PASSWORD_POLICY.minLength} caracteres.`);
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`No puede superar los ${PASSWORD_POLICY.maxLength} caracteres.`);
  }

  if (!/[A-Z]/.test(password)) errors.push('Debe incluir una mayúscula.');
  if (!/[a-z]/.test(password)) errors.push('Debe incluir una minúscula.');
  if (!/\d/.test(password)) errors.push('Debe incluir un número.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Debe incluir un carácter especial.');
  if (/\s/.test(password)) errors.push('No puede contener espacios.');
  if (/(.)\1{2,}/.test(password)) errors.push('No puede repetir el mismo carácter 3 veces seguidas.');
  if (hasObviousSequence(password)) {
    errors.push('No puede incluir secuencias fáciles (1234, abcd, qwer).');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Es demasiado común. Elija una contraseña más difícil de adivinar.');
  }
  if (currentPassword && password === currentPassword) {
    errors.push('La nueva contraseña no puede ser igual a la actual.');
  }
  if (username.length >= 4 && password.toLowerCase().includes(username.toLowerCase())) {
    errors.push('No puede incluir el nombre de usuario.');
  }

  return { ok: errors.length === 0, errors };
}

module.exports = { PASSWORD_POLICY, validatePassword };
