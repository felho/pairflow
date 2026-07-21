# Task Packet: ch5-P2 — invariant disposition map + post-condition checker kit

Plan step: plan.md §5.3; realizes the PI-3 invariant axis's accounting
half (the §1.4 rule "every invariant gets exactly one disposition",
mechanized) and the checker infrastructure the ch5-P3 harness runs.
Autonomy stage: calibration — **pre-approved before build** (§5.8
first-of-a-kind: the disposition-map artifact class).

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

(Empty by design: the map DISPOSITIONS all 116 invariants but owns none —
ownership stays the packet axis; the checker kit is harness
infrastructure, not a disposition owner, plan §5.3.)

## Claim + dimensions (chapter rule 1 — enumerated BEFORE deriving)

**Map-lock claim:** every ledger §2 invariant carries exactly ONE
enforcement class, and no packet can silently contradict it.

1. **Key-set drift** — map vs ledger §2, both directions (missing /
   extra invariant id).
2. **Enum drift** — a class token outside `checker` / `type/schema` /
   `test` / `review` (the §1.4 enum, already the script's
   `INVARIANT_DISPOSITIONS`).
3. **Packet↔map mismatch** — a packet declares disposition X for an
   invariant the map classes as Y.
4. **Format drift** — the map file must carry exactly ONE machine block
   (a second block or a missing block fails).
5. **Fail-closed** — a missing/unparseable map is a hard failure from
   this packet on (the unitMap precedent).

**Checker-kit claim:** each post-condition checker fails RED on a store
state violating its invariant — proven per checker by a violating
fixture in its unit tests (the negatives ARE the tests here).

## Operative material

### The map (canonical format)

`v3/implementation/invariant-disposition-map.md` — prose header
(the rubric below) + ONE fenced ` ```json ` block:

```json
{
  "invariant_disposition_map": {
    "<section>/<slug>": "checker | type/schema | test | review"
  }
}
```

**Classification rubric (what pre-approval fixes; the 116-row fill is
the build deliverable, reviewed row-by-row at the commit boundary):**

- `test` — a dedicated behavioral contract test (`CT-*`) is the
  enforcement; the invariant is about kernel BEHAVIOR under specific
  inputs.
- `type/schema` — enforced by construction: TS types, SQLite schema,
  or lint; violating code does not compile/load.
- `checker` — a structural property of committed store state the
  post-condition kit can assert after ANY replay (no scenario needed).
- `review` — not machine-checkable (semantic/authoring judgment); a
  `REV-*` line carries it.
- The map records the TARGET enforcement class — how the invariant IS
  or WILL BE enforced; whether it is built yet is the packet-ownership
  axis, not the map's.
- **The ch-4 packets' 8 rows are already bound and the map conforms to
  them** (plan §5.3): `op-id-idempotency`, `atomic-transition-commit`,
  `expected-version-mandatory`, `binding-coverage-at-start`,
  `commit-deliver` → `test`; `instance-store`, `transcript-event-log`,
  `definition-store` → `type/schema`.

### Script validation (extends the P1 lock)

`check_coverage.py` validation mode: load the map (REQUIRED,
`--disposition-map` override as the negative-test seam); key set ==
ledger §2 both directions; enum validity; **every packet-declared
invariant disposition must equal the map's** (dimension 3 — the
direction is one-way by design: the map covers all 116, packets only
their slices). `--selftest` gains one red fixture per new dimension
plus the updated green control.

### The post-condition checker kit

`v3/src/testkit/storeCheckers.ts` — PURE functions over read data
(no store import; ADR-005's import rule is untouched):
`(detail: InstanceDetail, template: WorkflowTemplate) → violations:
string[]`, one checker per property, plus a `runAllCheckers`
aggregator the ch5-P3 harness calls after every trace replay:

- **seq continuity** — transcript seq is dense 1..N;
- **version arithmetic** — `instance.version === 1 + N` (start at 1,
  +1 per committed transition);
- **end-state consistency** — `status === "DONE"` ⇔ `currentStep ∈
  template.terminal`. Deliberately NOT named terminal-is-a-sink
  (pre-approval finding): this is a final-state equivalence, not the
  ledger's historical claim;
- **terminal sink** (`l0d/terminal-is-a-sink`, the HISTORICAL claim —
  pre-approval finding): transcript-based PATH RECONSTRUCTION — walk
  the rows from `template.start`, resolving each `envelope.type`
  through the template's transitions; a row committed FROM a terminal
  position (any transcript row after terminal entry) is a violation,
  and a row whose type has no transition at the reconstructed position
  is a violation too (a corrupt history breaks the sink proof — the
  checker must not silently skip what it cannot replay);
- **op uniqueness** — `(instanceId, opId)` pairs distinct across the
  transcript.

Unit tests: a green fixture plus one violating fixture per checker
(gap in seq; version off-by-one; DONE on a non-terminal step / RUNNING
on a terminal step; **a transcript row AFTER the terminal arrival** —
the sink checker's mandated negative — plus an unresolvable mid-path
row; duplicated opId).

## In-context notes (the scarce budget)

- The checkers assert over what the FLOOR exposes (`InstanceDetail`) —
  committed rows only; they are validity oracles for harness replays,
  not a second kernel.
- The map's machine face parses with the same stdlib JSON-fence pattern
  as packets; it lives OUTSIDE `packets/`, so the packet scanner never
  sees it (no ledger_slice clash).
- Disposition counts are not hardcoded anywhere (the P1 rule, narrowed
  scope: drift/tests/manifests derive; the script's §1.4 guard stands).

## Embedding gates (v1-inherited)

- Target files: `docs/v3/implementation/invariant-disposition-map.md`
  (new); `tools/v3-plan/check_coverage.py` (+ docstring);
  `v3/src/testkit/storeCheckers.ts` + `storeCheckers.test.ts`,
  `v3/src/testkit/index.ts` (export).
- Mutation boundary: exactly those. `drift/`, `kernel/`, `store/`,
  `ingress/`, `emit/`, `domain/`, `ports/` unchanged; no plan edits
  expected (the §5.3 text already matches this packet).

## Acceptance

- Map file lands with all 116 rows classified; script validation green
  over the real map + packets (the 8 ch-4 rows agree by construction).
- `--selftest` green with the new red dimensions (1–5 above) and the
  green control.
- Checker kit unit tests green — each checker proven red on its
  violating fixture.
- All v3 bridges green; coverage report unchanged on the ownership
  axes (units 4/158, invariants 8/116, traces 1/20).
- Standing review rules: none of the REV-* rows touch this surface
  (no kernel/store/adapter changes) — stated, not skipped.
