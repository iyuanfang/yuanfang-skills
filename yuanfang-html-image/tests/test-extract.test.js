const { test } = require('node:test');
const assert = require('node:assert');
const {
  htmlDecode,
  getMetaContent,
  getLinkHref,
  stripTags,
  extractTitle,
  extractBody,
  extractBrand,
  extractBrandImage,
  extractPoints,
  extractFromHtml,
  extractFromText,
  parseArgs,
} = require('../scripts/extract.js');

test('htmlDecode: common entities', () => {
  assert.strictEqual(htmlDecode('A &amp; B'), 'A & B');
  assert.strictEqual(htmlDecode('&lt;tag&gt;'), '<tag>');
  assert.strictEqual(htmlDecode('&quot;hi&quot;'), '"hi"');
  assert.strictEqual(htmlDecode('&#39;hi&#39;'), "'hi'");
  assert.strictEqual(htmlDecode('&nbsp;x'), ' x');
});

test('htmlDecode: numeric and hex entities', () => {
  assert.strictEqual(htmlDecode('&#65;'), 'A');
  assert.strictEqual(htmlDecode('&#x41;'), 'A');
});

test('htmlDecode: empty/null passthrough', () => {
  assert.strictEqual(htmlDecode(''), '');
  assert.strictEqual(htmlDecode(null), null);
});

test('getMetaContent: name + content order', () => {
  const html = '<meta name="description" content="desc1">';
  assert.strictEqual(getMetaContent(html, 'description'), 'desc1');
});

test('getMetaContent: content + name order', () => {
  const html = '<meta content="desc2" name="description">';
  assert.strictEqual(getMetaContent(html, 'description'), 'desc2');
});

test('getMetaContent: og:title', () => {
  const html = '<meta property="og:title" content="og-title-here">';
  assert.strictEqual(getMetaContent(html, 'title'), 'og-title-here');
});

test('getMetaContent: missing returns null', () => {
  assert.strictEqual(getMetaContent('<html></html>', 'nope'), null);
});

test('getLinkHref: rel before href', () => {
  const html = '<link rel="icon" href="/favicon.ico">';
  assert.strictEqual(getLinkHref(html, 'icon'), '/favicon.ico');
});

test('getLinkHref: href before rel', () => {
  const html = '<link href="/favicon.ico" rel="icon">';
  assert.strictEqual(getLinkHref(html, 'icon'), '/favicon.ico');
});

test('getLinkHref: missing returns null', () => {
  assert.strictEqual(getLinkHref('<html></html>', 'icon'), null);
});

test('stripTags: removes HTML', () => {
  assert.strictEqual(stripTags('<p>Hello <b>World</b></p>'), 'Hello World');
});

test('stripTags: collapses whitespace', () => {
  assert.strictEqual(stripTags('<div>  a\n  b  </div>'), 'a b');
});

test('extractFromHtml: og meta tags win over h1', () => {
  const html = `
    <html>
    <head>
      <meta property="og:title" content="OG Title">
      <meta property="og:description" content="OG Desc">
      <meta property="og:site_name" content="OG Site">
      <meta property="og:image" content="https://x.com/logo.png">
    </head>
    <body><h1>Should not win</h1></body>
    </html>`;
  const r = extractFromHtml(html, 'https://x.com/');
  assert.strictEqual(r.title, 'OG Title');
  assert.strictEqual(r.body, 'OG Desc');
  assert.strictEqual(r.brand, 'OG Site');
  assert.strictEqual(r.brandImage, 'https://x.com/logo.png');
});

test('extractFromHtml: falls back to h1 and <p>', () => {
  const html = '<html><body><h1>H1 Title</h1><p>Body text</p></body></html>';
  const r = extractFromHtml(html, 'https://x.com/');
  assert.strictEqual(r.title, 'H1 Title');
  assert.strictEqual(r.body, 'Body text');
});

