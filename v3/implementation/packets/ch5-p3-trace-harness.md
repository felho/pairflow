# Task Packet: ch5-P3 — chapter-trace golden harness + level-lifting + the l0a trace

Plan step: plan.md §5.2; realizes the PI-3 golden-trace axis — the
declarative replay engine every future chapter's trace lands on, the
level-lifting convention, and the first transfer (l0a).
Autonomy stage: calibration — **pre-approved before build** (§5.8
first-of-a-kind: the harness artifact class).

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [],
    "rejections": [],
    "invariants": [],
    "traces": ["l0a-pseudocode"],
    "shared_ownership": []
  }
}
```

(The l0b trace's ownership STAYS with ch4-P4 — this packet refactors its
test onto the harness without a slice change; no double owner.)

## Claim + dimensions (chapter rule 1 — enumerated BEFORE deriving)

**Harness claim:** a green replay proves the model's trace EXACTLY — the
outcome of every step, the committed-row sequence, the final state, and
the store's structural invariants — and a lift can never make a trace
easier to pass.

1. **Outcome drift** — each expected-outcome kind diverging from the
   real outcome (committed vs duplicate vs stale vs rejected, and the
   wrong version/reason WITHIN a kind) fails red.
2. **Transcript drift** — a missing, extra, or reordered committed row
   fails red (`[seq, opId]` equality, not subset).
3. **Final-state drift** — currentStep / round / status / version any
   one off fails red.
4. **Structural drift** — the §5.3 post-condition checkers run after
   EVERY replay (`runAllCheckers` must return `[]`); a replay that
   commits rows the checkers reject cannot pass.
5. **Lift weakening** — the lift supplies ONLY what the current kernel
   level makes mandatory; an assertion the un-lifted trace makes (the
   3′ redelivery's `Duplicate`) must survive the lift unchanged. The
   negative: a lifted redelivery step expecting `committed` fails red.

Negative derivation: harness self-tests run deliberately WRONG fixtures
(one per dimension 1–3) against the real kernel — each must fail; the
dimension-5 fixture above; and a **dimension-4 negative** (pre-approval
finding 2): a fake `StorePort` seam whose `getInstanceDetail` returns a
CORRUPT detail (e.g. a seq gap) behind otherwise-clean outcomes — the
replay must fail, proving the harness actually INVOKES and enforces the
checkers (the P2 checker unit tests alone do not prove the harness
calls them).

## Operative material

### Harness home + the ADR-005 boundary (binding design decision)

`v3/src/testkit/traceHarness.ts` — the harness is KIT infrastructure,
but ADR-005 stands: **the harness never imports `kernel/`, `store/`, or
`ingress/`** — it receives the wired seams as parameters, typed over
`domain/` + `ports/` only:

```ts
interface TraceSeams {
  /** The wired ingress entry — createIngress(kernel).submit. */
  readonly submit: (raw: unknown) => Promise<Outcome>;
  /** startInstance, bound to the kernel under test. */
  readonly start: (input: StartInput) => Promise<Started>;
  /** The REAL store the kernel commits into (floor-read side). */
  readonly store: StorePort;
  readonly template: WorkflowTemplate;
}
/** Asserts the fixture; RETURNS the real per-step outcomes + final read. */
replayTrace(fixture: TraceFixture, seams: TraceSeams): Promise<ReplayResult>
interface ReplayResult {
  /** One entry per fixture step, the ACTUAL outcome/Started value. */
  readonly outcomes: readonly (Outcome | Started)[];
  /**
   * The final store read the harness itself asserted against —
   * returned so supplemental blocks assert TRANSCRIPT-side shapes
   * (envelope shape, committedAt) without a second read.
   */
  readonly finalDetail: InstanceDetail;
}
```

**Supplemental assertion blocks (pre-approval finding 1, closed by the
second round):** the harness asserts the DECLARED expectations and
hands back BOTH the real outcomes AND the final `InstanceDetail`, so a
migrated test may layer assertions the declarative format does not
carry — the l0b test's intent actor / ContextPacket fields / handoff /
commit ≠ deliver checks live on the returned outcomes, and its
transcript ENVELOPE-SHAPE check lives on `finalDetail.transcript`. The
fixture format stays lean; no migrated trace loses assertion strength.

TESTS wire kernel + SQLite store + ingress and hand the seams over —
"tests, not the kit, drive the kernel" (ADR-005's own sentence),
realized structurally. No lint change, no ADR change.

(`StartInput` mirrors the kernel's `StartInstanceInput` shape over
domain types — instanceId, templateRef, task, overrides — declared
port-locally in the harness, not imported from `kernel/`.)

### The declarative fixture format (canonical matrix)

```ts
interface TraceFixture {
  readonly name: string;
  /** Level-lifting declaration — ABSENT for at-level traces (l0b). */
  readonly lift?: { readonly expectedVersion: "track-running-version" };
  readonly steps: readonly TraceStep[];
  /** [seq, opId] — full-sequence equality. */
  readonly finalTranscript: readonly (readonly [number, string])[];
  readonly finalState: {
    readonly currentStep: StepId;
    readonly round: number;
    readonly status: LifecycleStatus;
    readonly version: number;
  };
}
type TraceStep =
  | {
      readonly kind: "start";
      readonly instanceId: InstanceId;
      readonly task: string;
      readonly expect: { readonly currentStep: StepId; readonly version: 1 };
    }
  | {
      readonly kind: "emit";
      readonly opId: OpId;
      readonly type: EventType;
      readonly actorId: ActorId;
      readonly payload?: unknown;
      /** Explicit number, or omitted ⇒ supplied by the lift. */
      readonly expectedVersion?: number;
      readonly expect: ExpectedOutcome;
    };
