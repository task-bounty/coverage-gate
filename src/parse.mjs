// Zero-dependency coverage-report parsers. Supports the two formats every
// common JS/TS coverage tool can emit: LCOV (jest, vitest, nyc, c8) and
// Istanbul json-summary (coverage-summary.json). Each parser returns:
//   { total: { found, hit, pct }, files: [{ path, found, hit, pct }] }
// where pct is line coverage. files may be empty when a format lacks per-file
// line data.

function pct(hit, found) {
  if (!found || found <= 0) return 0;
  return (100 * hit) / found;
}

/**
 * Parse an LCOV info file. We sum LF (lines found) and LH (lines hit) per
 * record (SF = source file), which is exactly how line coverage is computed.
 */
export function parseLcov(text) {
  const files = [];
  let curPath = null;
  let lf = 0;
  let lh = 0;
  let totFound = 0;
  let totHit = 0;

  const flush = () => {
    if (curPath != null) {
      files.push({ path: curPath, found: lf, hit: lh, pct: pct(lh, lf) });
      totFound += lf;
      totHit += lh;
    }
    curPath = null;
    lf = 0;
    lh = 0;
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("SF:")) {
      flush();
      curPath = line.slice(3).trim();
    } else if (line.startsWith("LF:")) {
      lf = parseInt(line.slice(3), 10) || 0;
    } else if (line.startsWith("LH:")) {
      lh = parseInt(line.slice(3), 10) || 0;
    } else if (line === "end_of_record") {
      flush();
    }
  }
  flush();

  return { total: { found: totFound, hit: totHit, pct: pct(totHit, totFound) }, files };
}

/**
 * Parse Istanbul coverage-summary.json (json-summary reporter). The "total"
 * key holds repo-wide line coverage; other keys are absolute file paths.
 */
export function parseJsonSummary(json) {
  const obj = typeof json === "string" ? JSON.parse(json) : json;
  const total = obj.total?.lines ?? {};
  const files = [];
  for (const [key, val] of Object.entries(obj)) {
    if (key === "total") continue;
    const lines = val?.lines;
    if (!lines || typeof lines.pct !== "number") continue;
    files.push({
      path: key,
      found: lines.total ?? 0,
      hit: lines.covered ?? 0,
      pct: lines.pct,
    });
  }
  return {
    total: {
      found: total.total ?? 0,
      hit: total.covered ?? 0,
      pct: typeof total.pct === "number" ? total.pct : pct(total.covered ?? 0, total.total ?? 0),
    },
    files,
  };
}

/**
 * Parse whichever format `content` is, inferred from `path` extension and a
 * content sniff. Returns the normalized shape above.
 */
export function parseReport(path, content) {
  const looksJson = /\.json$/i.test(path) || content.trimStart().startsWith("{");
  if (looksJson) return parseJsonSummary(content);
  return parseLcov(content);
}
