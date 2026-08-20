#!/usr/bin/env node
/**
 * Pack plugin/cloudbase as a Kimi Code / Kimi Work plugin zip.
 *
 * Whitelist-only: archive contains ONLY what the Kimi plugin needs —
 *   - kimi.plugin.json  (Open Plugin Spec style manifest)
 *   - skills/           (CloudBase knowledge base: routing skill + sibling skills)
 *   - assets/           (icons referenced by skills, e.g. ui-design)
 * Everything else (agents/, hooks/, commands/, .claude-plugin/,
 * gemini-extension.json, etc.) is IDE-specific and excluded.
 *
 * Output name is version-free: dist/cloudbase-kimi.zip (release tag carries
 * the version, so a stable asset name keeps zip-url stable across releases).
 *
 * Usage:
 *   node scripts/pack-kimi-plugin.mjs
 *   node scripts/pack-kimi-plugin.mjs --out /tmp/cloudbase-kimi.zip
 *
 * Release flow (CI): .github/workflows/release-plugin-zips.yml packs this zip
 * on `release: published` and uploads it to the release assets.
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PLUGIN_DIR = path.join(ROOT, "plugin", "cloudbase");
const MANIFEST_PATH = path.join(PLUGIN_DIR, "kimi.plugin.json");

// Whitelist of archive entries (relative to PLUGIN_DIR) — only Kimi needs.
const INCLUDE = ["kimi.plugin.json", "skills", "assets"];
const DEFAULT_OUT_NAME = "cloudbase-kimi.zip";

function parseArgs(argv = process.argv.slice(2)) {
  const args = { out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--") continue;
    if (a === "--out") {
      args.out = argv[++i];
      if (!args.out) throw new Error("--out requires a path");
    } else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function assertReady() {
  for (const entry of INCLUDE) {
    if (!fs.existsSync(path.join(PLUGIN_DIR, entry))) {
      throw new Error(`Missing required path for Kimi pack: ${entry}`);
    }
  }
}

function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(`Pack CloudBase plugin for Kimi Code / Kimi Work.

Only ${INCLUDE.join(", ")} are included; IDE-specific dirs are excluded.

Usage:
  node scripts/pack-kimi-plugin.mjs
  node scripts/pack-kimi-plugin.mjs --out ./dist/cloudbase-kimi.zip
`);
    return;
  }

  assertReady();

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const outPath = args.out || path.join(ROOT, "dist", DEFAULT_OUT_NAME);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (fs.existsSync(outPath)) fs.rmSync(outPath);

  // zip from inside plugin dir so archive root is the plugin contents
  execFileSync("zip", ["-r", outPath, ...INCLUDE, "-x", "*.DS_Store"], {
    cwd: PLUGIN_DIR,
    stdio: "inherit",
  });

  const size = fs.statSync(outPath).size;
  console.log("");
  console.log(`Packed: ${outPath}`);
  console.log(`Size:   ${(size / 1024 / 1024).toFixed(2)} MiB`);
  console.log(`Name:   ${manifest.name}@${manifest.version}`);
  console.log("");
  console.log("Next:");
  console.log("  1. Upload this zip to the GitHub release assets");
  console.log("     (CI does this automatically on release: published)");
  console.log("  2. Or install locally: put it under ~/.kimi-code/plugins/managed/<id>/");
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
