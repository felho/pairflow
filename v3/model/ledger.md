# Core-model derived registries

> GENERATED — do not edit. Regenerate: `python3 tools/v3-model/report_ledger.py`
> (check.sh fails when this file is stale.)

## 1 · Deferral ledger — 140 Absent items by pointer target

### L0b (2)

- `l0a` · actor-binding-work-item-dispatch — → L0b
- `l0a` · agent-guidance — → L0b

### L0b+ (1)

- `l0a` · actor-supplied-stale-intent — → L0b+

### L0c (1)

- `l0b` · agent-config-interpretation — → L0c

### L0e (2)

- `l0d` · runtime-context-spec-provider-contract — → L0e
- `l0f` · slot-interpolation — → L0e

### L0g (1)

- `l0f` · run-scoped-mode-variants — → L0g (run-scoped mode / variants)

### L1 (3)

- `l0a` · capability-check — → L1
- `l0b` · authorization — → L1
- `l0c` · authorization-gate — → L1 / L2

### L2 (6)

- `l0a` · gate-policy — → L2
- `l0a` · round-limit — → L2
- `l0b` · gate-policy-round-limit — → L2
- `l0c` · authorization-gate — → L1 / L2
- `l1` · gate-policy — → L2
- `emit-contract` · verify-governance-across-runs — → L2

### L2a (2)

- `l2` · external-process-gates — → L2a
- `l2` · dynamic-module-loading — → L2a

### L2b (5)

- `l0c` · prompt-context-assembly — → L2b
- `l0e` · full-contextassembly — → L2b
- `l0f` · per-step-dynamic-slot-resolution — → L2b
- `l2` · actor-facing-communication — → L2b
- `l2a` · actor-facing-trust-skip-rerun-communication — → L2b

### L3 (7)

- `l0a` · human-gate-approval — → L3
- `l0d` · post-approval-resume-actions — → L3 contract / later actions
- `l0d` · human-child-timeout-external-waits — → L3 / L4 / L9
- `l0d` · generic-wait-resume-contract — → L3 / L4 / L9
- `l1` · lifecycle-state-authorization — → L3
- `l2` · route-verdict-workflow-redirection — → routing slice / L3
- `l2a` · route-verdict — → routing slice / L3

### LC2 (2)

- `l3` · resume-actions-post-approval-mechanics — → LC3a · LC2 · LC4
- `storage-scope` · release-mechanics — → LC2

### LC3a (4)

- `l3` · resume-actions-post-approval-mechanics — → LC3a · LC2 · LC4
- `storage-scope` · workflow-actions — → LC3a / LC3b
- `runtime-teardown` · deferred-release-boundary-realized — → LC3a
- `runtime-teardown` · workflow-actions — → LC3a / LC3b

### LC3b (3)

- `storage-scope` · workflow-actions — → LC3a / LC3b
- `runtime-teardown` · workflow-actions — → LC3a / LC3b
- `workflow-actions` · packaged-action-library — → LC3b

### LC4 (5)

- `l3` · resume-actions-post-approval-mechanics — → LC3a · LC2 · LC4
- `storage-scope` · archive-export-purge-retention — → LC4 (~L8 ops)
- `storage-scope` · computed-templated-evidence-bodies — → LC4
- `runtime-teardown` · archive-export-purge — → LC4
- `workflow-actions` · operator-delete — → LC4

### L4 (4)

- `l0a` · child-workflows-internal-events — → L4
- `l0d` · human-child-timeout-external-waits — → L3 / L4 / L9
- `l0d` · generic-wait-resume-contract — → L3 / L4 / L9
- `runtime-teardown` · child-release-fan-out — → L4

### L5 (3)

- `l0a` · help-subflow — → L5
- `l3` · agent-initiated-ask-human-help-reply — → L5
- `l3` · deferred-request-rework — → L5 + watchdog (L6/L9)

### L6 (3)

- `l0a` · triggers — → L6
- `l3` · deferred-request-rework — → L5 + watchdog (L6/L9)
- `l5` · deferred-rework-stash — → L6/L9

### L7 (8)

