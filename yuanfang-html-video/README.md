# yuanfang-html-video

视频生成 skill。15-60s 抖音/视频号/朋友圈/B站/YouTube 视频。**软依赖 ffmpeg**（用户系统装；脚本检测不到会清晰报错）。

## 快速开始

### 1. 装 ffmpeg（一次）

```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg

# 验证
ffmpeg -version
```

或 `npm install ffmpeg-static`（项目级，5MB+，慢）。

### 2. 装 skill

```bash
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-video ~/.config/opencode/skills/yuanfang-html-video
```

### 3. 跑

```bash
node yuanfang-html-video/scripts/render.js \
  --file output/AICS/小红书/content.json \
  --platform douyin --duration 15
```

输出 `output/AICS/小红书/视频_douyin.mp4`。

## 支持的平台

| Key | 比例 | 时长建议 |
|---|---|---|
| `douyin` | 9:16 (1080x1920) | 15-60s |
| `shipinhao` / `wechat-video` | 9:16 (1080x1920) | 15-60s |
| `moments-video` | 1:1 (1080x1080) | <15s |
| `xhs-video` | 3:4 (1080x1440) | 30-90s |
| `bilibili` | 16:9 (1920x1080) | 1-5min+ |
| `youtube` | 16:9 (1920x1080) | 1min+ |

## 动图去哪？

→ `yuanfang-html-image`。动图不需要音频，仍属 image 范畴。

## 文件结构

```
yuanfang-html-video/
├── SKILL.md                ← SOP
├── README.md               ← 本文件
├── scripts/
│   └── render.js           ← ffmpeg pipeline
├── references/             ← 待补
└── examples/               ← 待补
```
