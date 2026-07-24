# Requirements Document

## Introduction

CloudBase MCP 的网关能力当前是双轨：`createAccess` / `getAccess` / `deleteAccess` / `updatePathAuth` / 旧域名列表仍走 Manager SDK `access.*`（底层 `CreateCloudBaseGWAPI` 等已废弃云 API），而 `createRoute` / `updateRoute` / `deleteRoute` / `bindCustomDomain` 等已走 `env.*HttpServiceRoute` 新 Domain/Route 模型。

本需求将 MCP 网关读写路径 **彻底切到新 Domain/Route 模型**：从 schema 移除旧 action，统一以 Domain + Path 为主键，上游类型使用字符串枚举（`SCF` / `WEB_SCF` / `CBR` / `STATIC_STORE` / `LH`）。MCP 直接调用 Manager SDK 的 `env.describeHttpServiceRoute` / `createHttpServiceRoute` / `modifyHttpServiceRoute` / `deleteHttpServiceRoute` / `bindCustomDomain` / `deleteCustomDomain`，**不依赖** 也不封装已废弃的 `access.*` 模块。

破坏性变更需配套完整迁移说明，并同步清理 skill、函数创建引导、工具文档与仓库内测试中的旧 API / Plan B 写法。

### Confirmed decisions

1. **旧 action**：从 MCP schema **直接移除**（选项 A），不再作为成功路径，也不做“仅返回迁移错误”的兼容接收。
2. **对外主入口**：以 Domain/Route action 为准（见需求 2）。
3. **影响面**：MCP 实现 + 单测、`functions.ts` 引导、`config/source/skills/**`、`doc/mcp-tools.md` / prompts 生成、仓库内集成/STS 用例一并切换；仓外评测只提供迁移说明。
4. **SDK**：不等待 / 不依赖 Manager SDK 对 `access` 的 facade 或 `@deprecated` 改造；MCP 只调 `env.*` 新接口。

### Out of scope

- 向 `@cloudbase/manager-node` 提交废弃 `access` 的 PR（仅在设计/任务总结中记录为后续事项）。
- 修改仓外评测 runner / grader。
- 通过 `callCloudApi` 重新开放旧 GWAPI（评测黑名单保持禁止）。

---

## Requirements

### Requirement 1 - 移除旧网关 action（破坏性切换）

**用户故事：** 作为 MCP 维护者，我希望工具 schema 不再暴露已废弃 GWAPI 语义的 action，避免 Agent 继续走旧数据面。

#### 验收标准

1. When 调用方检查 `manageGateway` 的 `action` 枚举时，the MCP shall 仅包含：`createRoute`、`updateRoute`、`deleteRoute`、`bindCustomDomain`、`deleteCustomDomain`（及本需求明确保留/新增且属于新模型的写 action，若有）。
2. When 调用方检查 `queryGateway` 的 `action` 枚举时，the MCP shall 仅包含新模型只读 action：至少包括 `listRoutes`、`getRoute`、`listCustomDomains`；shall **不** 再包含 `getAccess`。
3. When Agent 仍传入已移除的 `createAccess` / `deleteAccess` / `getAccess` / `updatePathAuth`（以及若移除的旧 `listDomains`）时，the MCP / 宿主 schema 校验 shall 拒绝该调用（非法 enum），而不是静默落到旧 `access.*` 实现。
4. While 本需求落地后，when MCP 执行任一保留的网关读写 action 时，the 实现 shall **不** 调用 `cloudbase.access.*`（含 `createAccess`、`getAccessList`、`deleteAccess`、`switchPathAuth`、`getDomainList`、`addCustomDomain`、`deleteCustomDomain`）。

### Requirement 2 - 统一 Domain/Route 对外语义

**用户故事：** 作为使用 CloudBase MCP 的 Agent，我希望用一套与 CLI（`tcb domains` / `tcb routes`）和 Manager 文档一致的 Domain/Route 语义完成查询与配置。

#### 验收标准

