import { describe, it, expect } from 'vitest';
import {
  INCIDENT_NOTE_SEPARATOR,
  parseIncidentNotes,
  appendIncidentNote,
  noteAuthorInitials,
  latestIncidentNoteText,
  buildCommentHistoryView,
  enrichCommentAuthors,
  countReiteracionNotes,
  isReiteracionNoteText,
} from './incident-notes';

describe('parseIncidentNotes', () => {
  it('devuelve arreglo vacío para null, undefined o texto vacío', () => {
    expect(parseIncidentNotes(null)).toEqual([]);
    expect(parseIncidentNotes(undefined)).toEqual([]);
    expect(parseIncidentNotes('   ')).toEqual([]);
  });

  it('parsea una entrada con encabezado [fecha] autor', () => {
    const raw = '[10/06/2026, 12:00:00] Rogelio\nComentario de prueba';
    const entries = parseIncidentNotes(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].timestamp).toBe('10/06/2026, 12:00:00');
    expect(entries[0].author).toBe('Rogelio');
    expect(entries[0].text).toBe('Comentario de prueba');
  });

  it('trata texto plano sin formato como registro anterior', () => {
    const entries = parseIncidentNotes('Texto legado sin cabecera');
    expect(entries[0]).toEqual({
      timestamp: null,
      author: 'Registro anterior',
      text: 'Texto legado sin cabecera',
    });
  });

  it('parsea múltiples entradas separadas por separador', () => {
    const raw = [
      '[10/06/2026, 10:00:00] Ana\nPrimera',
      '[10/06/2026, 11:00:00] Luis\nSegunda',
    ].join(INCIDENT_NOTE_SEPARATOR);
    const entries = parseIncidentNotes(raw);
    expect(entries).toHaveLength(2);
    expect(entries[0].text).toBe('Primera');
    expect(entries[1].author).toBe('Luis');
    expect(entries[1].text).toBe('Segunda');
  });

  it('interpreta cabecera solo con timestamp', () => {
    const entries = parseIncidentNotes('[10/06/2026, 12:00:00]\nCuerpo');
    expect(entries[0].author).toBe('Operador');
    expect(entries[0].text).toBe('Cuerpo');
  });
});