- `l0a` · grants-credentials — → L7
- `l0c` · credential-grant — → L7
- `l0d` · operator-authority-identity — → L7 / L10
- `l0d` · operator-intent-audit-provenance — → L7 / L10
- `l0e` · durable-delivery — → L8 / L7
- `l1` · actor-identity-authentication — → L7 / L10
- `l2a` · projection-ref-scoped-query-sdk — → later / L7-ish
- `l3` · agent-to-agent-or-external-token-ask — → L7 / L8

### L8 (11)

- `l0a` · channels-task-inbox-general-ask — → L8
- `l0b` · durable-delivery — → L8
- `l0e` · durable-delivery — → L8 / L7
- `l3` · multi-channel-delivery-rich-input-forms — → L8
- `l3` · agent-to-agent-or-external-token-ask — → L7 / L8
- `storage-scope` · archive-export-purge-retention — → LC4 (~L8 ops)
- `runtime-teardown` · remote-distributed-release-proofs — → L8 / L10
- `workflow-actions` · remote-distributed-action-proofs — → L8 / L10
- `l4-child` · durable-external-channel — → L8
- `l5` · durable-ask-channels — → L8
- `l5` · help-routing — → L8/L10

### L9 (17)

- `l0a` · wait-correlation — → L9
- `l0d` · human-child-timeout-external-waits — → L3 / L4 / L9
- `l0d` · generic-wait-resume-contract — → L3 / L4 / L9
- `l3` · deferred-request-rework — → L5 + watchdog (L6/L9)
- `l3` · non-operator-resume-sources — → L9
- `l3` · timeout-on-a-human-wait — → L9
- `runtime-teardown` · eventual-liveness-guarantee — → L9
- `workflow-actions` · action-running-recovery-exactly-once — → L9
- `auto-workflow-actions` · deferred-async-mechanics — → L9
- `auto-workflow-actions` · unbounded-retry-watchdog — → L9
- `auto-workflow-actions` · undeclared-outcome-recovery — → L9
- `archive-purge` · retention-auto-purge — → L9 / ops
- `l4-child` · lost-event-orphan-reconciliation — → L9
- `l4-child` · auto-recovery-of-a-transient-spawn-dispatch-crash — → L9
- `l5` · help-timeout-escalation — → L9
- `l5` · deferred-rework-stash — → L6/L9
- `emit-contract` · deferred-verify-currency — → L9

### L10 (7)

- `l0a` · gatekeeper-federation — → L10
- `l0d` · operator-authority-identity — → L7 / L10
- `l0d` · operator-intent-audit-provenance — → L7 / L10
- `l1` · actor-identity-authentication — → L7 / L10
- `runtime-teardown` · remote-distributed-release-proofs — → L8 / L10
- `workflow-actions` · remote-distributed-action-proofs — → L8 / L10
- `l5` · help-routing — → L8/L10

### L11+ (3)

- `l0f` · central-store-registry — → L11+
- `storage-scope` · multi-instance-federation-storage — → L11+
- `archive-purge` · cross-run-federation-purge — → L11+

### §11.4 (3)

- `l0b` · rich-context-assembly — → §11.4
- `l0c` · skill-doc-retrieval-memory-assembly — → §11.4
- `l2b` · rich-context-assembly — → §11.4

### §14.2 (1)

- `l0c` · model-routing-optimization — → §14.2

### §18 (2)

- `l0d` · retry-compensation-rollback — → §18
- `l0e` · provisioning-failure-handling — → later / §18

### by design (7)

- `l0f` · kernel-mechanics — → by design
- `l0f` · actor-model-binding-as-slots — → by design
- `l0f-mode` · runtime-mode-conditional — → by design
- `l0f-mode` · mode-expression-dsl-overlay-patch-step-graph-rewrite — → by design
- `l0f-mode` · mode-on-agent-config-or-on-steps — → by design
- `l0f-mode` · post-start-mode-change — → by design
- `l4-child` · kernel-held-task-queue — → by design

### executor (2)

- `l0c` · actor-runtime-adaptation — → executor
- `l0c` · runtime-attestation — → executor

### extension (1)

- `l4-child` · intermediate-lifecycle-subscription — → extension

### impl (4)

