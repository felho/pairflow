# Domain State Model Refactor — Step 1 Manifest

Status: settled (Steps 2–3 + 4a + 4b-α complete; Step 4b-β / 4b-γ pending; final parser switch is the mandatory program endpoint)
Last updated: 2026-05-12 (Step 4b atomic split revised — see §10.10 — and MetaReviewSubstate deviation recorded — see §10.11)
Owner: architecture/domain-state
Scope: relocate `src/v11/shared/state/*` to `src/v11/domain/state/*` as
the canonical home for the bubble state domain model, restructure into
first-class sub-areas (no `internal/` wrapper), and introduce a
derived discriminated union for `BubbleStateSnapshot` so that lifecycle
+ authority + meta-review invariants are enforced by TypeScript rather
than by runtime authority policy code.

This document is the contract between the design discussion and the
execution commits (Step 2 through Step 6 below). The execution
sequence does not begin until this manifest is reviewed and the
**Open questions** section is resolved.

---

## 0. Anchoring decisions (already settled)

1. **Persisted shape stays stable.** No new persisted discriminator field
   (no `running_mode`, no split `RUNNING_STANDARD` lifecycle state). The
   `state.json` wire format is preserved as-is.
2. **Derived discriminator inside the domain layer.** A parser converts
   the persisted shape into a narrower TypeScript variant; the variant's
   `kind` field is domain-only, never persisted.
3. **`domain/state/` is the canonical home.** `shared/state/` no longer
   exists as a package. Domain types and the parser both live in domain.
4. **Sub-areas are first-class, not `internal/`.** Domain modules don't
   need the application-lane `internal/` convention; the sub-areas are
   themselves first-class domain concerns.
5. **No backward-compatibility re-export shim from `shared/state/`.**
   Every consumer retargets to `domain/state/`. Any leftover
   `shared/state/` import is a real bug, not a compatibility window.

---

## 1. Target file tree

After the program completes, `src/v11/shared/state/` is gone and
`src/v11/domain/state/` looks like this:

```
src/v11/domain/state/
├── snapshot/
│   ├── bubbleStateSnapshot.ts              (domain variant types + kind discriminator)
│   ├── persistedBubbleStateSnapshot.ts     (persisted wire shape — broad nullable)
│   └── roundRoleHistory.ts                 (type definition + helpers)
├── execution/
│   ├── executionContextTypes.ts            (BubbleExecutionContext + BubbleMetaReviewExecutionContext + awaited-output unions + type predicates) [§10.9: types-only file for cycle break]
│   ├── executionContext.ts                 (build helpers — buildRunningExecutionContext, buildRestartedExecutionContext, toMetaReviewExecutionContext, metaReviewExecutionContextToRunningContext, executionContextsEqual — plus types re-exports for consumer convenience) [§10.9: combined helpers file]
│   └── stateSchemaExecution.ts             (execution slice parser)
├── authority/
│   ├── metaReviewAuthority.ts              (isMetaReviewAuthorityActive + meta-review-specific invariants)
│   ├── executionContextAuthority.ts        (when execution_context is required vs forbidden)
│   ├── snapshotInvariants.ts               (cross-field value invariants surviving narrowing)
│   └── kindDiscrimination.ts               (the persisted -> kind discriminator function)
├── schema/
│   ├── parseBubbleStateSnapshot.ts         (boundary parser: unknown -> BubbleStateSnapshot)
│   ├── parseSnapshotSlices.ts              (core/activity/round-role/rework slice parsers)
│   └── parseValidationPrimitives.ts        (or import from shared/validation/ if it stays there)
├── metaReview/
│   ├── metaReviewSnapshot.ts               (BubbleMetaReviewSnapshotState type + MetaReviewSubstate variant)
│   ├── parseMetaReviewSnapshot.ts          (parser for the meta_review sub-object)
│   ├── metaReviewRuntimeDelivery.ts        (runtime_delivery type + parser)
│   └── metaReviewAutonomousControls.ts     (auto_rework_count/limit/sticky_human_gate fields + parsers)
├── rework/
│   ├── reworkIntentTypes.ts                (BubbleReworkIntentRecord + ReworkIntentStatus)
│   ├── parseReworkIntent.ts                (slice parser)
│   └── reworkIntentTransitions.ts          (moved + renamed from current domain/state/reworkIntent.ts; deriveQueuedDeferredReworkIntentState + applyDeferredReworkIntent)
├── machine.ts                              (state machine; existing)
├── transitions.ts                          (transition matrix; existing)
├── initialState.ts                         (existing)
├── startState.ts                           (existing)
├── roundContinuation.ts                    (existing)
└── watchdogEscalation.ts                   (existing)
```

(reworkIntent.ts moves from the domain/state/ root into rework/ for
thematic cohesion with the rework slice parser — see §10.6.)

Notes:

- Total file count grows modestly. The original Step 1 plan was a
  5-file split for `executionContext.ts`; the 3c2 deviation (§10.9)
  keeps it as a 2-file shape (types + combined helpers) because the
  5-file split triggered an import cycle through the actorProtocol
  consumer. Schema validators do split into thematic parsers across
  sub-areas (snapshot/authority/metaReview/rework/execution).
- The current `shared/metaReview/metaReviewSnapshotTypes.ts` and
  `shared/metaReview/metaReviewSnapshot.ts` stay in `shared/metaReview/`
  for now — they are higher-level meta-review concerns (delivery,
  outcomes, transcript). Only the **state-snapshot fragment** of
  meta-review moves to `domain/state/metaReview/`. **Open question:**
  whether to also move `shared/metaReview/` into `domain/metaReview/`
  later — out of scope here, noted in §10.
- The current `shared/validation/primitives.ts` is consumed by both the
  state parser and other parsers (e.g., metaReview snapshot). It stays
  in `shared/validation/` since it is a truly cross-domain technical
  primitive (`isNonEmptyString`, `isIsoTimestamp`, etc.), not a state
  concern.

---

## 2. Persisted shape vs domain shape — the parser boundary

The persisted shape is what is written to and read from `state.json`:

```ts
// domain/state/snapshot/persistedBubbleStateSnapshot.ts

export interface PersistedBubbleStateSnapshot {
  bubble_id: string;
  state: BubbleLifecycleState;
  round: number;
  active_agent: AgentName | null;
  active_role: AgentRole | null;
  active_since: string | null;
  execution_context?: BubbleExecutionContext | null;
  round_role_history: RoundRoleHistoryEntry[];
  last_command_at: string | null;
  pending_rework_intent?: BubbleReworkIntentRecord | null;
  rework_intent_history?: BubbleReworkIntentRecord[];
  meta_review?: PersistedBubbleMetaReviewSnapshot;
}

export interface PersistedBubbleMetaReviewSnapshot {
  execution_context?: BubbleMetaReviewExecutionContext | null;
  runtime_delivery?: BubbleMetaReviewRuntimeDeliveryState | null;
  auto_rework_count: number;
  auto_rework_limit: number;
  sticky_human_gate: boolean;
  consecutive_clean_runs?: number;
}
```

This is the current `BubbleStateSnapshot` shape, renamed. It is the
**input** to `parseBubbleStateSnapshot` and the **output** of any
serialization helper. External tooling (JSON dumps, manual edits,
state.json files) deal with this shape only.

The domain shape is the parsed/narrowed variant model (§3 below). Only
domain/application/infrastructure consumers inside the v11 codebase see
the variant type. The variant is never serialized.

The parser:

```ts
// domain/state/schema/parseBubbleStateSnapshot.ts

export function parseBubbleStateSnapshot(
  input: unknown
): ValidationResult<BubbleStateSnapshot>;

export function assertParsedBubbleStateSnapshot(
  input: unknown
): BubbleStateSnapshot;  // throws on invalid
```

The parser performs three jobs in sequence:

1. **Shape validation** — verify the persisted shape's field types and
   slice integrity (round-role history entries valid, rework intents
   well-formed, etc.). Output: `PersistedBubbleStateSnapshot` or errors.
2. **Cross-field invariant validation** — verify the runtime invariants
   that can't be expressed in TypeScript shape (e.g.,
   `execution_context.round === state.round` when both are present).
3. **Kind discrimination** — derive the variant `kind` from
   `state + round + active_role + meta_review` field combinations.
   Output: `BubbleStateSnapshot` (the variant union).

Job 2 is what survives from the current `stateSchemaAuthorityChecks.ts`
once the shape rules are absorbed by TypeScript narrowing. Job 3 is
the new derivation logic.

---

## 3. Variant set

