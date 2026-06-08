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

const TONE_THEME_MAP = {
  '专业':     ['corporate-clean', 'minimal-white'],
  '企业':     ['corporate-clean', 'minimal-white'],
  '震撼':     ['dark-gold', 'bold-poster'],
  '重磅':     ['dark-gold', 'bold-poster'],
  '轻松':     ['warm-handdrawn', 'catppuccin-latte'],
  '生活':     ['warm-handdrawn', 'catppuccin-latte'],
  '科技':     ['tech-modern', 'tokyo-night'],
  '前沿':     ['tech-modern', 'tokyo-night'],
  '深度':     ['editorial', 'editorial-serif'],
  '分析':     ['editorial', 'editorial-serif'],
  '路演':     ['pitch-deck-vc'],
  '融资':     ['pitch-deck-vc'],
  '温暖':     ['warm-handdrawn', 'catppuccin-latte'],
  '幽默':     ['warm-handdrawn', 'catppuccin-latte'],
  '东方':     ['eastern', 'editorial'],
  '数据':     ['data-infographic', 'editorial'],
  '清单':     ['list-ranking', 'minimal-white'],
  '杂志':     ['magazine-cover', 'editorial-serif'],
  '对比':     ['split-screen', 'editorial'],
  '默认':     ['minimal-white-editorial', 'minimal-white'],
};

function detectTone(content) {
  const m = content.body.match(/^##\s*语气\s*\n([^\n]+)/m);
  if (m) {
    const t = m[1].trim();
    for (const key of Object.keys(TONE_THEME_MAP)) {
      if (t.includes(key)) return { tone: t, matched: key };
    }
    return { tone: t, matched: null };
  }
  return { tone: '', matched: null };
}

function recommendThemes(toneInfo) {
  if (toneInfo.matched) return TONE_THEME_MAP[toneInfo.matched];
  return TONE_THEME_MAP['默认'];
}

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
    BADGE_GUIDE(platform),
    CTA_GUIDE(platform),
    `输出：合法 JSON，无 markdown 包裹。`,
  ].join('\n');
}

const OUTPUT_SHAPES = {
  xiaohongshu:   'title, body, tags (3-5 个), cta, badge',
  wechat:        'title, lead (200 字引子), outline (3-5 条大纲), cta, body (完整文章), badge',
  toutiao:       'title, meta (一句话描述), body (300-500 字), cta, badge',
  zhihu:         'title, body, key_points (3-5 点), cta, badge',
  moments:       'text (1-3 句, ≤60 字), badge',
  'weibo-micro': 'text (140-300 字), badge',
};

