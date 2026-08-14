# MCP 多地域支持 spec 决策建议

> 日期：2026-08-13
> 承接：`specs/multi-region-refactor/research.md` 第七章 4 个待决策问题
> 输入：阶段①实测复现（`specs/multi-region-refactor/repro/`）+ 调研报告
> 阶段：spec 决策（不落地代码）

---

## 决策问题 1：MCP endpoint 策略 —— 方案 A（统一入口）vs 方案 B（启动时绑定 site）

### 背景回顾

- **方案 A（Supabase 式）**：统一单一 endpoint，靠 `env_id`/`site` 参数由后端路由。用户体验最简，但需要后端提供统一入口，超出 MCP 仓库能力范围。
- **方案 B（Vercel CLI 式）**：MCP 启动时通过"三级回退"解析当前 site/env：环境变量 > 项目级配置文件 > 交互式选择。适合国内/国际站账号体系分离的现状，改动较小。
- 调研报告倾向方案 B，因为 CloudBase 国内/国际站是两套独立账号体系。

### 2026-08-13 实测新增证据

- 国际站新加坡 env `booker-ai-i0gygeljs622ffd23` 对本地国内站凭证不可见（describeEnvs Total=0），国内站与账号体系强绑定。
- 同一国内站环境 `ai-9gra12b5b6a3c966` 用 `ap-singapore` 路由后不可见 —— **国内站已有新加坡地域但 MCP 无法用 region 正确路由**，且方案 A 需要后端支持"按 envId 反查 site"，当前不满足。

### 推荐：方案 B（启动时绑定 site + region）

理由：
1. **现状最匹配**：国内/国际站账号体系独立，OAuth 域名不同，必须由 MCP 侧显式选择 site，无法靠后端统一入口消除。
2. **改动可控**：只需引入 `site` 概念 + 收敛 region 解析 + 数据驱动映射表，不需要后端配合。
3. **演进路径清晰**：未来如果后端提供统一入口，可以在保持 `site`/`region` 抽象不变的前提下切换为方案 A，MCP 侧只需改解析来源。

**边界**：当前阶段不做统一入口（方案 A），但设计上保留 `site` 作为一等公民，避免未来返工。

---

## 决策问题 2：是否引入项目级配置文件 `.cloudbase/project.json`

### 方案对比

| 方案 | 优点 | 缺点 |
|---|---|---|
| **不引入** | 改动最小，仅靠 env 变量 | 每个会话/IDE 都要手动设 `TCB_SITE`/`TCB_REGION`/`TCB_ENV_ID`，体验差；无法"安装即用" |
| **引入 `.cloudbase/project.json`** | 目录→site+envId 映射，一次配置永久生效；对齐 Vercel 的三级回退；AI IDE 场景（Cursor/Claude 按目录打开项目）自动带出正确环境 | 新增配置规范 + 读取逻辑 + 文档 |

### 推荐：引入（当前阶段至少设计好格式与解析优先级）

理由：
1. **对接竞品已验证的模式**：Vercel `.vercel/project.json`、Supabase `config.toml` 都是项目级映射，AI 用户期望"打开项目即连对服务"。
2. **国内站/国际站分离的现实需求**：用户可能同时有国内站项目和国际站项目，仅靠全局 env 无法区分。
3. **优先级链清晰**：CLI flag > 环境变量 > `.cloudbase/project.json` > 全局配置。

**最小可用设计**（本 spec 范围）：
```json
{
  "site": "intl",            // 可选；缺省按 region 反查/显式指定
  "region": "ap-singapore",  // 可选；缺省走 resolveRegion()
  "envId": "booker-ai-i0gygeljs622ffd23"
}
```
- 优先级：`cloudBaseOptions.region/site` > `TCB_SITE`/`TCB_REGION`/`TCB_ENV_ID` > `.cloudbase/project.json` > 全局。
- `.cloudbase/project.json` 建议作为**独立新文件**，不并入 `cloudbaserc.json`（避免语义混杂）。

---

## 决策问题 3：国内站/国际站是否共享同一套凭证体系

### 实测事实

