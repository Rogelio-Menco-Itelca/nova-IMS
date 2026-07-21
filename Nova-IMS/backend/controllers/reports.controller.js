const asyncHandler = require('../utils/asyncHandler');
const { requireSessionAgency } = require('../utils/requestAgency');
const giReports = require('../db/gestionincidentes/reports');

exports.summary = asyncHandler(async (req, res) => {
  const agencyCode = requireSessionAgency(req);
  const { from, to, status, type, priority, operator } = req.query;
  res.json(
    await giReports.summary({ from, to, status, type, priority, operator, agencyCode }),
  );
});