// 跨平台 badge 调性表（4-10 字小字分类，顶部 accent 色 + letter-spacing 显示）。
// 第一段描述「内容/品类/视角」，第二段描述「调性/情绪/价值」。用「·」或「|」分隔。
// 平台调性不同 → badge 调性也要不同，否则在朋友圈像硬广、在小红书像公关稿。
const PLATFORM_BADGE_TONE = {
  xiaohongshu: {
    vibe: '种草、亲测、闺蜜分享、可盐可甜',
    forbidden: '像「行业观察/深度分析」这种硬词会瞬间劝退',
    templates: [
      '产品/品类 · 神器/避雷/亲测/狂喜/好用/宝藏/上头',
      '品类 · 测评/对比/盘点/合集',
      '痛点场景 · 解法',
    ],
    examples: ['AI 工具 · 效率神器', '运营干货 · 避雷指南', '私藏好物 · 亲测有效'],
  },
  wechat: {
    vibe: '深度、专业、克制、像编辑推荐而非广告',
    forbidden: '感叹号、emoji、姐妹/家人们等小红书腔',
    templates: [
      '品类/行业 · 行业观察/深度/方法论/复盘',
      '领域 · 拆解/选型指南/方法论',
    ],
    examples: ['SaaS 选型 · 行业观察', 'AI 落地 · 行业拆解', '产品经理 · 深度复盘'],
  },
  toutiao: {
    vibe: '资讯、新闻、行业动态、像 36 氪短消息',
    forbidden: '亲测/姐妹这种主观词；标题党感',
    templates: [
      '行业/品类 · 行业动态/资讯/快讯/盘点',
      '品类 · 数据/榜单/趋势',
    ],
    examples: ['AI 资讯 · 行业动态', '电商 SaaS · 行业盘点', '产品动态 · 趋势解读'],
  },
  zhihu: {
    vibe: '专业、从业者视角、克制、信息密度高',
    forbidden: '种草/避雷这种小红书调；emoji 慎用',
    templates: [
      '领域 · 深度回答/从业者说/技术拆解',
      '问题分类 · 答案',
    ],
    examples: ['深度回答 · 行业从业者', 'SaaS 选型 · 资深 PM', 'AI 工程 · 落地拆解'],
  },
  moments: {
    vibe: '日常、随手、用后感、不像广告',
    forbidden: '任何带「深度/行业/方法论」感的词；CTA/二维码相关词',
    templates: [
      '场景 · 体验/用后感/吐槽/安利',
      '心情 · 小记',
    ],
    examples: ['日常 · 用后感', '创业 · 小记', '工具 · 亲测'],
  },
  'weibo-micro': {
    vibe: '短评、观点、互动感、像跟网友聊天',
    forbidden: '标题党、长描述；任何正式感的词',
    templates: [
      '领域 · 体验派/观察/吐槽/安利',
      '心情 · 随手记',
    ],
    examples: ['随手记 · 体验派', '产品 · 试用吐槽', 'AI · 体验派'],
  },
};

const BADGE_GUIDE = (platform) => {
  const t = PLATFORM_BADGE_TONE[platform];
  if (!t) {
    return 'badge: 4-10 字小字分类（顶部 accent 色 + letter-spacing 显示），按内容 category 和平台调性生成。用「·」或「|」分隔两段。';
  }
  return [
    `badge: 4-10 字小字分类（顶部 accent 色 + letter-spacing 显示），用「·」或「|」分隔两段。`,
    `平台调性：${t.vibe}。${t.forbidden ? `禁止：${t.forbidden}。` : ''}`,
    `可用模板：${t.templates.join('；')}。`,
    `示例：${t.examples.join(' / ')}。`,
  ].join(' ');
};

// 跨平台 CTA 风格化表。
// CTA 调性 = 「平台读者看到后的反应」。朋友圈写「立即下载」= 硬广，知乎写「戳链接」= 卖货感。
// 每个平台给 vibe（这条 CTA 在平台上要像什么）+ forbidden（哪种 CTA 在这平台会劝退）+ templates + examples。
const PLATFORM_CTA_TONE = {
  xiaohongshu: {
    vibe: '闺蜜安利的口吻、像「我帮你试过了你去吧」，不强调品牌不强调价格',
    forbidden: '「立即购买/限时优惠/扫码」这种纯电商 CTA；强促销词',
    templates: [
      '戳链接自己看 / 搜「{品牌}」自己试 / 链接放评论区',
      '姐妹们冲 {品牌} / 真心推荐 / 自用回购',
      '评论区扣 1 给你链接',
    ],
    examples: ['戳链接自己看，0 元起随便试', '搜「AICS」自己上手玩，0 元起', '评论区扣 1 给你入口'],
  },
  wechat: {
    vibe: '编辑式落款、像文章作者的最后一句，常带 → / 「点击」/ 「扫码」',
    forbidden: '感叹号、emoji 堆砌、限时/抢购',
    templates: [
      '点击阅读原文 / 文末扫码 / 戳下方链接',
      '「立即体验」/ 「免费试用 14 天」',
      '→ 评论区聊聊 / → 转发给需要的朋友',
    ],
    examples: ['立即体验 AI 智能客服，免费试用 14 天', '文末扫码体验，14 天免费', '点击阅读原文 → 14 天免费上手'],
  },
  toutiao: {
    vibe: '短直接、资讯风格、像新闻结尾的一句',
    forbidden: '长段、感叹号、亲测/姐妹',
    templates: [
      '{品牌} 提供 14 天免费试用 / 立即体验',
      '免费版已开放 / 0 元起',
    ],
    examples: ['AICS 提供 14 天免费试用，0 元起步', '免费版已上线，扫码体验'],
  },
  zhihu: {
    vibe: '几乎不写 CTA，最多一句「文末有免费试用入口」点到为止',
    forbidden: '任何显式购买引导、感叹号、emoji、链接直贴',
    templates: [
      '文末有 {品牌} 14 天免费试用入口',
      '如果正在选型，可以从 {品牌} 入手实测',
    ],
    examples: ['文末有 AICS 14 天免费试用入口', '如果正在选型，可以从 AICS 入手实测'],
  },
  moments: {
    vibe: '不写 CTA、像跟朋友聊到这事的自然结尾',
    forbidden: '任何「立即下载/扫码/加微信/链接」类硬广词',
    templates: [
      '不写 CTA，让正文自己停',
      '需要链接的话评论一下',
    ],
    examples: ['', '需要链接的话评论一下', '（结尾自然收，不带 CTA）'],
  },
  'weibo-micro': {
    vibe: '互动钩子、引导评论、像发动态等回复',
    forbidden: '硬广 CTA、长 URL',
    templates: [
      '你怎么看？/ 有没有同感？/ 说说你的经历',
      '评论区聊聊 / 你用过哪些 {品类} 工具？',
    ],
    examples: ['你怎么看？', '你遇到过这种情况吗？', '评论区聊聊你选 {品类} 的标准'],
  },
};

