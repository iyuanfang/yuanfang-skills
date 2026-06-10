#!/usr/bin/env node
/**
 * yuanfang-media-publish / scripts/publish-api.js
 *
 * 统一 API 通道包装 —— 把 yuanfang-html-image / yuanfang-html-video 产出的
 * copy.md + content.json + PNG/mp4 通过官方 API 发布到平台账号。
 *
 * 设计原则：
 *   1. 零依赖 —— 只用 node:https / node:fs / node:path / node:url
 *   2. 平台分发 —— --platform 决定调哪个 publishXxx() 函数
 *   3. 草稿箱优先 —— 公众号默认写草稿不自动发布，避免误操作
 *   4. 失败可重试 —— 429 触发指数 backoff 最多 3 次
 *   5. 失败保资源 —— 失败时绝不删除输入文件
 *
 * 用法：
 *   node publish-api.js --platform wechat  --input output/2026AICS/公众号/
 *   node publish-api.js --platform bilibili --input output/2026AICS/B站/    (需企业认证)
 *   node publish-api.js --platform douyin  --input output/2026AICS/抖音/    (需企业认证)
 *   node publish-api.js --help
 *
 * 无 API 的平台（头条/知乎）请走 publish-browser.js：
 *   node publish-browser.js --platform toutiao --input output/2026AICS/头条/
 *   node publish-browser.js --platform zhihu   --input output/2026AICS/知乎/
 *
 * Cookie 通道（小红书 / 朋友圈）不在本脚本内 —— 它们走 MCP / 浏览器人工指引。
 *
 * 凭证：默认读 ~/.config/opencode/publish-credentials.json，可用 --credentials 覆盖。
 */

'use strict';

const fs   = require('node:fs');
const path = require('node:path');
const os   = require('node:os');
const https = require('node:https');
const { URL } = require('node:url');

// ============================================================
// 常量
// ============================================================

// 默认凭证路径 —— 用户可改
const DEFAULT_CREDENTIALS_PATH = path.join(
  os.homedir(),
  '.config',
  'opencode',
  'publish-credentials.json',
);

// 支持的平台
const SUPPORTED_PLATFORMS = ['wechat', 'toutiao', 'zhihu', 'bilibili', 'douyin'];

// HTTP 请求默认超时（ms）
const HTTP_TIMEOUT_MS = 30000;

// 429 指数 backoff：3 次尝试，间隔 1s/2s/4s
const RETRY_DELAYS_MS = [1000, 2000, 4000];

// ============================================================
// CLI 参数解析（无依赖）
// ============================================================

/**
 * 把 process.argv 解析成 { platform, input, credentials, help }。
 * 解析失败抛 Error（带可读消息）。
 */
function parseArgs(argv) {
  const args = {
    platform: null,
    input: null,
    credentials: DEFAULT_CREDENTIALS_PATH,
    help: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const cur = argv[i];
    const next = argv[i + 1];
    switch (cur) {
      case '--platform':
      case '-p':
        if (!next) throw new Error('--platform 需要一个值');
        args.platform = next;
        i += 1;
        break;
      case '--input':
      case '-i':
        if (!next) throw new Error('--input 需要一个值');
        args.input = next;
        i += 1;
        break;
      case '--credentials':
      case '-c':
        if (!next) throw new Error('--credentials 需要一个值');
        args.credentials = next;
        i += 1;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        // 忽略未知参数，打警告
        console.error(`[warn] 忽略未知参数: ${cur}`);
    }
  }
  return args;
}

