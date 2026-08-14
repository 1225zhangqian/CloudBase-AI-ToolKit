---
name: cloudbase-auth-bootstrap
description: "Bootstrap CloudBase connector auth for platform customers without a Tencent Cloud developer account (新东方等). Runs a local 127.0.0.1 callback helper that opens /login?cliAuth=1, receives envId+API Key, exchanges STS via /capi/credential, and writes ~/.config/.cloudbase/auth.json. Use when users say 连接 CloudBase / 启用连接器 / 环境 API Key 登录 / 没有腾讯云账号 / 平台下发了 API Key，or when WorkBuddy CloudBase connector is not yet logged in."
version: 1.0.0
alwaysApply: false
---

# CloudBase Auth Bootstrap（平台客户 / 无腾讯云账号）

面向新东方等平台客户：下游用户**没有腾讯云开发者账号**，由平台站外下发 `envId` + 环境 API Key。本 skill 用零依赖本地 helper 完成授权落盘，避免跨应用复制密钥。

## Activation

### Use when

- 用户说：连接 CloudBase、启用连接器、环境 API Key 登录、没有腾讯云账号、平台发了 API Key / ENVID
- CloudBase 连接器未登录，或 `auth(action="status")` 显示未就绪
- 用户卡在「网页授权后还要手工复制 APIKEY/ENVID」

### Do NOT use when

- 用户已有腾讯云账号且可走标准 `tcb login --flow web` / 连接器 `start_auth`（开发者路径）
- 仅需查询已登录环境信息 → 直接 `envQuery(action="info")`

## Hard rules

1. **先探测，再授权**  
   ```bash
   node <this-skill-dir>/helper.js --status
   ```
   已有有效凭证且 envId 正确 → 引导「启用连接器 + 新开会话」，不要重复打开浏览器。

2. **默认走浏览器本地回调（路径 A）**  
   ```bash
   node <this-skill-dir>/helper.js
   ```
   - 只监听 `127.0.0.1` 随机端口  
   - URL 复刻 toolbox：`/login?cliAuth=1&_redirect_uri=…&authCallbackUrl=…`  
   - 回调 `authSource=api_key` → POST `/capi/credential` → 写 `~/.config/.cloudbase/auth.json`（`tmp*` + `authSource` + `apiKey`，`chmod 600`）  
   - **禁止**把完整 apiKey 写入对话日志；输出仅脱敏（前缀…后4位）

3. **平台已粘贴 key 时用 --from-key（连浏览器都不用）**  
   ```bash
   node <this-skill-dir>/helper.js --from-key "<apiKey>" --env-id "<envId>"
   ```
   用户若在会话里贴了 key，优先此模式，减少跳转。

4. **成功后必须引导两步**  
   1. WorkBuddy 设置中启用 CloudBase 连接器（若未启用）  
   2. **新开会话**（MCP 工具与 AuthSupervisor 缓存按会话加载）  
   新会话验收：`auth(action="status")` 已登录，或 `envQuery(action="info")` 返回正确 envId。

5. **覆盖已有凭证**时加 `--force`，并明确告知旧环境凭证将失效。

## Agent playbook

1. 识别意图 → `Skill("cloudbase-auth-bootstrap")` 或 `Read` 本文件  
2. 向用户一句话说明：「将打开本机授权页（或用你提供的 API Key），密钥不会跨应用复制。」  
3. 解析 helper 绝对路径（本 skill 目录下的 `helper.js`）  
4. 执行 `--status`；按需 `--from-key` 或默认浏览器流  
5. 分步播报：起服务 → 等授权 → 换证 → 落盘 → 启用连接器 → 新会话  
6. 失败时给出回退（见下），不要反复重试超过 2 次同一命令

## Fallback

| 场景 | 处理 |
|------|------|
| 无 Node / 沙箱禁运行时 | 启用连接器 → 新会话 → MCP `auth(action="login_by_api_key", apiKey, envId)` |
| 已装 CloudBase CLI | `tcb login --cloudbase-api-key <key> -e <envId>` |
| 回调超时（默认 600s） | 重新执行 helper；或 `--no-browser` 打印 URL 手工打开 |
| 内网网关 | 设置 `CLOUDBASE_API_ENDPOINT` 后重试 |

## Security notes（对用户可简述）

- 回调只信本机 `127.0.0.1`，一次性端口，收完即关  
- apiKey 为环境级长期凭据，明文存本机 auth.json（与官方 `loginByApiKey` 一致）；建议平台侧轮换 / 设有效期  
- 已知弱项（与 CLI 同款）：无一次性 state 校验；本次不阻塞

## Design reference

完整时序与 capi 规格见仓库外设计文档：  
`cloudbase/docs/new-oriental-connector-auth-design.html`（或伙伴包内同步副本，若有）。
