# yuanfang-content-suite

完整多平台内容生产工作流。组合层——告诉 agent 怎么串 yuanfang-content + yuanfang-image。

## 快速开始

### 1. 装 3 个 skill（推荐普通用户）

```bash
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-content      ~/.config/opencode/skills/yuanfang-content
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-image        ~/.config/opencode/skills/yuanfang-image
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-content-suite ~/.config/opencode/skills/yuanfang-content-suite
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-design       ~/.config/opencode/skills/yuanfang-design
```

### 2. OpenCode session 里

> "用 yuanfang-content-suite 给 AICS 做 6 平台营销"

agent 加载本 SKILL.md，按"串行模板"调 yuanfang-content 写文案 → yuanfang-image 出图。

## 高级：只装一部分

| 场景 | 装什么 |
|---|---|
| 只要文案 | `yuanfang-content` + `yuanfang-design`（design 给主题预览） |
| 只要图 | `yuanfang-image` + `yuanfang-design` |
| 完整 | 上面的 4 个 |

## 完整流程图

```
话题 / brief.md
   ↓
[ yuanfang-content ]
   ├─ generate-copy.js (造 prompt)
   ├─ host LLM 写 6 份 copy.md + content.json
   └─ validate-copy.js (合规校验)
        ↓
[ yuanfang-image ]
   ├─ render.js (按主题渲染)
   └─ Playwright 截图
        ↓
output/<session>/
   ├─ 小红书/{copy.md, content.json, *.png}
   ├─ 公众号/...
   └─ ...
```

## 文件结构

```
yuanfang-content-suite/
├── SKILL.md           ← 组合文档（agent 怎么串）
├── README.md          ← 本文件（用户入口）
└── examples/
    └── aics-2026-06-08.md   ← 真实案例（todo）
```
