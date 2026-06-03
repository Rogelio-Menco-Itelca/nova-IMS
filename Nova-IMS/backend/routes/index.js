const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');

const authCtrl    = require('../controllers/auth.controller');
const incCtrl     = require('../controllers/incident.controller');
const peopleCtrl  = require('../controllers/people.controller');
const opCtrl      = require('../controllers/operator.controller');
const typeCtrl    = require('../controllers/incidentType.controller');
const protoCtrl   = require('../controllers/protocol.controller');
const notifCtrl   = require('../controllers/notification.controller');
const roleCtrl    = require('../controllers/role.controller');
const logCtrl     = require('../controllers/log.controller');
const locCtrl     = require('../controllers/locationRequest.controller');
const catCtrl     = require('../controllers/catalog.controller');
const reportsCtrl = require('../controllers/reports.controller');

// ---------- Público ----------
router.post('/auth/login',           authCtrl.login);
router.post('/auth/verify-otp',      authCtrl.verifyOtp);
router.get ('/auth/ldap-health',     authCtrl.ldapHealth);
router.get ('/agencies',             catCtrl.agencies);
router.get ('/roles/list',           catCtrl.rolesSimple);
router.get ('/departments',          catCtrl.departments);
router.get ('/municipalities',       catCtrl.municipalities);

// A partir de aquí, requiere JWT
router.use(authRequired);

// ---------- Auth ----------
router.get('/auth/me', authCtrl.me);
router.post('/auth/change-password', authCtrl.changePassword);

// ---------- Incidentes ----------
router.get   ('/incidents',      incCtrl.list);
router.get   ('/incidents/vehicle-lookup/:plate', incCtrl.lookupVehicleByPlate);
router.get   ('/incidents/:id',  incCtrl.getOne);
router.post  ('/incidents/:id/send-email', incCtrl.sendEmail);
router.post  ('/incidents',      incCtrl.create);
router.put   ('/incidents/:id',  incCtrl.update);
router.delete('/incidents/:id',  incCtrl.remove);

// ---------- Personas ----------
router.get   ('/people',         peopleCtrl.list);
router.post  ('/people',         peopleCtrl.create);
router.put   ('/people/:id',     peopleCtrl.update);
router.delete('/people/:id',     peopleCtrl.remove);

// Lookup por teléfono
router.get('/telephony/lookup/:phone', peopleCtrl.lookupByPhone);

// ---------- Operadores / Usuarios ----------
router.get   ('/operators',      opCtrl.list);
router.post  ('/operators',      opCtrl.create);
router.put   ('/operators/:id',  opCtrl.update);
router.delete('/operators/:id',  opCtrl.remove);

// ---------- Tipos de Incidente ----------
router.get   ('/incident-types',     typeCtrl.list);
router.post  ('/incident-types',     typeCtrl.create);
router.put   ('/incident-types/:id', typeCtrl.update);
router.delete('/incident-types/:id', typeCtrl.remove);

// ---------- Protocolos ----------
router.get   ('/response-protocols',     protoCtrl.list);
router.post  ('/response-protocols',     protoCtrl.create);
router.put   ('/response-protocols/:id', protoCtrl.update);
router.delete('/response-protocols/:id', protoCtrl.remove);

// ---------- Emails de notificación ----------
router.get   ('/notification-emails',        notifCtrl.list);
router.post  ('/notification-emails',        notifCtrl.add);
router.delete('/notification-emails/:email', notifCtrl.remove);

// ---------- Roles / Permisos ----------
router.get   ('/roles',      roleCtrl.list);
router.post  ('/roles',      roleCtrl.create);
router.put   ('/roles/:id',  roleCtrl.update);
router.delete('/roles/:id',  roleCtrl.remove);

// ---------- Logs ----------
router.get('/admin-logs', logCtrl.adminLogs);
router.get('/audit-logs', logCtrl.auditLogs);
router.get('/reports/summary',       reportsCtrl.summary);

// ---------- Location Requests ----------
router.get ('/location-requests',              locCtrl.list);
router.post('/location-requests',              locCtrl.create);
router.post('/location-requests/:id/received', locCtrl.receive);

module.exports = router;
