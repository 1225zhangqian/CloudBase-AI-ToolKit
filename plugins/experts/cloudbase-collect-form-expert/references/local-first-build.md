# 本地优先搭建与部署（收集表 / 报名表）

本包默认按这份规范组织一个收集表应用：**不连云端也能本地跑通、验证通过**，云端只做最后一步部署。
沙箱、离线、只有一台笔记本时，一律按这里交付。

## 一、项目结构（固定）

```text
<project>/
├── cloudbaserc.json              # 声明式配置 v2.1
├── .env / .env.example           # 连接串（真值不入 Git）
├── cloudbase/migrations/         # PostgreSQL 迁移，按文件名顺序执行
│   ├── 20260101120000_init.sql           # forms / submissions 建表
│   └── 20260101120100_rls.sql            # 行级权限
├── functions/
│   ├── api-submit/               # HTTP 函数：填写端提交（匿名可写）
│   │   ├── scf_bootstrap
│   │   └── app.js
│   └── api-admin/                # HTTP 函数：发起端汇总（需登录）
│       ├── scf_bootstrap
│       └── app.js
└── web/                          # 前端：填写页 + 汇总页
    └── dist/
```

- 填写页和汇总页共用一个前端工程，按路由区分，不搞两套脚手架。
- 填写端与发起端**必须是两个函数**：权限边界不同，混在一个函数里迟早放开了不该放开的写权限。

## 二、cloudbaserc.json 模板

```json
{
  "version": "2.1",
  "envId": "your-env-id",
  "functionRoot": "./functions",
  "database": { "type": "postgresql", "migrations": "cloudbase/migrations" },
  "functions": [
    { "name": "api-submit", "type": "HTTP", "handler": "app.main", "runtime": "Nodejs18.15", "timeout": 10, "envVariables": { "DATABASE_URL": "${DATABASE_URL}" } },
    { "name": "api-admin",  "type": "HTTP", "handler": "app.main", "runtime": "Nodejs18.15", "timeout": 15, "envVariables": { "DATABASE_URL": "${DATABASE_URL}" } }
  ],
  "hosting": [
    { "name": "web", "root": "web", "framework": "vite", "outputDir": "dist", "deployPath": "/" }
  ],
  "gateway": {
    "routes": [
      { "path": "/api/submit", "target": "function:api-submit" },
      { "path": "/api/admin", "target": "function:api-admin" },
      { "path": "/", "target": "hosting:web" }
    ]
  }
}
```

## 三、两张表怎么建（迁移文件）

`20260101120000_init.sql`：

```sql
CREATE TABLE IF NOT EXISTS forms (
  id           bigserial PRIMARY KEY,
  title        text NOT NULL,
  fields       jsonb NOT NULL,              -- 字段定义：名称/类型/必填/选项
  quota        integer,                     -- 名额上限，null 表示不限
  closed_at    timestamptz,                 -- 截止时间
  owner_id     text NOT NULL,               -- 发起人身份（登录后写入）
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id           bigserial PRIMARY KEY,
  form_id      bigint NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  answers      jsonb NOT NULL,
  submitter    text,                        -- 免登录时为空；实名场景写登录身份
  dedup_key    text,                        -- 防重复：手机号 / 登录 id 的哈希
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, dedup_key)               -- 一人一次靠数据库约束，不靠前端
);

CREATE INDEX IF NOT EXISTS idx_submissions_form ON submissions (form_id, created_at DESC);
```

`20260101120100_rls.sql`：权限在库里表达，不在代码里判断。

```sql
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY submissions_insert_anon ON submissions FOR INSERT WITH CHECK (true);
CREATE POLICY submissions_read_owner ON submissions FOR SELECT
  USING (form_id IN (SELECT id FROM forms WHERE owner_id = current_setting('app.user_id', true)));
```

要点：

- **防重复用唯一约束**，`dedup_key` 在写入前算好；前端提示只是体验，不是防线。
- 免费额度 / 名额上限要在写库时判断，不能只在汇总页显示"还剩 3 个"。
- RLS 只放在需要隔离的表上；填写端匿名插入是刻意放开的，要单独一条策略说明它为什么安全。

## 四、本地跑起来（不需要云）

```bash
# 1. 数据库
docker run -d --name cb-pg -p 5432:5432 -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=appdb postgres:16
export DATABASE_URL="postgres://postgres:devpass@127.0.0.1:5432/appdb"

# 2. 迁移（顺序执行 + 重复执行验证幂等）
for f in $(ls cloudbase/migrations/*.sql | sort); do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || break; done

# 3. 两个函数本地起（HTTP 函数就是监听端口的服务）
(cd functions/api-submit && PORT=8787 DATABASE_URL="$DATABASE_URL" bash scf_bootstrap) &
(cd functions/api-admin  && PORT=8788 DATABASE_URL="$DATABASE_URL" bash scf_bootstrap) &

# 4. 前端
cd web && npm i && npm run dev        # 5173
```

