# Task Packet: ch4-P4 — bootstrap START_INSTANCE + MD-1 fixture + floor read + l0b golden trace

Plan step: plan.md §4.6 (MD-1, floor, wiring) + §4.7 (the golden trace);
completes the walking skeleton (PI-6)
Autonomy stage: calibration

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l0b-pseudocode/START_INSTANCE", "disposition": "implement" }
    ],
    "rejections": [],
    "invariants": [
      { "id": "l0b/binding-coverage-at-start", "disposition": "test" },
      { "id": "l0b/commit-deliver", "disposition": "test" }
    ],
    "traces": ["l0b-pseudocode"],
    "shared_ownership": []
  }
}
```

## Operative material (full text — projection, not invention)

### `l0b-pseudocode/START_INSTANCE` (verbatim)

```text
START_INSTANCE(template_ref, task, start_overrides) → Started
  template ← definitionStore.load(template_ref)
  binding  ← resolve_binding(template, start_overrides)        # template default_actor + start overrides
  REQUIRE binding covers every role reachable in template      # invariant: fail at start, not mid-run
  instance ← create { template_ref, task, binding, current_step: template.start, version: 1, status: RUNNING }
  COMMIT instance creation
  RETURN Started(instance.version, dispatch_intent(instance, template, template.start))  # derive after commit
```

### The l0b chapter trace — the executable expectation

Make this committed-row sequence pass (the model's six steps; op ids are
test literals — emit-lib-derived ids are the ch-5 `CT-A3-*` surface):

1. `START_INSTANCE(local-pair-v0, task)` → instance at `implement`,
   round 1, version 1, RUNNING; `Started` carries
   `DispatchIntent { actor: codex, packet: { expectedVersion: 1,
   instruction "build it", availableOps [PASS], no handoff } }`.
2. codex emits `PASS` (op `a1`, expectedVersion 1) → commit
   implement → review (1 → 2); intent → claude, expectedVersion 2,
   availableOps [PASS, CONVERGED], handoff = codex payload.
3. claude emits `PASS` (op `b2`, expectedVersion 2) → commit
   review → implement (2 → 3), **round = 2**; intent → codex.
4. codex replies from the OLD packet: `PASS` (op `c3`,
   expectedVersion 2) → **`Stale(3)`** — idempotency checked first (new
   op_id, so NOT a duplicate); NO transcript row, version unchanged.
5. codex refreshes: `PASS` (op `c4`, expectedVersion 3) → commit
   implement → review (3 → 4).
6. claude emits `CONVERGED` (op `d5`, expectedVersion 4) → commit
   review → done (4 → 5); status DONE — terminal, **no DispatchIntent**.

Committed transcript after the run: exactly `a1, b2, c4, d5` with seq
1–4; final instance: version 5, currentStep `done`, status DONE,
round 2.

### Inherited contracts (ch4-P1 matrix / P3)

- `resolve_binding` = declared role defaults (`roles[r].defaultActor`)
  overridden by `startOverrides`; coverage failure and an unknown
  `templateRef` are START-SIDE failures: throw, NO state, NO invented
  rejection name (plan §4.1).
- The caller mints `instanceId` (P1 matrix); `round` initializes to 1;
  `version` 1; status RUNNING.
- Intent derivation is P3's `deriveDispatchIntent` — shared, not forked.

## In-context notes (the scarce budget)

- **MD-1 (declared migration debt, plan §1.3):** the fixture-form
  template is a testkit builder shaped like the model's `local-pair-v0`
  (implement ⇄ review, PASS/CONVERGED, defaults codex/claude) + an
  in-memory pinned `DefinitionStore` fixture. Mark `MD-1` in source;
  chapter 8 migrates it onto the canonical authoring format and retires
  the debt. Testkit may import `domain/` + `ports/` (ADR-005) — it does
  NOT import kernel or store.
- **"Every role reachable in template"** is checked over ALL declared
  steps' roles (a superset of reachable — strictly safe); a
  reachability-aware refinement belongs to the ch-8 template format
  work, not here.
- **commit ≠ deliver, by construction AND by test:** the kernel deps
  carry NO ActorAdapter — intents are RETURN VALUES; the test asserts
  the transcript stores only envelopes (no intent rows) and nothing is
  dispatched anywhere.
- **The floor is a thin read module** (`createFloor(store)`), pass-through
  of the two committed-rows-only reads — the seam ch 6 grows into
  (getTimeline, live tail). No write surface.
- The golden trace runs the REAL wiring end-to-end: testkit scripted
  actor → ingress → kernel → SQLite (in-memory) → floor.

## Embedding gates (v1-inherited)

- Target files: `v3/src/kernel/start.ts` (new) + `Kernel` interface
  gains `startInstance` (`kernel.ts`, `index.ts` — extend-don't-fork);
  `v3/src/floor/floor.ts` + `floor/index.ts`;
  `v3/src/testkit/templateFixture.ts` + testkit `index.ts` export;
  tests: `v3/src/kernel/start.test.ts`, `v3/src/floor/floor.test.ts`,
  `v3/src/goldenTrace.test.ts`.
- Entrypoints: `kernel.startInstance(input)`; `createFloor(store)`;
  `fixtureTemplate()` / `fixtureDefinitionStore(...)`.
- Mutation boundary: `v3/src/kernel/` (start addition only),
  `v3/src/floor/`, `v3/src/testkit/` (new fixture file + export line),
  the new root-level golden-trace test. `domain/`, `ports/`, `store/`,
  `ingress/` unchanged.

## Acceptance

- Contract tests:
  - `binding-coverage-at-start`: a role without default and without
    override → start THROWS, store stays empty (no state); an override
    completes the binding → starts; unknown templateRef → throws, no
    state;
  - `commit-deliver`: `Started`/`Committed` intents are return values
    derived from committed state; the transcript holds envelopes only;
  - **the l0b golden trace** (above) through the full walking skeleton,
    with floor assertions: `listInstances` / `getInstanceDetail` show
    exactly the committed rows at each checkpoint.
- Checks: all v3 bridges green; coverage validation shows the four ch-4
  packets (units 4/158, invariants 8/116, traces 1/20 owned).
- Drift tests green (standing — PI-3 pre-test unaffected).
- Standing review rules in force: **REV-A1-TXN** (creation commit),
  **REV-E-NO-ADAPTER-BRANCH**, **REV-C-PROJECTIONS-READONLY** (the floor
  reads, never writes).
