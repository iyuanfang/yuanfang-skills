#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// 所有平台 → 最佳尺寸映射
const ALL_PLATFORMS = {
  // 中文社媒
  'xiaohongshu-v':    { id: 'xiaohongshu-v',    width: 1080, height: 1440, label: '小红书竖版',     tags: ['social','cn'] },
  'xiaohongshu-s':    { id: 'xiaohongshu-s',    width: 1080, height: 1080, label: '小红书方版',     tags: ['social','cn'] },
  'wechat-cover':     { id: 'wechat-cover',     width: 900,  height: 383,  label: '公众号头图',     tags: ['social','cn'] },
  'wechat-thumb':     { id: 'wechat-thumb',     width: 300,  height: 300,  label: '公众号小图',     tags: ['social','cn'] },
  'moments':          { id: 'moments',          width: 1080, height: 1080, label: '朋友圈', tags: ['social','cn'] },
  'weibo':            { id: 'weibo',            width: 1080, height: 608,  label: '微博',            tags: ['social','cn'] },
  'toutiao':          { id: 'toutiao',          width: 1080, height: 500,  label: '头条号',         tags: ['social','cn'] },
  'douyin-cover':     { id: 'douyin-cover',     width: 1080, height: 1920, label: '抖音封面',      tags: ['social','cn','video'] },
  'bilibili-cover':   { id: 'bilibili-cover',   width: 1920, height: 1080, label: 'B站封面',        tags: ['social','cn','video'] },
  // 海外
  'twitter':          { id: 'twitter',          width: 1200, height: 675,  label: 'Twitter/X',     tags: ['social','global'] },
  // 印刷
  'a4':               { id: 'a4',               width: 2480, height: 3508, label: 'A4海报(300dpi)', tags: ['print'] },
  'a3':               { id: 'a3',               width: 3508, height: 4960, label: 'A3海报(300dpi)', tags: ['print'] },
};

const GROUPS = {
  'xiaohongshu':   ['xiaohongshu-v', 'xiaohongshu-s'],
  'wechat':        ['wechat-cover', 'wechat-thumb', 'moments'],
};

