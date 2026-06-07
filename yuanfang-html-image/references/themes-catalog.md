# 18 主题完整目录

agent 在 Step 2 推荐主题时备查。详细视觉特征：

| # | 主题 | 底色 | 主色 | 视觉特征 | 适合 |
|--:|------|------|------|---------|------|
| 01 | minimal-white | `#FFFFFF` | `#5856E9` | 左侧内容+右侧 Indigo 装饰块, 品牌色驱动 | 品牌通用、教程、干货 |
| 02 | minimal-white-editorial | #FAFAFA | #4F46E5 | 超多留白, 精致小字, 瑞士风排版 | 高端品牌、艺术、设计 |
| 03 | tech-modern | #0F172A | #4FACFE | 终端点数+网格底, 代码注释前缀, 发光点缀 | AI/科技、数码 |
| 04 | corporate-clean | #FFFFFF | #2563EB | 商务蓝, 干净利落, 企业级排版 | 企业 SaaS、商务演示 |
| 05 | tokyo-night | #1A1B26 | #7AA2F7 | 深色霓虹, 紫蓝渐变, 极客风 | 开发者、极客内容 |
| 06 | pitch-deck-vc | #FFFFFF | #0070F3 | YC 风路演, 蓝紫渐变 | 融资演示、pitch deck |
| 07 | dark-gold | #1A1A2E | #E2B714 | 对角分割+装饰圆, 渐变金字, 磨砂纹理 | 重磅消息、产品发布 |
| 08 | magazine-cover | #F5F0EB | #4F46E5 | 全出血版式, 超大标题居中, 右下角品牌标签 | 精品文章、封面故事 |
| 09 | bold-poster | #000000 | #FF3355 | 对角大幅红色色块, 超大字体 | 金句引爆、活动 |
| 10 | editorial | #F5F0EB | #C0392B | 大引号+顶部分隔线, 红色点缀 | 深度分析、访谈 |
| 11 | editorial-serif | #FAF8F5 | #C0392B | 衬线 Playfair, 富排版细节, 编辑风 | 高端长文、白皮书 |
| 12 | warm-handdrawn | #FDF6EC | #D97706 | 纸纹底+手绘下划线, 胶带装饰, 星星标记 | 个人故事、生活 |
| 13 | data-infographic | #F8FAFC | #10B981 | 数据卡片+进度条, 线图装饰 | 排行、报告、数据 |
| 14 | list-ranking | #FFFFFF | #4F46E5 | 编号列表, 大号数字标记, 底部品牌条 | 排行榜、Top 10、步骤流程 |
| 15 | split-screen | #FFFFFF | #4F46E5 | 左右双色背景, 一侧品牌色一侧留白 | 对比/双语/产品展示 |
| 16 | eastern | #F7F3EE | #8D6E63 | 水墨晕染+竖排标题, 印章/竹线装饰 | 文化、哲思、诗词 |
| 17 | catppuccin-latte | #EFF1F5 | #DD7878 | 暖色系, 粉紫橙渐变, 轻量 | 轻松内容、生活 |
| 18 | catppuccin-mocha | #1E1E2E | #F5C2E7 | 暗色系, 粉紫红, 暗色舒适 | 暗色舒适、night owl |

## 内容类型 → 主题推荐

```
干货/教程 → minimal-white / data-infographic / list-ranking
重磅消息 → dark-gold / bold-poster / magazine-cover
深度分析 → editorial / editorial-serif / eastern / magazine-cover
个人故事 → warm-handdrawn / minimal-white-editorial
科技资讯 → tech-modern / tokyo-night / split-screen / minimal-white-editorial
路演融资 → pitch-deck-vc / dark-gold / corporate-clean
企业 SaaS → corporate-clean / minimal-white
轻量舒适 → catppuccin-latte / catppuccin-mocha
```

## 主题文件位置

```
yuanfang-design/themes/<theme-name>.css
```

每个主题是一个独立的 CSS 文件，override `base.css` 的 token。添加新主题：复制 `themes/_template.css`，覆盖 token，测试，更新 showcase。