- `l0e` · provider-internals — → impl
- `storage-scope` · storage-backend-choice — → impl
- `storage-scope` · durable-write-mechanism — → impl
- `runtime-teardown` · provider-internals — → impl

### later (37)

- `l0c` · tool-installation-provisioning — → later
- `l0e` · teardown-lifecycle — → later
- `l0e` · provider-health-availability — → later
- `l0e` · run-override-cascade — → later
- `l0e` · conditional-per-step-runtime-context — → later
- `l0f` · definition-prs — → later
- `l0f` · full-schema-system — → later
- `l0f` · global-leniency-tradeoff — → later
- `l1` · authored-capability-restrictions-in-the-baseline — → later
- `l1` · capability-filtered-packet-ops — → later
- `l2` · gate-private-mutable-state — → later
- `l2` · findings-vocabulary — → later
- `l2` · broad-declarative-dsl — → later
- `l2a` · deferred-process-gates — → later
- `l2a` · fail-instance-disposition — → later
- `l2a` · dynamic-module-loading — → later
- `l2b` · computed-templated-bodies — → later
- `l2b` · semantic-parity-check — → later
- `l2b` · actor-adapter-rendering — → later
- `l2b` · conditional-block-bodies — → later
- `l3` · dynamic-recommendation-decision-condition-language — → later
- `runtime-teardown` · retained-external-release-policy-exercised — → later
- `workflow-actions` · auto-trigger — → later
- `workflow-actions` · rich-outcome-condition-language — → later
- `auto-workflow-actions` · pure-computed-routing — → later
- `auto-workflow-actions` · rich-outcome-predicate-dsl — → later
- `auto-workflow-actions` · packaged-action-library — → later
- `archive-purge` · restore-re-hydration — → later
- `l0f-mode` · run-level-policy-map-engine — → later
- `l4-child` · fan-out-fan-in — → later
- `l4-child` · parent-driven-child-control — → later
- `l5` · non-blocking-help — → later
- `l5` · help-emit-gating — → later
- `emit-contract` · structured-claim-model — → later
- `emit-contract` · digest-on-operator-paths — → later
- `emit-contract` · emit-contract-on-operator-intents — → later
- `emit-contract` · extended-authority-fields — → later

### later (blob store) (1)

- `archive-purge` · shared-dedup-evidence-ownership — → later (blob store)

### later / impl (1)

- `l0d` · kickoff-payload-materialization — → later / impl

### ops (2)

- `archive-purge` · archive-query-list-cli — → ops
- `archive-purge` · export-formats-sharing — → ops

## 2 · Invariant catalog — 116 rules

