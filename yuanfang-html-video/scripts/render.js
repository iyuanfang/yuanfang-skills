#!/usr/bin/env node
// yuanfang-html-video/render.js
// 视频生成：PNG 序列 + ffmpeg 合成。
// 软依赖 ffmpeg：检测到就跑，检测不到给清晰错误。
//
// 后端选型：ffmpeg（理由：完全可控 / 0 成本 / 不需企业认证 / 模板丰富）
// vs 剪映 SDK（要企业认证）/ 可灵（要 API key + 贵）。ffmpeg 最适合起步。
//
// 输入：content.json（同 yuanfang-html-image）
// 输出：output/<session>/<平台>/video.mp4
//
// 用法：
//   node render.js --file content.json --platform douyin
//   node render.js --file content.json --platform wechat-video --duration 15 --bgm path/to/mp3
//   node render.js --file content.json --platform bilibili --duration 60 --tts "脚本"

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const PLATFORMS = {
  'douyin':      { width: 1080, height: 1920, ratio: '9:16', label: '抖音' },
  'shipinhao':   { width: 1080, height: 1920, ratio: '9:16', label: '视频号' },
  'wechat-video':{ width: 1080, height: 1920, ratio: '9:16', label: '视频号 (alias)' },
  'moments-video':{width: 1080, height: 1080, ratio: '1:1',  label: '朋友圈视频' },
  'xhs-video':   { width: 1080, height: 1440, ratio: '3:4',  label: '小红书视频' },
  'bilibili':    { width: 1920, height: 1080, ratio: '16:9', label: 'B站' },
  'youtube':     { width: 1920, height: 1080, ratio: '16:9', label: 'YouTube' },
};

const FFMPEG = (() => {
  try {
    return require('ffmpeg-static');
  } catch {
    return null;
  }
})();

function detectFfmpeg() {
  if (FFMPEG && fs.existsSync(FFMPEG)) return FFMPEG;
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return 'ffmpeg';
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args[k] = argv[++i];
      } else {
        args[k] = true;
      }
    }
  }
  return args;
}

// PNG → JPG（ffmpeg 视频循环用 JPG 帧比 PNG 帧快 5-10x）
async function pngsToJpgFrames(pngPaths, outDir) {
  const sharp = require('sharp');
  const jpgPaths = [];
  for (let i = 0; i < pngPaths.length; i++) {
    const jp = path.join(outDir, `f${String(i).padStart(4, '0')}.jpg`);
    await sharp(pngPaths[i]).jpeg({ quality: 88 }).toFile(jp);
    jpgPaths.push(jp);
  }
  return jpgPaths;
}

// 截 N 帧：复用 image 的 takeAnimationFrames 思路但走 video scale。
// 先把 content.json 写一个 HTML 预览给 Playwright 截 N 帧（按 css keyframes 入场动效）
// 注：复用 yuanfang-html-image 的 render.js HTML 装配
function buildHtmlForFrames(content, platform, animation = 'fade-in') {
  // 简单直接：inject 一段 HTML 包含 title + body + points + qr + animation
  // 完整版应当 import yuanfang-html-image/scripts/render.js 的 assembleHTML
  // 但跨 skill import 复杂（相对路径问题），这里先写简化版
  const bg = '#FAFAFA';
  const accent = '#4F46E5';
  return `<!DOCTYPE html>
<html><head><style>
  body { margin:0; width:${platform.width}px; height:${platform.height}px;
         background:${bg}; color:#1A1A2E; font-family:-apple-system,"Noto Sans SC",sans-serif;
         display:flex; flex-direction:column; justify-content:center; align-items:center;
         padding:80px; box-sizing:border-box; }
  h1 { font-size:96px; font-weight:700; line-height:1.15; margin:0 0 32px; text-align:center;
       max-width:90%; opacity:0; animation:yuanfang-fade-in 800ms ease-out both; }
  p  { font-size:36px; color:#6B7280; line-height:1.5; margin:0; text-align:center;
       max-width:85%; opacity:0; animation:yuanfang-fade-in 800ms ease-out 200ms both; }
  .points { display:flex; gap:20px; margin-top:48px; flex-wrap:wrap; justify-content:center;
            opacity:0; animation:yuanfang-fade-in 800ms ease-out 400ms both; }
  .pill { background:rgba(79,70,229,0.12); color:${accent}; padding:12px 28px;
          border-radius:999px; font-size:28px; font-weight:500; }
  .qr { position:absolute; bottom:40px; left:50%; transform:translateX(-50%);
        width:120px; height:120px; background:#fff; border:2px solid #E5E7EB;
        display:flex; align-items:center; justify-content:center; font-size:14px;
        color:#6B7280; }
  .badge { position:absolute; top:60px; left:50%; transform:translateX(-50%);
           font-size:24px; color:${accent}; letter-spacing:0.2em; font-weight:600;
           text-transform:uppercase; opacity:0; animation:yuanfang-fade-in 600ms ease-out 100ms both; }
  @keyframes yuanfang-fade-in { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
</style></head>
<body class="is-animating is-animating--fade-in">
  <div class="badge">${content.badge || ''}</div>
  <h1>${content.title || ''}</h1>
  <p>${content.body || content.content || ''}</p>
  <div class="points">${(content.points || []).map(p => `<div class="pill">${p}</div>`).join('')}</div>
  ${content.qr ? `<img class="qr" src="${content.qr}" style="object-fit:contain;" />` : ''}
</body></html>`;
}

