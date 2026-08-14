# 调研：CloudBase AI Toolkit 集成 DeepSeek Harness（DSH）插件是否有价值

- **任务 ID**：`d0373eee`（ato-task:d0373eee-4ae2-4e63-acad-23c43ac86248）
- **日期**：2026-08-14
- **调研人**：Booker（背景提议）｜本报告基于源码/官方文档/社区实测，非记忆推断
- **一句话结论**：✅ **值得做，且当前是窗口期**。推荐**形态 (b) 文档+示例级接入优先、形态 (a) dsh plugin bundle 作为正式产物，两条腿都走**；预估 1-2 天可交付首版。DSH 热度（71K stars / 发布 1.5 天）处于可带来曝光但**尚未被任何云厂商占位**的状态，社区已有 Qwen 通过 MCP client 接入的先例，CloudBase 可作为腾讯云系第一家。

---

## 1. 调研要点速览

| 问题 | 结论 |
|---|---|
| 目标用户会用 DSH 吗？ | ✅ 高度重叠。DSH 用户 = AI coding tools 用户（与 CloudBase AI Toolkit 目标用户同一人群）；DSH 是 DeepSeek 官方 harness，国内热度尤其高 |
| DSH 与 opencode/Claude Code 定位差异？ | DSH = 一切皆插件的 agent harness（Web + headless 双形态），官方主打可观测性/可追踪；opencode/Claude Code 是既有 IDE 级 agent。DSH 是**新增的 MCP 客户端宿主**，不是替代关系 |
| 「有热度」维度 | ✅ 71.4K stars（发布 ~1.5 天）、HN 540+ 分、官方推文 203 万浏览。awesome-dsh-plugin 已收录 176 个插件但**无任何腾讯云/CloudBase**，先发占位窗口存在 |
| 「有用」维度 | ✅ DSH 内置 `@deepseek-ai/dsh-mcp-client`（stdio + streamable-http），CloudBase MCP 的数据库/函数/存储/部署工具可全量接入；Qwen-MM-Plugins 已走通同一模式 |
| 形态选择 | **(b) 文档/示例接入优先 → (a) dsh plugin bundle 作为正式产物**；(c) 纯文档不满足「曝光/有用」诉求，仅作辅助 |

---

## 2. 目标用户与定位差异（价值判断 1）

### 2.1 DSH 用户画像与 CloudBase 重叠度

- DSH 是 DeepSeek 官方 agent harness（GitHub `deepseek-ai/deepseek-harness`），面向「用 AI 写代码的人」，形态是 **Web UI + headless CLI 双一等公民**。
- CloudBase AI Toolkit 的目标用户同样是「AI coding tools 用户」（Cursor / Claude Code / Codex / opencode 等）。**两者用户人群高度重叠**，DSH 用户就是 CloudBase 现成可转化的受众。
- DSH 国内热度尤其突出：中文 KOL 扩散、「梁圣」人设、str_replace_editor 蒸馏争议等话题均以中文社区为主。**腾讯云系产品接入 DSH 有天然的地域/语言契合度**。

### 2.2 DSH 与 opencode / Claude Code 的定位差异

| 维度 | DSH | opencode / Claude Code |
|---|---|---|
| 定位 | DeepSeek 官方 agent harness，「一切皆插件」 | 独立 agent（IDE 级） |
| 形态 | Web UI + headless（官方一等形态） | 终端 / GUI app |
| 插件体系 | cordis patch bundle（`dsh plugin add`） | opencode plugin / Claude Code plugin 规范 |
| MCP | 内置 `@deepseek-ai/dsh-mcp-client`（stdio/streamable-http） | 原生支持 |
| 核心卖点 | 全链路可观测（JSONL 事件流、tool/step/token usage） | 生态成熟、IDE 集成深 |
| 热度 | 发布 1.5 天 71.4K stars（爆发期） | 长期稳定 |

**关键点**：DSH 不是「替换 opencode」，而是**新增一个 MCP 客户端宿主**。CloudBase 现有 Plugin+Skills+MCP 三层集成在 opencode/Claude Code 上已成立，DSH 接入 = 同一套 MCP 资产低成本复用到新宿主，且抢在热度期。

---

## 3. 「有热度」维度：数据与窗口判断

