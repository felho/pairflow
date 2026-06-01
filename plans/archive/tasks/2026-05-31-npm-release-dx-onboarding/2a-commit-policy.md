---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_commit_policy_authority_v1
task_family_id: commit-policy
sequence_key: "2a"
task_id: 2a-commit-policy
title: "Commit Policy Authority Foundation"
status: archived
phase: phase2
target_files:
  - "AGENTS.md"
  - "docs/commit-and-release-history-authority.md"
  - "docs/commit-message-guidance.md"
prd_ref: null
plan_ref: plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-31-npm-release-dx-onboarding
---

# Task: Commit Policy Authority Foundation

## L0 - Policy

### Goal

Establish the commit/release-history authority document, operator-facing
commit-message guidance, and lightweight `AGENTS.md` pointer that successor
commit-policy tasks can consume without re-litigating release-history semantics.

### Plan Linkage

1. Parent plan gap closed now: missing commit-message authority foundation and
   release-history classification contract.
2. Depends on: `1-package-version`.
3. Unlocks: `2b-commit-policy` local validation/gate alignment.
4. Does not unlock directly: `3-release-automation` still requires `2b` and
   `2c`.

### Control Model

1. Business invariant: release automation must later consume explicit
   conventional commit authority without treating Pairflow lifecycle messages as
   semver/changelog authority.
2. Control model: `docs/commit-and-release-history-authority.md` owns taxonomy
   and release-history inheritance; `docs/commit-message-guidance.md` owns
   operator guidance; `AGENTS.md` only points agents to the guidance when
   preparing commits.
3. Read-path rule: humans and agents read guidance from
   `docs/commit-message-guidance.md`; successor automation and validators read
   the authority taxonomy before implementing behavior.
4. Forbidden fallback: do not duplicate the full commit policy in `AGENTS.md`;
   do not infer release semantics from merge messages, body prose, footers,
   branch names, PR titles, old finalize commits, or release-tool defaults.
5. Allowed resolution path: document deterministic conventional first-line
   classes, exact merge-header exception forms, standard/conventional revert
   handling, and historical-finalize rejection for successor implementation.
6. Missing-data rule: if the taxonomy cannot classify a commit class, mark it
   successor/refinement-owned instead of inventing automation behavior here.

### Scope Reality / Shape Proof

1. Target-file reality:
   - `docs/commit-and-release-history-authority.md` already exists and must be
     adopted/updated, not recreated as an empty artifact.
   - `docs/commit-message-guidance.md` is created by this document bubble as
     the operator-facing mirror of the authority taxonomy.
   - `AGENTS.md` receives a dedicated commit-guidance pointer without inlining
     the policy.
2. Primary shape: `contract_or_persisted_authority_foundation`.
3. Secondary shape: `N/A`.
4. Mutation entrypoints: none; this task is docs-only.
5. Out of scope: validators, hooks, package scripts, `pairflow bubble commit`,
   merge behavior, `bubble extract --commit`, changelog generation, tags,
   GitHub Releases, and npm publish.

### Complexity Risk Triage

1. `risk_score`: 3.
2. `authority_risk`: 2, because this task establishes the canonical authority
   document used by successor tasks.
3. `surface_spread`: 1, because the authority is mirrored only across two docs
   plus one pointer.
4. `identity_join_risk`: 0.
5. `activation_coupling`: 0, because no hook/runtime behavior is activated.
6. `prerequisite_risk`: 0.
7. `acceptance_multiplicity`: 0.
8. `split_decision`: `single_task_allowed: yes`.
9. `single_task_allowed_reason`: docs-only authority foundation has one proof
   surface and defers all validator, hook, runtime, and release activation.

### Authority Fan-out Scan

