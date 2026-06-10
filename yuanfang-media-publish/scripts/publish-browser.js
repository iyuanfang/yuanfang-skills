#!/usr/bin/env node
/**
 * yuanfang-media-publish / scripts/publish-browser.js
 *
 * Playwright 浏览器发布通道 —— 适用于无开放 API 的平台（头条、知乎）或
 * 不想配 API 凭证的公众号场景。
 *
 * 设计原则：
 *   1. 扫码登录 —— 所有平台首次需手机扫码，session 本地缓存免重复扫码
 *   2. 草稿箱优先 —— 保存草稿不群发，用户确认后再发布
 *   3. 零配置启动 —— 不需要 API 凭证，有浏览器就能发
 *   4. 失败保资源 —— 失败时不删除输入文件
 *
 * 用法：
 *   node publish-browser.js --platform wechat  --input output/<session>/公众号/
 *   node publish-browser.js --platform toutiao --input output/<session>/头条/
 *   node publish-browser.js --platform zhihu   --input output/<session>/知乎/
 *   node publish-browser.js --help
 *
 * 流程（每个平台通用）：
 *   1. 启动浏览器 → 打开平台登录页 → 等待用户扫码
 *   2. 自动导航到创建内容页
 *   3. 填入标题 + 正文 + 封面图
 *   4. 保存草稿 → 返回预览 URL
 *
 * 依赖：
 *   npm install playwright（已装）—— 如首次使用需 npx playwright install chromium
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// ============================================================
// 常量
// ============================================================

const SESSION_DIR = path.join(os.homedir(), '.config', 'opencode', 'browser-sessions');
const SESSION_FILE = (platform) => path.join(SESSION_DIR, `${platform}.json`);

const SUPPORTED_PLATFORMS = ['wechat', 'toutiao', 'zhihu'];

const LOGIN_URLS = {
  wechat: 'https://mp.weixin.qq.com/',
  toutiao: 'https://mp.toutiao.com/',
  zhihu: 'https://www.zhihu.com/',
};

const DRAFT_URLS = {
  // After login, navigate directly to article creation
  wechat: 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=10&create=1',
  toutiao: 'https://mp.toutiao.com/profile_v4/graphic/publish',
  zhihu: 'https://zhuanlan.zhihu.com/write',
};

// ============================================================
// CLI 参数解析
// ============================================================

function parseArgs(argv) {
  const args = { platform: null, input: null, mode: 'draft', help: false };
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
      case '--mode':
      case '-m':
        if (!next) throw new Error('--mode 需要一个值 (draft|publish)');
        if (!['draft', 'publish'].includes(next)) {
          throw new Error(`--mode 仅支持 draft|publish, 收到: ${next}`);
        }
        args.mode = next;
        i += 1;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        console.error(`[warn] 忽略未知参数: ${cur}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
用法: node publish-browser.js --platform <name> --input <dir> [--mode draft|publish]

选项:
  --platform, -p <name>     平台名: wechat | toutiao | zhihu
  --input,    -i <dir>      输入目录（含 copy.md + content.json + 封面图）
  --mode,     -m <mode>     发布模式: draft (默认) | publish
                            draft   = 保存到草稿箱（不直接发布）
                            publish = 直接发布到平台（公开可见, 不可撤回）
  --help,   -h              打印本帮助

说明:
  本脚本使用浏览器自动化（Playwright）发布内容，无需 API 凭证。
  首次使用会要求手机扫码登录，后续 session 会自动恢复。

  支持的平台:
    wechat  公众号草稿箱（mp.weixin.qq.com）
    toutiao 头条文章（mp.toutiao.com）
    zhihu   知乎专栏（zhuanlan.zhihu.com）

示例:
  node publish-browser.js --platform wechat  --output output/2026AICS/公众号/
  node publish-browser.js --platform toutiao --output output/2026AICS/头条/
  node publish-browser.js --platform zhihu   --output output/2026AICS/知乎/
`);
}

// ============================================================
// 输入加载
// ============================================================

function loadInput(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`[error] 输入目录不存在: ${dir}`);
    process.exit(1);
  }
  const copyPath = path.join(dir, 'copy.md');
  const contentPath = path.join(dir, 'content.json');
  if (!fs.existsSync(copyPath)) throw new Error(`缺 copy.md: ${copyPath}`);
  if (!fs.existsSync(contentPath)) throw new Error(`缺 content.json: ${contentPath}`);

  const copy = fs.readFileSync(copyPath, 'utf8');
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

  // 封面图：取第一张 PNG/JPG
  const files = fs.readdirSync(dir);
  const cover = files.find((f) => /\.(png|jpg|jpeg)$/i.test(f));
  const coverPath = cover ? path.join(dir, cover) : null;

  return { copy, content, coverPath, dir };
}

// ============================================================
// Cookie / Session 持久化
// ============================================================

function loadSession(platform) {
  const p = SESSION_FILE(platform);
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch { /* ignore corrupt */ }
  }
  return null;
}

