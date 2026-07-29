# 需求文档

## 介绍

云托管通过 MCP `manageCloudRun(action=deploy)` 更新服务时，若未传入控制台已配置的 `VpcConf` / `EnvParams` / `OpenAccessTypes` 等字段，可能覆盖或冲掉云端配置。需要：

1. **deploy 路径**：对已存在服务做 Read-Merge-Write，避免少传即抹配置。
2. **独立更新配置路径**：对齐控制台「服务设置」，支持不重新上传代码的配置变更（`SubmitServerConfigChangeDiff`）。

调研交接见 AI-Workspace：`specs/cloudrun-config-only-update/doc/handover.md`。

## 需求

### 需求 1 - Deploy 时保留未传入的云端配置（RMW）

**用户故事：** 作为在控制台配置过 VPC/环境变量后再用 MCP 发版的用户，我希望只更新代码时不会把已有网络与环境变量抹掉。

#### 验收标准

1. While 目标服务已存在, when `manageCloudRun(action=deploy)` 未传入 `serverConfig.VpcConf`, the MCP shall 在提交前合并远程 `ServerConfig.VpcConf`，不得以「缺省」清空或省略导致失去 VPC。
2. While 目标服务已存在, when `manageCloudRun(action=deploy)` 未传入或仅传入部分 `EnvParams` keys, the MCP shall 按 key 合并远程与本地环境变量（本地显式 key 覆盖远程；未提及的远程 key 保留），除非调用方显式要求全量替换。
3. While 目标服务已存在, when `manageCloudRun(action=deploy)` 未传入 `OpenAccessTypes`, the MCP shall 保留远程访问类型，不得无脑覆盖为默认 `OA/PUBLIC/MINIAPP`（若底层 SDK 强制覆盖，MCP 须在合并后显式回填远程值）。
4. When deploy 合并完成后, the MCP shall 在响应中可观测地标明已合并的关键字段（例如 `mergedFromRemote: ["VpcConf","EnvParams"]`），便于排查。
5. When 服务不存在（首次创建）, the MCP shall 不执行远程 merge，行为与现网创建路径一致。

### 需求 2 - 独立 updateConfig 能力

**用户故事：** 作为只想改 VPC、环境变量或扩缩容而不重新传代码的用户，我希望 MCP 提供与控制台「服务设置」同路径的更新配置操作。

#### 验收标准

1. When 调用 `manageCloudRun(action=updateConfig)` 并传入 `serverConfig` 脏字段时, the MCP shall 调用 `tcbr.SubmitServerConfigChangeDiff`（`EnvId` + `ServerName` + `Items`），不要求 `targetPath`，不上传代码包。
2. When 提交 Diff 时, the MCP shall 使用与控制台一致的字段映射（如 `Cpu→CpuSpecs`、`Mem→MemSpecs`、`OpenAccessTypes→AccessTypes`、`EnvParams→EnvParam`）。
3. When `Cpu` 与 `Mem` 仅传其一, the MCP shall 拒绝并提示必须成对提交。
4. When API 返回 `TaskId > 0`, the MCP shall 在响应中返回 `taskId` 与「可能触发基于线上镜像的新版本发布」说明；当 `TaskId` 为 0 或缺失时, shall 标明可能为热更同步完成。
5. When 发生 `ResourceInUse`, the MCP shall 返回可操作的重试建议（服务有进行中任务）。

### 需求 3 - 写后复核

**用户故事：** 作为 Agent，我希望更新后能确认关键配置是否真正生效，而不是只看到「接口成功」。

#### 验收标准

1. When `updateConfig` 成功后, the MCP shall 调用 detail 复核，并在响应中返回当前 `ServerConfig` 中与本次变更相关的字段快照（至少含 `VpcConf` / `EnvParams` 若本次涉及）。
2. When `deploy` 合并了远程 `VpcConf` 后, the MCP shall 在成功响应中回传最终提交使用的 `VpcConf`（或 warning：若 detail 暂时读不到则以提交值为准并提示稍后复核）。
3. When 复核发现本次显式要求的 `VpcConf` 与远程不一致, the MCP shall 给出 warning，而不是静默当作完全成功。

### 需求 4 - Schema / 文档 / 测试

**用户故事：** 作为工具维护者与 Agent，我希望 schema 与测试覆盖新行为，避免回归。

#### 验收标准

1. When schema 更新后, `manageCloudRun.action` shall 包含 `updateConfig` 枚举值，且 description 说明与 deploy 的差异。
2. When 单元测试运行时, RMW 合并逻辑与 Diff 映射 shall 有 focused 测试覆盖。
3. When 变更影响对外工具清单时, shall 更新生成产物（如 `scripts/tools.json`、相关 mcp-tools 文档）与 skill 中云托管配置指引（如有）。