### 3.1 Outer variants (`kind` field — domain-only discriminator)

```ts
// domain/state/snapshot/bubbleStateSnapshot.ts

export type BubbleStateSnapshot =
  | BubbleStateInactiveInitial
  | BubbleStateRunningIdeation
  | BubbleStateRunningStandard
  | BubbleStateRunningMetaReview
  | BubbleStateWaitingHuman
  | BubbleStateReadyForApproval
  | BubbleStateTerminalClean
  | BubbleStateTerminalFailed;

interface BubbleStateCommonFields {
  bubble_id: string;
  round: number;
  round_role_history: RoundRoleHistoryEntry[];
  last_command_at: string | null;
  pending_rework_intent: BubbleReworkIntentRecord | null;
  rework_intent_history: BubbleReworkIntentRecord[];
  meta_review: MetaReviewSubstate;
}

// CREATED, PREPARING_WORKSPACE
export interface BubbleStateInactiveInitial extends BubbleStateCommonFields {
  kind: "inactive_initial";
  state: "CREATED" | "PREPARING_WORKSPACE";
  active_agent: null;
  active_role: null;
  active_since: null;
  execution_context: null;
}

// RUNNING + round = 0 (ideation)
export interface BubbleStateRunningIdeation extends BubbleStateCommonFields {
  kind: "running_ideation";
  state: "RUNNING";
  round: 0;
  active_agent: null;
  active_role: null;
  active_since: null;
  execution_context: null;
  meta_review: MetaReviewSubstateInactive | undefined;  // ideation forbids active meta-review
}

// RUNNING + round >= 1, standard (non-meta-review) authority
export interface BubbleStateRunningStandard extends BubbleStateCommonFields {
  kind: "running_standard";
  state: "RUNNING";
  active_agent: AgentName;
  active_role: Exclude<AgentRole, "meta_reviewer">;
  active_since: string;
  execution_context: BubbleExecutionContext;
  meta_review: MetaReviewSubstateInactive | undefined;
}

// RUNNING + round >= 1, meta-review authority
export interface BubbleStateRunningMetaReview extends BubbleStateCommonFields {
  kind: "running_meta_review";
  state: "RUNNING";
  active_agent: AgentName;
  active_role: "meta_reviewer";
  active_since: string;
  execution_context: BubbleExecutionContext & { active_role: "meta_reviewer"; awaited_output_type: "meta_review_result" };
  meta_review: MetaReviewSubstateActive;
}

// WAITING_HUMAN — active_* present (carried from prior RUNNING)
export interface BubbleStateWaitingHuman extends BubbleStateCommonFields {
  kind: "waiting_human";
  state: "WAITING_HUMAN";
  active_agent: AgentName;
  active_role: AgentRole;
  active_since: string;
  execution_context: null;
}

// READY_FOR_HUMAN_APPROVAL — active_* present (carried from prior RUNNING)
export interface BubbleStateReadyForApproval extends BubbleStateCommonFields {
  kind: "ready_for_approval";
  state: "READY_FOR_HUMAN_APPROVAL";
  active_agent: AgentName;
  active_role: AgentRole;
  active_since: string;
  execution_context: null;
}

// APPROVED_FOR_COMMIT, COMMITTED, DONE — no active work in progress
export interface BubbleStateTerminalClean extends BubbleStateCommonFields {
  kind: "terminal_clean";
  state: "APPROVED_FOR_COMMIT" | "COMMITTED" | "DONE";
  active_agent: null;
  active_role: null;
  active_since: null;
  execution_context: null;
}

// FAILED, CANCELLED — terminal failure paths
export interface BubbleStateTerminalFailed extends BubbleStateCommonFields {
  kind: "terminal_failed";
  state: "FAILED" | "CANCELLED";
  active_agent: null;
  active_role: null;
  active_since: null;
  execution_context: null;
}
```

**8 outer variants.** Each variant pins lifecycle state + the active_* +
execution_context combinations that are valid for it. The previous
authority rules that asserted these combinations at runtime are now
implicit in the type.

### 3.2 MetaReview inner axis

> **Status:** NOT IMPLEMENTED — see §10.11 for the settled decision.
> The `kind` outer discriminator pins meta-review semantics on
> `running_meta_review` without an inner substate union. The variant
> types reference `BubbleMetaReviewSnapshotState` (the persisted
> shape) directly. The original §3.2 design below is preserved as
> historical context for the program decision history.

The `meta_review` field carries its own discrimination, orthogonal to
the outer variant:

```ts
// domain/state/metaReview/metaReviewSnapshot.ts

interface BubbleMetaReviewCommonFields {
  runtime_delivery: BubbleMetaReviewRuntimeDeliveryState | null;
  auto_rework_count: number;
  auto_rework_limit: number;
  sticky_human_gate: boolean;
  consecutive_clean_runs: number;
}

export interface MetaReviewSubstateInactive extends BubbleMetaReviewCommonFields {
  status: "inactive";
  execution_context: null;
}

export interface MetaReviewSubstateActive extends BubbleMetaReviewCommonFields {
  status: "active";
  execution_context: BubbleMetaReviewExecutionContext;
}

export type MetaReviewSubstate =
  | MetaReviewSubstateInactive
  | MetaReviewSubstateActive;
```

The `status` field is also **domain-only derived**, not persisted.
Parsing rule: if persisted `meta_review.execution_context` is set,
status is "active"; otherwise "inactive". The parser also throws if
the outer variant is `running_meta_review` but the persisted
`meta_review.execution_context` is missing — that's an invariant
violation, not a parser error.

The `BubbleStateRunningMetaReview` outer variant pins the inner
`MetaReviewSubstateActive` type via the `meta_review:
MetaReviewSubstateActive` field constraint. This is where the
"meta-review state with no meta_review.execution_context" combination
becomes type-impossible.

The other outer variants accept either `MetaReviewSubstateInactive`
or `undefined` (the meta_review field may not be present at all on
bubbles that never reached a meta-review state).

### 3.3 Construction helpers

Consumers that build snapshots (state machine transitions,
infrastructure persistence write path) need helpers to construct
specific variants. Suggested helpers (final shape TBD during Step 4b):

```ts
// domain/state/snapshot/bubbleStateSnapshot.ts

export function createInactiveInitialSnapshot(
  input: { bubbleId: string; state: "CREATED" | "PREPARING_WORKSPACE"; ... }
): BubbleStateInactiveInitial;

export function createRunningStandardSnapshot(
  input: { bubbleId: string; round: number; activeAgent: AgentName; ... }
): BubbleStateRunningStandard;

// ... one per variant
```

This decouples construction from the discriminated union shape, so
consumers don't have to remember to set `kind` manually.

**Cycle awareness:** if a future split of construction helpers
introduces a barrel/cycle issue (per §10.9's executionContext
precedent), prefer co-locating helpers with their dependency-source
file and exposing types from a sibling `*Types.ts` file rather than
fragmenting helpers further. Fitness boundary checks are the ground
truth — do not preemptively split.

---

## 4. Runtime invariants surviving narrowing

The following invariants **cannot** be enforced by TypeScript and
remain as runtime checks inside the parser:

1. **execution_context.round === state.round** when both are present.
2. **execution_context.active_role === active_role** when both are present
   (mirror invariant for non-meta-review running variants too).
3. **meta_review.execution_context fields mirror the outer
   execution_context** when both are active (handoff_id, round, etc.).
4. **execution_context_id, handoff_id non-empty strings** (TS can't
   express non-empty at the type level).
5. **ISO timestamp format on active_since, started_at, deadline_at,
   etc.** (TS string is too broad).
6. **active_role allowed values within
   AgentRole** — TS narrows the type, but the runtime parser still has
   to verify the persisted string is one of the union members.
7. **round_role_history monotonicity** (round numbers ascending, role
   assignments consistent across rounds).
8. **rework_intent_history.intent_id uniqueness** (current
   `validateBubbleStateSnapshot` enforces this; survives).
9. **auto_rework_count ≤ auto_rework_limit**, both non-negative
   integers, etc. (meta-review autonomous control invariants).

These are **9 runtime invariant groups**, down from the current ~20+
authority rules. The reduction is the win.

---

## 5. Consumer impact map

### 5.1 Counts

- **101** `src/v11/**/*.ts` files reference `shared/state/*`.
- **53** test files reference `shared/state/*`.
- **~172 lines** of code do narrowing-relevant field reads on state
  (e.g., `state.execution_context`, `state.active_role`,
  `state.meta_review`) outside the schema validator itself.
