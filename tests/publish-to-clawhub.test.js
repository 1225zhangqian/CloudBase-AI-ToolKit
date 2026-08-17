import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  ALL_IN_ONE_UPLOAD_TICKET_MAX_ATTEMPTS,
  DEFAULT_UPLOAD_TICKET_MAX_ATTEMPTS,
  buildPublishCommand,
  clawhubUploadTicketMaxAttempts,
  formatClawhubUploadTicketFailure,
  isClawhubAlreadyPublishedOutput,
  isClawhubUploadTicketError,
  isClawhubVersionExistsError,
  normalizeClawhubChangelog,
  publishToClawhub,
  supportsClawhubUploadTicketRetry,
} from '../scripts/publish-to-clawhub.mjs';

const tempDirs = [];

function createManifest(targets) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawhub-publish-test-'));
  tempDirs.push(dir);
  const manifestPath = path.join(dir, 'manifest.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      targets: targets.map((target) => ({
        artifactDir: path.join(dir, target.targetKey),
        ...target,
      })),
    }),
  );
  return manifestPath;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('publish-to-clawhub command construction', () => {
  test('normalizes multiline changelog for clawhub CLI arguments', () => {
    const changelog = [
      'Recent commits / 最近提交:',
      '- Merge pull request #757 from TencentCloudBase/feature/pg-skill-guidance-hardening',
      '- fix(tests): 🧪 restore PR verification',
      '',
      '- chore(deps): 🔒 refresh pnpm lockfile',
    ].join('\n');

    const normalized = normalizeClawhubChangelog(changelog);

    expect(normalized).toBe(
      'Recent commits / 最近提交: | - Merge pull request #757 from TencentCloudBase/feature/pg-skill-guidance-hardening | - fix(tests): 🧪 restore PR verification | - chore(deps): 🔒 refresh pnpm lockfile',
    );
    expect(normalized).not.toMatch(/[\r\n]/);
  });

  test('publishes a single skill folder with a single-line changelog', () => {
    const command = buildPublishCommand(
      {
        artifactDir: '/tmp/artifact/skills/cloudbase',
        registrySlug: 'cloudbase',
        targetKey: 'all-in-one',
      },
      {
        bump: 'minor',
        tags: 'latest',
        changelog: 'Recent commits / 最近提交:\n- first\n- second',
      },
    );

    const changelogIndex = command.args.indexOf('--changelog') + 1;

    expect(command.command).toBe('clawhub');
    expect(command.args.slice(0, 3)).toEqual(['skill', 'publish', '/tmp/artifact/skills/cloudbase']);
    expect(command.args).toContain('--slug');
    expect(command.args[command.args.indexOf('--slug') + 1]).toBe('cloudbase');
    expect(command.args).not.toContain('sync');
    expect(command.args).not.toContain('--all');
    expect(command.args[changelogIndex]).toBe('Recent commits / 最近提交: | - first | - second');
    expect(command.args[changelogIndex]).not.toMatch(/[\r\n]/);
  });

  test('detects clawhub version-already-exists errors as idempotent', () => {
    expect(
      isClawhubVersionExistsError(
        new Error('Version 1.92.41 already exists. Increment the version number and try again.'),
      ),
    ).toBe(true);
    expect(isClawhubVersionExistsError(new Error('Uploaded file does not match its skill upload ticket'))).toBe(
      false,
    );
  });

  test('detects version-already-exists when text is only on stderr (CI regression)', () => {
    // execFileSync with stdio inherit left error.message as "Command failed: ..."
    // without stderr; production must capture stderr onto the error object.
    const error = new Error(
      'Command failed: clawhub skill publish /tmp/artifact/skills/cloudbase --slug cloudbase',
    );
    error.stderr =
      'Error: Version 1.92.48 already exists. Increment the version number and try again. (reset in 44s)\n';
    expect(isClawhubVersionExistsError(error)).toBe(true);
  });

  // Fingerprint version-already-exists from Actions run 30897797886 (main@95a75f82):
  // CLI printed the Version line, but failure aggregation only kept "Command failed: ...".
  test('detects version-already-exists from Actions run 30897797886 log shape', () => {
    const error = new Error(
      'Command failed: clawhub skill publish /home/runner/work/CloudBase-AI-Toolkit/CloudBase-AI-Toolkit/.clawhub-publish-output/web-development/skills/web-development --slug web-development --changelog Recent commits --tags latest',
    );
    error.stderr = [
      'Version 1.27.25 already exists. Increment the version number and try again.',
      '    at handler (../../convex/skills.ts:13078:8)',
      '    at async handler (../../node_modules/convex-helpers/server/customFunctions.js:268:27) (reset in 42s)',
      'Error: Version 1.27.25 already exists. Increment the version number and try again.',
      '    at handler (../../convex/skills.ts:13078:8)',
      '    at async handler (../../node_modules/convex-helpers/server/customFunctions.js:268:27) (reset in 42s)',
      '',
    ].join('\n');
    expect(isClawhubVersionExistsError(error)).toBe(true);
  });

  test('detects OK already-published messages as idempotent', () => {
    const error = new Error('Command failed: clawhub skill publish ...');
    error.stdout = 'OK. cloudbase@1.92.48 is already published\n';
    expect(isClawhubVersionExistsError(error)).toBe(true);
    expect(isClawhubAlreadyPublishedOutput('OK. cloudbase@1.92.48 is already published\n')).toBe(true);
  });

  test('detects upload-ticket mismatch errors as retryable', () => {
    expect(
      isClawhubUploadTicketError(
        new Error('Skill upload ticket does not match this publish'),
      ),
    ).toBe(true);

    const stderrOnly = new Error('Command failed: clawhub skill publish ...');
    stderrOnly.stderr = 'Error: Uploaded file does not match its skill upload ticket\n';
    expect(isClawhubUploadTicketError(stderrOnly)).toBe(true);
    expect(isClawhubUploadTicketError(new Error('Version 1.92.48 already exists'))).toBe(false);
  });

  test('all targets support upload-ticket retry; all-in-one gets more attempts', () => {
    expect(supportsClawhubUploadTicketRetry({ targetKey: 'all-in-one' })).toBe(true);
    expect(supportsClawhubUploadTicketRetry({ targetKey: 'web-development' })).toBe(true);
    expect(clawhubUploadTicketMaxAttempts({ targetKey: 'all-in-one' })).toBe(
      ALL_IN_ONE_UPLOAD_TICKET_MAX_ATTEMPTS,
    );
    expect(clawhubUploadTicketMaxAttempts({ targetKey: 'web-development' })).toBe(
      DEFAULT_UPLOAD_TICKET_MAX_ATTEMPTS,
    );
  });

  test('formats upload-ticket exhaustion with attempt count and issue hint', () => {
    const message = formatClawhubUploadTicketFailure(
      { targetKey: 'all-in-one', registrySlug: 'cloudbase' },
      new Error('Skill upload ticket does not match this publish'),
      3,
    );

    expect(message).toContain('after 3 attempt(s)');
    expect(message).toContain('all-in-one');
    expect(message).toContain('cloudbase');
    expect(message).toContain('openclaw/clawhub#3394');
    expect(message).toContain('Skill upload ticket does not match this publish');
  });
});

