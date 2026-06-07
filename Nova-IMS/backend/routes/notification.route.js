const express = require('express');
const router = express.Router();
const giNotifications = require('../db/gestionincidentes/notifications');
const { resolveDbUserIdFromString } = require('../utils/jwtUser');

router.get('/', async (req, res) => {
  try {
    res.json(await giNotifications.listNotifications());
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'Error obteniendo notificaciones' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, title, message, triggeredBy, incidentId } = req.body;
    await giNotifications.createNotification({
      id,
      title,
      message,
      triggeredBy,
      incidentId,
      agencyCode: req.user?.agency_code,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error creando notificación:', error);
    res.status(500).json({ error: 'Error creando notificación' });
  }
});

router.put('/read-all', markAllAsRead);
router.patch('/mark-all-read', markAllAsRead);

async function markAllAsRead(req, res) {
  try {
    const { userId } = req.body;
    const userIdDb = await resolveDbUserIdFromString(userId);
    await giNotifications.markAllRead(userIdDb, req.user?.agency_code);
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizando notificaciones:', error);
    res.status(500).json({ error: 'Error actualizando notificaciones' });
  }
}

module.exports = router;
