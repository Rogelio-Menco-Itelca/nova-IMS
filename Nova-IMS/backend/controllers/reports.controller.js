const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const giReports = require('../db/gestionincidentes/reports');

exports.summary = asyncHandler(async (req, res) => {
  const { from, to, status, type, priority, operator } = req.query;
  res.json(await giReports.summary({ from, to, status, type, priority, operator }));
});
