# 需求文档：MCP 多地域支持（site/region 解耦）

> 状态：spec 草案（待确认）
> 日期：2026-08-13
> 承接：`research.md`（7/29 调研）+ 2026-08-13 实测复现（`repro/`）
> 范围：本 spec 只做 site/region 解耦 + 数据驱动映射表 + 迁移影响面，不涉及国际站多地域功能开发（留待后续）

---

## 介绍

CloudBase MCP 当前用 `region === 'ap-singapore'`（`tencent-cloud.ts:8`）硬判"是否国际站"，把 region 与 site 1:1 绑定。国内站现已支持新加坡地域，该实现会把国内站新加坡环境误判为国际站，导致：

1. **NoSQL 工具被错误跳过**（server.ts:63-78 用 `isInternationalRegion` 决定注册）
2. **登录 URL 被错误改写为国际站域名**（auth.ts:440 → `tencentcloud.com`），国内站账号无法登录
3. **前端 UI 隐藏切换账号入口**（env-setup/components.ts:15 硬编码 `ap-singapore`）
4. **region 解析逻辑分散重复 5 处**（cloudbase-manager.ts），新增地域易漂移

本需求引入 **site（国内站/国际站）与 region（地域）解耦** 的数据驱动模型，为"国内站新加坡环境"与未来"国际站多地域"提供正确路由，不改变现有单地域（国内站上海）用户的使用方式。

## 术语

- **site**：站点，取值 `domestic`（国内站，cloud.tencent.com）/ `intl`（国际站，tencentcloud.com）。决定 auth host、登录 URL、账号/凭证体系。
- **region**：地域，如 `ap-shanghai`、`ap-singapore`。决定资源所在地域与 API 路由目标。
- **能力集合（capabilities）**：某 site 在某 region 下可用的后端能力，如是否支持 NoSQL、MySQL、云托管等。

---

## 需求

### 需求 1 - site/region 解耦模型

**用户故事：** 作为用户，当我的环境位于国内站新加坡地域（或国际站新加坡地域）时，MCP 能正确识别环境所属站点并路由到正确的登录页与能力集合。

#### 验收标准

1. 当 `site` 与 `region` 同时被指定且冲突时（如 `site=domestic, region=ap-singapore`），系统应当以 `site` 为准确定登录 URL/凭证，以 `region` 为准确定 API 路由。
2. 当仅指定 `region=ap-singapore` 而未指定 `site` 时，系统应当通过可配置的映射表解析 site；若解析仍不明确，系统应当提示用户显式指定 site，而不是默认按国际站处理。
3. 当仅指定 `site=intl` 而未指定 `region` 时，系统应当使用该 site 的默认地域（如 `ap-singapore`）或提示用户指定。
4. `isInternationalRegion(region)` 单参数布尔判断应当被 `getSite(region, site?)` 取代，且任何调用方不得再依赖"region 即 site"的假设。

### 需求 2 - 数据驱动站点/地域映射表

**用户故事：** 作为维护者，当新增一个地域或站点时，我只需要修改配置数据，而不用修改判定逻辑代码。

#### 验收标准

1. 系统应当维护一个数据驱动的映射表，结构为 `site → { regions[], authHost, apiEndpoint?, defaultRegion }`，国内站与国际站分别维护各自的地域列表。
2. 映射表中的站点信息（authHost、登录 URL 域名）应当替换 `auth.ts` 中硬编码的 `cloud.tencent.com → tencentcloud.com` 替换逻辑。
3. 当某 `region` 在映射表内且不冲突时，`getSite` 应返回确定的 site；当 region 在两个 site 的地域列表中都存在（如 `ap-singapore`），`getSite` 应返回需要显式 site 的"歧义"信号，由上层决定处理。
4. 新增 site/region 时，映射表数据变更后 MCP 应能直接生效，不需要修改 `tencent-cloud.ts` 或其他判断代码。

### 需求 3 - 工具注册按能力集合而非 region 硬判

**用户故事：** 作为使用国内站新加坡环境的用户，我的 NoSQL 数据库工具不应被跳过；作为使用国际站新加坡环境的用户，MCP 不应注册国际站不具备的能力工具。

#### 验收标准

