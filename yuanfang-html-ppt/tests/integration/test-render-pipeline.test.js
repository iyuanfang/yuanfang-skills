const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const FIXTURES = path.join(__dirname, '..', 'fixtures');
const OUT_DIR = path.join(__dirname, '..', 'output');
const RENDER = path.resolve(__dirname, '..', '..', 'scripts', 'render.js');

test.before(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

for (const layout of ['cover', 'section', 'content', 'two-column', 'data', 'quote', 'summary']) {
  test(`renders ${layout} fixture to a valid .pptx`, () => {
    const fixture = path.join(FIXTURES, `content-${layout}.json`);
    const out = path.join(OUT_DIR, `out-${layout}.pptx`);
    execFileSync('node', [RENDER, '--file', fixture, '--skip-confirm', '--output', out], { stdio: 'pipe' });
    assert.ok(fs.existsSync(out), `${out} should exist`);
    const size = fs.statSync(out).size;
    assert.ok(size > 5000, `${out} size ${size} should be > 5KB`);
    const head = fs.readFileSync(out).slice(0, 2).toString();
    assert.strictEqual(head, 'PK', `${out} should be a valid zip (PK header)`);
  });
}

test('multi-page fixture produces 7-slide pptx', () => {
  const fixture = path.join(FIXTURES, 'content-multipage.json');
  const out = path.join(OUT_DIR, 'out-multipage.pptx');
  execFileSync('node', [RENDER, '--file', fixture, '--skip-confirm', '--output', out], { stdio: 'pipe' });
  const size = fs.statSync(out).size;
  assert.ok(size > 50000, `multi-page pptx size ${size} should be > 50KB`);
  const head = fs.readFileSync(out).slice(0, 2).toString();
  assert.strictEqual(head, 'PK');
});

test('hard gate rejects missing brand', () => {
  const { execFileSync: exec } = require('node:child_process');
  const tmpFile = path.join(OUT_DIR, 'no-brand.json');
  fs.writeFileSync(tmpFile, JSON.stringify({ theme: 'minimal-white', layout: 'content', title: 'Hi' }));
  let stderr = '';
  try {
    exec('node', [RENDER, '--file', tmpFile, '--skip-confirm'], { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    stderr = err.stderr ? err.stderr.toString() : '';
  }
  assert.ok(/缺少 brand 字段/.test(stderr), `expected brand error, got: ${stderr}`);
});
