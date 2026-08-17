# CloudBase MCP v2.28.0

## 🐛 问题修复

### 状态大小写归一化
- `queryCloudRun(action="detail")`：部署记录 `Status` 先 `toLowerCase()` 再匹配 `failed` / `creating`，避免平台返回 `FAILED` / `CREATING` 时漏判
- `queryApps(action="getAppVersion")`：构建状态比较归一化，`failed` / `Failed` / `FAILED` 均可触发构建日志 nextStep
- `manageGateway` 默认域名选取：`Status` 归一化后与 `success` 比较，避免小写 `success` 时误降级选域

### 云托管 / 环境（承接已合入 main 的能力）
- `manageCloudRun(initEnv)`：补齐 `EnvType=tcbr`、可选 VPC、envStatus 大小写、部署 VPC 自动填充、CAM 鉴权引导
- `queryEnv`：新增 metrics 分支（`DescribeCurveData`）

## 📚 文档与元数据

- `@cloudbase/cloudbase-mcp` 版本 bump 至 **2.28.0**
- Skills / guideline `version` 元数据同步至 2.28.0
