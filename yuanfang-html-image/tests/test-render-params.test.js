const test = require('node:test');
const assert = require('node:assert');
const { buildDataAttributes, PARAM_VALIDATORS, assembleHTML } = require('../scripts/render');

test('buildDataAttributes: only data-theme when no params', () => {
  const result = buildDataAttributes('minimal-white', {});
  assert.strictEqual(result, ' data-theme="minimal-white"');
});

test('buildDataAttributes: emits data-accent when valid', () => {
  const result = buildDataAttributes('minimal-white', { accent: 'emerald' });
  assert.ok(result.includes('data-accent="emerald"'));
  assert.ok(result.includes('data-theme="minimal-white"'));
});

test('buildDataAttributes: emits all 4 params when set', () => {
  const result = buildDataAttributes('minimal-white', {
    accent: 'rose',
    type: 'serif',
    density: 'airy',
    decor: 'subtle',
  });
  assert.ok(result.includes('data-accent="rose"'));
  assert.ok(result.includes('data-type="serif"'));
  assert.ok(result.includes('data-density="airy"'));
  assert.ok(result.includes('data-decor="subtle"'));
});

test('buildDataAttributes: silently drops invalid param values', () => {
  const result = buildDataAttributes('minimal-white', {
    accent: 'rainbow',
    type: 'comic-sans',
    density: 'extreme',
    decor: 'flashy',
  });
  assert.ok(result.includes('data-theme="minimal-white"'));
  assert.ok(!result.includes('data-accent'));
  assert.ok(!result.includes('data-type'));
  assert.ok(!result.includes('data-density'));
  assert.ok(!result.includes('data-decor'));
});

test('PARAM_VALIDATORS: accent has 5 valid values', () => {
  assert.deepStrictEqual(PARAM_VALIDATORS.accent,
    ['indigo', 'emerald', 'rose', 'amber', 'slate']);
});

test('PARAM_VALIDATORS: type has 3 valid values', () => {
  assert.deepStrictEqual(PARAM_VALIDATORS.type,
    ['sans', 'serif', 'mono']);
});

test('PARAM_VALIDATORS: density has 3 valid values', () => {
  assert.deepStrictEqual(PARAM_VALIDATORS.density,
    ['airy', 'normal', 'dense']);
});

test('PARAM_VALIDATORS: decor has 3 valid values', () => {
  assert.deepStrictEqual(PARAM_VALIDATORS.decor,
    ['plain', 'subtle', 'bold']);
});

test('assembleHTML: params appear in <html> data-* attributes', () => {
  const result = assembleHTML({
    themeName: 'minimal-white',
    themeCSS: '',
    baseCSS: ':root {}',
    layoutHTML: '<div></div>',
    content: {},
    width: 540,
    height: 540,
    params: { accent: 'emerald', type: 'serif' },
  });
  assert.ok(result.includes('data-accent="emerald"'));
  assert.ok(result.includes('data-type="serif"'));
});

test('assembleHTML: no params.css injected when no params set', () => {
  const result = assembleHTML({
    themeName: 'minimal-white',
    themeCSS: '',
    baseCSS: ':root {}',
    layoutHTML: '<div></div>',
    content: {},
    width: 540,
    height: 540,
    params: {},
  });
  assert.ok(!result.includes('[data-accent="emerald"]'));
  assert.ok(!result.includes('[data-density'));
});

test('assembleHTML: params.css injected when any param is set', () => {
  const result = assembleHTML({
    themeName: 'minimal-white',
    themeCSS: '',
    baseCSS: ':root {}',
    layoutHTML: '<div></div>',
    content: {},
    width: 540,
    height: 540,
    params: { decor: 'plain' },
  });
  assert.ok(result.includes('[data-decor="plain"]'));
  assert.ok(result.includes('[data-accent="emerald"]'));
});

test('assembleHTML: invalid param value silently ignored, params.css still loaded if other params valid', () => {
  const result = assembleHTML({
    themeName: 'minimal-white',
    themeCSS: '',
    baseCSS: ':root {}',
    layoutHTML: '<div></div>',
    content: {},
    width: 540,
    height: 540,
    params: { accent: 'rainbow', type: 'serif' },
  });
  assert.ok(!result.includes('data-accent="rainbow"'));
  assert.ok(result.includes('data-type="serif"'));
  assert.ok(result.includes('[data-accent="emerald"]'));
});