### 3.1 DSH 热度数据（2026-08-14 实测，gh API 认证态）

| 指标 | 值 | 采样时间 |
|---|---|---|
| stars | **71,403**（12.4h 时 41.8K，48h 预测 70-90K 已提前达成） | 08-14 05:53 UTC |
| forks | 6,066 | 同上 |
| HN 主帖 | 540 分 / 43 顶层评论（持续涨分） | 08-14 08:26 北京 |
| 官方推文 | 203 万浏览 / 14.8K likes / 5.5K bookmarks | 08-14 08:23 北京 |
| 生态 | awesome-dsh-plugin **176 个插件**，24h 内涌现 desktop/TUI/market 等 | 08-14 |
| CloudBase-MCP 对比 | 1,068 stars | 08-14 |

> 详见 DSH 仓库 `recheck-48h.md`（任务 ed52d10e 产出）与 `trend.md`。

### 3.2 竞品/社区对标：目前无云厂商占位

- **无任何 CloudBase / 腾讯云 / TCB 相关 DSH 插件**（grep 全仓库 + GitHub code search 均为空）。
- 社区参考先例：**Qwen-MM-Plugins** 已通过 `@deepseek-ai/dsh-mcp-client` 接入 DSH（stdio transport），其文档明确给出 cordis patch 写法——证明「第三方通过 MCP client 接入 DSH」是官方支持、社区已验证的路径。
- 竞品 Supabase / Firebase：GitHub code search 未见 DSH 集成。**目前 BaaS 赛道对 DSH 基本空白**。

### 3.3 窗口判断

- DSH 处于 **release 爆发期**（0.1.0-rc.6），星星还在高位增长；但**生态占位正在快速发生**（176 个插件全在 24h 内冒出）。
- 若 CloudBase 现在做，可作为腾讯云系第一家；拖到 DSH 稳定版/竞争者先占位，曝光价值显著衰减。
- 风险对冲：DSH 版本迭代快（rc.5→rc.6），接口可能变动——所以**先做文档+示例级接入（不锁 API），再评估 plugin bundle**。

---

## 4. 「有用」维度：DSH 的 CloudBase 场景是否成立

### 4.1 DSH 插件机制能否承载 MCP 客户端能力？——✅ 能，且是官方一等能力

- DSH 内置 `@deepseek-ai/dsh-mcp-client`，支持两种 transport：
  - **stdio**：spawn 子进程（如 `npx @cloudbase/cloudbase-mcp`），DSH 负责启停
  - **streamable-http**：连 HTTP URL（如 CloudBase 托管模式 `https://tcb-api.cloud.tencent.com/mcp/v1`）
- 工具以 `mcp__<serverName>__<tool>` 命名注册到 `ctx.tools`，与 Claude Code/Codex 同构。
- 配置方式：`cordis.patch.yml` 插入一个 `@deepseek-ai/dsh-mcp-client` 行（见 §5 示例）。CLI 已随附该包，无需额外安装；**默认不启用**（安全设计：每个 server command 是沙箱外的可信代码）。
- 官方示例 `examples/mcp-memory/` 正是「第三方 MCP server 接入 DSH」的参考实现（stdio + streamable-http 都有）。

### 4.2 CloudBase 场景全量覆盖

| CloudBase 场景 | MCP 工具（现有 @cloudbase/cloudbase-mcp@2.26.0） | DSH 可达性 |
|---|---|---|
| 数据库（NoSQL/PG/MySQL） | `databaseNoSQL` / `databasePG` / `databaseSQL` 工具族 | ✅ stdio 接入即用 |
| 云函数 | `queryFunctions` / `manageFunctions` | ✅ |
| 云存储 | `manageStorage` / `queryStorage` | ✅ |
| 部署（CloudRun/托管） | `manageCloudRun` / `manageApps` / `manageHosting` | ✅ |
| 环境/登录 | `envQuery` / `envSetup`（device-code 登录走本地） | ✅（注意：headless 下登录交互需 API Key，见 §5.4） |

### 4.3 Skills 层：CloudBase Skills 能否复用？

