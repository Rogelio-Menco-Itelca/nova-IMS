function isValidEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase();
  if (!email) return false;
  if (!email.includes('@')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

module.exports = { isValidEmail, normalizeEmail };
