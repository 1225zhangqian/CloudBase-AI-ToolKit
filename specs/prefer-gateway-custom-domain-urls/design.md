# 技术方案

## 架构

共享解析器 `mcp/src/utils/gateway-access-urls.ts`：

1. 调用 `env.describeHttpServiceRoute`
2. Flatten Domains × Routes
3. 按 `UpstreamResourceType` + `UpstreamResourceName` 过滤
4. 生成 `https://{Domain}{Path}`，自定义域名（`IsDefault !== true`）排在默认域名之前
5. Soft-fail：异常返回空列表，由调用方回退

## 调用面

| 工具 | 行为 |
|------|------|
| `queryGateway` / `manageGateway` | URL 列表按上述规则排序；create/update 成功 envelope 增加 `accessUrl` / `accessUrls` / `accessUrlSource` |
| `manageCloudRun` deploy | 优先网关 `CBR`；回退 CustomDomainName → DefaultDomainName → PublicDomain |
| `manageHosting` upload | 优先网关 `STATIC_STORE`；回退 StaticDomain |
| `manageApps` deployApp | 优先网关 `STATIC_STORE`（serviceName）；回退 app Domain |
| `manageFunctions` HTTP create/update | 有 `WEB_SCF`/`SCF` 路由时附带 accessUrls |

## Envelope

```ts
{
  accessUrl?: string;
  accessUrls?: string[];
  accessUrlSource?:
    | "gateway.custom"
    | "gateway.default"
    | "hosting.staticDomain"
    | "apps.domain"
    | "cloudrun.customDomain"
    | "cloudrun.defaultDomain"
    | "cloudrun.publicDomain"
    | "cloudrun.internalDomain";
}
```

## 测试策略

- 纯函数排序单测（自定义优先、去重、空列表）
- 工具单测 mock `describeHttpServiceRoute`
- Soft-fail：网关抛错时部署仍成功且回退原生 URL

## 安全性

不发明域名/路径；不自动绑定证书或创建路由。