- DSH 有 skill 机制（`dsh-skill-filesystem`），从项目 `.dsh/skills`、`.agents/skills`、`~/.dsh/skills` 等目录加载 SKILL.md（name+description frontmatter 即可）。
- CloudBase 的 29 个 skills 均为 SKILL.md 格式，**格式兼容**（都有 `name`/`description`）。
- 差异：DSH 默认读 `.dsh/skills` / `.agents/skills`，**不读 `.claude/skills`**（DSH 源码 roots() 只含 project `.dsh/skills`、`.agents/skills` 与 user 层）。若要把 skills 带入 DSH，需在 plugin bundle 中把 CloudBase skills 拷贝/链接到 `.dsh/skills`。
- **结论**：Skills 复用可行，但需要一次性的目录映射动作（作为 bundle 的一部分），非零成本。

---

## 5. 集成形态候选与推荐

### 5.1 候选形态对比

| 形态 | 内容 | 成本 | 曝光 | 维护 | 风险 |
|---|---|---|---|---|---|
| **(a) dsh plugin bundle** | 发布一个 `@cloudbase/dsh-...` npm 包（`dsh.bundle` 清单 + `cordis.patch.yml`），内置 cloudbase-mcp 客户端行 + skills 映射 | 中（1-2 天） | 高（`dsh plugin add` 一行安装 + awesome-dsh-plugin 收录） | 中（DSH 版本变动需跟进） | 中（DSH rc 期接口变动） |
| **(b) 复用 cloudbase-mcp-server + MCP 协议** | 用户自己在 DSH cordis.patch.yml 里加 MCP client 行指向 `npx @cloudbase/cloudbase-mcp`；CloudBase 提供文档/示例文件 | 低（0.5-1 天） | 中（文档曝光，无插件市场） | 低（零 CloudBase 侧代码） | 低 |
| **(c) 纯文档/示例** | examples/ 加 DSH 接入教程 | 最低（0.5 天） | 低 | 低 | 低 |

### 5.2 推荐：**(b) 先行 + (a) 作为正式产物**

- **先交付 (b)**：在 `doc/ide-setup/deepseek-harness.mdx` 写接入指南，并在仓库放一个可直接 `dsh web --patch` 的 `cordis.yml` 示例文件（对标 DSH `examples/mcp-memory/` 的写法）。成本 0.5-1 天，零 CloudBase 侧风险，立即吃到「腾讯云第一家文档级接入」。
- **随后升级 (a)**：把示例固化为 `@cloudbase/dsh-plugin`（或 `dsh-cloudbase`）bundle，`dsh plugin --profile web add <pkg>` 一行安装，同步 skills 到 `.dsh/skills`，提交 awesome-dsh-plugin 收录。成本 +1 天。
- (c) 并入 (b)，不单独做。

### 5.3 bundle 的 cordis.patch.yml 核心内容（示例，供方案确认）

```yaml
# cloudbase.cordis.yml —— 挂到 DSH web profile
- insert:
    - id: mcp-cloudbase
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: cloudbase
        transport: stdio
        command: npx
        args: ['-y', '@cloudbase/cloudbase-mcp@latest']
        # 凭据：DSH stdio 桥会过滤凭据形态环境变量，需显式透传
        env:
          CLOUDBASE_API_KEY: !!js process.env.CLOUDBASE_API_KEY
          CLOUDBASE_ENV_ID: !!js process.env.CLOUDBASE_ENV_ID
          TENCENTCLOUD_SECRETID: !!js process.env.TENCENTCLOUD_SECRETID
          TENCENTCLOUD_SECRETKEY: !!js process.env.TENCENTCLOUD_SECRETKEY
          TCB_REGION: !!js process.env.TCB_REGION
          TCB_SITE: !!js process.env.TCB_SITE
```

> 或走托管模式（streamable-http）：`transport: streamable-http` + `url: https://tcb-api.cloud.tencent.com/mcp/v1?env_id=...`，适合无需本地 Node 的场景。

### 5.4 关键实现注意点（踩坑预判）