- `l0a` · **op-id-idempotency** — op_id idempotency
- `l0a` · **atomic-transition-commit** — atomic transition commit
- `l0a` · **definition-store** — definition store
- `l0a` · **instance-store** — instance store
- `l0a` · **transcript-event-log** — transcript / event log
- `l0a` · **artifact-refs** — artifact refs
- `l0b` · **expected-version-mandatory** — expected_version mandatory
- `l0b` · **binding-coverage-at-start** — binding coverage at start
- `l0b` · **commit-deliver** — commit ≠ deliver
- `l0c` · **deterministic-provenance** — deterministic provenance
- `l0c` · **config-sources-immutable-per-dispatched-step** — config sources immutable per dispatched step
- `l0c` · **issued-proven-runtime** — issued ≠ proven runtime
- `l0d` · **two-axis-state** — two-axis state
- `l0d` · **actor-routable-execution** — actor-routable execution
- `l0d` · **uniform-commit-discipline** — uniform commit discipline
- `l0d` · **typed-waiting** — typed waiting
- `l0d` · **terminal-is-a-sink** — terminal is a sink
- `l0d` · **readiness-gates-dispatch** — readiness gates dispatch
- `l0e` · **context-is-optional** — context is optional
- `l0e` · **requirement-is-template-owned** — requirement is template-owned
- `l0e` · **provider-resolved-at-start** — provider resolved at START
- `l0e` · **kind-boundary-only** — kind-boundary only
- `l0e` · **projection-never-the-ref** — projection, never the ref
- `l0e` · **registry-stable-for-the-run** — registry stable for the run
- `l0f` · **no-kernel-mutation** — no kernel mutation
- `l0f` · **template-pinned-at-resolution** — template pinned at resolution
- `l0f` · **required-slots-bound** — required slots bound
- `l0f` · **typed-values** — typed values
- `l0f` · **deterministic-5-tier-cascade** — deterministic 5-tier cascade
- `l0f` · **scoped-strict-reject** — scoped strict reject
- `l0f` · **explicit-target-must-exist** — explicit target must exist
- `l1` · **expected-role-mandatory** — expected_role mandatory
- `l1` · **authorization-before-commit** — authorization before commit
- `l1` · **capability-default-derived** — capability default-derived
- `l2` · **gate-before-commit** — gate before commit
- `l2` · **round-is-canonical-reconstructable** — round is canonical &amp; reconstructable
- `l2` · **inline-declarative-packaged-only-in-l2-core** — inline declarative/packaged only in L2 core
- `l2` · **ordered-first-block-wins** — ordered, first-block-wins
- `l2` · **gate-is-read-only-stateless** — gate is read-only &amp; stateless
- `l2a` · **runs-in-the-workspace** — runs in the workspace
- `l2a` · **gate-config-validated-at-definition-load** — gate config validated at definition load
- `l2a` · **bounded-timeout-mandatory** — bounded timeout mandatory
- `l2a` · **evidence-on-every-run** — evidence on every run
- `l2a` · **explicit-output-mode** — explicit output mode
- `l2a` · **runner-error-business-block** — runner error ≠ business block
- `l2a` · **still-inline-only** — still inline only
- `l2b` · **single-body-source** — single body source
- `l2b` · **refs-validated-at-definition-load** — refs validated at definition load
- `l2b` · **deterministic-ordered-render** — deterministic ordered render
- `l2b` · **authority-scoped-gate-blocks** — authority-scoped gate blocks
- `l2b` · **dedup-with-retained-provenance** — dedup with retained provenance
- `l2b` · **communication-only** — communication only
- `l3` · **park-is-one-visible-transition** — park is one visible transition
- `l3` · **decision-is-operator-intent-not-actor-envelope** — decision is operator-intent, not actor-envelope
- `l3` · **waiting-is-honest** — WAITING is honest
- `l3` · **override-is-explicit-and-recorded** — override is explicit and recorded
- `l3` · **a-loop-back-resumes-clean** — a loop-back resumes clean
- `l3` · **a-decision-carries-its-required-payload** — a decision carries its required payload
- `l3` · **decisions-carry-no-lifecycle-meaning** — decisions carry no lifecycle meaning
- `l3` · **a-parked-wait-resumes-only-on-a-matching-event** — a parked wait resumes only on a matching event
- `storage-scope` · **inv-1-canonical-durability** — INV-1 · canonical durability
- `storage-scope` · **inv-2-no-workspace-sole-truth** — INV-2 · no workspace-sole-truth
- `storage-scope` · **inv-3-evidence-ref-discipline-the-one-new-runtime-rule** — INV-3 · evidence-ref discipline (the one new runtime rule)
- `storage-scope` · **inv-4-projection-subordination** — INV-4 · projection subordination
- `storage-scope` · **inv-5-release-safety-the-bridge-to** — INV-5 · release safety (the bridge to LC2)
- `runtime-teardown` · **release-obligation-is-never-dropped-silently** — release obligation is never dropped silently
- `runtime-teardown` · **release-failed-is-a-handle-not-a-runtime** — release_failed is a handle, not a runtime
- `runtime-teardown` · **release-safe-precondition** — release-safe precondition
- `runtime-teardown` · **release-is-orthogonal-to-lifecycle** — release is orthogonal to lifecycle
- `runtime-teardown` · **release-initiation-is-post-commit** — release initiation is post-commit
- `runtime-teardown` · **single-winner-release-initiation-cas** — single-winner release initiation (CAS)
- `runtime-teardown` · **correlated-idempotent** — correlated + idempotent
- `runtime-teardown` · **teardown-managed-release-policy-declared** — teardown-managed ⇒ release policy declared
- `runtime-teardown` · **boundary-is-declared-not-hardcoded** — boundary is declared, not hardcoded
- `workflow-actions` · **single-winner-action-claim-cas-marker-first** — single-winner action claim (CAS, marker-first)
- `workflow-actions` · **the-outcome-selects-the-kernel-does-not** — the outcome selects, the kernel does not
- `workflow-actions` · **trigger-validates-payload-action-examines-the-workspace** — trigger validates payload; action examines the workspace
- `workflow-actions` · **a-self-routing-outcome-stays-parked** — a self-routing outcome stays parked
- `workflow-actions` · **the-action-result-is-recorded-with-evidence** — the action result is recorded with evidence
- `workflow-actions` · **an-outcome-may-emit-a-release-boundary** — an outcome may emit a release boundary
- `workflow-actions` · **action-is-select-gate-is-filter** — action is select, gate is filter
- `auto-workflow-actions` · **auto-is-marker-first-too** — auto is marker-first too
- `auto-workflow-actions` · **only-an-auto-step-re-issues-the-run-the-a-b-boundary** — only an auto step re-issues the run (the LC3a/LC3b boundary)
- `auto-workflow-actions` · **the-result-is-a-correlated-kernel-event** — the result is a correlated kernel-event
- `auto-workflow-actions` · **bounded-retry-is-opt-in-and-episode-anchored** — bounded retry is opt-in and episode-anchored
- `auto-workflow-actions` · **the-recommendation-rides-the-firing-edge** — the recommendation rides the firing edge
- `archive-purge` · **archive-is-not-the-preservation-path** — archive is not the preservation path
- `archive-purge` · **purge-is-complete-closure-scoped** — purge is complete &amp; closure-scoped
- `archive-purge` · **the-destructive-precondition-is-on-the-purge-not-the-intent** — the destructive precondition is on the purge, not the intent
- `archive-purge` · **a-purge-leaves-a-tombstone-the-global-audit-survives** — a purge leaves a tombstone; the global audit survives
- `archive-purge` · **delete-is-an-operator-intent-not-a-workflow-action** — delete is an operator intent, not a workflow action
- `l0f-mode` · **fail-closed-mode-set** — fail-closed mode set
- `l0f-mode` · **mode-is-start-fixed-baked-in** — mode is start-fixed &amp; baked in
- `l0f-mode` · **mode-is-not-a-gate-input** — mode is not a gate input
- `l0f-mode` · **docs-only-is-an-explicit-gate-not-gate-absence** — docs-only is an explicit gate, not gate-absence
- `l0f-mode` · **catalog-blocks-are-never-mode-pruned** — catalog blocks are never mode-pruned
- `l4-child` · **a-child-is-a-full-instance-not-a-subflow** — a child is a full instance, not a subflow
- `l4-child` · **idempotent-spawn-child-key-on-the-active-link** — idempotent spawn (child_key) — on the ACTIVE link
- `l4-child` · **spawn-write-back-is-correlated-cas-d** — spawn write-back is correlated + CAS'd
- `l4-child` · **the-parent-owns-the-link-the-child-carries-the-back-ref** — the parent owns the link; the child carries the back-ref
- `l4-child` · **child-lifecycle-is-transition-based-the-anchor-is-terminal** — CHILD_LIFECYCLE is transition-based; the anchor is terminal
- `l4-child` · **routing-is-fail-closed-on-the-subscription** — routing is fail-closed on the subscription
- `l4-child` · **round-is-instance-local** — round is instance-local
- `l4-child` · **a-spawn-that-cannot-start-is-a-failed-attempt** — a spawn that cannot start is a failed attempt
- `l5` · **one-visible-transition-park** — the ask parks in one visible transition
- `l5` · **one-emit-one-entry** — one emit, one entry
- `l5` · **stay-is-not-an-arrival** — stay is not an arrival
- `l5` · **reply-rides-the-record** — the reply rides the record
- `l5` · **undeclared-help-starts-nothing** — an undeclared or unauthorized ask starts nothing
- `l5` · **blocking-home-one-open-help** — the wait-slot home admits one open ask
- `emit-contract` · **offer-equals-gate** — the offer IS the gate's answer
- `emit-contract` · **summary-is-a-headline** — the summary is a headline, never authority
- `emit-contract` · **self-report-is-never-evidence** — self-report is never evidence
- `emit-contract` · **no-stale-green** — no stale-green
- `emit-contract` · **digest-pinned-to-the-contract** — idempotency is pinned to the full contract
- `emit-contract` · **a-version-pins-meaning-forever** — a catalog version pins meaning forever