function saveSession(platform, cookies, extra = {}) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  const payload = { cookies, ...extra, savedAt: new Date().toISOString() };
  fs.writeFileSync(SESSION_FILE(platform), JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[session] ✅ Cookie 已保存: ${SESSION_FILE(platform)} (extra: ${Object.keys(extra).join(',')})`);
}

// ============================================================
// 浏览器发布函数
// ============================================================

/**
 * 通用：等待用户扫码登录。
 * 打开登录页后，等待 URL 跳转（说明登录成功）或显式的"登录成功"元素。
 */
async function waitForLogin(page, platform, loginUrl) {
  console.log(`[${platform}] 打开登录页 ${loginUrl}`);
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  // 等页面真正渲染完成（QR 元素出现），最多 15s
  await page.waitForSelector(
    'canvas, img[src*="qrcode"], [class*="qrcode"], [class*="QRCode"], iframe',
    { timeout: 15000 }
  ).catch(() => {});
  await page.waitForTimeout(1500);

  // 截图登录页（含二维码），保存到 /tmp/ 供用户扫码
  const qrFile = `/tmp/${platform}-login-${Date.now()}.png`;
  await page.screenshot({ path: qrFile, fullPage: false }).catch(() => {});
  console.log(`\n${'\x1b[33m\x1b[1m' + '═'.repeat(60) + '\x1b[0m'}`);
  console.log(`\x1b[33m\x1b[1m  📸  登录二维码已保存 (立即扫码, QR 通常 1-2 分钟内过期)\x1b[0m`);
  console.log(`\x1b[33m\x1b[1m  文件: ${qrFile}\x1b[0m`);
  console.log(`\x1b[33m\x1b[1m  URL:  file://${qrFile}\x1b[0m`);
  console.log(`${'\x1b[33m\x1b[1m' + '═'.repeat(60) + '\x1b[0m'}\n`);
  // 尝试用系统图片查看器打开 QR，弹窗提醒用户
  try { require('child_process').exec(`xdg-open "${qrFile}" &`); } catch {}
  console.log(`[${platform}] ⏳ 等待扫码登录（10 分钟内有效）...`);

  // 等待 URL 离开登录页（说明登录成功）或等待特定 dashboard 元素
  try {
    await page.waitForURL((url) => {
      // 如果还在登录页，等
      if (url.href.includes('mp.weixin.qq.com') && url.href.includes('token=') ||
          url.href.includes('mp.weixin.qq.com/cgi-bin/home')) {
        return true; // wechat logged in
      }
      if (url.href.includes('mp.toutiao.com/profile_v4') ||
          url.href.includes('mp.toutiao.com') && !url.href.includes('login')) {
        return true; // toutiao logged in
      }
      if (url.href.includes('zhihu.com') && !url.href.includes('signin') && !url.href.includes('login')) {
        return true; // zhihu logged in
      }
      return false;
    }, { timeout: 600000 }); // 10 min for QR scan
  } catch (err) {
    // Timeout — show snapshot for debugging
    console.error(`[${platform}] 登录超时（10 分钟）。捕获页面状态：`);
    const url = page.url();
    console.error(`  URL: ${url}`);
    throw new Error(`登录超时，请重试。确保手机扫码完成。`);
  }

  console.log(`[${platform}] ✅ 登录成功`);
}

/**
 * 填标题 —— 用 React 友好的方式（native setter + 事件）。
 * 关键：React 受控组件只信任"用户输入"事件，直接 .value= 不触发 state 更新。
 * 解决：先取 native value setter，通过 .call() 赋值，React 会"以为"用户输入了。
 * 参考：doocs/cose 和 SyncCaster 的成熟做法。
 */
async function fillTitle(page, title) {
  const titleSelectors = [
    'textarea[placeholder*="文章标题"]',            // 头条
    'textarea[placeholder*="标题"]',                // 知乎
    '.WriteIndex-titleInput textarea',              // 知乎 (旧)
    '.PostEditor-titleInput textarea',              // 知乎 (新)
    'input[placeholder*="标题"]',                   // 头条/通用
    'input[placeholder*="title"]',
    'textarea[placeholder*="title"]',
    '#title',
    '.title-input input',
    'textarea.Input',                               // Zhihu 旧版
  ];

  for (const sel of titleSelectors) {
    const el = await page.$(sel);
    if (!el) continue;

    const tagName = await el.evaluate((n) => n.tagName.toLowerCase());
    console.log(`[title] 找到标题元素 selector=${sel}, tag=${tagName}`);

    // 1. 聚焦
    await el.click({ force: true });
    await page.waitForTimeout(150);

    // 2. 用 native setter 设值（React 关键）
    await page.evaluate(({ selector, value, tag }) => {
      const e = document.querySelector(selector);
      if (!e) return;
      e.focus();
      const proto = tag === 'textarea'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(e, value);
      } else {
        e.value = value;
      }
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
    }, { selector: sel, value: title, tag: tagName });

    await page.waitForTimeout(200);

    // 3. 模拟"用户输入"以触发表单验证（React onChange）
    //    —— 输入一个空格再删掉，知乎等平台需要这个"动静"
    await page.evaluate(({ selector }) => {
      const e = document.querySelector(selector);
      if (!e) return;
      e.focus();
      try { document.execCommand('insertText', false, ' '); } catch {}
      try { document.execCommand('delete', false); } catch {}
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
    }, { selector: sel });

    await page.waitForTimeout(300);

    // 4. 校验
    const actual = await el.evaluate((n) => (n.value || n.innerText || n.textContent || '').trim());
    if (actual && actual.length >= Math.min(title.length, 2)) {
      console.log(`[title] ✅ 标题已填入 (selector=${sel}, 校验文本="${actual.slice(0, 30)}${actual.length > 30 ? '...' : ''}")`);
      return true;
    }
    console.warn(`[title] ⚠️ selector=${sel} 填入后 DOM 校验为空，继续尝试下一个`);
  }

  console.error(`[title] ❌ 标题未找到可填入的元素`);
  return false;
}

/**
 * 填正文 —— 用 ClipboardEvent + DataTransfer 模拟粘贴。
 * 关键：Draft.js / Lexical 都需要真实的 paste 事件，不能用 keyboard 输入。
 * 副作用：知乎会弹"确认并解析"弹窗，需要在调用方点掉。
 */
async function fillBody(page, body) {
  // 知乎的正文可能是 Draft.js (旧) 或 Lexical (新)
  const bodySelectors = [
    'div.ProseMirror[contenteditable="true"]',              // 头条 (ProseMirror)
    '.public-DraftEditor-content[contenteditable="true"]',  // 知乎 Draft.js
    '.DraftEditor-editorContainer [contenteditable="true"]',
    '.PostEditor-content [contenteditable="true"]',        // 知乎 Lexical
    'div[contenteditable="true"][data-lexical-editor="true"]',
    'div[contenteditable="true"][id*="editor"]',
    'div[contenteditable="true"][class*="editor"]',
    'div[contenteditable="true"]',                          // 兜底
  ];

  for (const sel of bodySelectors) {
    const el = await page.$(sel);
    if (!el) continue;

    const tagName = await el.evaluate((n) => n.tagName.toLowerCase());
    console.log(`[body] 找到正文元素 selector=${sel}, tag=${tagName}`);

    // 1. 聚焦
    await el.click({ force: true });
    await page.waitForTimeout(200);

    // 2. 用 ClipboardEvent + DataTransfer 模拟粘贴
    const result = await page.evaluate(({ selector, content }) => {
      const editor = document.querySelector(selector);
      if (!editor) return { success: false, reason: 'no-editor' };
      editor.focus();

      // 清空现有内容
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('delete', false);
      } catch {}

      // 构造 DataTransfer + ClipboardEvent
      const dt = new DataTransfer();
      dt.setData('text/plain', content);

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });

      // 某些浏览器 ClipboardEvent 构造器不接收 clipboardData，用 defineProperty 兜底
      let dispatched;
      try {
        dispatched = editor.dispatchEvent(pasteEvent);
      } catch (e) {
        try {
          Object.defineProperty(pasteEvent, 'clipboardData', { get: () => dt });
          dispatched = editor.dispatchEvent(pasteEvent);
        } catch (e2) {
          return { success: false, reason: 'paste-failed: ' + e2.message };
        }
      }

      // 也派发 input 事件，Draft.js 有些实现需要这个
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: true, dispatched };
    }, { selector: sel, content: body });

    if (!result.success) {
      console.warn(`[body] ⚠️ selector=${sel} 粘贴失败: ${result.reason}`);
      continue;
    }

    await page.waitForTimeout(1500);

    // 3. 校验 —— Draft.js 的内容在 <span data-text="true"> 里，innerText 不可靠，用 textContent
    const actual = await el.evaluate((n) => (n.textContent || n.innerText || '').trim());
    if (actual && actual.length > 5) {
      console.log(`[body] ✅ 正文已填入 (selector=${sel}, 校验 ${actual.length} 字符, Plan A ClipboardEvent)`);
      return true;
    }

    // Plan B: execCommand('insertText') 兜底
    // 原因：某些 Draft.js 实现不响应自定义 ClipboardEvent，但响应真实的 execCommand
    // 实测在 system Chrome 下比 Plan A 更稳
    console.log(`[body] Plan A (ClipboardEvent) 校验为空，尝试 Plan B (execCommand)...`);
    const planBResult = await page.evaluate(({ selector, content }) => {
      const editor = document.querySelector(selector);
      if (!editor) return { success: false, reason: 'no-editor' };
      editor.focus();
      // 清空
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('delete', false);
      } catch {}
      // execCommand insertText —— Draft.js 监听到 onBeforeInput 事件
      let ok = false;
      try { ok = document.execCommand('insertText', false, content); } catch {}
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: ok };
    }, { selector: sel, content: body });

    if (planBResult.success) {
      await page.waitForTimeout(1500);
      const actual2 = await el.evaluate((n) => (n.textContent || n.innerText || '').trim());
      if (actual2 && actual2.length > 5) {
        console.log(`[body] ✅ 正文已填入 (selector=${sel}, 校验 ${actual2.length} 字符, Plan B execCommand)`);
        return true;
      }
      console.warn(`[body] ⚠️ Plan B 插入后 DOM 仍为空`);
    } else {
      console.warn(`[body] ⚠️ Plan B execCommand 返回失败`);
    }

    // Plan C: ProseMirror 专用 — 用 page.keyboard.insertText + Tab 触发 React 提交
    // 原因：头条编辑器用 ProseMirror，自定义事件不触发其 onChange，必须用真实键盘事件
    console.log(`[body] 尝试 Plan C (ProseMirror insertText + Tab)...`);
    await el.click({ force: true });
    await page.waitForTimeout(200);
    try {
      await page.keyboard.insertText(body);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(2000);
      const actual3 = await el.evaluate((n) => (n.textContent || n.innerText || '').trim());
      if (actual3 && actual3.length > 5) {
        console.log(`[body] ✅ 正文已填入 (selector=${sel}, 校验 ${actual3.length} 字符, Plan C insertText+Tab)`);
        return true;
      }
      console.warn(`[body] ⚠️ Plan C 后 DOM 仍为空`);
    } catch (e) {
      console.warn(`[body] ⚠️ Plan C 失败: ${e.message}`);
    }
    console.warn(`[body] ⚠️ selector=${sel} 粘贴后 DOM 校验为空，继续尝试下一个`);
  }

  console.error(`[body] ❌ 正文未找到可填入的元素`);
  return false;
}

/**
 * 点击"确认并解析"弹窗（知乎粘贴 Markdown 后会弹）。
 * 如果没有弹窗，安全返回 false。
 */
async function clickParseDialog(page, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], .Button'));
      // 找"确认并解析"或"解析为富文本"等
      const parseBtn = buttons.find((b) => {
        const t = (b.textContent || '').trim();
        return /确认并解析|解析为|转换为富文本|转换为Markdown|Markdown.+解析/i.test(t)
          && t.length < 30;
      });
      if (parseBtn) {
        parseBtn.click();
        return parseBtn.textContent.trim();
      }
      return null;
    });
    if (clicked) {
      console.log(`[parse] ✅ 已点击"${clicked}"按钮`);
      await page.waitForTimeout(1500);
      return true;
    }
    await page.waitForTimeout(300);
  }
  console.log(`[parse] ℹ️ ${timeoutMs / 1000} 秒内未发现"确认并解析"弹窗`);
  return false;
}

