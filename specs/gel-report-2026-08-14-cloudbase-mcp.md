# 目标演进闭环（GEL）审视报告 2026-08-14 — CloudBase-MCP 项目

> 任务：`57761de9-d8f8-4e24-96ec-388943a6ed9b`（首轮）
> 审视时间：2026-08-14（北京）
> 范围：CloudBase-MCP（project `dab4f6ac`）3 个 project-level goal

## 一、阶段1 盘点

3 个 goal 均为 2026-08-14 新建，无关联任务、progress 空。项目近 30 天任务 94 条（done 45 / cancelled 34 / pending 14 / in_progress 1）。

| goal | id | 近30天任务 | 最近产物实证 | 停滞判断 |
|---|---|---|---|---|
| 功能对齐 CLI 与 Manager SDK | `47644538-fa71-4888-87b3-1bade6510fd6` | 0 关联 | imageUrl 反例已闭合（1a1ba501 done） | 新 goal，差距待补 |
| 市场覆盖：插件市场上架 + 新插件适配 | `db980bd8-1cc3-4b59-9551-1172b2b43d03` | 0 关联 | awesome-mcp 已收录；DSH 调研 done 未落地 | 新 goal，DSH 窗口期 |
| 使用数据表现提升（数据驱动） | `0b2daecd-b2e7-48b6-aadb-de42fa75c16e` | 0 关联 | 灯塔报错率波动未收敛 | 新 goal，top 报错待修 |

## 二、阶段2 差距分析（产物巡检实证）

### 功能对齐 goal：SDK/CLI vs MCP 能力对照

- Manager SDK `@cloudbase/manager-node` cloudrun 模块：`setTraffic`/`promote`/`rollback`/`getDeployRecords`/`getBuildLog`/`getProcessLog`
- tcb CLI：`tcb cloudrun traffic [promote|rollback]`、`tcb cloudrun record`（部署记录）
- MCP `manageCloudRun` action 仅 init/download/run/deploy/delete/createAgent/updateConfig/initEnv；`queryCloudRun` 仅 list/detail/templates/getDeployLog/envStatus
- **缺口：manageCloudRun 缺流量管理（灰度/全量 promote/回滚）与部署记录查询**
- functions 版本发布/灰度/回滚已有 pending f7106baf 覆盖，不重复

### 市场覆盖 goal：各市场收录状态

| 市场 | 状态（curl 实证） |
|---|---|
| awesome-mcp | ✅ 已收录（TencentCloudBase/CloudBase-AI-ToolKit） |
| awesome-dsh-plugin | ❌ 无腾讯云/CloudBase 插件（0 匹配；Qwen 有 MCP client 先例） |
| DSH 接入 | 调研 d0373eee done（结论「值得做、窗口期」），未落地（无 doc/ide-setup/deepseek-harness.mdx、无 bundle、无收录 PR） |
| Cursor / Claude / Grok / Awesome Copilot / CodeBuddy / Qoder | 卡外部 maintainer 审批（非本地能力缺口） |

### 数据表现 goal：灯塔实测（beacon_history.sqlite，2026-08-10~13）

| 工具 | 报错率 | 主要错误 |
|---|---|---|
| downloadRemoteFile | **79.2%** | `不允许的内容类型: application/octet-stream` + `不安全 URL 或目标为内网地址` |
| readNoSqlDatabaseContent | **45.6%** | `[QueryRecords] Read overrun` 读取超限主导（chumeng 环境 100%） |
| writeNoSqlDatabaseContent | 36.4% | — |
| callCloudApi | 26.4% | 用户乱调不存在的 API |

- 全局报错率趋势：08-01~03 ~3.8% → 08-05 峰 27% → 08-10~12 ~18% → 08-13 11.5%（波动未收敛）
- errors 口径：`当前未登录` 124,737 + `已登录未绑定` 25,179 ≈ 15 万次（已有 pending 7d35192b 覆盖 auth 引导，不重复）

## 三、阶段3 衍生任务（derived_confidence=low → 强制人工审批）

| 任务 | goal | priority | id | 要点 |
|---|---|---|---|---|
| manageCloudRun 补齐流量管理与部署记录查询 | 功能对齐 | p1 | `0c24ccc6` | 对齐 tcb cloudrun traffic/record + SDK setTraffic/promote/rollback/getDeployRecords |
| DeepSeek Harness（DSH）适配落地：文档+示例+awesome-dsh-plugin 收录 | 市场覆盖 | p1 | `97411460` | POC 验证（凭据 scrubbing）→ mdx+cordis.yml → 收录 PR |
| downloadRemoteFile 报错率 79% 修复 | 数据表现 | p1 | `4b518a1b` | 内容类型白名单放宽 + 内网 URL 判定优化 + skill 引导 |
| readNoSqlDatabaseContent Read overrun 调优 | 数据表现 | p2 | `f53ad9d6` | 默认 limit 收敛 + 超限可操作建议 |

**被过滤（不建）**：functions 版本/灰度（f7106baf 已覆盖）；auth 引导（7d35192b 已覆盖）；外部市场推进（卡外部 maintainer）。

## 四、阶段4 progress 回写

3 个 goal progress.notes 均已更新（仅写 goals 表，未 PATCH tasks.status）；percent 维持初始（无 done 任务），待衍生任务落地后按验收回写。

## 五、GEL 自评

- 衍生 4 条全部 `derived_confidence=low` → 服务端强制人工审批（未 auto_approve），符合「low 走人工审批」要求。
- 依赖合并：每条均为单任务多阶段（含验证），无跨任务依赖。
- 任务状态禁区：仅写 goals.progress，未 PATCH 任何 tasks.status。

## 六、Booker 需要过目的点

1. **衍生任务 4 条待人工审批**：0c24ccc6（云托管流量/部署记录）、97411460（DSH 落地）、4b518a1b（downloadRemoteFile 修复）、f53ad9d6（readNoSql overrun 调优）。
2. **数据表现 goal 的 top 报错**（downloadRemoteFile 79% / readNoSql 45.6%）是当前 MCP 使用体验最大问题，建议优先批 4b518a1b。
3. **DSH 窗口期**：71K stars 爆发期尚无腾讯云占位，建议尽快批 97411460 抢生态位。
