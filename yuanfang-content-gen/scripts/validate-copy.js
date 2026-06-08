#!/usr/bin/env node
/**
 * validate-copy.js — 验证 copy.md 是否符合平台模板要求
 *
 * Usage:
 *   node scripts/validate-copy.js <path-to-copy.md>
 *   node scripts/validate-copy.js output/20260608_AICS/小红书/copy.md
 *
 * 检查项：
 *   - YAML frontmatter 是否存在
 *   - platform 字段是否匹配
 *   - 该平台所有 required 字段是否存在
 *   - 特定平台的额外约束（长度、标签数量等）
 *
 * Exit code 0 = 通过，1 = 有错误
 */

const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = path.join(__dirname, '..', 'schemas');

// 从 schema 文件中提取 required 字段列表
function loadSchema(platform) {
  const schemaPath = path.join(SCHEMAS_DIR, `${platform}.md`);
  if (!fs.existsSync(schemaPath)) return null;
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const fm = parseFrontmatter(content);
  return fm || null;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]+?)\n---\n/);
  if (!m) return null;
  const lines = m[1].split('\n');
  const result = {};
  let currentKey = null;
  let currentArray = [];
  let inArray = false;

  for (const line of lines) {
    if (inArray) {
      const am = line.match(/^\s+-\s+(.+)/);
      if (am) {
        currentArray.push(am[1].trim());
        continue;
      } else {
        result[currentKey] = currentArray;
        currentArray = [];
        inArray = false;
      }
    }
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (kv) {
      currentKey = kv[1];
      const val = kv[2].trim();
      if (val.startsWith('[]')) {
        result[currentKey] = [];
      } else if (val === '') {
        inArray = true;
        currentArray = [];
      } else {
        result[currentKey] = val;
      }
    }
  }
  if (inArray && currentKey) {
    result[currentKey] = currentArray;
  }
  return result;
}

// 提取 YAML frontmatter 和 body
function splitCopyMd(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const fm = parseFrontmatter(text);
  const body = text.replace(/^---[\s\S]*?---\n/, '').trim();
  return { fm, body };
}

// AI 味关键词 + 机械序列（来自 cnblogs 降 AI 指南）
const AI_FLAVOR_PHRASES = [
  '综上所述',
  '值得注意的是',
  '随着科技的发展',
  '随着互联网的发展',
  '在当今社会',
  '首先、其次、最后',
  '首先,其次,最后',
  '真的太好用了',
  'YYDS',
  '绝绝子',
  '家人们谁懂啊',
  '众所周知',
  '总而言之',
  '不仅如此',
  '更加重要的是',
];

// 机械序列检测：先/其次/再次/最后 中出现 3 个及以上
const MECHANICAL_SEQ = /(首先|第一)[,，、\s].*?(其次|第二)[,，、\s].*?(然后|再次|第三|接着|最后)/;

const SENSITIVE_WORDS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'sensitive-words.json'), 'utf-8')
);

function checkSensitiveWords(platform, body) {
  const errors = [];
  const warnings = [];
  for (const w of SENSITIVE_WORDS.t1_hard_forbidden.matches) {
    if (body.includes(w)) errors.push(`T1 硬违禁词: "${w}" — 任何平台都不能用`);
  }
  const platformRules = SENSITIVE_WORDS.t2_platform_sensitive[platform];
  if (platformRules) {
    for (const w of platformRules.matches) {
      if (body.includes(w)) errors.push(`T2 平台敏感词 [${platform}]: "${w}" — 此平台不能发`);
    }
  }
  for (const w of SENSITIVE_WORDS.t3_soft_risk.matches) {
    if (body.includes(w)) warnings.push(`T3 软风险词: "${w}" — 建议补证据或换中性词`);
  }
  return { errors, warnings };
}

