# Task Packet: ch5-P1 — the drift suite (PI-3) + ADR-007

Plan step: plan.md §5.1 (the three unconditional drift tests); realizes
the PI-3 drift-test axis — the standing "drift tests green" line of every
future build loop (README §4 step 4).
Autonomy stage: calibration — **pre-approved before build** (§5.8
first-of-a-kind: the manifest artifact class).

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

(Empty by design: PI-3 infrastructure owns no ledger items — it GUARDS
all of them. The ch-4 precedent: infra packets declare what they
behaviorally realize, nothing more.)

## Claim + dimensions (chapter rule 1 — enumerated BEFORE deriving)

**Declared claim:** the model's machine face (ledger §3/§4 + the
`v3/model/units/` tree) and the code cannot shear without a red
test/check — pairwise across ledger ↔ manifests ↔ packets ↔ code.

Dimensions, each of which must have at least one derived negative case:

1. **Name-set drift** — a key missing from / extra in a manifest vs its
   ledger source (rejection names, registry entities, unit ids; both
   directions).
2. **Disposition drift** — a packet declares disposition X for a unit,
   the manifest says Y.
3. **Ownership drift** — a packet owns a unit the manifest calls
   `pending`; the manifest calls a unit `realized` that no packet owns
   (realized ⊆ packet-owned, both directions).
4. **Code drift** — a realized `codeRef`'s file vanished; its symbol
   vanished; a realized domain TYPE vanished (the static dimension — see
   the typecheck note below).
5. **Source drift** — the ledger / units tree itself is missing or
   moved: a loud failure, never a silent skip.
6. **Parser self-trust** — the §4 parser's per-section entity counts
   must equal the ledger's own header counts (`### \`l0a\` (3 blocks ·
   7 entities)`); a parse-rule mismatch fails here, not downstream.

## Operative material

### Canonical manifest matrix (the single source P2+ inherit from)

**`v3/src/drift/unitMap.json`** — ONE machine face, read by BOTH the
vitest drift test and `check_coverage.py` (this is why it is JSON, not
TS: the checker stays stdlib-only):

```json
{
  "<section>/<UnitName>": { "status": "pending" },
  "<section>/<UnitName>": {
    "status": "realized",
    "disposition": "<§1.4 unit-disposition enum token>",
    "codeRef": "v3/src/<path>#<symbol>"
  }
}
```

- Key set == the `v3/model/units/` tree, derived at test time (158
  today — counts are NEVER hardcoded; the sources move, the tests
  follow).
- `realized` entries at landing = exactly the ch-4 four:
  `l0b-pseudocode/HANDLE` → `v3/src/kernel/kernel.ts#createKernel`
  (implement); `l0b-pseudocode/START_INSTANCE` →
  `v3/src/kernel/start.ts#startInstance` (implement);
  `l0b-pseudocode/dispatch_intent` →
  `v3/src/kernel/dispatchIntent.ts#deriveDispatchIntent` (implement);
  `l0a-pseudocode/HANDLE` → the SUBSUMING implementation's ref
  (`kernel.ts#createKernel`, alias/inherited — rule: an alias/inherited
  row points at the code that subsumes it).
- `codeRef` resolution (pinned, pragmatic): the file exists AND the
  symbol appears in it on a word boundary. Not a parse — a presence
  check; the typecheck and the owning packet's tests carry the deeper
  guarantee.

**`v3/src/drift/domainRegistry.ts`** — TS manifest; **the typecheck is
the existence proof**:

- Key = `<section>/<entity-token>`, section from the ledger §4 heading
  (`l0a`, `storage-scope`, …). Token normalization (pinned): block lines
  split on `·`; each token strips its TRAILING space-separated
  annotation — `[root]`, `(value)`, `(name only)`, `(transcript)`, … —
  while attached parens are PART of the token (`Rejected(not_active)`,
  `apply_target_entry_effects(...)`); `*relations:*` lines and
  `(no entities)` blocks contribute nothing. Dimension 6 (header-count
  equality) is the arbiter of this rule — if the normalization is
  wrong, the counts disagree and the test is red.
