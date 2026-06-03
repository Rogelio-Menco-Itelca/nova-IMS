const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
};

function validatePassword(password) {
  const errors = [];

  if (typeof password !== 'string') {
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

  return { ok: errors.length === 0, errors };
}

module.exports = { validatePassword };