| Generic Bucket | Status | Evidence / Boundary |
|---|---|---|
| `authority_producer` | present | `docs/commit-and-release-history-authority.md` produces the taxonomy; `docs/commit-message-guidance.md` mirrors it for operators. |
| `persisted_authority` | present | The authority and guidance docs become persisted repository authority; no Git commits, schema, or runtime state are changed. |
| `internal_execution_consumers` | present | Deferred: runtime command behavior is successor-owned by `2c`; no implementation closure here. |
| `workflow_orchestration_consumers` | present | Deferred: bubble lifecycle compatibility is successor-owned by `2c`; no implementation closure here. |
| `read_model_consumers` | present | Deferred: changelog/read-model automation is successor-owned by `3-release-automation`; no implementation closure here. |
| `cleanup_recovery_consumers` | present | Deferred: revert/merge recovery semantics are documented now; enforcement remains successor-owned. |
| `validator_gate_consumers` | present | Deferred: validators/hooks are successor-owned by `2b`; no gate activation here. |
| `external_integration_consumers` | present | Deferred: Git hook/Git command integration is successor-owned by `2b`/`2c`; no integration closure here. |

### Closure-Budget Gate

| Closure Bucket | Current Task Closure | Evidence / Boundary |
|---|---|---|
| `authority_producer` | present | The authority doc is adopted/updated as the canonical taxonomy source. |
| `shared_contract` | present | The matrix, guidance mirror, and `AGENTS.md` pointer establish the shared docs contract. |
| `internal_execution_consumers` | absent | Fan-out present, closure deferred: runtime command behavior is owned by `2c`; no implementation closure here. |
| `workflow_orchestration_consumers` | absent | Fan-out present, closure deferred: Pairflow lifecycle producer alignment is owned by `2c`; no implementation closure here. |
| `read_model_consumers` | absent | Fan-out present, closure deferred: release/changelog interpretation is owned by `3-release-automation`; no implementation closure here. |
| `persisted_authority_or_schema` | present | Docs-only: persisted repository docs authority changes; no schema, Git history mutation, or runtime state mutation. |
| `cleanup_recovery_consumers` | absent | Fan-out present, closure deferred: revert/recovery semantics are documented; enforcement and release interpretation are successor-owned. |

1. `split_required_triggered`: no.
2. Collapsed closures: authority doc, guidance doc, and `AGENTS.md` pointer.
3. Collapse proof: all three surfaces are docs/policy surfaces and are reviewed
   by taxonomy consistency; no runtime or hook activation is closed here.
4. Deferred closures: local validation/gate alignment in `2b`; Pairflow
   lifecycle producer alignment in `2c`; release automation in
   `3-release-automation`.
5. Consumer-family note: downstream consumers are present but deferred, not
   absent. This task closes the source authority they inherit, not their
   implementation, activation, or integration.

### Bounded Task Shape

1. Primary shape: `contract_or_persisted_authority_foundation`.
2. Secondary shape: `N/A`.
3. Safe shape proof: the task only establishes docs authority and pointer
   surfaces. It does not produce Git commits or activate validation.
4. Current-task closure decomposition:
   - authority doc taxonomy adoption/update,
   - guidance doc mirror creation,
   - lightweight `AGENTS.md` pointer.
5. Not closed here: runtime execution, workflow orchestration, read model,
   validator gates, external Git integration, and release automation.

### Capability Closure

| Capability Claim | Closure Classification | Activation Path | Proof |
|---|---|---|---|
| Commit policy can be found by agents without inlining it in `AGENTS.md`. | `foundation_only` | Read `AGENTS.md` pointer, then `docs/commit-message-guidance.md`. | Document review verifies pointer and guidance exist and do not conflict with authority. |
| Successor validators and release automation have a taxonomy to consume. | `foundation_only` | `2b`, `2c`, and `3-release-automation` read `docs/commit-and-release-history-authority.md`. | Canonical contract matrix and mirrored checklist verify the authority, guidance, fallback, and acceptance surfaces stay aligned. |

### Scoped Invariants

| Invariant | Applies To | Does Not Apply To | Proof Surface | Deferred / External Surfaces | Reviewer Non-Goals |
|---|---|---|---|---|---|
| Release authority belongs to content commits, not lifecycle ceremony. | Authority and guidance docs now; successor tasks inherit the binding. | Validator implementation, Pairflow runtime behavior, and release automation implementation in this task. | Document review for taxonomy consistency. | `2b`, `2c`, `3-release-automation`. | Do not require hook tests or CLI behavior here. |
| `AGENTS.md` must stay lightweight. | Commit-preparation pointer only. | Full commit policy details. | Review `AGENTS.md` diff. | None. | Do not require all examples in `AGENTS.md`. |

