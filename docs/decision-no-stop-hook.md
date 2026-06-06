# Decision: 不写 Stop Hook，写 SKILL.md + 脚本自检

## 结论
**不做 Stop hook**。改在 SKILL.md 强约束 + render.js 入口硬自检。

## 为什么不写 Hook

| 平台 | 是否有 hook | 备注 |
|------|-------------|------|
| Claude Code | ✅ 完整（Stop / PreToolUse / PostToolUse） | 原生，配置最简单 |
| OpenCode | ✅ 间接（plugin + `tool.execute.before`） | 需要写 TS plugin + 安装 |
| OpenClaw | ❌ | 无 hooks 机制 |
| Codex | ❌ | 无 hooks 机制 |
| Aider / Cursor / Continue | ❌ | 多不支持 |

**覆盖率 60-70%，维护成本 3x**（每平台一份 hook 配置），**不划算**。

更关键：Anthropic 自己的 research 说 **"Claude treats skill content as advice, not as instructions"**。Hook 改的是**执行路径**，但不解决"agent 读 SKILL.md 时是否重视确认步骤"——这是 LLM 阅读理解层面的问题。

## 替代方案：两道防线

### 第一道：SKILL.md 强约束（已做）
- 5 个 `[等待用户确认]` 标记在关键节点
- 工作流速览图（每步 ⛇ 等待）
- Step 0/1/2/3/4 显式编号

### 第二道：render.js 入口硬自检（**待做**）
- 如果 `content.json` 没有 `brand` 字段 AND `--theme` 没传，**拒绝执行**
- 打印明确错误："缺少 brand/theme，说明你跳过了 Step 2 第二轮/第三轮确认"
- **跨 100% 平台有效**（任何 agent 调 render.js 都会触发）
- 维护成本 1x

## 实施代码

```javascript
// scripts/render.js main() 开头
function main() {
  const args = parseArgs(process.argv);

  if (args['list-themes'] || args['list-layouts']) { /* ... */ }

  const content = args.file
    ? JSON.parse(fs.readFileSync(args.file, 'utf-8'))
    : { title: args.title || '', /* ... */ };

  // ↓↓↓ 新增 hard gate ↓↓↓
  const hasUserDecisions = content.brand
    || content.brandImage !== undefined  // 显式 null 也算决策
    || args.theme
    || args.platforms;
  if (!hasUserDecisions) {
    throw new Error(
      'render.js: 检测到 Step 0/2 未完成。\n' +
      '必须先让用户确认：\n' +
      '  - logo 用哪个（content.brandImage 或留空）\n' +
      '  - 品牌色用哪个（content.brand 字段）\n' +
      '  - 主题（--theme）\n' +
      '  - 平台（--platforms）\n' +
      '参考 SKILL.md Step 2 第二轮 / 第三轮。'
    );
  }
  // ↑↑↑ 新增 hard gate ↑↑↑

  // ... 继续原逻辑
}
```

## 优先级
- P1 任务重新排序：
  1. ~~写 Stop hook~~ ❌ 取消
  2. **render.js 硬自检** ← 1-2 小时
  3. SKILL.md 瘦身（拆 references/）← 1-2 小时
  4. 工作流速览图（流程图） ← 1 小时
  5. 加国际平台（YouTube/LinkedIn） ← 2-3 小时

## 兼容性
✅ 不依赖任何 agent 平台
✅ 任何 CLI 调用（agent / 人类 / cron）都生效
✅ 现有 105 测试不受影响（测试用例都满足 gate 条件）

## 不做的
- ❌ Claude Code hook（覆盖率不划算）
- ❌ OpenCode plugin（同样的理由）
- ❌ 状态文件（太重，单一入口 gate 足够）
