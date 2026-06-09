---
name: yuanfang-html-video
description: |
  视频生成 skill。把 content.json / video brief → mp4。
  与 yuanfang-html-image 平级，专做"有音频轨 + 视频引擎"的视频（15s+ 抖音/视频号/朋友圈视频）。
  动图 (CSS / GIF / WebP) 不在此处，去 yuanfang-html-image。
  后端：ffmpeg (软依赖，用户系统装；npm 也有 ffmpeg-static 可选)。
---

# yuanfang-html-video — 视频生成

## 职责边界

**做**：把视频 brief → mp4 文件（带音频轨 / 转场 / 字幕）
**不做**：动图（→ yuanfang-html-image）、文案（→ yuanfang-content-gen）、发布（→ yuanfang-media-publish）

**分界线**：需要音频轨 + 视频引擎 → 此 skill。不需要 → yuanfang-html-image（即使有动效）。

## 它不做什么

- 不写文案（→ yuanfang-content-gen）
- 不出图（→ yuanfang-html-image，含动图）
- 不调 LLM API
- 不发平台（→ yuanfang-media-publish）

## 输入 / 输出

**输入**：
- `content.json`（从 yuanfang-content-gen 产出，复用文案 + 关键帧 PNG）
- 或 `video-brief.md`（视频专属 brief：场景列表 + 配音文 + BGM 链接）

**输出**：
- `output/<session>/<平台>/video.mp4`（15-60s）
- 可选 `video.srt`（字幕）

## 后端

**ffmpeg**（软依赖，不强制打包）：
- 完全可控 / 0 成本 / 不需企业认证 / 模板丰富
- 不打包进 npm 原因：ffmpeg-static ~50MB，install 太慢
- 检测顺序：`require('ffmpeg-static')` → 系统 `ffmpeg` PATH
- 检测不到 → 清晰报错并 exit 1，告诉用户怎么装

**未来可加**：剪映 SDK / 可灵（如果要 AI 文生视频）

## 平台 × 时长矩阵

| 平台 | 推荐时长 | 比例 | 特殊 |
|---|---|---|---|
| 抖音 | 15-60s | 9:16 | 必带字幕；首 3s 钩子 |
| 视频号 | 15-60s | 9:16 / 1:1 | 可加位置/话题 |
| 朋友圈视频 | 15s 内 | 9:16 / 1:1 | 无音频体验更广 |
| 小红书视频 | 30-90s | 9:16 / 3:4 | 必带封面图 |
| B站 | 1-5min+ | 16:9 | 接受长视频；可分章节 |
| YouTube | 1min+ | 16:9 | 标题/描述/缩略图 |

## 用法

```bash
# 最简
node scripts/render.js \
  --file output/AICS/小红书/content.json \
  --platform douyin --duration 15

# 加 BGM
node scripts/render.js --file content.json --platform douyin --duration 30 --bgm /path/to/music.mp3

# 高帧率
node scripts/render.js --file content.json --platform bilibili --duration 60 --fps 30

# 短视频（5s）
node scripts/render.js --file content.json --platform moments-video --duration 5
```

## 串行模板（agent 怎么跑）

```
Step 1  加载 yuanfang-html-video SKILL.md
        让用户确认：
        - 哪个平台？几秒？
        - 配音 / BGM / 静音
        - 用现成 PNG 做幻灯片，还是 AI 文生视频？
        - 字幕？

Step 2  调 scripts/render.js
        检测 ffmpeg 软依赖 → 缺就给清晰错误并教装
        截 N 帧（每帧一个 wait 累加，模拟 CSS 动画进度）
        PNG → JPG 转换（sharp，ffmpeg 编 JPG 比 PNG 快 5-10x）
        ffmpeg 合成 mp4（H.264 / yuv420p / CRF 23 / preset medium）

Step 3  总结输出 + 给用户发布清单
```

## 何时用

✅ 用户要做抖音/视频号短视频
✅ 用户要做朋友圈 15s 视频
✅ 用户要做 B站 1min+ 讲解

❌ 动图 / GIF / CSS 动效 → yuanfang-html-image
❌ 写文案 → yuanfang-content-gen
❌ 发布 → yuanfang-media-publish

## 后续

- [x] 选型 ffmpeg
- [x] scripts/render.js 实现
- [x] 抖音 9:16 / 视频号 / B站 16:9 / 朋友圈 1:1 模板
- [ ] 字幕生成（STT 或手工）
- [ ] references/platform-specs.md（各平台视频规格详细）
