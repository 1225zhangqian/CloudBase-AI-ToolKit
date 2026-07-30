import { describe, expect, test } from 'vitest';
import { selectMarketplaceMetadata } from '../scripts/publish-to-skillhub.mjs';

describe('selectMarketplaceMetadata', () => {
  test('uses curated displayName / summary / iconUrl from manifest target', () => {
    const result = selectMarketplaceMetadata(
      {
        displayName: '腾讯云 CloudBase / Tencent CloudBase',
        summary: '腾讯云 CloudBase 是面向 AI Coding 的后端一体化平台。',
        iconUrl: 'https://raw.githubusercontent.com/TencentCloudBase/cloudbase-plugin/main/assets/logo-dark.png',
      },
      {
        name: 'cloudbase',
        description:
          'Use this skill when you develop, design, build, deploy, debug, migrate, or troubleshoot CloudBase (腾讯云开发)...',
      },
    );

    expect(result).toEqual({
      displayName: '腾讯云 CloudBase / Tencent CloudBase',
      summary: '腾讯云 CloudBase 是面向 AI Coding 的后端一体化平台。',
      iconUrl:
        'https://raw.githubusercontent.com/TencentCloudBase/cloudbase-plugin/main/assets/logo-dark.png',
    });
  });

  test('falls back to SKILL.md frontmatter when manifest target lacks curated values', () => {
    // If a future target forgets to set curated values, we still publish
    // something usable instead of dropping the skill from the marketplace.
    const result = selectMarketplaceMetadata(
      {},
      { name: 'miniprogram-development', description: 'WeChat Mini Program skill' },
    );

    expect(result.displayName).toBe('miniprogram-development');
    expect(result.summary).toBe('WeChat Mini Program skill');
    expect(result.iconUrl).toBe('');
  });

  test('returns empty strings when both target and frontmatter are missing', () => {
    const result = selectMarketplaceMetadata(undefined, undefined);

    expect(result).toEqual({ displayName: '', summary: '', iconUrl: '' });
  });

  test('prefers target.displayName over the raw `cloudbase` slug in SKILL.md', () => {
    // Regression: SkillHub previously rendered the raw SKILL.md `name` slug
    // (e.g. "cloudbase") on the card. Curated displayName must win so the
    // skill shows up as "腾讯云 CloudBase / Tencent CloudBase".
    const result = selectMarketplaceMetadata(
      { displayName: '腾讯云 CloudBase / Tencent CloudBase' },
      { name: 'cloudbase', description: 'raw English trigger description' },
    );

    expect(result.displayName).toBe('腾讯云 CloudBase / Tencent CloudBase');
    expect(result.displayName).not.toBe('cloudbase');
  });

  test('prefers target.summary over the long English SKILL.md description', () => {
    // The SKILL.md description is a long English agent-trigger paragraph
    // (full of keywords like "CloudBase", "腾讯云开发", "generateText"). The
    // curated summary is the short Tencent-docs-style blurb that should show
    // on the SkillHub card instead.
    const longEnglish =
      'Use this skill when you develop, design, build, deploy, debug, migrate, or troubleshoot CloudBase (腾讯云开发, 云开发, TCB, 微信云开发) projects. Covers Web, 微信小程序...';
    const shortChinese = '腾讯云 CloudBase 是面向 AI Coding 的后端一体化平台。';

    const result = selectMarketplaceMetadata(
      { summary: shortChinese },
      { name: 'cloudbase', description: longEnglish },
    );

    expect(result.summary).toBe(shortChinese);
    expect(result.summary).not.toMatch(/Use this skill when/);
  });
});
