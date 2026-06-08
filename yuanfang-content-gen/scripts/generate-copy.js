#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getProvider, detectProvider } = require('./llm-providers');
const { validateCopyMd, loadSchema } = require('./validate-copy');

function parseArgs() {
  const args = { platforms: [], variants: 1, autoRewrite: false };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if      (a === '--content')       args.content = argv[++i];
    else if (a === '--platform')      { args.platforms.push(argv[++i]); }
    else if (a === '--platforms')     { args.platforms = argv[++i].split(',').map(s => s.trim()); }
    else if (a === '--variants')      { args.variants = parseInt(argv[++i], 10) || 1; }
    else if (a === '--output')        { args.output = argv[++i]; }
    else if (a === '--llm')           { args.llm = argv[++i]; }
    else if (a === '--auto-rewrite')  { args.autoRewrite = true; }
    else if (a === '--help' || a === '-h') {
      const text = fs.readFileSync(__filename, 'utf-8');
      console.log(text.split('\n').slice(1, 16).join('\n'));
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
  const facts = {
    title: '',
    body: content.body,
    brand_name: '',
    category: '',
    point1: '', point2: '', point3: '',
    cta: '',
    lead_in: '',
    pain: '',
    tags: [],
  };

  const headings = content.body.split('\n').filter(l => l.startsWith('#')).map(l => l.replace(/^#+\s*/, '').trim());
  if (headings[0]) facts.title = headings[0];
  if (!facts.title && content.fm.title) facts.title = content.fm.title;

  const sections = {};
  let cur = '';
  for (const line of content.body.split('\n')) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) { cur = h[1].trim(); sections[cur] = []; }
    else if (cur) sections[cur].push(line);
  }
  const get = k => (sections[k] || []).join(' ').trim();

  facts.cta = get('CTA') || get('行动号召') || '';
  facts.brand_name = (content.fm.brand || content.fm.brand_name || get('产品') || '').trim();
  facts.category = (content.fm.category || '').trim();

  const points = (sections['要点'] || sections['亮点'] || []).filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim());
  facts.point1 = points[0] || '';
  facts.point2 = points[1] || '';
  facts.point3 = points[2] || '';
  if (facts.brand_name) facts.lead_in = `我刚刚体验了 ${facts.brand_name}`;
  if (facts.brand_name) facts.pain = `${facts.brand_name}用起来很复杂`;
  if (facts.tags && facts.tags.length) facts.tags = facts.tags;
  return facts;
}

function buildSystemPrompt(platform, schema) {
  return [
    `你是一名中文 ${platform} 平台的资深内容创作者。`,
    `你的写作人设：${schema.persona || '专业、克制、有理有据'}`,
    `你的标题偏好（按平台调性）：${(schema.title_formula || []).join(' | ') || '无'}`,
    `你的写作规则：${(schema.rules || []).join('；') || '无'}`,
    `严格要求：禁用广告法绝对化词（最佳/最/第一/100%等），禁用 AI 味词（震惊、深度、颠覆、绝绝子等），标题 ≤ 20 字（小红书）。`,
    `输出必须是合法 JSON，不要任何解释或 markdown 包裹。`,
  ].join('\n');
}

function buildUserPrompt(platform, schema, facts, variant) {
  const angles = ['真实体验角度', '痛点共鸣角度', '好奇心钩子角度'];
  const angle = angles[variant % angles.length];
  return JSON.stringify({
    platform,
    persona: schema.persona,
    title_formula: schema.title_formula || [],
    rules: schema.rules || [],
    facts,
    variant,
    angle,
    instruction: `请基于以下事实，生成 ${platform} 平台的文案。角度：${angle}。title 必须从 title_formula 里选一个填具体词，body 真实可信、有人设口吻。`,
  });
}

function parseJsonFromLlm(text) {
  let t = text.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fenced) t = fenced[1];
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

