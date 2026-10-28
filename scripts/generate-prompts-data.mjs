#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadYamlModule } from './lib/load-yaml-module.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const CONFIG_FILE = path.join(ROOT_DIR, 'doc/prompts/config.yaml');
// The published skill set only. The plugin bundle carries extra skills (e.g. `cloudbase`)
// that overlap with what is already published here — auto-adding them would put the same
// capability on the page twice.
const SKILL_DIRS = [path.join(ROOT_DIR, 'config/source/skills')];
const METADATA_FILE = path.join(ROOT_DIR, 'plugin/cloudbase/skill-metadata.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'doc/components/prompts.json');
const yaml = await loadYamlModule(ROOT_DIR);

/**
 * Category inference for skills that have no explicit entry in config.yaml.
 * Checked in order; the first hit wins. Guessing is deliberate — an entry that
 * lands in the wrong category is visible and fixable, a missing entry is not.
 */
const CATEGORY_RULES = [
  ['auth', /\b(auth|login|oauth|session|identity)\b|认证|登录|鉴权/i],
  ['database', /\b(database|sql|postgres|postgresql|mysql|nosql|schema|prisma|drizzle)\b|数据库|存储层/i],
  ['backend', /\b(function|deploy|cloudrun|server|backend|container)\b|云函数|部署|后端|容器/i],
  ['ai', /\b(ai|model|llm|agent|prompt)\b|大模型|模型|智能体/i],
  ['frontend', /\b(web|ui|frontend|mini-?program|wechat)\b|前端|小程序|设计|页面/i],
];
const DEFAULT_CATEGORY = 'tools';

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  try {
    return yaml.load(m[1]) || {};
  } catch {
    return {};
  }
}

/** Read every skill across both skill roots, skipping deprecated ones. */
function loadSkills() {
  const out = [];
  const seen = new Set();
  for (const dir of SKILL_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      if (seen.has(name)) continue;
      const skillFile = path.join(dir, name, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      const fm = parseFrontmatter(fs.readFileSync(skillFile, 'utf8'));
      const deprecated = String(fm?.metadata?.deprecated ?? '').toLowerCase() === 'true';
      if (deprecated) continue;
      seen.add(name);
      out.push({
        name: fm.name || name,
        description: fm.description || '',
      });
    }
  }
  return out;
}

function loadMetadata() {
  if (!fs.existsSync(METADATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8')).skills || {};
  } catch {
    return {};
  }
}

function guessCategory(skill) {
  const hay = `${skill.name} ${skill.description}`;
  for (const [cat, re] of CATEGORY_RULES) {
    if (re.test(hay)) return cat;
  }
  return DEFAULT_CATEGORY;
}

/** Title from a skill name: `cloud-storage-web` -> `Cloud Storage Web`. */
function titleFromName(name) {
  return name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Build a scene for a skill that has no config.yaml entry.
 * Prompts fall back to retrieval.examples — short and trigger-shaped, so they
 * read worse than hand-written ones. Reported as a warning, never silently shipped.
 */
function buildAutoRule(skill, meta) {
  const retrieval = meta[skill.name]?.retrieval || {};
  const examples = Array.isArray(retrieval.examples) ? retrieval.examples.filter(Boolean) : [];
  const intents = Array.isArray(retrieval.intents) ? retrieval.intents.filter(Boolean) : [];
  const desc =
    (intents.length > 0 ? intents.slice(0, 2).join('；') : '') ||
    String(skill.description || '').replace(/^\[Deprecated\][^.]*\.\s*/i, '').slice(0, 80);
  return {
    id: skill.name,
    skill: skill.name,
    title: titleFromName(skill.name),
    description: desc || skill.name,
    shortDescription: desc || skill.name,
    category: guessCategory(skill),
    order: 999,
    prompts: examples,
    _auto: true,
  };
}

function generatePromptsData() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error(`Config file not found: ${CONFIG_FILE}`);
    process.exit(1);
  }

  const config = yaml.load(fs.readFileSync(CONFIG_FILE, 'utf8'));
  if (!config?.rules || !Array.isArray(config.rules)) {
    console.error('Invalid config: rules array not found');
    process.exit(1);
  }

  const skills = loadSkills();
  const metadata = loadMetadata();
  const byId = new Map(skills.map((s) => [s.name, s]));

  // 1. config.yaml first — its order and wording win
  const result = [];
  const seen = new Set();
  for (const rule of config.rules) {
    result.push({
      id: rule.id,
      // `skill` lets one skill back several scenes (e.g. issue-report -> cloudbase-mcp).
      // Falls back to the scene id, which is the common case.
      skill: rule.skill || rule.id,
      title: rule.title,
      description: rule.description,
      shortDescription: rule.shortDescription || rule.description,
      category: rule.category,
      order: rule.order,
      // core | normal | secondary — drives grouping and visual weight on the page.
      weight: rule.weight || 'normal',
      // Explicit order within the core band; core reads as a user journey, not a category list.
      rank: rule.rank,
      prompts: rule.prompts || [],
    });
    seen.add(rule.id);
  }

  // 2. every remaining skill gets a generated scene
  const autoAdded = [];
  for (const skill of skills) {
    if (seen.has(skill.name)) continue;
    const rule = buildAutoRule(skill, metadata);
    result.push(rule);
    autoAdded.push(rule);
    seen.add(skill.name);
  }

  const promptsData = result.map(({ _auto, ...rest }) => rest);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(promptsData, null, 2) + '\n', 'utf8');

  console.log(`✅ Generated: ${OUTPUT_FILE}`);
  console.log(`📊 Scenes: ${promptsData.length}  Prompts: ${promptsData.reduce((n, r) => n + r.prompts.length, 0)}`);
  console.log(`   from config.yaml: ${config.rules.length}`);
  console.log(`   auto-generated:   ${autoAdded.length}`);

  if (autoAdded.length > 0) {
    console.log('\n⚠️  Auto-generated scenes — review these in doc/prompts/config.yaml:');
    for (const r of autoAdded) {
      const flag = r.prompts.length === 0 ? '（无提示词，页面会空）' : `（${r.prompts.length} 条，来自 retrieval.examples）`;
      console.log(`   - ${r.id}  →  category=${r.category} ${flag}`);
    }
  }

  // Skills on disk that config.yaml dropped — surfaces staleness in the other direction
  const stale = config.rules.map((r) => r.id).filter((id) => !byId.has(id));
  if (stale.length > 0) {
    console.log('\n⚠️  In config.yaml but no such skill on disk — remove or fix:');
    for (const id of stale) console.log(`   - ${id}`);
  }
}

generatePromptsData();
