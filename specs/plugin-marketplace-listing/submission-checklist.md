# Manual Submission Checklist

Generated companion to `npm run analyze:plugin-marketplaces`.
**Do not auto-submit** — complete these steps manually after packaging is ready.

Repo to submit: `https://github.com/TencentCloudBase/CloudBase-MCP`

## Ready now

### 1. Claude Code — Community marketplace

- [x] Run `claude plugin validate` against `plugin/cloudbase` (or install from this repo marketplace and smoke-test)
- [x] Confirm public repo URL: `TencentCloudBase/CloudBase-MCP` (GitHub may redirect to `CloudBase-AI-Toolkit`)
- [ ] Submit via one of (packet ready — see `claude-submission-packet.md`):
  - https://platform.claude.com/plugins/submit
  - https://claude.ai/admin-settings/directory/submissions/plugins/new
- [ ] After approval, verify entry appears in `anthropics/claude-plugins-community` catalog
- [ ] Note: official `claude-plugins-official` has **no** public application (partner / Anthropic discretion)

### 2. Cursor Marketplace

- [x] Confirm manifests exist:
  - `.cursor-plugin/marketplace.json` (repo root)
  - `plugin/cloudbase/.cursor-plugin/plugin.json`
  - `plugin/cloudbase-sites/.cursor-plugin/plugin.json`
  - `plugin/cloudbase/mcp.json`
  - `plugin/cloudbase/assets/logo.png` (+ sites)
- [x] Command/skill/agent frontmatter quality gate (`npm run check:plugin-quality`)
- [ ] Local test (optional): symlink plugin into `~/.cursor/plugins/local/cloudbase` and restart Cursor
- [x] Submit publisher application at https://cursor.com/marketplace/publish (2026-07-28)
  - Org: Tencent CloudBase (`@tencent-cloudbase`)
  - Contact: bookerzhao@tencent.com
  - Repo: https://github.com/TencentCloudBase/CloudBase-AI-Toolkit
  - Confirmation: "Thanks for applying" — awaiting `marketplace-publishing@cursor.com`
- [ ] After approval: verify listing appears on https://cursor.com/marketplace
- [ ] Optional secondary listing: cursor.directory

### 3. Codex / ChatGPT — git marketplace (ready) vs Universal portal (blocked)

**Git marketplace (App / CLI sparse):**

- [x] Confirm `.agents/plugins/marketplace.json` (preferred) + root `marketplace.json` + `plugin/cloudbase/.codex-plugin/plugin.json`
- [x] Logo + privacy/terms URLs present on Codex interface

**Universal Plugins Directory portal (separate track):**

- [ ] Host public MCP HTTPS URL + domain verification (current packaging is local `npx` — not portal-ready)
- [ ] Prepare listing assets + 5 positive / 3 negative test cases
- [ ] Verified OpenAI org identity + Apps Management write
- [ ] Submit via https://developers.openai.com/plugins/deploy/submission

### 4. Grok Build marketplace

- [x] Prefer remote source `https://github.com/TencentCloudBase/cloudbase-plugin.git` (not monorepo root)
- [x] Open PR to https://github.com/xai-org/plugin-marketplace — https://github.com/xai-org/plugin-marketplace/pull/151 (2026-07-28)
- [x] Add remote catalog entry pinned to SHA `93b747b3287787b8c3ad0811ef4f9b51e2479ec9`
- [x] Regenerate `.grok-plugin/plugin-index.json` + validate-catalog
- [ ] Await xAI review / merge
- [ ] After merge: confirm catalog entry live; mark `markets.yaml` listed
- [x] Brand-scoped keywords/domains only

### 5. VS Code / Copilot agent plugins

- [ ] Users can already add this repo as a marketplace source
- [ ] Optional: request inclusion in default curated catalogs (`github/copilot-plugins` / awesome-copilot)
- [ ] Prefer documenting `npx plugins add TencentCloudBase/cloudbase-plugin --target vscode` / `github-copilot`

## Needs partner outreach (do not fake as ready)

| Market | Action |
|--------|--------|
| Claude Official curated | Wait for / request Anthropic partnership |
| Trae MCP marketplace | Contact Trae for MCP catalog inclusion |
| Trae Work skills marketplace | Confirm publisher onboarding |
| Qoder / QoderWork | Confirm plugin/connector submit path |
| CodeBuddy / CodeBuddy Code | Confirm whether already listed or need submit |
| Kimi Code official | Confirm third-party listing path |

## After each submission

1. Update `markets.yaml` status (`submittable` → `listed` when live)
2. Bump `last_reviewed_at`
3. Re-run `npm run analyze:plugin-marketplaces`
4. Commit updated `reports/latest.*`
