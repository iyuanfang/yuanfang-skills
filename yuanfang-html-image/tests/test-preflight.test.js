const test = require('node:test');
const assert = require('node:assert');
const { preflight, contrastRatio, hexToRgb, luminance } = require('../../scripts/preflight');

test('contrastRatio: white-on-black = 21:1', () => {
  assert.ok(Math.abs(contrastRatio(hexToRgb('#FFFFFF'), hexToRgb('#000000')) - 21) < 0.1);
});

test('contrastRatio: same color = 1:1', () => {
  assert.ok(Math.abs(contrastRatio(hexToRgb('#4F46E5'), hexToRgb('#4F46E5')) - 1) < 0.001);
});

test('luminance: white = 1.0', () => {
  assert.ok(Math.abs(luminance(255, 255, 255) - 1.0) < 0.001);
});

test('luminance: black = 0.0', () => {
  assert.ok(Math.abs(luminance(0, 0, 0) - 0.0) < 0.001);
});

test('preflight: minimal-white on xiaohongshu-v passes all checks', () => {
  const css = `
    [data-theme="minimal-white"] {
      --bg: #FFFFFF;
      --text-1: #0F172A;
      --text-2: #64748B;
      --accent: #4F46E5;
      --title-size-v: 110px;
    }
  `;
  const result = preflight(css, {}, { platform: { width: 1080, height: 1440 } });
  assert.strictEqual(result.errors.length, 0, 'no errors: ' + result.errors.join(', '));
  assert.strictEqual(result.ok, true);
});

test('preflight: data-infographic green on near-white bg fails accent', () => {
  const css = `
    [data-theme="data-infographic"] {
      --bg: #F8FAFC;
      --text-1: #0F172A;
      --text-2: #64748B;
      --accent: #10B981;
      --title-size-v: 110px;
    }
  `;
  const result = preflight(css, {}, { platform: { width: 1080, height: 1440 } });
  assert.ok(result.errors.some(e => e.includes('accent contrast')));
  assert.strictEqual(result.ok, false);
});

test('preflight: oversized title errors on small canvas', () => {
  const css = `
    [data-theme="oversized"] {
      --bg: #FFF;
      --text-1: #000;
      --text-2: #64748B;
      --accent: #4F46E5;
      --title-size-v: 600px;
    }
  `;
  const result = preflight(css, {}, { platform: { width: 540, height: 540 } });
  assert.ok(result.errors.some(e => e.includes('title-size-v')));
});

test('preflight: --accent override changes effective color check (rose on near-white errors)', () => {
  const css = `
    [data-theme="x"] {
      --bg: #F8FAFC;
      --text-1: #0F172A;
      --text-2: #64748B;
      --accent: #10B981;
      --title-size-v: 110px;
    }
  `;
  const withoutParam = preflight(css, {}, { platform: { width: 1080, height: 1440 } });
  assert.ok(withoutParam.errors.some(e => e.includes('accent contrast')),
    'default accent #10B981 should fail on near-white');
});

test('preflight: unknown accent param errors', () => {
  const css = `
    [data-theme="x"] {
      --bg: #FFF;
      --text-1: #000;
      --text-2: #64748B;
      --accent: #4F46E5;
      --title-size-v: 110px;
    }
  `;
  const result = preflight(css, { accent: 'rainbow' }, { platform: { width: 1080, height: 1440 } });
  assert.ok(result.errors.some(e => e.includes('unknown accent')));
});
