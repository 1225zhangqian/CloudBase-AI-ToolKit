#!/usr/bin/env node
/**
 * 校验 doc/（中文，真源）与 doc/en/（英文）是否对位。
 *
 * 检查三件事：
 *   1. 文件对位：doc/ 里除 en/ 之外的每个文件，doc/en/ 都得有同名对应；反向也不能多。
 *   2. 结构对位：同名 .md/.mdx 的标题数、代码块数要一致 —— 结构差太多说明译文没跟上。
 *   3. 中文残留：英文文件里汉字过多，多半是整段没翻。
 *
 * 对位失败是 ERROR（退出码 1）；结构和残留先按 WARN 报，不阻塞。
 *
 * 用法：node scripts/check-doc-en-parity.mjs
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "doc";
const EN = join(ROOT, "en");

function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === ".DS_Store") continue;
    if (dir === ROOT && name === "en") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, base));
    else out.push(relative(base, p).split("\\").join("/"));
  }
  return out.sort();
}

const stats = (txt) => ({
  headings: (txt.match(/^#{1,6}\s/gm) || []).length,
  fences: Math.floor((txt.match(/^```/gm) || []).length / 2),
});

// 以 -zh.md 结尾的是中文专用材料（如上架文案），不需要英文镜像
/**
 * 找「几乎整行都是中文」的行。
 * <details> 里是 SKILL.md 原文，不参与判断；
 * `**精选** (Featured)` 这种 UI 原文加英文注解的行中文占比低，也不会命中。
 */
function unlocalizedLines(txt) {
  const out = [];
  let inDetails = false;
  txt.split("\n").forEach((line, i) => {
    if (/<details/.test(line)) { inDetails = true; return; }
    if (/<\/details>/.test(line)) { inDetails = false; return; }
    if (inDetails) return;
    const dense = line.replace(/\s/g, "");
    if (!dense) return;
    const cjk = (line.match(/[\u4e00-\u9fa5]/g) || []).length;
    if (cjk / dense.length > 0.5) out.push({ line: i + 1, text: line.trim().slice(0, 60) });
  });
  return out;
}

const zhFiles = walk(ROOT).filter((f) => !/-zh.md$/.test(f));
// README 是这棵树的说明，不是文档页，不参与对位
const enFiles = walk(EN).filter((f) => f !== "README.md");
const enSet = new Set(enFiles);
const zhSet = new Set(zhFiles);
const errors = [];
const warns = [];

for (const f of zhFiles) if (!enSet.has(f)) errors.push(`缺英文对应：doc/en/${f}`);
for (const f of enFiles) if (!zhSet.has(f)) errors.push(`doc/en/${f} 在 doc/ 里没有对应文件`);

for (const f of zhFiles) {
  if (!/\.mdx?$/.test(f) || !enSet.has(f)) continue;
  const zh = readFileSync(join(ROOT, f), "utf8");
  const en = readFileSync(join(EN, f), "utf8");
  const a = stats(zh);
  const b = stats(en);
  if (a.headings !== b.headings) {
    warns.push(`标题数不一致 ${f}：中 ${a.headings} / 英 ${b.headings}`);
  }
  if (a.fences !== b.fences) {
    warns.push(`代码块数不一致 ${f}：中 ${a.fences} / 英 ${b.fences}`);
  }
  const left = unlocalizedLines(en);
  if (left.length) {
    const sample = left.slice(0, 3).map((x) => `L${x.line} ${x.text}`).join(" | ");
    warns.push(`英文文件有 ${left.length} 行几乎全中文 ${f}：${sample}`);
  }
}

console.log(`doc 文件数 ${zhFiles.length} / doc/en 文件数 ${enFiles.length}`);

if (errors.length) {
  console.error(`\n✗ ${errors.length} 处对位问题：`);
  for (const e of errors) console.error("  " + e);
}
if (warns.length) {
  console.warn(`\n⚠ ${warns.length} 处待跟进（不阻塞）：`);
  for (const w of warns.slice(0, 40)) console.warn("  " + w);
  if (warns.length > 40) console.warn(`  ...另有 ${warns.length - 40} 处`);
}

if (errors.length) {
  console.error("\n对位检查未通过。补齐 doc/en/ 后重试。");
  process.exit(1);
}
console.log("\n✓ doc/en 与 doc 对位检查通过");
