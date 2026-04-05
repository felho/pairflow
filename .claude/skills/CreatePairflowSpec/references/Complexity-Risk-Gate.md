# Complexity Risk Gate

Use this gate before drafting a new implementation Task, and when deciding whether a Plan is required even if the request initially looks like a single-task feature.

The purpose is to catch "too ambitious" scopes early, before implementation starts.

## Core rule

Do not estimate risk primarily from file count.

Estimate risk from boundary spread:
1. whether the task introduces or moves a canonical source-of-truth,
2. whether the same concept must appear across multiple surfaces,
3. whether refactor and feature activation are coupled in the same task,
4. whether the task depends on unfinished prerequisite milestones,
5. whether the task tries to close too many distinct acceptance goals at once.

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

### 3) Activation Coupling

- `0`: pure refactor/foundation only, or pure feature delivery on top of stable seams
- `1`: small coupling between cleanup and delivery
- `2`: same task introduces foundation/refactor and also turns on new runtime behavior

### 4) Prerequisite Risk

- `0`: no dependency on unfinished milestone
- `1`: depends on partially stabilized adjacent work
- `2`: depends on explicit unfinished prerequisite milestone/cutover/contract

### 5) Acceptance Multiplicity

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

- `0-3`: single task/bubble is usually acceptable
- `4-6`: split strongly recommended
- `7-10`: mandatory refactor-first split

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

## Required split shape when risk is high

Prefer this split order:
1. `foundation` or `authority refactor`
2. `feature delivery`
3. `activation` or `rollout`

If the task includes future milestone-gated behavior:
1. document the contract now,
2. keep activation in a later task,
3. keep current runtime behavior fail-closed.

## Output expectations

When risk score is `4+`, the spec should explicitly capture:
1. `risk_score`
2. `authority_change`
3. `surface_count`
4. `feature_activation`
5. `prerequisite_boundaries`
6. split decision:
   - `single-task allowed: yes|no`
   - if `no`, specify `foundation / delivery / activation`

When risk score is `7+`, do not write the task as if it were direct feature delivery unless the user explicitly asks for a knowingly high-risk bundle.
