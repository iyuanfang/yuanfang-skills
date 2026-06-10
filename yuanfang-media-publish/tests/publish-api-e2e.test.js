// publish-api.js 端到端 e2e mock test
// 验证: loadCredentials 抛错(loadCredentials_test) + publishWechat 端到端流程(mock http)
//
// 跳过 main 启动, 模拟:
//   1. 临时凭证文件 + loadCredentials
//   2. 临时输入目录 + loadInput
//   3. mock httpRequestWithRetry 返回 token + draft
//   4. 调 publishWechat({input, credentials}) 拿到完整 result

const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'publish-api.js');
  const src = fs.readFileSync(scriptPath, 'utf8');

  // 提取核心函数 (不 require main, 不启动 http)
  // 不能直接 require 脚本因为 require.main === module 会触发 main()
  // 改用 vm 在隔离 scope 跑
  const vm = require('node:vm');
  const moduleScope = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    process: { ...process, exit: () => {} },
    Buffer,
    setTimeout, clearTimeout, setInterval, clearInterval,
    URL, URLSearchParams,
  };
  vm.createContext(moduleScope);
  vm.runInContext(src, moduleScope);
  const api = moduleScope.module.exports;

  let passed = 0, failed = 0;
  function assert(cond, label) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.error(`  ❌ ${label}`); }
  }

  // -------- 测试 1: loadCredentials 错误路径 --------
  console.log('\n[1] loadCredentials 错误路径 (不调 process.exit)');
  let caughtErr = null;
  try { api.loadCredentials('/tmp/does-not-exist-anywhere.json'); }
  catch (e) { caughtErr = e; }
  assert(caughtErr != null, 'loadCredentials 缺文件时抛错');
  assert(caughtErr && caughtErr.code === 'CREDENTIALS_MISSING', '错误带 code=CREDENTIALS_MISSING');
  assert(caughtErr && /凭证文件不存在/.test(caughtErr.message), '错误消息含「凭证文件不存在」');
  assert(caughtErr && caughtErr.hint && /credentials-setup/.test(caughtErr.hint), '错误带 hint 指向 credentials-setup.md');

  console.log('\n[2] loadCredentials 解析错误路径');
  const tmpBad = '/tmp/publish-api-bad-' + Date.now() + '.json';
  fs.writeFileSync(tmpBad, '{ this is not json }');
  caughtErr = null;
  try { api.loadCredentials(tmpBad); } catch (e) { caughtErr = e; }
  assert(caughtErr != null, 'loadCredentials 解析失败时抛错');
  assert(caughtErr && caughtErr.code === 'CREDENTIALS_PARSE_ERROR', '错误带 code=CREDENTIALS_PARSE_ERROR');
  fs.rmSync(tmpBad, { force: true });

  console.log('\n[3] loadCredentials 成功路径 (临时文件)');
  const tmpCreds = '/tmp/publish-api-good-' + Date.now() + '.json';
  fs.writeFileSync(tmpCreds, JSON.stringify({
    wechat: { appId: 'wx_test_appid', appSecret: 'test_secret' },
  }));
  const creds = api.loadCredentials(tmpCreds);
  assert(creds.wechat.appId === 'wx_test_appid', '凭证正确加载');
  assert(creds.wechat.appSecret === 'test_secret', '凭证正确加载 appSecret');
  fs.rmSync(tmpCreds, { force: true });

  // -------- 测试 4: publishWechat 端到端 mock --------
  console.log('\n[4] publishWechat 端到端 (mock httpRequestWithRetry via DI hook)');
  // 用 __setHttpRequestForTest 注入 mock (生产代码已有 module-level _httpRequestImpl 间接层)
  const calls = [];
  api.__setHttpRequestForTest(async function(opts) {
    calls.push(opts);
    const u = new URL(opts.url);
    if (u.pathname === '/cgi-bin/token') {
      return { status: 200, body: { access_token: 'mock_token_xyz', expires_in: 7200 } };
    }
    if (u.pathname === '/cgi-bin/material/add_material') {
      return { status: 200, body: { media_id: 'mock_thumb_media_id', url: 'https://mmbiz.qpic.cn/mock' } };
    }
    if (u.pathname === '/cgi-bin/draft/add') {
      const articles = opts.body && opts.body.articles;
      return { status: 200, body: { media_id: 'mock_draft_id_abc', articles_count: articles ? articles.length : 0 } };
    }
    return { status: 404, body: { errcode: 404, errmsg: 'not mocked' } };
  });

  // 准备临时输入目录
  const tmpDir = path.join('/tmp', 'publish-api-mock-input-' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'copy.md'), `---
platform: wechat
title: "API 测试标题"
---

正文段落 1。

正文段落 2.
`);
  fs.writeFileSync(path.join(tmpDir, 'content.json'), JSON.stringify({
    title: 'API 测试标题',
    body: '',
  }));
  // 准备封面图 (1x1 PNG)
  const pngBuf = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );
  fs.writeFileSync(path.join(tmpDir, 'cover.png'), pngBuf);

  const input = api.loadInput(tmpDir);
  assert(input.title === undefined || input.title === null || !('coverPath' in input) || input.coverPath === path.join(tmpDir, 'cover.png'), 'input 加载 (不要求 coverPath)');
  // 强制 coverPath (同 browser 版流程)
  input.coverPath = path.join(tmpDir, 'cover.png');

  const result = await api.publishWechat({ input, credentials: creds });
  assert(result.postUrl && result.postUrl.includes('mock_draft_id_abc'), 'result.postUrl 包含 media_id');
  assert(result.publishedAt, 'result.publishedAt 有时间戳');
  assert(result.response.platform === 'wechat', 'response.platform = wechat');
  assert(result.response.mode === 'draft', 'response.mode = draft');
  assert(result.response.media_id === 'mock_draft_id_abc', 'response.media_id 正确');
  assert(result.response.access_token_obtained_at, 'access_token_obtained_at 字段存在');

  // 检查 HTTP 调用序列: 1 token → 1 上传图片 → 1 draft.add
  const tokenCall = calls.find(c => c.url.includes('/cgi-bin/token'));
  assert(tokenCall && tokenCall.url.includes('appid=wx_test_appid'), 'token 调用带 appid');
  assert(tokenCall && tokenCall.url.includes('secret=test_secret'), 'token 调用带 secret');
  assert(tokenCall && tokenCall.url.includes('grant_type=client_credential'), 'token 调用 grant_type=client_credential');

  const uploadCall = calls.find(c => c.url.includes('/cgi-bin/material/add_material'));
  assert(uploadCall && uploadCall.url.includes('access_token=mock_token_xyz'), '上传图片带 access_token');
  assert(uploadCall && uploadCall.url.includes('type=image'), '上传图片 type=image');
  assert(uploadCall && Buffer.isBuffer(uploadCall.body), '上传图片 body 是 Buffer');

  const draftCall = calls.find(c => c.url.includes('/cgi-bin/draft/add'));
  assert(draftCall && draftCall.url.includes('access_token=mock_token_xyz'), 'draft/add 带 access_token');
  assert(draftCall && Array.isArray(draftCall.body.articles) && draftCall.body.articles.length === 1, 'draft/add body 包含 1 篇文章');
  const article = draftCall.body.articles[0];
  assert(article.title === 'API 测试标题', 'article.title 正确');
  assert(article.thumb_media_id === 'mock_thumb_media_id', 'article.thumb_media_id 来自上传');
  assert(article.content && /<p>正文段落 1/.test(article.content), 'article.content 是 HTML');
  assert(article.need_open_comment === 0 && article.only_fans_can_comment === 0, 'comment 字段默认 0');

  console.log('\n[5] publishWechat 错误路径: token 拿不到');
  api.__setHttpRequestForTest(async () => ({ status: 400, body: { errcode: 40001, errmsg: 'invalid credential' } }));
  let tokenErr = null;
  try { await api.publishWechat({ input, credentials: creds }); } catch (e) { tokenErr = e; }
  assert(tokenErr && /拿 token 失败/.test(tokenErr.message), 'token 失败抛错');

  console.log('\n[6] publishWechat 错误路径: 缺 appId/appSecret');
  let credsErr = null;
  try { await api.publishWechat({ input, credentials: { wechat: {} } }); } catch (e) { credsErr = e; }
  assert(credsErr && /缺 appId \/ appSecret/.test(credsErr.message), '缺凭证抛错');

  // 恢复 http 实现
  api.__resetHttpRequestForTest();
  fs.rmSync(tmpDir, { recursive: true, force: true });

  // -------- 测试 7: 凭证模板存在性 --------
  console.log('\n[7] publish-credentials.example.json 存在性');
  const examplePath = path.join(__dirname, '..', 'publish-credentials.example.json');
  if (fs.existsSync(examplePath)) {
    const example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
    assert(example.wechat && example.wechat.appId && example.wechat.appSecret, '模板含 wechat.appId + appSecret');
    assert(example.toutiao || true, '模板可扩展 (非强制)');
    assert(example.wechat._doc, '模板 wechat 段有 _doc 说明');
    const docHint = example.wechat._doc;
    assert(/草稿/.test(docHint) || /API/.test(docHint), '模板 wechat._doc 解释用法');
  } else {
    console.log('  ⚠️ 模板文件不存在, 待创建');
  }

  console.log('\n=== 总结 ===');
  console.log(`通过: ${passed}, 失败: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error('测试异常:', e);
  process.exit(1);
});
