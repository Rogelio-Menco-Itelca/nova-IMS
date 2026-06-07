const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { nextId } = require('../utils/ids');
const { requireSessionAgency } = require('../utils/requestAgency');
const giProtocols = require('../db/gestionincidentes/protocols');

exports.list = asyncHandler(async (req, res) => {
  res.json(await giProtocols.listProtocols());
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.incidentTypeName || !Array.isArray(b.steps)) {
    throw new HttpError(400, 'name, incidentTypeName y steps[] son requeridos');
  }
  const agency = requireSessionAgency(req);
  const id = await giProtocols.createProtocol({
    name: b.name,
    incidentTypeName: b.incidentTypeName,
    steps: b.steps,
    agencyCode: agency,
  });
  const all = await giProtocols.listProtocols();
  const out = all.find((p) => p.id === id);
  res.status(201).json(out);
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  if (!(await giProtocols.protocolExists(id))) {
    throw new HttpError(404, 'Protocolo no encontrado');
  }
  const agency = requireSessionAgency(req);
  await giProtocols.updateProtocol(id, {
    name: b.name,
    incidentTypeName: b.incidentTypeName,
    steps: b.steps,
    agencyCode: agency,
  });
  const all = await giProtocols.listProtocols();
  const out = all.find((p) => p.id === id);
  res.json(out);
});

exports.remove = asyncHandler(async (req, res) => {
  const affected = await giProtocols.deleteProtocol(req.params.id);
  if (!affected) throw new HttpError(404, 'Protocolo no encontrado');
  res.status(204).send();
});