1. When 需要在环境默认 HTTP 域名上为云函数补访问入口时，the Agent shall 使用 `manageGateway(action="createRoute")`；while 未显式传 `domain` 时，the MCP shall 通过 `describeHttpServiceRoute` 解析 `IsDefault === true` 的域名并在其上创建路由。
2. When 需要在指定自定义域名上创建/修改/删除路由时，the Agent shall 使用 `createRoute` / `updateRoute` / `deleteRoute` 并显式提供 `domain`（或等价 route 载荷中的 Domain）。
3. When 查询某函数或某路径的访问入口时，the Agent shall 使用 `queryGateway(action="getRoute")`（可按 `targetName` / `path` / `domain` / `routeId` 定位），而不是 `getAccess`。
4. When 列出路由或自定义域名时，the Agent shall 使用 `listRoutes` / `listCustomDomains`（域名信息来自 `describeHttpServiceRoute` 结果，而不是 `DescribeCloudBaseGWService`）。
5. When 更新路径鉴权时，the Agent shall 使用 `updateRoute` 并设置与 `EnableAuth` 对应的参数，而不是 `updatePathAuth`。
6. When 删除访问入口时，the Agent shall 使用 `deleteRoute`，主键为 `Domain + Path`，而不是 `accessId` / `APIId`。
7. When 绑定或删除自定义域名时，the MCP shall 继续通过 `bindCustomDomain` / `deleteCustomDomain` 调用 `env.bindCustomDomain` / `env.deleteCustomDomain`。

### Requirement 3 - 默认域名解析与错误提示

**用户故事：** 作为 Agent，我在不传 Domain 时仍能稳定落到环境默认 HTTP 域名；失败时能看到可执行的修复指引。

#### 验收标准

1. When `createRoute` / `updateRoute` / `deleteRoute` / `getRoute` 需要默认域名且调用方未提供 `domain` 时，the MCP shall 使用 `describeHttpServiceRoute` 返回的 `Domains` 中满足 `IsDefault === true`（且可用，例如已启用）的 `Domain` 字段。
2. When 解析默认域名时，the MCP shall **不** 将 `OriginDomain`（回源域名）作为公网默认落点域名。
3. When 环境无可用默认域名（未开通、列表为空、无 `IsDefault`、或默认域名不可用）时，the MCP shall 返回明确错误，说明需开通 HTTP 访问服务 / 在控制台确认默认域名，或改为显式传入 `domain` 后重试。
4. When 默认域名解析成功并创建路由后，the 成功响应 shall 包含实际使用的 `domain`，便于 Agent 组装访问 URL。

### Requirement 4 - 上游类型映射（Event / HTTP / 扩展类型）

**用户故事：** 作为 Agent，我希望用清晰的函数类型或上游枚举创建正确路由，避免 HTTP 与 Event 函数互相误标。

#### 验收标准

1. When 为 Event 云函数创建路由且使用兼容快捷字段 `type="Event"`（或等价显式 `UpstreamResourceType=SCF`）时，the MCP shall 将上游类型设为 `SCF`。
2. When 为 HTTP / Web 云函数创建路由且使用 `type="HTTP"`（或等价显式 `UpstreamResourceType=WEB_SCF`）时，the MCP shall 将上游类型设为 `WEB_SCF`。
3. When `createRoute` 的 schema 描述固定可选上游类型时，the MCP shall 使用枚举（如 `SCF` / `WEB_SCF` / `CBR` / `STATIC_STORE` / `LH`），而不是仅用自由字符串 + 文字说明。
4. When HTTP 函数被错误标为 `SCF`，或 Event 函数被错误标为 `WEB_SCF` 时，the 文档与工具描述 shall 明确警示该误用会导致访问失败（例如 `FUNCTION_PARAM_INVALID` 或网关内部错误）。
5. While `targetType="function"` 且未提供可解析的 `type` / `UpstreamResourceType` 时，when 创建函数路由，the MCP shall 拒绝请求并提示必须显式区分 Event（`SCF`）与 HTTP（`WEB_SCF`），不得默认当成 Event/`SCF` 静默成功。

### Requirement 5 - 查询与写路径全部走新接口

**用户故事：** 作为平台用户，我希望查询到的入口与写入的路由来自同一 Domain/Route 数据面，避免新旧列表不一致。

#### 验收标准

