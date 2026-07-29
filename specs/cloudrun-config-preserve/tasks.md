# 实施计划

- [x] 1. 抽取合并与 Diff 工具模块
  - 新增 `mcp/src/tools/cloudrun-config.ts`：`mergeCloudRunServerConfig`、`parseServerConfigToDiffItems`、`assertCpuMemPair`
  - 单测覆盖 VpcConf / EnvParams merge / replaceAll / OpenAccessTypes / Diff 映射
  - _需求: 1, 2, 4_

- [x] 2. deploy 路径接入 RMW
  - 已存在服务：`detail` → merge → 写入 `deployParams.serverConfig`
  - 响应增加 `mergedFromRemote` / 最终 `VpcConf` 摘要
  - _需求: 1, 3_

- [x] 3. 新增 `action=updateConfig`
  - schema 枚举与描述
  - `commonService('tcbr','2022-02-17')` 调 `SubmitServerConfigChangeDiff`
  - 处理空 Items、ResourceInUse、TaskId；detail 复核
  - _需求: 2, 3_

- [x] 4. 文档与生成物
  - 更新 skill `vpc-and-database.md` / cloudrun-development
  - `npm run build:tools-json`（及 tools-doc 如适用）
  - _需求: 4_
