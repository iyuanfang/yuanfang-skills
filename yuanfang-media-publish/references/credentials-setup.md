# 凭证配置指南

`yuanfang-media-publish` 用一份 JSON 集中管理各平台 API 凭证。默认路径：

```
~/.config/opencode/publish-credentials.json
```

可用 `--credentials` 覆盖。每个平台独立的获取流程见下。

## 通用约定

- 权限：建议该文件 `chmod 600`
- 占位：缺哪个平台就只填那一段，其它平台先注释掉
- 轮换：发现泄露立即去平台后台重置 token，本文件原地更新
- 共享：脚本读这个文件；agent 不写它（避免泄露到 git）

完整模板见仓库根 `yuanfang-media-publish/publish-credentials.example.json`。

## 各平台获取流程

### 微信公众号（wechat）

1. 打开 https://mp.weixin.qq.com → 设置与开发 → 基本配置
2. 复制 **AppID** 和 **AppSecret**（首次点"生成"）
3. 把服务器 IP 加白名单（公众号设置 → 公众号设置 → 功能设置 → JS接口安全域名 / IP白名单）
4. 填入：

```json
"wechat": {
  "appId":     "wx1234567890abcdef",
  "appSecret": "f1e2d3c4b5a6..."
}
```

注意：本 skill 走**草稿箱**（`/cgi-bin/draft/add`），不自动群发。

### 头条号（toutiao）

1. 打开 https://mp.toutiao.com → 登录 → 主页右上角"创作中心"
2. 左侧"工具" → "开发工具" → 申请"开放平台"
3. 创建应用 → 选"内容发布"权限 → 拿到 **access_token**（手动生成一次性 token，30 天有效）
4. 填入：

```json
"toutiao": {
  "token": "your-long-lived-access-token"
}
```

微头条同 token，脚本里 `publishToutiao` 会自动选短文 endpoint。

### 知乎（zhihu）

1. 打开 https://www.zhihu.com → 设置 → API 申请（目前为邀请制）
2. 拿到 OAuth **access_token**（知乎 API 受限，建议用 Zhihu OAuth2.0 流程）
3. 填入：

```json
"zhihu": {
  "oauth": "your-zhihu-oauth-access-token"
}
```

### B 站（bilibili）

1. 打开 https://openhome.bilibili.com → 登录 → 创建应用
2. 类型选"网站应用"或"客户端"，勾"动态发布"权限
3. 审核通过后拿到 **AppKey** + **AppSecret**
4. 跑 OAuth2.0 流程拿 **access_token**
5. 填入：

```json
"bilibili": {
  "appKey":      "your-bilibili-app-key",
  "appSecret":   "your-bilibili-app-secret",
  "accessToken": "long-lived-bilibili-access-token"
}
```

### 抖音（douyin）

1. 打开 https://developer.open-douyin.com → 注册开发者
2. 创建"小程序"或"网站应用"，勾"视频上传 + 发布"权限
3. 企业认证 + 类目报白（个人号拿不到视频发布权限）
4. 拿到 **client_key** + **client_secret**，OAuth 拿 **access_token**
5. 填入：

```json
"douyin": {
  "clientKey":    "douyin-client-key",
  "clientSecret": "douyin-client-secret",
  "accessToken":  "douyin-access-token"
}
```

## 暂不通过 API 的平台

- **小红书**：无开放 API，走 `xpzouying/xiaohongshu-mcp`（Playwright 模拟登录）。Cookie 由 MCP 自己的配置文件管理，本 skill **不**读。
- **朋友圈 / 个人微信**：无 API，本 skill 只产"发布指引"。
- **视频号**：需企业认证 + 腾讯云 COS 中转，单独文档（待补）。
