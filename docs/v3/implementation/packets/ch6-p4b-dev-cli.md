# Task Packet: ch6-P4b — the dev CLI entrypoint (inject / replay / pass-through bundle)

Plan step: plan.md §6.5 (the P4 split's second half). Autonomy stage:
calibration — **pre-approve** (first-of-a-kind: dev input contracts).
Approved after two refine rounds (round 1: dev config matrix, replay
mismatch typing, inject schema closure, target typo; round 2: the
inject derived-path ↔ emit-lib contract collision).

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

## Claim + dimensions (chapter rule 1 — enumerated BEFORE deriving)

**Claim:** the dev entrypoint is the ONE graph with testkit access
(ADR-009); its three verbs carry canonical input/output/exit contracts
sharing the P4a channel rule and error-doc schema; the pass-through
policy is reachable ONLY here; replay is hermetic; inject stages both
ADR-004-family paths without violating the emit-lib contract.

1. **Config matrix** — bundle/inject inherit P4a in full (missing db →
   2; store-open fail-closed → 1); replay rejects `--db` (strict
   parse → 2); the normal entrypoint does not know the dev verbs (→ 2).
2. **REV-BUNDLE-DEFAULT-POLICY closure** — dev bundle default stays
   redacted; `--passthrough` is the explicit opt-in (marker present
   under pass-through, absent otherwise; policy id recorded).
3. **Inject derived path** — payload present + canonicalizable +
   expectedVersion required (pre-ingress usage 2 otherwise: the
   emit-lib's `deriveActorEmitOpId` digests the payload immediately —
   ratification finding); `null` payload derives (canonicalizable).
4. **Inject override path** — absent / `-0` payloads flow to ingress;
   admission rejections are outcome DATA rows, exit 0 (the
   missing_version lane staged deliberately).
5. **Inject schema fail-closed** — unknown fields (+`allowedFields`
   details), JSON-number version rule, malformed/missing file → 2;
   FULL validation before ANY submit; empty `steps` = vacuous 0.
6. **Replay mismatch vs internal** — `TraceMismatchError` (typed, in
   the harness) → exit 1 with a name+details-discriminated doc
   (lane/stepIndex/expected/actual); wiring errors keep their names;
   malformed fixture (root keyset + required shapes) → 2.
7. **Last-mile smoke** — pass-through bundle through the REAL
   `cli/dev/main.ts` process (root `v3:cli:dev` tsx bridge).

## Dev runtime config matrix

| Verb | Store | Config |
|---|---|---|
| `bundle [--passthrough]` | operator's DB | P4a contract inherited in full |
| `inject --instance --file` | operator's DB (writes through ingress — staging) | P4a contract inherited in full |
| `replay --file` | **ephemeral `:memory:` per invocation — HERMETIC** | `--db` not accepted (strict → 2) |

## Inject input schema (canonical)

`{ "steps": [ { "type": string (required), "expectedVersion": JSON
number — nonneg safe int (REQUIRED on the derived path), "payload":
anything (absent = no key; null = null), "actorId": string (default
"dev-actor"), "opId": string (optional OVERRIDE) } ] }` — unknown
fields anywhere → 2; validated in full before any submit.

| Path | Rule |
|---|---|
| derived (no opId) | `deriveActorEmitOpId`, contextPacketId `<instanceId>@v<expectedVersion>`; payload must be present AND canonicalizable — else usage 2, pre-ingress |
| override (opId) | verbatim op_id; payload may be absent/null/non-admissible — the ingress answer is the step's outcome row, exit stays 0 |

## Replay error mapping (canonical)

| Lane | Class/code | Doc |
|---|---|---|
| trace holds | 0 | `ReplayResult` on stdout |
| `TraceMismatchError` (outcome/state/transcript/checker) | internal / 1 | `error.name = "TraceMismatchError"`, `details.{lane, stepIndex?, expected, actual}` |
| wiring/unexpected | internal / 1 | the error's own name — TYPE-discriminated, never message-text |
| malformed fixture / file | usage / 2 | standard usage doc |

## Embedding gates (v1-inherited)

- Target files: `v3/src/cli/dev/main.ts` (new),
  `v3/src/cli/dev/dev.test.ts` (new), `v3/src/cli/common.ts` (new —
  shared dispatch shell + helpers), `v3/src/cli/main.ts` (mechanical
  export/import adjustment ONLY — **no behavior change to the normal
  CLI, proven by the untouched P4a regression suite**),
  `v3/src/testkit/traceHarness.ts` (additive: `TraceMismatchError`) +
  `traceHarness.test.ts` (the type pin) + `testkit/index.ts`,
  `package.json` (ROOT — `v3:cli:dev`), `docs/v3/implementation/plan.md`
  (§6.5 P4b aligned block), this packet file.
- Mutation boundary: exactly those. The write-boundary and dev/prod
  lint entries stand from P4a (probes already executed there).

## Acceptance

- Dimensions 1–7 test-driven (13 new dev tests + 2 harness type pins);
  the P4a suite untouched and green (the extraction guard); all v3
  bridges + coverage green; coverage unchanged on ownership axes.
- Standing review rules: REV-BUNDLE-DEFAULT-POLICY closed
  (pass-through references live ONLY under `cli/dev/**`, `testkit/`,
  and test files); REV-C untouched.

## Build record

Built 2026-07-08. 217 v3 tests green (204 → 217: 13 dev + 2 harness
pins — 202 + 2 pins landed with the harness edit first). One build
stumble worth its process-log line: the test helper wrote `-0`
fixtures via `JSON.stringify`, which flattens `-0` to `0` — the very
class under test; the two `-0` lanes are RAW text files now
(`JSON.parse("-0")` restores the value, stringify never emits it).
Two lint rounds (unused import, unnecessary assertion).

**Aftermath (2026-07-08, post-close review — fixed same day, 219
tests):** (1) `expectedVersion: -0` passed the inject schema and
reached the ingress, violating the "validated in full before any
submit" claim — the ch-4 numeric-identity dimension recurring in a
new validator; `Object.is(-0)` guard added, raw-text negative pinned
(stdout stays empty: nothing was submitted). (2) The replay boundary
validator was shallow — `finalState: {}` surfaced as a state mismatch
(exit 1) against the matrix's malformed = 2 row; the validator now
covers the full structural shape (root/lift/step/expect keysets,
kinds, tuple forms, primitive types with the -0 guard), and the
structure-vs-semantics line is explicit: structural malformedness =
usage 2, a structurally valid fixture that does not HOLD = the
harness's `TraceMismatchError` = internal 1. Five structural lanes
driven + the -0 version lane.
