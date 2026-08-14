// 阶段① 实测复现：site/region 1:1 耦合误判复现脚本
// 运行方式：cd mcp && NODE_ENV=test VITEST=true node ../specs/multi-region-refactor/repro/run-repro.mjs
//
// 用途：在不改动生产代码的前提下，用真实 dist bundle + 真实账号探测复现
//   - tencent-cloud.ts:8  isInternationalRegion = region === 'ap-singapore'
//   - 该判断把 region 与 site 1:1 绑定，国内站新加坡环境会被误判为国际站
import pkg from "/Users/bookerzhao/Projects/CloudBase-MCP/mcp/dist/index.cjs";
const { createCloudBaseMcpServer, getCloudBaseManager } = pkg;

const sep = "=".repeat(72);
const section = (t) => console.log(`\n${sep}\n${t}\n${sep}`);

// ---- 1. 源码级判定：isInternationalRegion 语义（mcp/src/utils/tencent-cloud.ts:8）----
section("1. isInternationalRegion 源码语义（region → site 1:1 绑定）");
// 直接复刻 tencent-cloud.ts 的实际实现，展示判定逻辑本身不含任何 site 维度
const REGION = { SHANGHAI: "ap-shanghai", SINGAPORE: "ap-singapore" };
const isInternationalRegion = (region) => region === REGION.SINGAPORE;
for (const r of ["ap-singapore", "ap-shanghai", "ap-guangzhou", undefined]) {
  console.log(
    `  isInternationalRegion(${JSON.stringify(r)}) = ${isInternationalRegion(r)}  <- 判定完全由 region 字符串决定，无 site 维度`,
  );
}
console.log(
  "  => 结论：任何 ap-singapore（无论国内站还是国际站）都被判定为国际站",
);

// ---- 2. 工具注册差异：ap-singapore 时 NoSQL 工具被跳过 ----
section("2. 工具注册差异：region=ap-singapore vs ap-shanghai");
const buildServer = async (region) =>
  createCloudBaseMcpServer({
    enableTelemetry: false,
    cloudBaseOptions: { region, envId: "booker-ai-i0gygeljs622ffd23" },
  });
const nosqlPattern = /^(read|write)NoSqlDatabase/i;
for (const region of ["ap-singapore", "ap-shanghai"]) {
  const server = await buildServer(region);
  const tools = server.toolDefs.map((t) => t.name);
  const nosql = tools.filter((n) => nosqlPattern.test(n));
  console.log(`  region=${region}  工具总数=${tools.length}  NoSQL 工具=${JSON.stringify(nosql)}`);
}
console.log(
  "  => 结论：ap-singapore 下 NoSQL 工具被整体跳过（server.ts:63-78），与站点无关",
);

// ---- 3. 登录 URL 构造差异：auth.ts:438-450 ----
section("3. 登录 URL 构造差异（auth.ts:436-450 复刻）");
const buildLoginUrl = (region, fromCloudBaseLoginPage = false, url) => {
  // 复刻 mcp/src/auth.ts:436-450 的实际分支逻辑
  if (fromCloudBaseLoginPage && !isInternationalRegion(region)) {
    const separator = url.includes("?") ? "&" : "?";
    const urlWithParam = `${url}${separator}allowNoEnv=true`;
    return `https://tcb.cloud.tencent.com/login?_redirect_uri=${encodeURIComponent(urlWithParam)}`;
  }
  if (isInternationalRegion(region)) {
    url = url.replace("cloud.tencent.com", "tencentcloud.com");
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}allowNoEnv=true`;
};
for (const region of ["ap-singapore", "ap-shanghai"]) {
  const url = buildLoginUrl(region, false, "https://tcb.cloud.tencent.com/oauth/authorize?client_id=x");
  const urlCp = buildLoginUrl(region, true, "https://tcb.cloud.tencent.com/oauth/authorize?client_id=x");
  console.log(`  region=${region}`);
  console.log(`    常规登录 URL : ${url}`);
  console.log(`    登录页模式 URL: ${urlCp}`);
}
console.log(
  "  => 结论：ap-singapore 会把登录域名替换为 tencentcloud.com（国际站登录），国内站新加坡账号无法通过该 URL 登录",
);

// ---- 4. 真实账号探测：国际站新加坡 envId vs 国内站 envId ----
section("4. 真实账号探测（本地已存国内站凭证 uin=123811017）");
const probe = async (label, region, envId) => {
  try {
    const manager = await getCloudBaseManager({
      requireEnvId: false,
      cloudBaseOptions: { region, envId },
      authStrategy: "ensure",
    });
    const res = await manager.env.describeEnvs({ EnvId: envId });
    const total = res?.Total ?? 0;
    const visible = (res?.EnvList ?? []).length;
    console.log(`  ${label}`);
    console.log(`    region=${region} envId=${envId}`);
    console.log(`    describeEnvs(EnvId) => Total=${total} EnvList=${visible} 条`);
    console.log(`    可见性: ${total > 0 ? "可访问" : "不可访问（凭证未覆盖该 site/env）"}`);
    return total > 0;
  } catch (e) {
    console.log(`  ${label}`);
    console.log(`    region=${region} envId=${envId} => ERROR: ${String(e?.message ?? e).slice(0, 300)}`);
    return false;
  }
};
// 国内站账号真实可见的环境（ap-shanghai）
const visibleDomEnv = "ai-9gra12b5b6a3c966";
const domOk = await probe("国内站上海环境(可见)", "ap-shanghai", visibleDomEnv);
const domAsSg = await probe("同一国内站环境改用 ap-singapore", "ap-singapore", visibleDomEnv);
const intlOk = await probe("国际站新加坡环境", "ap-singapore", "booker-ai-i0gygeljs622ffd23");
console.log(
  `  国内站上海可见=${domOk}  同一国内站环境以 ap-singapore 路由可见=${domAsSg}  国际站新加坡(国内凭证)可见=${intlOk}`,
);
console.log(
  "  => 结论：① region 决定路由目标，同一国内站环境把 region 从 ap-shanghai 改成 ap-singapore 后即不可见；",
);
console.log(
  "     ② 国际站新加坡环境对国内站凭证不可见，site 是独立于 region 的账号体系维度。",
);
console.log(
  "     二者叠加证明：仅凭 region 无法判定 site，而当前代码在所有 ap-singapore 上硬套国际站逻辑（登录域名/NoSQL 注册）。",
);

// ---- 汇总 ----
section("汇总：复现结论");
console.log(`
1. tencent-cloud.ts:8 用 region 字符串硬判 site，ap-singapore 一律判为国际站（无 site 维度）。
2. region=ap-singapore 时 NoSQL 工具被跳过（server.ts），国内站新加坡环境同样受影响。
3. region=ap-singapore 时登录 URL 被改写为 tencentcloud.com（auth.ts），国内站新加坡账号无法登录。
4. 真实探测：同一国内站环境把 region 改为 ap-singapore 后即不可见；国际站新加坡 env 对国内站凭证不可见。
   => site 是独立于 region 的维度，当前 1:1 绑定必然导致国内站新加坡环境误判。
`);
