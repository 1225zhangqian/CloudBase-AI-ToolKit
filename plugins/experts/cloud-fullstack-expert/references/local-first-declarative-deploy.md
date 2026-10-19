# 本地优先开发 + 声明式部署（CloudBase CLI v2.1）

本包默认按这份规范组织项目。目的是：**不连云端也能把应用跑起来、验证通过**，云端只做最后一步部署。
沙箱、离线、只有一台笔记本的场合，都按这份文档交付。

## 一、项目结构（固定，不要自创）

```text
<project>/
├── cloudbaserc.json              # 声明式配置 v2.1，唯一契约
├── .env                          # 真实连接串等密钥（不入 Git）
├── .env.example                  # 占位模板（入 Git）
├── cloudbase/migrations/         # PostgreSQL 迁移，按文件名顺序执行
│   ├── 20260101120000_init.sql
│   └── 20260102150000_add_index.sql
├── functions/                    # functionRoot 默认 ./functions
│   ├── api-server/               # HTTP 函数（对外 API）
│   │   ├── scf_bootstrap         # 启动脚本，监听 $PORT
│   │   └── app.js
│   └── task-runner/              # Event 函数（定时/内部任务）
│       └── index.js              # exports.main(event, context)
├── web/                          # 前端源码（hosting[].root）
│   └── dist/                     # 构建产物，deployBuild 生成
└── Dockerfile                    # 仅容器形态需要，放函数目录内
```

三条硬约定：

1. **数据库只认 PostgreSQL**，迁移文件放 `cloudbase/migrations/`，文件名 `14位时间戳_小写名称.sql`（如 `20260101120000_init.sql`）。
2. **对外接口只走 `functions/` 下的 HTTP 函数**，前端不直连数据库；本地与云端是同一份 handler 代码，只有连接串不同。
3. **前端产物进 `web/dist`**，静态托管只上传产物，不在云上跑构建。

## 二、cloudbaserc.json 模板

```json
{
  "version": "2.1",
  "envId": "your-env-id",
  "functionRoot": "./functions",
  "database": {
    "type": "postgresql",
    "migrations": "cloudbase/migrations"
  },
  "functions": [
    {
      "name": "api-server",
      "type": "HTTP",
      "handler": "app.main",
      "runtime": "Nodejs18.15",
      "timeout": 15,
      "memorySize": 512,
      "envVariables": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    },
    {
      "name": "task-runner",
      "type": "Event",
      "handler": "index.main",
      "timeout": 60,
      "memorySize": 256
    }
  ],
  "hosting": [
    {
      "name": "web",
      "root": "web",
      "framework": "vite",
      "outputDir": "dist",
      "deployPath": "/"
    }
  ],
  "gateway": {
    "routes": [
      { "path": "/api", "target": "function:api-server" },
      { "path": "/", "target": "hosting:web" }
    ]
  }
}
```

要点：

- `envId` 本地开发可以先留占位，只跑本地时用不到；真正部署前替换。
- `gateway.routes` 的 `target` 只接受 `function:<name>` 与 `hosting:<name>`；**字段是白名单**，写 `cdnType` 之类会校验失败，CDN 用 `accessType`（`DIRECT` / `CDN` / `CUSTOM` / `EO`）。
- `envVariables` 里**写占位符**，真实值放 `.env`，部署时用 `--mode` 合并。

## 三、本地跑起来（不需要云环境）

### 3.1 数据库：本地 PostgreSQL

```bash
docker run -d --name cb-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=appdb postgres:16
export DATABASE_URL="postgres://postgres:devpass@127.0.0.1:5432/appdb"
```

按文件名顺序执行迁移，验证 SQL 语法与幂等：

```bash
for f in $(ls cloudbase/migrations/*.sql | sort); do
  echo "== $f"; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || break
done
```

**本地跑通 = 迁移能在空库上一次跑完，且重复执行不报错**（用 `CREATE TABLE IF NOT EXISTS`、`CREATE INDEX IF NOT EXISTS`）。

### 3.2 HTTP 函数：本地直接起服务

HTTP 函数本质是一个监听端口的 HTTP 服务，`scf_bootstrap` 是启动脚本：

```bash
#!/bin/bash
set -e
exec node app.js
```

`app.js` 里读 `process.env.PORT`（本地给一个，云端由平台注入）：

```js
const http = require("http");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const server = http.createServer(async (req, res) => {
  if (req.url === "/api/health") {
    const r = await pool.query("select 1 as ok");
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(r.rows[0]));
  }
  res.writeHead(404).end();
});
server.listen(process.env.PORT || 8787);
```

本地起：

```bash
cd functions/api-server && npm i && PORT=8787 DATABASE_URL="$DATABASE_URL" bash scf_bootstrap
curl -s localhost:8787/api/health        # 期望 {"ok":1}
```

**同一份 `app.js` 直接部署上云**，不要在本地和云端写两套接口。

### 3.3 Event 函数：本地调一次 handler

```bash
node -e "require('./functions/task-runner').main({},{},).then(r=>console.log(r))"
```

入参出参加断言，别等上云才发现结构不对。

