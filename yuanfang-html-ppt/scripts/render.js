'use strict';
const fs = require('node:fs');
const path = require('node:path');
const PptxGenJS = require('pptxgenjs');
const { parseSlides } = require('./parse-slides');
const { loadTheme } = require('./theme-mapper');
const { renderCover, renderContent, renderSummary } = require('./generator-a');
const { renderSection, renderTwoColumn, renderData, renderQuote } = require('./generator-c');

const VALID_PLATFORMS = {
  macos:      { w: 13.333, h: 7.5 },
  windows:    { w: 13.333, h: 7.5 },
  widescreen: { w: 13.333, h: 7.5 },
  '4-3':      { w: 10, h: 7.5 },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function hardGate(content, context) {
  if (!content.theme) throw new Error('❌ 缺少 theme 字段');
  if (!content.brand) throw new Error('❌ 缺少 brand 字段');
  if (!content.slides?.length && !content.layout) {
    throw new Error('❌ 缺少 slides 数组或单页 layout');
  }
  if (!context.contentConfirmed) throw new Error('❌ 内容未确认');
  if (!context.themeConfirmed) throw new Error('❌ 主题未确认');
  if (!context.brandConfirmed) throw new Error('❌ 品牌未确认');
  if (!context.layoutConfirmed) throw new Error('❌ 布局未确认');
  if (!context.mediaConfirmed) throw new Error('❌ 媒体未确认');
}

async function render(opts) {
  const content = JSON.parse(fs.readFileSync(opts.file, 'utf8'));

  const skip = opts['skip-confirm'] || opts.yes === true || opts.yes === 'true';
  const context = {
    contentConfirmed: skip,
    themeConfirmed: skip,
    brandConfirmed: skip,
    layoutConfirmed: skip,
    mediaConfirmed: skip,
  };
  hardGate(content, context);

  const { slides } = parseSlides(content);

  const designDir = path.resolve(__dirname, '..', '..', 'yuanfang-design');
  const theme = loadTheme(content.theme, designDir);

  const platform = opts.platforms || 'macos';
  const dims = VALID_PLATFORMS[platform] || VALID_PLATFORMS.macos;
  const pres = new PptxGenJS();
  pres.defineLayout({ name: 'CUSTOM', width: dims.w, height: dims.h });
  pres.layout = 'CUSTOM';
  pres.title = content.title || 'Untitled Deck';
  pres.subject = content.subject || '';
  pres.company = content.author || '';

  for (const slide of slides) {
    try {
      switch (slide.layout) {
        case 'cover':
          renderCover(pres, slide, theme);
          break;
        case 'content':
          renderContent(pres, slide, theme);
          break;
        case 'summary':
          renderSummary(pres, slide, theme);
          break;
        case 'section':
          await renderSection(pres, slide, theme);
          break;
        case 'two-column':
          await renderTwoColumn(pres, slide, theme);
          break;
        case 'data':
          await renderData(pres, slide, theme);
          break;
        case 'quote':
          await renderQuote(pres, slide, theme);
          break;
        default:
          console.warn(`⚠️ 跳过 slide: 未知 layout '${slide.layout}'`);
      }
    } catch (err) {
      console.error(`❌ slide 渲染失败 (${slide.layout}): ${err.message}`);
      throw err;
    }
  }

  const outPath = opts.output || 'output.pptx';
  await pres.writeFile({ fileName: outPath });
  console.log(`✅ 已生成 ${outPath} (${slides.length} 张幻灯片)`);
  return { outPath, slideCount: slides.length };
}

module.exports = { render, hardGate, parseArgs, VALID_PLATFORMS };

if (require.main === module) {
  const args = parseArgs(process.argv);
  if (!args.file) {
    console.error('❌ 缺少 --file 参数\n用法: node scripts/render.js --file content.json --theme <name> --brand <name> [--output out.pptx] [--platforms macos] [--skip-confirm]');
    process.exit(1);
  }
  render(args).catch(err => {
    console.error(err.message || err);
    process.exit(1);
  });
}
