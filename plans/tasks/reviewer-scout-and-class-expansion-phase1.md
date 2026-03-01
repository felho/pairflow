# Task: Reviewer Scout + Issue-Class Expansion (Phase 1, Prompt-Level)

## Goal

Reduce review rounds by making each reviewer round do more useful work:

1. collect more initial findings (parallel scout review),
2. expand issue-class findings to sibling occurrences (class expansion),
3. do this first at **prompt level**, without deterministic orchestrator routing.

## Context

A frequent loop pattern is:

1. Round N finds one instance of an issue type.
2. Round N+1 finds another sibling instance of the same type.
3. Round N+2 finds one more sibling instance.

This is especially common for race/lifecycle/timeout/symmetry families and causes unnecessary round inflation.

## Scope Boundaries

### In Scope (Required)

1. Extend reviewer prompt and handoff guidance so each reviewer round includes:
   - `N` parallel scout scans (default: `N=2`),
   - main-reviewer deduplication and severity calibration,
   - targeted class expansion scans for issue-class findings.
2. Define one consistent, structured reviewer PASS output format (required sections).
3. Define limits and budgets (scope + time/token guardrails).
4. Update documentation while keeping loop-optimization tracker continuity.

### Out of Scope (Phase 1)

1. Orchestrator-side automatic subagent spawning.
2. New runtime state-machine states.
3. Mandatory backend schema validation for PASS payloads.
4. Full multi-agent architecture redesign.

## Reviewer Round Execution Model (Phase 1)

### Step A: Parallel Scout Scan

1. Reviewer runs `N` independent scout scans over the same diff/scope.
2. Each scout may output only:
   - concrete, location-backed findings,
   - no style-only or preference-only advice.

Default prompt-level config:
1. `max_scout_agents = 2`
2. `scout_budget = short`

### Step B: Main Reviewer Dedup + Classify

1. Main reviewer merges scout findings.
2. Dedup rule:
   - same root cause + same/overlapping location => one finding.
3. Classify each finding:
   - `one_off`
   - `issue_class` (`race_condition`, `lifecycle_symmetry`, `timeout_cancellation`, `idempotency`, `concurrency_guard`, `other`)

### Step C: Class Expansion (Conditional)

1. Run only for `issue_class` findings.
2. Use narrow scope only:
   - changed files,
   - directly related call-sites.
3. Expansion objective:
   - enumerate sibling occurrences of the same class.
4. Limits:
   - `max_class_expansions_per_round = 2`
   - `expansion_budget = short`

### Step D: Final Consolidation

1. Main reviewer deduplicates again.
2. Calibrate severity against ontology.
3. Produce one final finding package for PASS.

## Required Reviewer Output Contract (Prompt-Level)

Reviewer PASS summary must include these sections:

1. `Scout Coverage`
   - how many scouts were run (`N`)
   - short scope description
2. `Deduplicated Findings`
   - final finding list with severity
3. `Issue-Class Expansions`
   - per class: primary finding + sibling locations
4. `Residual Risk / Notes`
   - short non-blocking notes

Minimum fields per finding (textual or semi-structured):

1. `title`
2. `severity`
3. `class` (`one_off` or issue class)
4. `locations` (at least one concrete location)
5. `evidence` (short rationale)
6. `expansion_siblings` (for class findings; may be empty)

## Guardrails

1. Expansion should run only for high-signal classes (initial set: race/lifecycle/timeout/concurrency).
2. No repo-wide expansion scans.
3. Max 1 expansion run per finding class per round.
4. If class match is uncertain, default to `one_off` (false-positive protection).

## Suggested Prompt Touchpoints

1. `src/core/bubble/startBubble.ts`
   - extend reviewer startup prompt with Phase 1 workflow block
2. `src/core/runtime/tmuxDelivery.ts`
   - extend reviewer handoff reminder with compact workflow reminder
3. (optional) extract reviewer guidance into dedicated helper/template module

## Acceptance Criteria (Binary)

1. Reviewer startup/resume/handoff prompts explicitly include the 4-step Phase 1 workflow (Scout -> Dedup/Classify -> Expansion -> Consolidate).
2. Prompt includes explicit defaults: `max_scout_agents=2`, `max_class_expansions_per_round=2`, narrow-scope rule.
3. Prompt explicitly forbids repo-wide expansion scans.
4. Required reviewer output contract sections are documented and present in prompt guidance.
5. In at least one end-to-end bubble test, reviewer PASS actually contains:
   - deduplicated finding list,
   - at least one class expansion block (when issue-class finding exists).
6. No runtime/state-machine regression (prompt-level change only).

## Test / Validation Plan

1. Prompt snapshot/unit-style check:
   - reviewer startup prompt contains new workflow key lines.
2. Manual smoke (1 bubble):
   - use a task likely to produce issue-class findings.
   - verify reviewer output follows contract.
3. Control:
   - if no class finding exists, expansion block may be empty, but structure must still be present.

## Deliverables

1. Updated reviewer prompt guidance (startup + handoff).
2. Documented output contract.
3. Short note in loop optimization tracker that Phase 1 prompt-level experiment started.
4. Validation note from first smoke run.

## Follow-up (Phase 2 Candidate)

If Phase 1 is promising but adherence variance is high:

1. orchestrator-side class detection,
2. deterministic subagent routing,
3. aggregation and enforcement before reviewer PASS.
