# Domain State Model Refactor — Step 1 Manifest

Status: settled (Steps 2–3 complete on 2026-05-11; Step 4 sequence pending)
Last updated: 2026-05-11 (Step 4.0 manifest review: 3c2 deviation incorporated per §10.9)
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

### Step 4b — Variant model + parser refactor + consumer narrowing (1 big commit)

The substantive commit. Order of changes within:

1. Add `BubbleStateSnapshot` discriminated union per §3, in
   `domain/state/snapshot/bubbleStateSnapshot.ts`.
2. Add `MetaReviewSubstate` discriminated union per §3.2.
3. Add variant-construction helpers + variant-narrowing guards per
   §3.3 and §5.3.
4. Update `parseBubbleStateSnapshot` to return `BubbleStateSnapshot`
   (the variant) instead of `PersistedBubbleStateSnapshot`. The
   parser's body adds a kind-discrimination step at the end.
5. Drop the authority files that are now subsumed by TypeScript
   narrowing (the bulk of `authority/executionContextAuthority.ts`).
   Keep only the cross-field value invariants in
   `authority/snapshotInvariants.ts`.
6. Update all ~30 narrowing consumers to use the kind discriminator
   or the guards.
7. Update ~10 construction consumers to use the variant-specific
   helpers.
8. Update ~30 tests that read fields to narrow appropriately.

**Expected diff size:** ~50-80 files, ~500-1000 LOC churned. Single
commit because intermediate states are typecheck-broken (a consumer
expecting the broad type can't typecheck against the variant union
until it narrows).

### Step 5 — Test mirror cleanup (1 commit)

The cross-mirror-root tests (§6.3) move to align with source
locations. Most tests already aligned during Step 2.

### Step 6 — Doc sync (1 commit)

This manifest moves to "executed" status. Survey + template (the lane
docs) get a brief cross-reference to the state model refactor as the
domain-state precedent. Any architecture-fitness docs that referenced
`shared/state/` get updates.

### Total: ~10 commits

| #  | Step | Files | Status | Behavior change |
|---:|------|------:|--------|-----------------|
| 1  | 2    | ~17 + 154 import updates | landed (935eefec) | No |
| 2  | 3a   | ~6 | landed (e798ccbe) | No |
| 3  | 3b   | ~5 | landed (8537ba80) | No |
| 4  | 3c1  | ~5 | landed (3953e04c) | No |
| 5  | 3c2  | ~3 + types split | landed (43dec6b0) | No |
| 6  | 4.0  | 1 doc | in progress | No (this commit) |
| 7  | 4a   | ~17 | pending | No |
| 8  | 4b   | ~50-80 | pending | **Yes** (type-level invariant enforcement; runtime authority code dropped) |
| 9  | 5    | ~5 | pending | No |
| 10 | 6    | 2-3 docs | pending | No |

(Step 4a-guards is an optional conditional commit between 4a and 4b,
gated on pilot findings — would push total to ~11. Step 5 may
collapse into the doc-sync commit if test moves are small.)

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

This manifest is **settled** as of 2026-05-11 (the open-questions
revision, amended on the same day by the Step 4.0 review to
incorporate the 3c2 deviation per §10.9). All §10 decisions are
locked. Steps 2 and 3 are complete (commits 935eefec → 43dec6b0;
see §7 status column). Step 4 proceeds via the launch sequence:
4.0 (this commit) → 4a → pilot → 4a-guards (conditional) → 4b →
5 → 6. Further deviations during execution require an amendment
to this document in the same commit that introduces them.
