# yuanfang-media-publish

多平台发布层 skill。把 PNG / mp4 + 文案上传到平台账号，存帖子 URL + 发布时间。

## 快速开始

### 1. 装

```bash
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-media-publish ~/.config/opencode/skills/yuanfang-media-publish
```

### 2. 准备凭证

按 [references/credentials-setup.md](references/credentials-setup.md)（待补）配各平台：

```json
// ~/.config/opencode/publish-credentials.json
{
  "wechat":  { "appId": "...", "appSecret": "..." },
  "toutiao": { "token": "..." },
  "zhihu":   { "oauth": "..." },
  "bilibili":{ "accessToken": "..." },
  "douyin":  { "clientKey": "...", "clientSecret": "..." }
}
```

小红书 / 朋友圈走 MCP / 浏览器，凭证由各自通道管理。

### 3. OpenCode session 里

> "用 yuanfang-media-publish 把 output/20260608_AICS/ 全部发出去"

agent 加载本 SKILL.md，按平台矩阵调对应通道。

## 平台通道速查

| 平台 | 通道 | 模式 |
|---|---|---|
| 微信公众号 | 公众号 API | 自动 |
| 小红书 | xiaohongshu-mcp | 半自动 |
| 头条 | 头条号 API | 自动 |
| 知乎 | 知乎 API | 自动 |
| 微头条 | 头条号 API | 自动 |
| 朋友圈 | 微信 PC | 人工指引 |
| B站 | B站开放平台 | 自动 |
| 抖音 | 抖音开放平台 | 自动 |

## 文件结构

```
yuanfang-media-publish/
├── SKILL.md                    ← 本文件
├── README.md                   ← 入口
├── scripts/                    ← 各通道包装 (待实现)
│   ├── publish-api.js          ← 统一 API 通道
│   └── publish-mcp.js          ← 小红书 MCP 通道
├── references/                 ← 详细文档
│   ├── platform-strategies.md  ← 限流/避坑
│   └── credentials-setup.md    ← 凭证配法
└── examples/                   ← 真实发布记录
```