function scoreCompliance(platform, fm, body, title, filePath, schema) {
  const dims = {};

  dims.legal = 10;
  for (const w of SENSITIVE_WORDS.t1_hard_forbidden.matches) {
    if (body.includes(w)) dims.legal = Math.max(0, dims.legal - 3);
  }
  for (const w of SENSITIVE_WORDS.t3_soft_risk.matches) {
    if (body.includes(w)) dims.legal = Math.max(0, dims.legal - 1);
  }

  dims.platform_fit = 10;
  const platformRules = SENSITIVE_WORDS.t2_platform_sensitive[platform];
  if (platformRules) {
    for (const w of platformRules.matches) {
      if (body.includes(w)) dims.platform_fit = Math.max(0, dims.platform_fit - 5);
    }
  }
  const lenRule = COMMON_TITLE_RULES[platform] || {};
  if (title && !lenRule.skip) {
    if (lenRule.maxLen && title.length > lenRule.maxLen) dims.platform_fit -= 2;
    if (lenRule.minLen && title.length < lenRule.minLen) dims.platform_fit -= 2;
    if (lenRule.requireEmoji && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(title)) dims.platform_fit -= 3;
    if (lenRule.requireQuestionMark && !title.includes('？') && !title.includes('?')) dims.platform_fit -= 2;
  }

  dims.humanness = 10;
  const aiHits = checkAIFlavor(body);
  dims.humanness = Math.max(0, 10 - aiHits.length * 2);

  dims.cta = 10;
  if (schema.required && schema.required.includes('cta')) {
    if (fm && fm.cta) {
      if (typeof fm.cta === 'string' && fm.cta.length < 5) dims.cta -= 5;
    } else {
      dims.cta = 0;
    }
  }

  dims.structure = 10;
  if (!body || body.length < 50) dims.structure -= 4;
  if (body && body.length > 50 && !/[。！？\n]/.test(body)) dims.structure -= 3;

  dims.uniqueness = 10;
  const myDir = path.dirname(filePath);
  const parentDir = path.dirname(myDir);
  if (fs.existsSync(parentDir) && fs.statSync(parentDir).isDirectory()) {
    const sibs = fs.readdirSync(parentDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== path.basename(myDir))
      .map(d => path.join(parentDir, d.name, 'copy.md'))
      .filter(p => fs.existsSync(p) && p !== filePath);
    for (const s of sibs) {
      const sibText = fs.readFileSync(s, 'utf-8');
      const sibBody = sibText.replace(/^---[\s\S]*?---\n/, '').trim();
      const short = body.length <= sibBody.length ? body : sibBody;
      const long = body.length <= sibBody.length ? sibBody : body;
      if (long.includes(short) && short.length >= 30) dims.uniqueness = Math.max(0, dims.uniqueness - 4);
    }
  }

  for (const k of Object.keys(dims)) dims[k] = Math.max(0, Math.min(10, dims[k]));

  const total = Object.values(dims).reduce((a, b) => a + b, 0);
  return { dims, total, max: 60 };
}

function checkAIFlavor(body) {
  const hits = [];
  for (const phrase of AI_FLAVOR_PHRASES) {
    if (body.includes(phrase)) hits.push(phrase);
  }
  if (MECHANICAL_SEQ.test(body)) hits.push('机械序列(首先/其次/最后)');
  return hits;
}

const BANNED_TITLE_WORDS = ['震惊', '颠覆', '深度好文', '好用到哭', '绝绝子', 'YYDS', '速看', '不转不是', '不看后悔'];
const COMMON_TITLE_RULES = {
  xiaohongshu: { maxLen: 20, requireEmoji: true },
  wechat:     { minLen: 15, maxLen: 25 },
  toutiao:    { minLen: 18, maxLen: 28, preferDigit: true },
  zhihu:      { requireQuestionMark: true },
  moments:    { skip: true },
  'weibo-micro': { skip: true },
};