## 3 · Rejection registry — 54 distinct `Rejected(...)` reasons

- `action_result_mismatch` — first appears in `auto-action-pseudocode`
- `action_result_not_auto_action` — first appears in `auto-action-pseudocode`
- `action_trigger_mismatch` — first appears in `action-pseudocode`
- `already_purged` — first appears in `complete-pseudocode`
- `child_lifecycle_not_subscribed` — first appears in `l4-pseudocode`
- `child_link_mismatch` — first appears in `l4-pseudocode`
- `child_link_unknown` — first appears in `l4-pseudocode`
- `child_spawn_already_resolved` — first appears in `l4-pseudocode`
- `decision_request_mismatch` — first appears in `l3-pseudocode`
- `default_mode_undeclared` — first appears in `l0f-mode-pseudocode`
- `delete_confirmation_required` — first appears in `complete-pseudocode`
- `gate_blocked` — first appears in `l2-pseudocode`
- `gate_evaluator_unavailable` — first appears in `l2-pseudocode`
- `gate_execution_not_supported` — first appears in `l2-pseudocode`
- `help_not_declared` — first appears in `l5-pseudocode`
- `help_request_mismatch` — first appears in `l5-pseudocode`
- `invalid_field_value` — first appears in `emit-contract-pseudocode`
- `invalid_shape` — first appears in `l0a-pseudocode`
- `missing_evidence_ref` — first appears in `emit-contract-pseudocode`
- `missing_required_field` — first appears in `l3-pseudocode`
- `missing_role` — first appears in `l1-pseudocode`
- `missing_version` — first appears in `l0b-pseudocode`
- `mode_surface_without_modes` — first appears in `l0f-mode-pseudocode`
- `mode_tag_on_unsupported_surface` — first appears in `l0f-mode-pseudocode`
- `no_mode_selected` — first appears in `l0f-mode-pseudocode`
- `no_resume_transition` — first appears in `l3-pseudocode`
- `no_transition` — first appears in `l0a-pseudocode`
- `no_workflow_selected` — first appears in `l0f-pseudocode`
- `not_active` — first appears in `l0d-pseudocode`
- `not_authorized` — first appears in `l1-pseudocode`
- `not_awaiting_action` — first appears in `action-pseudocode`
- `not_awaiting_decision` — first appears in `l3-pseudocode`
- `not_awaiting_help` — first appears in `l5-pseudocode`
- `not_awaiting_this_child` — first appears in `l4-pseudocode`
- `not_bare_wait` — first appears in `l3-pseudocode`
- `not_waiting` — first appears in `l3-pseudocode`
- `op_id_collision` — first appears in `emit-contract-pseudocode`
- `operator_not_authorized` — first appears in `l3-pseudocode`
- `override_not_applicable` — first appears in `l3-pseudocode`
- `override_required` — first appears in `l3-pseudocode`
- `resume_event_mismatch` — first appears in `l3-pseudocode`
- `role_not_authorized` — first appears in `l1-pseudocode`
- `runtime_context_provider_unavailable` — first appears in `l0e-pseudocode`
- `runtime_context_required_for_process_gate` — first appears in `l2a-pseudocode`
- `slot_type_mismatch` — first appears in `l0f-pseudocode`
- `task_required` — first appears in `l0d-pseudocode`
- `unbound_required_slot` — first appears in `l0f-pseudocode`
- `undeclared_mode_tag` — first appears in `l0f-mode-pseudocode`
- `unknown_decision` — first appears in `l3-pseudocode`
- `unknown_instance` — first appears in `l0a-pseudocode`
- `unknown_mode` — first appears in `l0f-mode-pseudocode`
- `unknown_slot` — first appears in `l0f-pseudocode`
- `unknown_target` — first appears in `l0f-pseudocode`
- `workflow_definition_unavailable` — first appears in `l0f-pseudocode`

