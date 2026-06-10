// Wechat publishWechat 主流程 e2e mock test
// 跳过登录段(596-624), mock context + 上游微信 API
// 验证 626-667 的主流程: 提取 creds -> 上传封面 -> 上传正文图 -> 创建草稿

const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'publish-browser.js');
  const src = fs.readFileSync(scriptPath, 'utf8');

  // 提取 saveSession 函数 (绕开 main 启动浏览器)
  const fnSrc = `
    const fs = arguments[0];
    const path = arguments[1];
    const os = arguments[2];
    ${src.match(/function escapeHtml\(s\)[\s\S]*?\n\}\n/)[0]}
    ${src.match(/function saveSession\(platform, cookies, extra = \{\}\)[\s\S]*?\n\}\n/)[0]}
    ${src.match(/function loadInput\(dir\)[\s\S]*?\n\}\n/)[0]}
    ${src.match(/function stripFrontmatter\(md\)[\s\S]*?\n\}\n/)[0]}
    ${src.match(/function buildWechatBody\(copy\)[\s\S]*?\n\}\n/)[0]}
    ${src.match(/async function uploadWechatMaterial[\s\S]*?\n\}\n/)[0]}
    ${src.match(/async function uploadAndReplaceWechatImages[\s\S]*?\n\}\n/)[0]}
    ${src.match(/async function createWechatAppMsg[\s\S]*?\n\}\n/)[0]}
    ${src.match(/async function massSendWechatAppMsg[\s\S]*?\n\}\n/)[0]}
    return { saveSession, loadInput, stripFrontmatter, buildWechatBody,
             uploadWechatMaterial, uploadAndReplaceWechatImages, createWechatAppMsg, massSendWechatAppMsg };
  `;
  const fns = (new Function(fnSrc))(fs, path, require('node:os'));

  let passed = 0, failed = 0;
  function assert(cond, label) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.error(`  ❌ ${label}`); }
  }

  // mock context with mocked request
  const callLog = [];
  class MockContext {
    constructor() { this.request = this; }
    async post(url, opts = {}) {
      const u = new URL(url);
      callLog.push({ method: 'POST', pathname: u.pathname, search: u.search, opts });
      const scene = u.searchParams.get('scene');
      if (u.pathname === '/cgi-bin/filetransfer') {
        if (scene === '1') {
          return { ok: () => true, status: () => 200, text: async () => JSON.stringify({
            errcode: 0, content: 'cover_media_id_xxx', cdn_url: 'https://mmbiz.qpic.cn/cover/0',
          }) };
        }
        return { ok: () => true, status: () => 200, text: async () => JSON.stringify({
          errcode: 0, cdn_url: `https://mmbiz.qpic.cn/content-img/${callLog.length}`,
        }) };
      }
      if (u.pathname === '/cgi-bin/operate_appmsg') {
        return { ok: () => true, status: () => 200, text: async () => JSON.stringify({
          appMsgId: 'draft_id_final_999',
          base_resp: { ret: 0, err_msg: 'ok' },
        }) };
      }
      return { ok: () => false, status: () => 404, text: async () => 'not found' };
    }
  }

  // 准备输入
  const tmpDir = path.join('/tmp', 'wechat-mock-input-' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'copy.md'), `---
platform: wechat
title: "测试标题"
---

## 章节 1

正文 ![本地图片](/tmp/mock-local.png)

## 章节 2

结尾段落。
`);
  fs.writeFileSync(path.join(tmpDir, 'content.json'), JSON.stringify({
    title: '测试标题',
    body: '',
  }));
  // 准备封面图 + 正文图
  const pngBuf = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );
  fs.writeFileSync(path.join(tmpDir, 'cover.png'), pngBuf);
  fs.writeFileSync('/tmp/mock-local.png', pngBuf);

  const input = fns.loadInput(tmpDir);
  // 强制 coverPath
  input.coverPath = path.join(tmpDir, 'cover.png');
  // override
  const realLoadInput = input;
  console.log('input keys:', Object.keys(realLoadInput));
  console.log('input.coverPath:', realLoadInput.coverPath);

  const ctx = new MockContext();
  const creds = { token: 'mocktoken1234567', ticket: 'mockticket', user_name: 'mockgh' };
  const cookieHeader = 'slave_user=mock; wxuin=mock';

  console.log('\n[1] 主流程 1: 上传封面');
  const cover = await fns.uploadWechatMaterial(ctx, creds.token, cookieHeader, realLoadInput.coverPath, 1);
  assert(cover.media_id === 'cover_media_id_xxx', '封面 media_id 拿到');
  assert(cover.cdn_url === 'https://mmbiz.qpic.cn/cover/0', '封面 cdn_url 拿到');
  assert(callLog.length === 1, '1 次 API 调用 (filetransfer scene=1)');
  assert(callLog[0].search.includes('scene=1'), '调用参数 scene=1');

  console.log('\n[2] 主流程 2: 上传正文图 + 替换 markdown 引用');
  const htmlBody = fns.buildWechatBody(realLoadInput.copy);
  assert(htmlBody.includes('<h2>章节 1</h2>'), 'buildWechatBody 转 h2');
  assert(/mock-local\.png/.test(htmlBody), 'buildWechatBody 保留本地图片路径 (供后续替换)');
  const finalHtml = await fns.uploadAndReplaceWechatImages(ctx, creds.token, cookieHeader, htmlBody);
  assert(!finalHtml.includes('](/tmp/mock-local.png)'), '本地图片路径已替换');
  assert(finalHtml.includes('https://mmbiz.qpic.cn/content-img/'), '替换为 mmbiz URL');
  assert(callLog.length === 2, '2 次 API 调用 (1 封面 + 1 正文图)');

  console.log('\n[3] 主流程 3: 创建草稿 (operate_appmsg)');
  const appMsgId = await fns.createWechatAppMsg(ctx, creds.token, cookieHeader, {
    title: realLoadInput.content.title,
    content: finalHtml,
    coverMediaId: cover.media_id,
    coverCdnUrl: cover.cdn_url,
    digest: '',
  });
  assert(appMsgId === 'draft_id_final_999', 'appMsgId 拿到');
  assert(callLog.length === 3, '3 次 API 调用');
  const draftCall = callLog[2];
  assert(draftCall.pathname === '/cgi-bin/operate_appmsg', '最后调用是 operate_appmsg');
  assert(draftCall.search.includes('sub=create'), 'sub=create');
  assert(draftCall.search.includes('type=77'), 'type=77 (新版编辑器)');
  // 检查 form body
  const form = new URLSearchParams(draftCall.opts.data);
  assert(form.get('title0') === '测试标题', 'form title0 正确');
  assert(form.get('content0').includes('<h2>章节 1</h2>'), 'form content0 包含 HTML');
  assert(form.get('content0').includes('mmbiz.qpic.cn/content-img/'), 'content0 已替换图片');
  assert(form.get('fileid0') === 'cover_media_id_xxx', 'form fileid0 = 封面 media_id');
  assert(form.get('cdn_url0') === 'https://mmbiz.qpic.cn/cover/0', 'form cdn_url0 = 封面 URL');
  assert(form.get('show_cover_pic0') === '1', 'show_cover_pic0 = 1 (有封面)');
  assert(form.get('need_open_comment0') === '1', 'need_open_comment0 = 1');
  assert(form.get('token') === 'mocktoken1234567', 'form 也有 token');
  assert(draftCall.opts.headers.Cookie === cookieHeader, 'Cookie 头传递');
  assert(draftCall.opts.headers.Referer === 'https://mp.weixin.qq.com/', 'Referer 头正确');

  console.log('\n[4] 主流程 4: 无 cover path 时, fileid0="" + show_cover_pic0="0"');
  const ctx2 = new MockContext();
  const callLog2 = ctx2.request; // re-attach for the second context
  // 改用本地 callLog 记录
  const calls2 = [];
  ctx2.request.post = async function(url, opts) {
    const u = new URL(url);
    calls2.push({ pathname: u.pathname, search: u.search, opts });
    return { ok: () => true, status: () => 200, text: async () => JSON.stringify({
      appMsgId: 'draft_no_cover', base_resp: { ret: 0 },
    }) };
  };
  const appMsgId2 = await fns.createWechatAppMsg(ctx2, creds.token, cookieHeader, {
    title: '无封面测试',
    content: '<p>正文</p>',
    coverMediaId: '',
    coverCdnUrl: '',
    digest: '',
  });
  assert(appMsgId2 === 'draft_no_cover', '无封面 appMsgId 拿到');
  const noCoverForm = new URLSearchParams(calls2[0].opts.data);
  assert(noCoverForm.get('fileid0') === '', 'fileid0 = ""');
  assert(noCoverForm.get('show_cover_pic0') === '0', 'show_cover_pic0 = 0 (无封面)');
  assert(noCoverForm.get('auto_gen_digest0') === '1', 'auto_gen_digest0 = 1 (无 digest)');

  console.log('\n[5] 主流程 5: 有 digest 时 auto_gen_digest0=0');
  const calls3 = [];
  ctx2.request.post = async function(url, opts) {
    const u = new URL(url);
    calls3.push({ pathname: u.pathname, opts });
    return { ok: () => true, status: () => 200, text: async () => JSON.stringify({
      appMsgId: 'draft_with_digest', base_resp: { ret: 0 },
    }) };
  };
  await fns.createWechatAppMsg(ctx2, creds.token, cookieHeader, {
    title: '有摘要',
    content: '<p>x</p>',
    coverMediaId: 'm', coverCdnUrl: 'u',
    digest: '人工摘要',
  });
  const digestForm = new URLSearchParams(calls3[0].opts.data);
  assert(digestForm.get('digest0') === '人工摘要', 'digest0 字段正确');
  assert(digestForm.get('auto_gen_digest0') === '0', 'auto_gen_digest0 = 0 (有 digest)');

  console.log('\n[6] 主流程 6: buildWechatBody 清除 frontmatter');
  const body = fns.buildWechatBody(realLoadInput.copy);
  assert(!body.includes('platform: wechat'), 'frontmatter 已清除');
  assert(!body.includes('---'), '--- 分隔符已清除');

  console.log('\n[7] 主流程 7: 集成路径 - 完整模拟 publishWechat 主体 (596-667)');
  // 直接跑一次完整流程
  const ctx3 = new MockContext();
  const integratedCalls = [];
  ctx3.request.post = async function(url, opts) {
    const u = new URL(url);
    integratedCalls.push({ pathname: u.pathname, search: u.search });
    const scene = u.searchParams.get('scene');
    if (u.pathname === '/cgi-bin/filetransfer') {
      if (scene === '1') return { ok: () => true, status: () => 200, text: async () => JSON.stringify({ errcode: 0, content: 'mcov', cdn_url: 'https://mmbiz.qpic.cn/mcov' }) };
      return { ok: () => true, status: () => 200, text: async () => JSON.stringify({ errcode: 0, cdn_url: 'https://mmbiz.qpic.cn/mimg' }) };
    }
    return { ok: () => true, status: () => 200, text: async () => JSON.stringify({ appMsgId: 'integrated_id', base_resp: { ret: 0 } }) };
  };

  // 模拟 publishWechat 主体 (跳过登录)
  const cleanCopy = fns.stripFrontmatter(realLoadInput.copy);
  const t = realLoadInput.content.title || cleanCopy.split('\n')[0] || 'untitled';
  const html = fns.buildWechatBody(realLoadInput.copy);
  let coverMediaId = '', coverCdnUrl = '';
  if (realLoadInput.coverPath) {
    const up = await fns.uploadWechatMaterial(ctx3, creds.token, cookieHeader, realLoadInput.coverPath, 1);
    coverMediaId = up.media_id; coverCdnUrl = up.cdn_url;
  }
  const finalHtml2 = await fns.uploadAndReplaceWechatImages(ctx3, creds.token, cookieHeader, html);
  const finalAppMsgId = await fns.createWechatAppMsg(ctx3, creds.token, cookieHeader, {
    title: t, content: finalHtml2, coverMediaId, coverCdnUrl, digest: '',
  });

  assert(coverMediaId === 'mcov', 'integration: coverMediaId ok');
  assert(coverCdnUrl === 'https://mmbiz.qpic.cn/mcov', 'integration: coverCdnUrl ok');
  assert(finalHtml2.includes('https://mmbiz.qpic.cn/mimg'), 'integration: 图片已替换');
  assert(finalAppMsgId === 'integrated_id', 'integration: appMsgId ok');
  assert(integratedCalls.length === 3, 'integration: 3 次 API 调用 (1 封面 + 1 正文图 + 1 草稿)');
  assert(integratedCalls[0].search.includes('scene=1'), '第 1 次是封面上传');
  assert(integratedCalls[1].search.includes('scene=8'), '第 2 次是正文图上传');
  assert(integratedCalls[2].pathname === '/cgi-bin/operate_appmsg', '第 3 次是 operate_appmsg');

  console.log('\n[8] 主流程 8: publish 模式 - 群发 (masssend) sent 分支');
  const ctxSent = { request: { post: async (url, opts) => {
    const u = new URL(url);
    assert(u.pathname === '/cgi-bin/masssend', 'masssend 端点调用');
    assert(u.search.includes('token=mocktoken1234567'), 'masssend URL 带 token');
    const form = new URLSearchParams(opts.data);
    assert(form.get('appmsgid') === 'integrated_id', 'form appmsgid = 草稿 id');
    assert(form.get('type') === '10', 'form type=10');
    assert(form.get('direct_send') === '1', 'form direct_send=1 (立即群发)');
    assert(opts.headers.Cookie === cookieHeader, 'Cookie 头传递');
    assert(opts.headers.Referer.includes('appmsg?action=list'), 'Referer 头正确 (草稿列表)');
    return { ok: () => true, status: () => 200, text: async () => JSON.stringify({
      msgId: 'msg_id_sent_123', base_resp: { ret: 0, err_msg: 'ok' },
    }) };
  } } };
  const sentResult = await fns.massSendWechatAppMsg(ctxSent, creds.token, cookieHeader, { appMsgId: 'integrated_id' });
  assert(sentResult.status === 'sent', 'sent 分支: status=sent');
  assert(sentResult.msgId === 'msg_id_sent_123', 'sent 分支: msgId 拿到');

  console.log('\n[9] 主流程 9: publish 模式 - 群发保护 mass_protect 开启 (qr_required 分支)');
  const ctxQr = { request: { post: async (url, opts) => {
    const u = new URL(url);
    assert(u.pathname === '/cgi-bin/masssend', 'masssend 端点调用');
    const form = new URLSearchParams(opts.data);
    assert(form.get('appmsgid') === 'qr_protected_draft', 'form appmsgid 正确');
    return { ok: () => true, status: () => 200, text: async () => JSON.stringify({
      base_resp: { ret: 10000, err_msg: 'need qr scan' },
      qr_url: 'https://mp.weixin.qq.com/safeqrconnect?uuid=abc123',
    }) };
  } } };
  const qrResult = await fns.massSendWechatAppMsg(ctxQr, creds.token, cookieHeader, { appMsgId: 'qr_protected_draft' });
  assert(qrResult.status === 'qr_required', 'qr_required 分支: status=qr_required');
  assert(qrResult.qrUrl && qrResult.qrUrl.includes('safeqrconnect'), 'qr_required 分支: qrUrl 包含 safeqrconnect');
  assert(qrResult.manualAction && qrResult.manualAction.includes('扫') && qrResult.manualAction.includes('码'), 'qr_required 分支: manualAction 提示扫码');

  console.log('\n[10] 主流程 10: publish 模式 - 群发失败 (failed 分支, 草稿保留)');
  const ctxFail = { request: { post: async (url, opts) => {
    const u = new URL(url);
    return { ok: () => true, status: () => 200, text: async () => JSON.stringify({
      base_resp: { ret: 45001, err_msg: 'frequency limit' },
    }) };
  } } };
  const failResult = await fns.massSendWechatAppMsg(ctxFail, creds.token, cookieHeader, { appMsgId: 'rate_limited_draft' });
  assert(failResult.status === 'failed', 'failed 分支: status=failed');
  assert(failResult.ret === 45001, 'failed 分支: ret=45001');
  assert(failResult.errMsg === 'frequency limit', 'failed 分支: errMsg 正确');
  assert(failResult.manualAction && failResult.manualAction.includes('草稿已保留'), 'failed 分支: manualAction 提示草稿保留');

  console.log('\n[11] 主流程 11: createWechatAppMsg mode 参数透传 (verify signature)');
  // 通过 args 数量检查, 不能直接验证 (动态函数), 但确保调用不会崩
  const ctxMode = { request: { post: async () => ({ ok: () => true, status: () => 200, text: async () => JSON.stringify({ appMsgId: 'mode_test', base_resp: { ret: 0 } }) }) } };
  const idWithMode = await fns.createWechatAppMsg(ctxMode, creds.token, cookieHeader, { title: 't', content: '<p>c</p>', coverMediaId: '', coverCdnUrl: '', digest: '' }, { mode: 'publish' });
  assert(idWithMode === 'mode_test', 'createWechatAppMsg 接受 mode 参数, 行为不变');
  const idWithoutMode = await fns.createWechatAppMsg(ctxMode, creds.token, cookieHeader, { title: 't2', content: '<p>c</p>', coverMediaId: '', coverCdnUrl: '', digest: '' });
  assert(idWithoutMode === 'mode_test', 'createWechatAppMsg 不传 mode 仍能工作 (向后兼容)');

  console.log('\n[12] 主流程 12: publish 模式 - 端到端 result shape (含 masssend)');
  // 直接模拟 publishWechat 主体流程 (line 626-687) 的返回值构造逻辑
  const ctxPub = { request: { post: async (url, opts) => {
    const u = new URL(url);
    if (u.pathname === '/cgi-bin/filetransfer') {
      const scene = u.searchParams.get('scene');
      if (scene === '1') return { ok: () => true, status: () => 200, text: async () => JSON.stringify({ errcode: 0, content: 'cov_id', cdn_url: 'https://mmbiz.qpic.cn/cov' }) };
      return { ok: () => true, status: () => 200, text: async () => JSON.stringify({ errcode: 0, cdn_url: 'https://mmbiz.qpic.cn/cimg' }) };
    }
    if (u.pathname === '/cgi-bin/operate_appmsg') {
      return { ok: () => true, status: () => 200, text: async () => JSON.stringify({ appMsgId: 'pub_draft_id', base_resp: { ret: 0 } }) };
    }
    if (u.pathname === '/cgi-bin/masssend') {
      return { ok: () => true, status: () => 200, text: async () => JSON.stringify({ msgId: 'pub_msg_id', base_resp: { ret: 0 } }) };
    }
    return { ok: () => false, status: () => 404, text: async () => 'not found' };
  } } };

  // 完整模拟 publishWechat publish 分支 (line 633-686)
  const pubHtml = fns.buildWechatBody(realLoadInput.copy);
  const pubFinalHtml = await fns.uploadAndReplaceWechatImages(ctxPub, creds.token, cookieHeader, pubHtml);
  const pubAppMsgId = await fns.createWechatAppMsg(ctxPub, creds.token, cookieHeader, {
    title: realLoadInput.content.title, content: pubFinalHtml, coverMediaId: 'cov_id', coverCdnUrl: 'https://mmbiz.qpic.cn/cov', digest: '',
  }, { mode: 'publish' });
  const pubMass = await fns.massSendWechatAppMsg(ctxPub, creds.token, cookieHeader, { appMsgId: pubAppMsgId });

  // 构造 result 模拟 publishWechat line 663-684 的返回
  const pubResult = {
    postUrl: `https://mp.weixin.qq.com/cgi-bin/appmsg?action=list&type=10&appmsgid=${pubAppMsgId}${pubMass.status === 'sent' ? '&sent=1' : ''}`,
    publishedAt: new Date().toISOString(),
    response: {
      platform: 'wechat',
      mode: pubMass.status === 'sent' ? 'api-publish-sent' : `api-publish-${pubMass.status}`,
      appMsgId: pubAppMsgId,
      coverMediaId: 'cov_id',
      coverCdnUrl: 'https://mmbiz.qpic.cn/cov',
      massSend: pubMass,
    },
  };

  assert(pubResult.response.appMsgId === 'pub_draft_id', 'publish e2e: appMsgId');
  assert(pubResult.response.massSend.status === 'sent', 'publish e2e: massSend.status = sent');
  assert(pubResult.response.massSend.msgId === 'pub_msg_id', 'publish e2e: massSend.msgId');
  assert(pubResult.response.mode === 'api-publish-sent', 'publish e2e: result.mode = api-publish-sent');
  assert(pubResult.postUrl.includes('appmsgid=pub_draft_id'), 'publish e2e: postUrl 包含 appmsgid');
  assert(pubResult.postUrl.includes('&sent=1'), 'publish e2e: postUrl 包含 &sent=1 (群发成功)');

  // 清理临时文件
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync('/tmp/mock-local.png', { force: true });

  console.log('\n=== 总结 ===');
  console.log(`通过: ${passed}, 失败: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error('测试异常:', e);
  process.exit(1);
});
