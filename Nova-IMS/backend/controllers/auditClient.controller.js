
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
    const formatoSufijoAccion = formato ? ` (${formato.toUpperCase()})` : '';
    const formatoSufijoDetalle = formato ? ` en formato ${formato.toUpperCase()}` : '';
    return {
      categoria: 'consulta',
      modulo: 'Reportes',
      tabla: null,
      accion: `Descargó reporte${formatoSufijoAccion}`,
      detalle: `Descargó el ${nombre}${formatoSufijoDetalle}`,
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
