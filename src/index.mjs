#!/usr/bin/env node
// taskbounty-coverage-gate
// Reads an existing coverage report, prints current line coverage, the gap to
// a target (default 80%), and the lowest-covered files, and optionally fails
// CI when below target. Zero dependencies, zero network calls.

import fs from "node:fs";
import path from "node:path";
import { parseReport } from "./parse.mjs";

const CANDIDATES = [
  "coverage/lcov.info",
  "coverage/coverage-summary.json",
  "coverage-summary.json",
  "lcov.info",
];

function parseArgs(argv) {
  const args = { min: 80, report: null, fail: true, top: 5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--min") args.min = Number(argv[++i]);
    else if (a === "--report") args.report = argv[++i];
    else if (a === "--top") args.top = Number(argv[++i]);
    else if (a === "--no-fail") args.fail = false;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function findReport(explicit) {
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  for (const c of CANDIDATES) if (fs.existsSync(c)) return c;
  return null;
}

const HELP = `taskbounty-coverage-gate

Usage:
  npx taskbounty-coverage-gate [--report <path>] [--min <pct>] [--top <n>] [--no-fail]

Reads a coverage report (LCOV or Istanbul json-summary) your test run already
produced and reports line coverage, the gap to a target, and the lowest-covered
files. Exits non-zero when below the target unless --no-fail.

Options:
  --report <path>  Path to lcov.info or coverage-summary.json (auto-detected if omitted)
  --min <pct>      Target line coverage. Default 80
  --top <n>        How many low-coverage files to list. Default 5
  --no-fail        Always exit 0 (report only, do not gate CI)
`;

function bar(p) {
  const width = 24;
  const filled = Math.round((Math.max(0, Math.min(100, p)) / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (!Number.isFinite(args.min)) {
    console.error("coverage-gate: --min must be a number");
    return 2;
  }

  const reportPath = findReport(args.report);
  if (!reportPath) {
    console.error(
      "coverage-gate: no coverage report found. Run your tests with coverage first " +
        "(e.g. jest --coverage, vitest run --coverage, or c8), then point --report at " +
        "the lcov.info or coverage-summary.json it produced.",
    );
    return 2;
  }

  let parsed;
  try {
    parsed = parseReport(reportPath, fs.readFileSync(reportPath, "utf8"));
  } catch (err) {
    console.error(`coverage-gate: could not parse ${reportPath}: ${err.message}`);
    return 2;
  }

  const cur = parsed.total.pct;
  const gap = args.min - cur;
  const passed = cur >= args.min;

  const low = [...parsed.files]
    .filter((f) => f.found > 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, Math.max(0, args.top));

  const lines = [];
  lines.push("");
  lines.push(`  Coverage gate  (report: ${path.relative(process.cwd(), reportPath) || reportPath})`);
  lines.push("");
  lines.push(`  Line coverage   ${cur.toFixed(1)}%  ${bar(cur)}`);
  lines.push(`  Target          ${args.min.toFixed(1)}%`);
  lines.push(
    passed
      ? `  Result          PASS  (at or above target)`
      : `  Result          BELOW target by ${gap.toFixed(1)} points`,
  );
  if (!passed && low.length) {
    lines.push("");
    lines.push("  Lowest-covered files:");
    for (const f of low) {
      lines.push(`    ${f.pct.toFixed(0).padStart(3)}%  ${f.path}`);
    }
  }
  lines.push("");
  lines.push("  Want these to 80%, verified before you merge? https://www.task-bounty.com/coverage-check");
  lines.push("");
  process.stdout.write(lines.join("\n") + "\n");

  return passed || !args.fail ? 0 : 1;
}

process.exit(main());