`web/.env.development`：

```bash
VITE_API_SUBMIT=http://127.0.0.1:8787
VITE_API_ADMIN=http://127.0.0.1:8788
```

`web/.env.production` 用网关相对路径 `/api/submit`、`/api/admin`，前端代码不为环境分叉。

本地验证清单（跑三遍再交付）：

```bash
curl -s -XPOST localhost:8787/submit -d '{"formId":1,"answers":{"name":"测试"},"dedupKey":"t1"}' -H 'content-type: application/json'
curl -s -XPOST localhost:8787/submit -d '{"formId":1,"answers":{"name":"测试"},"dedupKey":"t1"}' -H 'content-type: application/json'   # 期望被唯一约束挡下
curl -s localhost:8788/summary?formId=1
```

## 五、上云（走 CloudBase 连接器的 MCP）

部署通过连接器的三个 MCP 工具完成，顺序固定：

| 顺序 | 工具 | 作用 |
|---|---|---|
| 1 | `deployBuild` | 本地构建 `web/` 产物到 `web/dist`（配了 `buildCommand` 时必须先跑） |
| 2 | `deployPlan` | **只读预演**：输出迁移计划与字段级变更，不改云端 |
| 3 | `deployApply` | 按 `database → functions → hosting → gateway` 执行 |

调用要点：

- 三个工具都传 `cwd`（`cloudbaserc.json` 所在目录）；`deployPlan` / `deployApply` 可再传 `envId`、`only` / `skip`。
- 迁移是本项目的风险点：先 `deployPlan` 确认「会新建哪几个表 / 哪个迁移冲突」，再 `deployApply`。`database` 失败会强制中断整个部署。
- 只改函数（比如加了个字段校验）可以直接 `deployApply { only: ["functions"] }`，不必重建前端。

连接器不可用（沙箱、离线）时的等价 CLI 命令，仅作兜底：

```bash
npx -p @cloudbase/cli tcb validate
npx -p @cloudbase/cli tcb app build
npx -p @cloudbase/cli tcb deploy --dry-run
npx -p @cloudbase/cli tcb deploy
```

`deployPlan` / `--dry-run` 是部署变更预览，不是页面预览；页面预览用本地 dev server（第四节第 4 步）。

上线后必须真做一遍：**手机扫码 → 提交一条 → 汇总页看到这条**。填的是测试数据，交付前删掉。

## 六、本地产物 vs 必须上云

| 项 | 本地可验证 | 必须上云 |
|---|---|---|
| 建表 / 唯一约束 / 索引 | ✅ psql | 迁移冲突中断 |
| 匿名插入 + RLS 隔离 | ✅ 本地 PG 同样支持 RLS | 平台鉴权上下文 |
| 提交接口幂等、错误码 | ✅ curl | 网关路由 |
| 页面与移动端适配 | ✅ `npm run dev` / `vite preview` | 静态托管路径 |
| 二维码 | ❌ 本地只有链接 | ✅ 域名 + 二维码 |
| 真实并发与配额 | ❌ | ✅ |

交付话术：「本地已验证提交、防重复、汇总查询；二维码和真实域名要上云才有」。

## 七、常见坑

1. **迁移文件名不是 14 位时间戳**（`20260101120000_init.sql`）→ 不执行。
2. **防重复只写在前端** → 换个浏览器就绕过；必须落到唯一约束。
3. **匿名插入放开了整表权限** → 顺手把 SELECT/UPDATE 也放开；只放 INSERT。
4. **端口写死** → 云端注入的 `PORT` 被忽略，服务起来了但打不开。
5. **汇总页把 `owner_id` 判断放在前端** → 改个参数就能看别人表单；必须进 RLS 或服务端校验。
6. **`gateway.routes` 用非白名单字段**（如 `cdnType`）→ 配置校验失败，CDN 用 `accessType`。
7. **部署不代做静态托管构建** → 配了 `buildCommand` 必须先 `deployBuild`，否则 `deployApply` 报产物缺失。
8. **连接串写进 cloudbaserc.json** → 入库即泄漏；用 `${DATABASE_URL}` 占位 + `.env`。

## 八、什么时候可以简化

- 一二十人的小范围收集、只要一天：可以只给单页 + 云函数，不必铺全套。
- 一旦涉及名单、手机号、收款、要长期用：按上面的结构建，字段和权限都要能被下一个人接手。