- Entry classes:
  - `realized` — the entity is an exported v3 type; the key appears in
    a type-level table (`type RealizedTypeTable = { "l0a/WorkflowInstance":
    WorkflowInstance; … }`) built from `import type` — a vanished or
    renamed type is a COMPILE error. Rejection-shaped entities
    (`Rejected(not_active)`) bind through the union instead:
    `AssertRejection<"not_active">` with
    `type AssertRejection<N extends RejectionName> = N` — a name absent
    from the union is a compile error.
  - `pending` — a type the ladder has not reached; no chapter claim in
    the manifest (the plan map owns scheduling).
  - `contract-row` — a §4 row naming a contract/prose surface, never a
    TS type by design (storage-scope `shape` / `constraints`,
    runtime-teardown policy rows, …). Implementation-plane bookkeeping,
    not a ledger name; the full 121-row classification is a build
    deliverable reviewed row-by-row at the commit boundary.
- The drift test parses ledger §4 at test time and asserts: parsed key
  set == manifest key set, plus dimension 6's per-section count
  equality.

**`v3/src/drift/rejectionNames.test.ts`** — MOVED from `domain/`
(`git mv`, content unchanged apart from paths): the 85-name set-equality
test vs ledger §3. Ch 5 formally absorbs the §4.5 pre-test; the
forward reference closes.

### The script cross-check (the three-way lock) + `--selftest`

`tools/v3-plan/check_coverage.py`, validation mode (always-on CI):

- Loads `v3/src/drift/unitMap.json` — **required from this packet on**;
  a missing/unparseable manifest is a hard failure (fail-closed), with
  a `--unit-map` override as the negative-test seam (the `--packets-dir`
  culture).
- Cross-check, both directions: every packet-owned unit must be
  `realized` in the manifest with the SAME disposition token; every
  `realized` manifest row must have a packet owner. (Dimensions 2–3.)
- **`--selftest` mode (chapter rule 2 — the check is executed, not
  prescribed):** the script builds throwaway fixtures (tempfile, stdlib
  only) and asserts each cross-check dimension actually fails red —
  missing manifest, key-set mismatch, disposition mismatch, both
  ownership directions. CI runs `--selftest` before the real
  validation (the `v3:coverage` bridge becomes selftest + validation).
  Scope: the NEW cross-check dimensions; retrofitting ch-3-era
  validations into selftest is NOT this packet (recorded, not smuggled).

### ADR-007 (amends ADR-001) — the `drift/` module

Test-only module beside `testkit/`: production modules never import
`drift/` (lint boundary, negative-tested); `drift/` reads
`v3/model/` at test time; `unitMap.json` is
dual-read (vitest + the coverage script). The `domain/` import rule is
TWO-tier (pre-approval finding):

- `drift/*.test.ts` MAY value-import domain runtime registry values —
  the rejection drift test's whole point is comparing the runtime
  `REJECTION_NAMES` value against ledger §3; a type-only rule would
  make the test impossible.
- Non-test drift modules (the manifests / import tables,
  `domainRegistry.ts`) stay `import type` ONLY — they are static
  bookkeeping; a value import there would smuggle runtime coupling
  into a proof that is deliberately compile-time.

Born `proposed` in this packet, `accepted` at this pre-approval.

## In-context notes (the scarce budget)

- **Manifest/test key sets are derived, never hardcoded** — the drift
  tests and manifests read their sources; "85"/"158"/"121" as a
  hardcoded DRIFT-TEST expectation is a review reject. Scope of this
  rule (pre-approval finding): it binds `drift/` only. The coverage
  script's §1.4 inventory guard (158/116/85/20, "plan par.1.4 says")
  is DELIBERATE and stays — §1.4 is the source of truth for the
  in-scope inventory, and that guard is what notices the inventory
  itself moving. The ledger's own header counts remain the §4 test's
  only literals, used only against the parser (dimension 6).
