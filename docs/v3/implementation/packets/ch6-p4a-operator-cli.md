# Task Packet: ch6-P4a — the operator CLI, normal entrypoint + ADR-009

Plan step: plan.md §6.5. Autonomy stage: calibration — **pre-approve**
(first-of-a-kind: new top-level module + boundary ADR + the operator
nonce family's first consumer). Approved after TWO refine rounds
(round 1: production activation/config, dev under-specification →
P4a/P4b split, write-boundary correction, channel determinism;
round 2: canonical error-doc schema, config-vs-integrity exit split).

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [],
    "rejections": [],
    "invariants": [],
    "traces": [],
    "shared_ownership": []
  }
}
```

(Empty by design — the ch-6 precedent; the CLI adds ZERO kernel
semantics.)

## Claim + dimensions (chapter rule 1 — enumerated BEFORE deriving)

**Claim:** every verb is a THIN client — the underlying surface's answer
rendered faithfully as JSON with the matrix exit code; writes enter
ONLY through `kernel.startInstance` / `ingress.submit`; the dev
capability set is unreachable from the normal entrypoint; the shipped
entrypoint actually runs.

1. **Verb ↔ surface fidelity** — list/detail/timeline/bundle mirror
   the floor; submit prints the protocol outcome as DATA always.
2. **Exit classes** — all four (0/2/3/1) driven per the matrices below.
3. **Write boundary** — `no-restricted-syntax` on `src/cli/**` bans
   `.commitTransition(` / `.createInstance(` call shapes (executed
   probes, BOTH shapes red); positive paths: `start` →
   `kernel.startInstance`, `submit` → `ingress.submit`.
4. **Entrypoint separation** — the production lint entry covers
   `src/cli/**` with `src/cli/dev/**` as the ONE ignores-exemption;
   executed probes: cli→testkit RED, cli/dev→testkit CLEAN.
5. **Id/nonce injection** — deterministic test sources; a fixed nonce
   re-derives the same `op_id` → `Duplicate` at exit 0 (ADR-004
   operator-family semantics driven from CLI level); production binds
   crypto (`runtime.ts`).
6. **Tail verb** — NDJSON rows, cross-handle commit staged by the
   scripted wait, completion on terminal; error lanes per the tail
   error contract (P2).
7. **Template drift-pin** — `builtinTemplate()` deep-equals the
   testkit `fixtureTemplate()` (MD-1 extended; ch 8 retires both).
8. **Last-mile smoke** — start → detail through the REAL
   `cli/main.ts` process via the root `tsx` bridge.

## Runtime config matrix (the config owner is `cli/runtime.ts` + the main resolver)

| Key | Precedence | Default | Missing/bad |
|---|---|---|---|
| DB path | `--db` > `PAIRFLOW_V3_DB` | none — required | missing/empty → **usage (2)**; store-OPEN failure (ADR-003 fail-closed, IO) → **internal (1)** |
| poll gap | `--poll-ms` | 250 | not a nonneg safe int → 2 |
| template | `--template` | `local-pair-v0@1` | bad `id@version` form → 2; unknown ref → 3 |
| actor id | `--actor` (submit) | `operator` | — |

## Channel + error contract (canonical)

**Channel rule:** stdout = data documents ONLY (one JSON per verb;
tail: NDJSON rows; protocol outcomes incl. stale/rejected are data).
Every failure = ONE stderr document + the class exit code; on tail
failure the already-emitted rows stay parseable.

**Error document (keyset-tested per class):**
`{ "error": { "class": "usage"|"not_found"|"internal", "name", "message"[, "details"] } }`

| Exit | Class | Lanes |
|---|---|---|
| 0 | success | committed / started / **duplicate** (idempotent success, IC-A1) / read hit / tail completion |
| 2 | usage/config | unknown verb·flag, missing db, bad payload JSON, bad `--expected-version`·`--override`·template form, invalid cursor (`RangeError`), bad poll-ms, start input failure (binding coverage — coded; unreachable with the builtin template's defaults, activates with ch-8 templates) |
| 3 | not-found / kernel-negative | stale·rejected (DATA on stdout), unknown instance (reads, `TailUnknownInstanceError`), unknown template |
| 1 | internal/integrity | store open fail-closed, `TailIntegrityError`, unexpected |

## Parse-contract matrix (submit/start)

| Case | Behavior |
|---|---|
| `--payload` absent | envelope WITHOUT payload key (absent ≠ null — emit-digest arity rule) |
| `--payload 'null'` | JSON `null` payload |
| bad/empty payload JSON | 2 |
| `--expected-version` not nonneg safe int | 2 |
| `--override` without `=` | 2 |
| `--override unknown=x` | 2 + `details.validRoles` (the kernel would ignore it silently — the thin client catches the typo, zero semantics) |
| duplicate outcome | 0; `outcome.kind` IS the signal |

## Write-entrypoint matrix

| Verb | Surface | Writes |
|---|---|---|
| list / detail / timeline / tail / bundle | floor · `createTail` · exporter (default `redactPayloadsPolicy` — REV-BUNDLE-DEFAULT-POLICY) | read-only |
| start | `kernel.startInstance` (id minted CLI-side, injected source) | through the kernel |
| submit | `ingress.submit`, `op_id = deriveOperatorOpId(nonce)` | through ingress |
| — | direct `StorePort.commitTransition` / `.createInstance` | **lint-banned in `src/cli/**`** |

## Operative material

- ADR-009 (accepted; amends ADR-001 + ADR-005): module row, dev
  boundary, write boundary, `parseArgs` stdlib pick, ROOT `v3:cli`
  tsx-bridge activation (native Node type-stripping cannot resolve
  `.js`-specifier TS imports; zero new deps — root already ships tsx).
- The production `TailWait` timer binding (`realTimerTailWait`) lands
  HERE per the P2 packet's deferral; the declared 0ms-smoke exception
  was NOT needed — the tail tests stage everything on the scripted
  wait, and the shipped-entrypoint smoke exercises real wiring without
  a mid-tail wait (already-terminal + short runs).
- `runCli(argv, deps, sinks)` is the unit seam; `productionDeps()` is
  the ONE real-resource binding point; the smoke proves the shipped
  script — the packet claims activation exactly as far as the smoke
  proves it.

## Embedding gates (v1-inherited)

- Target files: `v3/src/cli/{contract,templates,runtime,main}.ts`
  (new), `v3/src/cli/{cli,templates}.test.ts` (new),
  `v3/eslint.config.mjs` (production entry + write-boundary entry),
  `package.json` (ROOT — the `v3:cli` bridge),
  `v3/adr/ADR-009-operator-cli-module-and-dev-boundary.md` +
  `v3/adr/README.md` index, `docs/v3/implementation/plan.md` (§6.5
  aligned block + §6.7 split rows), this packet file.
- Mutation boundary: exactly those. NO kernel / store / floor /
  testkit / ingress / emit production change.

## Acceptance

- The four matrices above test-driven at the `runCli` seam; the
  last-mile smoke on the shipped entrypoint; the write-boundary lint
  scoped to `src/cli/**` with executed direct-StorePort-write probes
  (build watchpoint honored); four executed lint probes recorded
  below; all v3 bridges + ADR integrity + coverage green; coverage
  unchanged on ownership axes.
- Standing review rules: REV-C-PROJECTIONS-READONLY (read verbs);
  REV-BUNDLE-DEFAULT-POLICY (normal graph binds the default — verified
  on this diff: `devPassthroughRedactionPolicy` appears nowhere under
  `src/cli/`); write-entrypoint matrix rows as the positive proof.

## Build record

Built 2026-07-08. 199 v3 tests green (185 → 199: 12 CLI + 2
template-pin). Executed lint probes: `src/cli/probeTestkit.ts` →
ADR-005 RED; `src/cli/dev/probeDevTestkit.ts` → clean (exemption
works); `src/cli/probeWrite.ts` (`commitTransition`) → RED;
`src/cli/probeWrite2.ts` (`createInstance`) → RED — all four recorded,
probes removed, suite re-verified green. One typecheck round
(`parseArgs` options type via `NonNullable`).

**Aftermath (2026-07-08, post-commit review — fixed same day, 202
tests):** (1) `verbStart` collapsed the 2-vs-1 split — every
`startInstance` error became usage; now ONLY the binding-coverage
input lane is usage, store-integrity (colliding minted id) flows to
internal, negative-tested; (2) the numeric-flag parser coerced via
`Number()` — now lexical (`/^\d+$/` + safe-integer), the coercion
lanes ("", " ", "1e2", "0x10", "+1") negative-tested; (3) the tail
channel rule gained its CLI-level test (mid-stream failure: emitted
NDJSON rows stay parseable, ONE stderr doc, exit 1). Process-log line
appended: a canonical matrix needs its lanes DRIVEN, not just
declared.