- **~30 files** explicitly construct `BubbleStateSnapshot` objects
  (state machine transitions, infrastructure write path, tests).

### 5.2 Categorization

| Category | Estimate | Step 2 impact | Step 4b impact |
|----------|---------:|---------------|----------------|
| Type-only `import type` consumers | ~60 | Path update | None (signature still accepts `BubbleStateSnapshot`) |
| Field-read consumers (need narrowing) | ~30 | Path update | Narrowing required at read sites |
| Construction consumers (build snapshots) | ~10 | Path update | Switch to variant-specific construction helper |
| Pass-through consumers (function args) | ~50 | Path update | None |
| Tests (all categories combined) | ~53 | Path update + mirror move | Narrowing required for tests that read fields |

The Step 2 path update is mechanical (`shared/state/X` →
`domain/state/X`). The Step 4b narrowing impact is the variable-cost
part of the program.

### 5.3 Heaviest-impact files (representative)

The narrowing scope concentrates in these areas:

- **`domain/state/machine.ts`** (94 LOC) — applyStateTransition reads
  + constructs snapshots; central hub.
- **`infrastructure/state/stateStore.ts`** — persistence read/write
  path; uses parser for read, must produce persisted shape for write.
- **`infrastructure/state/stateSnapshotInspection.ts`** — diagnostic
  reads.
- **`application/start/internal/runtime/startStatePersistence.ts`** —
  initial-state writes.
- **`application/kickoff/internal/mutation/kickoff{State*}.ts`** (4
  files) — kickoff state transitions.
- **`application/pass/internal/normalPass/postAppendStateWriter.ts`** —
  PASS state writes.
- **`application/converged/internal/flow/convergedExecution.ts`** —
  convergence state writes.
- **`application/metaReviewGate/internal/state/metaReviewGateState*.ts`**
  (3 files) — meta-review-gate state reads/writes.
- **`application/askHuman/internal/mutation/askHumanRunningStateValidation.ts`**
  + `askHumanRunningStateValidationChecks.ts` — explicit runtime
  authority checks that mirror the parser's invariants; may be
  candidate for removal post-Step-4b.

The narrowing pattern most consumers will need:

```ts
// Before
function readActiveRole(state: BubbleStateSnapshot): AgentRole | null {
  return state.active_role;
}

// After
function readActiveRole(state: BubbleStateSnapshot): AgentRole | null {
  switch (state.kind) {
    case "running_standard":
    case "running_meta_review":
    case "waiting_human":
    case "ready_for_approval":
      return state.active_role;
    case "inactive_initial":
    case "running_ideation":
      return null;
    case "terminal_clean":
    case "terminal_failed":
      return state.active_role;  // may or may not be null depending on §10.1 resolution
  }
}
```

For most consumers a **kind-guarding helper function** will be
preferable to inline switches at every read site:

```ts
// domain/state/snapshot/guards.ts

export function isRunningSnapshot(
  s: BubbleStateSnapshot
): s is BubbleStateRunningStandard | BubbleStateRunningMetaReview;

export function isActiveSnapshot(
  s: BubbleStateSnapshot
): s is BubbleStateRunningStandard | BubbleStateRunningMetaReview | BubbleStateWaitingHuman | BubbleStateReadyForApproval;
```

These guards encapsulate the "which variants have active_* fields"
question once, instead of repeating it in 30+ call sites.

---

## 6. Test impact map

### 6.1 Direct internal-import tests (move alongside source)

- `tests/v11/shared/metaReview/metaReviewSnapshot.test.ts` — imports
  `shared/state/internal/metaReview/stateSchemaMetaReview.js` and
  `stateSchemaMetaReviewRuntime.js`. After Step 3 these become
  `domain/state/metaReview/parseMetaReviewSnapshot.js` and
  `metaReviewRuntimeDelivery.js`. Test mirror move to
  `tests/v11/domain/state/metaReview/`.

### 6.2 Mirror-aligned tests (path update only)

Tests under `tests/v11/shared/state/` mirror current `shared/state/`.
After move, they relocate to `tests/v11/domain/state/`.

Likely files (verify during Step 1 review):
- `tests/v11/shared/state/bubbleStateSnapshotSchema*.test.ts`
- `tests/v11/shared/state/executionContext.test.ts`
- `tests/core/state/executionContext.test.ts` (cross-mirror — see §6.3)
- Other `shared/state/`-mirror tests.

### 6.3 Cross-mirror-root tests (precedent re-fire)

- `tests/core/state/executionContext.test.ts` — under `tests/core/`,
  but tests `shared/state/executionContext.ts` behavior. After move
  to `domain/state/execution/`, the mirror root is wrong. Two options:
  (a) move under `tests/v11/domain/state/execution/`, mirroring the new
  source location (preferred — matches the metaReviewGate
  cross-mirror-root precedent); (b) keep at `tests/core/state/` if
  this test spans multiple state-related concerns. **Open question
  §10.4.**

### 6.4 Field-narrowing tests (Step 4b)

Most tests that read snapshot fields directly will need narrowing
updates. These are the same ~30-50 files as in §5.2's field-read
category. Treatable mechanically using the guard helpers from §5.3.

---

## 7. Commit sequence

### Step 2 — Move ownership (1 commit)

**Scope:** `git mv` every file from `src/v11/shared/state/*` to
`src/v11/domain/state/*` **without renaming or splitting**. Update
all import paths in the 101 src files + 53 tests. Zero behavior
change. Zero new files, zero file splits.

**Affected files:** ~17 moved + ~154 import-path updates + no internal/
restructure yet (the `internal/` subdir comes along as-is).

**Commit message:** "Move shared/state/ package to domain/state/ (no
structural changes)."

**Validation:** typecheck + lint + fitness + full test + build.

### Step 3 — Restructure into first-class sub-areas (4 commits — landed)

The internal/ wrapper unwrap is the structural rename. The plan
called for 3 sub-commits; in execution 3c split into 3c1 and 3c2 to
keep the type-files-move diff readable separately from the
executionContext-move + cycle-break work:

- **3a:** `domain/state/internal/schema/` → split into
  `domain/state/snapshot/` (slice parsers) +
  `domain/state/authority/` (the authority files). Drop the
  `internal/schema/` subdir. Path updates only. **Landed: e798ccbe.**
- **3b:** `domain/state/internal/{metaReview,rework,execution}/` →
  `domain/state/{metaReview,rework,execution}/`. Drop the `internal/`
  wrapper entirely. Path updates only. **Landed: 8537ba80.**
- **3c1:** Move type files (`bubbleStateSnapshotTypes.ts`,
  `reworkIntentTypes.ts`) into their sub-area homes. Path updates
  only; no renames yet. **Landed: 3953e04c.**
- **3c2:** Move the original `domain/state/execution/executionContext.ts`
  (206 LOC, multiple responsibilities) into `execution/`. The Step 1
  plan was a 5-file split; the fitness dependency check caught a
  barrel-induced cycle between the per-function files and
  `shared/actorProtocol/roleExecutionProjection.ts`. Final shape:
  2-file (`executionContextTypes.ts` holds types + predicates;
  `executionContext.ts` holds build helpers and re-exports types
  for consumer convenience). The planned
  `executionContextTypes.ts` → `executionContext.ts` and
  `bubbleStateSnapshotTypes.ts` → `bubbleStateSnapshot.ts` renames
  do NOT happen in Step 3. The `Types` suffix stays as the
  cycle-break boundary marker (§10.9), and
  `bubbleStateSnapshotTypes.ts` is instead renamed to
  `persistedBubbleStateSnapshot.ts` in Step 4a. **Landed: 43dec6b0.**

Behavior unchanged through all four commits. The lane is now in its
target shape minus the parser-semantics rename and the variant
model. See §10.9 for the 3c2 deviation rationale.

### Step 4a — Parser semantics rename (1 commit)

**Scope:** `validateBubbleStateSnapshot` → `parseBubbleStateSnapshot`
(rename only, signature unchanged: still returns
`ValidationResult<PersistedBubbleStateSnapshot>` for now — the variant
model lands in 4b). `assertValidBubbleStateSnapshot` →
`assertParsedBubbleStateSnapshot`. Doc comment added explaining the
parser-as-boundary semantics.

Also: rename `BubbleStateSnapshot` → `PersistedBubbleStateSnapshot` in
`domain/state/snapshot/persistedBubbleStateSnapshot.ts` (file rename
too). Step 4b will introduce a new `BubbleStateSnapshot` alias for the
variant union; for now consumers see the old name pointing at the
persisted shape.

**Affected files:** the parser + ~17 direct callers across application/
+ infrastructure/.

