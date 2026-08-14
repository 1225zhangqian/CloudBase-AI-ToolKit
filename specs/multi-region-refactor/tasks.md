# 实施计划：MCP 多地域支持（site/region 解耦）

> 状态：spec 草案（待确认）
> 日期：2026-08-13
> 前置：`requirements.md` + `design.md` 确认后执行

---

- [ ] 1. 新增 `mcp/src/utils/site-map.ts`：`SITE_REGION_MAP` 数据驱动映射表（site → authHost/regions/capabilities/defaultRegion）
  - 国内站/国际站地域列表分别维护
  - `capabilities.noSql` 国内站默认 true、国际站默认 false
  - _需求: R2
- [ ] 2. 重写 `mcp/src/utils/tencent-cloud.ts`：`getSite(region, site?)` 查表替代 `isInternationalRegion`
  - 保留 `isInternationalRegion` 兼容名（内部查表），避免一次性改所有调用方
  - ap-singapore 歧义返回 `ambiguous`
  - _需求: R1, R2
- [ ] 3. 新增 `resolveSiteAndRegion()`：统一解析入口，收敛 `cloudbase-manager.ts` 5 处 region fallback
  - 优先级：显式 > env（`TCB_SITE`/`TCB_REGION`）> 项目配置 > 全局默认 domestic/ap-shanghai
  - _需求: R1, R4
- [ ] 4. `mcp/src/cloudbase-manager.ts`：5 处 `?? TCB_REGION ?? 'ap-shanghai'` 替换为 `resolveSiteAndRegion`
  - 保持 envId 解析逻辑不变
  - _需求: R4
- [ ] 5. `mcp/src/server.ts`：`registerDatabase`/`registerNoSQLDatabase` 改用 `SITE_REGION_MAP[site].capabilities.noSql`
  - 保留 RuntimeBackends 探测增强为后续可选项（R3.3）
  - _需求: R3
- [ ] 6. `mcp/src/auth.ts`：登录 URL 按 `getSite` 查表构造，移除 `url.replace("cloud.tencent.com","tencentcloud.com")`
  - `fromCloudBaseLoginPage` 分支按 site === "domestic" 判定
  - _需求: R5
- [ ] 7. `mcp/src/templates/env-setup/components.ts`：`accountInfo.region !== 'ap-singapore'` 改为按 site 判定
  - _需求: R5
- [ ] 8. 多 site 凭证分槽：auth store `credential[site]`，兼容读取旧单槽数据（视为 domestic）
  - `loginByWebAuth({ site })` / `getLoginState({ site })`
  - _需求: R6
- [ ] 9. 项目级配置 `.cloudbase/project.json` 读取：`readProjectConfig(cwd)`，解析 site/region/envId
  - 不并入 cloudbaserc.json
  - _需求: R1, R4, R7
- [ ] 10. `mcp/src/cli.ts`：新增 `--site` CLI 参数（可选）
  - _需求: R1, R7
- [ ] 11. 单元/组件测试：
  - site-map 映射表覆盖（含 ap-singapore 歧义）
  - resolveSiteAndRegion 优先级链
  - server 工具注册按 site 差异（国内站含 NoSQL、国际站不含）
  - 现有 ap-shanghai 用例全量回归
  - _需求: R1-R7
- [ ] 12. 文档更新：README / connection-modes / 迁移指引（国内站新加坡用户配置 `TCB_SITE=domestic`）
  - _需求: R7

---

## 验收

- 阶段①复现问题（ap-singapore 误判 NoSQL/登录 URL）在改后消失：
  - `region=ap-singapore + site=domestic` → NoSQL 工具注册、登录回国内站
  - `region=ap-singapore + site=intl` → NoSQL 工具跳过、登录回国际站（现状行为）
- 国内站 ap-shanghai 用户零配置升级后行为不变（全量回归通过）。
- `TCB_REGION=ap-singapore` 未配 site 时保持 intl（现状兼容）。
- 国际站新加坡 env `booker-ai-i0gygeljs622ffd23` 在显式 site=intl 下可正常路由。
