const { pool } = require("../../config/db");
const { normalizeAgencyCode, resolveLegacyAgencyCode } = require("./maps");

let agencyCache = null;
let agencyCacheAt = 0;
const CACHE_MS = 60_000;

async function loadAgencyMap(force = false) {
  const now = Date.now();
  if (!force && agencyCache && now - agencyCacheAt < CACHE_MS) {
    return agencyCache;
  }
  const [rows] = await pool.query(
    `SELECT IDAgencias, Nombre_Agencia FROM agencias ORDER BY IDAgencias`,
  );
  const byCode = {};
  const list = rows.map((r, idx) => {
    const code = normalizeAgencyCode(r.IDAgencias);
    const item = { id: idx + 1, code, name: r.Nombre_Agencia };
    byCode[code] = item;
    return item;
  });
  agencyCache = { list, byCode };
  agencyCacheAt = now;
  return agencyCache;
}

async function listAgencies() {
  const { list } = await loadAgencyMap();
  return list;
}

async function resolveAgency(code) {
  const { byCode, list } = await loadAgencyMap();
  const resolved = resolveLegacyAgencyCode(code);
  if (byCode[resolved]) return byCode[resolved];
  // Coincidencia flexible (csj → CSJ)
  const found = list.find((a) => a.code.toUpperCase() === resolved);
  return found || null;
}

async function resolveAgencyCodeById(id) {
  const { list } = await loadAgencyMap();
  const n = Number(id);
  return list.find((a) => a.id === n)?.code || null;
}

module.exports = {
  loadAgencyMap,
  listAgencies,
  resolveAgency,
  resolveAgencyCodeById,
};
