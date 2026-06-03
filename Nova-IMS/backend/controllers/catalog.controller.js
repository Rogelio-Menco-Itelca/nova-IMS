const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/agencies
exports.agencies = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`SELECT id, code, name FROM agencies ORDER BY id`);
  res.json(rows);
});

// GET /api/roles/list  -> lista simple
exports.rolesSimple = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`SELECT id, name FROM roles ORDER BY id`);
  res.json(rows);
});

// GET /api/departments
exports.departments = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, dane_code AS daneCode, name
       FROM departments
      ORDER BY name`,
  );
  res.json(rows);
});

// GET /api/municipalities?departmentId=1
exports.municipalities = asyncHandler(async (req, res) => {
  const departmentId = Number(req.query.departmentId);
  if (!Number.isFinite(departmentId) || departmentId <= 0) {
    return res.status(400).json({
      error: { message: "Query departmentId es requerido (número)" },
    });
  }
  const [rows] = await pool.query(
    `SELECT id, department_id AS departmentId, dane_code AS daneCode, name
       FROM municipalities
      WHERE department_id = ?
      ORDER BY name`,
    [departmentId],
  );
  res.json(rows);
});