## 4 · Domain registry — 51 aggregate blocks · 122 entities

### `l0a` (3 blocks · 7 entities)

- **Template aggregate — the definition (immutable at runtime)** — WorkflowTemplate [root] · Step · Role (name only)
- **Instance aggregate — the run (mutable, append-only history)** — WorkflowInstance [root] · Transcript · LifecycleStatus (value)
- **Message — crosses the boundary** — EventEnvelope
- *relations:* a Template (id + version) defines Steps bound to Role names. A WorkflowInstance is created from a Template — snapshotting its template_ref { id, version } so the run is pinned to an immutable definition — and owns its Transcript. An EventEnvelope targets an instance and carries an actor_id as provenance (who sent it); the kernel applies it as a transition. Which concrete actor fills a role, and how the next work item is dispatched, is L0b.

### `l0b` (3 blocks · 6 entities)

- **Template aggregate — gains actor defaults & guidance** — Role · Step · Actor
- **Instance aggregate — gains task & effective binding** — WorkflowInstance
- **Kernel output — derived, not stored** — DispatchIntent · ContextPacket

### `l0c` (3 blocks · 6 entities)

- **Template aggregate — gains the run profile** — Role · Step · AgentConfig (value)
- **Instance aggregate — gains run overrides** — WorkflowInstance · TranscriptEntry
- **Kernel output — derived, not stored** — effective_agent_config