### 3.4 前端：Vite dev server

```bash
cd web && npm i && npm run dev          # 默认 5173
```

开发期通过环境变量指向本地 API，**不写死域名**：

```js
// web/.env.development
VITE_API_BASE=http://127.0.0.1:8787/api
// web/.env.production
VITE_API_BASE=/api
```

上线后走网关 `/api` 路由，前端代码不用改。

## 四、上云（走 CloudBase 连接器的 MCP，不要求用户装 CLI）

部署一律通过连接器提供的三个 MCP 工具完成，顺序固定：

| 顺序 | 工具 | 作用 | 对应 CLI |
|---|---|---|---|
| 1 | `deployBuild` | 本地构建 `hosting[]` 产物到 `outputDir`（无 hosting 项会直接跳过） | `tcb app build` |
| 2 | `deployPlan` | **只读预演**：输出字段级变更计划与迁移计划，不改云端 | `tcb deploy --dry-run` |
| 3 | `deployApply` | 按 `database → functions → app → hosting → gateway` 编排执行 | `tcb deploy` |

调用要点：

- 三个工具都接受 `cwd`（项目根，= `cloudbaserc.json` 所在目录）与 `mode`（对应 `envOverrides` + `.env.<mode>`）；`deployPlan` / `deployApply` 还可传 `envId`、`only` / `skip`（`database` / `functions` / `app` / `hosting` / `gateway`）。
- **必须先把 `cloudbaserc.json` 放到项目根**，配置不合法时 MCP 会直接返回校验错误，先用 `deployPlan` 把错误暴露出来。
- `deployPlan` 是只读的，可以放心多跑几次；确认计划符合预期再 `deployApply`。
- 已存在的函数默认要确认覆盖；自动化场景传 `yes`。`database` 失败会强制中断整个部署，所以计划里先看迁移。
- 构建与部署分离：改了前端先 `deployBuild` 再 `deployApply`；只改函数可以直接 `deployApply --only functions`。

连接器不可用（沙箱、离线）时的等价 CLI 命令，仅作兜底，不作为默认路径：

```bash
npx -p @cloudbase/cli tcb validate
npx -p @cloudbase/cli tcb app build
npx -p @cloudbase/cli tcb deploy --dry-run
npx -p @cloudbase/cli tcb deploy
```

> `deployPlan` / `--dry-run` 是**部署变更预览**（terraform plan 那种），不是页面预览。页面预览靠本地 dev server（第三节 3.4）。

补充规则：

- `database` 失败**强制中断**整个部署（其余资源可能依赖新 Schema），所以先 `deployPlan` 看迁移计划。
- 配了 `buildCommand` 但产物不存在时，`deployApply` 会报错——先 `deployBuild`。
- 只改前端：`deployBuild` → `deployApply { only: ["hosting"] }`；只改函数：`deployApply { only: ["functions"] }`。
- 想确认网关路由字段是否合法，用 `deployPlan` 跑一遍，字段白名单错误在这一步就会暴露。

## 五、本地已验证 / 必须上云才能验（交付时说清）

| 项 | 本地可验证 | 必须上云 |
|---|---|---|
| 迁移 SQL 语法与幂等 | ✅ psql 顺序执行 | 迁移冲突（同名已存在会中断） |
| 接口入参出参、错误码 | ✅ curl | 网关路由与鉴权 |
| 前端构建与页面 | ✅ `npm run dev` / `vite preview` | 静态托管路径、CDN、域名 |
| 数据库读写 | ✅ 本地 PG | RLS、内网/公网连通性、连接池规格 |
| 定时触发 | ⚠️ 只能手动调用 | 触发器配置与超时 |
| 真实资源用量与计费 | ❌ | ✅ |

交付话术：**「本地这 6 项已验证，剩下 3 项要上云才算数」**，不要笼统说"已完成"。

## 六、常见坑

1. **迁移文件名不是 14 位时间戳** → 不执行或被跳过；按 `20260101120000_init.sql` 这种格式写。
2. **HTTP 非 Node 运行时（Python / Java / Go / PHP）依赖要本地装好**再打包上传，云端不会帮你装。
3. **`scf_bootstrap` 漏了 `exec`** → 进程收到信号不退出，健康检查异常。
4. **端口写死 3000/8080** → 平台注入的 `PORT` 被忽略，服务"起来了但打不开"。
5. **迁移里混入删表 / 改列** → 生产环境不可回滚；破坏性变更单独一个迁移文件并在交付说明里点名。
6. **`gateway.routes` 加了非白名单字段** → `should NOT have additional properties`，删掉即可。
7. **环境变量写进 cloudbaserc.json 真值** → 入库即泄漏；一律 `${VAR}` 占位 + `.env`。

## 七、什么时候可以不用这套

- 一次性脚本、几十行的小工具：直接给单文件 + 运行命令，不必铺项目结构。
- 用户明确只要方案不要落地：给结构图 + 关键代码 + 上面第三节的本地命令，让他自己跑。
- 但当用户说要"上线""能访问""给别人用"，就必须按这套结构建，否则第二次改动必翻车。
