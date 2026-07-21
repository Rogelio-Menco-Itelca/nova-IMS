const RIESGO_ORDINARIO_ID = 1;
const RIESGO_EXTRAORDINARIO_ID = 2;

function normalizeRiesgoName(name) {
  return String(name || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isRiesgoExtraordinario(gestion) {
  if (!gestion?.ID_riesgo) return false;
  const name = normalizeRiesgoName(gestion.nivel_riesgo);
  if (name.includes('EXTRAORDINARIO')) return true;
  return Number(gestion.ID_riesgo) === RIESGO_EXTRAORDINARIO_ID;
}

function isRiesgoOrdinario(gestion) {
  if (!gestion?.ID_riesgo) return false;
  if (isRiesgoExtraordinario(gestion)) return false;
  const name = normalizeRiesgoName(gestion.nivel_riesgo);
  if (name.includes('ORDINARIO')) return true;
  return Number(gestion.ID_riesgo) === RIESGO_ORDINARIO_ID;
}

function requiresMedidasForGestion(gestion) {
  return isRiesgoExtraordinario(gestion);
}

module.exports = {
  RIESGO_ORDINARIO_ID,
  RIESGO_EXTRAORDINARIO_ID,
  isRiesgoExtraordinario,
  isRiesgoOrdinario,
  requiresMedidasForGestion,
};
