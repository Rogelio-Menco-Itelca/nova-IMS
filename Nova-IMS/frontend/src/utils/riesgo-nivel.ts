export const RIESGO_ORDINARIO_ID = 1;
export const RIESGO_EXTRAORDINARIO_ID = 2;

export interface RiesgoGestionSnapshot {
  ID_riesgo?: number | null;
  nivel_riesgo?: string | null;
}

function normalizeRiesgoName(name: string | null | undefined): string {
  return String(name ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isRiesgoExtraordinario(
  gestion?: RiesgoGestionSnapshot | null,
): boolean {
  if (!gestion?.ID_riesgo) return false;
  const name = normalizeRiesgoName(gestion.nivel_riesgo);
  if (name.includes('EXTRAORDINARIO')) return true;
  return Number(gestion.ID_riesgo) === RIESGO_EXTRAORDINARIO_ID;
}

export function isRiesgoOrdinario(gestion?: RiesgoGestionSnapshot | null): boolean {
  if (!gestion?.ID_riesgo) return false;
  if (isRiesgoExtraordinario(gestion)) return false;
  const name = normalizeRiesgoName(gestion.nivel_riesgo);
  if (name.includes('ORDINARIO')) return true;
  return Number(gestion.ID_riesgo) === RIESGO_ORDINARIO_ID;
}

export function requiresMedidasForRiesgo(gestion?: RiesgoGestionSnapshot | null): boolean {
  return isRiesgoExtraordinario(gestion);
}