describe('publish-to-clawhub version-exists idempotency', () => {
  test('treats stderr-only Version already exists as already-published and continues', () => {
    const previousToken = process.env.CLAWDHUB_TOKEN;
    process.env.CLAWDHUB_TOKEN = 'test-token';

    try {
      const manifestPath = createManifest([
        { targetKey: 'all-in-one', registrySlug: 'cloudbase' },
        { targetKey: 'web-development', registrySlug: 'web-development' },
      ]);
      const publishCalls = [];

      const results = publishToClawhub({
        manifestPath,
        changelog: 'idempotency regression',
        runPublish: (_command, args) => {
          publishCalls.push(args);
          const slugIndex = args.indexOf('--slug');
          const slug = slugIndex >= 0 ? args[slugIndex + 1] : '';
          if (slug === 'cloudbase') {
            // Mimic CI: Command failed message has no Version text; stderr does.
            const error = new Error(
              'Command failed: clawhub skill publish /tmp/artifact/skills/cloudbase --slug cloudbase',
            );
            error.stderr =
              'Error: Version 1.92.48 already exists. Increment the version number and try again. (reset in 44s)\n';
            throw error;
          }
          return { status: 'ok', output: 'OK. web-development@1.0.0 published\n' };
        },
        sleepMs: () => {
          throw new Error('sleep should not be called for version-exists');
        },
      });

      expect(publishCalls).toHaveLength(2);
      expect(results).toEqual([
        {
          targetKey: 'all-in-one',
          registrySlug: 'cloudbase',
          status: 'already-published',
          attempts: 1,
        },
        {
          targetKey: 'web-development',
          registrySlug: 'web-development',
          status: 'published',
          attempts: 1,
        },
      ]);
    } finally {
      if (previousToken === undefined) {
        delete process.env.CLAWDHUB_TOKEN;
      } else {
        process.env.CLAWDHUB_TOKEN = previousToken;
      }
    }
  });

  test('classifies exit-0 already-published stdout as already-published', () => {
    const previousToken = process.env.CLAWDHUB_TOKEN;
    process.env.CLAWDHUB_TOKEN = 'test-token';

    try {
      const manifestPath = createManifest([
        { targetKey: 'web-development', registrySlug: 'web-development' },
      ]);

      const results = publishToClawhub({
        manifestPath,
        runPublish: () => ({
          status: 'ok',
          output: 'OK. web-development@1.27.30 is already published\n',
        }),
      });

      expect(results).toEqual([
        {
          targetKey: 'web-development',
          registrySlug: 'web-development',
          status: 'already-published',
          attempts: 1,
        },
      ]);
    } finally {
      if (previousToken === undefined) {
        delete process.env.CLAWDHUB_TOKEN;
      } else {
        process.env.CLAWDHUB_TOKEN = previousToken;
      }
    }
  });
});