function checkTitleFormula(platform, title) {
  const warnings = [];
  if (!title) return warnings;
  const rules = COMMON_TITLE_RULES[platform] || {};
  if (rules.skip) return warnings;

  if (rules.maxLen && title.length > rules.maxLen) {
    warnings.push(`标题偏长 (${title.length} 字)，${platform} 建议 ≤ ${rules.maxLen} 字`);
  }
  if (rules.minLen && title.length < rules.minLen) {
    warnings.push(`标题偏短 (${title.length} 字)，${platform} 建议 ≥ ${rules.minLen} 字`);
  }
  if (rules.requireEmoji && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(title)) {
    warnings.push(`标题缺少 emoji (${platform} 强制要求)`);
  }
  if (rules.requireQuestionMark && !title.includes('？') && !title.includes('?')) {
    warnings.push(`知乎标题应以问号结尾`);
  }
  if (rules.preferDigit && !/\d/.test(title)) {
    warnings.push(`头条标题建议含具体数字（当前无数字）`);
  }
  for (const w of BANNED_TITLE_WORDS) {
    if (title.includes(w)) warnings.push(`标题含 AI/震惊体词: "${w}"`);
  }
  return warnings;
}

// 平台特定验证
function platformSpecificChecks(platform, fm, body) {
  const errors = [];
  const warnings = [];

  switch (platform) {
    case 'xiaohongshu': {
      const tags = (fm.tags || []);
      if (tags.length < 3) errors.push(`小红书需要至少 3 个话题标签，当前 ${tags.length} 个`);
      if (tags.length > 6) warnings.push(`小红书推荐 3-5 个话题标签，当前 ${tags.length} 个`);
      if (body.length < 100) warnings.push(`小红书正文偏短 (${body.length} 字)，推荐 300-800 字`);
      break;
    }
    case 'moments': {
      const sentences = body.split(/[。！？\n]/).filter(s => s.trim());
      if (sentences.length > 5) warnings.push(`朋友圈推荐 1-3 句，当前 ${sentences.length} 句`);
      if (body.length > 200) warnings.push(`朋友圈推荐不超过 200 字，当前 ${body.length} 字`);
      break;
    }
    case 'weibo-micro': {
      if (body.length < 100) warnings.push(`微头条推荐 140-300 字，当前 ${body.length} 字`);
      if (body.length > 500) warnings.push(`微头条推荐不超过 300 字，当前 ${body.length} 字`);
      break;
    }
    case 'wechat': {
      if (!fm.lead || fm.lead.length < 50) warnings.push('公众号引子 (lead) 推荐至少 100 字');
      const outline = fm.outline || [];
      if (outline.length < 2) warnings.push(`公众号大纲 (outline) 推荐 3-5 点，当前 ${outline.length} 点`);
      break;
    }
    case 'zhihu': {
      const kp = fm.key_points || [];
      if (kp.length < 2) warnings.push(`知乎关键点 (key_points) 推荐 3-5 点，当前 ${kp.length} 点`);
      break;
    }
  }

  return { errors, warnings };
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node validate-copy.js <path-to-copy.md>');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const { fm, body } = splitCopyMd(filePath);
  if (!fm || !fm.platform) {
    console.error(`  ✗ ${path.basename(filePath)}: 缺少 YAML frontmatter 或 platform 字段`);
    process.exit(1);
  }

  const platform = fm.platform;
  const schema = loadSchema(platform);
  if (!schema) {
    console.error(`  ✗ ${path.basename(filePath)}: 未知平台 "${platform}"`);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  // 检查 required 字段
  // body/text 可以从 markdown 正文获取，不强制在 frontmatter 中
  const BODY_ALIASES = ['body', 'text'];
  const required = schema.required || [];
  for (const field of required) {
    let val = fm[field];
    // body/text 字段：优先 frontmatter，fallback 到 markdown 正文
    if (BODY_ALIASES.includes(field) && (!val || val === '')) {
      val = body;
    }
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
      errors.push(`缺少必填字段 "${field}"`);
    }
  }

  // 平台特定检查
  const pc = platformSpecificChecks(platform, fm, body);
  errors.push(...pc.errors);
  warnings.push(...pc.warnings);

  const sw = checkSensitiveWords(platform, body);
  errors.push(...sw.errors);
  warnings.push(...sw.warnings);

  const titleWarnings = checkTitleFormula(platform, fm.title);
  warnings.push(...titleWarnings);

  const aiHits = checkAIFlavor(body);
  if (aiHits.length > 0) {
    warnings.push(`检测到 AI 味句式/词汇: ${aiHits.slice(0, 3).join('、')}${aiHits.length > 3 ? ' 等' : ''}`);
  }

  const myDir = path.dirname(filePath);
  const parentDir = path.dirname(myDir);
  if (fs.existsSync(parentDir) && fs.statSync(parentDir).isDirectory()) {
    const siblings = fs.readdirSync(parentDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== path.basename(myDir))
      .map(d => path.join(parentDir, d.name, 'copy.md'))
      .filter(p => fs.existsSync(p));
    if (siblings.length > 0) {
      for (const sibPath of siblings) {
        const sibText = fs.readFileSync(sibPath, 'utf-8');
        const sibBody = sibText.replace(/^---[\s\S]*?---\n/, '').trim();
        const short = body.length <= sibBody.length ? body : sibBody;
        const long = body.length <= sibBody.length ? sibBody : body;
        if (long.includes(short) && short.length >= 30) {
          warnings.push(`与 "${path.basename(path.dirname(sibPath))}" 平台存在 ${short.length} 字完全重复片段，建议改写`);
        }
      }
    }
  }

  const score = scoreCompliance(platform, fm, body, fm.title, filePath, schema);

  const label = path.basename(filePath);
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`  ✓ ${label} (${platform}) — 通过`);
  } else {
    for (const e of errors) console.error(`  ✗ ${label}: ${e}`);
    for (const w of warnings) console.error(`  ⚠ ${label}: ${w}`);
  }
  const dimStr = Object.entries(score.dims).map(([k, v]) => `${k}=${v}`).join(' ');
  console.error(`  📊 合规分: ${score.total}/${score.max} (${dimStr})`);
  process.exit(errors.length > 0 ? 1 : 0);
}