function takeFrame(html, outPath, platform, waitMs) {
  const tmp = path.join(path.dirname(outPath), `_tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tmp, html, 'utf-8');
  const url = `file://${path.resolve(tmp)}`;
  const cmd = `npx playwright screenshot --viewport-size=${platform.width},${platform.height} --wait-for-timeout=${waitMs} "${url}" "${outPath}"`;
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 60000 });
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

async function main() {
  const args = parseArgs(process.argv);

  // 1. 校验 ffmpeg
  const ffmpeg = detectFfmpeg();
  if (!ffmpeg) {
    console.error('yuanng-html-video: ffmpeg not found.');
    console.error('');
    console.error('Install one of:');
    console.error('  macOS:   brew install ffmpeg');
    console.error('  Ubuntu:  sudo apt install ffmpeg');
    console.error('  Win:     choco install ffmpeg');
    console.error('  npm:     npm install ffmpeg-static (then require it)');
    console.error('');
    console.error('This skill is a soft dependency on ffmpeg — not bundled to keep install size sane.');
    process.exit(1);
  }

  // 2. 校验 platform
  const platformKey = args.platform || 'douyin';
  const platform = PLATFORMS[platformKey];
  if (!platform) {
    console.error(`unknown platform: ${platformKey}`);
    console.error(`available: ${Object.keys(PLATFORMS).join(', ')}`);
    process.exit(1);
  }

  // 3. 读 content
  const content = args.file
    ? JSON.parse(fs.readFileSync(args.file, 'utf-8'))
    : { title: args.title || '', body: args.body || '', points: (args.points || '').split('|').filter(Boolean) };

  const duration = parseInt(args.duration, 10) || 15;
  const fps = parseInt(args.fps, 10) || 24;
  const totalFrames = duration * fps;
  const outputDir = path.resolve(args.output || '.');
  fs.mkdirSync(outputDir, { recursive: true });

  // 4. 截 N 帧
  const html = buildHtmlForFrames(content, platform, args.animation);
  const frameDir = path.join(outputDir, `_frames_${Date.now()}`);
  fs.mkdirSync(frameDir, { recursive: true });
  const pngPaths = [];
  for (let i = 0; i < totalFrames; i++) {
    const fp = path.join(frameDir, `f${String(i).padStart(4, '0')}.png`);
    const wait = 200 + (i * 1000 / fps);
    takeFrame(html, fp, platform, wait);
    pngPaths.push(fp);
  }

  // 5. PNG → JPG（视频编码快）
  const jpgPaths = await pngsToJpgFrames(pngPaths, frameDir);

  // 6. ffmpeg 合成 mp4
  const safe = (content.title || 'video').replace(/[^\w一-龥]/g, '_').slice(0, 40);
  const outPath = path.join(outputDir, `${safe}_${platformKey}.mp4`);

  const ffmpegArgs = [
    '-y',
    '-framerate', String(fps),
    '-i', path.join(frameDir, 'f%04d.jpg'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '23',
  ];
  if (args.bgm) {
    ffmpegArgs.push('-i', args.bgm, '-c:a', 'aac', '-shortest');
  }
  ffmpegArgs.push(outPath);

  console.log(`[ffmpeg] ${ffmpegArgs.length} args`);
  execFileSync(ffmpeg, ffmpegArgs, { stdio: 'inherit' });

  // 7. 清理
  fs.rmSync(frameDir, { recursive: true, force: true });
  console.log(`\n[OK] ${platform.label} video (${platform.width}x${platform.height}, ${duration}s @ ${fps}fps)`);
  console.log(`     ${outPath}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('FAIL:', err.message);
    process.exit(1);
  });
}