function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) {
        args[key] = process.argv[++i];
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function loadContent(args) {
  if (args.file) {
    const raw = JSON.parse(fs.readFileSync(args.file, 'utf-8'));
    // Support both old format and new format with platforms
    return raw;
  }
  return {
    title: args.title || '',
    body: args.body || args.content || '',
    source: args.source || args.url || '',
    points: (args.points || '').split('|').filter(Boolean),
    platforms: args.platforms ? args.platforms.split(',').map(s => s.trim()) : undefined,
  };
}

function resolvePlatforms(content, args) {
  // Priority: CLI --platforms > content.json platforms > content.json sizes > default
  let platformIds = [];

  if (args.platforms) {
    platformIds = args.platforms.split(',').map(s => s.trim().toLowerCase());
  } else if (content.platforms && Array.isArray(content.platforms)) {
    platformIds = content.platforms.map(s => String(s).toLowerCase());
  } else if (content.sizes && Array.isArray(content.sizes)) {
    // Legacy: [{width,height}] format
    return content.sizes.map(s => ({
      id: s.id || `custom_${s.width}x${s.height}`,
      width: s.width,
      height: s.height,
      label: s.label || `${s.width}×${s.height}`,
    }));
  }

  // Resolve group aliases
  const expanded = [];
  for (const id of platformIds) {
    if (id === 'all') {
      return Object.values(ALL_PLATFORMS);
    } else if (GROUPS[id]) {
      for (const subId of GROUPS[id]) {
        if (!expanded.includes(subId)) expanded.push(subId);
      }
    } else if (ALL_PLATFORMS[id]) {
      if (!expanded.includes(id)) expanded.push(id);
    } else if (id.startsWith('custom:')) {
      // --platforms custom:800x600
      const match = id.match(/custom:(\d+)x(\d+)/i);
      if (match) {
        expanded.push({ id: `custom_${match[1]}x${match[2]}`, width: parseInt(match[1]), height: parseInt(match[2]), label: `${match[1]}×${match[2]}` });
      }
    }
  }

  if (expanded.length === 0) {
    // Default: old 5 sizes for backward compat
    return [
      { id: 'vertical', width: 1080, height: 1440, label: '3:4 竖版' },
      { id: 'square',   width: 1080, height: 1080, label: '1:1 方版' },
      { id: 'wide',     width: 1920, height: 1080, label: '16:9 横版' },
      { id: 'cover',    width: 1800, height: 766,  label: '2.35:1 封面' },
      { id: 'og',       width: 1200, height: 630,  label: '1.9:1 OG卡片' },
    ];
  }

  // Resolve from ALL_PLATFORMS dict or use inline objects
  return expanded.map(id => typeof id === 'string' ? ALL_PLATFORMS[id] : id).filter(Boolean);
}

function loadTemplate(templateId) {
  const padded = String(templateId).padStart(2, '0');
  const dirs = fs.readdirSync(TEMPLATES_DIR).filter(d => d.match(/^\d{2}-/)).sort();
  const match = dirs.find(d => d.startsWith(padded));
  if (!match) throw new Error(`Template ${templateId} not found. Available: ${dirs.join(', ')}`);
  const tmplDir = path.join(TEMPLATES_DIR, match);
  return {
    config: JSON.parse(fs.readFileSync(path.join(tmplDir, 'template.json'), 'utf-8')),
    html: fs.readFileSync(path.join(tmplDir, 'template.html'), 'utf-8'),
  };
}

function renderHTML(template, content, platform) {
  const { config } = template;
  let html = template.html;
  const points = content.points || [];
  const items = {
    '{{TITLE}}': content.title || '',
    '{{CONTENT}}': (content.body || content.content || '').replace(/\n/g, '<br>'),
    '{{SOURCE}}': content.source || '',
    '{{POINTS_HTML}}': points.map(p => `<li>${p}</li>`).join(''),
    '{{W}}': String(platform.width),
    '{{H}}': String(platform.height),
    '{{BG}}': config.colors.background,
    '{{TEXT}}': config.colors.text,
    '{{ACCENT}}': config.colors.accent,
    '{{SECONDARY}}': config.colors.secondary || config.colors.text,
    '{{FONT_TITLE}}': config.fonts.title,
    '{{FONT_BODY}}': config.fonts.body,
    '{{TITLE_SIZE_V}}': config.layout.titleSizeVertical || '56px',
    '{{TITLE_SIZE_S}}': config.layout.titleSizeSquare || '52px',
    '{{TITLE_SIZE_W}}': config.layout.titleSizeWide || '48px',
    '{{TITLE_SIZE_C}}': config.layout.titleSizeCover || '42px',
    '{{CONTENT_SIZE}}': config.layout.contentSize || '24px',
    '{{BRAND}}': config.brand || '',
    '{{SEAL}}': config.seal || config.brand || '',
    '{{METRIC_1}}': content.metric1 || content.metric1 === 0 ? String(content.metric1) : '{{METRIC_1}}',
    '{{METRIC_2}}': content.metric2 || content.metric2 === 0 ? String(content.metric2) : '{{METRIC_2}}',
    '{{METRIC_3}}': content.metric3 || content.metric3 === 0 ? String(content.metric3) : '{{METRIC_3}}',
    '{{METRIC_LABEL_1}}': content.metricLabel1 || '{{METRIC_LABEL_1}}',
    '{{METRIC_LABEL_2}}': content.metricLabel2 || '{{METRIC_LABEL_2}}',
    '{{METRIC_LABEL_3}}': content.metricLabel3 || '{{METRIC_LABEL_3}}',
    '{{BADGE}}': config.badge || '{{BADGE}}',
  };
  // Support {{COLOR__Axx}} → rgba hex with alpha (e.g. {{ACCENT__A08}} → rgba(79,70,229,0.031))
  html = html.replace(/\{\{(\w+?)__A(\d\d)\}\}/g, (_, colorName, alphaHex) => {
    const hex = items['{{' + colorName + '}}'];
    if (!hex) return _;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = (parseInt(alphaHex, 16) / 255).toFixed(3);
    return `rgba(${r},${g},${b},${a})`;
  });
  // Support {{SIZE__PRINT}} → calc(X * 2.5) for A4/A3; 1x for screen platforms
  const isPrint = platform.id === 'a4' || platform.id === 'a3';
  const mult = isPrint ? '2.5' : '1';
  html = html.replace(/\{\{(\w+?)__PRINT\}\}/g, (_, sizeKey) => {
    const base = items['{{' + sizeKey + '}}'];
    if (!base) return _;
    return `calc(${base} * ${mult})`;
  });
  for (const [k, v] of Object.entries(items)) {
    html = html.replaceAll(k, v);
  }
  return html;
}

function takeScreenshot(html, outputPath, platform) {
  const tmpFile = path.join(path.dirname(outputPath), `_tmp_${Date.now()}.html`);
  fs.writeFileSync(tmpFile, html, 'utf-8');
  const absoluteUrl = `file://${path.resolve(tmpFile)}`;
  const cmd = `npx playwright screenshot --viewport-size=${platform.width},${platform.height} --wait-for-timeout=1500 "${absoluteUrl}" "${outputPath}"`;
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 30000 });
    console.log(`  [OK] ${platform.label} (${platform.width}×${platform.height})`);
  } catch (e) {
    console.error(`  [FAIL] ${platform.label}: ${e.message}`);
  }
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
}

