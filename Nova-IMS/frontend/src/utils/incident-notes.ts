/** Separador entre entradas en details/comments (TEXT en BD, sin tabla nueva). */
export const INCIDENT_NOTE_SEPARATOR = '\n---\n';

export interface IncidentNoteEntry {
  timestamp: string | null;
  author: string;
  text: string;
}

const HEADER_RE = /^\[([^\]]+)\]\s*(.*)$/;

export function parseIncidentNotes(raw: string | null | undefined): IncidentNoteEntry[] {
  const value = String(raw ?? '').trim();
  if (!value) return [];

  if (!value.includes(INCIDENT_NOTE_SEPARATOR)) {
    return [{ timestamp: null, author: 'Registro anterior', text: value }];
  }

  return value
    .split(INCIDENT_NOTE_SEPARATOR)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      const header = lines[0] || '';
      const match = HEADER_RE.exec(header);
      if (!match) {
        return { timestamp: null, author: 'Registro anterior', text: block };
      }
      const author = match[2].trim();
      const body = lines.slice(1).join('\n').trim();
      const cleanBody = body.replace(/^\[[^\]]+\]\s*\n?/gm, '').trim();
      return {
        timestamp: match[1].trim(),
        author: author || 'Operador',
        text: cleanBody || (author && !body ? author : ''),
      };
    });
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

  const entry = `[${formatNoteTimestamp()}]\n${body}`;
  const prev = String(existing ?? '').trim();
  return prev ? `${prev}${INCIDENT_NOTE_SEPARATOR}${entry}` : entry;
}

export function formatNoteForDisplay(entry: IncidentNoteEntry): string {
  if (!entry.timestamp) return 'Sin fecha';
  return entry.timestamp;
}

/** Última entrada del historial (campo details legado en API/correo). */
export function latestIncidentNoteText(raw: string | null | undefined): string {
  const entries = parseIncidentNotes(raw);
  if (!entries.length) return '';
  return entries[entries.length - 1].text;
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
