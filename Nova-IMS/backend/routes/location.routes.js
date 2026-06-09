const express = require('express');
const router = express.Router();
const path = require('path');
const socket = require('../realtime/socket');
const giLocation = require('../db/gestionincidentes/location');
const { reverseGeocode } = require('../services/geocode.service');
const logger = require('../utils/logger');

router.get('/share', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/location-share.html'));
});

router.post('/submit', async (req, res) => {
  const { request_id, lat, lng } = req.body || {};

  if (!request_id || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'request_id, lat y lng son requeridos' });
  }

  try {
    const address = await reverseGeocode(lat, lng);
    await giLocation.updateLocationByRequestUrl(String(request_id), lat, lng, address);

    const row = await giLocation.findByRequestUrlPattern(String(request_id));
    const payload = {
      lat,
      lng,
      request_id: String(request_id),
      solicitudId: row?.ID_solicitud ?? null,
      phoneNumber: row?.Numero_ubicacion ?? null,
      address: address || row?.direccion || null,
      timestamp: Date.now(),
    };
    logger.debug('[LOCATION] Socket location:received', payload);
    socket.get().emit('location:received', payload);
    res.json({ ok: true, address });
  } catch (err) {
    logger.error('[LOCATION] Error:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