function printHelp() {
  const lines = [
    '用法: node publish-api.js --platform <name> --input <dir> [--credentials <file>]',
    '',
    '选项:',
    '  --platform, -p <name>     平台名: wechat | toutiao | zhihu | bilibili | douyin',
    '  --input,    -i <dir>      输入目录（含 copy.md + content.json + PNG/mp4）',
    '  --credentials, -c <file>  凭证 JSON 路径（默认 ~/.config/opencode/publish-credentials.json）',
    '  --help,   -h              打印本帮助',
    '',
    '平台状态:',
    '  wechat     ✅ 草稿箱已实现（不自动发布）',
    '  toutiao    🟡 头条无公开文章 API，请走 publish-browser.js（Playwright 浏览器自动化）',
    '  zhihu      🟡 知乎无公开文章发布 API，请走 publish-browser.js（Playwright 浏览器自动化）',
    '  bilibili   🟡 框架已就位，需企业认证 + OAuth 流程',
    '  douyin     🟡 框架已就位，需企业认证 + 类目报白',
    '',
    'Cookie 通道（小红书 / 朋友圈）不在本脚本内，请走 publish-mcp.js 或人工。',
    '无 API 的平台（头条/知乎）请走 publish-browser.js（本仓库 scripts/ 目录下）。',
    '',
    '示例:',
    '  node publish-api.js --platform wechat --input output/2026AICS/公众号/',
    '  node publish-api.js --platform toutiao --input output/2026AICS/头条/ \\',
    '    --credentials ~/my-creds.json',
  ];
  console.log(lines.join('\n'));
}

// ============================================================
// 凭证与输入加载
// ============================================================

/**
 * 读凭证 JSON，缺文件/读失败/解析失败时抛 Error（带可读消息）。
 * CLI 层在 main() 捕获后 printHelp+process.exit(1)。
 */
function loadCredentials(filePath) {
  if (!fs.existsSync(filePath)) {
    const err = new Error(`凭证文件不存在: ${filePath}`);
    err.code = 'CREDENTIALS_MISSING';
    err.hint = `请按 references/credentials-setup.md 配置，或用 --credentials 指定。`;
    throw err;
  }
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    const err = new Error(`读凭证文件失败: ${e.message}`);
    err.code = 'CREDENTIALS_READ_ERROR';
    throw err;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    const err = new Error(`凭证 JSON 解析失败: ${e.message}`);
    err.code = 'CREDENTIALS_PARSE_ERROR';
    throw err;
  }
}

/**
 * 读输入目录：必须有 copy.md + content.json；PNG/mp4 是可选的（按平台需要）。
 */
