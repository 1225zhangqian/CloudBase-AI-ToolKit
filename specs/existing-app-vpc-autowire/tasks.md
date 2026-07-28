# 实施计划

- [x] 1. 需求与设计落盘
  - `specs/existing-app-vpc-autowire/requirements.md`
  - `specs/existing-app-vpc-autowire/design.md`
  - _需求: 1-3_

- [x] 2. CloudRun skill：VPC + 数据库门禁
  - 新增 `references/vpc-and-database.md`
  - 更新 `cloudrun-development/SKILL.md` checklist / deploy 示例 / troubleshooting
  - _需求: 1, 2_

- [x] 3. 交叉文档
  - 更新 `deployment-gate.md` CloudRun / Functions 检查表
  - 更新 PG `troubleshooting.md`
  - 更新 `ops-inspector` 简短排障指引
  - _需求: 2_

- [x] 4. manageCloudRun 告警与 schema
  - 增强 `VpcConf` / `EnvParams` description（禁止猜测 VPC ID）
  - deploy 响应附加 `warnings`（DB 信号且无 VpcConf）
  - 补充单测
  - SDK pin `@cloudbase/manager-node@5.6.4` + create 路径 `vpcInfo` 映射
  - _需求: 3_

- [x] 5. Cloud Functions：skill + schema only（不做 runtime warning）
  - 新增 `cloud-functions/references/vpc-and-tcp-database.md`
  - schema 强调非原生 TCP 必填真实 `vpc`，禁止占位符
  - **有意不做** `createFunction` / `updateFunctionConfig` 的 `MISSING_VPC_FOR_DB_ENV` soft warning（易误报、ROI 低于 CloudRun）
  - _需求: 非原生 SDK 扩展_

- [x] 6. 同步产物
  - sync skill mirrors
  - regenerate tools.json / mcp-tools.md / prompts
  - _需求: 2, 3_