- **The typecheck dimension has no vitest pin by nature** — a compile
  error cannot be a passing test's assertion. The standing gate is
  `v3:typecheck` in CI (already wired); the negative is EXECUTED during
  build (deliberate temporary break of one realized type → observed
  compile failure → reverted) and recorded in this packet's aftermath
  note, satisfying chapter rule 2 without inventing a fragile
  tsc-in-test harness.
- **The manifest is data, not policy** — `pending` rows carry no
  chapter numbers; scheduling lives in the plan map. This keeps the
  manifest churn-free: a chapter re-plan does not touch drift/.
- **`git mv` for the rejection test** (UseGit rule) — the move must be
  visible as a rename, not delete+add.

## Embedding gates (v1-inherited)

- Target files: `v3/src/drift/rejectionNames.test.ts` (moved),
  `v3/src/drift/domainRegistry.ts` + `domainRegistry.test.ts`,
  `v3/src/drift/unitMap.json` + `unitMap.test.ts`;
  `tools/v3-plan/check_coverage.py`; `v3/eslint.config.mjs` (boundary
  rule); `v3/adr/ADR-007-drift-test-module.md` + `v3/adr/README.md`
  (index row); `package.json` (`v3:coverage` bridge gains `--selftest`);
  `docs/v3/implementation/plan.md` §5.1 (parent-plan alignment,
  pre-approval finding: `pending` without chapter + `unitMap.json` —
  the packet's decisions flow UP into the ratified text in the same
  commit, marked "aligned at P1 pre-approval").
- Mutation boundary: `v3/src/drift/` (new) + the `domain/` test removal
  half of the move + the two §5.1 alignment paragraphs ONLY; `kernel/`,
  `ports/`, `store/`, `ingress/`, `emit/`, `testkit/` unchanged.
- Lint ordering note (ch-3 boundary lesson): the new drift boundary
  entry must respect the flat-config later-entry-override ordering —
  negative tests are the real guard either way.

## Acceptance

- Drift suite green: 85-name set equality (moved test); §4 registry
  key-set + per-section count equality; unit-map key-set + codeRef
  resolution.
- Script cross-check: `--selftest` green in CI, one red case per
  cross-check dimension (2, 3 both directions, missing manifest);
  validation green over the real packets + manifest.
- Lint boundary negative-tested (production importing `drift/` fails).
- Typecheck negative EXECUTED during build and recorded (see note).
- All v3 bridges green; ADR-007 `accepted`, integrity check green.
- Standing review rules in force: none of the REV-* rows touch this
  packet's surface (no kernel/store/adapter code changes) — stated, not
  skipped.

## Build record — executed negatives (chapter rule 2)

All executed 2026-07-07 during the P1 build, each observed red then
reverted green:

- **Lint, production→drift:** a value import of `drift/domainRegistry.js`
  appended to `src/floor/floor.ts` → 1 × "ADR-007: production modules
  never import drift/" → reverted.
- **Lint, non-test drift value import:** a value import of
  `REJECTION_NAMES` appended to `drift/domainRegistry.ts` → 1 ×
  "ADR-007: non-test drift modules are static bookkeeping" → reverted.
- **Typecheck, vanished realized type:** `RealizedTypeTable`'s
  `l0a/LifecycleStatus` witness renamed to a nonexistent type →
  compile error naming it → reverted.
- **Typecheck, vanished union member:** `rejectionNames:
  ["not_active"]` mutated to a name outside `RejectionName` → compile
  errors naming it → reverted.
- **Script:** `--selftest` is the STANDING executed negative — 9 red
  dimensions + green control, chained into the `v3:coverage` bridge, so
  it re-executes on every CI run rather than living in this note.