function validateCopyMd(filePath) {
  const { fm, body } = splitCopyMd(filePath);
  if (!fm || !fm.platform) return { ok: false, errors: ['缺少 frontmatter 或 platform'], warnings: [], score: null };
  const platform = fm.platform;
  const schema = loadSchema(platform);
  if (!schema) return { ok: false, errors: [`未知平台 "${platform}"`], warnings: [], score: null };

  const errors = [];
  const warnings = [];
  const BODY_ALIASES = ['body', 'text'];
  const required = schema.required || [];
  for (const field of required) {
    let val = fm[field];
    if (BODY_ALIASES.includes(field) && (!val || val === '')) val = body;
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
      errors.push(`缺少必填字段 "${field}"`);
    }
  }

  const pc = platformSpecificChecks(platform, fm, body);
  errors.push(...pc.errors);
  warnings.push(...pc.warnings);

  const sw = checkSensitiveWords(platform, body);
  errors.push(...sw.errors);
  warnings.push(...sw.warnings);

  const titleWarnings = checkTitleFormula(platform, fm.title);
  warnings.push(...titleWarnings);

  const aiHits = checkAIFlavor(body);
  if (aiHits.length > 0) {
    warnings.push(`检测到 AI 味句式/词汇: ${aiHits.slice(0, 3).join('、')}${aiHits.length > 3 ? ' 等' : ''}`);
  }

  const score = scoreCompliance(platform, fm, body, fm.title, filePath, schema);

  return { ok: errors.length === 0, errors, warnings, score, platform, fm, body };
}

module.exports = { validateCopyMd, scoreCompliance, checkSensitiveWords, checkAIFlavor, checkTitleFormula, loadSchema, parseFrontmatter, splitCopyMd };

if (require.main === module) main();
