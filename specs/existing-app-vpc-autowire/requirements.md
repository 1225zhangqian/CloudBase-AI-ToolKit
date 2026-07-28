# 需求文档

## 介绍

当 AI 将已有代码（如 GitHub 开源项目）部署到 CloudBase 云托管，并依赖 PostgreSQL / MySQL / Redis 等需要内网可达的数据库时，默认未配置 VPC，导致计算实例与数据库网络不通。需要让 AI 在部署前自动识别 DB 依赖并强制处理 VPC 配置，降低手动操作成本。

## 需求

### 需求 1 - 部署前识别数据库网络依赖

**用户故事：** 作为部署已有后端项目的开发者，我希望 AI 在云托管部署前自动发现项目对传统 TCP 数据库的依赖，这样就不会在部署成功后才发现连不上库。

#### 验收标准

1. When 项目或部署环境变量中出现 `DATABASE_URL` / `postgres` / `mysql` / `redis` 等传统连库信号时, the CloudBase AI Toolkit shall 将「需要 VPC 内网连通」判定为部署前置条件。
2. When 判定存在 DB 网络依赖且尚未配置 `serverConfig.VpcConf` 时, the CloudBase AI Toolkit shall 阻止「当作默认成功路径继续」并要求补齐 VPC/子网后再部署，或明确向用户索取/解析 VPC 信息。
3. When 任务使用 CloudBase 原生 PG SDK（`app.rdb()` / HTTP gateway）而非 TCP 直连时, the CloudBase AI Toolkit shall 不强制要求云托管绑定 VPC。

### 需求 2 - Skill 与工具引导覆盖「已有代码上云」场景

**用户故事：** 作为使用 AI 部署非 CloudBase 原生项目的用户，我希望 skill 明确区分「入口访问类型」与「实例出网 VPC」，并给出可执行的默认流程。

#### 验收标准

1. When AI 阅读 `cloudrun-development` skill 时, the skill shall 明确说明：`OpenAccessTypes` 控制外部如何访问服务，`VpcConf` 控制服务如何访问 VPC 内数据库，二者不可混淆。
2. When AI 部署需要 TCP 连库的已有应用时, the skill shall 给出必须设置 `VpcConf` 的部署示例，并指引使用与数据库同地域/同 VPC 的子网及内网连接地址。
3. When 部署后出现数据库连接超时 / `ECONNREFUSED` / 网络不通时, the troubleshooting 文档 shall 将「缺少 VpcConf / 安全组未放通」列为优先排查项。

### 需求 3 - manageCloudRun 对缺 VPC 给出可操作告警

**用户故事：** 作为 AI agent，我希望在调用 `manageCloudRun(action=deploy)` 时，如果环境变量明显含 DB 连接信息却未传 `VpcConf`，工具返回明确告警，而不是静默成功。

#### 验收标准

1. When `EnvParams` 含数据库类连接信息且 `VpcConf` 缺失时, the `manageCloudRun` deploy 响应 shall 包含可机读的 warning（不阻断已触发的部署，但明确告知风险与修复动作）。
2. When schema description 被 AI 读取时, the `VpcConf` / `EnvParams` 字段说明 shall 写明「TCP 访问 VPC 内数据库时必须配置 VpcConf」。
