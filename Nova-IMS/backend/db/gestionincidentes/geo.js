const { pool } = require("../../config/db");
const { normalizeAgencyCode } = require("./maps");

const { requireAgencyInput } = require("./agencyContext");

async function listDepartments(agencyCode) {
  const agency = requireAgencyInput(agencyCode);
  const [rows] = await pool.query(
    `SELECT id_departamento AS id, codigo_departamento AS daneCode, nombre_departamento AS name
     FROM departamentos
     WHERE UPPER(IDAgencias) = ?
     ORDER BY nombre_departamento`,
    [normalizeAgencyCode(agency)],
  );
  return rows;
}

async function listMunicipalities(departmentId, agencyCode) {
  const agency = requireAgencyInput(agencyCode);
  const [dept] = await pool.query(
    `SELECT codigo_departamento FROM departamentos WHERE id_departamento = ? LIMIT 1`,
    [departmentId],
  );
  if (!dept.length) return [];
  const [rows] = await pool.query(
    `SELECT id_municipio AS id,
            codigo_municipio AS daneCode,
            nombre_municipio AS name
     FROM municipios
     WHERE codigo_departamento = ? AND UPPER(IDAgencias) = ?
     ORDER BY nombre_municipio`,
    [dept[0].codigo_departamento, normalizeAgencyCode(agency)],
  );
  return rows.map((r) => ({ ...r, departmentId: Number(departmentId) }));
}

async function getDepartmentName(id) {
  if (!id) return "";
  const [rows] = await pool.query(
    `SELECT nombre_departamento AS name FROM departamentos WHERE id_departamento = ? LIMIT 1`,
    [id],
  );
  return rows[0]?.name || "";
}

async function getMunicipalityName(id) {
  if (!id) return "";
  const [rows] = await pool.query(
    `SELECT nombre_municipio AS name FROM municipios WHERE id_municipio = ? LIMIT 1`,
    [id],
  );
  return rows[0]?.name || "";
}

module.exports = {
  listDepartments,
  listMunicipalities,
  getDepartmentName,
  getMunicipalityName,
};
