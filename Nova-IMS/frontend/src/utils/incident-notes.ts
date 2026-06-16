/** Separador entre entradas en details/comments (TEXT en BD, sin tabla nueva). */
export const INCIDENT_NOTE_SEPARATOR = '\n---\n';

export interface IncidentNoteEntry {
  timestamp: string | null;
  author: string;
  text: string;
}

const HEADER_RE = /^\[([^\]]+)\]\s*(.*)$/;
const TIMESTAMP_ONLY_RE = /^\[([^\]]+)\]$/;

function parseSingleNoteBlock(block: string): IncidentNoteEntry {
  const trimmed = block.trim();
  if (!trimmed) {
    return { timestamp: null, author: 'Operador', text: '' };
  }

  const lines = trimmed.split('\n');
  const header = (lines[0] || '').trim();
  const body = lines.slice(1).join('\n').trim();

  const withAuthor = HEADER_RE.exec(header);
  if (withAuthor) {
    const author = withAuthor[2].trim();
    const body = lines.slice(1).join('\n').trim();
    if (!body && author) {
      return {
        timestamp: withAuthor[1].trim(),
        author: 'Operador',
        text: author,
      };
    }
    return {
      timestamp: withAuthor[1].trim(),
      author: author || 'Operador',
      text: body || '',
    };
  }

  const timestampOnly = TIMESTAMP_ONLY_RE.exec(header);
  if (timestampOnly) {
    return {
      timestamp: timestampOnly[1].trim(),
      author: 'Operador',
      text: body,
    };
  }

  return { timestamp: null, author: 'Registro anterior', text: trimmed };
}

export function parseIncidentNotes(raw: string | null | undefined): IncidentNoteEntry[] {
  const value = String(raw ?? '').trim();
  if (!value) return [];

  if (!value.includes(INCIDENT_NOTE_SEPARATOR)) {
    return [parseSingleNoteBlock(value)];
  }

  return value
    .split(INCIDENT_NOTE_SEPARATOR)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => parseSingleNoteBlock(block));
}

export function formatNoteTimestamp(date = new Date()): string {
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function appendIncidentNote(
  existing: string | null | undefined,
  _author: string,
  text: string,
): string {
  const body = String(text ?? '').trim();
  if (!body) return String(existing ?? '').trim();

  const author = String(_author || 'Operador').trim() || 'Operador';
  const entry = `[${formatNoteTimestamp()}] ${author}\n${body}`;
  const prev = String(existing ?? '').trim();
  return prev ? `${prev}${INCIDENT_NOTE_SEPARATOR}${entry}` : entry;
}

export function formatNoteForDisplay(entry: IncidentNoteEntry): string {
  if (!entry.timestamp) return 'Fecha no registrada';
  const parsed = parseNoteTimestamp(entry.timestamp);
  if (parsed) {
    return parsed.toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
  return entry.timestamp;
}

/** Interpreta fechas guardadas como [DD/MM/YYYY, HH:mm:ss] en comments. */
function parseNoteTimestamp(raw: string): Date | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;

  const match =
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:,|\s)+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6] ?? 0);
    const d = new Date(year, month, day, hour, minute, second);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const fallback = Date.parse(value.replaceAll(',', ''));
  return Number.isNaN(fallback) ? null : new Date(fallback);
}

/** Comentarios viejos sin nombre en cabecera: usar operador del incidente si existe. */
export function enrichCommentAuthors(
  entries: IncidentNoteEntry[],
  fallbackAuthor?: string | null,
): IncidentNoteEntry[] {
  const fallback = String(fallbackAuthor ?? '').trim();
  if (!fallback) return entries;
  return entries.map((entry) => {
    if (entry.author !== 'Operador' || !entry.timestamp) return entry;
    return { ...entry, author: fallback };
  });
}

export function noteAuthorInitials(author: string): string {
  const parts = String(author || 'Operador')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'OP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

/** Última entrada del historial (campo details legado en API/correo). */
export function latestIncidentNoteText(raw: string | null | undefined): string {
  const entries = parseIncidentNotes(raw);
  if (!entries.length) return '';
  return entries.at(-1)?.text ?? '';
}

/** Historial unificado: comments + descripción antigua si solo existía details. */
export function buildCommentHistoryView(
  comments?: string | null,
  legacyDetails?: string | null,
): IncidentNoteEntry[] {
  const fromComments = parseIncidentNotes(comments);
  const legacy = String(legacyDetails ?? '').trim();
  if (!legacy) return fromComments;
  if (!fromComments.length) {
    return parseIncidentNotes(legacy);
  }
  const alreadyThere = fromComments.some(
    (e) => e.text.trim() === legacy || legacy.includes(e.text.trim()),
  );
  if (alreadyThere) return fromComments;
  return [{ timestamp: null, author: 'Descripción inicial', text: legacy }, ...fromComments];
}