### Step 4b — Variant model rollout (split — see §10.10)

The original Step 4b plan called for a single atomic commit that
introduced the variant types, switched the parser's return type to
`BubbleStateSnapshot`, and cascaded the change through every
consumer + test fixture. A live Step 4b attempt surfaced a much
larger blast radius than the pilot (§5) had estimated, driven
almost entirely by inline test fixture literals; §10.10 records
the lesson and the resulting sequence revision. The substantive
work is now staged across multiple green commits:

- **Step 4b-α — Additive variant model (1 commit, landed: 0ce0ddc9).**
  Introduce the variant types, kind discriminator, builder, guards,
  and projection helper as additive API. Add opt-in
  `parseDomainBubbleStateSnapshot` /
  `assertParsedDomainBubbleStateSnapshot` in `stateSchema.ts`. The
  canonical `parseBubbleStateSnapshot` continues to return
  `PersistedBubbleStateSnapshot`. No consumer change. No test
  fixture change.

- **Step 4b-β — Production consumer migration (multiple commits,
  pending).** Migrate domain + application + infrastructure
  consumers to the variant API (`parseDomainBubbleStateSnapshot`,
  guards, narrowing on `state.kind`) in small green increments.
  Each commit individually green on
  typecheck/lint/fitness/tests/build. Sequencing of these
  increments is determined when each batch is queued; this manifest
  does not pre-plan them.

- **Step 4b-γ — Test fixture migration + canonical parser switch
  (1 or more commits, pending; mandatory program endpoint).**
  Migrate test fixtures to the variant model (likely via a fixture
  helper or codemod once the production-side migration shows the
  representative patterns). Then flip
  `parseBubbleStateSnapshot`'s return type to `BubbleStateSnapshot`,
  drop `parseDomainBubbleStateSnapshot` /
  `assertParsedDomainBubbleStateSnapshot` as transitional API, and
  drop the authority shape rules subsumed by TypeScript narrowing.
  After this commit, every consumer of the parser receives the
  variant union; the persisted shape is reachable only via
  `infrastructure/state/` + test fixtures (per §10.4).

The **final design endpoint is unchanged**: the canonical parser
returns `BubbleStateSnapshot`, and the persisted shape is a narrow
boundary type. The split is a sequencing correction in service of
the green-commit invariant, not a design retreat.

### Step 5 — Test mirror cleanup (1 commit)

The cross-mirror-root tests (§6.3) move to align with source
locations. Most tests already aligned during Step 2.

### Step 6 — Doc sync (1 commit)

This manifest moves to "executed" status. Survey + template (the lane
docs) get a brief cross-reference to the state model refactor as the
domain-state precedent. Any architecture-fitness docs that referenced
`shared/state/` get updates.

### Total: ~11+ commits (revised — see §10.10)

| #   | Step  | Files | Status | Behavior change |
|----:|-------|------:|--------|-----------------|
| 1   | 2     | ~17 + 154 import updates | landed (935eefec) | No |
| 2   | 3a    | ~6 | landed (e798ccbe) | No |
| 3   | 3b    | ~5 | landed (8537ba80) | No |
| 4   | 3c1   | ~5 | landed (3953e04c) | No |
| 5   | 3c2   | ~3 + types split | landed (43dec6b0) | No |
| 6   | 4.0   | 1 doc | landed (b6998a27) | No |
| 7   | 4a    | 142 (5 token rename) | landed (a3ae830a) | No |
| 8   | 4b-α  | 7 (5 new + 1 modified + 1 test) | landed (0ce0ddc9) | No (additive) |
| 9   | 4.1   | 1 doc | in progress | No (this commit) |
| 10+ | 4b-β  | tbd per increment | pending | Per increment |
| N   | 4b-γ  | tbd | pending | **Yes** (canonical parser returns variant; transitional API removed) |
| N+1 | 5     | ~5 | pending | No |
| N+2 | 6     | 2-3 docs | pending | No |

(Step 4b-β is a series of small green migration commits; commit
count is determined as each batch queues. Step 5 may collapse into
the doc-sync commit if test moves are small.)

---

## 8. Behavior changes (Step 4b only)

The only commit with intentional behavior change is Step 4b. The
visible-to-consumer changes:

1. **Type signatures narrow.** Consumers receiving
   `BubbleStateSnapshot` see a discriminated union. They must narrow
   on `state.kind` (or use a guard) to read variant-specific fields.
2. **Some runtime checks disappear.** Cases like "RUNNING state
   requires active_role" no longer throw at runtime — the type
   forbids constructing such a snapshot. If callers were depending
   on the runtime check to validate untrusted input, they need to
   use the parser instead.
3. **Persisted-shape access via the persisted type.** Code paths that
   work with the raw JSON (manual state.json edits, debug dumps) use
   `PersistedBubbleStateSnapshot`. The parser converts.

There are **no wire-format changes**, **no schema migrations**, and
no changes to the state machine's transition semantics.

---

## 9. Validation strategy per commit

Each step's commit must be green on all of:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm fitness:check:ci`
- `pnpm test` (full)
- `pnpm build`

The riskiest commit is Step 4b. Suggested intermediate validation
during 4b authoring:

1. Define the variant types + helpers first, leave parser returning
   old broad type. Typecheck the new code in isolation.
2. Switch parser return type to variant union. This will cascade
   typecheck errors across all ~30 narrowing call sites. Address
   them iteratively. **All in the same commit.**
3. Drop the authority-rule files that the variant model subsumes.
4. Validate.

---

## 10. Settled decisions (formerly open questions)

### 10.1 Active-field semantics on terminal states — TIGHTENED

**Evidence reviewed:**
- `machine.ts:24-34` defines `statesThatClearExecutionContext` for all
  non-RUNNING states but does NOT auto-clear `active_*`. In
  `machine.ts:73-78` the rule is: `undefined` keeps previous,
  `null` clears explicitly.
- `startState.ts:117-127` (`deriveStartFailedCleanupState`) explicitly
  passes `activeAgent: null, activeRole: null, activeSince: null`
  when transitioning to FAILED, confirming the intent that terminal
  states do not retain active_* ownership.
- The schema's all-or-none rule technically permits either
  configuration on non-RUNNING states, so the existing model is
  weaker than the operational intent.

**Decision:** `BubbleStateTerminalClean` (APPROVED_FOR_COMMIT,
COMMITTED, DONE) and `BubbleStateTerminalFailed` (FAILED, CANCELLED)
variants have `active_agent: null`, `active_role: null`,
`active_since: null` — the strict shape that reflects "no active work
in progress." §3.1 has been updated accordingly.

**Backward-compat implication:** the parser must decide what to do
with legacy persisted states that have non-null active_* on terminal
states. See §10.7 (parser strictness, settled below).

### 10.2 RUNNING + round = 0 + meta-review — CONFIRMED

**Evidence reviewed:**
- `initialState.ts:17-24` instantiates CREATED state with a
  `meta_review` field carrying inactive defaults — so the field
  may be present-inactive at any lifecycle state.
- `deriveStartRunningState` (startState.ts:44-75) constructs an
  ideation state (RUNNING + round=0) with `executionContext: null`,
  no active_*. Meta-review authority requires `execution_context`
  (per the authority rules). Therefore active meta-review is
  impossible during ideation.

**Decision:** `BubbleStateRunningIdeation.meta_review:
MetaReviewSubstateInactive | undefined` is correct as drafted. No
change to §3.1 needed.

### 10.3 Cross-mirror-root test placement — DECIDED

**Decision:** `tests/core/state/executionContext.test.ts` moves to
`tests/v11/domain/state/execution/` during Step 5, mirroring the
new source location. Consistent with the metaReviewGate, watchdog,
and reply cross-mirror-root test precedents.

### 10.4 PersistedBubbleStateSnapshot reachability — NARROW

**Evidence reviewed:**
- `infrastructure/state/stateStore.ts:47` serializes via
  `JSON.stringify(state, null, 2)` — direct persisted-shape write.
- `infrastructure/state/stateSnapshotInspection.ts:62` reads
  diagnostically via `JSON.stringify(state)` — direct read.
- 15+ application/domain files call `applyStateTransition`; all
  work with the domain variant, none touch the persisted shape
  directly.

**Decision:**
- `PersistedBubbleStateSnapshot` is exported from
  `domain/state/snapshot/persistedBubbleStateSnapshot.ts`.
- Allowed external consumers (post Step 4b): only files under
  `infrastructure/state/` and tests that fixture state.json
  contents. Application/domain code never imports the persisted
  type directly; it goes through the parser (read path) or through
  variant constructors plus a projection helper (write path).