describe('appendIncidentNote', () => {
  it('no agrega nada si el texto nuevo está vacío', () => {
    expect(appendIncidentNote('historial previo', 'Operador', '   ')).toBe('historial previo');
  });

  it('crea la primera entrada sin historial previo', () => {
    const result = appendIncidentNote('', 'Ana Pérez', 'Nuevo comentario');
    expect(result).toMatch(/^\[/);
    expect(result).toContain('] Ana Pérez\nNuevo comentario');
    expect(result).not.toContain(INCIDENT_NOTE_SEPARATOR);
  });

  it('concatena con separador cuando ya hay historial', () => {
    const prev = '[10/06/2026, 09:00:00] Ana\nAnterior';
    const result = appendIncidentNote(prev, 'Luis', 'Siguiente');
    expect(result.startsWith(prev)).toBe(true);
    expect(result).toContain(INCIDENT_NOTE_SEPARATOR);
    expect(result.endsWith('Siguiente')).toBe(true);
  });
});

describe('noteAuthorInitials', () => {
  it('usa OP para nombre vacío', () => {
    expect(noteAuthorInitials('')).toBe('OP');
    expect(noteAuthorInitials('   ')).toBe('OP');
  });

  it('usa dos letras para una sola palabra', () => {
    expect(noteAuthorInitials('Rogelio')).toBe('RO');
  });

  it('usa iniciales de dos palabras', () => {
    expect(noteAuthorInitials('Ana Pérez')).toBe('AP');
  });
});

describe('latestIncidentNoteText', () => {
  it('devuelve cadena vacía sin notas', () => {
    expect(latestIncidentNoteText('')).toBe('');
  });

  it('devuelve el texto de la última entrada', () => {
    const raw = `Primera${INCIDENT_NOTE_SEPARATOR}[10/06/2026, 12:00:00] Ana\nÚltima`;
    expect(latestIncidentNoteText(raw)).toBe('Última');
  });
});

describe('enrichCommentAuthors', () => {
  it('no modifica entradas cuando no hay fallback', () => {
    const entries = [{ timestamp: '10/06/2026', author: 'Operador', text: 'Hola' }];
    expect(enrichCommentAuthors(entries, null)).toEqual(entries);
  });

  it('reemplaza Operador con timestamp por el operador del incidente', () => {
    const entries = [{ timestamp: '10/06/2026', author: 'Operador', text: 'Hola' }];
    const enriched = enrichCommentAuthors(entries, 'Rogelio Menco');
    expect(enriched[0].author).toBe('Rogelio Menco');
  });

  it('no reemplaza cuando ya tiene nombre distinto de Operador', () => {
    const entries = [{ timestamp: '10/06/2026', author: 'Ana', text: 'Hola' }];
    const enriched = enrichCommentAuthors(entries, 'Rogelio');
    expect(enriched[0].author).toBe('Ana');
  });

  it('no reemplaza Operador sin timestamp', () => {
    const entries = [{ timestamp: null, author: 'Operador', text: 'Hola' }];
    const enriched = enrichCommentAuthors(entries, 'Rogelio');
    expect(enriched[0].author).toBe('Operador');
  });
});

describe('buildCommentHistoryView', () => {
  it('devuelve solo comentarios cuando no hay descripción legada', () => {
    const comments = '[10/06/2026, 10:00:00] Ana\nComentario';
    const view = buildCommentHistoryView(comments, null);
    expect(view).toHaveLength(1);
    expect(view[0].text).toBe('Comentario');
  });

  it('usa descripción legada cuando no hay comentarios', () => {
    const view = buildCommentHistoryView('', 'Descripción inicial del caso');
    expect(view).toHaveLength(1);
    expect(view[0].author).toBe('Registro anterior');
    expect(view[0].text).toBe('Descripción inicial del caso');
  });

  it('combina descripción legada sin duplicar si ya está en comentarios', () => {
    const legacy = 'Mismo texto';
    const comments = '[10/06/2026, 10:00:00] Ana\nMismo texto';
    const view = buildCommentHistoryView(comments, legacy);
    expect(view).toHaveLength(1);
    expect(view[0].text).toBe('Mismo texto');
  });

  it('antepone descripción legada cuando no está duplicada', () => {
    const comments = '[10/06/2026, 10:00:00] Ana\nComentario nuevo';
    const view = buildCommentHistoryView(comments, 'Descripción antigua');
    expect(view).toHaveLength(2);
    expect(view[0].author).toBe('Descripción inicial');
    expect(view[0].text).toBe('Descripción antigua');
    expect(view[1].text).toBe('Comentario nuevo');
  });
});

describe('countReiteracionNotes', () => {
  const reiterText =
    'Han transcurrido 4 días desde el envío a CERREM sin respuesta de UNP/Policía sobre la evaluación de medidas. Se reitera la solicitud.';

  it('cuenta comentarios con la marca de reiteración', () => {
    const raw = [
      `[7/05/2026, 15:30:00] Rogelio\n${reiterText}`,
      `[7/05/2026, 15:37:00] Rogelio\n${reiterText.replace('4', '8')}`,
      `[7/05/2026, 15:40:00] Rogelio\nComentario normal sin reiterar`,
    ].join(INCIDENT_NOTE_SEPARATOR);
    expect(countReiteracionNotes(raw)).toBe(2);
  });

  it('isReiteracionNoteText detecta la plantilla', () => {
    expect(isReiteracionNoteText(reiterText)).toBe(true);
    expect(isReiteracionNoteText('Solo seguimiento')).toBe(false);
  });
});