/**
 * 通用：把内容填入编辑器。封装 title + body + 解析弹窗。
 */
async function fillContent(page, content) {
  const { title, body } = content;

  // 1. 填标题
  const titleOk = await fillTitle(page, title);
  if (!titleOk) console.warn(`[editor] ⚠️ 标题未填入`);

  // 等标题先稳定（知乎的"草稿加载中"提示）
  await page.waitForTimeout(800);

  // 2. 填正文
  const bodyOk = await fillBody(page, body);

  // 3. 不管 bodyOk 与否，都尝试点"确认并解析"弹窗
  //    —— 知乎粘贴 Markdown 后会立刻弹这个，内容被弹窗挡住时校验会显示"空"
  if (titleOk || bodyOk) {
    await clickParseDialog(page, 5000);
  }

  if (!bodyOk) {
    console.warn(`[editor] ⚠️ 未能自动填入正文。请手动粘贴内容。`);
    console.log(`[editor] 📋 标题: ${title}`);
    console.log(`[editor] 📋 正文前 200 字: ${body.slice(0, 200)}...`);
  }
}

/**
 * 把 Markdown 转成纯文本（用于 keyboard 输入）。
 * 保留段落分隔、标题前缀，让 Lexical 自己解析格式。
 */
function mdToPlainText(md) {
  return md
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      // 标题前缀 → 保留为文本（Lexical 会处理）
      return p;
    })
    .join('\n\n');
}

/**
 * 把 Markdown 转成简单 HTML（用于 contenteditable 注入）。
 * 不处理列表/代码块/链接，只保证标题/段落正常。
 */
function mdToHtml(md) {
  return md
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      if (p.startsWith('### ')) return `<h3>${escapeHtml(p.slice(4))}</h3>`;
      if (p.startsWith('## ')) return `<h2>${escapeHtml(p.slice(3))}</h2>`;
      if (p.startsWith('# ')) return `<h1>${escapeHtml(p.slice(2))}</h1>`;
      // 段落内换行 → <br>
      const html = escapeHtml(p).replace(/\n/g, '<br>');
      return `<p>${html}</p>`;
    })
    .join('');
}

/**
 * 去除 copy.md 顶部的 YAML frontmatter（--- 之间的元数据）。
 */
function stripFrontmatter(md) {
  const m = md.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
  return m ? md.slice(m[0].length).trim() : md.trim();
}

/**
 * 通用：上传封面图。
 * 策略：先尝试平台特定的"封面"按钮（避免和正文的图片上传冲突），
 * 再回退到通用 file input / 上传按钮 + file chooser。
 */

/**
 * 检查登录状态：尝试恢复 session cookie。
 * 重要：把 cookie 加到共享 context（后续 publish 函数必须从这个 context 建 page）。
 * 返回值: { context, restored }
 *   - context: browser context（带 cookie）
 *   - restored: true=cookie 有效，false=需要重新登录
 */
