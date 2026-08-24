# Message Push & Customer Service Auto-Reply

Practical guide for **WeChat Mini Program + CloudBase** message push (消息推送) and customer-service auto-reply (客服消息自动回复).

## Operation surface (mandatory)

**Current only supported path:** WeChat Developer Tools (IDE) and wxide CLI (`wechatide` Nightly tools, or classic DevTools `cli`).

| Do | Don't |
| --- | --- |
| Configure / deploy / preview via IDE UI or wxide CLI high-level commands below | Bypass CLI with low-level transport, ticket capture, or undocumented CGI |
| Prefer Nightly `wechatide -c <clientName> -t <toolName>` (discover flags with `--help`) | Invent tool names or flags |
| Until WeChat-side tools are exposed, use IDE **云开发控制台 → 消息推送** for callback binding | Guide agents to call CloudBase MCP `queryMessagePush` / `manageMessagePush` as the mini-program daily path |

**WeChat IDE exposure status:** Spec designs `cloud_msg_push_query` / `cloud_msg_push_manage` (mapped from CloudBase MCP `queryMessagePush` / `manageMessagePush` via `EXPOSED_TOOL_NAME` after main upgrades `@cloudbase/cloudbase-mcp`). That consumption track is **9109db6b** — **not exposed yet**. Until then, this skill treats **IDE UI + existing wxide CLI cloud/preview commands** as the only agent-facing ops surface. Do not document or teach low-level alternatives.

**Maintainer E2E (not for product agents):** Full ticket / regression procedure for CloudBase-MCP msg-push tools lives in the external skill `wxide-qbase-msgpush-e2e` (`~/.workbuddy/skills/wxide-qbase-msgpush-e2e/SKILL.md`). Point there; do not copy its low-level steps into this reference.

## When to read this reference

- Bind message types or events to a cloud function
- Build customer-service auto-reply that must answer user chat
- Deploy the receiver function / upload experience build for real-device verification
- Find where function logs appear after a push

---

## 1. Message push configuration mechanism

### Message type vs event class

Callback routing is keyed by the **(MsgType, Event)** pair:

| Kind | `MsgType` | `Event` | Typical use |
| --- | --- | --- | --- |
| Message type | `text` / `image` / `voice` / `video` / `miniprogrampage` | empty (`""`) | User sends a chat message / card into customer service |
| Event class | `event` | concrete event name (e.g. virtual-pay notify events) | Platform / business events |

Rules:

- The **same (MsgType, Event) pair can bind to only one cloud function** (rebinding replaces the previous function).
- Legal event names for `MsgType=event` come from the platform support list (IDE message-push UI / future `cloud_msg_push_query` `listSupportedEvents`). Do not invent event strings.
- Enable the push switch in the IDE message-push panel when bindings should take effect.

### Configure callbacks (current)

1. Open **微信开发者工具 → 云开发控制台 → 消息推送** (wording may vary by DevTools version).
2. Choose **云函数** mode (not container) unless the project explicitly uses CloudRun callbacks.
3. Add entries for needed message types and/or events; point each to the receiver function name; enable push.

**Pending wxide CLI (9109db6b):**

```text
# Not available yet — do not invent or substitute low-level calls
wechatide -c <clientName> -t cloud_msg_push_query   ...
wechatide -c <clientName> -t cloud_msg_push_manage  ...
```

When those tools ship, prefer them over manual IDE clicks for subscribe / unsubscribe / list / setEnable. Until then, use the IDE panel only.

### Deploy the receiver cloud function

Always install npm deps **in the cloud** so runtime modules such as `@cloudbase/node-sdk` / `wx-server-sdk` resolve:

```bash
wechatide -c <clientName> -t cloud_fn_deploy \
  --paths <absCloudFunctionDir> \
  --env <envId> \
  --appid <appid> \
  --remote-npm-install
```

Classic DevTools CLI equivalent:

```bash
cli cloud functions deploy \
  --paths <absCloudFunctionDir> \
  --env <envId> \
  --appid <appid> \
  --remote-npm-install
```

Notes:

