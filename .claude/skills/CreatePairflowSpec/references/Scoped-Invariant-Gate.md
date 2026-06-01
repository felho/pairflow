# Scoped Invariant Gate

Use this gate before approving or drafting implementation-oriented Tasks that
use broad invariant language.

The purpose is to stop universal-sounding task text from becoming an unlimited
edge-case generator during review.

## Trigger Language

Run this gate when task-level acceptance, Done Definition, safety defaults, or
L1 rules contain broad phrases such as:
1. `must`
2. `must not`
3. `compatible`
4. `deterministic`
5. `normal flow`
6. `remains compatible`
7. `does not block`
8. `never`
9. `always`
10. `all`

These words are allowed, but only when their scope is explicit.

## Core Rule

A task-level invariant must be sliced.

For each broad invariant, record:
1. `applies_to`: the concrete commands, files, entrypoints, inputs, or surfaces
   covered by this task
2. `does_not_apply_to`: plausible adjacent surfaces that are outside this task
3. `proof_surface`: the test, validation evidence, or document anchor that will
   prove the scoped invariant
4. `deferred_or_external_surfaces`: successor-owned, plan-owned, or explicitly
   external surfaces
5. `reviewer_non_goals`: edge-case families reviewers must not infer into this
   task without first routing back to refinement

If any of those fields cannot be stated, the invariant is not implementation
ready as task-level acceptance.

## Review Scope Fence

Out of scope describes delivery boundaries. A review scope fence describes
review handling for plausible edge-case families.

For each likely adjacent edge-case family, record:
1. `edge_case_family`
2. `why_not_required_now`
3. `safe_current_behavior`
4. `if_discovered_during_review`
5. `route`: `follow_up`, `route_back_to_plan`, `accepted_limitation`, or
   `external`

The fence is not a license to ignore correctness. It prevents reviewers from
silently widening the current task. If a fenced item is actually required for
the current task's stated contract to be true, the correct outcome is route-back
or split, not blocking implementation widening inside the same task.

The fence does not have to predict every possible edge case. It must seed the
known plausible families from the artifact, target-file reality, authority
fan-out scan, and adjacent call-site scan. New review-discovered edge cases must
be classified through the same route instead of being treated as required-now by
default.

## Universal Policy vs Task Acceptance

Some invariants are legitimately system-wide policy. Do not weaken them.

When an invariant is system-wide, keep the policy in the authoritative parent
artifact or policy document, and make the task say which slice of that policy it
implements now. A task must not turn a system-wide invariant into open-ended
current-task acceptance unless the task actually owns all affected surfaces.

## Split and Route-Back Triggers

Route back to task refinement or plan refinement when:
1. a broad invariant has no `applies_to` boundary,
2. a broad invariant has no `does_not_apply_to` boundary despite plausible
   adjacent surfaces,
3. proving the invariant requires consumer families outside the declared
   bounded slice,
4. the invariant mixes local command behavior, remote behavior, UI/read-model
   behavior, recovery behavior, and merge/close behavior without sequencing,
5. the proof surface is weaker than the invariant wording.

## Output Expectations

For affected Task artifacts, record a `Scoped Invariants` section with:
1. invariant text or token
2. applies-to boundary
3. does-not-apply-to boundary
4. proof surface
5. deferred or external surfaces
6. reviewer non-goals
7. split or route-back decision when the invariant cannot be bounded locally

Record a `Review Scope Fence` section when plausible adjacent edge-case
families are known. The section must name each family, why it is not
required-now, current safe behavior, review handling, and route.