1. When 执行 `listRoutes` / `getRoute` / `listCustomDomains` 时，the MCP shall 仅基于 `env.describeHttpServiceRoute`（及新模型字段）组装结果。
2. When 执行 `createRoute` / `updateRoute` / `deleteRoute` 时，the MCP shall 分别调用 `env.createHttpServiceRoute` / `modifyHttpServiceRoute` / `deleteHttpServiceRoute`。
3. When `getRoute` 按函数名查询时，the MCP shall 返回匹配的 Domain、Path、UpstreamResourceType、UpstreamResourceName、EnableAuth 及可拼装的访问 URL（基于实际 Domain + Path）。
4. When 路由创建成功时，the 响应 message shall 继续提示路由传播可能需要等待（例如 30 秒到 3 分钟），且 shall 说明网关鉴权不等于函数安全规则，必要时引导 `queryPermissions` / `managePermissions`。

### Requirement 6 - Skill、引导文案与文档迁移

**用户故事：** 作为 Agent 作者 / 终端用户，我希望公开 skill 与 MCP 文档只推荐新 Domain/Route 路径，不再把旧 GWAPI 当作 Plan B。

#### 验收标准

1. When 更新 `config/source/skills/cloud-functions`（及由其生成/镜像的兼容产物源）时，the 文档 shall 将补默认域名入口的推荐写法改为 `manageGateway(action="createRoute", ...)`，并给出 `type` / `UpstreamResourceType` 映射说明。
2. When 扫描 skill / references 时，the 仓库源文档 shall **不** 再将 `CreateCloudBaseGWAPI` / `DescribeCloudBaseGWAPI` / `callCloudApi` 旧 GWAPI 写为推荐路径或 Plan B。
3. When `manageFunctions` 创建 HTTP 函数后的 `nextActions` / message 引导访问入口时，the 文案 shall 指向 `createRoute`（含显式 HTTP → `WEB_SCF` / `type="HTTP"` 要求），而不是 `createAccess`。
4. When 本需求合并前，the 维护者 shall 重新生成受影响的对外 prompts / `doc/mcp-tools.md`（按项目既有生成脚本），使公开文档与 schema 一致。
5. When CLI skill 已描述 `tcb routes` / `tcb domains` 时，the MCP 文档语义 shall 与之对齐（Domain 一等公民、上游字符串枚举、主键 Domain + Path）。

### Requirement 7 - 测试、回归与迁移说明

**用户故事：** 作为维护者，我希望破坏性变更有单测与回归覆盖，并向依赖方提供明确迁移说明。

#### 验收标准

1. When 网关单测运行时，the 测试 shall 覆盖：默认域名解析（`IsDefault`）、`Event→SCF`、`HTTP→WEB_SCF`、缺少类型时拒绝、`createRoute`/`updateRoute`/`deleteRoute`/`getRoute` 的 SDK 调用参数、默认域名缺失时的错误文案；shall **不** 再断言 `access.createAccess` 等旧调用。
2. When 仓库内集成 / STS 等用例仍覆盖网关时，the 用例 shall 改用新 action 与参数。
3. When 本需求交付时，the spec 或 PR 说明 shall 包含面向 Agent/skill 作者的迁移表：旧 action → 新 action、旧 `type` → 新 `UpstreamResourceType`、旧 `accessId` → `Domain+Path`。
4. When 评测模式仍启用 `callCloudApi` 黑名单时，the 旧 GWAPI Action 屏蔽列表 shall 保持禁止（不回退）。

### Requirement 8 - 安全与权限边界保持

**用户故事：** 作为终端用户，我不希望网关迁移误放开或混淆函数资源权限。

#### 验收标准

1. When 创建或更新路由时，the MCP shall 仅配置网关侧 `EnableAuth`（若调用方提供），shall **不** 自动修改函数资源安全规则。
2. When 成功创建面向浏览器/匿名访问的路由后，the nextActions shall 仍引导检查/按需更新函数权限（`queryPermissions` / `managePermissions`）。
3. When 文档区分安全域名（CORS）与自定义域名（HTTPS + 证书）时，the 既有边界 shall 保持：`envDomainManagement` ≠ `manageGateway(bindCustomDomain)`。
