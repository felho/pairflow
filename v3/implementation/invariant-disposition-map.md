# Invariant Disposition Map

Packet ch5-P2 (plan §5.3; the §1.4 accounting rule mechanized): every
ledger §2 invariant carries exactly ONE enforcement class. The coverage
script validates this file on every CI run — key set == ledger §2, exact
enum tokens, and no packet may declare a disposition that contradicts a
row here (the packet↔map lock).

Classification rubric (ratified at P2 pre-approval):

- `test` — a dedicated behavioral contract test (`CT-*`) is the
  enforcement; the invariant is about kernel behavior under inputs.
- `type/schema` — enforced by construction: TS types, SQLite schema, or
  lint; violating code does not compile/load.
- `checker` — a structural property of committed store state the
  post-condition kit asserts after ANY replay (no scenario needed).
- `review` — not machine-checkable; a `REV-*` line carries it.

The map records the TARGET enforcement class — how the invariant is or
WILL BE enforced when its level is built. Whether it is built is the
packet-ownership axis (coverage report), never this file. The eight
ch-4-bound rows are fixed by their packets; reclassifying a row that a
packet already declares is a validation failure by design.

## The map (machine face — parsed by `check_coverage.py`)

```json
{
  "invariant_disposition_map": {
    "archive-purge/a-purge-leaves-a-tombstone-the-global-audit-survives": "test",
    "archive-purge/archive-is-not-the-preservation-path": "review",
    "archive-purge/delete-is-an-operator-intent-not-a-workflow-action": "type/schema",
    "archive-purge/purge-is-complete-closure-scoped": "test",
    "archive-purge/the-destructive-precondition-is-on-the-purge-not-the-intent": "test",
    "auto-workflow-actions/auto-is-marker-first-too": "test",
    "auto-workflow-actions/bounded-retry-is-opt-in-and-episode-anchored": "test",
    "auto-workflow-actions/only-an-auto-step-re-issues-the-run-the-a-b-boundary": "test",
    "auto-workflow-actions/the-recommendation-rides-the-firing-edge": "type/schema",
    "auto-workflow-actions/the-result-is-a-correlated-kernel-event": "type/schema",
    "emit-contract/a-version-pins-meaning-forever": "review",
    "emit-contract/digest-pinned-to-the-contract": "test",
    "emit-contract/no-stale-green": "test",
    "emit-contract/offer-equals-gate": "test",
    "emit-contract/self-report-is-never-evidence": "review",
    "emit-contract/summary-is-a-headline": "review",
    "l0a/artifact-refs": "checker",
    "l0a/atomic-transition-commit": "test",
    "l0a/definition-store": "type/schema",
    "l0a/instance-store": "type/schema",
    "l0a/op-id-idempotency": "test",
    "l0a/transcript-event-log": "type/schema",
    "l0b/binding-coverage-at-start": "test",
    "l0b/commit-deliver": "test",
    "l0b/expected-version-mandatory": "test",
    "l0c/config-sources-immutable-per-dispatched-step": "type/schema",
    "l0c/deterministic-provenance": "test",
    "l0c/issued-proven-runtime": "review",
    "l0d/actor-routable-execution": "test",
    "l0d/readiness-gates-dispatch": "test",
    "l0d/terminal-is-a-sink": "checker",
    "l0d/two-axis-state": "type/schema",
    "l0d/typed-waiting": "type/schema",
    "l0d/uniform-commit-discipline": "review",
    "l0e/context-is-optional": "type/schema",
    "l0e/kind-boundary-only": "type/schema",
    "l0e/projection-never-the-ref": "type/schema",
    "l0e/provider-resolved-at-start": "test",
    "l0e/registry-stable-for-the-run": "test",
    "l0e/requirement-is-template-owned": "type/schema",
    "l0f-mode/catalog-blocks-are-never-mode-pruned": "test",
    "l0f-mode/docs-only-is-an-explicit-gate-not-gate-absence": "type/schema",
    "l0f-mode/fail-closed-mode-set": "test",
    "l0f-mode/mode-is-not-a-gate-input": "type/schema",
    "l0f-mode/mode-is-start-fixed-baked-in": "test",
    "l0f/deterministic-5-tier-cascade": "test",
    "l0f/explicit-target-must-exist": "test",
    "l0f/no-kernel-mutation": "review",
    "l0f/required-slots-bound": "test",
    "l0f/scoped-strict-reject": "test",
    "l0f/template-pinned-at-resolution": "test",
    "l0f/typed-values": "type/schema",
    "l1/authorization-before-commit": "test",
    "l1/capability-default-derived": "test",
    "l1/expected-role-mandatory": "test",
    "l2/gate-before-commit": "test",
    "l2/gate-is-read-only-stateless": "review",
    "l2/inline-declarative-packaged-only-in-l2-core": "type/schema",
    "l2/ordered-first-block-wins": "test",
    "l2/round-is-canonical-reconstructable": "checker",
    "l2a/bounded-timeout-mandatory": "type/schema",
    "l2a/evidence-on-every-run": "checker",
    "l2a/explicit-output-mode": "type/schema",
    "l2a/gate-config-validated-at-definition-load": "test",
    "l2a/runner-error-business-block": "test",
    "l2a/runs-in-the-workspace": "test",
    "l2a/still-inline-only": "type/schema",
    "l2b/authority-scoped-gate-blocks": "test",
    "l2b/communication-only": "review",
    "l2b/dedup-with-retained-provenance": "test",
    "l2b/deterministic-ordered-render": "test",
    "l2b/refs-validated-at-definition-load": "test",
    "l2b/single-body-source": "type/schema",
    "l3/a-decision-carries-its-required-payload": "test",
    "l3/a-loop-back-resumes-clean": "test",
    "l3/a-parked-wait-resumes-only-on-a-matching-event": "test",
    "l3/decision-is-operator-intent-not-actor-envelope": "type/schema",
    "l3/decisions-carry-no-lifecycle-meaning": "review",
    "l3/override-is-explicit-and-recorded": "test",
    "l3/park-is-one-visible-transition": "test",
    "l3/waiting-is-honest": "checker",
    "l4-child/a-child-is-a-full-instance-not-a-subflow": "type/schema",
    "l4-child/a-spawn-that-cannot-start-is-a-failed-attempt": "test",
    "l4-child/child-lifecycle-is-transition-based-the-anchor-is-terminal": "test",
    "l4-child/idempotent-spawn-child-key-on-the-active-link": "test",
    "l4-child/round-is-instance-local": "checker",
    "l4-child/routing-is-fail-closed-on-the-subscription": "test",
    "l4-child/spawn-write-back-is-correlated-cas-d": "test",
    "l4-child/the-parent-owns-the-link-the-child-carries-the-back-ref": "type/schema",
    "l5/blocking-home-one-open-help": "checker",
    "l5/one-emit-one-entry": "checker",
    "l5/one-visible-transition-park": "test",
    "l5/reply-rides-the-record": "type/schema",
    "l5/stay-is-not-an-arrival": "test",
    "l5/undeclared-help-starts-nothing": "test",
    "runtime-teardown/boundary-is-declared-not-hardcoded": "review",
    "runtime-teardown/correlated-idempotent": "test",
    "runtime-teardown/release-failed-is-a-handle-not-a-runtime": "type/schema",
    "runtime-teardown/release-initiation-is-post-commit": "test",
    "runtime-teardown/release-is-orthogonal-to-lifecycle": "type/schema",
    "runtime-teardown/release-obligation-is-never-dropped-silently": "checker",
    "runtime-teardown/release-safe-precondition": "test",
    "runtime-teardown/single-winner-release-initiation-cas": "test",
    "runtime-teardown/teardown-managed-release-policy-declared": "test",
    "storage-scope/inv-1-canonical-durability": "test",
    "storage-scope/inv-2-no-workspace-sole-truth": "review",
    "storage-scope/inv-3-evidence-ref-discipline-the-one-new-runtime-rule": "checker",
    "storage-scope/inv-4-projection-subordination": "review",
    "storage-scope/inv-5-release-safety-the-bridge-to": "test",
    "workflow-actions/a-self-routing-outcome-stays-parked": "test",
    "workflow-actions/action-is-select-gate-is-filter": "review",
    "workflow-actions/an-outcome-may-emit-a-release-boundary": "type/schema",
    "workflow-actions/single-winner-action-claim-cas-marker-first": "test",
    "workflow-actions/the-action-result-is-recorded-with-evidence": "checker",
    "workflow-actions/the-outcome-selects-the-kernel-does-not": "review",
    "workflow-actions/trigger-validates-payload-action-examines-the-workspace": "review"
  }
}
```
