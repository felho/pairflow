# Task: Reviewer Scout + Issue-Class Expansion (Phase 1, Prompt-Level)

## Goal

Reduce avoidable review rounds by increasing finding coverage per reviewer round while keeping implementation risk low.

Primary outcomes:
1. Reviewer performs limited parallel scout discovery before final PASS output.
2. Issue-class findings are expanded to sibling occurrences in the same local change surface.
3. Entire rollout is prompt-level only (no orchestrator/state/protocol behavior change).

## Problem Context

Observed loop inefficiency:
1. Round N identifies one instance of an issue class.
2. Round N+1 and N+2 discover sibling instances of the same class.
3. Convergence is delayed by incremental rediscovery instead of consolidated review.

This pattern is common for race/lifecycle/timeout/concurrency families.

## Scope Boundaries

### In Scope (Required)

1. Update reviewer prompt guidance so each reviewer round follows a 4-step flow:
   - parallel scout scan,
   - deduplicate + classify,
   - conditional class expansion,
   - final consolidation.
2. Define prompt-level default limits and budgets:
   - `max_scout_agents = 2`,
   - `max_class_expansions_per_round = 2`,
   - `scout_budget = short`,
   - `expansion_budget = short`.
3. Define one required reviewer PASS output contract (fixed section set + required finding fields).
4. Keep tracker continuity in `docs/review-loop-optimization.md` (status note for Phase 1 experiment).
5. Add/adjust tests that verify prompt guidance contains the new workflow and guardrails.

### Out of Scope (Do Not Implement in This Task)

1. Orchestrator-side automatic subagent spawning/routing.
2. Any new state-machine state/transition or runtime gate.
3. Any protocol/schema hard validation requirement for reviewer PASS payloads.
4. Any CLI surface change (new commands/flags) for this feature.
5. Full multi-agent architecture redesign.

## Hard Constraints

1. Prompt-level behavior only: existing runtime command semantics must remain unchanged.
2. Expansion scope must be local:
   - changed files,
   - directly related call-sites only.
3. Repo-wide exploration is explicitly forbidden.
4. If class detection is uncertain, classify as `one_off` (false-positive protection).

## Reviewer Round Execution Model (Phase 1)

### Step 1: Parallel Scout Scan

1. Reviewer runs up to `N=2` scout scans over the same diff scope.
2. Scout output may include only concrete, location-backed findings.
3. Style-only/preference-only feedback is excluded from scout findings.

### Step 2: Main Reviewer Deduplicate + Classify

1. Merge scout findings into one working set.
2. Deduplicate by root cause + overlapping location.
3. Classify each finding:
   - `one_off`, or
   - `issue_class` in:
     - `race_condition`,
     - `lifecycle_symmetry`,
     - `timeout_cancellation`,
     - `idempotency`,
     - `concurrency_guard`,
     - `other`.

### Step 3: Issue-Class Expansion (Conditional)

1. Run only for `issue_class` findings.
2. At most one expansion run per class per round.
3. Enumerate sibling occurrences within narrow scope.
4. Stop at round limits/budget limits.

### Step 4: Final Consolidation

1. Deduplicate again across primary + expansion findings.
2. Calibrate severity using existing severity ontology guidance.
3. Produce one final reviewer PASS package using the required contract.

## Required Reviewer PASS Output Contract

Every reviewer PASS summary must include exactly these sections:
1. `Scout Coverage`
2. `Deduplicated Findings`
3. `Issue-Class Expansions`
4. `Residual Risk / Notes`

Minimum fields for each finding entry:
1. `title`
2. `severity`
3. `class` (`one_off` or one issue class)
4. `locations` (at least one concrete location)
5. `evidence` (short rationale)
6. `expansion_siblings` (empty array/list allowed when none)

If no issue-class finding exists, `Issue-Class Expansions` must still be present and explicitly marked empty.

## Suggested Touchpoints

1. `src/core/bubble/startBubble.ts` (reviewer startup/resume prompt content).
2. `src/core/runtime/tmuxDelivery.ts` (reviewer handoff reminder content).
3. Optional: shared prompt helper/template module to avoid duplicated wording.
4. `docs/review-loop-optimization.md` tracker row for issue-class expansion status.

## Acceptance Criteria (Binary, Testable)

1. Reviewer startup/resume/handoff guidance documents the exact 4-step Phase 1 flow.
2. Prompt guidance states defaults:
   - `max_scout_agents=2`,
   - `max_class_expansions_per_round=2`,
   - narrow-scope-only rule.
3. Prompt guidance explicitly forbids repo-wide expansion scans.
4. Prompt guidance includes the required four-section reviewer PASS contract.
5. Prompt guidance includes all required per-finding fields (`title`, `severity`, `class`, `locations`, `evidence`, `expansion_siblings`).
6. Prompt/unit tests assert presence of the new workflow and guardrail strings.
7. Manual smoke run shows reviewer PASS output with:
   - populated `Deduplicated Findings`,
   - `Issue-Class Expansions` section present (populated or explicitly empty).
8. If smoke run contains at least one issue-class finding, PASS output includes at least one expansion sibling location.
9. `docs/review-loop-optimization.md` reflects Phase 1 prompt-level progress for issue-class expansion.
10. No runtime/state/protocol behavior changes are introduced by this task.

## Validation Plan

1. Prompt content tests:
   - assert startup/resume/handoff prompt strings include the 4-step workflow and limits.
2. Manual smoke (single bubble likely to produce issue-class findings):
   - capture reviewer PASS artifact,
   - verify contract section presence and field completeness.
3. Control case:
   - when no issue-class finding exists, expansions section remains mandatory but empty.
4. Regression sanity:
   - verify no CLI/state-machine/protocol test changes are required beyond prompt guidance updates.

## Deliverables

1. Updated reviewer prompt guidance (startup/resume/handoff surfaces).
2. Required reviewer PASS output contract text in prompts/docs.
3. Tracker update in `docs/review-loop-optimization.md` for Phase 1 status.
4. Validation note from first smoke run (artifact reference).

## Follow-up (Phase 2 Candidate, Not in This Task)

1. Deterministic orchestrator-side scout/expansion routing.
2. Structured aggregation before reviewer PASS emission.
3. Optional schema-level validation/enforcement for reviewer finding payloads.