async function tryRestoreSession(browser, platform) {
  const saved = loadSession(platform);
  const context = browser.contexts()[0] || await browser.newContext();
  if (!saved || !Array.isArray(saved)) {
    return { context, restored: false };
  }
  try {
    await context.addCookies(saved);
    console.log(`[session] ✅ 已恢复 ${platform} Cookie 到共享 context`);
    return { context, restored: true };
  } catch (err) {
    console.warn(`[session] ⚠️ Cookie 恢复失败: ${err.message}`);
    return { context, restored: false };
  }
}

// ============================================================
// 各平台发布逻辑
// ============================================================

async function publishWechat(browser, input, mode = 'draft') {
  const { context, restored } = await tryRestoreSession(browser, 'wechat');
  const page = await context.newPage();

  if (!restored) {
    await waitForLogin(page, 'wechat', LOGIN_URLS.wechat);
  } else {
    await page.goto(LOGIN_URLS.wechat, { waitUntil: 'domcontentloaded' });
  }

  // 等待 window.wx 加载，提取 token + ticket
  console.log(`[wechat] 提取 token + ticket...`);
  let creds = await page.evaluate(() => {
    const t = (window.wx && window.wx.commonData && window.wx.commonData.t) || null;
    const ticket = (window.wx && window.wx.commonData && window.wx.commonData.ticket) || null;
    const userName = (window.wx && window.wx.commonData && window.wx.commonData.user_name) || null;
    return { token: t, ticket, user_name: userName };
  });
  if (!creds.token) {
    // 备用: 从 page HTML regex
    const html = await page.content();
    const tMatch = html.match(/t:\s*"(\d+)"/);
    if (tMatch) creds.token = tMatch[1];
  }

  if (!creds.token) {
    throw new Error(`[wechat] 无法提取 token, 登录可能失败, 请扫码后重试`);
  }
  console.log(`[wechat] token=${creds.token.slice(0, 6)}... ticket=${creds.ticket ? 'yes' : 'no'} user_name=${creds.user_name || 'n/a'}`);

  const cookies = await page.context().cookies();
  const cookieHeader = cookies
    .filter((c) => c.domain.includes('weixin.qq.com'))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  saveSession('wechat', cookies, { token: creds.token, ticket: creds.ticket, user_name: creds.user_name });

  // 准备内容
  const title = (input.content.title || (stripFrontmatter(input.copy).split('\n')[0] || '').slice(0, 64)).slice(0, 60);
  const htmlBody = buildWechatBody(input.copy);
  console.log(`[wechat] 标题: ${title} (${title.length} 字)  正文: ${htmlBody.length} 字符`);

  // 上传封面 (scene=1 = 永久素材, 返回 media_id + cdn_url)
  let coverMediaId = '';
  let coverCdnUrl = '';
  if (input.coverPath) {
    console.log(`[wechat] 上传封面到永久素材库...`);
    const up = await uploadWechatMaterial(context, creds.token, cookieHeader, input.coverPath, 1);
    coverMediaId = up.media_id;
    coverCdnUrl = up.cdn_url;
    console.log(`[wechat] ✅ 封面上传完成 media_id=${coverMediaId} url=${coverCdnUrl}`);
  }

  // 上传正文图片 (scene=8 = 正文图), 替换 input.coverPath 之外的所有本地图为 mmbiz URL
  const finalHtml = await uploadAndReplaceWechatImages(context, creds.token, cookieHeader, htmlBody);

  // 调用 operate_appmsg API 创建草稿/发布
  const appMsgId = await createWechatAppMsg(context, creds.token, cookieHeader, {
    title,
    content: finalHtml,
    coverMediaId,
    coverCdnUrl,
    digest: input.content.digest || '',
  }, { mode });

  const publishedAt = new Date().toISOString();
  const draftUrl = `https://mp.weixin.qq.com/cgi-bin/appmsg?action=list&type=10&appmsgid=${appMsgId}`;
  const result = {
    postUrl: draftUrl,
    publishedAt,
    response: { platform: 'wechat', mode: `api-${mode}`, appMsgId, coverMediaId, coverCdnUrl },
  };

  if (mode === 'publish') {
    console.log(`[wechat] 群发模式: 调 masssend API...`);
    const massResult = await massSendWechatAppMsg(context, creds.token, cookieHeader, { appMsgId });
    result.response.massSend = massResult;
    if (massResult.status === 'sent') {
      result.postUrl = `https://mp.weixin.qq.com/cgi-bin/appmsg?action=list&type=10&appmsgid=${appMsgId}&sent=1`;
      result.response.mode = 'api-publish-sent';
      console.log(`[wechat] ✅ 群发成功 msgId=${massResult.msgId}`);
    } else if (massResult.status === 'qr_required') {
      result.response.mode = 'api-publish-qr-required';
      console.log(`[wechat] ⚠️ 群发保护: ${massResult.manualAction} (qr=${massResult.qrUrl || 'see response'})`);
    } else {
      result.response.mode = 'api-publish-draft-only';
      console.log(`[wechat] ⚠️ 群发失败, 草稿已保留: ${massResult.manualAction}`);
    }
  }

  return result;
}

async function uploadWechatMaterial(context, token, cookieHeader, filePath, scene) {
  const fileBuf = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const url = `https://mp.weixin.qq.com/cgi-bin/filetransfer?action=upload_material&scene=${scene}&writetype=doublewrite&groupid=1&token=${token}&lang=zh_CN`;
  const resp = await context.request.post(url, {
    multipart: {
      file: { name: fileName, mimeType: 'image/jpeg', buffer: fileBuf },
    },
    headers: {
      Cookie: cookieHeader,
      Referer: 'https://mp.weixin.qq.com/',
    },
    timeout: 60000,
  });
  if (!resp.ok()) {
    throw new Error(`[wechat] 上传 HTTP ${resp.status()}: ${(await resp.text()).slice(0, 200)}`);
  }
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`[wechat] 上传响应非 JSON: ${text.slice(0, 200)}`); }
  if (json.errcode && json.errcode !== 0) {
    throw new Error(`[wechat] 上传 errcode=${json.errcode} errmsg=${json.errmsg || ''}`);
  }
  if (scene === 1) {
    return { media_id: json.content || json.media_id, cdn_url: json.cdn_url || '' };
  }
  return { cdn_url: json.cdn_url || json.url || '', raw: json };
}

async function uploadAndReplaceWechatImages(context, token, cookieHeader, htmlBody) {
  const mdImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const matches = [...htmlBody.matchAll(mdImageRegex)];
  if (matches.length === 0) return htmlBody;
  console.log(`[wechat] 发现 ${matches.length} 张正文图, 准备上传...`);
  let result = htmlBody;
  for (const m of matches) {
    const localPath = m[2];
    if (!localPath.startsWith('/') && !fs.existsSync(localPath)) continue;
    try {
      const up = await uploadWechatMaterial(context, token, cookieHeader, localPath, 8);
      if (up.cdn_url) {
        result = result.replace(m[2], up.cdn_url);
        console.log(`[wechat]   ✅ ${path.basename(localPath)} → ${up.cdn_url.slice(0, 60)}...`);
      }
    } catch (e) {
      console.warn(`[wechat]   ⚠️ 上传失败: ${localPath} (${e.message})`);
    }
  }
  return result;
}

