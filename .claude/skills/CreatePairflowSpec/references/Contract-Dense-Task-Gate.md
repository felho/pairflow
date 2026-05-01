# Contract-Dense Task Gate

Use this gate when the draftable task shape shows contract density at
specification time: one implementation-significant contract has multiple
observable dimensions, mirrored documentation surfaces, downstream consumers,
or failure-mode branches that must stay aligned.

## Activation

Run this gate for Task drafting/refinement and `ReviewSpec task-mode` when two
or more of these are true:

1. A public or internal API/interface/result shape changes.
2. A status/result taxonomy changes or is newly introduced.
3. Structured input/output parsing, payload validation, or schema acceptance
   changes.
4. Error, fallback, timeout, cancellation, precedence, or reason-code behavior
   changes.
5. The task crosses an authority boundary where one component emits/records
   data but another component owns interpretation or lifecycle decisions.
6. Multiple downstream consumers or successor tasks inherit the contract.
7. The same contract must appear in multiple mirrored surfaces, such as L0
   policy, branch inventory, data contract, fallback table, status binding, and
   test matrix.

## Required Output

When active, the task must include these L1 elements or explicitly mark them
`N/A` with a reason:

1. `Canonical Contract Matrix`
   - Use one table as the source of truth for the changed contract.
   - Pick columns that fit the domain, for example:
     `condition/input -> owner -> output/status -> reason code -> retained fields -> side effects -> required test`.
   - Other sections may summarize this matrix, but must not create a second
     independent source of truth.
2. `Ownership and Deferred Semantics`
   - State what this task owns now.
   - State what this task emits or records but does not interpret.
   - State what is deferred to successor tasks or downstream consumers.
   - State forbidden inference, fallback, lifecycle, or authority decisions.
3. `Structured Contract Rules` when structured input/output is involved
   - Required fields.
   - Optional fields.
   - Allowed top-level fields or accepted variants.
   - Unknown-field behavior.
   - Malformed, partial, duplicate, or multi-candidate behavior.
   - Retention/drop behavior for invalid or rejected data.
   - Exact fallback status/reason/test expectation.
4. `Mirrored Surface Checklist`
   - List every section that mirrors the canonical contract.
   - For each changed contract row, name the surfaces that must stay aligned.
   - If a surface is intentionally summary-only, state which source-of-truth row
     it defers to.

## Policy

1. Do not rely on prose words such as `valid`, `parseable`, `compatible`, or
   `lifecycle claim` when the implementation needs deterministic behavior.
   Replace them with schema, allowlist, status/reason, and fallback rules.
2. Do not let downstream ownership leak into the current task through test
   wording. A task may record correlation data without owning dedupe,
   lifecycle, display, persistence, or routing semantics unless this gate
   explicitly assigns that ownership.
3. If a reviewer finding changes the canonical matrix, the implementer must
   update every mirrored surface named by the checklist before handing back.
4. If a new mirrored surface appears during review, add it to the checklist
   instead of relying on the reviewer to rediscover it each round.
5. If the task cannot name a single canonical source-of-truth for the changed
   contract, it is not ready for approval. Either refine the task into a
   canonical matrix first or route back to plan if the ownership split is wrong.
6. Prefer this gate over weakening review severity. The goal is to make dense
   contracts deterministic at specification time by naming their source of
   truth, ownership boundary, structured rules, and mirrored surfaces up front.
