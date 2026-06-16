const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  INCIDENT_NOTE_SEPARATOR,
  parseIncidentNotes,
  appendIncidentNote,
  diffNewCommentEntries,
  truncateAuditText,
  latestIncidentNote,
  formatLatestNoteForEmail,
  formatNotesForEmail,
} = require('../utils/incidentNotes');

describe('parseIncidentNotes', () => {
  it('devuelve arreglo vacío para null, undefined o texto vacío', () => {
    assert.deepEqual(parseIncidentNotes(null), []);
    assert.deepEqual(parseIncidentNotes(undefined), []);
    assert.deepEqual(parseIncidentNotes('   '), []);
  });

  it('parsea una entrada con encabezado [fecha] autor', () => {
    const raw = '[10/06/2026, 12:00:00] Rogelio\nComentario de prueba';
    const entries = parseIncidentNotes(raw);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].timestamp, '10/06/2026, 12:00:00');
    assert.equal(entries[0].author, 'Rogelio');
    assert.equal(entries[0].text, 'Comentario de prueba');
  });

  it('trata texto plano sin formato como registro anterior', () => {
    const entries = parseIncidentNotes('Texto legado sin cabecera');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].timestamp, null);
    assert.equal(entries[0].author, 'Registro anterior');
    assert.equal(entries[0].text, 'Texto legado sin cabecera');
  });

  it('parsea múltiples entradas separadas por separador', () => {
    const raw = [
      '[10/06/2026, 10:00:00] Ana\nPrimera',
      '[10/06/2026, 11:00:00] Luis\nSegunda',
    ].join(INCIDENT_NOTE_SEPARATOR);
    const entries = parseIncidentNotes(raw);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].text, 'Primera');
    assert.equal(entries[1].author, 'Luis');
    assert.equal(entries[1].text, 'Segunda');
  });
});

describe('appendIncidentNote', () => {
  it('no agrega nada si el texto nuevo está vacío', () => {
    assert.equal(appendIncidentNote('historial previo', 'Operador', '   '), 'historial previo');
  });

  it('crea la primera entrada sin historial previo', () => {
    const result = appendIncidentNote('', 'Operador', 'Nuevo comentario');
    assert.ok(result.startsWith('['));
    assert.ok(result.includes('\nNuevo comentario'));
    assert.ok(!result.includes(INCIDENT_NOTE_SEPARATOR));
  });

  it('concatena con separador cuando ya hay historial', () => {
    const prev = '[10/06/2026, 09:00:00] Ana\nAnterior';
    const result = appendIncidentNote(prev, 'Operador', 'Siguiente');
    assert.ok(result.startsWith(prev));
    assert.ok(result.includes(INCIDENT_NOTE_SEPARATOR));
    assert.ok(result.endsWith('Siguiente'));
  });
});

describe('diffNewCommentEntries', () => {
  it('detecta entradas nuevas al final', () => {
    const before = '[10/06/2026, 10:00:00] Ana\nPrimera';
    const after = `${before}${INCIDENT_NOTE_SEPARATOR}[10/06/2026, 11:00:00] Luis\nSegunda`;
    const { added, bulkChanged } = diffNewCommentEntries(before, after);
    assert.equal(added.length, 1);
    assert.equal(added[0].text, 'Segunda');
    assert.equal(bulkChanged, false);
  });

  it('marca cambio masivo sin nuevas entradas', () => {
    const before = '[10/06/2026, 10:00:00] Ana\nOriginal';
    const after = '[10/06/2026, 10:00:00] Ana\nModificado';
    const { added, bulkChanged } = diffNewCommentEntries(before, after);
    assert.deepEqual(added, []);
    assert.equal(bulkChanged, true);
  });
});

describe('truncateAuditText', () => {
  it('trunca texto largo con elipsis', () => {
    const long = 'a'.repeat(300);
    const result = truncateAuditText(long);
    assert.equal(result.length, 281);
    assert.ok(result.endsWith('…'));
  });

  it('respeta límite personalizado', () => {
    const result = truncateAuditText('abcdefgh', 5);
    assert.equal(result, 'abcde…');
  });
});

describe('latestIncidentNote', () => {
  it('devuelve null sin notas', () => {
    assert.equal(latestIncidentNote(''), null);
  });

  it('devuelve la última entrada', () => {
    const raw = `Primera${INCIDENT_NOTE_SEPARATOR}[10/06/2026, 12:00:00] Ana\nÚltima`;
    const last = latestIncidentNote(raw);
    assert.equal(last.text, 'Última');
  });
});

describe('formatLatestNoteForEmail', () => {
  it('indica ausencia de comentarios', () => {
    assert.equal(formatLatestNoteForEmail(''), '(sin comentario)');
  });

  it('formatea la última nota', () => {
    const raw = '[10/06/2026, 12:00:00] Rogelio\nTexto correo';
    assert.equal(formatLatestNoteForEmail(raw), '[10/06/2026, 12:00:00]\nTexto correo');
  });
});

describe('formatNotesForEmail', () => {
  it('indica ausencia de registros', () => {
    assert.equal(formatNotesForEmail(null), '(sin registros)');
  });

  it('enumera todas las entradas', () => {
    const raw = '[10/06/2026, 10:00:00] Ana\nUno';
    const formatted = formatNotesForEmail(raw);
    assert.ok(formatted.includes('1. [10/06/2026, 10:00:00]'));
    assert.ok(formatted.includes('Uno'));
  });
});
