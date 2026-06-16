const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword } = require('../utils/passwordPolicy');

describe('validatePassword', () => {
  it('rechaza valores que no son string', () => {
    const result = validatePassword(null);
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, ['La contraseña es requerida.']);
  });

  it('rechaza contraseña muy corta', () => {
    const result = validatePassword('Ab1!');
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('al menos 8')));
  });

  it('rechaza contraseña muy larga', () => {
    const result = validatePassword(`Aa1!${'x'.repeat(125)}`);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('128')));
  });

  it('rechaza sin mayúscula', () => {
    const result = validatePassword('abcdef1!');
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('Debe incluir una mayúscula.'));
  });

  it('rechaza sin minúscula', () => {
    const result = validatePassword('ABCDEF1!');
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('Debe incluir una minúscula.'));
  });

  it('rechaza sin número', () => {
    const result = validatePassword('Abcdefg!');
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('Debe incluir un número.'));
  });

  it('rechaza sin carácter especial', () => {
    const result = validatePassword('Abcdefg1');
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('Debe incluir un carácter especial.'));
  });

  it('rechaza contraseñas con espacios', () => {
    const result = validatePassword('Abcdef1! ');
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('No puede contener espacios.'));
  });

  it('acepta contraseña válida', () => {
    const result = validatePassword('Segura1!');
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
  });

  it('acumula múltiples errores', () => {
    const result = validatePassword('abc');
    assert.equal(result.ok, false);
    assert.ok(result.errors.length >= 4);
    assert.ok(result.errors.some((e) => e.includes('al menos 8')));
    assert.ok(result.errors.includes('Debe incluir una mayúscula.'));
    assert.ok(result.errors.includes('Debe incluir un número.'));
    assert.ok(result.errors.includes('Debe incluir un carácter especial.'));
  });
});