### `l0d` (4 blocks · 13 entities)

- **WorkflowInstance — a lifecycle axis beside the step position** — WorkflowInstance · Template
- **Value objects** — KernelStatus (value) · TerminalDisposition (value) · WaitReason (value) · RuntimeContext (value) · RuntimeContextRef (value) · ActivationMode (value)
- **Kernel inputs — the entry is no longer actor-only** — OperatorIntent · KernelEvent · ActorEnvelope
- **New rejections — before any state change** — Rejected(not_active) · Rejected(task_required)

### `l0e` (3 blocks · 8 entities)

- **Template & packet — the runtime context becomes declared and projected** — Template · ContextPacket
- **The provider family** — RuntimeContextProvider (contract) · ProviderRegistry · RuntimeContextProjection (value) · RuntimeContextRef (value, from L0d) · RuntimeContextRequirement (value)
- **New rejection — before provisioning, no state change** — Rejected(runtime_context_provider_unavailable)

### `l0f` (3 blocks · 13 entities)

- **Template side — declared, typed holes** — Template · SlotDeclaration (value)
- **Repo side — the resolution sources (pre-kernel)** — ProjectConfig · WorkflowSource · StartCommand (operator intent) · ResolvedDefinition (value) · ResolvedStartRequest (output)
- **New rejections — all pre-kernel, no state change** — Rejected(no_workflow_selected) · Rejected(workflow_definition_unavailable) · Rejected(unknown_target(t)) · Rejected(unknown_slot(key)) · Rejected(unbound_required_slot(id)) · Rejected(slot_type_mismatch(id))

### `l1` (3 blocks · 6 entities)

- **Envelope & packet — the authority snapshot grows a role dimension** — EventEnvelope · ContextPacket
- **Template aggregate — gains the authorization profile** — CapabilityProfile (value)
- **New rejections — before commit, no state change** — Rejected(missing_role) · Rejected(role_not_authorized) · Rejected(not_authorized)

### `l2` (4 blocks · 10 entities)

- **Template aggregate — gains the gate pipeline** — GateBinding · GatePipeline
- **Evaluation & admission — one registration contract, two value types** — GateRegistration · GateDecision (value) · AdmittedDefinition (value)
- **Instance & read model — a canonical round and a policy-facing view** — WorkflowInstance · gate_projection
- **New rejections — before commit, no state change, no round burned** — Rejected(gate_blocked(reason)) · Rejected(gate_evaluator_unavailable) · Rejected(gate_execution_not_supported)

### `l2a` (2 blocks · 3 entities)

