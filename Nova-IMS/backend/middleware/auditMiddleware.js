/**
 * Middleware de auditoría automática (enfoque LISTA BLANCA).
 *
 * Solo registra en `auditoria_general` las mutaciones que corresponden a
 * ACCIONES REALES del usuario definidas explícitamente en ALLOWLIST. Cualquier
 * otra petición (borradores internos, contadores, sub-recursos técnicos, etc.)
 * NO se audita, evitando registros falsos o mal etiquetados.
 *
 * Las acciones "ricas" (incidentes, roles, personas, operadores, sesión) se
 * auditan de forma explícita en sus controladores y marcan
 * `req.skipAutoAudit = true`, por lo que este middleware las ignora.
 *
 * @module middleware/auditMiddleware
 */

const { recordAudit } = require('../utils/auditTrail');

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const IGNORED_BODY_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'code',
  'otp',
]);

/** Lista legible de los campos enviados (sin valores ni claves sensibles). */
function describeBodyFields(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const keys = Object.keys(body).filter((k) => !IGNORED_BODY_KEYS.has(k));
  if (!keys.length) return null;
  return keys.join(', ');
}

function entityId(req) {
  const p = req.params || {};
  return p.id || p.userId || p.email || null;
}

/** Detalle genérico "Se creó/actualizó <recurso> (<id>) — campos: ...". */
function genericDetalle(verbo, recurso, req, withFields) {
  const id = entityId(req);
  let detalle = `${verbo} ${recurso.toLowerCase()}${id ? ` (${id})` : ''}`;
  if (withFields) {
    const fields = describeBodyFields(req.body);
    if (fields) detalle += ` — campos: ${fields}`;
  }
  return detalle;
}

/**
 * Reglas de acciones reales que este middleware SÍ audita.
 * Cada regla: método(s), patrón de ruta (relativa a /api), y cómo describirla.
 * El resto de rutas NO se audita aquí.
 */
const ALLOWLIST = [
  // Tipos de incidente
  {
    methods: ['POST'],
    test: /^\/incident-types\/?$/,
    modulo: 'Administración',
    tabla: 'eventos',
    categoria: 'configuracion',
    accion: 'Creación de tipo de incidente',
    detalle: (req) => genericDetalle('Se creó', 'tipo de incidente', req, true),
  },
  {
    methods: ['PUT', 'PATCH'],
    test: /^\/incident-types\/[^/]+\/?$/,
    modulo: 'Administración',
    tabla: 'eventos',
    categoria: 'configuracion',
    accion: 'Actualización de tipo de incidente',
    detalle: (req) => genericDetalle('Se actualizó', 'tipo de incidente', req, true),
  },
  // Protocolos de respuesta
  {
    methods: ['POST'],
    test: /^\/response-protocols\/?$/,
    modulo: 'Administración',
    tabla: 'protocolos',
    categoria: 'configuracion',
    accion: 'Creación de protocolo de respuesta',
    detalle: (req) => genericDetalle('Se creó', 'protocolo de respuesta', req, true),
  },
  {
    methods: ['PUT', 'PATCH'],
    test: /^\/response-protocols\/[^/]+\/?$/,
    modulo: 'Administración',
    tabla: 'protocolos',
    categoria: 'configuracion',
    accion: 'Actualización de protocolo de respuesta',
    detalle: (req) => genericDetalle('Se actualizó', 'protocolo de respuesta', req, true),
  },
  // Correos autorizados de notificación
  {
    methods: ['POST'],
    test: /^\/notification-emails\/?$/,
    modulo: 'Administración',
    tabla: 'correosincidentes',
    categoria: 'configuracion',
    accion: 'Creación de correo autorizado',
    detalle: (req) => genericDetalle('Se agregó', 'correo autorizado', req, true),
  },
  {
    methods: ['PATCH', 'PUT'],
    test: /^\/notification-emails\/[^/]+\/status\/?$/,
    modulo: 'Administración',
    tabla: 'correosincidentes',
    categoria: 'configuracion',
    accion: 'Cambio de estado de correo autorizado',
    detalle: (req) => {
      const estado = req.body?.enabled === false ? 'deshabilitó' : 'habilitó';
      return `Se ${estado} el correo autorizado (${entityId(req) || '—'})`;
    },
  },
  // Solicitudes de ubicación (módulo Incidentes)
  // NOTA: la creación (POST /location-requests) se audita de forma explícita en
  // locationRequest.controller.js para capturar canal (WhatsApp/SMS) y teléfono.
  {
    methods: ['POST'],
    test: /^\/location-requests\/[^/]+\/received\/?$/,
    modulo: 'Incidentes',
    tabla: 'ubicacion',
    categoria: 'incidente',
    accion: 'Solicitud de ubicación recibida',
    detalle: (req) => `Se marcó como recibida la solicitud de ubicación (${entityId(req) || '—'})`,
  },
];

function resolveRule(method, cleanPath) {
  return (
    ALLOWLIST.find((rule) => rule.methods.includes(method) && rule.test.test(cleanPath)) || null
  );
}

function auditMiddleware(req, res, next) {
  if (!AUDITED_METHODS.has(req.method)) return next();

  // La ruta se resuelve AHORA (síncrono): req.baseUrl puede mutar si la
  // petición cae a un router montado aparte.
  const cleanPath = req.originalUrl.split('?')[0].replace(/^\/api/, '') || '/';

  res.on('finish', () => {
    try {
      if (req.skipAutoAudit) return;
      if (res.statusCode >= 400) return;
      if (!req.user) return;

      const rule = resolveRule(req.method, cleanPath);
      if (!rule) return; // Solo auditamos acciones de la lista blanca.

      recordAudit({
        req,
        user: req.user,
        categoria: rule.categoria,
        modulo: rule.modulo,
        tablaAfectada: rule.tabla,
        accion: rule.accion,
        resultado: 'exitoso',
        detalle: rule.detalle ? rule.detalle(req) : rule.accion,
      });
    } catch {
      /* nunca interrumpir la respuesta por auditoría */
    }
  });

  next();
}

module.exports = auditMiddleware;
