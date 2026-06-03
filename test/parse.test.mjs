import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLcov, parseJsonSummary, parseReport } from "../src/parse.mjs";

test("parseLcov sums LF/LH across records", () => {
  const lcov = [
    "SF:src/a.ts",
    "LF:10",
    "LH:8",
    "end_of_record",
    "SF:src/b.ts",
    "LF:20",
    "LH:5",
    "end_of_record",
  ].join("\n");
  const r = parseLcov(lcov);
  assert.equal(r.total.found, 30);
  assert.equal(r.total.hit, 13);
  assert.ok(Math.abs(r.total.pct - (1300 / 30)) < 0.001);
  assert.equal(r.files.length, 2);
  assert.equal(r.files[1].path, "src/b.ts");
  assert.equal(r.files[1].pct, 25);
});

test("parseLcov handles zero found without dividing by zero", () => {
  const r = parseLcov("SF:src/empty.ts\nLF:0\nLH:0\nend_of_record");
  assert.equal(r.total.pct, 0);
});

test("parseJsonSummary reads total + per-file line pct", () => {
  const json = {
    total: { lines: { total: 100, covered: 73, pct: 73 } },
    "/repo/src/a.ts": { lines: { total: 50, covered: 50, pct: 100 } },
    "/repo/src/b.ts": { lines: { total: 50, covered: 23, pct: 46 } },
  };
  const r = parseJsonSummary(json);
  assert.equal(r.total.pct, 73);
  assert.equal(r.files.length, 2);
  assert.equal(r.files.find((f) => f.path.endsWith("b.ts")).pct, 46);
});

test("parseReport infers JSON vs LCOV", () => {
  const fromJson = parseReport("x.json", JSON.stringify({ total: { lines: { pct: 90 } } }));
  assert.equal(fromJson.total.pct, 90);
  const fromLcov = parseReport("x.info", "SF:a\nLF:4\nLH:2\nend_of_record");
  assert.equal(fromLcov.total.pct, 50);
});
