# Test Isolation and Pools

Status: active  
Owner: testing/runtime  
Scope: root vitest execution model (`vitest.config.ts`, `vitest.isolation.ts`, `tests/config/isolationQuarantine.test.ts`); does not cover the smoke suite (`vitest.smoke.config.ts`) or the UI suite (`ui/`)

## Purpose

The root vitest suite (~420 files) used to run every test file in a fresh
child process with a fresh module registry. The shared setup file
(`tests/setup/metricsEnv.ts`) imports the `src/v11/defaults/**` modules, which
register the default dependency wiring as an import-time side effect and pull
in the whole infrastructure layer behind them. Per-file isolation therefore
re-evaluated that import graph once per test file: cumulative setup cost was
~130–165s per run, dominating the suite.

The suite now runs as two vitest projects:

- `main`: all root test files except the quarantine, on the **forks pool with
  `isolate: false`** — each worker keeps its module registry across files, so
  the defaults graph is evaluated once per worker instead of once per file.
- `isolated`: the quarantined module-mocking files, on the **threads pool**,
  which keeps the default per-file isolation.

Measured effect at introduction: solo root suite ~45s → ~24s; full
`pnpm ci:local` ~67s → ~57s. Coverage is unchanged.

## How the split works

Vitest creates one pool per pool type and reads pool isolate flags **from the
root config only**; a project-level `isolate` (or `poolOptions`) setting is
silently ignored. What a project *can* choose is its pool type. Isolation is
therefore steered indirectly, and four config facts must hold together:

| Fact | Where | Effect |
|---|---|---|
| `poolOptions.forks.isolate: false` | root config | forks pool shares each worker's module registry |
| `poolOptions.threads` left unset | root config | threads pool keeps default per-file isolation |
| `main` project has no `pool` override | project | main files run on the (unisolated) forks pool |
| `isolated` project sets `pool: "threads"` | project | quarantined files run isolated |

Breaking any one of these fails silently — either as a slowdown (everything
isolated again) or as nondeterministic mock leakage (nothing isolated). The
guard test asserts all four deterministically.

A second vitest 3 gotcha encoded in the config: inline projects with
`extends: true` **merge** inherited arrays, so `include`/`exclude` globs must
live on the projects only — root-level globs would leak into both projects
and double-run the suite.

## The quarantine rule

A test file must be listed in `vitest.isolation.ts` when it uses any of:

- `vi.mock(` / `vi.doMock(` / `vi.doUnmock(` / `vi.unmock(`
- `vi.resetModules(`

These APIs manipulate the module registry. In a shared registry they break in
both directions: the mock silently fails to apply when another file already
loaded the real module in the same worker, and an applied mock or registry
reset leaks into files that run afterwards. Failures are order-dependent and
nondeterministic, which is why the rule is enforced mechanically instead of
by review.

The guard test (`tests/config/isolationQuarantine.test.ts`) fails the suite
when a file using those APIs is missing from the list, when the list contains
a deleted file, or when the pool wiring above drifts.

## Constraints

- Quarantined files run on the threads pool, so they must be
  worker-thread-compatible — most notably **no `process.chdir`**, which is
  unavailable in worker threads. If a module-mocking test ever also needs
  `chdir`, this setup must be revisited (e.g. a third, forks-based isolated
  project — accepting that vitest only allows that if pool isolate flags stay
  root-level).
- Tests in the `main` project share module-level state within a worker. New
  tests there must not rely on being the first to import a module, and should
  reset any module-level state they mutate.

## Canonical sources

- pool and project wiring: `vitest.config.ts`
- quarantine list: `vitest.isolation.ts`
- enforcement: `tests/config/isolationQuarantine.test.ts`
- smoke-layer testing strategy (separate concern):
  [almost-e2e-smoke-suite.md](almost-e2e-smoke-suite.md)