1. **凭据 scrubbing**：DSH 的 stdio 桥用 `scrubbedParentEnv()` 过滤匹配 `/KEY|PASSWORD|SECRET|TOKEN/i` 的环境变量再启动子进程。CloudBase MCP 的 `TENCENTCLOUD_SECRETKEY`、`CLOUDBASE_API_KEY` 等全中招——**必须在 mcp-client 行 `env` 里显式透传**（示例已含）。这是最容易踩的坑，POC 前必须验证。
2. **headless 下登录**：DSH headless 是无 GUI 进程，CloudBase MCP 的 device-code 登录（浏览器授权）在 headless 下不可交互。**headless 场景必须用 `CLOUDBASE_API_KEY` + `CLOUDBASE_ENV_ID`（或腾讯云密钥）**；Web profile 场景 device-code 登录可用。
3. **DSH 版本锁定**：当前基线 rc.5/rc.6，接口可能变动。文档需标注「以 `@deepseek-ai/dsh@0.1.0-rc.6` 验证」，bundle 依赖需锁版本。
4. **工具数量/上下文**：CloudBase MCP 默认注册 20 个插件（工具较多），DSH 每次请求都会带上全部 tool schema，KV-cache 前缀稳定性受工具集变更影响。可建议 `enable_plugins`/`disable_plugins` 收敛默认工具集。

---

## 6. 工作量与收益预估

### 6.1 工作量

| 阶段 | 内容 | 预估 |
|---|---|---|
| POC 验证 | 在 DSH web profile 实测 cloudbase-mcp stdio 接入 + 凭据 scrubbing 验证 + 一个真实 CloudBase 操作 | 0.5 天 |
| (b) 交付 | `doc/ide-setup/deepseek-harness.mdx` + 示例 cordis.yml + README 支持列表更新 | 0.5 天 |
| (a) 升级 | npm bundle（`dsh.bundle` 清单 + skills 映射 + 文档）+ awesome-dsh-plugin 收录 PR | 1 天 |
| 合计 | | **1-2 天** |

### 6.2 收益

- **曝光**：腾讯云系第一家正式 DSH 接入；DSH 71K stars 爆发期内容易被 awesome-dsh-plugin / dsh-market 收录，直接把 CloudBase 带到 DeepSeek 用户群。
- **有用**：DSH 用户（含中文开发者）多一个可直连的 BaaS；CloudBase MCP 资产零改造复用。
- **沉淀**：为 ATO 内部 DSH headless 后端（POC 已完成，见 `poc-ato-adapter.md`）提供社区侧呼应，反向证明 DSH 生态值得投入。

### 6.3 不做的话（理由与代价）

- 若不做，代价是**错过 DSH 热度窗口期的先发占位**；DSH 生态 24h 内已冒 176 个插件，拖下去会有 Supabase 系或国内竞品先占。
- 但不做也**可接受**（理由）：CloudBase 现有 opencode/Claude Code 集成已覆盖主力用户；DSH 仍是 rc 期，接口变动风险真实存在；若团队精力紧张，可等 DSH 1.0 稳定后再做 bundle，届时只吃「有用」不吃「热度」。

---

## 7. 决策建议

1. **本周内做 POC**（§6.1 第 1 步），重点验证 §5.4 的凭据 scrubbing 与 headless/Web 登录差异——POC 通过则整体可行性坐实。
2. POC 通过后 **按 (b)→(a) 顺序交付**，首版目标 `doc/ide-setup/deepseek-harness.mdx` + 示例 cordis.yml + README 支持列表。
3. (a) 的 bundle 发布与否，**以 POC 实测结果 + DSH rc 稳定性为门槛**；若 DSH 一周内仍 rc，只做 (b)，bundle 延后到 DSH 进入 beta/1.0。
4. 提交 awesome-dsh-plugin 收录 PR，获取生态流量入口。

---

## 8. 数据来源

- DSH 仓库源码/文档：`~/Projects/AI-Workspace/harness_source/deepseek-harness`（`packages/mcp/mcp-client`、`packages/skill/skill-filesystem`、`examples/mcp-memory`、`apps/cli/reference`、`docs/config-catalog.md`）
- DSH 热度复查：`recheck-48h.md`（任务 ed52d10e）、`trend.md`（任务 c3d91376）
- POC 报告：`poc-ato-adapter.md`（任务 399d5b0f，DSH headless + 自定义端点 + JSONL 事件流）
- CloudBase-MCP：`doc/connection-modes.mdx`、`mcp/src/server.ts`、`mcp/src/tools/setup.ts`、`plugin/cloudbase/`
- 社区：awesome-dsh-plugin（176 插件清单）、Qwen-MM-Plugins（DSH 接入先例）、GitHub code search
