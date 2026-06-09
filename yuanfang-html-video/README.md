# yuanfang-html-video

视频生成 skill（占位 SOP，未实现）。15-60s 抖音/视频号/朋友圈视频。

## 快速开始

### 1. 装

```bash
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-video ~/.config/opencode/skills/yuanfang-html-video
```

### 2. OpenCode session 里

> "用 yuanfang-html-video 给 AICS 做 1 个 30s 抖音视频"

agent 加载本 SKILL.md，按平台规格跑视频生成（后端选型后填充）。

## 现状

⚠️ **占位 SOP**。scripts/render.js 暂未实现。后端选型未定（ffmpeg / 剪映 / 可灵）。

## 动图（CSS / GIF / WebP）去哪？

→ **`yuanfang-html-image`**。动图不需要音频轨 + 视频引擎，仍属 image 范畴。

## 文件结构

```
yuanfang-html-video/
├── SKILL.md                ← 本文件
├── README.md               ← 入口
├── references/             ← 待补 (各平台视频规格)
│   └── platform-specs.md
├── scripts/                ← 待建
│   └── render.js
└── examples/               ← 待补
```
