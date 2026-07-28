#!/usr/bin/env node
// scripts/build-skill-manifest.mjs
// Scans plugin/cloudbase/skills/*/SKILL.md → parses frontmatter → compiles glob patterns → outputs generated/skill-manifest.json
// This manifest is loaded at runtime by skill-inject-core.mjs for fast skill matching.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const pluginRoot = join(projectRoot, "plugin", "cloudbase");
const skillsDir = join(pluginRoot, "skills");
const outputPath = join(pluginRoot, "generated", "skill-manifest.json");

// --- YAML frontmatter parser (using js-yaml for correctness) ---

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };
  return {
    frontmatter: yaml.load(match[1]) || {},
    body: match[2],
  };
}

// --- Glob to regex source ---

function globToRegexSource(glob) {
  let regex = glob;
  regex = regex.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  regex = regex.replace(/\*\*/g, "::DOUBLESTAR::");
  regex = regex.replace(/\*/g, "[^/]*");
  regex = regex.replace(/\?/g, ".");
  regex = regex.replace(/::DOUBLESTAR::/g, ".*");
  return `^${regex}$`;
}

// Directory renames (legacy key → current dir). Used to preserve enriched
 // promptSignals/retrieval/priority when SKILL.md frontmatter lacks them.
const LEGACY_MANIFEST_KEYS = {
  "auth-nodejs": "auth-nodejs-cloudbase",
  "auth-tool": "auth-tool-cloudbase",
  "auth-web": "auth-web-cloudbase",
  "auth-wechat": "auth-wechat-miniprogram",
  "http-api": "http-api-cloudbase",
  "no-sql-web-sdk": "cloudbase-document-database-web-sdk",
  "no-sql-wx-mp-sdk": "cloudbase-document-database-in-wechat-miniprogram",
  "postgresql-development": "postgresql-development-cloudbase",
  "relational-database-tool": "relational-database-mcp-cloudbase",
  "relational-database-web": "relational-database-web-cloudbase",
  "cloudbase-guidelines": "cloudbase",
};

function loadPreviousSkills() {
  if (!existsSync(outputPath)) return {};
  try {
    const previous = JSON.parse(readFileSync(outputPath, "utf-8"));
    return previous?.skills && typeof previous.skills === "object" ? previous.skills : {};
  } catch {
    return {};
  }
}

function findPreviousSkill(previousSkills, dirName, skillName) {
  const candidates = [];
  if (previousSkills[dirName]) candidates.push(previousSkills[dirName]);
  for (const [legacy, current] of Object.entries(LEGACY_MANIFEST_KEYS)) {
    if (current === dirName && previousSkills[legacy]) {
      candidates.push(previousSkills[legacy]);
    }
  }
  if (skillName && previousSkills[skillName]) {
    candidates.push(previousSkills[skillName]);
  }
  // Prefer an enriched previous entry (hand-maintained promptSignals/retrieval)
  // over a freshly regenerated stub with empty phrases.
  return (
    candidates.find((entry) => hasPromptPhrases(entry?.promptSignals) || hasRetrievalData(entry?.retrieval)) ||
    candidates[0] ||
    null
  );
}

function hasPromptPhrases(signals) {
  return Array.isArray(signals?.phrases) && signals.phrases.length > 0;
}

function hasRetrievalData(retrieval) {
  if (!retrieval || typeof retrieval !== "object") return false;
  return ["aliases", "intents", "entities", "examples"].some(
    (key) => Array.isArray(retrieval[key]) && retrieval[key].length > 0
  );
}

// --- Build manifest ---

function buildManifest() {
  if (!existsSync(skillsDir)) {
    console.error(`Skills directory not found: ${skillsDir}`);
    process.exit(1);
  }

  const previousSkills = loadPreviousSkills();
  const skills = {};
  let skippedDeprecated = 0;
  let entry;
  try {
    entry = readdirSync(skillsDir, { withFileTypes: true });
  } catch (error) {
    console.error(`Failed to read skills directory: ${error.message}`);
    process.exit(1);
  }

  for (const dir of entry) {
    if (!dir.isDirectory()) continue;
    const skillPath = join(skillsDir, dir.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;

    const content = readFileSync(skillPath, "utf-8");
    const { frontmatter } = parseFrontmatter(content);

    const metadata = frontmatter.metadata || {};
    // Skip deprecated skills — they remain in the directory for manual reference
    // but are excluded from the manifest so skill-inject hooks won't auto-inject them.
    const deprecated =
      metadata.deprecated === true ||
      metadata.deprecated === "true" ||
      metadata.deprecated === 1 ||
      metadata.deprecated === "1";
    if (deprecated) {
      skippedDeprecated++;
      continue;
    }
    const pathPatterns = Array.isArray(metadata.pathPatterns) ? metadata.pathPatterns : [];
    const bashPatterns = Array.isArray(metadata.bashPatterns) ? metadata.bashPatterns : [];
    const skillName = frontmatter.name || dir.name;
    const previous = findPreviousSkill(previousSkills, dir.name, skillName);

    const priorityRaw =
      metadata.priority ?? previous?.metadata?.priority ?? 5;
    const priority = typeof priorityRaw === "number" ? priorityRaw : Number(priorityRaw);

    const promptSignals = hasPromptPhrases(frontmatter.promptSignals)
      ? frontmatter.promptSignals
      : hasPromptPhrases(previous?.promptSignals)
        ? previous.promptSignals
        : { phrases: [], minScore: 6 };

    const retrieval = hasRetrievalData(frontmatter.retrieval)
      ? frontmatter.retrieval
      : hasRetrievalData(previous?.retrieval)
        ? previous.retrieval
        : { aliases: [], intents: [], entities: [], examples: [] };

    skills[dir.name] = {
      name: skillName,
      description: frontmatter.description || "",
      version: frontmatter.version,
      metadata: {
        priority: Number.isFinite(priority) ? priority : 5,
        ...(metadata.docs ? { docs: metadata.docs } : {}),
      },
      promptSignals,
      retrieval,
      pathRegexSources: pathPatterns.map(globToRegexSource),
      bashPatterns: bashPatterns,
    };
  }

  const manifest = {
    version: 2,
    generatedAt: new Date().toISOString(),
    skills,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");

  const skillCount = Object.keys(skills).length;
  const totalBytes = Buffer.byteLength(JSON.stringify(manifest), "utf-8");
  console.log(`✓ Generated ${outputPath}`);
  console.log(`  Skills: ${skillCount}`);
  console.log(`  Size: ${(totalBytes / 1024).toFixed(1)} KB`);

  // Validation summary
  const withPromptSignals = Object.values(skills).filter((s) => s.promptSignals?.phrases?.length > 0).length;
  const withRetrieval = Object.values(skills).filter((s) => s.retrieval?.aliases?.length > 0).length;
  const withPathPatterns = Object.values(skills).filter((s) => s.pathRegexSources?.length > 0).length;
  console.log(`  With promptSignals: ${withPromptSignals}/${skillCount}`);
  console.log(`  With retrieval: ${withRetrieval}/${skillCount}`);
  console.log(`  With pathPatterns: ${withPathPatterns}/${skillCount}`);
  if (skippedDeprecated > 0) {
    console.log(`  Skipped deprecated: ${skippedDeprecated}`);
  }

  if (withPromptSignals < skillCount) {
    console.warn(`⚠ ${skillCount - withPromptSignals} skills missing promptSignals (skill-inject will not match them)`);
  }
}

buildManifest();
