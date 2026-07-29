# 实施计划

- [ ] 1. Shared helper + unit tests
  - Add `mcp/src/utils/gateway-access-urls.ts`
  - Export `rankGatewayAccessUrls` and `resolveGatewayAccessUrls`
  - _需求: 1, 2, 3_

- [ ] 2. Gateway tools ranking + envelope fields
  - Update `mcp/src/tools/gateway.ts` and `gateway.test.ts`
  - _需求: 1, 3_

- [ ] 3. Post-deploy enrichment
  - CloudRun / Hosting / Apps / Functions soft-fail enrichment
  - Matching tool tests
  - _需求: 2, 3_

- [ ] 4. Skills / docs touch-up
  - Only where accessUrl guidance already exists
  - _需求: 2_
