/** Mapeos entre contrato API del frontend y catálogos de gestionincidentes */

const STATUS_TO_GI = {
  Nuevo: "Abierto",
  Asignado: "Asignado",
  "En camino": "En proceso",
  "En situación": "En proceso",
  Resuelto: "Cerrado",
  Cerrado: "Cerrado",
  "Cerrado con solución": "Cerrado",
  Cancelado: "Cancelado",
  Abierto: "Abierto",
  "En espera": "En espera",
  "En proceso": "En proceso",
  "En gestión OSGE": "En gestión OSGE",
  "Enviado a CERREM": "Enviado a CERREM",
  "En evaluación CERREM": "En evaluación CERREM",
  "Aprobado con medidas": "Aprobado con medidas",
  "Medidas asignadas": "Medidas asignadas",
  "Seguimiento activo": "Seguimiento activo",
  "Resuelto con medidas": "Resuelto con medidas",
  "Cerrado sin medidas": "Cerrado sin medidas",
};

const STATUS_FROM_GI = {
  Abierto: "Nuevo",
  "En espera": "Nuevo",
  Asignado: "Asignado",
  "En proceso": "En camino",
  Cerrado: "Cerrado",
  Cancelado: "Cancelado",
  "En gestión OSGE": "En gestión OSGE",
  "Enviado a CERREM": "Enviado a CERREM",
  "En evaluación CERREM": "En evaluación CERREM",
  "Aprobado con medidas": "Aprobado con medidas",
  "Medidas asignadas": "Medidas asignadas",
  "Seguimiento activo": "Seguimiento activo",
  "Resuelto con medidas": "Resuelto con medidas",
  "Cerrado sin medidas": "Cerrado sin medidas",
};

const PRIORITY_TO_GI = {
  Baja: "Baja",
  Media: "Media",
  Alta: "Alta",
  Crítica: "Alta",
};

const PRIORITY_FROM_GI = {
  Baja: "Baja",
  Media: "Media",
  Alta: "Alta",
};

const PERSON_ROLE_TO_GI = {
  Víctima: "Victima",
  Victimario: "Victimario",
  Testigo: "Testigo",
};

const appConfig = require("../../config/app");

function normalizeAgencyCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function resolveLegacyAgencyCode(code) {
  const normalized = normalizeAgencyCode(code);
  return appConfig.legacyAgencyAliases[normalized] || normalized;
}

function mapStatusToGi(status) {
  return STATUS_TO_GI[status] || status || "Abierto";
}

function mapStatusFromGi(name) {
  return STATUS_FROM_GI[name] || name || "Nuevo";
}

function mapPriorityToGi(priority) {
  return PRIORITY_TO_GI[priority] || priority || "Media";
}

function mapPriorityFromGi(name) {
  return PRIORITY_FROM_GI[name] || name || "Media";
}

function fullUserName(row) {
  return [
    row.Primer_Nombre,
    row.Segundo_Nombre,
    row.Primer_Apellido,
    row.Segundo_Apellido,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitFullName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return {
      primer: "Usuario",
      segundo: null,
      apellido1: "Sistema",
      apellido2: null,
    };
  }
  if (parts.length === 1) {
    return { primer: parts[0], segundo: null, apellido1: parts[0], apellido2: null };
  }
  if (parts.length === 2) {
    return { primer: parts[0], segundo: null, apellido1: parts[1], apellido2: null };
  }
  return {
    primer: parts[0],
    segundo: parts.length > 3 ? parts[1] : null,
    apellido1: parts.length > 3 ? parts[2] : parts[1],
    apellido2: parts.length > 3 ? parts.slice(3).join(" ") : parts[2] || null,
  };
}

function locationChannelToGi(channel) {
  const c = String(channel || "").toLowerCase();
  if (c === "sms") return "SMS";
  return "Whatsapp";
}

function locationChannelFromGi(channel) {
  const c = String(channel || "").toLowerCase();
  if (c === "sms") return "sms";
  return "whatsapp";
}

module.exports = {
  STATUS_TO_GI,
  STATUS_FROM_GI,
  PRIORITY_TO_GI,
  PRIORITY_FROM_GI,
  PERSON_ROLE_TO_GI,
  normalizeAgencyCode,
  resolveLegacyAgencyCode,
  mapStatusToGi,
  mapStatusFromGi,
  mapPriorityToGi,
  mapPriorityFromGi,
  fullUserName,
  splitFullName,
  locationChannelToGi,
  locationChannelFromGi,
};
