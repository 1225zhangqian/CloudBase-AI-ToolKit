#!/usr/bin/env node
/**
 * Pack WorkBuddy expert packages (plugins/experts/*) into release zips.
 *
 * One zip per expert: dist/<expert-name>.zip. Naming is version-free —
 * the release tag carries the version, so zip-urls stay stable across
 * releases (same convention as cloudbase-kimi.zip / cloudbase-qoder.zip).
 *
 * Zip layout mirrors the official expert-manager packager
 * (package_expert.py): the archive top level is the expert directory
 * itself (<expert-name>/...), so unzipping yields the package directory
 * that validate_expert.py / register_expert.py consume directly.
 *
 * Exclusions (aligned with package_expert.py): hidden files except
 * .codebuddy-plugin, node_modules, __pycache__, .DS_Store, .gitkeep.
 *
 * Usage:
 *   node scripts/pack-experts.mjs
 *   node scripts/pack-experts.mjs --out-dir /tmp/expert-zips
 *
 * Release flow (CI): .github/workflows/release-plugin-zips.yml packs these
 * zips on `release: published` and uploads them to the release assets.
 */

import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXPERTS_DIR = path.join(ROOT, "plugins", "experts");
const DEFAULT_OUT_DIR = path.join(ROOT, "dist");
// Bundled skills are sourced from the in-repo plugin skills (single source of
// truth) and copied into the zip at pack time — never committed as per-expert
// copies.
const DEFAULT_SKILLS_DIRS = [
  path.join(ROOT, "plugin", "cloudbase", "skills"),
  path.join(ROOT, "plugin", "cloudbase-sites", "skills"),
];

const JUNK_BASENAMES = new Set([".DS_Store", ".gitkeep", "Thumbs.db"]);

function parseArgs(argv = process.argv.slice(2)) {
  const args = { outDir: null, skillsDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--") continue;
    if (a === "--out-dir") {
      args.outDir = argv[++i];
      if (!args.outDir) throw new Error("--out-dir requires a path");
    } else if (a === "--skills-dir") {
      args.skillsDir = argv[++i];
      if (!args.skillsDir) throw new Error("--skills-dir requires a path");
    } else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function listExperts() {
  if (!fs.existsSync(EXPERTS_DIR)) {
    throw new Error(`Missing experts source dir: ${EXPERTS_DIR}`);
  }
  const experts = fs
    .readdirSync(EXPERTS_DIR)
    .filter((n) => {
      if (n.startsWith(".")) return false;
      const manifest = path.join(EXPERTS_DIR, n, ".codebuddy-plugin", "plugin.json");
      return fs.existsSync(manifest);
    })
    .sort();
  if (experts.length === 0) {
    throw new Error(`No expert packages found under ${EXPERTS_DIR}`);
  }
  return experts;
}

const SKILL_MANIFEST = path.join(".codebuddy-plugin", "expert-skills.json");

/**
 * Read the optional bundled-skill list for an expert pack.
 *
 * Expert agents reference CloudBase skills by name in their markdown. The
 * publishing platform's quality gate requires every referenced skill to exist
 * inside the uploaded archive (`skills/<name>/`), so packs declare their
 * bundled skills here and the zipper copies them in from the in-repo plugin.
 */
function readBundledSkills(expertDir) {
  const manifestPath = path.join(expertDir, SKILL_MANIFEST);
  if (!fs.existsSync(manifestPath)) return [];
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest.skills)) {
    throw new Error(`${manifestPath}: "skills" must be an array`);
  }
  return manifest.skills;
}

function copyTree(src, dest) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (p) => !JUNK_BASENAMES.has(path.basename(p)),
  });
}

function zipDir(dir, arcname, outPath) {
  if (fs.existsSync(outPath)) fs.rmSync(outPath);
  execFileSync(
    "zip",
    [
      "-r",
      outPath,
      arcname,
      "-x",
      "*/node_modules/*",
      "-x",
      "*/__pycache__/*",
      "-x",
      "*.DS_Store",
    ],
    { cwd: dir, stdio: ["ignore", "ignore", "inherit"] }
  );
}

function resolveSkillDir(skill, skillsDirs) {
  for (const dir of skillsDirs) {
    const candidate = path.join(dir, skill);
    if (fs.existsSync(path.join(candidate, "SKILL.md"))) return candidate;
  }
  return null;
}

function packExpert(name, outDir, skillsDirs) {
  const expertDir = path.join(EXPERTS_DIR, name);
  const outPath = path.join(outDir, `${name}.zip`);
  if (fs.existsSync(outPath)) fs.rmSync(outPath);

  const bundled = readBundledSkills(expertDir);
  if (bundled.length === 0) {
    // cwd = plugins/experts so arcnames are naturally "<expert-name>/...".
    zipDir(EXPERTS_DIR, name, outPath);
  } else {
    const resolved = new Map();
    const missing = [];
    for (const skill of bundled) {
      const dir = resolveSkillDir(skill, skillsDirs);
      if (dir) resolved.set(skill, dir);
      else missing.push(skill);
    }
    if (missing.length > 0) {
      throw new Error(
        `${name}: bundled skill(s) not found in ${skillsDirs.join(", ")}: ${missing.join(", ")}`
      );
    }
    const staging = fs.mkdtempSync(path.join(os.tmpdir(), `pack-${name}-`));
    try {
      const dest = path.join(staging, name);
      copyTree(expertDir, dest);
      const skillsDest = path.join(dest, "skills");
      fs.mkdirSync(skillsDest, { recursive: true });
      for (const skill of bundled) {
        copyTree(resolved.get(skill), path.join(skillsDest, skill));
      }
      const manifestPath = path.join(dest, SKILL_MANIFEST);
      fs.rmSync(manifestPath, { force: true });
      const pluginJsonPath = path.join(dest, ".codebuddy-plugin", "plugin.json");
      const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
      pluginJson.skills = bundled.map((skill) => `./skills/${skill}`);
      fs.writeFileSync(
        pluginJsonPath,
        `${JSON.stringify(pluginJson, null, 2)}\n`
      );
      zipDir(staging, name, outPath);
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
    }
  }

  const size = fs.statSync(outPath).size;
  const suffix =
    bundled.length > 0 ? `, ${bundled.length} bundled skills` : "";
  console.log(`Packed: ${outPath} (${(size / 1024).toFixed(1)} KB${suffix})`);
  return outPath;
}

function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(`Pack WorkBuddy expert packages into release zips.

One zip per expert under plugins/experts/: dist/<expert-name>.zip
(version-free naming, top level = the expert directory).

Usage:
  node scripts/pack-experts.mjs
  node scripts/pack-experts.mjs --out-dir /tmp/expert-zips
`);
    return;
  }

  const experts = listExperts();
  const outDir = args.outDir || DEFAULT_OUT_DIR;
  const skillsDirs = args.skillsDir
    ? [path.resolve(args.skillsDir), ...DEFAULT_SKILLS_DIRS]
    : DEFAULT_SKILLS_DIRS;
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Experts: ${experts.join(", ")}`);
  const outs = experts.map((name) => packExpert(name, outDir, skillsDirs));

  console.log("");
  console.log(`Done: ${outs.length} expert zips in ${outDir}`);
  console.log("CI uploads them to release assets on release: published.");
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