### Review Scope Fence

| Edge Case Family | Why Not Required Now | Safe Current Behavior | Review Handling | Route |
|---|---|---|---|---|
| Hook/validator activation | Owned by `2b`. | No hook behavior changes in this task. | Treat implementation as scope expansion. | follow_up |
| Pairflow commit/merge/extract producer behavior | Owned by `2c`. | Existing runtime remains unchanged. | Treat runtime edits as scope expansion. | follow_up |
| Release automation interpretation | Owned by `3-release-automation`. | This task only documents inheritance. | Do not add changelog/version code. | follow_up |

## L1 - Implementation Contract

### Data / State Contract

1. `docs/commit-and-release-history-authority.md` must be the taxonomy source of
   truth. If it already exists, update/adopt it; do not recreate it as an empty
   new artifact.
2. `docs/commit-message-guidance.md` must be an operator guide over the same
   taxonomy, not a competing source of truth.
3. `AGENTS.md` must contain only a short commit-preparation pointer to the
   guidance file.
4. The taxonomy must distinguish:
   - release-relevant conventional content commits,
   - tolerated merge-header integration artifacts,
   - standard/conventional revert recovery commits,
   - historical finalize noise,
   - invalid/ambiguous prose.
5. This task must not claim that validation, hooks, release automation, or
   Pairflow runtime behavior are complete.

### Canonical Contract Matrix

This matrix is the source of truth for the docs contract. Mirrored prose in L0,
L1, acceptance criteria, `docs/commit-and-release-history-authority.md`, and
`docs/commit-message-guidance.md` must agree with it.

| Commit Class | New-Commit Validation Rule | Release Authority Input | Semver / Changelog Owner | Exact Accept / Reject Rule | Successor Owner |
|---|---|---|---|---|---|
| Conventional content commit | Accept deterministic first-line conventional commit headers whose type is one of: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, or the same types with a conventional breaking marker. | Included as full-history release authority according to type/scope. | `3-release-automation` consumes full reachable conventional history later. | Accept only deterministic first-line conventional headers; do not infer authority from body prose, footers, branch names, PR titles, or tool defaults. | `2b` validates local commits; `3-release-automation` consumes release history. |
| Merge-header integration artifact | Tolerate only these exact first-line prefix forms: `Merge branch ...` and `Merge remote-tracking branch ...`. | Excluded from semver/changelog authority; underlying conventional content commits remain visible through full-history selection. | `2c` aligns Pairflow producer behavior; `3-release-automation` inherits full-history traversal and must not use first-parent-only semantic interpretation. | Accept as lifecycle/integration artifact only; reject malformed merge-like prose as ambiguous. | `2c`, then `3-release-automation`. |
| Standard or conventional revert recovery | Tolerate standard Git revert headers beginning `Revert \"...\"` and conventional revert headers beginning `revert` under the documented conventional syntax. | Recovery input only; release effect belongs to successor full-history release interpretation. | `3-release-automation` consumes this as recovery input later. | Accept documented revert forms; do not treat arbitrary "undo" prose as a revert. | `2b` validation; `2c` merge/revert producer compatibility; `3-release-automation` interpretation. |
| Historical finalize noise | Do not accept as new commit policy; reject new first lines matching the historical lifecycle-finalize shape `bubble(<id>): finalize`. | Excluded as historical lifecycle noise. | None for new behavior; `3-release-automation` inherits exclusion while selecting full reachable conventional history. | Reject new finalize-style lifecycle commits; do not add legacy cutoff behavior here. | `2b` rejects new local commits; `3-release-automation` inherits exclusion. |
| Invalid or ambiguous prose | Reject or mark refinement-owned. | Not release authority. | None until refined. | Reject malformed/unknown classes; if a class cannot be deterministically categorized, route to successor/refinement instead of inventing behavior. | `2b` rejects; plan refinement if the taxonomy is incomplete. |

