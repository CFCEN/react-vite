# Local Dev Workspace Frontend

React + TypeScript + Vite 本地开发工作台前端。项目使用 Ant Design、TanStack Query、Axios、React Router 和原生 WebSocket。

## 环境要求

- Node.js `>=20.19`
- pnpm
- Go 后端默认运行于 `http://127.0.0.1:9527`

安装与启动：

```bash
pnpm install
pnpm dev
```

## Claude Automation

Claude Automation 是一级菜单，用于查看和控制本机 Claude Code 会话。

### 配置

创建本地环境配置，并使用与 Go 后端 `AUTOMATION_TOKEN`、Adapter `remote.token` 相同的专用 token：

```bash
VITE_AUTOMATION_TOKEN=replace-with-a-dedicated-token
```

前端 REST 基地址目前为 `http://127.0.0.1:9527`。Automation REST 请求通过 Bearer token 鉴权，浏览器 WebSocket 通过 `token` 查询参数鉴权。不要将上游模型 API key 用作 Automation Token。

### 页面能力

- 会话按 Claude transcript 记录的项目路径分组。
- `Sessions` 展示全部会话；`Tasks` 展示 `running` 和 `waiting` 会话，并标记等待确认数量。
- 会话卡片显示标题、prompt、状态、session ID 和更新时间。
- 点击会话卡片，在当前列表上方打开居中详情弹窗；完整详情路由仍可直接访问。
- 弹窗与详情页共用同一个 `ClaudeAutomationSessionDetail`，支持：
  - Markdown 对话 Preview；
  - 完整 Source 数据；
  - 自动跟随最新消息；
  - 实时 WebSocket 更新；
  - 权限/计划的批准、拒绝或继续；
  - 输入新消息以恢复已完成会话。
- Enter 发送消息，Shift+Enter 换行；等待人工选择、连接离线或正在发送时禁用发送。

### 通知

会话从 `running` 变为 `completed`，或进入 `waiting` 状态时，页面右上角显示常驻通知。通知不会自动消失，只会在以下情况下关闭：

- 刷新页面；
- 点击当前通知的“确认”；
- 点击“全部关闭”。

通知中的“详情”会打开与点击会话卡片相同的居中详情弹窗。完成通知正文优先展示最后一轮 Assistant 回复。

### 数据流

```text
initial REST snapshot
  + wildcard WebSocket for session list
  + session WebSocket for open detail
  → TanStack Query cache
  → Sessions / Tasks / notifications / detail modal
```

关键实现：

- `src/pages/claude-automation/index.tsx`：列表、Tabs、通知、详情 Modal。
- `src/pages/claude-automation/session-detail.tsx`：共享详情、对话、待办和消息输入。
- `src/pages/claude-automation/detail.tsx`：完整页面薄包装。
- `src/api/claudeAutomationApi.ts`：REST API。
- `src/hooks/useClaudeAutomationSocket.ts`：原生 WebSocket 重连。
- `src/types/claudeAutomation.ts`：协议类型。

## 验证

```bash
pnpm lint
pnpm exec tsc -p tsconfig.app.json --noEmit --ignoreDeprecations 6.0
```

当前 Vite 8 构建要求 Node.js `20.19+`；低版本 Node.js 会在构建阶段失败。
