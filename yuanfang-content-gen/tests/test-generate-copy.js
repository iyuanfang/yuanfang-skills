#!/usr/bin/env node
// Test generate-copy.js: template mode + the 6 platform schemas.
// Run: node tests/test-generate-copy.js
//
// Asserts:
//   - exit 0
//   - all 6 platforms produce at least 1 valid copy.md
//   - title < 30 chars (sanity)
//   - score >= 35 (template mode is fallback; uniqueness=0 by design)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'generate-copy.js');
const TMP = '/tmp/test-generate-copy-out';
const BRIEF = '/tmp/test-generate-copy-brief.md';

const PLATFORMS = ['xiaohongshu', 'moments', 'wechat', 'zhihu', 'toutiao', 'weibo-micro'];

const BRIEF_CONTENT = `---
brand: TestBrand
category: AI 工具
---

# TestBrand 介绍

## 核心信息
TestBrand 让 AI 工具门槛降到 0

## 正文
TestBrand 是一款 AI 工具。它的核心亮点是易用、稳定、免费。

## 要点
- 易用
- 稳定
- 免费

## CTA
立即体验
`;

let pass = 0, fail = 0;

function assert(cond, label) {
  if (cond) { console.log(`  ✓ ${label}`); pass++; }
  else      { console.error(`  ✗ ${label}`); fail++; }
}

function run() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.writeFileSync(BRIEF, BRIEF_CONTENT);

  const cmd = `node "${SCRIPT}" --content "${BRIEF}" --platforms ${PLATFORMS.join(',')} --output "${TMP}" --variants 1`;
  console.log(`$ ${cmd}`);
  let exit = 0;
  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (e) {
    exit = e.status || 1;
  }
  assert(exit === 0, `generate-copy exits 0 (got ${exit})`);

  for (const p of PLATFORMS) {
    const f = path.join(TMP, p, 'copy.md');
    const exists = fs.existsSync(f);
    assert(exists, `[${p}] copy.md exists`);
    if (!exists) continue;

    const text = fs.readFileSync(f, 'utf-8');
    const m = text.match(/^---\n([\s\S]+?)\n---/);
    assert(!!m, `[${p}] has frontmatter`);
    const fm = m ? m[1] : '';
    const titleMatch = fm.match(/^title:\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '';
    assert(title.length > 0 && title.length <= 30, `[${p}] title plausible (got "${title.slice(0, 20)}…")`);

    const { spawnSync } = require('child_process');
    const r = spawnSync('node', [path.join(__dirname, '..', 'scripts', 'validate-copy.js'), f], { encoding: 'utf-8' });
    const allOut = (r.stdout || '') + (r.stderr || '');
    const scoreMatch = allOut.match(/(\d+)\/60/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    assert(score >= 35, `[${p}] score >= 35 (got ${score})`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
