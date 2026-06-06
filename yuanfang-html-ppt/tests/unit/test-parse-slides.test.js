const test = require('node:test');
const assert = require('node:assert');
const { parseSlides } = require('../../scripts/parse-slides');

test('single-page shorthand wraps top-level fields into slides array', () => {
  const content = {
    brand: 'minimalist',
    theme: 'minimalist',
    layout: 'content',
    title: 'Hello',
    body: 'World',
  };
  const result = parseSlides(content);
  assert.ok(Array.isArray(result.slides), 'slides must be an array');
  assert.strictEqual(result.slides.length, 1);
  assert.strictEqual(result.slides[0].layout, 'content');
  assert.strictEqual(result.slides[0].title, 'Hello');
  assert.strictEqual(result.slides[0].body, 'World');
});

test('multi-page content passes through slides array as-is', () => {
  const content = {
    brand: 'minimalist',
    theme: 'minimalist',
    slides: [
      { layout: 'cover', title: 'A' },
      { layout: 'content', title: 'B', points: ['x', 'y'] },
    ],
  };
  const result = parseSlides(content);
  assert.strictEqual(result.slides.length, 2);
  assert.strictEqual(result.slides[1].points.length, 2);
});

test('throws when neither layout nor slides is provided', () => {
  assert.throws(() => parseSlides({ brand: 'x', theme: 'x' }), /缺少 slides 数组或单页 layout/);
});