function renderCopyMd(platform, schema, copy) {
  const fmLines = [`platform: ${platform}`];
  if (copy.title) fmLines.push(`title: ${copy.title}`);
  if (copy.cta)   fmLines.push(`cta: ${copy.cta}`);
  if (copy.meta)  fmLines.push(`meta: ${copy.meta}`);
  if (copy.tags && copy.tags.length) {
    fmLines.push('tags:');
    for (const t of copy.tags) fmLines.push(`  - ${t}`);
  }
  if (copy.lead) {
    fmLines.push('lead: |');
    for (const l of copy.lead.split('\n')) fmLines.push(`  ${l}`);
  }
  if (copy.outline && copy.outline.length) {
    fmLines.push('outline:');
    for (const o of copy.outline) fmLines.push(`  - ${o}`);
  }
  if (copy.key_points && copy.key_points.length) {
    fmLines.push('key_points:');
    for (const k of copy.key_points) fmLines.push(`  - ${k}`);
  }
  const body = copy.body || copy.text || '';
  const fmBlock = ['---', ...fmLines, '---'].join('\n');
  return `${fmBlock}\n\n${body}\n`;
}

async function generateOne(provider, platform, content, variant) {
  const schema = loadSchema(platform);
  if (!schema) throw new Error(`unknown platform: ${platform}`);
  const facts = bodyToFacts(content);
  const system = buildSystemPrompt(platform, schema);
  const prompt = buildUserPrompt(platform, schema, facts, variant);
  const text = await provider.complete({ system, prompt, maxTokens: 1500 });
  return parseJsonFromLlm(text);
}

async function writeCopyFile(outDir, platform, schema, copy, variant) {
  fs.mkdirSync(outDir, { recursive: true });
  const filename = variant > 0 ? `copy_v${variant + 1}.md` : 'copy.md';
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, renderCopyMd(platform, schema, copy), 'utf-8');
  return filePath;
}

async function main() {
  const args = parseArgs();
  const content = parseContentMd(args.content);
  const provider = getProvider({ name: args.llm });
  console.error(`[generate-copy] llm=${provider.name}  variants=${args.variants}  autoRewrite=${args.autoRewrite}`);
  console.error(`[generate-copy] content: ${args.content}`);

  const sessionDir = args.output || path.join(path.dirname(args.content), 'output');
  fs.mkdirSync(sessionDir, { recursive: true });

  let totalOk = 0, totalFail = 0;

  for (const platform of args.platforms) {
    const outDir = path.join(sessionDir, platform);
    console.error(`\n[${platform}] generating ${args.variants} variant(s)…`);

    for (let v = 0; v < args.variants; v++) {
      let copy, filePath, result;
      let attempts = 0;
      const maxAttempts = args.autoRewrite && provider.name !== 'template' ? 3 : 1;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          copy = await generateOne(provider, platform, content, v);
          filePath = await writeCopyFile(outDir, platform, loadSchema(platform), copy, v);
          result = validateCopyMd(filePath);
          if (result.ok) break;
          if (attempts < maxAttempts) {
            console.error(`  ⚠ v${v + 1} attempt ${attempts} failed validation: ${result.errors[0]}. retrying…`);
          }
        } catch (e) {
          if (attempts >= maxAttempts) {
            console.error(`  ✗ v${v + 1} ERROR: ${e.message.slice(0, 120)}`);
            totalFail++;
            break;
          }
          console.error(`  ⚠ v${v + 1} attempt ${attempts} threw: ${e.message.slice(0, 80)}. retrying…`);
        }
      }

      if (result && result.ok) {
        console.error(`  ✓ v${v + 1} ${path.basename(filePath)} — ${result.score.total}/${result.score.max}`);
        if (result.warnings.length) console.error(`    ⚠ ${result.warnings[0]}`);
        totalOk++;
      } else if (result) {
        console.error(`  ✗ v${v + 1} ${path.basename(filePath)} — ${result.errors.join('; ')}`);
        totalFail++;
      }
    }
  }

  console.error(`\n[generate-copy] done: ${totalOk} ok, ${totalFail} failed`);
  process.exit(totalFail > 0 ? 1 : 0);
}

if (require.main === module) main();
