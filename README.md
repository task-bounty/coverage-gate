# TaskBounty Coverage Gate

A zero-dependency coverage gate for JavaScript and TypeScript projects. It reads
the coverage report your test run already produced (LCOV or Istanbul
`json-summary`), prints your current line coverage, the gap to a target (default
80%), and your lowest-covered files, and fails CI when you are below target.

No network calls, no account, no dependencies. It works with jest, vitest, nyc,
and c8, anything that can emit `lcov.info` or `coverage-summary.json`.

## Install

```bash
npm install -g taskbounty-coverage-gate
```

Or run it without installing via `npx` (shown below).

## CLI

```bash
# after running your tests with coverage
npx taskbounty-coverage-gate --min 80
```

It auto-detects `coverage/lcov.info`, `coverage/coverage-summary.json`,
`coverage-summary.json`, or `lcov.info`. Point it explicitly with `--report`:

```bash
npx taskbounty-coverage-gate --report coverage/lcov.info --min 80
```

Options:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--report <path>` | auto | Path to the LCOV or json-summary report |
| `--min <pct>` | `80` | Target line coverage |
| `--top <n>` | `5` | How many lowest-covered files to list |
| `--no-fail` | off | Report only, always exit 0 |

Example output:

```
  Coverage gate  (report: coverage/lcov.info)

  Line coverage   62.4%  ███████████████░░░░░░░░░
  Target          80.0%
  Result          BELOW target by 17.6 points

  Lowest-covered files:
     0%  src/api/webhooks.ts
    31%  src/billing/invoices.ts
    44%  src/auth/session.ts
```

Exit code is `1` when below target (so it gates CI), `0` otherwise or with
`--no-fail`.

## GitHub Action

```yaml
- name: Test with coverage
  run: npm test -- --coverage

- name: Coverage gate
  uses: task-bounty/coverage-gate@v1
  with:
    report: coverage/lcov.info
    min: 80
    # fail-under: false   # report only, do not fail the job
```

## Supported report formats

- **LCOV** (`lcov.info`): line coverage summed from `LF`/`LH` per file.
- **Istanbul json-summary** (`coverage-summary.json`): repo total plus per-file
  line percentages.

## Reaching the target

Below 80% and want to get there without the grind? TaskBounty takes a repo to
80% line coverage and delivers it as a sandbox-verified pull request, refunded
if it misses. Free coverage check for any repo:
https://www.task-bounty.com/coverage-check

## License

MIT