function loadInput(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`[error] 输入目录不存在: ${dir}`);
    process.exit(1);
  }
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    console.error(`[error] 输入路径不是目录: ${dir}`);
    process.exit(1);
  }
  const copyPath = path.join(dir, 'copy.md');
  const contentPath = path.join(dir, 'content.json');
  if (!fs.existsSync(copyPath)) {
    console.error(`[error] 缺 copy.md: ${copyPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(contentPath)) {
    console.error(`[error] 缺 content.json: ${contentPath}`);
    process.exit(1);
  }
  const copy = fs.readFileSync(copyPath, 'utf8');
  let content;
  try {
    content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  } catch (err) {
    console.error(`[error] content.json 解析失败: ${err.message}`);
    process.exit(1);
  }
  // 列出媒体文件
  const media = fs
    .readdirSync(dir)
    .filter((name) => /\.(png|jpg|jpeg|gif|webp|mp4|mov)$/i.test(name))
    .map((name) => path.join(dir, name));
  return { copy, content, media, dir };
}

// ============================================================
// HTTP 客户端（仅 node:https，零依赖，带 429 重试）
// ============================================================

/**
 * 通用 HTTPS POST/GET，自动 JSON 序列化 + 解析，带 429 指数 backoff。
 * options: { method, url, headers, body, timeoutMs }
 * 返回: { status, headers, body } —— body 已是解析后的 JSON 或字符串
 */
function httpRequest(options) {
  const { method = 'GET', url, headers = {}, body, timeoutMs = HTTP_TIMEOUT_MS } = options;
  const u = new URL(url);
  const reqOptions = {
    method,
    hostname: u.hostname,
    port: u.port || 443,
    path: u.pathname + (u.search || ''),
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };
  let payload;
  if (body !== undefined && body !== null) {
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      payload = body;
    } else {
      payload = JSON.stringify(body);
      reqOptions.headers['Content-Type'] = reqOptions.headers['Content-Type'] || 'application/json';
    }
    reqOptions.headers['Content-Length'] = Buffer.byteLength(payload);
  }
  return new Promise((resolve, reject) => {
    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`请求超时 (>${timeoutMs}ms): ${url}`));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * 带指数 backoff 的请求包装。429 触发 RETRY_DELAYS_MS 重试。
 * 内部通过可被 DI 覆盖的 _httpRequestImpl 走真实网络，方便测试注入 mock。
 */
async function httpRequestWithRetry(options) {
  let lastErr;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const res = await _httpRequestImpl(options);
      if (res.status === 429) {
        const wait = RETRY_DELAYS_MS[attempt];
        console.error(`[warn] 429 限流，${wait}ms 后重试 (${attempt + 1}/${RETRY_DELAYS_MS.length})`);
        await sleep(wait);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      const wait = RETRY_DELAYS_MS[attempt];
      console.error(`[warn] 请求异常: ${err.message}，${wait}ms 后重试`);
      await sleep(wait);
    }
  }
  throw lastErr || new Error('请求重试耗尽');
}

// module-level 间接层: 默认 = httpRequest; 测试可覆盖
let _httpRequestImpl = httpRequest;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// 输出落盘
// ============================================================

/**
 * 把发布结果三件套写到 output/<input>/<platform>/。
 * 注意 SKILL.md 约定输出目录结构：input 已经是 <input>/<平台>/ 时，output 平级；
 * 这里为了与 SKILL.md "output/<session>/<平台>/" 描述一致，单独加 <platform> 子目录。
 */
function writeOutputs(originalInputDir, platform, payload) {
  const outDir = path.join(originalInputDir, platform);
  fs.mkdirSync(outDir, { recursive: true });
  const { postUrl = '', publishedAt = '', response = {} } = payload;
  fs.writeFileSync(path.join(outDir, 'post_url.txt'), postUrl, 'utf8');
  fs.writeFileSync(path.join(outDir, 'published_at.txt'), publishedAt, 'utf8');
  fs.writeFileSync(
    path.join(outDir, 'platform_response.json'),
    JSON.stringify(response, null, 2),
    'utf8',
  );
  return outDir;
}

// ============================================================
// 各平台发布实现
// ============================================================

/**
 * 微信公众号 —— 草稿箱流程（写草稿，不自动发布）。
 *
 * 流程（参考 wechat-mp-api）：
 *   1. GET /cgi-bin/token?grant_type=client_credential&appid=...&secret=...  → access_token
 *   2. POST /cgi-bin/draft/add  (新增草稿) → media_id
 *   3. 返回草稿预览 URL（mp.weixin.qq.com）供用户登录后台查看
 *
 * 注意：本实现写"草稿"而非"发布"，避免误推送给全部粉丝。
 */
async function publishWechat({ input, credentials }) {
  const { wechat } = credentials;
  if (!wechat || !wechat.appId || !wechat.appSecret) {
    throw new Error('wechat 凭证缺 appId / appSecret');
  }
  console.log('[wechat] 1/3 拿 access_token ...');
  const tokenRes = await httpRequestWithRetry({
    method: 'GET',
    url: `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(
      wechat.appId,
    )}&secret=${encodeURIComponent(wechat.appSecret)}`,
  });
  if (tokenRes.status !== 200 || !tokenRes.body || !tokenRes.body.access_token) {
    throw new Error(`拿 token 失败: status=${tokenRes.status} body=${JSON.stringify(tokenRes.body)}`);
  }
  const accessToken = tokenRes.body.access_token;
  console.log(`[wechat] 2/3 写草稿 ...`);

  // 构造草稿 articles
  // 头条图：取第一张 PNG → 上传素材 → 拿 thumb_media_id
  let thumbMediaId = '';
  if (input.media.length > 0) {
    const firstImg = input.media.find((m) => /\.(png|jpg|jpeg)$/i.test(m));
    if (firstImg) {
      // 简化处理：把图片 base64 编码后内嵌。完整流程需用 /cgi-bin/material/add_material
      // 这里仅演示接口形状；如需真上传，请补 multipart/form-data 构造（保持零依赖时较繁琐）
      thumbMediaId = await uploadWechatImage(accessToken, firstImg);
    }
  }

  const article = {
    title: input.content.title || (input.copy.split('\n')[0] || '未命名').slice(0, 64),
    content: buildWechatHtml(input.copy, input.media),
    content_source_url: '',
    thumb_media_id: thumbMediaId,
    need_open_comment: 0,
    only_fans_can_comment: 0,
  };
  const draftRes = await httpRequestWithRetry({
    method: 'POST',
    url: `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`,
    body: { articles: [article] },
  });
  if (draftRes.status !== 200 || !draftRes.body || !draftRes.body.media_id) {
    throw new Error(`写草稿失败: ${JSON.stringify(draftRes.body)}`);
  }
  const mediaId = draftRes.body.media_id;
  console.log(`[wechat] 3/3 草稿已写入 media_id=${mediaId}`);

  const publishedAt = new Date().toISOString();
  return {
    postUrl: `https://mp.weixin.qq.com/cgi-bin/appmsg?action=list&type=10&appmsgid=${mediaId}`,
    publishedAt,
    response: {
      platform: 'wechat',
      mode: 'draft',
      media_id: mediaId,
      access_token_obtained_at: publishedAt,
      // 完整响应回写，便于排查
      draft: draftRes.body,
    },
  };
}

