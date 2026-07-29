# 需求文档

## 介绍

云函数、静态托管、云托管部署成功后，工具常返回资源原生默认域名。若 HTTP 网关已将自定义域名路由到同一上游，应优先展示自定义域名访问地址，避免 Agent 继续分享默认域名。

## 需求

### 需求 1 - 网关 URL 排序偏好自定义域名

**用户故事：** 作为查询或创建网关路由的开发者，我希望返回的访问链接优先是自定义域名，这样对外分享的链接与生产一致。

#### 验收标准

1. When `queryGateway` / `manageGateway` 返回某资源相关路由 URL 时，the MCP shall 将 `IsDefault !== true` 的域名 URL 排在 `IsDefault === true` 的默认 HTTP 域名之前。
2. When 同一上游存在多条路由时，the MCP shall 去重后保留排序结果，且不得发明未出现在 `describeHttpServiceRoute` 中的域名或路径。

### 需求 2 - 部署成功回包优先网关自定义域名

**用户故事：** 作为部署应用的开发者，我希望部署成功后工具直接给出应优先使用的公网地址（若已配置网关自定义域名）。

#### 验收标准

1. When 云函数 HTTP / 静态托管上传 / 云托管部署 / Apps 部署成功且网关已有匹配上游路由时，the MCP shall 在成功 envelope 中提供 `accessUrl`、`accessUrls`、`accessUrlSource`，且优先使用网关自定义域名。
2. When 网关查询失败或无匹配路由时，the MCP shall 回退到既有资源原生默认域名逻辑，且不得导致部署失败。

### 需求 3 - 透明来源标记

**用户故事：** 作为 Agent，我希望知道当前 `accessUrl` 来自网关自定义域名还是资源默认域名，以便正确提示用户。

#### 验收标准

1. When 返回 `accessUrl` 时，the MCP shall 同时返回可机读的 `accessUrlSource`（如 `gateway.custom` / `gateway.default` / 资源原生来源枚举值）。
