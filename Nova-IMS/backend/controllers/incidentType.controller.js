const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { nextId } = require('../utils/ids');
const { requireSessionAgency } = require('../utils/requestAgency');
const giIncidentTypes = require('../db/gestionincidentes/incidentTypes');

const map = (r) => ({
  id: r.id,
  name: r.name,
  defaultPriority: r.default_priority || r.defaultPriority,
  description: r.description || '',
});

exports.list = asyncHandler(async (req, res) => {
  const agency = requireSessionAgency(req);
  res.json((await giIncidentTypes.listIncidentTypes(agency)).map(map));
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name) throw new HttpError(400, 'name requerido');
  const id = await nextId('eventos', 'ID_evento', 'IT', 2);
  const agency = requireSessionAgency(req);
  const created = await giIncidentTypes.createIncidentType(
    id,
    b.name,
    b.defaultPriority,
    b.description,
    agency,
  );
  res.status(201).json(map(created));
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  if (!(await giIncidentTypes.incidentTypeExists(id))) {
    throw new HttpError(404, 'Tipo de incidente no encontrado');
  }
  const updated = await giIncidentTypes.updateIncidentType(id, {
    name: b.name,
    defaultPriority: b.defaultPriority,
    description: b.description,
  });
  res.json(map(updated));
});

exports.remove = asyncHandler(async (req, res) => {
  const affected = await giIncidentTypes.deleteIncidentType(req.params.id);
  if (!affected) throw new HttpError(404, 'Tipo no encontrado');
  res.status(204).send();
});
