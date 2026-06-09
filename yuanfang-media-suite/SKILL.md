---
name: yuanfang-media-suite
description: 组合层 skill。串起 yuanfang-content-gen（写文案） + yuanfang-html-image（出图），让 agent 在 OpenCode session 里走完整套多平台内容生产流程。本 skill 自身 0 代码——只写"agent 怎么串"。
---

# yuanfang-media-suite

**这是组合层 skill。** 把 yuanfang-content-gen + yuanfang-html-image（或未来的 video / publish）按正确顺序串起来。本 skill 自身 0 代码——只告诉 agent 怎么调子 skill、怎么传数据。

## 它不做什么

- 不写文案（→ yuanfang-content）
- 不出图（→ yuanfang-image）
- 不调 LLM API（agent 用自己 session 的 host LLM）
- 不写代码

## 子 skill

| Skill | 职责 | 输入 | 输出 |
|---|---|---|---|
| `yuanfang-content-gen` | 多平台文案 + 合规验证 | brief.md | `output/<session>/<平台>/{copy.md, content.json}` |
| `yuanfang-html-image` | 静态图渲染 | content.json | PNG |
| `yuanfang-html-ppt` | PPT 演示（独立） | content.yaml | .pptx |
| `yuanfang-media-publish` (新) | 发布到平台账号 | PNG / mp4 | 平台帖子 URL |
| `yuanfang-media-video` (未来) | 视频生成 | content.json | mp4 |

## 串行模板（agent 怎么跑）

用户说："做 AICS 的 6 平台营销"。

```
Step 1  加载 yuanfang-content-gen SKILL.md
        让用户确认要哪些平台（默认：小红书 + 朋友圈）
        让用户确认语气/调性（默认：自动从 brief 推断）

Step 2  调 yuanfang-content-gen
        node ../yuanfang-content-gen/scripts/generate-copy.js \
          --content brief.md --platforms <p1,p2,...> --variants 1 --print-prompts
        → 读 prompt JSON → host LLM 写 6 份 copy.md + content.json
        → 跑 validate（合规分 < 35 视为 fail，让 LLM 重写）

Step 3  加载 yuanfang-html-image SKILL.md
        对每个 platform 跑 render.js（用 ## 语气 自动推荐主题）
        node ../yuanfang-html-image/scripts/render.js \
          --file output/<session>/<平台>/content.json \
          --theme <推荐> --accent <brand color> --platforms <p1,p2>

Step 4  [可选] 加载 yuanfang-media-publish SKILL.md
        把 PNG 上传到平台账号，存帖子 URL + 发布时间

Step 5  总结 output/<session>/ 目录 + 给用户一份发布清单
```

## 关键约定

- **数据交接靠文件**：content.json 是 content → image 的契约（render.js 直接读）
- **agent 跑在 OpenCode session 里**：host LLM 处理所有 LLM 调用，0 额外 API key
- **tone → theme 自动推荐**：`generate-copy.js` 已内置 11 类映射
- **合规优先**：所有 copy.md 必须 `validate-copy.js` 过，< 35 不出图

## 何时用

✅ 用户给一个产品/话题，要多平台营销
✅ 用户要 A/B 测试文案（--variants N）
✅ 用户要给现有产品出"全套视觉"
✅ 用户要一站完成"写文案 → 出图 → 发布"（含 publish）

❌ 只想出图、写好了 copy.md → 直接用 yuanfang-html-image
❌ 只想写文案、不出图 → 直接用 yuanfang-content-gen
❌ 只想发布、写好了 PNG → 直接用 yuanfang-media-publish

---

## 动图去哪？（决策表）

"动图"在 yuanfang 体系里是 3 种东西，**分界线是"是否需要音频轨 + 视频引擎"**：

| 动图类型 | 例子 | 格式 | 归属 skill | 现状 |
|---|---|---|---|---|
| **A. CSS 动效** | 入场动画、悬浮、过渡、轮播 | PNG 序列 / SVG 动画 / Lottie | `yuanfang-html-image` | 已支持（--animation 旗 + base.css keyframes, 计划中） |
| **B. GIF / WebP** | 表情包、产品轮播、产品 360° | .gif / .webp | `yuanfang-html-image` | 计划中（--format gif + --frames N, 多次需要再拆 yuanfang-anim） |
| **C. 短视频** | 抖音/视频号/朋友圈视频 | .mp4 | `yuanfang-media-video` (未来) | 待建（用 ffmpeg / 可灵 / 剪映 SDK） |

> 决策树：是否需要音频 + ffmpeg？
> - 不需要 → image（即使有动效也留 image）
> - 需要 → 未来的 video skill
>
> 参考：仓库已有 `gif-sticker-maker` skill，可作为 B 类实现的参考（拿过来扩 image 的 `--format gif` 旗）。

引用：在 [yuanfang-media-publish](../yuanfang-media-publish/SKILL.md) 发布时，A/B 类走图片通道，C 类走视频通道。
