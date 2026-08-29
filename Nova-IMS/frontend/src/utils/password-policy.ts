const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

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

export interface PasswordContext {
  currentPassword?: string;
  username?: string;
}

export interface PasswordHint {
  id: string;
  label: string;
  ok: boolean;
}

function hasObviousSequence(password: string): boolean {
  const lower = password.toLowerCase();
  return SEQUENCES.some((seq) => {
    for (let i = 0; i <= seq.length - 4; i += 1) {
      const chunk = seq.slice(i, i + 4);
      const reversed = chunk.split('').reverse().join('');
      if (lower.includes(chunk) || lower.includes(reversed)) return true;
    }
    return false;
  });
}

export function validateNewPassword(password: string, context: PasswordContext = {}): string | null {
  if (!password) return 'Ingrese la nueva contraseña.';

  const missing: string[] = [];
  if (password.length < MIN_LENGTH) missing.push(`mínimo ${MIN_LENGTH} caracteres`);
  if (password.length > MAX_LENGTH) missing.push(`máximo ${MAX_LENGTH} caracteres`);
  if (!/[A-Z]/.test(password)) missing.push('una mayúscula (A-Z)');
  if (!/[a-z]/.test(password)) missing.push('una minúscula (a-z)');
  if (!/\d/.test(password)) missing.push('un número (0-9)');
  if (!/[^A-Za-z0-9]/.test(password)) missing.push('un símbolo (#, @, !, etc.)');
  if (/\s/.test(password)) missing.push('sin espacios');
  if (/(.)\1{2,}/.test(password)) missing.push('sin el mismo carácter 3 veces seguidas');
  if (hasObviousSequence(password)) missing.push('sin secuencias fáciles (1234, abcd, qwer)');
  if (COMMON_PASSWORDS.has(password.toLowerCase())) missing.push('que no sea una clave común');
  if (context.currentPassword && password === context.currentPassword) {
    missing.push('que sea distinta a la actual');
  }
  const username = String(context.username || '').trim();
  if (username.length >= 4 && password.toLowerCase().includes(username.toLowerCase())) {
    missing.push('que no incluya el usuario');
  }

  if (!missing.length) return null;
  return `La nueva contraseña no es válida. Falta: ${missing.join(', ')}.`;
}

export function passwordHints(password: string, context: PasswordContext = {}): PasswordHint[] {
  const value = password || '';
  const username = String(context.username || '').trim();
  const hints: PasswordHint[] = [
    {
      id: 'length',
      label: `Entre ${MIN_LENGTH} y ${MAX_LENGTH} caracteres`,
      ok: value.length >= MIN_LENGTH && value.length <= MAX_LENGTH,
    },
    { id: 'upper', label: 'Una mayúscula y una minúscula', ok: /[A-Z]/.test(value) && /[a-z]/.test(value) },
    { id: 'numsym', label: 'Un número y un símbolo', ok: /\d/.test(value) && /[^A-Za-z0-9]/.test(value) },
    { id: 'spaces', label: 'Sin espacios ni repeticiones (aaa)', ok: !!value && !/\s/.test(value) && !/(.)\1{2,}/.test(value) },
    { id: 'seq', label: 'Sin secuencias fáciles (1234, abcd)', ok: !!value && !hasObviousSequence(value) },
  ];

  if (context.currentPassword) {
    hints.push({
      id: 'diff',
      label: 'Distinta a la contraseña actual',
      ok: !!value && value !== context.currentPassword,
    });
  }

  if (username.length >= 4) {
    hints.push({
      id: 'user',
      label: 'No incluir el nombre de usuario',
      ok: !!value && !value.toLowerCase().includes(username.toLowerCase()),
    });
  }

  return hints;
}