### Closed-Contract Drift Record

| Field | Record |
|---|---|
| `source_anchors` | Parent plan canonical anchors and release-risk notes; `docs/commit-and-release-history-authority.md` core decision, release authority classes, release automation inheritance, historical finalize, validation implications, and successor boundaries. |
| `canonical_elements` | Release authority belongs to conventional content commits; full reachable conventional history is the selected release strategy; merge commits are tolerated integration artifacts only; standard/conventional reverts are recovery input; historical finalize commits are non-release noise; new finalize messages are rejected. |
| `guard_elements` | `AGENTS.md` remains a pointer only; guidance mirrors authority; no body/branch/PR/tool-default fallback; unknown classes route to refinement. |
| `compat_elements` | Existing historical finalize commits may remain in history but are not accepted as new validation input or release authority. |
| `closed_terms` | `full-history conventional selection`, `first-parent-only semantic interpretation is forbidden`, `merge header exception`, `historical finalize noise`, `guidance is not taxonomy authority`. |
| `forbidden_reinterpretations` | Do not reopen release traversal as successor choice; do not make guidance a second source of truth; do not accept new `bubble(<id>): finalize`; do not add cutoff, legacy-range, or compatibility-mode behavior here. |
| `drift_status` | No intentional reinterpretation authorized; this task must preserve the parent plan and existing authority full-history strategy while updating the stale successor-boundary owner names. |
| `downstream_impact` | `2b` derives validator cases from the matrix and authority rows; `2c` aligns producer, merge, and revert compatibility without changing release strategy; `3-release-automation` inherits full reachable conventional history and excludes merge/finalize lifecycle noise. |

### Ownership and Deferred Semantics

1. `2a-commit-policy` owns only the authority and guidance contract surfaces:
   `docs/commit-and-release-history-authority.md`,
   `docs/commit-message-guidance.md`, and the lightweight `AGENTS.md` pointer.
2. `2b-commit-policy` owns validator/hook/gate implementation. It may consume
   the matrix above, but this task does not implement or activate validation.
3. `2c-commit-policy` owns Pairflow lifecycle producer alignment, including
   local `pairflow bubble commit`, remote `pairflow bubble commit`,
   merge/revert compatibility, and adjacent producers such as
   `bubble extract --commit`. It must explicitly classify, defer, or align each
   producer against this authority.
4. `3-release-automation` owns semver, changelog, tags, GitHub Releases, and
   npm publish behavior. It inherits this authority after `2a`, `2b`, and `2c`
   are complete.
5. Safe-range, legacy cutoff, compatibility mode, and release traversal
   behavior are not created here. `3-release-automation` must inherit the
   selected full reachable conventional-history strategy and may document exact
   range selection mechanics, but it must not reinterpret the release strategy
   as first-parent-only semantic interpretation.

### Structured Contract Rules

1. First-line rule: classification is based on deterministic first-line commit
   headers only. Bodies, footers, branch names, PR titles, and tool defaults
   must not be used as fallback release authority.
2. Conventional allowlist rule: the accepted content types are exactly `feat`,
   `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, and `chore`,
   with optional conventional scope and optional conventional breaking marker.
   If the authority doc adds or removes a type, this matrix must be updated in
   the same change.
3. Merge exception rule: only first lines beginning `Merge branch ...` or
   `Merge remote-tracking branch ...` are tolerated as integration artifacts.
4. Revert rule: only standard Git revert headers beginning `Revert \"...\"` and
   conventional revert headers beginning `revert` under the documented
   conventional syntax are tolerated as recovery commits.
5. Finalize rule: new finalize-style lifecycle commits, including
   `bubble(<id>): finalize`, are rejected as commit policy; historical finalize
   commits are excluded from release authority.
6. Full-history rule: release automation inherits full reachable conventional
   commit selection. First-parent-only semantic interpretation is forbidden
   when release-relevant changes live in bubble branch content commits.
