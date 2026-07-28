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
| Status | Not submitted yet |
| Form | https://platform.claude.com/plugins/submit |

## Grok Build

| Field | Value |
|-------|-------|
| Status | Not submitted yet |
| Process | PR to https://github.com/xai-org/plugin-marketplace |
