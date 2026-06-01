# Complexity Risk Gate

Use this gate before drafting a new implementation Task, and when deciding whether a Plan is required even if the request initially looks like a single-task feature.

The purpose is to catch "too ambitious" scopes early, before implementation starts.

## Core rule

Do not estimate risk primarily from file count.

Estimate risk from boundary spread:
1. whether the task introduces or moves a canonical source-of-truth,
2. whether the same concept must appear across multiple surfaces,
3. whether consumer correctness depends on fragile cross-seam identity matching,
4. whether refactor and feature activation are coupled in the same task,
5. whether the task depends on unfinished prerequisite milestones,
6. whether the task tries to close too many distinct acceptance goals at once.
7. whether coordination/locking or precondition-ordering changes are being smuggled into a producer or delivery slice.
8. whether the task changes where success/completion is proven, while also changing cleanup or result/status/event truth surfaces.
9. whether a proof contract is reused from an existing flow, but its validation strictness is not clearly inherited.

For authority-heavy scopes, also inspect consume families:
1. internal execution consumers,
2. workflow/orchestration consumers,
3. read-model consumers,
4. cleanup/recovery consumers.

This inspection is discovery-first. Do not satisfy it by copying the consumer
list declared by the task. For every plausibly relevant lifecycle role, record
`present`, `absent`, or `unknown`:
1. producer,
2. validator/gate,
3. persistence/replay,
4. execution consumers,
5. workflow/orchestration,
6. read/presentation,
7. recovery/cleanup,
8. external/integration.

`unknown` is not a pass state. If a role plausibly exists but target-file
reality or adjacent entrypoint inspection did not inspect it, the artifact is
not ready for implementation approval.

## Risk Axes

Score each axis `0|1|2`.

### 1) Authority Risk

- `0`: no canonical source-of-truth change
- `1`: existing authority is clarified or normalized, but not moved
- `2`: new canonical object / authority boundary / source-of-truth is introduced or moved

### 2) Surface Spread

Count how many of these surfaces must change for the same concept:
- config/schema
- persistence/write seam
- routing/gate logic
- read projection (`status`, `detail`, `list`, similar)
- human-facing payload/envelope
- UI/API/store

Score:
- `0`: 1-2 surfaces
- `1`: 3 surfaces
- `2`: 4+ surfaces

### 3) Identity / Join Fragility

- `0`: no cross-seam identity matching; one stable identifier path is enough
- `1`: one stable cross-seam mapping exists, but consumer correctness still depends on it
- `2`: multiple identifier forms, legacy/new seams, or competing mapping paths must align for correct behavior

Examples:
- Stripe invoice id -> local authority row
- payment_intent vs invoice id vs vendor id reconciliation
- legacy payload identity vs new canonical authority identity

### 4) Activation Coupling

- `0`: pure refactor/foundation only, or pure feature delivery on top of stable seams
- `1`: small coupling between cleanup and delivery
- `2`: same task introduces foundation/refactor and also turns on new runtime behavior

### 5) Prerequisite Risk

- `0`: no dependency on unfinished milestone
- `1`: depends on partially stabilized adjacent work
- `2`: depends on explicit unfinished prerequisite milestone/cutover/contract

### 6) Acceptance Multiplicity

Count how many distinct success classes the task tries to prove at once.
Examples:
- schema correctness
- write path correctness
- route behavior
- read projection correctness
- UI/API behavior
- rollout/cutover behavior

Score:
- `0`: 1-2 success classes
- `1`: 3 success classes
- `2`: 4+ success classes

## Score Interpretation

- `0-4`: single task is usually acceptable
- `5-7`: split strongly recommended
- `8-12`: mandatory refactor-first split

## Hard Stops

Do not keep the scope as a single implementation task if any of the following is true:

1. The task introduces a new canonical source-of-truth and also turns on new runtime behavior.
2. The same concept must change across at least 3 of these surfaces at once:
   - config/schema
   - write seam
   - routing/gate logic
   - read projection
   - human-facing payload
   - UI/API/store
3. The task activates behavior that explicitly depends on unfinished milestone work.
4. The task relies on multiple competing authority paths for the same decision.
5. The task mixes contract cutover and UI consume cutover while the primary consumer depends on fragile identity matching.
6. A completed discovery scan confirms that the same authority touches 3 or
   more consume families. In this case, `foundation -> delivery -> activation`
   is not a sufficient default split; producer-first plus consumer-family split
   is mandatory. If the scan still has plausible `unknown` families, require
   refinement before applying this hard stop.
