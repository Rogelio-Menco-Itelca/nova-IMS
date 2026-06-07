const asyncHandler = require('../utils/asyncHandler');
const { requireAgencyCode } = require('../utils/requestAgency');
const giAgencies = require('../db/gestionincidentes/agencies');
const giGeo = require('../db/gestionincidentes/geo');
const giRoles = require('../db/gestionincidentes/roles');
const giIncidentCatalog = require('../db/gestionincidentes/incidentCatalog');

exports.agencies = asyncHandler(async (req, res) => {
  res.json(await giAgencies.listAgencies());
});

exports.rolesSimple = asyncHandler(async (req, res) => {
  const agency = requireAgencyCode(req, 'Query agency es requerido (código IDAgencias)');
  res.json(await giRoles.listRolesSimple(agency));
});

exports.departments = asyncHandler(async (req, res) => {
  const agency = requireAgencyCode(req, 'Query agency es requerido (código IDAgencias)');
  res.json(await giGeo.listDepartments(agency));
});

exports.municipalities = asyncHandler(async (req, res) => {
  const departmentId = Number(req.query.departmentId);
  if (!Number.isFinite(departmentId) || departmentId <= 0) {
    return res.status(400).json({
      error: { message: 'Query departmentId es requerido (número)' },
    });
  }
  const agency = requireAgencyCode(req, 'Query agency es requerido (código IDAgencias)');
  res.json(await giGeo.listMunicipalities(departmentId, agency));
});

exports.placeRoles = asyncHandler(async (req, res) => {
  const agency = requireAgencyCode(req, 'Query agency es requerido');
  const giPlaces = require('../db/gestionincidentes/places');
  res.json(await giPlaces.listPlaceRoles(agency));
});

exports.origins = asyncHandler(async (req, res) => {
  const agency = requireAgencyCode(req, 'Query agency es requerido');
  res.json(await giIncidentCatalog.listOrigins(agency));
});

exports.incidentStatuses = asyncHandler(async (req, res) => {
  const agency = requireAgencyCode(req, 'Query agency es requerido');
  res.json(await giIncidentCatalog.listIncidentStatuses(agency));
});