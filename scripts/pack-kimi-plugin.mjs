#!/usr/bin/env node
/**
 * Pack plugin/cloudbase as a Kimi Code / Kimi Work plugin zip.
 *
 * Zip root contains `kimi.plugin.json` (Open Plugin Spec style manifest),
 * skills, MCP config, agents, commands, hooks — the same layout Qoder packs.
 *
 * Usage:
 *   node scripts/pack-kimi-plugin.mjs
 *   node scripts/pack-kimi-plugin.mjs --out /tmp/cloudbase-kimi.zip
 *   node scripts/pack-kimi-plugin.mjs --version 0.2.0   # override manifest version
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

function parseArgs(argv = process.argv.slice(2)) {
  const args = { out: null, version: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--") continue;
    if (a === "--out") {
      args.out = argv[++i];
      if (!args.out) throw new Error("--out requires a path");
    } else if (a === "--version") {
      args.version = argv[++i];
      if (!args.version) throw new Error("--version requires a value");
    } else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function assertReady() {
  const required = [
    MANIFEST_PATH,
    path.join(PLUGIN_DIR, ".mcp.json"),
    path.join(PLUGIN_DIR, "skills"),
  ];
  for (const p of required) {
    if (!fs.existsSync(p)) {
      throw new Error(`Missing required path for Kimi pack: ${p}`);
    }
  }
}

function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(`Pack CloudBase plugin for Kimi Code / Kimi Work.

Usage:
  node scripts/pack-kimi-plugin.mjs
  node scripts/pack-kimi-plugin.mjs --out ./dist/cloudbase-kimi.zip
  node scripts/pack-kimi-plugin.mjs --version 0.2.0
`);
    return;
  }

  assertReady();

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const version = args.version || manifest.version || "0.0.0";
  const outPath =
    args.out ||
    path.join(ROOT, "dist", `cloudbase-kimi-v${version}.zip`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (fs.existsSync(outPath)) fs.rmSync(outPath);

  // zip from inside plugin dir so archive root is the plugin contents
  execFileSync(
    "zip",
    [
      "-r",
      outPath,
      ".",
      "-x",
      "*.DS_Store",
      "./.git/*",
      "./.sync-metadata.json",
      "./generated/*",
    ],
    { cwd: PLUGIN_DIR, stdio: "inherit" },
  );

  const size = fs.statSync(outPath).size;
  console.log("");
  console.log(`Packed: ${outPath}`);
  console.log(`Size:   ${(size / 1024 / 1024).toFixed(2)} MiB`);
  console.log(`Name:   ${manifest.name}@${version}`);
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