type ExpectedOutcome =
  | { readonly kind: "committed"; readonly version: number }
  | { readonly kind: "duplicate" }
  | { readonly kind: "stale"; readonly currentVersion: number }
  | { readonly kind: "rejected"; readonly reason: RejectionName };
```

### Level-lifting convention (plan §5.2, made operational)

- A lift may ONLY add fields the current kernel level makes MANDATORY.
  Today that is exactly `expectedVersion` (L0b): with
  `lift.expectedVersion = "track-running-version"`, an emit step that
  OMITS `expectedVersion` gets the harness-tracked running version
  (updated on every committed outcome, starting from the start step's
  version 1).
- A lift never weakens an assertion: the l0a 3′ redelivery carries the
  lifted CURRENT version, and the contract's check order (duplicate
  BEFORE stale) keeps the model's `Duplicate` expectation intact — the
  fixture still asserts `duplicate`, and dimension 5's negative pins
  that a `committed` expectation there fails.
- An at-level trace (l0b) declares NO lift; every emit carries its
  explicit `expectedVersion` — the harness rejects a lift-less step
  without one (fail-closed, no silent default).

### The l0a trace (this packet's transfer — traces 2/20)

From the model section's "A concrete trace" (the two-round run with a
redelivery): START (implement, round 1, v1) → a1 implementer PASS →
review (v2) → **3′ a1 redelivered → Duplicate, no second row** → b2
reviewer PASS → implement, round 2 (v3) → c3 implementer PASS → review
(v4) → d4 reviewer CONVERGED → done, DONE (v5). Final transcript
`[1,a1] [2,b2] [3,c3] [4,d4]`. Payloads: minimal canonicalizable
literals (the round-trip surface is ch-4-tested; the trace asserts
rows and state).

### The l0b migration

`v3/src/goldenTrace.test.ts` → `git mv` →
`v3/src/l0bTrace.test.ts`, refactored to a lift-less `TraceFixture` on
the harness; the new `v3/src/l0aTrace.test.ts` sits beside it (the
src-root golden-trace precedent — trace tests are cross-module
end-to-end tests, they belong to no production module). The six-step
l0b content — INCLUDING the Stale step — is preserved verbatim as
fixture data; its assertions must not lose strength in the refactor
(the stale step's `stale(currentVersion)` expectation stays).

### Trace-status table (all 20, LITERAL coverage-inventory ids — the §5.2 deliverable; pre-approval finding 3)

| Trace id (units section) | Level state | Lift need | Owner |
|---|---|---|---|
| l0a-pseudocode | below kernel level | `expectedVersion` (tracked) | **ch5-P3 (this packet)** |
| l0b-pseudocode | AT kernel level | none | ch4-P4 (harness-refactored here) |
| l0c-pseudocode | above kernel level | n/a until L0c builds | future semantic chapter (map extension) |
| l0d-pseudocode | above kernel level | n/a until L0d builds | future semantic chapter (map extension) |
| l0e-pseudocode | above kernel level | n/a until L0e builds | future semantic chapter (map extension) |
| l0f-pseudocode | above kernel level | n/a until L0f builds | future semantic chapter (map extension) |
| l0f-mode-pseudocode | above kernel level | n/a until L0f-mode builds | future semantic chapter (map extension) |
| l1-pseudocode | above kernel level | n/a until L1 builds | future semantic chapter (map extension) |
| l2-pseudocode | above kernel level | n/a until L2 builds | future semantic chapter (map extension) |
| l2a-pseudocode | above kernel level | n/a until L2a builds | future semantic chapter (map extension) |
| l2b-pseudocode | above kernel level | n/a until L2b builds | future semantic chapter (map extension) |
| l3-pseudocode | above kernel level | n/a until L3 builds | future semantic chapter (map extension) |
| l4-pseudocode | above kernel level | n/a until L4 builds | future semantic chapter (map extension) |
| l5-pseudocode | above kernel level | n/a until L5 builds | future semantic chapter (map extension) |
| emit-contract-pseudocode | above kernel level (the ch5-P4 digest slice realizes ONE rung, not this trace) | n/a until EC builds | future semantic chapter (map extension) |
| action-pseudocode | above kernel level | n/a until workflow-actions builds | future semantic chapter (map extension) |
| auto-action-pseudocode | above kernel level | n/a until auto-actions builds | future semantic chapter (map extension) |
| release-pseudocode | above kernel level | n/a until runtime-teardown builds | future semantic chapter (map extension) |
| complete-pseudocode | above kernel level | n/a until archive-purge builds (the re-homed `CT-C-PURGE-AUDIT`'s neighborhood) | future semantic chapter (map extension) |
| storage-scope-pseudocode | has a runtime-SHAPED block, but the model says **"Not a handler trace"** | — | non-handler / placement-contract trace, NOT harness-replayable; realizes as documentation/review at its owner chapter |

(The 17 above-level sections CANNOT be lifted down — lifting only ADDS
mandatory fields, it never emulates missing semantics; replaying an l2
trace on an L0b kernel would need gate behavior that does not exist.
They wait for their levels and transfer on this harness at their owning
chapters. The honest core: 2 transferable today, 17 level-blocked, 1
non-replayable by design.)

## In-context notes (the scarce budget)

- The harness runs the §5.3 checkers via the exported `runAllCheckers`
  — testkit-internal import, no boundary issue.
- Time: tests bind the controlled clock as before (CHK-D-TESTCLOCK);
  the harness itself never touches time.
- The redelivery step and the stale step are ORDER-SENSITIVE contract
  probes (check order: duplicate before stale) — the fixture format
  must not "helpfully" dedupe or reorder steps; replay is strictly
  sequential.
- `expect` on committed steps asserts version only; step/round/status
  ride the final-state block + the checkers (keeping fixtures readable
  — per-step full state would triple the fixture for no added proof:
  any mid-trace state error surfaces in the final state, the
  transcript, or a checker).

## Embedding gates (v1-inherited)

- Target files: `v3/src/testkit/traceHarness.ts` +
  `traceHarness.test.ts` (the negative self-tests), `testkit/index.ts`
  (export); `v3/src/l0aTrace.test.ts` (new);
  `v3/src/goldenTrace.test.ts` → `v3/src/l0bTrace.test.ts` (git mv +
  refactor); this packet file.
- Mutation boundary: exactly those. `kernel/`, `store/`, `ingress/`,
  `domain/`, `ports/`, `drift/`, the coverage script, and the lint
  config unchanged.

## Acceptance

- l0a trace green on the real skeleton (scripted ingress → kernel →
  SQLite): four committed rows, Duplicate at 3′, round 2 from b2,
  DONE at d4, `runAllCheckers` empty.
- l0b trace green ON THE HARNESS with unchanged assertion strength:
  six steps incl. Stale as fixture data, PLUS the supplemental block
  over the returned outcomes + finalDetail (intent actor, ContextPacket
  fields, handoff on the outcomes; the commit ≠ deliver envelope shape
  on `finalDetail.transcript` — nothing the old test asserted is
  dropped).
- Harness negative self-tests: one red fixture per dimension 1–3; the
  dimension-4 corrupt-detail seam probe (checkers enforced, not just
  present); the dimension-5 lift-weakening probe (redelivery expecting
  `committed` fails).
- Coverage: traces 2/20; validation green (this packet's slice parsed).
- All v3 bridges green; no lint/ADR changes (the boundary is honored
  by injection, not by exemption).
- Standing review rules: REV-B-LOCAL-NOT-AUTHORITY applies to the
  harness (it asserts against the STORE's read, never a harness-local
  state cache — the tracked running version is lift input, not an
  assertion source); REV-A1-TXN / REV-E untouched.

## Build record (chapter rule 2)

- **Negative placement (build decision within the declared file set):**
  the testkit lint bans kernel/store imports in ALL testkit files —
  tests included — so the real-kernel negatives (dimensions 1–3 + 5)
  live in `v3/src/l0aTrace.test.ts` beside the trace they mutate, and
  `v3/src/testkit/traceHarness.test.ts` carries what needs NO kernel:
  the dimension-4 corrupt-detail probe (fake seams: clean outcomes,
  seq-gapped detail → replay fails on the checkers) and the fail-closed
  lift-less probe. That ban is ADR-005 working as intended, not an
  obstacle.
- All five dimension negatives + the fail-closed probe executed as
  STANDING tests (they run on every CI pass, not once at build).
- Start-step `currentStep` is asserted via `store.loadInstance` (the
  store is the authority — Started does not carry a step field;
  REV-B-LOCAL-NOT-AUTHORITY applied to the harness's own assertion
  source).
