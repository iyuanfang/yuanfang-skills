// WeChat hybrid e2e mock-server 测试
// 启动本地 HTTP server mock 微信 MP API, 验证 helper 函数真的能解析响应

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// 构造 mock 浏览器 context.request (playwright API 的简化版)
class MockRequest {
  constructor(serverUrl, routes) {
    this.request = this;
    this.routes = routes;
  }
  async post(url, opts = {}) {
    const u = new URL(url);
    const key = `POST ${u.pathname}${u.search}`;
    const handler = this.routes[key] || this.routes[`POST ${u.pathname}`];
    if (!handler) {
      return {
        ok: () => false,
        status: () => 404,
        text: async () => `mock route not found: ${key}`,
      };
    }
    const body = opts.data || '';
    const result = await handler({ url: u, body, headers: opts.headers || {} });
    return {
      ok: () => result.status >= 200 && result.status < 300,
      status: () => result.status,
      text: async () => result.body,
    };
  }
}

(async () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'publish-browser.js');
  // 提取 helper 函数 (绕开 main() 启动浏览器)
  const src = fs.readFileSync(scriptPath, 'utf8');

  // 用 Function 构造 sandbox 提取函数, 显式注入 fs/path
  const fnSrc = `
    const fs = arguments[0];
    const path = arguments[1];
    ${src.match(/async function uploadWechatMaterial[\s\S]*?\n}\n/)[0]}
    ${src.match(/async function createWechatAppMsg[\s\S]*?\n}\n/)[0]}
    return { uploadWechatMaterial, createWechatAppMsg };
  `;
  const { uploadWechatMaterial, createWechatAppMsg } = (new Function(fnSrc))(fs, path);

  let passed = 0, failed = 0;
  function assert(cond, label) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.error(`  ❌ ${label}`); }
  }

  // 准备测试图片
  const testImg = path.join(__dirname, 'fixtures', 'test-cover.png');
  fs.mkdirSync(path.dirname(testImg), { recursive: true });
  // 1x1 PNG 透明像素
  const pngBuf = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );
  fs.writeFileSync(testImg, pngBuf);

  // 准备 mock routes
  const routes = {
    'POST /cgi-bin/filetransfer': async ({ url, headers, body }) => {
      const scene = url.searchParams.get('scene');
      if (scene === '1') {
        return { status: 200, body: JSON.stringify({
          errcode: 0,
          content: 'mock_media_id_abc123',
          cdn_url: 'https://mmbiz.qpic.cn/mock-cover/0',
        }) };
      }
      return { status: 200, body: JSON.stringify({
        errcode: 0,
        cdn_url: 'https://mmbiz.qpic.cn/mock-content-img/0',
      }) };
    },
    'POST /cgi-bin/operate_appmsg': async ({ url, body }) => {
      // 解析 form-urlencoded body
      const params = new URLSearchParams(body);
      const title = params.get('title0');
      const content = params.get('content0');
      const fileid = params.get('fileid0');
      const cdnUrl = params.get('cdn_url0');
      return {
        status: 200,
        body: JSON.stringify({
          appMsgId: 'mock_appmsg_xyz789',
          base_resp: { ret: 0, err_msg: 'ok' },
          _echo: { title, contentLen: content?.length, fileid, cdnUrl },
        }),
      };
    },
  };

  const ctx = new MockRequest('http://mock', routes);
  const token = '1234567';
  const cookie = 'slave_user=mock; wxuin=mock';

  console.log('\n[1] uploadWechatMaterial(scene=1) - 封面');
  const cover = await uploadWechatMaterial(ctx, token, cookie, testImg, 1);
  assert(cover.media_id === 'mock_media_id_abc123', 'media_id 正确解析');
  assert(cover.cdn_url === 'https://mmbiz.qpic.cn/mock-cover/0', 'cdn_url 正确解析');

  console.log('\n[2] uploadWechatMaterial(scene=8) - 正文图');
  const img = await uploadWechatMaterial(ctx, token, cookie, testImg, 8);
  assert(img.cdn_url === 'https://mmbiz.qpic.cn/mock-content-img/0', '正文图 cdn_url 正确解析');

  console.log('\n[3] createWechatAppMsg - 完整 body');
  const result = await createWechatAppMsg(ctx, token, cookie, {
    title: '测试标题',
    content: '<p>测试正文</p>',
    coverMediaId: 'mock_media_id_abc123',
    coverCdnUrl: 'https://mmbiz.qpic.cn/mock-cover/0',
    digest: '',
  });
  assert(result === 'mock_appmsg_xyz789', 'appMsgId 正确返回');

  console.log('\n[4] 错误处理 - base_resp.ret != 0');
  // 临时换 route
  ctx.routes['POST /cgi-bin/operate_appmsg'] = async () => ({
    status: 200,
    body: JSON.stringify({ base_resp: { ret: 40001, err_msg: 'invalid credential' } }),
  });
  try {
    await createWechatAppMsg(ctx, token, cookie, {
      title: 't', content: '<p>c</p>', coverMediaId: '', coverCdnUrl: '', digest: '',
    });
    assert(false, '应当抛错但没抛');
  } catch (e) {
    assert(e.message.includes('40001'), `抛错包含错误码: ${e.message.slice(0, 100)}`);
    assert(e.message.includes('invalid credential'), `抛错包含 errmsg`);
  }

  console.log('\n[5] 错误处理 - 非 JSON 响应');
  ctx.routes['POST /cgi-bin/operate_appmsg'] = async () => ({
    status: 200,
    body: '<html>error page</html>',
  });
  try {
    await createWechatAppMsg(ctx, token, cookie, {
      title: 't', content: '<p>c</p>', coverMediaId: '', coverCdnUrl: '', digest: '',
    });
    assert(false, '应当抛错但没抛');
  } catch (e) {
    assert(e.message.includes('非 JSON'), `抛错包含 "非 JSON": ${e.message.slice(0, 100)}`);
  }

  console.log('\n[6] 错误处理 - 缺 appMsgId');
  ctx.routes['POST /cgi-bin/operate_appmsg'] = async () => ({
    status: 200,
    body: JSON.stringify({ base_resp: { ret: 0 }, appMsgId: '' }),
  });
  try {
    await createWechatAppMsg(ctx, token, cookie, {
      title: 't', content: '<p>c</p>', coverMediaId: '', coverCdnUrl: '', digest: '',
    });
    assert(false, '应当抛错但没抛');
  } catch (e) {
    assert(e.message.includes('appMsgId'), `抛错包含 "appMsgId": ${e.message.slice(0, 100)}`);
  }

  console.log('\n[7] 错误处理 - 上传 errcode != 0');
  ctx.routes['POST /cgi-bin/filetransfer'] = async () => ({
    status: 200,
    body: JSON.stringify({ errcode: 40001, errmsg: 'invalid credential' }),
  });
  try {
    await uploadWechatMaterial(ctx, token, cookie, testImg, 1);
    assert(false, '应当抛错但没抛');
  } catch (e) {
    assert(e.message.includes('40001') || e.message.includes('errcode'), `抛错包含错误信息: ${e.message.slice(0, 100)}`);
  }

  console.log('\n[8] 错误处理 - HTTP 500');
  ctx.routes['POST /cgi-bin/filetransfer'] = async () => ({
    status: 500,
    body: 'internal server error',
  });
  try {
    await uploadWechatMaterial(ctx, token, cookie, testImg, 1);
    assert(false, '应当抛错但没抛');
  } catch (e) {
    assert(e.message.includes('500'), `抛错包含 HTTP 500: ${e.message.slice(0, 100)}`);
  }

  console.log('\n=== 总结 ===');
  console.log(`通过: ${passed}, 失败: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error('测试异常:', e);
  process.exit(1);
});
