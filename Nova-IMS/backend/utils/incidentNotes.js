const INCIDENT_NOTE_SEPARATOR = '\n---\n';
const HEADER_RE = /^\[([^\]]+)\]\s*(.*)$/;

function formatNoteTimestamp(date = new Date()) {
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

function parseIncidentNotes(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return [];

  if (!value.includes(INCIDENT_NOTE_SEPARATOR)) {
    const lines = value.split('\n');
    const match = HEADER_RE.exec(lines[0] || '');
    if (match) {
      const body = lines.slice(1).join('\n').trim();
      return [
        {
          timestamp: match[1].trim(),
          author: match[2].trim() || 'Operador',
          text: body || match[2].trim(),
        },
      ];
    }
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
      return {
        timestamp: match[1].trim(),
        author,
        text: body || (author && !body ? author : ''),
      };
    });
}

function appendIncidentNote(existing, _author, text) {
  const body = String(text ?? '').trim();
  if (!body) return String(existing ?? '').trim();

  const entry = `[${formatNoteTimestamp()}]\n${body}`;
  const prev = String(existing ?? '').trim();
  return prev ? `${prev}${INCIDENT_NOTE_SEPARATOR}${entry}` : entry;
}

function latestIncidentNote(raw) {
  const entries = parseIncidentNotes(raw);
  if (!entries.length) return null;
  return entries[entries.length - 1];
}

/** Solo el último comentario gestionado (vitácora / correo). */
function formatLatestNoteForEmail(raw) {
  const e = latestIncidentNote(raw);
  if (!e) return '(sin comentario)';
  const when = e.timestamp || 'Sin fecha';
  return `[${when}]\n${e.text}`;
}

function formatNotesForEmail(raw) {
  const entries = parseIncidentNotes(raw);
  if (!entries.length) return '(sin registros)';
  return entries
    .map((e, i) => {
      const when = e.timestamp || 'Sin fecha';
      return `  ${i + 1}. [${when}]\n     ${e.text.replaceAll('\n', '\n     ')}`;
    })
    .join('\n');
}

function formatLatestNoteHtml(raw) {
  const e = latestIncidentNote(raw);
  if (!e) {
    return '<p style="margin:0;color:#6b7280;">(sin comentario)</p>';
  }
  return `
        <div style="padding:10px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;">
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">${escapeHtml(e.timestamp || 'Sin fecha')}</div>
          <div style="font-size:13px;color:#111827;white-space:pre-wrap;">${escapeHtml(e.text)}</div>
        </div>`;
}

function formatNotesHtml(raw) {
  const entries = parseIncidentNotes(raw);
  if (!entries.length) {
    return '<p style="margin:0;color:#6b7280;">(sin registros)</p>';
  }
  return entries
    .map(
      (e) => `
        <div style="margin-bottom:10px;padding:10px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;">
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">${escapeHtml(e.timestamp || 'Sin fecha')}</div>
          <div style="font-size:13px;color:#111827;white-space:pre-wrap;">${escapeHtml(e.text)}</div>
        </div>`,
    )
    .join('');
}

/** Entradas nuevas al guardar (historial en comments). */
function diffNewCommentEntries(beforeRaw, afterRaw) {
  const before = parseIncidentNotes(beforeRaw);
  const after = parseIncidentNotes(afterRaw);
  if (after.length <= before.length) {
    const same =
      JSON.stringify(before.map((e) => e.text)) === JSON.stringify(after.map((e) => e.text));
    return { added: [], bulkChanged: !same && before.length === after.length };
  }
  return { added: after.slice(before.length), bulkChanged: false };
}

function truncateAuditText(text, max = 280) {
  const s = String(text ?? '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

module.exports = {
  INCIDENT_NOTE_SEPARATOR,
  parseIncidentNotes,
  appendIncidentNote,
  diffNewCommentEntries,
  truncateAuditText,
  latestIncidentNote,
  formatLatestNoteForEmail,
  formatLatestNoteHtml,
  formatNotesForEmail,
  formatNotesHtml,
};