const CTA_GUIDE = (platform) => {
  const t = PLATFORM_CTA_TONE[platform];
  if (!t) {
    return 'cta: 一句行动号召。';
  }
  return [
    `cta: 平台风格行动号召。`,
    `平台调性：${t.vibe}。${t.forbidden ? `禁止：${t.forbidden}。` : ''}`,
    `可用模板：${t.templates.join('；')}。`,
    `示例：${t.examples.join(' / ')}。`,
  ].join(' ');
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
    const toneInfo = detectTone(content);
    const themes = recommendThemes(toneInfo);
    console.log(`\n========== Theme recommendation ==========`);
    console.log(`tone: ${toneInfo.tone || '(none detected in ## 语气)'}`);
    console.log(`match: ${toneInfo.matched || '(fallback to default minimal-white-editorial)'}`);
    console.log(`recommended: ${themes.join(', ')}`);
    console.log(`render.js CLI: --theme ${themes[0]}`);
    return;
  }

  const outDir = args.output || path.join(path.dirname(args.content), 'output');
  fs.mkdirSync(outDir, { recursive: true });
  for (const p of args.platforms) fs.mkdirSync(path.join(outDir, p), { recursive: true });

  const toneInfo = detectTone(content);
  const themes = recommendThemes(toneInfo);
  const themeStr = themes.join(', ');

  console.log(`# generate-copy — agent-driven`);
  console.log(`content: ${args.content}`);
  console.log(`platforms: ${args.platforms.join(', ')}`);
  console.log(`variants per platform: ${args.variants}`);
  console.log(`output: ${outDir}`);
  console.log(`\n# Theme recommendation (from ## 语气 in content.md):`);
  console.log(`#   tone: ${toneInfo.tone || '(none detected)'}`);
  console.log(`#   match: ${toneInfo.matched || '(fallback to default)'}`);
  console.log(`#   themes: ${themeStr}`);
  console.log(`# Pass to render.js: --theme ${themes[0]} (or any from the list)`);
  console.log(`\n# To generate, run with --print-prompts and feed each prompt to your LLM.`);
  console.log(`# Then write the LLM's JSON output as copy.md in each platform dir.`);
  console.log(`# Finally validate:`);
  console.log(`for p in ${args.platforms.map(p => `${outDir}/${p}`).join(' ')}; do node scripts/validate-copy.js $p/copy.md; done`);
}

if (require.main === module) main();
