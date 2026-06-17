const express = require('express');
const router = express.Router();

const { pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { getAllowedNextStates } = require('../db/gestionincidentes/transitions');
const { mapStatusToGi } = require('../db/gestionincidentes/maps');

const authCtrl = require('../controllers/auth.controller');
const incCtrl = require('../controllers/incident.controller');
const peopleCtrl = require('../controllers/people.controller');
const opCtrl = require('../controllers/operator.controller');
const typeCtrl = require('../controllers/incidentType.controller');
const protoCtrl = require('../controllers/protocol.controller');
const notifCtrl = require('../controllers/notification.controller');
const roleCtrl = require('../controllers/role.controller');
const logCtrl = require('../controllers/log.controller');
const locCtrl = require('../controllers/locationRequest.controller');
const catCtrl = require('../controllers/catalog.controller');
const reportsCtrl = require('../controllers/reports.controller');
const configCtrl = require('../controllers/config.controller');
const medidas = require('../db/gestionincidentes/medidas');
const giIncidents = require('../db/gestionincidentes/incidents');
const { sessionDisplayName } = require('../utils/jwtUser');

async function writeIncidentAudit(incidentId, user, { action, changes, details }) {
  if (!details?.length) return;
  await giIncidents.writeAudit(pool, {
    incidentId,
    user,
    action,
    changes,
    details,
    actorDisplayName: sessionDisplayName(user, 'Sistema'),
  });
}

// ---------- Público ----------
router.get('/config/public', configCtrl.publicConfig);
router.post('/auth/login', authCtrl.login);
router.post('/auth/verify-otp', authCtrl.verifyOtp);
router.get('/auth/ldap-health', authCtrl.ldapHealth);
router.get('/agencies', catCtrl.agencies);
router.get('/roles/list', catCtrl.rolesSimple);
router.get('/departments', catCtrl.departments);
router.get('/municipalities', catCtrl.municipalities);
router.get('/place-roles', catCtrl.placeRoles);
router.get('/origins', catCtrl.origins);
router.get('/incident-statuses', catCtrl.incidentStatuses);
router.get('/incident-statuses/allowed', authRequired, async (req, res, next) => {
  try {
    const { currentStatus } = req.query;
    const allowedNames = getAllowedNextStates(currentStatus);

    if (!allowedNames.length) {
      return res.json([]);
    }

    const giNames = allowedNames.map((name) => mapStatusToGi(name));
    const agency = req.user?.agency_code || req.query.agency;
    if (!agency) {
      return res.status(400).json({ error: { message: 'Agency requerida' } });
    }

    const placeholders = giNames.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT ID_estado AS id, Nombre_estado AS name
       FROM estadosincidentes
       WHERE Nombre_estado IN (${placeholders})
         AND UPPER(ID_Agencia) = UPPER(?)
       ORDER BY ID_estado`,
      [...giNames, agency],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// A partir de aquí, requiere JWT
router.use(authRequired);

// ---------- Auth ----------
router.get('/auth/me', authCtrl.me);
router.post('/auth/change-password', authCtrl.changePassword);

// ---------- Incidentes ----------
router.get('/incidents', incCtrl.list);
router.get('/incidents/dashboard-metrics', incCtrl.dashboardMetrics);
router.get('/incidents/vehicle-lookup/:plate', incCtrl.lookupVehicleByPlate);
router.get('/incidents/:id', incCtrl.getOne);
router.post('/incidents/:id/send-email', incCtrl.sendEmail);
router.post('/incidents', incCtrl.create);
router.put('/incidents/:id', incCtrl.update);
router.delete('/incidents/:id', incCtrl.remove);

// ---------- Personas ----------
router.get('/people', peopleCtrl.list);
router.post('/people', peopleCtrl.create);
router.put('/people/:id', peopleCtrl.update);
router.patch('/people/:id/status', peopleCtrl.setStatus);
router.get('/person-roles', peopleCtrl.personRoles);
router.get('/genders', peopleCtrl.genders);
router.get('/document-types', peopleCtrl.documentTypes);

// Lookup por teléfono
router.get('/telephony/lookup/:phone', peopleCtrl.lookupByPhone);
router.get('/people/lookup/document/:documentId', peopleCtrl.lookupByDocument);

// ---------- Operadores / Usuarios ----------
router.get('/operators', opCtrl.list);
router.post('/operators', opCtrl.create);
router.put('/operators/:id', opCtrl.update);
router.delete('/operators/:id', opCtrl.remove);

// ---------- Tipos de Incidente ----------
router.get('/incident-types', typeCtrl.list);
router.post('/incident-types', typeCtrl.create);
router.put('/incident-types/:id', typeCtrl.update);
router.delete('/incident-types/:id', typeCtrl.remove);

// ---------- Protocolos ----------
router.get('/response-protocols', protoCtrl.list);
router.post('/response-protocols', protoCtrl.create);
router.put('/response-protocols/:id', protoCtrl.update);
router.delete('/response-protocols/:id', protoCtrl.remove);

// ---------- Emails de notificación ----------
router.get('/notification-emails', notifCtrl.list);
router.post('/notification-emails', notifCtrl.add);
router.patch('/notification-emails/:email/status', notifCtrl.setStatus);

// ---------- Roles / Permisos ----------
router.get('/roles', roleCtrl.list);
router.post('/roles', roleCtrl.create);
router.put('/roles/:id', roleCtrl.update);
router.delete('/roles/:id', roleCtrl.remove);

// ---------- Logs ----------
router.get('/admin-logs', logCtrl.adminLogs);
router.get('/audit-logs', logCtrl.auditLogs);
router.get('/reports/summary', reportsCtrl.summary);

// ---------- Location Requests ----------
router.get('/location-requests', locCtrl.list);
router.post('/location-requests', locCtrl.create);
router.post('/location-requests/:id/received', locCtrl.receive);

router.get('/catalog/riesgos', async (req, res, next) => {
  try {
    const agency = req.user?.agency_code || req.user?.agency;
    const [rows] = await pool.query(
      `SELECT ID_riesgo AS id, Nombre_riesgo AS nombre, Descripcion AS descripcion
       FROM riesgos WHERE ID_Agencia = ? ORDER BY ID_riesgo`,
      [agency],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ---------- Medidas de seguridad ----------
router.get('/medidas/tipos', async (req, res, next) => {
  try {
    const agency = req.user?.agency_code || req.user?.agency;
    const rows = await medidas.getTiposMedida(agency);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/incidents/:id/medidas', async (req, res, next) => {
  try {
    const solicitud = await medidas.getSolicitudFromPersonas(req.params.id);
    const gestion = await medidas.getGestionByIncidente(req.params.id);
    if (!gestion) {
      return res.json({ gestion: null, medidas: [], solicitud });
    }
    const lista = await medidas.getMedidasByGestion(gestion.ID_gestion);
    res.json({ gestion, medidas: lista, solicitud });
  } catch (err) {
    next(err);
  }
});

router.post('/incidents/:id/gestion', async (req, res, next) => {
  try {
    const visibleId = req.params.id;
    const beforeGestion = await medidas.getGestionByIncidente(visibleId);
    const idGestion = await medidas.upsertGestion(visibleId, req.body, req.user);
    const gestion = await medidas.getGestionByIncidente(visibleId);
    const auditDetails = medidas.buildGestionAuditDetails(beforeGestion, gestion);
    await writeIncidentAudit(visibleId, req.user, {
      action: 'Actualización gestión OSEG/CERREM',
      changes: `${auditDetails.length} campo(s) en gestión`,
      details: auditDetails,
    });
    res.json({
      ok: true,
      ID_gestion: idGestion,
      codigo_oficio: gestion?.codigo_oficio ?? null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/incidents/:id/medidas', async (req, res, next) => {
  try {
    const visibleId = req.params.id;
    let gestion = await medidas.getGestionByIncidente(visibleId);
    if (!gestion) {
      await medidas.upsertGestion(visibleId, {}, req.user);
      gestion = await medidas.getGestionByIncidente(visibleId);
    }
    if (!gestion) {
      return res.status(404).json({
        error: { message: 'No se pudo registrar la gestión del incidente.' },
      });
    }
    const lista = Array.isArray(req.body.medidas) ? req.body.medidas : [];
    if (!lista.length) {
      return res.status(400).json({
        error: { message: 'Seleccione al menos una medida de seguridad.' },
      });
    }
    const beforeMedidas = await medidas.getMedidasByGestion(gestion.ID_gestion);
    await medidas.asignarMedidas(gestion.ID_gestion, lista, req.user);
    const afterMedidas = await medidas.getMedidasByGestion(gestion.ID_gestion);
    const auditDetails = medidas.buildMedidasAuditDetails(beforeMedidas, afterMedidas);
    await writeIncidentAudit(visibleId, req.user, {
      action: 'Medidas de seguridad',
      changes: `${auditDetails.length} cambio(s) en medidas`,
      details: auditDetails,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
