// wechat-hybrid 静态契约测试
// 不发起真实网络请求 — 验证三个 helper 函数的请求路径 / 字段名 / 错误处理正确
const fs = require('node:fs');
const path = require('node:path');

let passed = 0;
let failed = 0;
function assert(cond, label) {
  if (cond) { passed++; console.log(`  ✅ ${label}`); }
  else { failed++; console.error(`  ❌ ${label}`); }
}

(async () => {
  console.log('=== wechat hybrid 静态契约测试 ===\n');

  console.log('[1] 验证 publishWechat 函数已存在且能加载');
  const scriptPath = path.join(__dirname, '..', 'scripts', 'publish-browser.js');
  delete require.cache[require.resolve(scriptPath)];
  // 不能 require 因为它会启动浏览器; 只验证语法
  const { execSync } = require('node:child_process');
  try {
    execSync(`node -c ${scriptPath}`);
    assert(true, 'publish-browser.js 语法正确');
  } catch (e) {
    assert(false, `syntax error: ${e.message}`);
  }

  console.log('\n[2] 验证三个 helper 函数签名');
  const src = fs.readFileSync(scriptPath, 'utf8');
  assert(/async function uploadWechatMaterial\(context, token, cookieHeader, filePath, scene\)/.test(src), 'uploadWechatMaterial 签名存在');
  assert(/async function uploadAndReplaceWechatImages\(context, token, cookieHeader, htmlBody\)/.test(src), 'uploadAndReplaceWechatImages 签名存在');
  assert(/async function createWechatAppMsg\(context, token, cookieHeader, \{ title, content, coverMediaId, coverCdnUrl, digest \}[^)]*\)/.test(src), 'createWechatAppMsg 签名存在 (含 options 参数)');

  console.log('\n[3] 验证 API 端点常量');
  assert(/filetransfer\?action=upload_material&scene=\$\{scene\}/.test(src), 'filetransfer 端点带 scene 参数 (动态 1/8)');
  assert(/operate_appmsg\?t=ajax-response&sub=create&type=77/.test(src), '草稿创建端点 operate_appmsg sub=create type=77');

  console.log('\n[4] 验证关键 form 字段');
  assert(/form\.append\('token', token\)/.test(src), 'token 在 body 里传');
  assert(/form\.append\('AppMsgId', ''\)/.test(src), 'AppMsgId="" 表示新建');
  assert(/form\.append\('count', '1'\)/.test(src), 'count=1 单篇');
  assert(/form\.append\('title0', title\)/.test(src), 'title0 字段');
  assert(/form\.append\('content0', content\)/.test(src), 'content0 字段');
  assert(/form\.append\('fileid0', coverMediaId\)/.test(src), 'fileid0 封面 media_id');
  assert(/form\.append\('cdn_url0', coverCdnUrl\)/.test(src), 'cdn_url0 封面 CDN URL');
  assert(/form\.append\('show_cover_pic0', coverCdnUrl \? '1' : '0'\)/.test(src), 'show_cover_pic0 条件字段');
  assert(/form\.append\('need_open_comment0', '1'\)/.test(src), 'need_open_comment0 默认开启');
  assert(/form\.append\('copyright_type0', '0'\)/.test(src), 'copyright_type0 默认原创');

  console.log('\n[5] 验证错误处理');
  assert(/throw new Error\(`\[wechat\] 创建草稿失败/.test(src), 'createWechatAppMsg 失败抛错');
  assert(/throw new Error\(`\[wechat\] 响应无 appMsgId/.test(src), 'createWechatAppMsg 无 appMsgId 抛错');
  assert(/throw new Error\(`\[wechat\] 上传响应非 JSON/.test(src), 'uploadWechatMaterial 非 JSON 抛错');
  assert(/throw new Error\(`\[wechat\] 无法提取 token/.test(src), 'publishWechat 提不到 token 抛错');

  console.log('\n[6] 验证 token 提取逻辑');
  assert(/window\.wx\.commonData\.t/.test(src), '从 window.wx.commonData.t 提取 token');
  assert(/window\.wx\.commonData\.ticket/.test(src), '同时提取 ticket');
  assert(/window\.wx\.commonData\.user_name/.test(src), '同时提取 user_name');
  // 找简单的 't:\"' 后面跟 digit pattern
  assert(src.includes('t:\\s*') || src.includes('t:\\\\s*'), 'HTML regex 备用提取 (含 t:\\\\s* 模式)');

  console.log('\n[7] 验证 cookie 过滤');
  assert(/domain\.includes\('weixin\.qq\.com'\)/.test(src), 'cookie 过滤到 weixin.qq.com 域');

  console.log('\n[8] 验证 session 扩展格式');
  assert(/function saveSession\(platform, cookies, extra = \{\}\)/.test(src), 'saveSession 接受 extra 字段');
  assert(/const payload = \{ cookies, \.\.\.extra, savedAt/.test(src), 'payload 合并 cookies + extra + savedAt');

  console.log('\n[9] 验证 publishWechat 不再调用 UI 点击');
  // publishWechat 主体不应再出现 'button:has-text'
  const publishWechatMatch = src.match(/async function publishWechat[\s\S]*?(?=\nasync function publishToutiao)/);
  if (publishWechatMatch) {
    const body = publishWechatMatch[0];
    assert(!body.includes("button:has-text"), 'publishWechat 主体无 UI 按钮选择器');
    assert(!body.includes('fillContent(page,'), 'publishWechat 不再调 fillContent UI');
    assert(body.includes('uploadWechatMaterial'), 'publishWechat 调用 uploadWechatMaterial');
    assert(body.includes('createWechatAppMsg'), 'publishWechat 调用 createWechatAppMsg');
  } else {
    assert(false, '未找到 publishWechat 函数体');
  }

  console.log('\n[10] 验证 buildWechatBody 仍能处理 markdown frontmatter');
  // 这是已有函数, 确认没被破坏
  assert(/stripFrontmatter\(input\.copy\)/.test(src), 'publishWechat 用 stripFrontmatter 清理 frontmatter');
  assert(/buildWechatBody\(input\.copy\)/.test(src), 'publishWechat 用 buildWechatBody 转 HTML');

  console.log('\n[11] 验证标题长度限制 (微信要求 ≤64 字节)');
  assert(/\.slice\(0, 60\)/.test(src), '标题截断到 60 字符');

  console.log('\n=== 总结 ===');
  console.log(`通过: ${passed}, 失败: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})();