async function createWechatAppMsg(context, token, cookieHeader, { title, content, coverMediaId, coverCdnUrl, digest }, options = {}) {
  const { mode = 'draft' } = options;
  const url = `https://mp.weixin.qq.com/cgi-bin/operate_appmsg?t=ajax-response&sub=create&type=77&token=${token}&lang=zh_CN`;
  const form = new URLSearchParams();
  form.append('token', token);
  form.append('AppMsgId', '');
  form.append('count', '1');
  form.append('title0', title);
  form.append('author0', '');
  form.append('content0', content);
  form.append('digest0', digest);
  form.append('fileid0', coverMediaId);
  form.append('cdn_url0', coverCdnUrl);
  form.append('cdn_235_1_url0', coverCdnUrl);
  form.append('cdn_1_1_url0', coverCdnUrl);
  form.append('show_cover_pic0', coverCdnUrl ? '1' : '0');
  form.append('auto_gen_digest0', digest ? '0' : '1');
  form.append('need_open_comment0', '1');
  form.append('only_fans_can_comment0', '0');
  form.append('copyright_type0', '0');
  form.append('free_content0', '');
  form.append('pay_album_id0', '');
  form.append('appmsgalbumid0', '');
  form.append('reprint_perm_type0', '');
  form.append('original_perm_type0', '');
  form.append('ori_white_list0', '');
  form.append('music_id0', '');
  form.append('video_id0', '');
  form.append('vote_id0', '');
  form.append('article_level0', '0');
  form.append('card_id0', '');
  form.append('recommend_card_id0', '');
  form.append('recommend_subtitle0', '');
  form.append('appmsg_album_id0', '');
  form.append('is_dwxz0', '0');
  form.append('dwxz_appmsgid0', '');
  form.append('related_internal_share0', '');
  form.append('share_page_type0', '0');
  form.append('share_imageinfo0', JSON.stringify({ image_list: [] }));
  form.append('source_username0', '');
  form.append('source_nickname0', '');
  form.append('source_article_id0', '');
  form.append('source_content0', '');
  form.append('need_post_perm0', '0');
  form.append('post_perm_xml00', '');
  form.append('post_perm_xml10', '');
  form.append('post_perm_xml20', '');
  form.append('post_perm_xml30', '');
  form.append('external_link0', '');
  form.append('redirect_external_link0', '');
  form.append('share_external_link0', '');
  form.append('share_redirect_external_link0', '');
  form.append('plugin_product_id0', '');
  form.append('product_id0', '');
  form.append('unlined_product_id0', '');

  const resp = await context.request.post(url, {
    headers: {
      Cookie: cookieHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: 'https://mp.weixin.qq.com/',
      'X-Requested-With': 'XMLHttpRequest',
    },
    data: form.toString(),
  });
  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (e) {
    throw new Error(`[wechat] operate_appmsg 响应非 JSON: ${text.slice(0, 300)}`);
  }
  if (json.base_resp && json.base_resp.ret !== 0) {
    throw new Error(`[wechat] 创建草稿失败: ret=${json.base_resp.ret} err_msg=${json.base_resp.err_msg || json.base_resp.errMsg || JSON.stringify(json.base_resp)}`);
  }
  const appMsgId = json.appMsgId || json.data?.appMsgId;
  if (!appMsgId) {
    throw new Error(`[wechat] 响应无 appMsgId: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return appMsgId;
}

/**
 * 群发 (publish) 文章到所有关注者。
 *
 * 限制:
 *   - 订阅号: 1 次/天 群发
 *   - 服务号: 4 次/月 群发
 *   - 群发保护 mass_protect 开启时必须 admin 用手机扫二维码 (无程序化绕过)
 *   - 个人订阅号无群发权限
 *
 * @returns {Promise<{msgId?: string, status: string, manualAction?: string}>}
 *   - status: 'sent' (群发成功)
 *   - status: 'qr_required' (mass_protect 开启, 返回 qr_url 让 admin 扫码)
 *   - status: 'draft_only' (群发失败, 草稿已保留, 提示人手到后台群发)
 */
async function massSendWechatAppMsg(context, token, cookieHeader, { appMsgId, groupId = '', directSend = '1', sendTime = '' }) {
  const url = `https://mp.weixin.qq.com/cgi-bin/masssend?t=ajax-response&token=${token}`;
  const form = new URLSearchParams({
    token,
    type: '10',
    appmsgid: appMsgId,
    groupid: groupId,
    direct_send: directSend,
    send_time: sendTime,
    card_ext_json: '',
    card_id: '',
    source_appmsgid: '',
    sync_author_to_comment: '0',
    not_use_custom_group: '0',
  });

  const resp = await context.request.post(url, {
    headers: {
      Cookie: cookieHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: 'https://mp.weixin.qq.com/cgi-bin/appmsg?action=list&type=10',
      'X-Requested-With': 'XMLHttpRequest',
    },
    data: form.toString(),
  });
  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (e) {
    throw new Error(`[wechat] masssend 响应非 JSON: ${text.slice(0, 300)}`);
  }

  // 群发保护 - 返回 qr 链接
  if (json.base_resp?.ret === 10000 || json.errcode === 10000) {
    return { status: 'qr_required', qrUrl: json.qr_url || json.safeqrconnect || null, manualAction: 'admin 用微信扫二维码完成群发保护验证' };
  }
  if (json.base_resp && json.base_resp.ret !== 0) {
    return { status: 'failed', ret: json.base_resp.ret, errMsg: json.base_resp.err_msg || json.base_resp.errMsg, manualAction: '草稿已保留, 请登录微信公众平台后台手动群发' };
  }
  return { status: 'sent', msgId: json.msgId || json.data?.msgId, response: json };
}

async function publishToutiao(browser, input, mode = 'draft') {
  const { context, restored } = await tryRestoreSession(browser, 'toutiao');
  const page = await context.newPage();

  if (!restored) {
    await waitForLogin(page, 'toutiao', LOGIN_URLS.toutiao);
  }

  console.log(`[toutiao] 导航到新建文章...`);
  await page.goto(DRAFT_URLS.toutiao, { waitUntil: 'load', timeout: 90000 }).catch(() => {});

  try {
    await Promise.race([
      page.waitForSelector('textarea[placeholder*="文章标题"]', { timeout: 60000 }),
      page.waitForSelector('div.ProseMirror', { timeout: 60000 }),
    ]);
  } catch (e) {
    console.warn(`[toutiao] ⚠️ 等待编辑器超时`);
  }
  await page.waitForFunction(() => !!document.querySelector('div.ProseMirror'), { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const cookies = await page.context().cookies();
  saveSession('toutiao', cookies);

  const cleanCopy = stripFrontmatter(input.copy);
  const content = {
    title: input.content.title || cleanCopy.split('\n')[0].slice(0, 64),
    body: cleanCopy,
  };

  await fillContent(page, content);

  // 等内容输入完成后再上传封面（确保 React state 同步）
  let coverMeta = null;
  // 监听封面上传响应 — 头条返回 {image_uri, image_url}
  const uploadRespHandler = async (response) => {
    const url = response.url();
    if (response.status() !== 200) return;
    if (!url.includes('toutiao') && !url.includes('bytedance') && !url.includes('byteimg') && !url.includes('bytegoofy')) return;
    try {
      const body = await response.text();
      const isUploadResp = body.includes('"image_uri"') || body.includes('"image_url"') || body.includes('"web_uri"');
      if (!isUploadResp) return;
      let parsed;
      try { parsed = JSON.parse(body); } catch { return; }
      const data = parsed.data || parsed;
      const image_uri = data.image_uri || data.web_uri || data.uri || '';
      const image_url = data.image_url || data.url || '';
      const width = data.width || 1280;
      const height = data.height || 720;
      if (!image_uri && !image_url) return;
      const finalUrl = image_url || ('https://image-tt-private.toutiao.com/' + image_uri);
      coverMeta = {
        id: 2,
        url: finalUrl,
        uri: image_uri,
        origin_uri: image_uri,
        ic_uri: '',
        thumb_width: width,
        thumb_height: height,
        extra: { from_content_uri: '', from_content: '0' },
      };
      console.log(`[toutiao] 📸 截获封面 URL: ${finalUrl}`);
    } catch {}
  };
  page.on('response', uploadRespHandler);

  if (input.coverPath) {
    console.log(`[toutiao] 上传封面...`);
    try {
      const opened = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        for (const el of els) {
          const t = (el.innerText || '').trim();
          if (t === '发文设置' && el.offsetParent !== null) { el.click(); return true; }
        }
        return false;
      });
      if (opened) {
        await page.waitForTimeout(1500);
        await page.waitForSelector('.article-cover-add', { timeout: 5000 }).catch(() => null);
        await page.evaluate(() => {
          document.querySelector('.article-cover-add')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        await page.waitForTimeout(2000);
        await page.waitForSelector('.mp-ic-img-drawer', { timeout: 5000 }).catch(() => null);
        const clicked = await page.evaluate(() => {
          const buttons = document.querySelectorAll('.mp-ic-img-drawer button, .mp-ic-img-drawer [role=button]');
          for (const b of buttons) {
            if ((b.innerText || '').trim() === '本地上传' && b.offsetParent !== null) {
              b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              return true;
            }
          }
          return false;
        });
        if (clicked) {
          await page.waitForSelector('input[type=file][accept^="image"]', { timeout: 5000 }).catch(() => null);
          const fi = await page.$('input[type=file][accept^="image"]');
          if (fi) {
            await fi.setInputFiles(input.coverPath);
            await page.waitForFunction(() => {
              const buttons = document.querySelectorAll('.mp-ic-img-drawer button');
              for (const b of buttons) if (b.offsetParent !== null && (b.innerText || '').trim() === '确定') return true;
              return false;
            }, { timeout: 30000 }).catch(() => console.warn(`[toutiao] ⚠️ 等待"确定"超时`));
            const confirmed = await page.evaluate(() => {
              const buttons = document.querySelectorAll('.mp-ic-img-drawer button');
              for (const b of buttons) {
                if (b.offsetParent !== null && (b.innerText || '').trim() === '确定') {
                  b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                  return true;
                }
              }
              return false;
            });
            if (confirmed) {
              console.log(`[toutiao] ✅ 已点"确定"，封面已应用`);
              await page.waitForTimeout(3000);
              // 截图保存封面状态供调试
              await page.screenshot({ path: '/tmp/toutiao-after-cover.png' }).catch(() => {});
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[toutiao] ⚠️ 封面上传 UI 流程失败: ${e.message}`);
    }
  }

  // 关闭 AI 助手抽屉
  await page.evaluate(() => {
    document.querySelectorAll('.ai-assistant-drawer, .ai-assistant').forEach(el => el.remove());
  }).catch(() => {});

  // 提取内容 + 从 React state 提取 cover URL
  const extracted = await page.evaluate(() => {
    const title = document.querySelector('textarea[placeholder*="文章标题"]')?.value || '';
    const pm = document.querySelector('div.ProseMirror');
    const body = pm?.innerHTML || pm?.innerText || '';

    // 从 ProseMirror React fiber 提取 cover
    let coverUrl = null;
    try {
      const reactKey = Object.keys(pm).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
      if (reactKey) {
        let fiber = pm[reactKey];
        const visited = new WeakSet();
        const walk = (node, depth = 0) => {
          if (!node || visited.has(node) || depth > 20) return null;
          visited.add(node);
          if (typeof node === 'object' && node.memoizedProps) {
            const p = node.memoizedProps;
            if (p?.cover?.url) return p.cover.url;
            if (p?.covers?.[0]?.url) return p.covers[0].url;
            if (p?.pgcFeedCovers?.[0]?.url) return p.pgcFeedCovers[0].url;
            if (p?.articleCover?.url) return p.articleCover.url;
            if (p?.value?.url) return p.value.url;
          }
          const r = walk(node.return, depth + 1) || walk(node.child, depth + 1) || walk(node.sibling, depth + 1);
          return r;
        };
        coverUrl = walk(fiber);
      }
    } catch {}

    // 备选：扫描全局 state 容器
    if (!coverUrl) {
      try {
        // 头条编辑器的 state 可能在 __INITIAL_STATE__ 或 Redux DevTools
        if (window.__INITIAL_STATE__) {
          const dump = JSON.stringify(window.__INITIAL_STATE__);
          const match = dump.match(/https?:\/\/[^"'\s]*tos-cn[^"'\s]*/);
          if (match) coverUrl = match[0];
        }
      } catch {}
    }

    // 备选：从 network 看过的 URL 缓存（头条会通过 setState 注入到 React 中）
    if (!coverUrl) {
      const covers = document.querySelectorAll('[style*="background-image"]');
      for (const el of covers) {
        const bg = el.style.backgroundImage || getComputedStyle(el).backgroundImage;
        const m = bg.match(/url\("?(https?:\/\/[^"]*tos-cn[^"]*)"?\)/);
        if (m) { coverUrl = m[1]; break; }
      }
    }

    // 备选：从 data-src / dataset 找
    if (!coverUrl) {
      const all = document.querySelectorAll('[data-src*="tos-cn"], [data-cover*="tos-cn"], [data-url*="tos-cn"]');
      for (const el of all) {
        const u = el.dataset.src || el.dataset.cover || el.dataset.url;
        if (u) { coverUrl = u; break; }
      }
    }

    // 备选：从头条的发布设置抽屉里的元素找
    if (!coverUrl) {
      // 找所有 background-image 包含 image-tt-private 或 p3.pstatp 的
      const allEls = Array.from(document.querySelectorAll('*'));
      for (const el of allEls) {
        const style = el.getAttribute('style') || '';
        if (style.includes('image-tt-private') || style.includes('p3.pstatp') || style.includes('p11-sign')) {
          const m = style.match(/url\("?(https?:\/\/[^"\s)]+)"?\)/);
          if (m) { coverUrl = m[1]; break; }
        }
      }
    }

    return { title, body, coverUrl };
  });

  // 从 ProseMirror innerHTML 提取 body（更准确，包含格式）
  const titleVal = extracted.title || content.title;
  const bodyVal = extracted.body || content.body;

  // cover: 优先用上传响应截获的 coverMeta，回退到 DOM 提取
  const cover = coverMeta || (extracted.coverUrl ? {
    id: 2,
    url: extracted.coverUrl,
    uri: extracted.coverUrl.split('/').slice(-2).join('/'),
    origin_uri: extracted.coverUrl.split('/').slice(-2).join('/'),
    ic_uri: '',
    thumb_width: 1280,
    thumb_height: 720,
    extra: { from_content_uri: '', from_content: '0' },
  } : null);
  console.log(`[toutiao] cover: ${cover?.url?.slice(0, 60) || 'null'}`);

  // 取 CSRF + media_id
  const csrf = (cookies.find(c => c.name === 'csrftoken') || cookies.find(c => c.name === 'csrf_token'))?.value;
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  // 取 media_id (publish URL 需要 — 但其实浏览器已经签了save URL，直接用浏览器抓到的save URL就行)
  // 触发一次 autosave 让浏览器拿到 publish URL，再从请求里抓
  console.log(`[toutiao] 触发 autosave 捕获 save URL...`);
  let saveUrlPath = null;
  let saveBodyTemplate = null;
  page.on('request', req => {
    if (req.method() !== 'POST') return;
    const url = req.url();
    if (!url.includes('mp.toutiao.com')) return;
    const postData = req.postData() || '';
    if (!postData.includes('content=')) return;
    saveUrlPath = new URL(url).pathname + new URL(url).search;
    saveBodyTemplate = postData;
    console.log(`[toutiao] 📡 截获 POST: ${saveUrlPath.slice(-30)} save=${postData.match(/save=(\d)/)?.[1]}`);
  });

  // 触发 autosave — 先聚焦到 ProseMirror，再输入和删除
  await page.focus('div.ProseMirror');
  await page.waitForTimeout(500);
  await page.keyboard.press('End');
  await page.keyboard.type(' ', { delay: 50 });
  await page.waitForTimeout(500);
  await page.keyboard.press('Backspace');

  // 等 autosave 触发（头条 autosave debounce 约 30s）
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(2000);
    if (saveUrlPath) break;
  }
  if (!saveUrlPath) {
    console.error(`[toutiao] ❌ 90s 内未触发 autosave`);
    throw new Error('TOUTIAO_AUTOSAVE_NOT_TRIGGERED');
  }
  console.log(`[toutiao] 截获 save URL: ${saveUrlPath.slice(-30)}`);

  // 构建 save body
  // saveFlag: publish=1 (publish endpoint or autosave), draft=1 (publish endpoint 才会创建草稿)
  // autosave endpoint 的 save=0 总是返回 7050 (账号限制)，不能用
  // publish endpoint 的 save=1 创建一个 article (草稿状态由审核决定)
  const saveFlag = '1';
  const fd = new URLSearchParams(saveBodyTemplate);
  fd.set('save', saveFlag);
  if (cover) {
    fd.set('pgc_feed_covers', JSON.stringify([cover]));
    try {
      const draftForm = JSON.parse(fd.get('draft_form_data') || '{}');
      draftForm.coverType = 2;
      fd.set('draft_form_data', JSON.stringify(draftForm));
    } catch {
      fd.set('draft_form_data', JSON.stringify({ coverType: 2 }));
    }
  }
  fd.set('title', titleVal);
  fd.set('content', bodyVal);

  // 用浏览器 context.request 发送（自动带 cookie）
  const apiBase = 'https://mp.toutiao.com';
  // 草稿模式: 用 publish endpoint + save=1（gitmen-obsidian 模式 = 创建文章但状态为 draft）
  // 发布模式: 用截获的 autosave URL + save=1（已验证成功）
  let apiResp;
  if (mode === 'draft') {
    apiResp = await page.context().request.post(
      `${apiBase}/mp/agw/article/publish?source=mp&type=article`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': csrf,
        'Referer': 'https://mp.toutiao.com/profile_v4/graphic/publish',
        'Origin': 'https://mp.toutiao.com',
      },
      data: fd.toString(),
    });
  } else {
    apiResp = await page.context().request.post(apiBase + saveUrlPath, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': csrf,
        'Referer': 'https://mp.toutiao.com/profile_v4/graphic/publish',
        'Origin': 'https://mp.toutiao.com',
      },
      data: fd.toString(),
    });
  }

  const respText = await apiResp.text();
  console.log(`[toutiao] save API 响应: ${apiResp.status()} mode=${mode} → ${respText.slice(0, 300)}`);

  let pgcId = null;
  let errCode = null;
  let errMsg = null;
  try {
    const parsed = JSON.parse(respText);
    pgcId = parsed.data?.pgc_id || parsed.data?.article_id;
    errCode = parsed.code;
    errMsg = parsed.message || parsed.msg;
  } catch {}

  if (!pgcId || pgcId === '0') {
    console.error(`[toutiao] ❌ ${mode === 'publish' ? '发布' : '保存'}失败 code=${errCode} msg=${errMsg}`);
    throw new Error(`TOUTIAO_${mode === 'publish' ? 'PUBLISH' : 'SAVE'}_FAILED:${errCode}:${errMsg}`);
  }

  console.log(`[toutiao] ✅ ${mode === 'publish' ? '发布' : '保存'}成功 pgc_id=${pgcId}`);
  const draftUrl = mode === 'publish'
    ? `https://www.toutiao.com/item/${pgcId}/`
    : `https://mp.toutiao.com/profile_v4/graphic/draft`;

  const publishedAt = new Date().toISOString();
  return {
    postUrl: draftUrl,
    publishedAt,
    response: {
      platform: 'toutiao',
      mode: `browser-${mode}`,
      pgc_id: pgcId,
    },
  };
}

async function publishZhihu(browser, input, mode = 'draft') {
  const { context, restored } = await tryRestoreSession(browser, 'zhihu');
  const page = await context.newPage();

  if (!restored) {
    await waitForLogin(page, 'zhihu', LOGIN_URLS.zhihu);
  }

  console.log(`[zhihu] 导航到写文章...`);
  await page.goto(DRAFT_URLS.zhihu, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

  // 等知乎"草稿加载中"提示消失
  await page.waitForTimeout(2500);

  const cookies = await page.context().cookies();
  saveSession('zhihu', cookies);

  const cleanCopy = stripFrontmatter(input.copy);
  const content = {
    title: input.content.title || (cleanCopy.split('\n')[0] || '').slice(0, 64),
    body: cleanCopy,
  };

  await fillContent(page, content);

  // --- 封面 (zhihu) ---
  if (input.coverPath) {
    console.log(`[zhihu] 尝试"发布设置"面板上传封面...`);
    const settingsBtn = await page.$('button:has-text("发布设置"), a:has-text("发布设置")');
    if (settingsBtn) {
      try {
        await settingsBtn.click({ force: true, timeout: 10000 });
        console.log(`[zhihu] ✅ 已点"发布设置"`);
        await page.waitForTimeout(1500);
        const chooserPromise = page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null);
        const coverClicked = await page.evaluate(() => {
          const all = document.querySelectorAll('button, a, div, span, [role="button"]');
          for (const el of all) {
            const t = (el.innerText || el.textContent || '').trim();
            if (t === '添加文章封面' || t === '设置封面' || t === '添加封面' || t === '更换封面') {
              el.click();
              return t;
            }
          }
          return null;
        });
        if (coverClicked) {
          console.log(`[zhihu] ✅ 已点"${coverClicked}"`);
          await page.waitForTimeout(500);
          const chooser = await chooserPromise;
          if (chooser) {
            await chooser.setFiles(input.coverPath);
            console.log(`[zhihu] ✅ 封面已上传 (filechooser)`);
            await page.waitForTimeout(5000);
          }
        }
      } catch (e) {
        console.warn(`[zhihu] ⚠️ 封面上传失败: ${e.message}`);
      }
    }
  } else {
    console.log(`[zhihu] ⏭️ 无封面图`);
  }

  // --- 保存/发布 (zhihu) ---
  let draftUrl = '';
  const saveOrPublishSelectors = mode === 'publish' ? [
    'button:has-text("发布文章")',
    'button:has-text("发布")',
    'button:has-text("下一步")',
    'button:has-text("保存草稿")',
    'button:has-text("保存")',
    '[class*="DraftButton"]',
  ] : [
    'button:has-text("保存草稿")',
    'button:has-text("保存")',
    '[class*="DraftButton"]',
  ];
  for (const sel of saveOrPublishSelectors) {
    const btn = await page.$(sel);
    if (btn) {
      await btn.click();
      console.log(`[zhihu] ✅ 已点${mode === 'publish' ? '发布' : '保存'}按钮 (${sel})`);
      break;
    }
  }
  await page.waitForTimeout(3000);
  // publish 模式可能弹"确认发布" dialog，按 Enter 确认
  if (mode === 'publish') {
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(2000);
  }
  draftUrl = page.url();

  // 截图保存到 /tmp/，方便用户核对填写效果
  const screenshotPath = `/tmp/zhihu-${mode}-${Date.now()}.png`;
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[zhihu] 📸 截图已保存: ${screenshotPath}`);
  } catch (e) {
    console.warn(`[zhihu] ⚠️ 截图失败: ${e.message}`);
  }

  const publishedAt = new Date().toISOString();
  return {
    postUrl: draftUrl || `(请登录知乎后台查看${mode === 'publish' ? '已发布' : '草稿'})`,
    publishedAt,
    response: {
      platform: 'zhihu',
      mode: `browser-${mode}`,
      screenshot: screenshotPath,
    },
  };
}

function buildWechatBody(copy) {
  // 去掉 frontmatter 部分（--- 之间的内容）
  const body = copy.replace(/^---[\s\S]*?---\n*/, '').trim();
  // 把 Markdown 转成简单段落
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      // 标题
      if (p.startsWith('## ')) return `<h2>${escapeHtml(p.slice(3))}</h2>`;
      if (p.startsWith('# ')) return `<h1>${escapeHtml(p.slice(2))}</h1>`;
      return `<p>${escapeHtml(p)}</p>`;
    })
    .join('\n');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// 写入输出
// ============================================================

function writeOutputs(originalInputDir, platform, result) {
  const outDir = path.join(originalInputDir, platform);
  fs.mkdirSync(outDir, { recursive: true });
  const { postUrl = '', publishedAt = '', response = {} } = result;
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
    console.error(`[error] 不支持的平台: ${args.platform}（支持: ${SUPPORTED_PLATFORMS.join(', ')}）`);
    process.exit(1);
  }

  const input = loadInput(args.input);
  console.log(`[main] 平台=${args.platform} 输入=${input.dir} 封面=${input.coverPath || '无'} 模式=${args.mode}`);

  // 启动浏览器 —— 优先用系统 Chrome（反检测更强），回退到 Chromium
  // channel: 'chrome' 会调用 /usr/bin/google-chrome 而不是 playwright 自带的 chromium
  // 实测：知乎、CSDN 等的 anti-bot 对系统 Chrome 识别度更低
  let browser;
  try {
    console.log(`[main] 启动系统 Chrome (channel: 'chrome')...`);
    browser = await require('playwright').chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
  } catch (e) {
    console.warn(`[main] ⚠️ 启动系统 Chrome 失败 (${e.message.slice(0, 100)})，回退到 Chromium`);
    browser = await require('playwright').chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
  }

  const PUBLISHERS = {
    wechat: publishWechat,
    toutiao: publishToutiao,
    zhihu: publishZhihu,
  };

  let result;
  try {
    result = await PUBLISHERS[args.platform](browser, input, args.mode);
  } catch (err) {
    console.error(`[error] ${args.platform} 发布失败: ${err.message}`);
    console.error('       输入文件未被删除，可修复后重试。');
    if (err.message.startsWith('TOUTIAO_SERVER_REJECTED:')) {
      const code = err.message.split(':')[1];
      console.error('');
      console.error(`[hint] 头条服务端 code=${code} 拒绝。常见原因：`);
      console.error('       1. 账号为新注册账号（level=0, fans=0），未获得发文权限');
      console.error('       2. 账号被处罚/限流');
      console.error('       3. 内容/封面不合规（涉政/涉黄/版权）');
      console.error('       建议：登录 mp.toutiao.com 后台 → 设置 → 查看账号状态');
    }
    await browser.close();
    process.exit(1);
  }

  await browser.close();

  // 写三件套
  const outDir = writeOutputs(input.dir, args.platform, result);
  console.log(`[main] ✅ 输出已落盘: ${outDir}`);
  console.log(`       post_url:      ${result.postUrl || '(请登录平台确认)'}`);
  console.log(`       published_at:  ${result.publishedAt || '(待确认)'}`);
  console.log(`       mode:          ${args.mode === 'publish' ? 'browser-publish' : 'browser-draft'}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[fatal] ${err.stack || err.message}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  loadInput,
  publishWechat,
  publishToutiao,
  publishZhihu,
  writeOutputs,
};
