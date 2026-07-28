# Marketplace submission log

Track manual publisher / listing applications. Update when status changes.

## Cursor Marketplace

| Field | Value |
|-------|-------|
| Status | **Publisher application submitted** (awaiting review) |
| Submitted at | 2026-07-28 |
| Form | https://cursor.com/marketplace/publish |
| Organization | Tencent CloudBase |
| Handle | `@tencent-cloudbase` |
| Contact | bookerzhao@tencent.com |
| Website | https://cloudbase.net |
| Repo | https://github.com/TencentCloudBase/CloudBase-AI-Toolkit |
| Logo | https://raw.githubusercontent.com/TencentCloudBase/CloudBase-AI-Toolkit/main/plugin/cloudbase/assets/logo.png |
| Confirmation UI | "Thanks for applying" — follow-up via marketplace-publishing@cursor.com |
| Listed yet? | No |

### How to check progress

Cursor does **not** show an in-page application dashboard after submit. Use:

1. **Email** — watch `bookerzhao@tencent.com` (and spam) for `marketplace-publishing@cursor.com`
2. **Reply to that thread** if you need status / more materials
3. **Marketplace browse** — after approval, search https://cursor.com/marketplace for `CloudBase` / `cloudbase`
4. **Re-open publish page** — https://cursor.com/marketplace/publish (may show publisher state after approval; today it mainly accepts new applications)
5. **Escalate** — email `marketplace-publishing@cursor.com` with org name + repo URL if no reply in ~1–2 weeks

When live: set `markets.yaml` `listing_statuses.official_curated: listed`, check the checklist box, re-run `npm run analyze:plugin-marketplaces`.

## Claude Community

| Field | Value |
|-------|-------|
| Status | Packet ready — awaiting human form submit |
| Form | https://platform.claude.com/plugins/submit |
| Packet | `specs/plugin-marketplace-listing/claude-submission-packet.md` |
| Repo | https://github.com/TencentCloudBase/CloudBase-AI-Toolkit |
| Plugin path | `plugin/cloudbase` |

### How to check progress (Claude)

1. After submit, watch for Anthropic review email / Console submission status.
2. Search community catalog nightly sync: https://github.com/anthropics/claude-plugins-community/blob/main/.claude-plugin/marketplace.json
3. Install test: `claude plugin marketplace add anthropics/claude-plugins-community` then `claude plugin install cloudbase@claude-community` (name may vary after listing).

## Grok Build

| Field | Value |
|-------|-------|
| Status | **PR opened** — awaiting xAI review |
| PR | https://github.com/xai-org/plugin-marketplace/pull/151 |
| Source repo | https://github.com/TencentCloudBase/cloudbase-plugin.git |
| Pinned SHA | `93b747b3287787b8c3ad0811ef4f9b51e2479ec9` |
| Submitted at | 2026-07-28 |

### How to check progress (Grok)

1. Watch PR #151 CI + review comments: https://github.com/xai-org/plugin-marketplace/pull/151
2. After merge, confirm entry in https://github.com/xai-org/plugin-marketplace/blob/main/.grok-plugin/marketplace.json
3. Install / browse from Grok Build marketplace UI