- Function directory name = function name.
- If deploy fails while the function is Creating/Updating, wait ~10–15s and retry.
- Omitting `--remote-npm-install` / `-r` commonly yields runtime `Cannot find module '...'`.

### Experience build / real-device check

```bash
# Upload experience build (only when the user explicitly asks to publish 体验版)
wechatide -c <clientName> -t miniprogram_upload \
  --project <absProjectPath> \
  --upload-version <x.y.z> \
  --desc "<desc>"

# Preview QR when a scannable code file/window is needed
wechatide -c <clientName> -t create_preview_qrcode \
  --project <absProjectPath> \
  --qr-output <absOutputPath>
```

For quick phone push without a file path, prefer `auto_preview`. Customer-service entry usually needs `<button open-type="contact">` and customer-service capability enabled in the MP admin backend.

---

## 2. Cloud function as push receiver

Minimal pattern:

```js
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  // event.MsgType / event.Event identify the (MsgType, Event) pair
  console.log("msg-push", event.MsgType, event.Event, event);
  // ... business logic ...
  return {}; // return value alone does NOT reply to the user (see §3)
};
```

Checklist:

- One function per logical handler is fine; **one (MsgType, Event) → one function** at the push config layer.
- Log enough to debug (`MsgType`, `Event`, openid if present).
- For privileged OpenAPI calls, declare permissions in the function `config.json` (see §3).

---

## 3. Customer service auto-reply mechanism

**Critical:** In cloud-function message-push mode, the function **return value does not** become a customer-service reply. To answer the user you must **actively send** via OpenAPI:

```js
await cloud.openapi.customerServiceMessage.send({
  touser: event.FromUserName,
  msgtype: "text",
  text: { content: "收到，我们会尽快处理" },
});
```

Declare OpenAPI permission on the function (example `config.json`):

```json
{
  "permissions": {
    "openapi": ["customerServiceMessage.send"]
  }
}
```

Redeploy with `--remote-npm-install` after changing code or `config.json`.

Common failures:

- Assuming `return { errcode: 0, ... }` or a text body will reply → silent no-reply.
- Missing `openapi` permission → send API fails at runtime.
- No customer-service entry / capability → real device never triggers `text` push.

---

## 4. Cloud function logs

### IDE (available now)

**微信开发者工具 → 云开发控制台 → 云函数 → \<function\> → 日志**

After enabling the CloudBase console panels, invocation logs for the receiver function appear here. Use this path for real-device push verification.

### wxide CLI (gap)

There is **no** stable wxide CLI log-query tool yet (for example a future `cloud_fn_logs` / equivalent).

```text
# Pending — 待 wxide CLI 提供（归属 9109db6b；接口调研 d5735473）
# Do not teach low-level log CGI workarounds in this skill
wechatide -c <clientName> -t <cloud_fn_logs_or_equivalent> ...
```

Until that lands, instruct agents/users to read logs in the IDE console path above.

---

## 5. Suggested end-to-end flow (product)

1. Implement receiver cloud function (+ OpenAPI send if auto-reply is required).
2. `cloud_fn_deploy` **with** `--remote-npm-install`.
3. Bind (MsgType, Event) → function in IDE **消息推送** (or future `cloud_msg_push_manage`).
4. Ensure customer-service entry / capability if testing `text` / media message types.
5. Upload experience build / preview; trigger from a real device.
6. Verify in IDE cloud function **日志** (CLI logs: pending 9109db6b).

---

## Related

- Debug / preview / `wechatide` context: [devtools-debug-preview.md](devtools-debug-preview.md)
- IDE Skills vs CloudBase MCP layering: [wxide-vs-cloudbase-mcp.md](wxide-vs-cloudbase-mcp.md)
- CloudBase mini program integration: [cloudbase-integration.md](cloudbase-integration.md)
- Maintainer MCP E2E authority (external): `wxide-qbase-msgpush-e2e` skill — do not inline its low-level steps here
- WeChat-side CLI exposure / missing commands: task **9109db6b**
- Log API research: task **d5735473**
- Spec design (CloudBase-MCP msg-push + EXPOSED_TOOL_NAME): `specs/virtual-payment-mcp/design.md` (task **43367cc6**)
