const test = require('node:test');
const assert = require('node:assert');
const { buildBrandOverrideCss, mergeBrandSpec } = require('../scripts/render');

test('buildBrandOverrideCss: no spec returns empty', () => {
  assert.strictEqual(buildBrandOverrideCss(null, 'minimal-white'), '');
});

test('buildBrandOverrideCss: no colors returns empty', () => {
  const spec = { name: 'X', domain: 'x.com' };
  assert.strictEqual(buildBrandOverrideCss(spec, 'minimal-white'), '');
});

test('buildBrandOverrideCss: no primary returns empty', () => {
  const spec = { colors: { secondary: '#FFF' } };
  assert.strictEqual(buildBrandOverrideCss(spec, 'minimal-white'), '');
});

test('buildBrandOverrideCss: emits [data-theme] override', () => {
  const spec = { colors: { primary: '#FF5733' } };
  const css = buildBrandOverrideCss(spec, 'minimal-white');
  assert.ok(css.includes('[data-theme="minimal-white"]'));
  assert.ok(css.includes('--accent: #FF5733'));
});

test('buildBrandOverrideCss: uses correct theme name', () => {
  const css = buildBrandOverrideCss({ colors: { primary: '#000' } }, 'dark-gold');
  assert.ok(css.includes('[data-theme="dark-gold"]'));
});

test('mergeBrandSpec: fills missing brand from spec', () => {
  const content = { title: 'X' };
  const spec = { name: 'MyBrand', domain: 'x.com' };
  const out = mergeBrandSpec(content, spec);
  assert.strictEqual(out.brand, 'MyBrand');
  assert.strictEqual(out.brandDomain, 'x.com');
});

test('mergeBrandSpec: keeps content brand when present', () => {
  const content = { brand: 'Override', brandImage: 'data:...' };
  const spec = { name: 'MyBrand', logo: 'data:...' };
  const out = mergeBrandSpec(content, spec);
  assert.strictEqual(out.brand, 'Override');
  assert.strictEqual(out.brandImage, 'data:...');
});

test('mergeBrandSpec: no spec is passthrough', () => {
  const content = { brand: 'X' };
  assert.deepStrictEqual(mergeBrandSpec(content, null), { brand: 'X' });
});
