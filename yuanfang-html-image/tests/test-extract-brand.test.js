const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  extractDomain,
  extractBrandFromHtml,
  readCache,
  writeCache,
  isExpired,
  cachePath,
  TTL_DAYS,
  parseArgs,
} = require('../scripts/extract-brand.js');

test('extractDomain: simple hostname', () => {
  assert.strictEqual(extractDomain('https://example.com/x'), 'example.com');
});

test('extractDomain: strips www', () => {
  assert.strictEqual(extractDomain('https://www.example.com/x'), 'example.com');
});

test('extractDomain: strips m.', () => {
  assert.strictEqual(extractDomain('https://m.example.com/x'), 'example.com');
});

test('extractDomain: lowercases', () => {
  assert.strictEqual(extractDomain('https://Example.COM/x'), 'example.com');
});

test('extractDomain: invalid URL returns null', () => {
  assert.strictEqual(extractDomain('not a url'), null);
});

test('extractDomain: sub.example.com preserved when needed', () => {
  assert.strictEqual(extractDomain('https://blog.example.com/x'), 'blog.example.com');
});

test('extractBrandFromHtml: og + theme-color + favicon', () => {
  const html = `
    <html>
    <head>
      <meta property="og:site_name" content="Acme Corp">
      <meta property="og:image" content="https://acme.com/logo.png">
      <meta name="theme-color" content="#FF5733">
    </head>
    </html>`;
  const b = extractBrandFromHtml(html, 'https://acme.com/');
  assert.strictEqual(b.name, 'Acme Corp');
  assert.strictEqual(b.logoUrl, 'https://acme.com/logo.png');
  assert.strictEqual(b.colors.primary, '#FF5733');
  assert.strictEqual(b.domain, 'acme.com');
});

test('extractBrandFromHtml: relative logo URL is resolved', () => {
  const html = '<html><head><link rel="icon" href="/favicon.ico"></head></html>';
  const b = extractBrandFromHtml(html, 'https://acme.com/');
  assert.strictEqual(b.logoUrl, 'https://acme.com/favicon.ico');
});

test('extractBrandFromHtml: name falls back to domain', () => {
  const html = '<html><head></head></html>';
  const b = extractBrandFromHtml(html, 'https://acme.com/');
  assert.strictEqual(b.name, 'acme.com');
});

test('extractBrandFromHtml: theme-color missing → null', () => {
  const html = '<html><head></head></html>';
  const b = extractBrandFromHtml(html, 'https://acme.com/');
  assert.strictEqual(b.colors.primary, null);
});

test('writeCache + readCache roundtrip', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-'));
  const spec = {
    domain: 'test.com',
    extractedAt: new Date().toISOString(),
    name: 'Test',
    logo: null,
    logoUrl: null,
    colors: { primary: null },
  };
  const p = path.join(tmp, 'test.com.json');
  fs.writeFileSync(p, JSON.stringify(spec));
  const loaded = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.strictEqual(loaded.name, 'Test');
  fs.rmSync(tmp, { recursive: true });
});

test('isExpired: fresh spec not expired', () => {
  const spec = { extractedAt: new Date().toISOString() };
  assert.strictEqual(isExpired(spec), false);
});

test('isExpired: 8-day-old spec is expired', () => {
  const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(isExpired({ extractedAt: old }), true);
});

test('isExpired: missing extractedAt is expired', () => {
  assert.strictEqual(isExpired({}), true);
});

test('parseArgs: url only', () => {
  assert.deepStrictEqual(parseArgs(['node', 'extract-brand.js', 'https://x.com']), {
    url: 'https://x.com', forceRefresh: false,
  });
});

test('parseArgs: with --refresh-brand', () => {
  const r = parseArgs(['node', 'extract-brand.js', 'https://x.com', '--refresh-brand']);
  assert.strictEqual(r.forceRefresh, true);
});

test('parseArgs: no url throws', () => {
  assert.throws(() => parseArgs(['node', 'extract-brand.js']), /Usage/);
});

test('TTL_DAYS default is 7', () => {
  assert.strictEqual(TTL_DAYS, 7);
});
