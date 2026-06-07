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
    agencyCode,
    userId,
  });
  const person = mapPerson(row);
  await writeAdminLog(
    req.user,
    'Creación de Persona',
    `Se registró a ${person.name} (${person.id})`,
  );
  res.status(201).json(person);
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const existing = await giPeople.getPerson(id);
  if (!existing) throw new HttpError(404, 'Persona no encontrada');

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
    agencyCode: existing.id_agencia || requireSessionAgency(req),
    userId: await resolveDbUserId(req.user),
  });
  await writeAdminLog(req.user, 'Actualización de Persona', `Se actualizó información de ID: ${id}`);
  res.json(mapPerson(row));
});

exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const affected = await giPeople.deletePerson(id);
  if (!affected) throw new HttpError(404, 'Persona no encontrada');
  await writeAdminLog(req.user, 'Eliminación de Persona', `Se eliminó la persona ID: ${id}`);
  res.status(204).send();
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
  const result = await giPeople.lookupByPhone(list);
  if (!result) throw new HttpError(404, 'Número no registrado');

  const person = mapPerson(result.person);
  if (result.documentType && !person.documentType) {
    person.documentType = result.documentType;
  }
  res.json(person);
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
