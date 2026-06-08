#!/usr/bin/env node
// Build per-platform copy prompts from a content brief + platform schemas.
// The agent reads the prompts, calls its own LLM, writes copy.md, then
// runs validate-copy.js to score. No external API key required.
//
// Usage:
//   node scripts/generate-copy.js --content brief.md --platforms xiaohongshu,wechat
//   node scripts/generate-copy.js --content brief.md --platforms xiaohongshu --variants 3
//   node scripts/generate-copy.js --content brief.md --platforms xiaohongshu --print-prompts
//     # agent reads prompts, writes copy.md, then runs:
//     node scripts/validate-copy.js output/.../xiaohongshu/copy.md

const fs = require('fs');
const path = require('path');
const { loadSchema } = require('./validate-copy');

const ANGLES = ['真实体验角度', '痛点共鸣角度', '好奇心钩子角度'];

function parseArgs() {
  const args = { platforms: [], variants: 1, printPrompts: false };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if      (a === '--content')      args.content = argv[++i];
    else if (a === '--platform')     { args.platforms.push(argv[++i]); }
    else if (a === '--platforms')    { args.platforms = argv[++i].split(',').map(s => s.trim()); }
    else if (a === '--variants')     { args.variants = parseInt(argv[++i], 10) || 1; }
    else if (a === '--output')       { args.output = argv[++i]; }
    else if (a === '--print-prompts'){ args.printPrompts = true; }
    else if (a === '--help' || a === '-h') {
      const text = fs.readFileSync(__filename, 'utf-8');
      console.log(text.split('\n').slice(1, 12).join('\n'));
      process.exit(0);
    }
  }
  if (!args.content) throw new Error('--content <path> required');
  if (args.platforms.length === 0) throw new Error('--platforms a,b,c required');
  return args;
}

function parseContentMd(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const fm = {};
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  let body = raw;
  if (m) {
    body = m[2].trim();
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
      if (kv) fm[kv[1]] = kv[2].trim();
    }
  }
  return { fm, body };
}

function bodyToFacts(content) {
  const headings = content.body.split('\n')
    .filter(l => l.startsWith('#'))
    .map(l => l.replace(/^#+\s*/, '').trim());
  const title = headings[0] || content.fm.title || '';

  const sections = {};
  let cur = '';
  for (const line of content.body.split('\n')) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) { cur = h[1].trim(); sections[cur] = []; }
    else if (cur) sections[cur].push(line);
  }
  const get = k => (sections[k] || []).join(' ').trim();

  const points = (sections['要点'] || sections['亮点'] || [])
    .filter(l => l.trim().startsWith('-'))
    .map(l => l.replace(/^-\s*/, '').trim());

  return {
    title,
    brand_name:  content.fm.brand || content.fm.brand_name || get('产品') || '',
    category:    content.fm.category || '',
    body:        content.body,
    cta:         get('CTA') || get('行动号召') || '',
    point1: points[0] || '',
    point2: points[1] || '',
    point3: points[2] || '',
  };
}

function buildSystemPrompt(platform, schema) {
  return [
    `你是一名中文 ${platform} 平台的资深内容创作者。`,
    `人设：${schema.persona || '专业、克制、有理有据'}`,
    `标题偏好：${(schema.title_formula || []).join(' | ') || '无'}`,
    `写作规则：${(schema.rules || []).join('；') || '无'}`,
    `严格禁用：广告法绝对化词（最佳/最/第一/100%等）、AI 味词（震惊、深度、颠覆、绝绝子等）。`,
    `输出：合法 JSON，无 markdown 包裹。`,
  ].join('\n');
}

const OUTPUT_SHAPES = {
  xiaohongshu:   'title, body, tags (3-5 个), cta',
  wechat:        'title, lead (200 字引子), outline (3-5 条大纲), cta, body (完整文章)',
  toutiao:       'title, meta (一句话描述), body (300-500 字), cta',
  zhihu:         'title, body, key_points (3-5 点), cta',
  moments:       'text (1-3 句, ≤60 字)',
  'weibo-micro': 'text (140-300 字)',
};

function buildUserPrompt(platform, schema, facts, variant) {
  const angle = ANGLES[variant % ANGLES.length];
  return JSON.stringify({
    platform,
    angle,
    facts: {
      title: facts.title,
      brand: facts.brand_name,
      category: facts.category,
      cta: facts.cta,
      points: [facts.point1, facts.point2, facts.point3].filter(Boolean),
      body: facts.body,
    },
    title_formula: schema.title_formula || [],
    rules: schema.rules || [],
    output_shape: OUTPUT_SHAPES[platform] || 'title, body, cta',
  }, null, 2);
}

function main() {
  const args = parseArgs();
  const content = parseContentMd(args.content);
  const facts = bodyToFacts(content);

  if (args.printPrompts) {
    for (const platform of args.platforms) {
      const schema = loadSchema(platform);
      if (!schema) {
        console.error(`! unknown platform: ${platform}`);
        continue;
      }
      console.log(`\n========== ${platform} (${args.variants} variant${args.variants > 1 ? 's' : ''}) ==========`);
      for (let v = 0; v < args.variants; v++) {
        console.log(`\n----- variant ${v + 1} -----`);
        console.log('SYSTEM:');
        console.log(buildSystemPrompt(platform, schema));
        console.log('\nUSER:');
        console.log(buildUserPrompt(platform, schema, facts, v));
      }
    }
    return;
  }

  const outDir = args.output || path.join(path.dirname(args.content), 'output');
  fs.mkdirSync(outDir, { recursive: true });
  for (const p of args.platforms) fs.mkdirSync(path.join(outDir, p), { recursive: true });

  console.log(`# generate-copy — agent-driven`);
  console.log(`content: ${args.content}`);
  console.log(`platforms: ${args.platforms.join(', ')}`);
  console.log(`variants per platform: ${args.variants}`);
  console.log(`output: ${outDir}`);
  console.log(`\n# To generate, run with --print-prompts and feed each prompt to your LLM.`);
  console.log(`# Then write the LLM's JSON output as copy.md in each platform dir.`);
  console.log(`# Finally validate:`);
  console.log(`for p in ${args.platforms.map(p => `${outDir}/${p}`).join(' ')}; do node scripts/validate-copy.js $p/copy.md; done`);
}

if (require.main === module) main();
