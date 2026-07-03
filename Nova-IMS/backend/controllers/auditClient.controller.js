/**
 * Auditoría de acciones significativas que ocurren SOLO en el cliente y no
 * pasan por un endpoint de negocio (ver un incidente desde la lista ya cargada,
 * descargar un reporte, consultar el mapa de geolocalización).
 *
 * El frontend envía un `type` de una lista blanca cerrada; el servidor decide
 * la acción, categoría y módulo. Nunca se confía en texto libre del cliente.
 *
 * @module controllers/auditClient.controller
 */

const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { recordAudit } = require('../utils/auditTrail');

const ALLOWED_MODULES = new Set(['Dashboard', 'Incidentes', 'Reportes', 'Administración']);

function safeModule(mod, fallback) {
  return ALLOWED_MODULES.has(mod) ? mod : fallback;
}

function str(value, max = 150) {
  if (value == null) return '';
  return String(value).slice(0, max).trim();
}

/** Constructores por tipo de evento. Cada uno define cómo se audita. */
const EVENT_BUILDERS = {
  incident_view: (b) => {
    const incidentId = str(b.incidentId, 30) || '—';
    return {
      categoria: 'consulta',
      modulo: safeModule(b.module, 'Incidentes'),
      tabla: 'incidentes',
      accion: `Consultó incidente ${incidentId}`,
      detalle: `Vio la información del incidente ${incidentId}`,
    };
  },
  report_download: (b) => {
    const nombre = str(b.reportName, 120) || 'reporte';
    const formato = str(b.format, 20);
    return {
      categoria: 'consulta',
      modulo: 'Reportes',
      tabla: null,
      accion: `Descargó reporte${formato ? ` (${formato.toUpperCase()})` : ''}`,
      detalle: `Descargó el ${nombre}${formato ? ` en formato ${formato.toUpperCase()}` : ''}`,
    };
  },
  map_geolocation: (b) => {
    const incidentId = str(b.incidentId, 30);
    const modulo = safeModule(b.module, 'Dashboard');
    return {
      categoria: 'consulta',
      modulo,
      tabla: 'incidentes',
      accion: incidentId
        ? `Consultó geolocalización (Incidente ${incidentId})`
        : 'Consultó mapa de geolocalización',
      detalle: incidentId
        ? `Consultó en el mapa la ubicación del incidente ${incidentId}`
        : 'Consultó el mapa de geolocalización',
    };
  },
};

exports.clientEvent = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const type = str(body.type, 40);
  const builder = EVENT_BUILDERS[type];
  if (!builder) throw new HttpError(400, 'Tipo de evento de auditoría no soportado');

  // Evita que el middleware genérico intente auditar esta ruta técnica.
  req.skipAutoAudit = true;

  const spec = builder(body);
  await recordAudit({
    req,
    user: req.user,
    categoria: spec.categoria,
    modulo: spec.modulo,
    tablaAfectada: spec.tabla,
    accion: spec.accion,
    resultado: 'exitoso',
    detalle: spec.detalle,
  });

  res.status(202).json({ ok: true });
});
