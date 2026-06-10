---
name: yuanfang-media-publish
description: |
  发布层 skill。把 yuanfang-html-image (或未来 video) 产出的 PNG / mp4 上传到平台账号。
  平台：微信公众号、小红书、头条、知乎、朋友圈 (个人微信)、微头条、B站、抖音。
  当用户说"发到小红书"、"上传公众号"、"自动发布"、"发朋友圈"、"管理多个平台账号"时考虑此技能。
  本 skill 自身 0 上传代码——通过 OpenCode MCP/Playwright/官方 API 调用平台，agent 跑在 session 里负责调度。
---

# yuanfang-media-publish — 多平台发布

## 职责边界

**做**：把 PNG/mp4 + 文案 → 平台帖子 URL（人工/Cookie 验证 + 自动 API 两种模式）
**不做**：写文案、出图、改任何媒体文件

**输入**：`output/<session>/<平台>/` 里的 `copy.md` + `*.png`（以及未来 `*.mp4`）
**输出**：`output/<session>/<平台>/post_url.txt` + `published_at.txt` + `platform_response.json`

## 它不做什么

- 不写文案（→ yuanfang-content-gen）
- 不出图（→ yuanfang-html-image）
- 不改 PNG / mp4
- 不存用户凭证（由各平台 MCP / 浏览器 session 管理）

## 平台 × 通道矩阵

| 平台 | 通道 | 凭证 | 适合 | 状态 |
|---|---|---|---|---|
| **微信公众号** | 公众号 API (第三方) | AppID + AppSecret | 自动 + 草稿箱 | ✅ |
| **微信公众号** | publish-browser.js (Playwright) | 无需凭证，扫码登录 | 半自动 | ✅ |
| **小红书** | xpzouying/xiaohongshu-mcp (Playwright) | 用户 cookie | 半自动 (agent 走 web) | 🟡 待实现 |
| **头条 (文章)** | publish-browser.js (Playwright) | 无需凭证，扫码登录 | 半自动 | ✅ |
| **头条 (视频)** | 抖音开放平台 API | client_key + token | 自动 | 🟡 框架已就位 |
| **知乎** | publish-browser.js (Playwright) | 无需凭证，扫码登录 | 半自动 | ✅ |
| **微头条** | 同头条（浏览器发布） | 无需凭证 | 半自动 | ✅ |
| **朋友圈 (个人微信)** | 无官方 API | 微信 PC 客户端 | 人工 (agent 指引) | 📋 人工 |
| **B站** | B站开放平台 API | AppKey + access_token | 自动 | 🟡 框架已就位 |
| **抖音** | 抖音开放平台 | client_key + token | 自动 | 🟡 需企业认证 |
| **视频号** | 微信视频号 API | AppID + AppSecret | 自动 | 🟡 待补 |

> 平台策略参考 `references/platform-strategies.md`（未来补充）。

## 串行模板（agent 怎么跑）

```
Step 1  加载 yuanfang-media-publish SKILL.md
        让用户选：哪几个平台？人工确认还是全自动？

Step 2  [可选] 让用户配凭证
        检查 ~/.config/opencode/publish-credentials.json 是否存在
        缺哪个平台 → 提示用户补充（或打开浏览器走 cookie 流程）

Step 3  对每个平台调对应通道
        ── 自动通道（公众号 API / B站 / 抖音）──
        node scripts/publish-api.js \
          --platform wechat --input output/<session>/公众号/ \
          --credentials ~/.config/opencode/publish-credentials.json
        ── 浏览器通道（头条 / 知乎 / 公众号备用）──
        node scripts/publish-browser.js \
          --platform toutiao --input output/<session>/头条/
          # 启动 Chromium，扫码登录后自动填内容 + 存草稿
        ── 半自动通道（小红书 MCP）──
        node scripts/publish-mcp.js \
          --platform xiaohongshu --input output/<session>/小红书/
          # 走 xiaohongshu-mcp, agent 在 session 里调度
        ── 人工通道（朋友圈）──
        显示 copy.md + PNG 路径给用户，让用户复制粘贴到微信

Step 4  验证发布结果
        读 post_url.txt 检查非空
        失败重试 1 次（仅 API 通道，cookie/MCP 通道不重试避免风控）

Step 5  总结：每个平台一条记录
        platform    | status   | url                          | published_at
        ────────────┼──────────┼──────────────────────────────┼─────────────
        小红书      | ✓ posted | xhslink.com/a/xxxxx          | 2026-06-09 14:30
        公众号      | ✓ draft  | mp.weixin.qq.com/s/xxxxx     | 2026-06-09 14:30
        朋友圈      | ⏸ manual | (用户在微信客户端手动发送)    | -
```

## 关键约定

- **人工通道**（朋友圈）：agent 只产"发布指引"，**不**模拟点击
- **cookie 通道**（小红书 MCP）：agent 调度 MCP，**凭证存在 MCP server 自己的配置文件**，本 skill 不存
- **API 通道**（公众号/B站/抖音）：本 skill 提供 `publish-api.js` 包装，凭证由用户用环境变量提供
- **浏览器通道**（头条/知乎/公众号备用）：本 skill 提供 `publish-browser.js`（Playwright），无需 API 凭证，扫码登录
- **失败重试**：API 通道 1 次（429 限流时尊重 backoff）；cookie/MCP 通道不重试（防风控）
- **内容合规**：发布前必须 `validate-copy.js` 过；publish 失败时不重试非合规内容
- **发布记录**：`post_url.txt` + `published_at.txt` + `platform_response.json` 三件套落到 `output/<session>/<平台>/`

## 何时用

✅ 用户要批量发多个平台
✅ 用户要"早上 8 点统一发"这种定时
✅ 用户已经把 PNG 写好了，单独要发布能力

❌ 还没生成媒体 → 走 yuanfang-media-suite 完整流程
❌ 只想写文案 → yuanfang-content-gen

## 后续

- [ ] `references/platform-strategies.md` — 各平台限流、避坑、合规
- [x] `references/credentials-setup.md` — 怎么配各平台凭证（已补，含浏览器通道说明）
- [x] `scripts/publish-api.js` — 统一 API 通道包装（公众号 ✅ 其它 🟡）
- [x] `scripts/publish-browser.js` — Playwright 浏览器通道（头条/知乎/公众号）✅
- [ ] `scripts/publish-mcp.js` — 小红书 MCP 通道
- [ ] `examples/` — 真实账号发布记录