- `domain/state/snapshot/projection.ts` provides
  `toPersistedSnapshot(snapshot: BubbleStateSnapshot):
  PersistedBubbleStateSnapshot` for the write path. `writeStateSnapshot`
  in `infrastructure/state/stateStore.ts` accepts the domain variant
  and calls the projection helper internally — callers of
  `writeStateSnapshot` need not be aware of the persisted shape.

### 10.5 Construction-helper signatures — DECIDED

**Evidence reviewed:**
- 15+ callers use `applyStateTransition(current, input)` as the
  primary state-mutation path.
- The current `StateTransitionInput` (machine.ts:13-22) takes broad
  optional fields and merges with the previous snapshot using
  `undefined = keep / null = clear` semantics.
- Per-variant constructors do exist (e.g., `createInitialBubbleState`
  in initialState.ts) but are exceptions, not the rule.

**Decision:**
- `applyStateTransition` signature stays the same:
  `(current: BubbleStateSnapshot, input: StateTransitionInput):
  BubbleStateSnapshot`. The input type remains the broad optional
  fields shape for compatibility.
- The function body changes internally: after building the merged
  flat record, it discriminates against the target lifecycle state
  + provided fields and constructs the appropriate variant. If
  the input does not provide enough fields to satisfy the target
  variant (e.g., transitioning to RUNNING + round>=1 + standard
  without `executionContext`), the function throws a typed error
  with a clear message — same failure mode as today, just enforced
  through the variant constructor instead of through the schema
  validator at the tail.
- Per-variant helpers (`createRunningStandardSnapshot`,
  `createWaitingHumanFromRunning`, etc.) are **optional additive
  conveniences**, not required for Step 4b. They may be added
  later if call sites would benefit.

### 10.6 `domain/state/reworkIntent.ts` placement — MOVED INTO REWORK/

**Evidence reviewed:**
- `domain/state/reworkIntent.ts` (150 LOC) holds
  `deriveQueuedDeferredReworkIntentState` and
  `applyDeferredReworkIntent` — pure rework-intent state transition
  logic.
- It imports from `machine.ts` and `roundContinuation.ts` (state-
  root cohorts) — a sub-area move doesn't break those imports.
- The rework slice parser belongs in `rework/` per the target tree.

**Decision:** `reworkIntent.ts` moves into `domain/state/rework/`
during Step 3b, renamed to `reworkIntentTransitions.ts` to
disambiguate from the type-only `reworkIntentTypes.ts` sibling. §1
target tree updated.

### 10.7 Parser strictness on legacy/wrong inputs — STRICT-REJECT

A new question surfaced by the §10.1 tightening: when the parser
encounters a persisted state file where (e.g.) `state: "DONE"` has
non-null `active_role`, what should it do?

Three options:

- **Strict-reject:** parser returns a validation error. Real bugs
  become loud, never silently absorbed.
- **Tolerant-normalize:** parser silently nulls the offending field
  to match the variant. Smooths over historical inconsistency.
- **Warn-and-normalize:** parser normalizes but logs a structured
  warning. Surfaces the inconsistency without breaking workflows.

**Decision: strict-reject.** Pairflow controls its own state writes;
any legacy state file that violates the tightened invariants
reflects a real bug in past code (or an unsupported manual edit),
and silently normalizing would mask the bug. A startup state-file
audit (one-off script during the Step 4b deployment) can pre-flag
any in-the-wild violations. If such files exist and they were
written by Pairflow itself, fix the writer in the same Step 4b
commit. If they're manual edits, the user is responsible.

**Note:** this decision applies to **value-level** invariants
inside variants (e.g., terminal state with non-null active_*),
NOT to shape-level invariants enforceable by TypeScript itself.
Shape violations always reject (no choice).

### 10.8 Variant validation order in parser — DECIDED

Two natural orderings:

1. Validate all slice shapes first → derive `kind` from result.
2. Derive `kind` from raw input fields → validate within the
   discriminated variant.

**Decision:** order 1. Slice shape validation is per-field and
catches malformed input before the kind discrimination relies on
those fields. The kind discriminator (in
`domain/state/authority/kindDiscrimination.ts`) operates on the
already-validated `PersistedBubbleStateSnapshot`. This means the
discriminator function's input type is the persisted shape, not
`unknown`; the parsing layer wraps everything.

### 10.9 ExecutionContext split — 2-FILE SHAPE (3c2 deviation)

**Background:**
§1's original target tree split `executionContext.ts` into 5
single-responsibility files (`executionContextTypes.ts`,
`buildRunningExecutionContext.ts`,
`buildRestartedExecutionContext.ts`, `metaReviewExecutionContext.ts`,
`executionContextsEqual.ts`) and renamed `executionContextTypes.ts`
to `executionContext.ts` (since the directory's purpose was
types-first).

**Issue surfaced during Step 3c2:**
The per-function split combined with the manifest-prescribed
re-export barrel introduced a fitness-detected import cycle:

- `buildRestartedExecutionContext.ts` ↔ `buildRunningExecutionContext.ts`
  (helper composition: restart calls running's build path).
- `executionContext.ts` (the barrel) ↔ all 4 helper files.
- `shared/actorProtocol/roleExecutionProjection.ts` ↔
  `executionContext.ts` (types flow one way, helper import flows the
  other).

Even after collapsing back to a single helpers file (merging types
+ helpers into `executionContext.ts`), the actorProtocol cycle
remained: `roleExecutionProjection.ts` needs the awaited-output
type union, and `executionContext.ts` needs
`roleExecutionProjection.ts`'s helper for `handoff_id` derivation.

**Decision:**
Two-file shape, types separated from helpers:

- `execution/executionContextTypes.ts` — types and type-predicate
  functions only.
- `execution/executionContext.ts` — build helpers; re-exports types
  from the sibling for consumer convenience.
- `shared/actorProtocol/roleExecutionProjection.ts` imports types
  from `executionContextTypes.js`, not from `executionContext.js` —
  the one-way edge breaks the cycle.

The `executionContextTypes.ts` → `executionContext.ts` rename
originally planned in §7 Step 3c does NOT happen. The `Types`
suffix is preserved as a semantic marker that this file is the
cycle-break boundary; the consumer convenience case is served by
the helpers-file re-exports.

**Rationale:**

- Fitness rules are the ground truth for architecture invariants.
  The manifest is a contract for the design intent, not for the
  exact file count.
- The 2-file shape preserves the design intent (types + helpers in
  a dedicated sub-area, no `internal/`, no re-export shim) while
  avoiding the cycle.
- Final file count grows by 1 instead of 4. Smaller diff, easier
  mental model for consumers.

**Forward implication for Step 4b:**
If construction helpers in `snapshot/bubbleStateSnapshot.ts` ever
trigger a similar cycle (e.g., a helper imports `applyStateTransition`
which itself imports back into snapshot types), apply the same
pattern: types in `bubbleStateSnapshotTypes.ts`, helpers in
`bubbleStateSnapshot.ts`, types re-exported via the helpers file
for consumer convenience. Do not preemptively split — let fitness
checks dictate.

**Landed:** Step 3c2 (commit 43dec6b0).

### 10.10 Step 4b atomic split — REVISED FOR FIXTURE BLAST RADIUS

**Background:**
The original §7 Step 4b called for a single atomic commit because
intermediate states would be typecheck-broken: switching the
parser's return type from `PersistedBubbleStateSnapshot` to the
`BubbleStateSnapshot` variant union cascades typecheck errors
across every consumer until each one narrows. Pilot estimates
(§5) projected 50–80 files and 500–1000 LOC of churn for that
atomic commit.

**Issue surfaced during the live Step 4b attempt:**
The actual cascade reached ~14 production source files (within
range) and ~277 test files (roughly 4–5× the pilot estimate). The
production-side cascade was tractable; the test-side was not.
Test fixtures throughout the codebase construct inline
state-snapshot literals and pass them to functions that the
parser switch would have begun typing as the variant union. With
the variant requiring a `kind` discriminator field, ~300–500
fixture sites needed simultaneous updates within a single commit
to remain green.

The pilot did not anticipate this because it focused on
production-side narrowing (the explicit §5 scope) and not on
test fixture surface. Fixture sites are mechanical to fix
individually but pervasive enough that bundling them into the
production-switch commit pushed the working tree into
multi-day, typecheck-broken territory — exactly the regime
the program has so far avoided.

**Decision:**
Step 4b is split across multiple green commits per §7's revised
"Step 4b — Variant model rollout":

- **4b-α (landed: 0ce0ddc9)** introduces the variant model as
  additive opt-in API. Parser unchanged. No consumer change.
- **4b-β (pending, multiple commits)** migrates production
  consumers to the variant API in small green increments.
- **4b-γ (pending, terminal commit)** migrates test fixtures and
  flips the canonical parser to return the variant union, dropping
  the transitional opt-in API.

Each commit remains green on
typecheck/lint/fitness/tests/build. The "atomic because
intermediate states are typecheck-broken" rationale becomes
"atomic per migration unit"; no commit ships in a broken state.

**Rationale:**
- The green-commit invariant is the program's primary safety
  property. A multi-day dirty tree fundamentally changes the
  collaboration model; preserving green is more valuable than
  preserving "single atomic Step 4b" semantics.
- The final design endpoint is unchanged: the canonical parser
  returns the variant union, and the persisted shape is a narrow
  boundary type (per §10.4). The terminal Step 4b-γ commit
  lands that endpoint.
- The variant model API is observable in 4b-α onward; production
  consumers can opt in and be reviewed individually. This
  surfaces narrowing-pattern issues earlier than a single big
  commit would have.

**Forward implication:**
Future refactors that change a deeply-shared type's return
shape should pre-budget for fixture blast radius alongside
production-side narrowing. The pilot scope (§5) should explicitly
include a fixture-construction count, not just a field-read
count.

**Mandatory program endpoint:** `parseBubbleStateSnapshot`
returns `BubbleStateSnapshot` (the variant union) at Step 4b-γ.
Until that commit lands, the program's terminal goal is not
achieved; 4b-α / 4b-β are intermediate stations, not the
destination.

### 10.11 MetaReviewSubstate inner discriminated union — NOT IMPLEMENTED

**Background:**
§3.2 specified an inner discriminated union for the `meta_review`
field: `MetaReviewSubstate = MetaReviewSubstateInactive |
MetaReviewSubstateActive`, with a domain-only `status` field as
discriminator. The substate types tightened
`BubbleMetaReviewSnapshotState`'s optional fields into required
ones, intended to give consumers tighter narrowing on meta-review
state.

**Issues surfaced during the Step 4b live attempt:**

- The substate's stricter shape (e.g., `runtime_delivery:
  T | null` required) was not assignable to the persisted
  `BubbleMetaReviewSnapshotState`'s optional shape under
  `exactOptionalPropertyTypes`. Each cross-boundary use needed
  conversion helpers.
- Several existing helpers (e.g., `clearLiveMetaReviewSnapshot`)
  return the persisted-shape `BubbleMetaReviewSnapshotState`,
  not the substate. Consumers reading
  `state.meta_review` (substate) and round-tripping through these
  helpers introduced widespread `MetaReviewSubstate` ↔
  `BubbleMetaReviewSnapshotState` projection plumbing.
- The deep-equality assertions in
  `tests/core/state/stateSchema.test.ts` (e.g., L38–46) check
  `meta_review` against literal objects without a `status` field;
  the substate's discriminator field would have required either
  test-wide updates or a `status`-less variant of the substate.

**Decision:**
The inner substate discriminated union is **not** implemented.
The variant types in
`src/v11/domain/state/snapshot/bubbleStateSnapshot.ts` reference
`BubbleMetaReviewSnapshotState` (the persisted shape) directly
for the `meta_review` field. Discrimination on meta-review state
remains available via the outer variant
(`state.kind === "running_meta_review"`) and via runtime checks
on `state.meta_review?.execution_context`.

**Rationale:**
- The outer `kind` discriminator already pins meta-review
  semantics for `running_meta_review` (active execution context,
  active_role = `meta_reviewer`). Most meta-review-aware code
  already narrows on the outer kind first.
- The substate's incremental narrowing benefit was small: it
  would have changed `state.meta_review?.execution_context !==
  null` checks to `state.meta_review?.status === "active"`
  checks. Same expressive power, different syntax.
- The cross-boundary conversion plumbing (helper return-type
  mismatches, fixture deep-equality breaks) cost more than the
  narrowing convenience saved.
- Per the §10.9 pattern: when the design intent fights the
  fitness check (or here, the type-system structural reality),
  prefer simpler structures that preserve the design intent.

**Forward implication:**
If a future change makes the substate discrimination clearly
beneficial (e.g., a refactor that introduces multiple
meta-review sub-states beyond just active/inactive), revisit
this decision. The `BubbleStateRunningMetaReview` variant pins
the outer authority, which is the bulk of what consumers need.

**Recorded:** 2026-05-12 (during the Step 4b atomic split
revision; see §10.10).

### 10.12 Step 4b-β lane transitivity + shared-boundary batches — DECIDED

**Background:**
The Step 4b-β sequence (§10.10) treats each application lane as a
migration unit. The early batches (start, kickoff, watchdog, pass,
converged, askHuman, askHuman mutation, reply, approval) each
migrated a single lane's `state` field, ports, and result type to
the variant model in a green commit. The implicit assumption was
that every remaining lane would have its own non-trivial migration
surface.

**Issue surfaced when scoping the resume lane batch (post Step
4b-β/10):**
A pre-batch scan of `src/v11/application/resume/**` returned **no**
remaining persisted-state references. The resume lane is a thin
delegator: `ResumeBubbleResult = EmitHumanReplyResult` (type alias),
and `resumeBubbleCommandOrchestration` calls `emitHumanReply`. With
the reply lane closed in Step 4b-β/9, the resume lane became
**transitively closed** — no production source change required.

A hidden-reference scan over CLI (`src/cli/`), UI defaults
(`src/v11/defaults/ui/`), UI infrastructure
(`src/v11/infrastructure/ui/`), and UI ports
(`src/v11/ports/uiRouter.ts`) found a single resume-adjacent
persisted-state surface: the shared UI projection adapter
`projectBubbleStateToUiActionState` at
`src/v11/defaults/ui/routerDefaults.ts`, whose input was
`PersistedBubbleStateSnapshot` while several of its callers
(reply/resume, approval, request-rework) already passed
`BubbleStateSnapshot`. TypeScript structural typing was masking
the contract mismatch — a variant value satisfies a persisted-shape
parameter because the variant carries every persisted field plus
the `kind` discriminator.

**Decision (recorded 2026-05-12):**

1. **Lane transitivity is acknowledged.** When a lane is a thin
   orchestrator that aliases another lane's already-migrated
   result type (e.g., `ResumeBubbleResult = EmitHumanReplyResult`),
   it is **transitively migrated** when its upstream closes. No
   separate batch is required and no manifest line item is owed
   for it; the closure is recorded here.

2. **Shared boundaries are valid batch units, not "lanes".** A
   shared cross-lane projection helper (e.g.,
   `projectBubbleStateToUiActionState`) is its own migration unit
   when multiple already-migrated lanes converge on it. Its
   migration is a boundary cleanup, not a lane migration:
   - Input contract migrates to `BubbleStateSnapshot`.
   - Already-variant callers pass through unchanged.
   - Still-persisted callers wrap at the consumer site via
     `buildBubbleStateSnapshotVariant(result.state)`. The wrap
     is an explicit cross-batch border, not a sub-batch of the
     persisted lane.

3. **Structural-typing leaks are part of the migration surface.**
   When a downstream parameter type would compile under structural
   typing but no longer reflects the true contract, treat that as
   a real migration target. Don't rely on "it compiles" — rely on
   "the contract is truthful".

**Forward implication:**
- The remaining Step 4b-β batches are: metaReviewGate (largest
  authority surface), and the smaller persisted-result lanes
  (commit, stop, start-public-result, restart-public-result,
  merge, create, list, etc.). Each of those lanes can be
  migrated independently; their consumer boundaries (CLI
  output projections, UI router result shapes) may need a
  similar wrap-at-consumer transition.
- The pilot scope rule from §10.10 extends: include not just
  production-side narrowing and fixture-construction sites, but
  also **shared-boundary projection helpers** whose inputs widen
  across the lane fleet.

**Landed work:**

- Step 4b-β/11 (commit 84376e95): UI projection adapter
  (`projectBubbleStateToUiActionState`) input migrated to
  `BubbleStateSnapshot`; commit/start/stop/restart UI consumer
  sites wrap their persisted-shape `result.state` via
  `buildBubbleStateSnapshotVariant`. Reply, resume, approval,
  request-rework callsites pass the variant through unchanged.
  No `src/v11/application/resume/` change — resume is closed
  transitively via reply (Step 4b-β/9).

**Recorded:** 2026-05-12.

### 10.13 Scope-split cascade evidence (metaReviewGate, list, resume) — DECIDED

**Background:**
§10.12 introduced two batch units — lane and shared-boundary —
and stated the pilot-scope rule should include shared projection
helpers. The Step 4b-β/12–17 wave exercised both units against
the remaining lanes; three of those batches surfaced new
patterns worth recording.

**Three follow-up observations from the 4b-β/12–17 wave:**

1. **Resume lane transitive closure (post 4b-β/11 scan).**
   Confirmed in §10.12: the resume lane source tree
   (`src/v11/application/resume/**`) carries no
   `PersistedBubbleStateSnapshot` reference after the reply lane
   closed at Step 4b-β/9. The only resume-adjacent persisted-state
   surface was the shared UI projection adapter, migrated in Step
   4b-β/11. No separate resume batch was queued; the lane is
   considered transitively migrated. CLI + UI integration points
   (`src/cli/commands/bubble/resume.ts`,
   `src/v11/defaults/ui/routerDefaults.ts:mapUiHumanReplyResult`,
   `src/v11/infrastructure/ui/routerActionDispatch.ts`) consume
   the variant via the reply contract without further change.

2. **List lane intentionally skipped (no migration target).**
   A scan of `src/v11/application/list/**` found:
   - No mutation surface (read-model only).
   - `BubbleListEntry.state` is already `BubbleLifecycleState`
     (lifecycle enum string), not a state snapshot.
   - Internal projection (`entryProjection.ts`) reads only
     common fields (`state.state`, `state.round`,
     `state.active_*`, `state.last_command_at`) on
     `InspectedStateSnapshot`, which is shared with
     `start` + `status` and is a separate read-only inspect
     port, not list-owned. Variant and persisted are
     structurally compatible for these reads.
   No list source-side migration was queued; the lane is
   considered out of variant-migration scope until a
   cross-lane `InspectedDomainStateSnapshot` boundary batch
   is needed (analogue of the §10.12 UI projection adapter
   batch). That boundary batch is **not currently scheduled**;
   if surfaced during Step 4b-γ preparation, it joins the
   parser-flip cascade.

3. **MetaReviewGate cascade cannot be split into
   "public + defaults first" (Batch A) and "internals second"
   (Batch B).** During the Step 4b-β/17 attempt at the
   user-preferred Batch A scope:
   - The public-contract migration (MetaReviewGateResult,
     dependency ports, current-run types) was a small change.
   - But the apply context's `readState` / `writeState` fields
     propagate Domain ports straight into every internal
     cluster (apply, humanGate, autoRework, cleanRerun,
     currentRun, state).
   - Every cluster constructs a `MetaReviewGateResult` whose
     `state` field is the variant union, so every cluster also
     becomes a return-boundary projection site.
   - The type cascade reached ~14 source files + ~38 test
     fixture sites; splitting at the half-migrated point would
     have required cross-cluster adapter shims that the unified
     batch elides.
   The Batch A scope-split was abandoned in favor of a single
   cohesive commit (Step 4b-β/17) covering all of metaReviewGate
   end-to-end. The user-preferred split survived the type-evidence
   test for stop/commit/start/merge/create lanes (where internals
   are smaller and the boundary genuinely contains the cascade)
   but did not for metaReviewGate (where the apply context is the
   internal-port hub).

**Decision (recorded 2026-05-13):**

1. **The two batch units stand** (lane + shared-boundary, per
   §10.12). The §10.12 forward implication extends:
   shared-boundary helpers and shared internal-port hubs are
   both valid units; the type cascade is the arbiter.

2. **"Lane transitive closure" + "lane intentionally skipped"
   are first-class manifest states**, not absences. Future
   readers MUST be able to tell that the resume lane is closed
   transitively and the list lane is out of scope (rather than
   simply pending). The 4b-γ test fixture sweep needs to
   inventory both.

3. **The "public + defaults first" scope split is a heuristic,
   not a rule.** For lanes whose internal-port hub is the apply
   context (or equivalent), the split is infeasible and the
   batch should be a single comprehensive commit. The
   type-cascade evidence at the half-migrated point is the
   decision criterion.

**Forward implication:**
- The remaining 4b-β scope is now narrow: no further per-lane
  migration is queued. The remaining persisted-state surfaces
  are:
  - **SSH cross-batch border** (approval + commit lanes mark
    `infrastructure/executor/ssh/sshBubble*Command.ts` results
    as persisted with explicit comments; same pattern applies
    to other SSH command parsers under
    `infrastructure/executor/ssh/`). A boundary review batch
    can either migrate the SSH lane to variant or leave it
    explicit-persisted with documentation; the choice depends
    on Step 4b-γ's parser-flip strategy.
  - **InspectedStateSnapshot** (read-only inspect port shared
    by list/status/start, per observation 2 above) — same
    boundary-batch character as the UI projection adapter
    cleanup.
  - **Domain helpers** still consuming persisted shape:
    `domain/metaReviewGate/snapshotState.ts` (incrementAutoReworkCount,
    setMetaReviewConsecutiveCleanRuns,
    normalizeMetaReviewSnapshot),
    `domain/metaReviewGate/autoReworkRetryInvariant.ts`,
    `domain/state/rework/reworkIntentTransitions.ts`
    (deriveQueuedDeferredReworkIntentState,
    applyDeferredReworkIntent), `domain/state/machine.ts`
    (applyStateTransition itself). These are projected at
    every consumer boundary via `toPersistedSnapshot` +
    `buildBubbleStateSnapshotVariant`. Domain-helper migration
    is **deferred to Step 4b-γ** — the parser flip will move
    these helpers' inputs to the variant union directly.

**Landed work:**

- Step 4b-β/12 (commit 8b6a48b5): stop lane public result +
  mutation port migrated.
- Step 4b-β/13 (commit 3584d9e7): start + restart public result
  lifted to variant (internal already migrated in 4b-β/2).
- Step 4b-β/14 (commit 94bcc212): commit lane public result +
  mutation port migrated; last UI consumer wrap removed.
- Step 4b-β/15 (commit cb500004): merge lane internal state
  migrated (no public-result change; result has no state field).
- Step 4b-β/16 (commit e362866a): create lane public result +
  initial state construction migrated.
- Step 4b-β/17 (commit 58f1332e): metaReviewGate authority
  surface migrated end-to-end (largest single batch — 28 files);
  scope-split Batch A approach abandoned per observation 3 above.

**Recorded:** 2026-05-13.

---

### 10.14 SSH boundary review — DEFERRED TO 4b-γ PARSER FLIP

After the Step 4b-β per-lane wave closed (per §10.13), a
focused docs-only scan of
`src/v11/infrastructure/executor/ssh/sshBubble*Command.ts`
established the SSH cross-batch border's status. The question
under review: does the SSH lane need a separate variant-migration
batch before Step 4b-γ, or does the canonical parser flip
absorb it?

**Scan findings (2026-05-13):**

1. **State-bearing SSH parsers (3 files).**
   - `sshBubbleApprovalParsing.ts` + `sshBubbleApprovalParsingSupport.ts`
     + `sshBubbleApprovalValidationHelpers.ts` (+ `sshBubbleApprovalCommand.ts`
     as consumer): `parseRemoteBubbleState` calls
     `assertParsedBubbleStateSnapshot` from `domain/state/stateSchema.ts`
     and returns `PersistedBubbleStateSnapshot`. The result interfaces
     `RemoteBubbleApprovalDecisionResult.state` /
     `RemoteBubbleApprovalQueuedReworkResult.state` thread that shape
     up to the application boundary, where 6 sites in
     `application/approval/internal/**` project it via
     `buildBubbleStateSnapshotVariant`.
   - `sshBubbleCommitPayload.ts` (used by `sshBubbleCommitCommand.ts`
     and `sshBubbleCommitContinuityImportCommand.ts`): same pattern —
     local `parseRemoteBubbleState` calls
     `assertParsedBubbleStateSnapshot`, exposes
     `ExecuteRemoteBubbleCommitCommandResult.state` as
     persisted-shape. Two application-side sites in
     `application/commit/internal/pipeline/commitCommandPipeline.ts`
     project via `buildBubbleStateSnapshotVariant`.
   - `sshBubbleApprovalValidationHelpers.ts` is structurally
     passive: it accepts `PersistedBubbleStateSnapshot` parameters
     but only reads `.state` (enum) and `.pending_rework_intent`
     (struct). No constructor-level dependency on the persisted
     shape's identity beyond the field set.

2. **State-clean SSH parsers (5 files).**
   - `sshBubbleMergeCommand.ts` + `sshBubbleMergeParsers.ts`:
     `ExecuteRemoteBubbleMergeCommandResult` has no `state` field
     (git refs / branches / tmux only). No state-shape coupling.
   - `sshBubbleReviewPolicyCommand.ts`: no `state` field; emits
     `BubbleReviewPolicyRuntimeView`.
   - `sshBubbleStart.ts` + `sshBubbleStartState.ts` +
     `sshBubbleStartExecution.ts`: no `PersistedBubbleStateSnapshot`
     reference; pointer error metadata contains state-name strings
     only.
   - `sshBubbleDeleteCommand.ts`: captures `state.json` bytes as an
     opaque forensic blob; does not parse.
   - `sshBubbleStatus.ts` + `sshBubbleStatusPayload.ts`: uses
     `BubbleLifecycleState` (independent enum), not
     `PersistedBubbleStateSnapshot`. Out of variant-migration scope
     entirely.

3. **Cross-batch border comments already in place.**
   - `application/approval/internal/remote/remoteApprovalCommandPort.ts:1-4`
   - `shared/remote/commitRemoteExecution.ts:5-8`
   Both quote the SSH-lane provenance and the wrap-at-consumer
   contract verbatim.

4. **Tests are shape-agnostic.**
   - `tests/v11/infrastructure/executor/ssh/sshBubbleApprovalCommand.test.ts`
     + `sshBubbleCommitCommand.test.ts` +
     `sshBubbleCommitContinuityImportCommand.test.ts` pin via
     `toMatchObject({ state: { state: "X" } })` literals on the
     lifecycle-enum field. Neither imports
     `PersistedBubbleStateSnapshot` nor `BubbleStateSnapshot` as
     a type. The variant projection preserves the
     `.state` discriminator, so these expectations survive the
     flip without edit.

**Decision (recorded 2026-05-13):**

**No standalone SSH boundary batch is scheduled before Step 4b-γ.
The SSH lane is absorbed by the 4b-γ canonical-parser flip.**

Rationale:

1. **Single boundary, single flip.** Both state-bearing SSH
   parsers route through `assertParsedBubbleStateSnapshot` from
   `domain/state/stateSchema.ts` — the same canonical parser
   that Step 4b-γ flips to return the variant. Migrating the
   SSH lane separately would require duplicating that projection
   inside two SSH helpers, only to dissolve those projections
   when the canonical parser switches.

2. **Wrap-at-consumer becomes identity, not edited.** After the
   parser flip, the 8 application-side
   `buildBubbleStateSnapshotVariant(routed.state |
   remoteResult.state)` wrap sites become identity no-ops by
   construction. They are removed in the same 4b-γ commit as the
   parser flip, alongside deletion of the 2 cross-batch border
   comments. Migrating SSH first would force this cleanup to land
   in two separate commits (SSH batch + parser-flip batch) with no
   intermediate green-state benefit.

3. **Validation helpers are pass-through.** The structural
   passivity of `sshBubbleApprovalValidationHelpers.ts` means the
   parser flip transparently lifts its input type from
   `PersistedBubbleStateSnapshot` to the variant without code
   change. There is no internal cluster cascade comparable to the
   metaReviewGate apply-context hub (§10.13 observation 3).

4. **Tests confirm flip-safety.** All SSH test files use
   `toMatchObject` with plain `state.state` enum literals, so
   the parser-flip will leave them green without fixture edits.
   This is the inverse of the metaReviewGate cascade where 38
   fixture sites required bulk replacement.

**Forward implication:**

The SSH-lane scope folded into Step 4b-γ is now bounded:
- 2 SSH parser-result interface type sites (approval, commit) —
  inherited variant via canonical parser flip, no manual edit.
- 8 application-side `buildBubbleStateSnapshotVariant` wrap-site
  deletions (6 approval, 2 commit) in the same 4b-γ commit.
- 2 cross-batch border comments deleted (approval port +
  commit shared port).
- 1 transitional parser API removed
  (`parseDomainBubbleStateSnapshot` in
  `domain/state/stateSchema.ts:117`).

This SSH-absorbed work does **not** expand the Step 4b-γ scope
inventory recorded in §12 — it co-locates with the parser-flip
commit itself. The InspectedStateSnapshot read-port boundary
(per §10.13 observation 2) and the domain-helper migrations
(per §10.13 forward implication) remain the only 4b-γ surfaces
that may require independent scope decisions during planning.

**Recorded:** 2026-05-13.

---

## 11. Non-goals

- **Renaming `BubbleLifecycleState` values** (e.g., `RUNNING` →
  `RUNNING_STANDARD`). The persisted enum is stable.
- **Schema migration of existing state.json files.** No tooling
  written, no migration scripts. The parser handles all valid
  persisted shapes including past variations.
- **Refactoring `shared/metaReview/` into `domain/metaReview/`.**
  Only the state-snapshot fragment of meta-review moves to
  `domain/state/metaReview/`. The broader `shared/metaReview/`
  (delivery, outcomes, transcript helpers) is a separate later
  decision.
- **Modeling `BubbleExecutionContext` itself as a variant.** Today's
  `BubbleExecutionContext` is broadly typed but the meta-review
  variant is captured via the
  `BubbleMetaReviewExecutionContext` projection. Splitting the union
  further (e.g., per-active-role variants) is not in this program.
- **Moving the state machine to a fully type-driven transition
  enforcer.** `transitions.ts` stays as a runtime map; the variant
  model makes transition input/output stricter but doesn't replace
  the matrix.

---

## 12. Approval

This manifest is **settled** as of 2026-05-13 (revising the
2026-05-12 revision; the Step 4b atomic-commit plan is split per
§10.10; the §3.2 MetaReviewSubstate inner union is recorded as
not-implemented per §10.11; lane transitivity and shared-boundary
batch unit are recorded per §10.12; scope-split cascade evidence
+ resume/list closure + metaReviewGate single-batch realization
are recorded per §10.13; the SSH boundary review is closed
without a standalone batch and absorbed into the 4b-γ
parser-flip per §10.14). All §10 decisions are locked. Steps 2,
3, 4.0, 4a, and 4b-α are complete (commits 935eefec → 43dec6b0
→ b6998a27 → a3ae830a → 0ce0ddc9; see §7 status column).
Step 4b-β has seventeen green increments landed (2ab700ba →
f59a07bd → 0e23743c → 4f697f71 → a7db7e40 → 03f8b2b6 → 2f316a59
→ a8745e0d → 471b40bd → 09e671e8 → 84376e95 → 8b6a48b5 →
3584d9e7 → 94bcc212 → cb500004 → e362866a → 58f1332e) covering
boundary helpers, start (internal), kickoff, watchdog, pass,
converged, askHuman validation, askHuman mutation, reply,
approval, UI projection adapter, stop, start + restart public
result, commit, merge, create, and metaReviewGate. Resume lane
is closed transitively via reply (Step 4b-β/9); list lane is
intentionally skipped (read-only projection over shared inspect
port — out of variant-migration scope per §10.13). The Step
4b-β per-lane wave is **considered closed**.

Remaining persisted-state surfaces and their 4b-γ disposition:
- **SSH command parsers under
  `infrastructure/executor/ssh/`** — no standalone batch; the
  SSH lane (approval + commit parsers, 8 application-side wrap
  sites, 2 cross-batch border comments) is absorbed by the
  4b-γ canonical-parser flip per §10.14. Tests are flip-safe
  via shape-agnostic `toMatchObject` literals.
- **Shared `InspectedStateSnapshot` read port** (list / status
  / start) — per §10.13 observation 2, may require an
  independent scope decision during 4b-γ planning (boundary
  batch analogue of the §10.12 UI projection adapter cleanup).
- **Domain helpers** in `domain/metaReviewGate/` +
  `domain/state/rework/` + `domain/state/machine.ts` — per
  §10.13 forward implication, migrated as part of the 4b-γ
  parser flip; the variant union becomes the canonical input
  type and the `toPersistedSnapshot` + rebuild ceremony
  drops out.

Remaining Step 4 sequence: 4b-γ (terminal: canonical parser
switch to the variant union + SSH parser/wrap/border cleanup
[co-located, per §10.14] + InspectedStateSnapshot disposition
+ domain-helper migration + test fixture migration +
transitional API removal — mandatory program endpoint per
§10.10) → 5 (test mirror cleanup) → 6 (doc sync). Further
deviations during execution require an amendment to this
document in the same commit that introduces them.