describe('publish-to-clawhub upload-ticket retry', () => {
  test('retries all-in-one on upload-ticket mismatch then succeeds', () => {
    const previousToken = process.env.CLAWDHUB_TOKEN;
    process.env.CLAWDHUB_TOKEN = 'test-token';

    try {
      const manifestPath = createManifest([
        { targetKey: 'all-in-one', registrySlug: 'cloudbase' },
      ]);
      let calls = 0;
      const sleepCalls = [];

      const results = publishToClawhub({
        manifestPath,
        changelog: 'retry test',
        runPublish: () => {
          calls += 1;
          if (calls < 2) {
            const error = new Error('Skill upload ticket does not match this publish');
            error.stderr = 'Skill upload ticket does not match this publish\n';
            throw error;
          }
          return { status: 'ok', output: '' };
        },
        sleepMs: (ms) => {
          sleepCalls.push(ms);
        },
      });

      expect(calls).toBe(2);
      expect(sleepCalls).toEqual([2000]);
      expect(results).toEqual([
        {
          targetKey: 'all-in-one',
          registrySlug: 'cloudbase',
          status: 'published',
          attempts: 2,
        },
      ]);
    } finally {
      if (previousToken === undefined) {
        delete process.env.CLAWDHUB_TOKEN;
      } else {
        process.env.CLAWDHUB_TOKEN = previousToken;
      }
    }
  });

  test('exhausts all-in-one upload-ticket retries with clear failure message', () => {
    const previousToken = process.env.CLAWDHUB_TOKEN;
    process.env.CLAWDHUB_TOKEN = 'test-token';

    try {
      const manifestPath = createManifest([
        { targetKey: 'all-in-one', registrySlug: 'cloudbase' },
      ]);
      let calls = 0;

      expect(() =>
        publishToClawhub({
          manifestPath,
          changelog: 'retry exhaust',
          runPublish: () => {
            calls += 1;
            const error = new Error('Skill upload ticket does not match this publish');
            error.stderr = 'Skill upload ticket does not match this publish\n';
            throw error;
          },
          sleepMs: () => {},
        }),
      ).toThrow(/Failed to publish 1 target/);

      expect(calls).toBe(ALL_IN_ONE_UPLOAD_TICKET_MAX_ATTEMPTS);
    } finally {
      if (previousToken === undefined) {
        delete process.env.CLAWDHUB_TOKEN;
      } else {
        process.env.CLAWDHUB_TOKEN = previousToken;
      }
    }
  });

  test('retries upload-ticket errors for non all-in-one targets with default attempts', () => {
    const previousToken = process.env.CLAWDHUB_TOKEN;
    process.env.CLAWDHUB_TOKEN = 'test-token';

    try {
      const manifestPath = createManifest([
        { targetKey: 'web-development', registrySlug: 'cloudbase-web-development' },
      ]);
      let calls = 0;

      expect(() =>
        publishToClawhub({
          manifestPath,
          changelog: 'retry small skill',
          runPublish: () => {
            calls += 1;
            throw new Error('Uploaded file does not match its skill upload ticket');
          },
          sleepMs: () => {},
        }),
      ).toThrow(/Failed to publish 1 target/);

      expect(calls).toBe(DEFAULT_UPLOAD_TICKET_MAX_ATTEMPTS);
    } finally {
      if (previousToken === undefined) {
        delete process.env.CLAWDHUB_TOKEN;
      } else {
        process.env.CLAWDHUB_TOKEN = previousToken;
      }
    }
  });
});
