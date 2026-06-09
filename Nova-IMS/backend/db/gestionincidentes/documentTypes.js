const { pool } = require('../../config/db');
const HttpError = require('../../utils/HttpError');

const LABEL_TO_CODE = {
  'cedula de ciudadania': 'CC',
  'cedula de extranjeria': 'CE',
  'tarjeta de identidad': 'TI',
  pasaporte: 'PA',
  nit: 'NIT',
};

function normalizeLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

async function resolveDocumentTypeCode(raw, reader = pool) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;

  const [byCode] = await reader.query(
    `SELECT Tipo_documento FROM tipodocumentos WHERE Tipo_documento = ? LIMIT 1`,
    [trimmed],
  );
  if (byCode[0]?.Tipo_documento) return byCode[0].Tipo_documento;

  const [byDesc] = await reader.query(
    `SELECT Tipo_documento FROM tipodocumentos
     WHERE LOWER(Descripcion) = LOWER(?) LIMIT 1`,
    [trimmed],
  );
  if (byDesc[0]?.Tipo_documento) return byDesc[0].Tipo_documento;

  const alias = LABEL_TO_CODE[normalizeLabel(trimmed)];
  if (alias) {
    const [byAlias] = await reader.query(
      `SELECT Tipo_documento FROM tipodocumentos WHERE Tipo_documento = ? LIMIT 1`,
      [alias],
    );
    if (byAlias[0]?.Tipo_documento) return byAlias[0].Tipo_documento;
  }

  throw new HttpError(
    400,
    `Tipo de documento "${trimmed}" no existe en el catálogo tipodocumentos.`,
  );
}

module.exports = { resolveDocumentTypeCode };