7. Unknown-class rule: malformed, ambiguous, or unknown classes are rejected or
   marked refinement-owned. This task must not invent implementation behavior
   for them.
8. Safe-range rule: no cutoff, safe-range, compatibility-mode, or traversal
   behavior is introduced by this docs-only task.
9. Body-candidate rule: body text, footer text, duplicate-looking body lines,
   and additional conventional-looking candidates after the first line do not
   reclassify the commit. They are retained as commit content but ignored for
   classification.
10. Multi-candidate rule: if the first line is invalid but the body contains a
   valid-looking conventional line, the commit remains invalid/ambiguous for
   validation and is not rescued by body parsing.
11. Retention/drop rule: this task defines classification only. It does not
   require any implementation to rewrite, drop, retain, or normalize commit
   body/footer content; such behavior is successor-owned if ever needed.

### Mirrored Surface Checklist

1. L0 Control Model names the same canonical classes and forbidden fallbacks as
   the matrix.
2. L1 Data / State Contract and Structured Contract Rules match the matrix.
3. Error / Fallback Contract preserves the unknown-class and no-cutoff rules.
4. Acceptance Criteria require the authority doc and guidance doc to mirror the
   matrix without creating a second source of truth.
5. `docs/commit-and-release-history-authority.md` successor boundaries are
   updated from the old combined `2-commit-policy` owner to `2a`, `2b`, `2c`,
   and `3-release-automation`.
6. `docs/commit-message-guidance.md` presents operator guidance from the same
   matrix without adding independent rules.
7. `AGENTS.md` remains a pointer only.
8. Each matrix row has an authority-doc row or section mirror: conventional
   content rows mirror Release Authority Classes, merge mirrors Pairflow merge
   behavior and validation implications, revert mirrors release automation
   inheritance and validation implications, finalize mirrors Historical
   Finalize Commits, and invalid prose mirrors Release Authority Classes plus
   validation implications.

### Interface / API Contract

`N/A`: this task does not add CLI scripts, hooks, validators, or runtime
entrypoints.

### Control Flow / Lifecycle Contract

`N/A`: no Pairflow lifecycle state transition, command orchestration, or commit
producer behavior changes are owned by this task.

### Error / Fallback Contract

1. If guidance and authority disagree, the task is not complete.
2. If a commit class is ambiguous, document it as successor/refinement-owned
   instead of adding an implementation rule here.
3. Do not add cutoff, legacy-range, or compatibility-mode behavior here; those
   are implementation concerns for successor tasks and must inherit this
   authority.

### Validation Contract

1. Review the three docs surfaces for taxonomy consistency.
2. Verify `AGENTS.md` remains a pointer only.
3. No TypeScript/runtime tests are required by this docs-only task unless an
   implementation bubble expands scope.

## L2 - Acceptance Criteria

1. `docs/commit-and-release-history-authority.md` exists and is adopted/updated
   as the canonical release-history taxonomy.
2. `docs/commit-message-guidance.md` exists and mirrors the authority taxonomy
   for operators.
3. `AGENTS.md` points to the guidance file without inlining the full policy.
4. The authority doc successor-boundary section is updated from the old
   combined `2-commit-policy` owner to the split ownership model: `2a`
   authority/guidance, `2b` validation/gates, `2c` Pairflow producer alignment,
   and `3-release-automation` release consumption.
5. `2b-commit-policy` can derive validator cases from the canonical matrix and
   structured rules without treating mirrored prose as a second source of truth.
6. `2c-commit-policy` can classify, defer, or align Pairflow commit producers,
   including adjacent producers such as `bubble extract --commit`, against the
   authority without reopening release-history semantics.
7. `3-release-automation` remains explicitly successor-owned for semver,
   changelog, tags, GitHub Releases, and npm publish.

## Verification Notes

1. Required for this docs-only task: document review for authority/guidance
   consistency.
2. Runtime validation commands are not required unless implementation expands
   beyond docs.

## Hardening Backlog

1. `later-hardening`: add richer examples to the guidance only if early users
   need them.
