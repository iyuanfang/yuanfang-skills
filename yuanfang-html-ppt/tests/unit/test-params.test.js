const test = require('node:test');
const assert = require('node:assert');
const { buildDataAttributes, PARAM_VALIDATORS, buildHtml } = require('../../scripts/render-html-pptx');

test('PPT buildDataAttributes: only data-theme when no params', () => {
  const result = buildDataAttributes('pitch-deck-vc', {});
  assert.strictEqual(result, ' data-theme="pitch-deck-vc"');
});

test('PPT buildDataAttributes: emits all 4 params when set', () => {
  const result = buildDataAttributes('pitch-deck-vc', {
    accent: 'amber', type: 'serif', density: 'dense', decor: 'subtle',
  });
  assert.ok(result.includes('data-accent="amber"'));
  assert.ok(result.includes('data-type="serif"'));
  assert.ok(result.includes('data-density="dense"'));
  assert.ok(result.includes('data-decor="subtle"'));
});

test('PPT buildDataAttributes: invalid values dropped', () => {
  const result = buildDataAttributes('pitch-deck-vc', { accent: 'rainbow' });
  assert.ok(!result.includes('data-accent'));
  assert.ok(result.includes('data-theme="pitch-deck-vc"'));
});

test('PPT PARAM_VALIDATORS: all 4 keys present', () => {
  assert.deepStrictEqual(Object.keys(PARAM_VALIDATORS),
    ['accent', 'type', 'density', 'decor']);
});

test('PPT buildHtml: data-theme always on <html>', () => {
  const html = buildHtml(
    [{ layout: 'cover', title: 'X' }],
    'pitch-deck-vc',
    ':root { --accent: #000; }',
  );
  assert.ok(html.includes('data-theme="pitch-deck-vc"'));
});

test('PPT buildHtml: data-* injected when paramsCss provided', () => {
  const html = buildHtml(
    [{ layout: 'cover', title: 'X' }],
    'pitch-deck-vc',
    ':root {}',
    '[data-accent="emerald"] { --accent: #059669; }',
    { accent: 'emerald' },
  );
  assert.ok(html.includes('data-accent="emerald"'));
  assert.ok(html.includes('[data-accent="emerald"]'));
});

test('PPT buildHtml: no data-* extra attrs when no params', () => {
  const html = buildHtml(
    [{ layout: 'cover', title: 'X' }],
    'pitch-deck-vc',
    ':root {}',
  );
  assert.ok(!html.includes('data-accent'));
  assert.ok(!html.includes('data-type'));
  assert.ok(!html.includes('data-density'));
  assert.ok(!html.includes('data-decor'));
});
