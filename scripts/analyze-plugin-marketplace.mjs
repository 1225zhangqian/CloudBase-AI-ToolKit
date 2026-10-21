#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadMatrix } from "./lib/plugin-marketplace-matrix.mjs";
import { analyzeMatrix, writeReports } from "./lib/plugin-marketplace-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const opts = {
    matrix: path.join(ROOT_DIR, "specs/plugin-marketplace-listing/markets.yaml"),
    out: path.join(ROOT_DIR, "specs/plugin-marketplace-listing/reports"),
    strict: false,
    online: false,
    jsonOnly: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--matrix") opts.matrix = path.resolve(argv[++i]);
    else if (arg === "--out") opts.out = path.resolve(argv[++i]);
    else if (arg === "--strict") opts.strict = true;
    else if (arg === "--online") opts.online = true;
    else if (arg === "--json-only") opts.jsonOnly = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

const PROBE_UA =
  "Mozilla/5.0 (compatible; cloudbase-marketplace-probe/1.0; +https://github.com/TencentCloudBase/CloudBase-AI-Toolkit)";

/**
 * Probe a single URL. Uses GET (not HEAD) because plenty of sites answer HEAD
 * with 403/405 while GET works, and it reads a small prefix of the body so that
 * SPA fallback shells (HTTP 200/404 + app shell) are reported as inconclusive
 * instead of silently counting as "reachable".
 *
 * Status semantics:
 * - ok           2xx and the body is not a fallback shell
 * - inconclusive 403 / 429, or a 2xx/404 that is an SPA shell / 404 page
 * - not_found    404 with a real (non-shell) body
 * - error        5xx, DNS failure, timeout
 *
 * @param {string} url
 */
async function probeUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": PROBE_UA,
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    });
    const status = res.status;
    if (status >= 500) {
      return { url, status: "error", detail: `http_${status}` };
    }
    if (status === 403 || status === 429) {
      return { url, status: "inconclusive", detail: `http_${status}` };
    }

    let body = "";
    try {
      body = (await res.text()).slice(0, 6000);
    } catch {
      body = "";
    }
    const canonical404 = /canonical"\s+href="[^"]*\/404\.html?/i.test(body);
    const appShell =
      /<div id="root"><\/div>|<div id="__next"><\/div>|data-has-hydrated=/i.test(body);

    if (status === 404) {
      return canonical404 || appShell
        ? { url, status: "inconclusive", detail: "http_404_spa_shell" }
        : { url, status: "not_found", detail: "http_404" };
    }
    if (status >= 200 && status < 300) {
      if (canonical404) {
        return { url, status: "inconclusive", detail: "http_200_but_canonical_404" };
      }
      return { url, status: "ok", detail: `http_${status}` };
    }
    return { url, status: "inconclusive", detail: `http_${status}` };
  } catch (err) {
    return {
      url,
      status: "error",
      detail: `fetch_error:${err?.name || "Error"}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string[]} urls
 */
async function probeUrls(urls) {
  const results = [];
  for (const url of urls) {
    if (!/^https?:\/\//i.test(url)) {
      results.push({ url, status: "skipped_non_http", detail: "" });
      continue;
    }
    results.push(await probeUrl(url));
  }
  return results;
}

function printHelp() {
  console.log(`Usage: node scripts/analyze-plugin-marketplace.mjs [options]

Options:
  --matrix <path>   Path to markets.yaml
  --out <dir>       Output directory for latest.md / latest.json
  --strict          Exit 1 on missing/invalid required local evidence
  --online          Probe http(s) evidence_links / submit URLs
  --json-only       Write JSON only
  -h, --help        Show help
`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  // The matrix lives in an internal-only directory (specs/ is gitignored), so a
  // public checkout legitimately has no markets.yaml. Skip cleanly instead of
  // throwing: CI and fresh clones should look "nothing to do", not "broken".
  if (!fs.existsSync(opts.matrix)) {
    console.log(
      `No matrix at ${opts.matrix} — this directory is internal-only. Nothing to analyze.`,
    );
    return;
  }

  const matrix = loadMatrix(opts.matrix);

  let onlineResults = [];
  if (opts.online) {
    const urls = new Set();
    for (const market of matrix.markets) {
      for (const link of market.evidence_links || []) {
        if (/^https?:\/\//i.test(link)) urls.add(link);
      }
      const processText = String(market.submit_url_or_process || "");
      for (const match of processText.match(/https?:\/\/[^\s)]+/g) || []) {
        urls.add(match.replace(/[.,]$/, ""));
      }
    }
    onlineResults = await probeUrls([...urls]);
  }

  const report = analyzeMatrix({
    matrix,
    rootDir: ROOT_DIR,
    onlineResults,
  });

  const written = writeReports(opts.out, report, { jsonOnly: opts.jsonOnly });
  console.log(`Wrote ${written.jsonPath}`);
  if (written.mdPath) console.log(`Wrote ${written.mdPath}`);
  console.log(
    `Summary: ${PRIORITY_SUMMARY(report.summary)} (total ${report.total_markets})`,
  );

  if (opts.strict) {
    const criticalMissing = report.markets.filter((m) => {
      if (!["ready_to_submit", "needs_packaging_or_manifest", "listed"].includes(m.priority)) {
        return false;
      }
      return (m.local_evidence || []).some(
        (e) => e.status === "missing" || e.status === "invalid",
      );
    });
    if (criticalMissing.length > 0) {
      console.error(
        `Strict mode: ${criticalMissing.length} market(s) have missing/invalid local evidence: ${criticalMissing.map((m) => m.id).join(", ")}`,
      );
      process.exitCode = 1;
    }
  }
}

function PRIORITY_SUMMARY(summary) {
  return Object.entries(summary)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