- 本地 auth store `~/.config/.cloudbase/auth.json` 是**单槽**，只有国内站凭证（uin=123811017）。
- 国际站 env 对国内站凭证不可见 —— **两个站点凭证体系不同、endpoint 不同（OAuth 域名）**。
- manager-node SDK 的 API host（`*.tencentcloudapi.com`）两站相同，但 OAuth/登录域名不同：国内站 `tcb.cloud.tencent.com`、国际站 `tcb.tencentcloud.com`。

### 方案对比

| 方案 | 优点 | 缺点 |
|---|---|---|
| 永久两套凭证（现状） | 改动小 | 用户管理两套 token，易混；切换 site 需重新登录 |
| 共享一套凭证 | 体验统一 | 需要腾讯云后端打通两站账号体系，**超出 MCP 仓库能力**，且当前实测证明两站不可互访 |

### 推荐：保持两套凭证，但明确 site 维度

1. **本 spec 不追求打通两站账号**——那是后端/产品决策，MCP 无法独立实现。
2. MCP 侧要做的：**凭证/登录状态按 site 隔离**（见决策 4），避免切换 site 时互相污染。
3. site 抽象只需承载"哪个 OAuth 域名 + 哪套凭证"两个信息，复杂度可控。

---

## 决策问题 4：多 site 凭证并存 —— 切换/存储多套 token

### 现状问题

- `~/.config/.cloudbase/auth.json` 是单槽 credential，`authStore`（toolbox credential.js）全局唯一。
- 用户同时有国内站 + 国际站账号时，**无法并存两套 token**，切换站点需清空重建 → 严重阻碍多地域支持落地。

### 方案对比

| 方案 | 存储结构 | 优点 | 缺点 |
|---|---|---|---|
| A. 按 site 分槽 | auth store 支持 `credential[site]`（如 `credential.domestic` / `credential.intl`），每个 site 独立 token | 多 site 并存、切换零成本；`getLoginState(site)` 按需取 | 需改 auth store 读写逻辑；旧数据迁移 |
| B. 环境变量注入 | `TENCENTCLOUD_SECRETID/KEY`（国内）、新增 `TCB_INTL_SECRETID/KEY`（国际） | 零持久化改动，CI 友好 | 普通用户没有 secret key，且多 site 同时可用性差 |
| C. 独立配置文件 | `.cloudbase/intl.json` 等 per-site 配置 | 清晰 | 新增文件规范 + 读取逻辑 |

### 推荐：方案 A（按 site 分槽）+ B（env 注入）作为补充

1. **主路径 A**：auth store 升级为 `credential[site]` 分槽，`loginByWebAuth({ site })` 时写入对应槽位，`getLoginState({ site })` 时读取对应槽位。国内站槽位兼容现有单槽数据（迁移读取）。
2. **补充路径 B**：环境变量注入方式保留（CI/无头场景），但明确 site 归属（如 `TCB_SITE` 决定当前使用哪套）。
3. **兼容策略**：现有 `auth.json` 数据视为 `credential.domestic` 的旧格式，读时兼容、写时升级。

---

## 决策总结表

| # | 问题 | 决策 | 一句话理由 |
|---|---|---|---|
| 1 | MCP endpoint 策略 | **方案 B**（启动时绑定 site + region，三级回退） | 国内/国际站账号体系独立，统一入口需后端配合，当前不可行 |
| 2 | 项目级配置文件 | **引入** `.cloudbase/project.json` | 对齐 Vercel 三级回退，"打开项目即连对服务" |
| 3 | 凭证体系 | **保持两套**，site 维度隔离 | 实测两站不可互访，打通超出 MCP 能力 |
| 4 | 多 site 凭证并存 | **按 site 分槽** + env 补充 | 解决单槽 auth store 无法并存两套 token 的阻塞问题 |

---

## 附：映射表数据来源

- **国内站地域**：官方文档《地域》https://cloud.tencent.com/document/product/876/51107（当前列 ap-shanghai，广州受限）；manager-node SDK `SUPPORT_REGIONS` 含 `ap-shanghai/ap-guangzhou/ap-singapore`。
- **国际站地域**：国际站控制台 https://tcb.tencentcloud.com（实测 ap-singapore 可用）；后续硅谷/法兰克福等以官方公告为准。
- **site→authHost**：国内站 `tcb.cloud.tencent.com`、国际站 `tcb.tencentcloud.com`（auth.ts:440 已验证）。
