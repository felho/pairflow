# L1 Contract Boundaries

Use this to decide what belongs in L1 (required) vs L2 (optional).

Rule:
1. If it affects other files/systems/developer expectations -> L1.
2. If it is internal implementation detail inside one code unit -> L2.

L1 categories:
1. Data and type contract
2. Public interfaces and call-sites
3. Side effects and state mutation boundaries
4. Error/fallback behavior
5. Dependency constraints
6. Test matrix
7. Shared contract compatibility when a shared interface/result shape changes
8. Authority boundary map when authority/read-model/multi-consumer work is in scope
9. Baseline-preservation and replacement-proof rules when an existing canonicalization/resolution path is refined or removed

Required clarifications inside L1:
1. Mark required vs optional fields for changed input/output contracts.
2. Record exact public entry signature for each changed call-site.
3. Pure-by-default rule: if allowed side effects are not listed, implementation is pure.
4. If dependencies exist, include explicit dependency-failure fallback behavior.
5. If a shared interface/result shape changes, inventory current consumers and classify additive vs breaking behavior.
6. If authority fan-out exists, state which consume families are in scope vs explicitly out of scope.
7. If a task forbids a fallback class, also record the allowed deterministic same-authority resolution path when that distinction affects correctness.
8. If a current runtime/canonicalization behavior is removed, record the replacement path and the equivalence or intentional-difference proof required from validation.

Any item not crossing these boundaries should default to `later-hardening`.