test('extractFromHtml: brand from hostname when no og:site_name', () => {
  const html = '<html><body><h1>X</h1></body></html>';
  const r = extractFromHtml(html, 'https://www.example.com/');
  assert.strictEqual(r.brand, 'example.com');
});

test('extractFromHtml: brandImage from apple-touch-icon', () => {
  const html = '<html><head><link rel="apple-touch-icon" href="/apple.png"></head></html>';
  const r = extractFromHtml(html, 'https://x.com/');
  assert.strictEqual(r.brandImage, '/apple.png');
});

test('extractFromHtml: points from <ul><li>', () => {
  const html = '<html><body><ul><li>a</li><li>b</li><li>c</li></ul></body></html>';
  assert.deepStrictEqual(extractFromHtml(html, '').points, ['a', 'b', 'c']);
});

test('extractFromHtml: points limited to 3', () => {
  const html = '<ul><li>a</li><li>b</li><li>c</li><li>d</li><li>e</li></ul>';
  const r = extractFromHtml(html, '');
  assert.strictEqual(r.points.length, 3);
  assert.deepStrictEqual(r.points, ['a', 'b', 'c']);
});

test('extractFromHtml: points fallback to h2/h3 when no list', () => {
  const html = '<h2>One</h2><h2>Two</h2><h2>Three</h2>';
  assert.deepStrictEqual(extractFromHtml(html, '').points, ['One', 'Two', 'Three']);
});

test('extractFromHtml: long points skipped', () => {
  const html = '<ul><li>short</li><li>' + 'x'.repeat(100) + '</li><li>also short</li></ul>';
  const r = extractFromHtml(html, '');
  assert.deepStrictEqual(r.points, ['short', 'also short']);
});

test('extractFromHtml: empty html returns empty object', () => {
  const r = extractFromHtml('', '');
  assert.strictEqual(r.title, '');
  assert.strictEqual(r.body, '');
  assert.deepStrictEqual(r.points, []);
});

test('extractFromText: simple format', () => {
  const text = `Title
Body line
- p1
- p2
- p3`;
  const r = extractFromText(text);
  assert.strictEqual(r.title, 'Title');
  assert.strictEqual(r.body, 'Body line');
  assert.deepStrictEqual(r.points, ['p1', 'p2', 'p3']);
});

test('extractFromText: brand from Chinese pattern', () => {
  const text = `Title
Body
公众号: MyBrand`;
  assert.strictEqual(extractFromText(text).brand, 'MyBrand');
});

test('extractFromText: brand from English pattern', () => {
  const text = `Title
Body
by John Doe`;
  assert.strictEqual(extractFromText(text).brand, 'John Doe');
});

test('extractFromText: bullet variants', () => {
  const text = `T
B
• a
- b
* c`;
  const r = extractFromText(text);
  assert.deepStrictEqual(r.points, ['a', 'b', 'c']);
});

test('extractFromText: empty text', () => {
  const r = extractFromText('');
  assert.strictEqual(r.title, '');
  assert.strictEqual(r.body, '');
  assert.deepStrictEqual(r.points, []);
  assert.strictEqual(r.brand, '');
});

test('parseArgs: url mode', () => {
  assert.deepStrictEqual(parseArgs(['node', 'extract.js', 'https://x.com']), {
    mode: 'url', url: 'https://x.com',
  });
});

test('parseArgs: text mode', () => {
  assert.deepStrictEqual(parseArgs(['node', 'extract.js', '--text', 'hello', 'world']), {
    mode: 'text', text: 'hello world',
  });
});

test('parseArgs: file mode', () => {
  assert.deepStrictEqual(parseArgs(['node', 'extract.js', '--file', '/tmp/x.md']), {
    mode: 'file', path: '/tmp/x.md',
  });
});

test('parseArgs: no args throws', () => {
  assert.throws(() => parseArgs(['node', 'extract.js']), /Usage/);
});

test('parseArgs: --file without path throws', () => {
  assert.throws(() => parseArgs(['node', 'extract.js', '--file']), /requires/);
});
