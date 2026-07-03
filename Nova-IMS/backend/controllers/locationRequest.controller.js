const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const socket = require('../realtime/socket');
const giLocation = require('../db/gestionincidentes/location');
const { buildLocationShareUrlAsync, publicUrlSetupHint } = require('../utils/publicUrl');
const { recordAudit } = require('../utils/auditTrail');

exports.create = asyncHandler(async (req, res) => {
  const { phone, channel, incident_id } = req.body || {};
  if (!phone || !['whatsapp', 'sms'].includes(channel)) {
    throw new HttpError(400, 'phone y channel (whatsapp|sms) son requeridos');
  }
  const clean = String(phone).replace(/\D/g, '');
  const requestId = Date.now();
  const requestUrl = await buildLocationShareUrlAsync(requestId);
  const publicUrlWarning = publicUrlSetupHint(requestUrl);

  const id = await giLocation.createLocationRequest({
    phone: clean,
    channel,
    incidentId: incident_id,
    user: req.user,
    requestUrl,
  });

  const canalLabel = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
  await recordAudit({
    req,
    user: req.user,
    categoria: 'incidente',
    modulo: 'Incidentes',
    tablaAfectada: 'ubicacion',
    accion: `Solicitud de ubicación rápida por ${canalLabel}`,
    resultado: 'exitoso',
    detalle: `Envió solicitud de ubicación por ${canalLabel} al ${clean}${
      incident_id ? ` (Incidente ${incident_id})` : ''
    }`,
  });

  res.status(201).json({
    id,
    requestId: String(requestId),
    phone: clean,
    channel,
    requestUrl,
    ...(publicUrlWarning ? { publicUrlWarning } : {}),
  });
});

exports.receive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new HttpError(400, 'lat/lng numéricos requeridos');
  }
  const payload = await giLocation.receiveLocation(id, lat, lng);
  if (!payload) throw new HttpError(404, 'Solicitud no encontrada');
  socket.emit('location:received', payload);
  res.json(payload);
});

exports.list = asyncHandler(async (req, res) => {
  res.json(await giLocation.listLocationRequests());
});