function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

function safeDirName(title) {
  // Remove only filesystem-unsafe chars, keep full title
  return (title || 'untitled').replace(/[\\/:*?"<>|]/g, '_').trim();
}

function resolveOutputDir(content, args) {
  if (args.output) {
    return path.resolve(args.output);
  }
  const today = dateStamp();
  const st = safeDirName(content.title);
  const outputRoot = path.join(process.cwd(), 'output');
  fs.mkdirSync(outputRoot, { recursive: true });
  const prefix = `${today}_${st}`;
  const existing = fs.readdirSync(outputRoot).filter(d => d.startsWith(prefix));
  const seq = existing.length > 0
    ? Math.max(...existing.map(d => { const m = d.match(/_(\d+)$/); return m ? parseInt(m[1]) : 0; })) + 1
    : 1;
  return path.join(outputRoot, `${prefix}_${String(seq).padStart(3, '0')}`);
}

function main() {
  const args = parseArgs();
  if (!args.title && !args.file) {
    console.error('Usage:');
    console.error('  node render.js --file content.json --template 1');
    console.error('  node render.js --title "Title" --body "Body" --template 3 --platforms xiaohongshu-v,moments,weibo');
    console.error('  node render.js --file content.json --template 1 --platforms all');
    console.error('  node render.js --file content.json --template 1 --output ./my-output');
    console.error('\nPlatform ids: xiaohongshu-v, xiaohongshu-s, wechat-cover, wechat-thumb,');
    console.error('  moments, weibo, toutiao, douyin-cover, bilibili-cover,');
    console.error('  twitter, a4, a3, all, custom:WxH');
    console.error('Groups: xiaohongshu, wechat');
    process.exit(1);
  }
  const content = loadContent(args);
  const templateId = args.template || '01';
  const outputDir = resolveOutputDir(content, args);
  const platforms = resolvePlatforms(content, args);

  console.log(`\nTemplate: ${templateId}\nContent:  ${content.title || '(no title)'}\nOutput:   ${outputDir}\n`);
  fs.mkdirSync(outputDir, { recursive: true });
  const template = loadTemplate(templateId);
  console.log(`Style:    ${template.config.name}`);
  console.log(`Platforms: ${platforms.map(p => p.label).join(', ')}\n`);

  for (const platform of platforms) {
    const html = renderHTML(template, content, platform);
    const safeName = (content.title || 'untitled').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
    takeScreenshot(html, path.join(outputDir, `${safeName}_${platform.id}.png`), platform);
  }
  console.log(`\nDone: ${outputDir}`);
}

main();
