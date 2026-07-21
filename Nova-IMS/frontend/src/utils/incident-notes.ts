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

export const DMY_DATE_TIME_RE =
  /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:,|\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?/;

export function parseDmyDateTime(raw: string): Date | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;

  const match = DMY_DATE_TIME_RE.exec(value);
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

function parseNoteTimestamp(raw: string): Date | null {
  return parseDmyDateTime(raw);
}

export function enrichCommentAuthors(
  entries: IncidentNoteEntry[],
  fallbackAuthor?: string | null,
): IncidentNoteEntry[] {
  const fallback = String(fallbackAuthor ?? '').trim();
  if (!fallback) return entries;
  return entries.map((entry) => {
    const author = String(entry.author || '').trim() || 'Operador';
    if (author !== 'Operador') return entry;
    if (!entry.timestamp) return entry;
    return { ...entry, author: fallback };
  });
}

export function resolveHistoryAuthor(
  rawAuthor: string | null | undefined,
  fallbackAuthor?: string | null,
): string {
  const [entry] = enrichCommentAuthors(
    [{ timestamp: null, author: String(rawAuthor ?? '').trim() || 'Operador', text: '' }],
    fallbackAuthor,
  );
  return entry.author;
}

export function displayCommentBody(text: string, authorHint?: string): string {
  let body = String(text ?? '').trim();
  if (!body) return '';

  body = body.replace(/^\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}(?::\d{2})?\s*:\s*/i, '');

  const headerMatch = /^\[([^\]]+)\]\s*([\s\S]*)$/.exec(body);
  if (headerMatch) {
    const rest = String(headerMatch[2] ?? '').trim();
    if (rest.includes('\n')) {
      const lines = rest.split('\n');
      body = lines.slice(1).join('\n').trim() || lines[0].trim();
    } else {
      body = rest;
    }
  } else {
    body = body.replace(/^\[[^\]]+\]\s*/, '').trim();
  }

  const author = String(authorHint ?? '').trim();
  const authorKey = author?.toLowerCase();
  const bodyKey = body.toLowerCase();
  if (authorKey && bodyKey.startsWith(authorKey)) {
    body = body.slice(author.length).trim();
  }

  if (authorKey && bodyKey === authorKey) {
    return '';
  }

  return body;
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

export function latestIncidentNoteText(raw: string | null | undefined): string {
  const entries = parseIncidentNotes(raw);
  if (!entries.length) return '';
  return entries.at(-1)?.text ?? '';
}

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

export function latestIncidentCommentEntry(
  comments?: string | null,
  legacyDetails?: string | null,
  fallbackAuthor?: string | null,
): IncidentNoteEntry | null {
  const fromComments = parseIncidentNotes(comments);
  let entry: IncidentNoteEntry | null = null;

  if (fromComments.length) {
    entry = fromComments.at(-1) ?? null;
  } else {
    const legacy = String(legacyDetails ?? '').trim();
    if (!legacy) return null;
    const legacyParsed = parseIncidentNotes(legacy);
    entry = legacyParsed.length
      ? (legacyParsed.at(-1) ?? null)
      : { timestamp: null, author: 'Descripción inicial', text: legacy };
  }

  if (!entry) return null;
  const [enriched] = enrichCommentAuthors([entry], fallbackAuthor);
  return enriched;
}

export const REITERACION_COMMENT_MARK = /se reitera la solicitud/i;

export function isReiteracionNoteText(text: string | null | undefined): boolean {
  return REITERACION_COMMENT_MARK.exec(String(text ?? '')) !== null;
}

export function countReiteracionNotes(raw: string | null | undefined): number {
  return parseIncidentNotes(raw).filter((n) => isReiteracionNoteText(n.text)).length;
}

export function lastReiteracionNote(
  raw: string | null | undefined,
): IncidentNoteEntry | null {
  const matches = parseIncidentNotes(raw).filter((n) => isReiteracionNoteText(n.text));
  return matches.at(-1) ?? null;
}
