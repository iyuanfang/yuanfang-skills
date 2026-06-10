# yuanfang-media-publish

多平台发布层 skill。把 PNG / mp4 + 文案上传到平台账号，存帖子 URL + 发布时间。

## 快速开始

### 1. 装

```bash
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-media-publish ~/.config/opencode/skills/yuanfang-media-publish
```

### 2. 准备凭证

按 [references/credentials-setup.md](references/credentials-setup.md) 配各平台。完整模板见 `publish-credentials.example.json`：

```bash
cp yuanfang-media-publish/publish-credentials.example.json \
   ~/.config/opencode/publish-credentials.json
chmod 600 ~/.config/opencode/publish-credentials.json
# 填入真实凭证
```

凭证结构（小红书 / 朋友圈 / 视频号不在内，由其它通道管理）：

```json
{
  "wechat":   { "appId": "...", "appSecret": "..." },
  "toutiao":  { "token": "..." },
  "zhihu":    { "oauth": "..." },
  "bilibili": { "appKey": "...", "appSecret": "...", "accessToken": "..." },
  "douyin":   { "clientKey": "...", "clientSecret": "...", "accessToken": "..." }
}
```

### 3. CLI 直接发

```bash
# 公众号：写到草稿箱（不自动群发），登录后台预览
node yuanfang-media-publish/scripts/publish-api.js \
  --platform wechat \
  --input output/2026AICS/公众号/

# 头条 / 知乎：无公开 API，走浏览器自动化
node yuanfang-media-publish/scripts/publish-browser.js \
  --platform toutiao \
  --input output/2026AICS/头条/

# 查看所有参数
node yuanfang-media-publish/scripts/publish-api.js --help
```

### 4. OpenCode session 里

> "用 yuanfang-media-publish 把 output/2026AICS/ 全部发出去"

agent 加载本 SKILL.md，按平台矩阵调对应通道。

## 平台通道速查

| 平台 | 通道 | 模式 | 状态 |
|---|---|---|---|
| 微信公众号 | 公众号 API | 自动（草稿箱） | ✅ 已实现 |
| 微信公众号 | publish-browser.js | 半自动（扫码） | ✅ 已实现 |
| 小红书 | xiaohongshu-mcp | 半自动 | cookie 由 MCP 管 |
| 头条（文章） | publish-browser.js | 半自动（扫码） | ✅ 已实现 |
| 知乎 | publish-browser.js | 半自动（扫码） | ✅ 已实现 |
| 微头条 | publish-browser.js（同头条） | 半自动（扫码） | ✅ 已实现 |
| 朋友圈 | 微信 PC | 人工指引 | 无 API |
| B站 | B站开放平台 | 自动 | 🟡 框架已就位 |
| 抖音 | 抖音开放平台 | 自动 | 🟡 需企业认证 |
| 视频号 | 微信视频号 API | 自动 | 待补 |

## 文件结构

```
yuanfang-media-publish/
├── SKILL.md                                ← 本 skill 入口
├── README.md                               ← 你正在读的
├── publish-credentials.example.json        ← 凭证模板（cp 到 ~/.config/opencode/）
├── scripts/                                ← 各通道包装
│   ├── publish-api.js                      ← 统一 API 通道（公众号/B站/抖音）
│   ├── publish-browser.js                  ← Playwright 浏览器通道（头条/知乎/公众号备用）✅
│   └── publish-mcp.js                      ← 小红书 MCP 通道（待实现）
├── references/                             ← 详细文档
│   ├── platform-strategies.md              ← 限流/避坑（待补）
│   └── credentials-setup.md                ← 凭证配法（已补）
└── examples/                               ← 真实发布记录（待补）
```

## 设计原则

- **零依赖**：只跑 node 标准库，clone 仓库即可用
- **草稿箱优先**：公众号默认写草稿不自动群发，误操作零成本
- **失败保资源**：发布失败时输入文件原样保留，修复后可重试
- **429 友好**：自动指数 backoff 重试 3 次（1s/2s/4s），不打死 API
- **状态透明**：`pending` 退出 0 表示"准备就绪但未实现"，agent 能区分成功 / 待补
