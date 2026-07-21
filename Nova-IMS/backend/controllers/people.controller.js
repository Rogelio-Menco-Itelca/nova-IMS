const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { writeAdminLog } = require('../utils/adminLog');
const { requireSessionAgency, requireAgencyCode } = require('../utils/requestAgency');
const { resolveDbUserId } = require('../utils/jwtUser');
const giPeople = require('../db/gestionincidentes/people');

function mapPerson(r) {
  const name = giPeople.buildDisplayName(r);
  return {
    id: giPeople.formatPersonId(r.internal_id),
    name,
    primerNombre: r.primer_nombre || '',
    segundoNombre: r.segundo_nombre || '',
    primerApellido: r.primer_apellido || '',
    segundoApellido: r.segundo_apellido || '',
    documentType: r.tipo_documento || '',
    documentTypeName: r.document_type_name || '',
    documentId: r.numero_documento || '',
    phone: r.contacto || '',
    contacto: r.contacto || '',
    roleId: r.id_rol_p,
    roleName: r.role_name || '',
    genderId: r.id_genero ?? null,
    gender: r.gender_name || '',
    comentarios: r.comentarios || '',
    agency: r.id_agencia || '',
    status: r.estado || 'Activo',
    createdAt: r.created_at,
  };
}

exports.list = asyncHandler(async (req, res) => {
  const agencyCode = requireSessionAgency(req);
  const rows = await giPeople.listPeople(agencyCode);
  res.json(rows.map(mapPerson));
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const agencyCode = requireSessionAgency(req);
  const userId = await resolveDbUserId(req.user);
  const row = await giPeople.createPerson({
    primerNombre: b.primerNombre,
    segundoNombre: b.segundoNombre,
    primerApellido: b.primerApellido,
    segundoApellido: b.segundoApellido,
    roleId: b.roleId,
    roleName: b.roleName,
    contacto: b.contacto ?? b.phone,
    tipoDocumento: b.tipoDocumento ?? b.documentType,
    numeroDocumento: b.numeroDocumento ?? b.documentId,
    comentarios: b.comentarios ?? b.notes,
    genderId: b.genderId,
    status: b.status,
    agencyCode,
    userId,
  });
  const person = mapPerson(row);
  await writeAdminLog(
    req.user,
    'Creación de Persona',
    `Se registró a ${person.name} (${person.id})`,
    req,
    { tablaAfectada: 'personas' },
  );
  res.status(201).json(person);
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const agencyCode = requireSessionAgency(req);
  const existing = await giPeople.getPerson(id);
  if (!existing) throw new HttpError(404, 'Persona no encontrada');
  if (
    String(existing.id_agencia || '')
      .trim()
      .toUpperCase() !== agencyCode
  ) {
    throw new HttpError(404, 'Persona no encontrada');
  }

  const row = await giPeople.updatePerson(id, {
    primerNombre: b.primerNombre,
    segundoNombre: b.segundoNombre,
    primerApellido: b.primerApellido,
    segundoApellido: b.segundoApellido,
    roleId: b.roleId,
    roleName: b.roleName,
    contacto: b.contacto ?? b.phone,
    tipoDocumento: b.tipoDocumento ?? b.documentType,
    numeroDocumento: b.numeroDocumento ?? b.documentId,
    comentarios: b.comentarios ?? b.notes,
    genderId: b.genderId,
    status: b.status,
    agencyCode,
    userId: await resolveDbUserId(req.user),
  });
  await writeAdminLog(
    req.user,
    'Actualización de Persona',
    `Se actualizó información de ID: ${id}`,
    req,
    { tablaAfectada: 'personas' },
  );
  res.json(mapPerson(row));
});

exports.setStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const status = req.body?.status;
  if (!status) {
    throw new HttpError(400, 'status es requerido (Activo o Inactivo)');
  }
  const agencyCode = requireSessionAgency(req);
  const existing = await giPeople.getPerson(id);
  if (
    !existing ||
    String(existing.id_agencia || '')
      .trim()
      .toUpperCase() !== agencyCode
  ) {
    throw new HttpError(404, 'Persona no encontrada');
  }
  const row = await giPeople.setPersonStatus(id, status);
  if (!row) throw new HttpError(404, 'Persona no encontrada');
  const person = mapPerson(row);
  const action = person.status === 'Inactivo' ? 'Desactivación de Persona' : 'Activación de Persona';
  await writeAdminLog(
    req.user,
    action,
    `Persona ${person.name} (${person.id}) → ${person.status}`,
    req,
    { tablaAfectada: 'personas' },
  );
  res.json(person);
});

exports.lookupByPhone = asyncHandler(async (req, res) => {
  const raw = decodeURIComponent(req.params.phone || '');
  const digits = raw.replace(/\D/g, '');
  const candidates = new Set([raw, digits]);
  if (digits.startsWith('57') && digits.length > 10) {
    candidates.add(digits.slice(2));
  } else if (digits.length === 10) {
    candidates.add(`57${digits}`);
    candidates.add(`+57${digits}`);
  }
  const list = [...candidates].filter(Boolean);
  const agencyCode = requireSessionAgency(req);
  const result = await giPeople.lookupByPhone(list, agencyCode);
  if (!result) throw new HttpError(404, 'Número no registrado');

  const person = mapPerson(result.person);
  if (result.documentType && !person.documentType) {
    person.documentType = result.documentType;
  }
  res.json(person);
});

exports.lookupByDocument = asyncHandler(async (req, res) => {
  const raw = decodeURIComponent(req.params.documentId || '');
  const digits = raw.replace(/\D/g, '');
  if (!digits) throw new HttpError(400, 'Documento inválido');
  const agencyCode = requireSessionAgency(req);
  const row = await giPeople.lookupByDocument(digits, agencyCode);
  if (!row) throw new HttpError(404, 'Documento no registrado');
  res.json(mapPerson(row));
});

exports.personRoles = asyncHandler(async (req, res) => {
  const agency = requireAgencyCode(req, 'Query agency es requerido');
  res.json(await giPeople.listPersonRoles(agency));
});

exports.genders = asyncHandler(async (req, res) => {
  const agency = requireAgencyCode(req, 'Query agency es requerido');
  res.json(await giPeople.listGenders(agency));
});

exports.documentTypes = asyncHandler(async (_req, res) => {
  res.json(await giPeople.listDocumentTypes());
});
