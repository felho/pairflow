# Closed-Contract Drift Check

Use this check when creating or refining a Plan or Task that touches an already-established:
1. canonical authority/source-of-truth,
2. shared interface/result contract,
3. field-role classification (`canonical` vs `guard` vs `compat`),
4. closed terminology that downstream tasks already inherit.

This check exists to catch a specific failure mode:
- the refined artifact is locally coherent,
- the scope still looks bounded,
- but the wording silently reinterprets a closed contract that upstream docs/code already settled.

Typical examples:
1. a canonical field becomes "optional guard" language,
2. a compat input becomes the new primary truth,
3. a derived field is described as canonical,
4. a new undefined term is introduced in place of a closed term,
5. a predecessor/successor boundary is preserved structurally but its meaning shifts.

## Applicability

Run this check when any of the following is true:
1. the artifact refines an existing plan/task rather than drafting from scratch,
2. authority/read-model/shared-contract work is in scope,
3. a canonical source-of-truth is said to be "clarified", "tightened", or "preserved",
4. downstream tasks inherit wording from this artifact,
5. the artifact introduces new contract terminology for an existing runtime path.

## Required Inventory

When applicable, the artifact author or reviewer must explicitly inventory:

1. `source_anchors`
   - Which repo-local docs/code are the current source-of-truth for this contract?
   - Prefer the narrowest authoritative set:
     - system/design doc,
     - current main plan,
     - code/schema/type anchor,
     - test/contract runner anchor when needed.

2. `canonical_elements`
   - Which fields/terms are currently canonical?

3. `guard_elements`
   - Which fields constrain correctness but are not themselves the primary authority?

4. `compat_elements`
   - Which inputs/paths are compatibility-only, mirror-only, or rehydration-only?

5. `closed_terms`
   - Which terms already have fixed meaning and must not be silently renamed or broadened?

6. `forbidden_reinterpretations`
   - Which meaning changes are not allowed without explicit higher-level authorization?

## Core Questions

1. Does the refined artifact keep the same canonical elements canonical?
2. Does it keep guard fields as guards instead of turning them into new primary truth?
3. Does it keep compat/rehydration paths secondary instead of silently upgrading them?
4. Does it introduce any new term that is not anchored to an explicit field list or prior artifact?
5. Does it narrow or broaden a closed term without saying so explicitly?
6. Do downstream tasks remain semantically aligned if they inherit this wording unchanged?

## Drift Status Values

Classify the result as one of:
1. `no_drift`
2. `clarified_without_semantic_change`
3. `explicit_authorized_reinterpretation`
4. `ambiguous_drift`
5. `unauthorized_reinterpretation`

## Decision Rules

### `PASS`

Only if all are true:
1. source anchors are explicit,
2. canonical vs guard vs compat roles are explicit where relevant,
3. no closed term is silently redefined,
4. any reinterpretation is explicitly authorized and cited,
5. downstream task inheritance remains valid.

### `FAIL`

Fail the artifact if any of the following is true:
1. a canonical element is downgraded to guard/compat wording without explicit authorization,
2. a compat path is promoted to primary truth by wording alone,
3. a new contract term is introduced without anchor or explicit field inventory,
4. a successor is expected to "inherit" a changed meaning that was never authorized upstream,
5. the artifact is locally coherent but no longer matches the repo-local source anchors.

## Routing

If the result is:
1. `no_drift` or `clarified_without_semantic_change`
   - continue normally.
2. `explicit_authorized_reinterpretation`
   - continue only if the authorizing source is cited and downstream impact is recorded.
3. `ambiguous_drift`
   - do not finalize as implementable; require refinement or route back to plan.
4. `unauthorized_reinterpretation`
   - block approval/refinement acceptance until the wording is corrected or an explicit higher-level change is made first.

## Output Expectations

When applicable, the artifact or review should record:
1. source anchors,
2. canonical elements,
3. guard elements,
4. compat elements,
5. closed terms,
6. drift status,
7. downstream impact.