/**
 * 上传公众号永久素材图片（简化版，假设 server 接受 application/octet-stream）。
 * 返回 thumb_media_id。
 */
async function uploadWechatImage(accessToken, filePath) {
  const buf = fs.readFileSync(filePath);
  const res = await httpRequestWithRetry({
    method: 'POST',
    url: `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image`,
    headers: {
      'Content-Type': 'image/png',
    },
    body: buf,
  });
  if (res.status !== 200 || !res.body || !res.body.media_id) {
    console.error(`[wechat] 素材上传失败（继续，thumb_media_id 为空）: ${JSON.stringify(res.body)}`);
    return '';
  }
  return res.body.media_id;
}

/**
 * 把 copy.md 转成公众号可用的 HTML（最简段落 + 图片）。
 */
function buildWechatHtml(copy, media) {
  const paragraphs = copy
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join('\n');
  const imgs = media
    .filter((m) => /\.(png|jpg|jpeg|gif|webp)$/i.test(m))
    .map((m) => `<p><img src="${escapeHtml(`file://${m}`)}" /></p>`)
    .join('\n');
  return `${paragraphs}\n${imgs}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- 头条 ----
async function publishToutiao({ input, credentials }) {
  if (!credentials.toutiao || !credentials.toutiao.token) {
    throw new Error('toutiao 凭证缺 token');
  }
  return pendingStub(
    'toutiao',
    '头条号目前无公开的文章发布 API（只有 抖音开放平台 的视频发布接口）。' +
    '如需发布图文，请走 publish-browser.js（Playwright 浏览器自动化）。',
    'node yuanfang-media-publish/scripts/publish-browser.js --platform toutiao --input ' + input.dir,
  );
}

// ---- 知乎 ----
async function publishZhihu({ input, credentials }) {
  if (!credentials.zhihu || !credentials.zhihu.oauth) {
    throw new Error('zhihu 凭证缺 oauth');
  }
  return pendingStub(
    'zhihu',
    '知乎 API v4 是只读接口，无公开的文章发布 API。' +
    '如需发布图文，请走 publish-browser.js（Playwright 浏览器自动化）。',
    'node yuanfang-media-publish/scripts/publish-browser.js --platform zhihu --input ' + input.dir,
  );
}

// ---- B 站 ----
async function publishBilibili({ input, credentials }) {
  if (!credentials.bilibili || !credentials.bilibili.accessToken) {
    throw new Error('bilibili 凭证缺 accessToken');
  }
  // B 站开放平台有动态图文发布 API（POST /x/dynamic/feed/draw/upload）
  // 但需要 multipart/form-data 上传（零依赖实现较复杂）。
  // 欢迎 PR 贡献完整实现。
  return pendingStub(
    'bilibili',
    'B 站动态图文 API（POST /x/dynamic/feed/draw/upload）未实现。' +
    '需要的步骤：1) 应用认证获取 AppKey+AppSecret 2) OAuth 拿 access_token 3) multipart 上传图片 + 正文。',
    '详见 https://openhome.bilibili.com/',
  );
}

// ---- 抖音 ----
async function publishDouyin({ input, credentials }) {
  if (!credentials.douyin || !credentials.douyin.clientKey || !credentials.douyin.clientSecret || !credentials.douyin.accessToken) {
    throw new Error('douyin 凭证缺 clientKey / clientSecret / accessToken');
  }
  // 抖音开放平台有视频发布 API（POST /video/upload/），但需企业认证 + 类目报白。
  // 图文/content 发布暂未开放给个人开发者。
  return pendingStub(
    'douyin',
    '抖音视频发布 API（POST /video/upload/）需企业认证 + 类目报白。' +
    '需要的步骤：1) 抖音开放平台注册企业开发者 2) 创建应用 3) OAuth 拿 access_token 4) multipart 上传视频。',
    '详见 https://open.douyin.com/',
  );
}

/**
 * 通用 "未实现" 桩 —— 让 framework 跑通，但不假装成功。
 */
function pendingStub(platform, reason, workaround) {
  const res = {
    postUrl: '',
    publishedAt: '',
    response: {
      platform,
      status: 'pending',
      reason,
    },
  };
  if (workaround) res.response.workaround = workaround;
  return res;
}

// ============================================================
// 平台分发
// ============================================================

const PUBLISHERS = {
  wechat: publishWechat,
  toutiao: publishToutiao,
  zhihu: publishZhihu,
  bilibili: publishBilibili,
  douyin: publishDouyin,
};

// ============================================================
// 入口
// ============================================================

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    console.error(`[error] 参数解析失败: ${err.message}`);
    printHelp();
    process.exit(1);
  }
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.platform) {
    console.error('[error] 缺 --platform');
    printHelp();
    process.exit(1);
  }
  if (!args.input) {
    console.error('[error] 缺 --input');
    printHelp();
    process.exit(1);
  }
  if (!SUPPORTED_PLATFORMS.includes(args.platform)) {
    console.error(
      `[error] 不支持的平台: ${args.platform}（支持: ${SUPPORTED_PLATFORMS.join(', ')}）`,
    );
    console.error('       Cookie 通道（小红书 / 朋友圈）请走 publish-mcp.js 或人工。');
    process.exit(1);
  }

  let credentials;
  try {
    credentials = loadCredentials(args.credentials);
  } catch (err) {
    console.error(`[error] ${err.message}`);
    if (err.hint) console.error(`        ${err.hint}`);
    process.exit(1);
  }
  const input = loadInput(args.input);
  console.log(`[main] 平台=${args.platform} 输入=${input.dir} 媒体=${input.media.length} 个`);

  const publisher = PUBLISHERS[args.platform];
  let result;
  try {
    result = await publisher({ input, credentials });
  } catch (err) {
    console.error(`[error] ${args.platform} 发布失败: ${err.message}`);
    console.error('       输入文件未被删除，可修复后重试。');
    process.exit(1);
  }

  // 写三件套
  const outDir = writeOutputs(input.dir, args.platform, result);
  console.log(`[main] ✅ 输出已落盘: ${outDir}`);
  console.log(`       post_url:      ${result.postUrl || '(待实现)'}`);
  console.log(`       published_at:  ${result.publishedAt || '(待实现)'}`);
  console.log(`       status:        ${result.response.status || 'ok'}`);

  // 草稿 / pending 不算失败 —— 退出 0 让上层 agent 知道这只是"准备就绪"
  if (result.response.status === 'pending') {
    if (result.response.workaround) {
      console.log(`       workaround:  ${result.response.workaround}`);
    }
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[fatal] ${err.stack || err.message}`);
    process.exit(1);
  });
}

// 导出给测试或上层包装
module.exports = {
  parseArgs,
  loadCredentials,
  loadInput,
  httpRequest,
  httpRequestWithRetry,
  writeOutputs,
  publishWechat,
  publishToutiao,
  publishZhihu,
  publishBilibili,
  publishDouyin,
  // 测试 hook: 替换 _httpRequestImpl 注入 mock (test-only)
  __setHttpRequestForTest: (fn) => { _httpRequestImpl = fn; },
  __resetHttpRequestForTest: () => { _httpRequestImpl = httpRequest; },
};