7. The same bounded slice would change:
   - the authority producer,
   - a shared contract/result shape,
   - and any two of these fallout families:
     - internal execution consumers
     - workflow/orchestration consumers
     - read-model consumers
     - cleanup/recovery consumers
8. The same bounded slice would change persisted authority/schema together with shared-contract migration and read-model/status/CLI fallout.
9. The same bounded slice would change producer behavior together with:
   - rollback/retry/cleanup/shared-state-preservation semantics, or
   - lock/mutex/lease/idempotency/serialization semantics, or
   - precondition ordering that determines whether side effects happen before validation.
10. The same bounded slice would change the canonical success/completion proof source and also:
   - post-success cleanup semantics, or
   - final result/status/event truth semantics.
11. The same bounded slice would reuse a cleanup/delete/reconcile proof contract, but the artifact does not explicitly prove proof-parity or explicitly narrow the reused contract safely.

## Escalation Rules Below Hard-Stop

Even if no hard-stop fires, default to `single-task allowed: no` when any of the following is true:

1. `surface_spread = 2` and `acceptance_multiplicity >= 1`
2. `identity_join_risk = 2` and `surface_spread >= 1`
3. `authority_risk >= 1`, `identity_join_risk >= 1`, and a public payload or UI consume changes in the same task

These are not optional style preferences. They are intended to prevent review-loop tasks where the backend contract, route parity, and consumer rendering regress each other across rounds.

## Required split shape when risk is high

Prefer this split order:
1. `foundation` or `authority refactor`
2. `feature delivery`
3. `activation` or `rollout`

When authority fan-out is present across 3 or more consume families, prefer this split vocabulary instead:
1. `persisted authority` (if needed)
2. `authority producer`
3. `consumer-family alignment`
4. `activation`
5. `read-model`
6. `cleanup/rollout`

This is not a mandatory phase count.
Use it to decide what must be separated, then collapse adjacent closures when:
1. the same bounded code change closes them,
2. they share the same consumers,
3. they do not introduce a separate compatibility or read-model risk.

If the task includes future milestone-gated behavior:
1. document the contract now,
2. keep activation in a later task,
3. keep current runtime behavior fail-closed.

## Output expectations

When risk score is `4+`, the Task artifact should explicitly capture:
1. `risk_score`
2. `authority_change`
3. `surface_count`
4. `identity_join_risk`
5. `feature_activation`
6. `prerequisite_boundaries`
7. `authority_fanout` (which consume families are affected)
8. split decision:
   - `single-task allowed: yes|no`
   - if `no`, specify `foundation / delivery / activation`

If authority fan-out is the reason for the split, do not stop at the generic three-way label. State whether the split is:
- `authority producer`
- `consumer-family alignment`
- `activation`
- `read-model`
- `cleanup/rollout`

Also record closure-budget triage in the Task when authority/runtime/read-model/shared-contract work is in scope:
1. which closure buckets are touched,
2. which adjacent closures are intentionally collapsed,
3. why the collapse is safe,
4. which closures are explicitly deferred.

Also state whether any of these closures are intentionally collapsed into one bounded task, and why that collapse is safe.

Also record success/completion proof-boundary triage when mutable flow completion semantics are changing:
1. current canonical success/completion proof source,
2. target canonical success/completion proof source,
3. final result/status/event surfaces affected,
4. whether any surface becomes mixed-truth across phases,
5. whether an existing proof contract is reused, and if so whether full proof-parity is required here or deferred explicitly.

For mutable existing flows, the Task should also record:
1. whether invalid/precondition-failure should produce zero side effects,
2. whether rollback/retry/shared-state-preservation is in the same slice,
3. whether coordination primitives are introduced,
4. whether those concerns are intentionally split out of the producer/delivery slice.

When risk score is `8+`, do not write the task as if it were direct feature delivery unless the user explicitly asks for a knowingly high-risk bundle.

For Plans:
1. use this gate to decide whether decomposition is required,
2. do not persist per-task numeric risk scoring by default,
3. record only the resulting split/dependency shape when that changes plan correctness.
