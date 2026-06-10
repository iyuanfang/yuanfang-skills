# Wechat Hybrid 模式 - 本机验证 Runbook

## 任务
首次扫码登录 + 验证草稿箱 / 群发有内容

## 模式说明

| 模式 | 行为 | 频率限制 | 是否需扫码 |
|------|------|----------|------------|
| `draft` (默认) | 调 `operate_appmsg sub=create`, 写入草稿箱, 等人手群发 | 1000 次/天 (`draft/add`) | 否 (只创建草稿) |
| `publish` | 调 `masssend` API, 直接群发给所有关注者 | 订阅号 1 次/天, 服务号 4 次/月 | **是** (mass_protect 开启时) |

## 步骤

### 1. 草稿模式 (推荐, 无扫码)

```bash
cd /home/yf/workspace/opencode/yuanfang-skills/yuanfang-media-publish
pkill -9 chrome 2>/dev/null
node scripts/publish-browser.js --platform wechat --input "/home/yf/workspace/opencode/yuanfang-skills/yuanfang-content-gen/output/aics-2026-06-09/公众号/" --mode draft
```

**预期日志**:
- `[main] 启动系统 Chrome (channel: 'chrome')...`
- `[wechat] 打开登录页 https://mp.weixin.qq.com/`
- `📸 登录二维码已保存 (立即扫码, QR 通常 1-2 分钟内过期)`
- `文件: /tmp/wechat-login-*.png`
- 打开这个 PNG, 用绑定 mp.weixin.qq.com 的微信扫码
- 登录成功后:
  - `[wechat] token=1234567... ticket=yes user_name=...`
  - `[wechat] 标题: ...  正文: ... 字符`
  - `[wechat] 上传封面到永久素材库...`
  - `[wechat] ✅ 封面上传完成 media_id=... url=...`
  - `[wechat] 3/3 草稿已写入 appMsgId=...`
  - 最终 `mode: api-draft`

### 2. 群发模式 (需扫码, 慎用)

```bash
node scripts/publish-browser.js --platform wechat --input "/path/" --mode publish
```

**预期日志分支**:
- ✅ `群发成功 msgId=...` — 立即发给所有关注者
- ⚠️ `群发保护: admin 用微信扫二维码完成群发保护验证` (mass_protect 开启) — 草稿已保留, 需用绑定公众号的微信扫返回的 qrUrl
- ⚠️ `群发失败, 草稿已保留: ...` (频率限制/未认证) — 草稿已保留, 可人手到草稿箱群发

**`publish` 模式会消耗频率配额, 默认用 `draft`, 待人手在后台确认后再群发。**

### 3. 验证 session 文件已生成

```bash
cat /home/yf/.config/opencode/browser-sessions/wechat.json | head -50
```

**预期**:
- JSON 包含 `cookies` 数组 (10+ cookies, 含 `slave_user`, `wxuin` 等)
- 顶层有 `token` / `ticket` / `user_name` 字段
- `savedAt` ISO 时间戳

### 4. 验证草稿箱有内容

打开 https://mp.weixin.qq.com/ → 草稿箱 → 应该看到:
- 标题: "客服团队效率低？试试 RAG 知识库 + AI Agent 的 3 个真相"
- 封面: 已上传的图片
- 正文: 完整 HTML 渲染
- 按钮: "群发" (草稿状态)

### 5. 二次跑 (验证 session 复用)

```bash
node scripts/publish-browser.js --platform wechat --input "/path/to/another/article/" --mode draft
```

**预期**:
- 直接跳过扫码 (`[session] ✅ 已恢复 wechat Cookie`)
- 不再问扫码

## 失败处理

| 现象 | 原因 | 修复 |
|------|------|------|
| 提不到 token (`[wechat] 无法提取 token`) | 登录页未完全加载 | 等 5s 重试, 或检查 `window.wx.commonData` 字段名 |
| 封面上传 errcode=40001 | access_token 失效 | 删除 wechat.json, 重新登录 |
| `base_resp.ret=200003` | masssend 限制 (mode=publish 才会) | 改用 mode=draft |
| `base_resp.ret=10000` + qr_url | 群发保护开启 (mass_protect) | admin 用绑定公众号的微信扫 qr_url |
| `base_resp.ret=45001` | 群发频率限制 (订阅号 1 次/天, 服务号 4 次/月) | 等明天再发, 或改用 mode=draft 手人在后台群发 |
| `ret=-1` | 缺参数 | 检查 title0/content0 是否空 |

## 已知限制

1. **`mode=publish` 受 mass_protect 风控** — 群发保护开启时必须 admin 用手机扫码
2. **个人订阅号无群发权限** — 必须是已认证的服务号/订阅号
3. **微信过滤非 mmbiz.qpic.cn 图** — 所有本地图必须先上传 (已实现)

## 完成勾选

- [ ] 本机扫码成功
- [ ] wechat.json 生成且 token 提取成功
- [ ] 草稿箱可见文章 + 封面
- [ ] (publish 模式, 可选) 群发成功
- [ ] (publish 模式, 可选) mass_protect 扫码提示
- [ ] 第二次跑直接复用 session