- **Execution contract — a named runner and its values** — ProcessGateRunner · GateInvocation (value) · ProcessResult (value)
- **Canonical Process Gate Contract — the single source of truth for external.process** — (no entities)

### `l2b` (2 blocks · 3 entities)

- **Context blocks — a catalog and its rendered values** — context_blocks catalog (template) · ContextBlockRef · ContextBlock (value)
- **Canonical Context Block Contract — the single source of truth for the render** — (no entities)

### `l3` (3 blocks · 5 entities)

- **Human decision — a wait, an Ask, and a transcript pair** — wait step + RESUME_WAIT (minimal shape at L3) · human_gate (step type) · apply_target_entry_effects(...) (shared rule) · HumanDecisionRequest (value) · DECISION_REQUEST / DECISION_MADE (transcript)
- **Human Decision Contract — the single source of truth for the gate and the decision** — (no entities)
- **Bare Wait Resume Contract — the dual of the decision contract, for a type: wait step** — (no entities)

### `storage-scope` (3 blocks · 2 entities)

- **The four homes** — (no entities)
- **Canonical Home Table — the single source of truth for where each run datum lives** — (no entities)
- **Sealed projection snapshot — a closed, verifiable projection, not a second truth** — shape · constraints

### `runtime-teardown` (3 blocks · 8 entities)

- **Runtime Resource Lifecycle Contract — the single source of truth for provision and release** — (no entities)
- **Release policy — the release contract is the provision contract's declared pair** — policy: required · policy: retained · policy: external · load-time rule
- **Release boundary — a declared event, distinct from the command that causes it** — declared, per policy · terminal is an event, not a default · deferred (later) · not the API

### `workflow-actions` (2 blocks · 3 entities)

- **Workflow Action Contract — the single source of truth for a type: action step** — (no entities)
- **action ⟷ human_gate — same mechanism, different selector** — routing map · selector · ActionRequest

### `auto-workflow-actions` (1 block · 0 entities)

- **Auto Workflow Action — the LC3a contract + the auto trigger** — (no entities)

### `archive-purge` (3 blocks · 0 entities)

- **Archive / Export / Purge — three independent axes (delete-intent · release · storage)** — (no entities)
- **State authority — which storage-lifecycle state lives where (so it is never re-derived in the wrong place)** — (no entities)
- **Hard-purge ordering — write-ahead & crash-safe (a different kind of truth: not "what the op is" but "in what order it is safe")** — (no entities)

### `l0f-mode` (2 blocks · 9 entities)

- **Template side — declared variants (modes) + the membership tag** — modes / default_mode · modes: membership tag · mode-specific gate binding
- **New rejections — all pre-kernel, fail-closed** — Rejected(no_mode_selected) · Rejected(unknown_mode(m)) · Rejected(default_mode_undeclared) · Rejected(undeclared_mode_tag(t)) · Rejected(mode_tag_on_unsupported_surface) · Rejected(mode_surface_without_modes)

### `l4-child` (2 blocks · 10 entities)

- **Five primitives — the canonical contract (the kernel adds only these; the rest is parent-template authoring)** — (no entities)
- **New values + rejections** — SpawnIntent (produce, not perform) · CHILD_SPAWNED (kernel event) · CHILD_SPAWN_FAILED (kernel event) · CHILD_LIFECYCLE (kernel event) · Rejected(child_link_unknown) · Rejected(child_link_mismatch) · Rejected(not_awaiting_this_child) · Rejected(child_lifecycle_not_subscribed) · Definition issues (child_template_ref_unresolved / child_key_missing / child_wait_for_empty / child_wait_for_incomplete / child_wait_target_unresolved) · Rejected(child_spawn_already_resolved)

### `l5` (1 block · 5 entities)

- **Help — an ask, a wait, and a transcript pair** — help_pending (wait kind) · HELP_REQUEST / HELP_REPLIED (transcript) · HelpRequest (value) · step.help (template) · stay (route)

### `emit-contract` (1 block · 5 entities)

- **The emit contract — a schema, a catalog, a family, a digest** — EmitContract (per op, opt-in) · vocabularies (catalog) · gate family (policy | verify) · payload_digest (identity) · op_contracts (packet)
