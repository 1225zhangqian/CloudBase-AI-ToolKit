# Implementation Plan

- [x] 1. Rewrite gateway tool surface to Domain/Route only
  - Update `QUERY_GATEWAY_ACTIONS` / `MANAGE_GATEWAY_ACTIONS` to remove `getAccess`, `listDomains`, `createAccess`, `deleteAccess`, `updatePathAuth`
  - Keep: `listRoutes`, `getRoute`, `listCustomDomains`, `createRoute`, `updateRoute`, `deleteRoute`, `bindCustomDomain`, `deleteCustomDomain`
  - Extend query input with optional `path` / `domain` for `getRoute`
  - Tighten manage schema: `type` enum `Event|HTTP`, `route.upstreamResourceType` as `z.enum(["SCF","WEB_SCF","CBR","STATIC_STORE","LH"])`, remove `accessId` / `accessName`
  - Update tool descriptions to recommend `createRoute` for default-domain function entry and warn HTTP vs Event mapping
  - _需求: 1, 2, 4_

- [x] 2. Implement Domain/Route helpers and handlers (no `access.*`)
  - Replace `resolveRouteDomain` to use `IsDefault` (never `OriginDomain` alone)
  - Implement `mapUpstreamResourceType` + reject missing type for function routes
  - Fix `normalizeRoutePayload` to emit correct `UpstreamResourceType` / `UpstreamResourceName` / `EnableAuth`
  - Rewrite `getRoute` / `listRoutes` / `listCustomDomains` on `describeHttpServiceRoute` only
  - Wire create/update/delete to `env.createHttpServiceRoute` / `modifyHttpServiceRoute` / `deleteHttpServiceRoute`
  - Ensure success envelopes include `domain`, path, upstream fields, propagation + permissions `nextActions`
  - Remove all `cloudbase.access.*` call sites from `gateway.ts`
  - _需求: 2, 3, 4, 5, 8_

- [x] 3. Update gateway unit tests
  - Retarget mocks to `env.*` only; drop `access.createAccess` / `getAccessList` / etc. assertions
  - Cover: IsDefault resolution, OriginDomain not used as public domain, Event→SCF, HTTP→WEB_SCF, missing type rejection, CRUD param shapes, missing default-domain error, schema excludes removed actions
  - _需求: 7_

- [x] 4. Update function creation guidance
  - Change `functions.ts` messages / `nextActions` from `createAccess`/`getAccess` to `createRoute`/`getRoute` (explicit HTTP type)
  - Update `functions.test.ts` expectations
  - _需求: 6, 8_

- [x] 5. Migrate skills and remove old GWAPI Plan B
  - Update `config/source/skills/cloud-functions/SKILL.md` and references (`http-functions.md`, `http-functions-custom-image.md`, `operations-and-config.md`)
  - Delete `CreateCloudBaseGWAPI` / `callCloudApi` Plan B guidance
  - Align wording with CLI Domain/Route semantics
  - Sync `config/.claude/skills` mirror; align `plugin/cloudbase/skills/cloud-functions`
  - _需求: 6_

- [x] 6. Refresh generated docs and in-repo callers
  - Run prompts / mcp-tools generation scripts as required by project rules
  - Update `tests/sts-resource-level-validation.test.js` and any examples still using old actions
  - Confirm `capi.ts` GWAPI blacklist unchanged
  - _需求: 6, 7_

- [x] 7. Verification and migration notes
  - Run gateway + functions unit tests / relevant build checks
  - Migration table (for PR): see below
  - Note follow-up: Manager SDK `access` still not deprecated (out of scope)
  - _需求: 7_

## Migration table

| Old | New |
|-----|-----|
| `createAccess` | `createRoute` (+ `type=HTTP\|Event`, optional `domain`) |
| `getAccess` | `getRoute` (`targetName` / `path` / `domain`) |
| `deleteAccess` | `deleteRoute` (`domain?` + `path`) |
| `updatePathAuth` | `updateRoute` (`auth` / `EnableAuth`) |
| `listDomains` | `listRoutes` or `listCustomDomains` |
| Type `1` / `6` | `SCF` / `WEB_SCF` |
| `APIId` | `Domain + Path` |
