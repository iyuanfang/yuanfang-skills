# yuanfang-media-suite

完整多平台内容生产工作流。组合层——告诉 agent 怎么串 yuanfang-content-gen + yuanfang-html-image（+ 可选 publish）。

## 快速开始

### 1. 装 4 个 skill（推荐普通用户）

```bash
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-content-gen    ~/.config/opencode/skills/yuanfang-content-gen
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-image     ~/.config/opencode/skills/yuanfang-html-image
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-media-suite    ~/.config/opencode/skills/yuanfang-media-suite
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-design         ~/.config/opencode/skills/yuanfang-design
# 可选：发布 + 视频
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-media-publish  ~/.config/opencode/skills/yuanfang-media-publish
```

### 2. OpenCode session 里

> "用 yuanfang-media-suite 给 AICS 做 6 平台营销"

agent 加载本 SKILL.md，按"串行模板"调 yuanfang-content-gen 写文案 → yuanfang-html-image 出图。

## 高级：只装一部分

| 场景 | 装什么 |
|---|---|
| 只要文案 | `yuanfang-content-gen` + `yuanfang-design`（design 给主题预览） |
| 只要图 | `yuanfang-html-image` + `yuanfang-design` |
| 写 + 出图 | `yuanfang-content-gen` + `yuanfang-html-image` + `yuanfang-design` |
| 完整（+发布） | 上面的 + `yuanfang-media-publish` |

## 完整流程图

```
话题 / brief.md
   ↓
[ yuanfang-content-gen ]
   ├─ generate-copy.js (造 prompt)
   ├─ host LLM 写 6 份 copy.md + content.json
   └─ validate-copy.js (合规校验)
        ↓
[ yuanfang-html-image ]
   ├─ render.js (按主题渲染)
   └─ Playwright 截图
        ↓
[ yuanfang-media-publish ] (可选)
   └─ 调平台 MCP/API 上传 → 存帖子 URL
        ↓
output/<session>/
   ├─ 小红书/{copy.md, content.json, *.png, post_url.txt}
   ├─ 公众号/...
   └─ ...
```

## 文件结构

```
yuanfang-media-suite/
├── SKILL.md           ← 组合文档（agent 怎么串）
├── README.md          ← 本文件（用户入口）
└── examples/
    └── aics-2026-06-08.md   ← 真实案例（todo）
```