1. NoSQL 工具（`databaseNoSQL.ts`）的注册条件应从 `!isInternationalRegion(region)` 改为按该 site+region 的能力集合（capabilities）判定：当能力集合声明支持 NoSQL 时注册，否则不注册。
2. 能力集合默认值应当与当前行为保持一致：国内站（domestic）默认支持 NoSQL；国际站（intl）默认不支持 NoSQL，除非映射表明确声明。
3. 若 `envQuery` 返回 `RuntimeBackends` 时，系统应当优先使用运行时探测的真实能力覆盖映射表默认值。
4. 映射表变更（如国际站某地域新增 NoSQL）后，无需修改 `server.ts` 的注册逻辑即可生效。

### 需求 4 - region 解析收敛为统一入口

**用户故事：** 作为维护者，当我修改默认地域或新增解析规则时，只需改一处，所有工具调用保持一致。

#### 验收标准

1. 系统应当提供一个统一的 `resolveSiteAndRegion(options)`（或等价）解析入口，取代 `cloudbase-manager.ts` 中分散的 5 处 `?? TCB_REGION ?? 'ap-shanghai'` 逻辑。
2. 解析优先级统一为：显式 `cloudBaseOptions.site/region` > 环境变量 `TCB_SITE`/`TCB_REGION`/`TCB_ENV_ID` > 项目级配置 `.cloudbase/project.json` > 全局默认。
3. 所有工具调用（env、数据库、云函数、存储、capi 等）经该入口获得一致的 site+region，不再各自解析。

### 需求 5 - 登录 URL 与前端按 site 数据化

**用户故事：** 作为国内站新加坡用户，我的登录应回到国内站登录页；作为国际站用户，我的登录应进入国际站登录页，且前端环境设置页不应再硬编码 `ap-singapore`。

#### 验收标准

1. `auth.ts` 的登录 URL 构造应通过映射表查询 site 的 authHost 生成，移除 `url.replace("cloud.tencent.com", "tencentcloud.com")` 硬编码。
2. `env-setup/components.ts` 中 `accountInfo.region !== 'ap-singapore'` 的判断应改为按 site 判定（国际站隐藏切换账号按钮，国内站显示）。
3. 当 site 为 `intl` 时，前端展示"国际站"标识；当 site 为 `domestic` 时展示"国内站"，不再依据 region 字符串推断。

### 需求 6 - 多 site 凭证并存（迁移兼容）

**用户故事：** 作为同时拥有国内站与国际站账号的用户，我可以分别登录两个站点并存两套凭证，切换环境时无需重新登录。

#### 验收标准

1. 认证存储应按 site 分槽（如 `credential.domestic` / `credential.intl`），`loginByWebAuth` 写入当前 site 槽位，`getLoginState` 读取当前 site 槽位。
2. 现有 `auth.json` 单槽数据应视为 `domestic` 旧格式，读取时兼容、首次写回时迁移为分槽格式，不丢数据、不弹错。
3. 当用户切换到另一 site 且该 site 已有凭证时，系统应直接复用而不要求重新登录；当该 site 无凭证时，应引导其完成对应站点的 OAuth 登录。

### 需求 7 - 向后兼容（现有国内站上海用户无感）

**用户故事：** 作为现有用户，升级后我的国内站上海环境不需要任何配置改动即可继续工作。

#### 验收标准

1. 未配置 `site`、`region`、`TCB_SITE`、`TCB_REGION` 时，解析结果应与现状一致：site=domestic、region=ap-shanghai。
2. 仅配置 `TCB_REGION=ap-singapore`（未配置 site）的既有国际站用户，其行为应保持：解析为 intl（与当前一致）。
3. 仅配置 `TCB_REGION=ap-singapore`（未配置 site）的国内站新加坡用户，应通过 `site=domestic` 显式配置获得正确行为；spec 后续在文档中明确该迁移指引。

---

## 非目标（明确不做）

- 不在本 spec 实现国际站多地域（硅谷/法兰克福）功能，映射表为其预留结构即可。
- 不打通国内站/国际站账号体系（决策 3：保持两套凭证）。
- 不引入统一单一 endpoint（决策 1：方案 B，启动时绑定）。
- 不改变现有单地域（国内站 ap-shanghai）用户的默认行为。
