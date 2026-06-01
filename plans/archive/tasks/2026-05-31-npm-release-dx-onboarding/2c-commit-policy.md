---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_commit_policy_lifecycle_v1
task_family_id: commit-policy
sequence_key: "2c"
task_id: 2c-commit-policy
title: "Pairflow Commit Producer and Lifecycle Compatibility"
status: archived
phase: phase2
target_files:
  - "src/v11/application/commit/commitCommandContract.ts"
  - "src/v11/application/commit/commitCommandApiContract.ts"
  - "src/v11/application/commit/internal/git/commitCommandGitStep.ts"
  - "src/v11/application/commit/internal/pipeline/commitCommandPipeline.ts"
  - "src/v11/application/commit/internal/finalization/commitCommandFinalization.ts"
  - "src/v11/defaults/commit/commitCommandDefaults.ts"
  - "src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts"
  - "src/v11/infrastructure/executor/ssh/sshBubbleCommitPayload.ts"
  - "src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.ts"
  - "src/v11/application/commit/remoteCommitContinuitySync.ts"
  - "src/v11/application/merge/internal/pipeline/localMergeStep.ts"
  - "src/v11/application/merge/internal/flow/mergeFlowFinalization.ts"
  - "src/v11/defaults/merge/mergeCommandDefaults.ts"
  - "src/v11/application/extract/internal/commit/extractCommit.ts"
  - "src/v11/application/extract/extractCommandContract.ts"
  - "src/cli/commands/bubble/commit.ts"
  - "src/cli/commands/bubble/merge.ts"
  - "src/cli/commands/bubble/extract.ts"
  - "tests/core/bubble/commitBubble.test.ts"
  - "tests/core/bubble/mergeBubble.test.ts"
  - "tests/cli/bubbleCommitCommand.test.ts"
  - "tests/cli/bubbleMergeCommand.test.ts"
  - "tests/cli/bubbleExtractCommand.test.ts"
  - "tests/cli/index.test.ts"
prd_ref: null
plan_ref: plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 2c-commit-policy-doc
impl_bubble_id: 2c-commit-policy-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-31-npm-release-dx-onboarding
---

# Task: Pairflow Commit Producer and Lifecycle Compatibility

## L0 - Policy

### Goal

Align Pairflow lifecycle commit producers and adjacent commit-producing flows
with the approved commit-message taxonomy from `2a` and the local validation
contract from `2b`, without changing release automation or weakening bubble
close safety.

### Domain / Control Model Summary

1. Business invariant: Pairflow lifecycle commands must not create new
   release-relevant commits whose first line is rejected by the repo-local
   commit policy.
2. Control model: `docs/commit-and-release-history-authority.md` owns message
   taxonomy; `tools/commit-policy/**` owns mechanical validation; Pairflow
   commit, merge, and extract command flows own when and how Git commits are
   created; release automation remains successor-owned by
   `3-release-automation`.
3. Read-path rule: runtime producer alignment reads message validity through
   the validator API from `tools/commit-policy/commitMessagePolicy.ts` or the
   same stable contract. It must not parse operator guidance prose as policy.
4. Forbidden fallback: do not accept or generate new `bubble(<id>): finalize`
   or `extract(<id>): ...` defaults as compatibility modes; do not infer
   release authority from branch names, PR titles, commit bodies, transcript
   prose, merge artifacts, or old historical commits.
5. Allowed resolution path: preserve explicit `--message` as the primary
   operator path, validate conventional messages before creating commits, reuse
   an already committed clean clone/worktree head when the existing content
   commit is the durable bubble result, and tolerate only configured merge
   header forms for integration commits.
6. Missing-data rule: when Pairflow cannot determine a valid conventional
   message for a new commit, it must fail closed with guidance to provide
   `--message` rather than falling back to a lifecycle finalize default.
7. Phase boundary:
   - contract closure: inherited from `2a` and `2b`, preserved here
   - producer closure: owned here for local/remote `bubble commit` and
     adjacent `bubble extract --commit`
   - internal execution closure: owned here only for commit-producing lifecycle
     paths
   - workflow/orchestration closure: owned here only for lifecycle compatibility
     with commit/merge/revert paths
   - read-model closure: successor-owned by `3-release-automation`
   - activation closure: hook activation already owned by `2b`; release
     activation remains successor-owned
   - cleanup/recovery closure: owned here only where merge/revert compatibility
     affects lifecycle commit/merge behavior

### Plan Linkage

1. Parent plan gap closed: Pairflow bubble lifecycle message compatibility and
   adjacent commit-producer alignment.
2. Depends on: `2b-commit-policy`.
3. Unlocks / impacts successors: unlocks `3-release-automation`; informs
   `4-docs-site-pages` release-semantics docs.
4. Task-list impact: refines planned `2c-commit-policy` from `not_created` to
   an approved document-refinement task when review passes.
5. Inherited validation / exit expectation: implementation must run
   `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, focused commit/
   lifecycle tests, broader affected suites, `pnpm test`, and `pnpm build`,
   unless a later bubble result records an explicit skipped-step reason.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/commit-and-release-history-authority.md`
   - `docs/commit-message-guidance.md`
   - `tools/commit-policy/commitMessagePolicy.ts`
   - `tools/commit-policy/validateCommitMessage.ts`
   - `src/v11/application/commit/internal/git/commitCommandGitStep.ts`
   - `src/v11/application/extract/internal/commit/extractCommit.ts`
   - `src/v11/application/merge/internal/pipeline/localMergeStep.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts`
2. Canonical elements: first-line-only classification, accepted conventional
   types, merge-header exception forms, standard/conventional revert recovery,
   rejection of new lifecycle finalize messages, and full-history release
   inheritance.
3. Guard elements: staged-file validation, safe branch movement, selected-path
   extract scope checks, and command state gates remain guards. They must not
   become alternate message-policy authority.
4. Compat-only elements: historical finalize commits and remote continuity
   import payloads may be read for existing lifecycle recovery, but they must
   not authorize creation of new invalid commit messages.
5. Forbidden reinterpretations: do not reopen first-parent-only release
   semantics; do not make `bubble(<id>): finalize` acceptable for newly
   created commits; do not broaden merge exceptions beyond the configured
   header prefixes; do not treat `bubble extract --commit` as exempt from the
   commit policy.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - local commit path:
     `src/v11/application/commit/internal/git/commitCommandGitStep.ts`
   - commit orchestration:
     `src/v11/application/commit/internal/pipeline/commitCommandPipeline.ts`
   - remote commit defaults and payload parsing:
     `src/v11/defaults/commit/commitCommandDefaults.ts`,
     `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts`,
     `src/v11/infrastructure/executor/ssh/sshBubbleCommitPayload.ts`
   - extract commit default:
     `src/v11/application/extract/internal/commit/extractCommit.ts`
   - merge command and tests via `rg` over `bubble merge`, `finalize`, and
     commit-policy surfaces.
   - remote continuity cleanup/sync helper:
     `src/v11/application/commit/remoteCommitContinuitySync.ts`
   - legacy CLI fixture coverage in `tests/cli/index.test.ts`, which may need
     fixture updates only if implementation changes shared remote commit
     presentation exercised there.
2. Actual touched scope: mixed `consumer_family_alignment` plus
   `fail_closed_hardening`, because existing producers must consume validator
   authority and fail closed instead of emitting invalid lifecycle defaults.
3. Mutation entrypoints in scope:
   - `pairflow bubble commit` local route
   - `pairflow bubble commit` remote routed route and continuity import
   - `pairflow bubble extract --commit`
   - `pairflow bubble merge` compatibility where merge commit first lines or
     merge result import surfaces are produced or validated
4. Hidden scope ruled out:
   - release automation config, changelog generation, npm publish, docs site,
     and UI lifecycle are successor tasks and not target files here.
   - `2b` validator taxonomy remains source authority and is not redefined.
5. Branch inventory note:
   - local staged changes with explicit valid message
   - local staged changes without message
   - local force-empty request
   - clean clone/worktree with existing committed content head
   - remote started commit execution
   - remote completion/continuity import
   - extract selected paths with and without explicit message
   - merge fast-forward and tolerated merge-commit paths
   - invalid explicit message failure
6. Why the declared task shape matches reality: the slice is producer alignment
   for one policy family. It touches multiple command paths only where they
   create or preserve Git commit messages under the same taxonomy and
   fail-closed invariant.
7. Document bubble source-code guard:
   - this document-refinement bubble may edit only task/spec/progress/docs
     artifacts.
   - `target_files`, implementation sketches, acceptance checks, and reviewer
     code findings in this artifact are planning context for a later
     implementation bubble; they do not authorize product/runtime/source,
     tests, UI, presenter, contract, or build/runtime config edits inside this
     document bubble.
   - if a requested outcome cannot be satisfied by document refinement alone,
     the correct result is blocker or route-back/replan, not source
     implementation.

### Refactor Classification

1. Classification: boundary_architecture.
2. Classification triggers: cross-layer command orchestration, public CLI
   behavior, remote execution parity, validation authority consumption, and
   lifecycle state/result semantics.
3. Preparatory modifier: no.

### Module Depth Check

1. Caller knowledge reduced:
   - `bubble commit`, remote commit dispatch, and extract commit code paths
     should not each know the full taxonomy regex or decide which lifecycle
     fallback message is acceptable.
   - Callers should ask one commit-message policy boundary whether a candidate
     first line is accepted, then branch on an explicit accepted/rejected
     result before Git side effects.
2. Interface stabilized:
   - Commit-producing flows receive either an accepted message, a no-new-commit
     reuse result, or a typed policy failure.
   - Downstream state/transcript/finalization code continues to consume the
     existing commit result shape only after the precondition passes.
3. Validation/ordering moved behind a boundary:
   - Message validation must occur before `git commit`, remote SSH commit
     dispatch, extract commit creation, and lifecycle success persistence.
   - The validator taxonomy stays in `tools/commit-policy/**`; lifecycle code
     may add a small adapter/helper but must not fork the taxonomy.
4. Test shape:
   - Core tests prove side-effect ordering and no-success-state writes for
     rejected local/remote commit messages.
   - CLI tests prove operator-facing guidance and extract behavior.
   - Existing validator tests remain the taxonomy proof; lifecycle tests prove
     consumption of that taxonomy.
5. Caller-knowledge reduction proof:
   - A future taxonomy change should update validator authority/tests first.
     Lifecycle producers should need only adapter/test updates for changed
     accepted/rejected outcomes, not duplicated parser rewrites in each command.

### Authority Boundary Map

1. Authority producer: `2a` docs and `2b` validator produce the approved
   message-policy authority before this task.
2. Stored authority: repository docs and `tools/commit-policy/**`.
3. In-scope consumers: Pairflow commit-producing lifecycle flows and their
   CLI/core tests.
4. Explicit out-of-scope consumers: release automation, docs site, npm publish,
   global skill install, UI service lifecycle, and historical commit rewriting.
5. Export surfaces closed in this phase: yes, only the existing public CLI
   behavior for `bubble commit`, `bubble merge`, and `bubble extract --commit`
   as needed for commit-policy compatibility.

### Authority Fan-out Scan

| Bucket | Status | Evidence / Boundary |
|---|---|---|
| `authority_producer` | present, out_of_scope | `2a` docs and `2b` validator are already archived authority; this task must not redefine classes, reason codes, or allowlists. |
| `persisted_authority` | absent | No schema, docs authority, or stored policy source is created here. |
| `internal_execution_consumers` | present | Local commit, remote commit, and extract commit consume the validator contract before Git commit side effects. |
| `workflow_orchestration_consumers` | present | Bubble close/commit/merge lifecycle consumers rely on the commit result and state transitions remaining ordered after validation. |
| `validator_gate_consumers` | present, preserved | Hooks/range validators from `2b` stay unchanged; this task may call the API but must not change taxonomy outputs. |
| `external_integration_consumers` | present, deferred | GitHub release/changelog/npm integrations consume the resulting history later in `3-release-automation`. |
| `read_model_consumers` | absent, deferred | Changelog and release notes read models are not implemented here. |
| `cleanup_recovery_consumers` | present | Revert and merge recovery compatibility is preserved only to the extent lifecycle commit/merge behavior touches it. |

### Closure-Budget Gate

| Closure Bucket | Current Task Closure | Evidence / Boundary |
|---|---|---|
| `authority_producer` | absent | No taxonomy or validator class/reason-code changes are allowed. |
| `shared_contract` | present, consume_only | The closed `2a`/`2b` contract is consumed through an adapter/helper; it is not rewritten. |
| `internal_execution_consumers` | present | Commit, remote commit, and extract commit producer paths are aligned. |
| `workflow_orchestration_consumers` | present | Lifecycle success state/transcript writes must remain after accepted commit proof. |
| `validator_gate_consumers` | absent | Hook/range activation remains as implemented in `2b`; this task does not change installed hooks. |
| `read_model_consumers` | absent | Release/changelog read models remain successor-owned. |
| `cleanup_recovery_consumers` | present, narrow | Merge/revert compatibility is preserved where existing lifecycle paths surface it; no new recovery model is added. |
| `external_integration_consumers` | absent | GitHub/npm release integration remains successor-owned. |

1. `split_required_triggered`: no.
2. High-risk no-split proof:
   - same bounded code path family: every in-scope path creates or preserves a
     Git commit message for Pairflow lifecycle/admin output;
   - same invariant: accepted first line before new commit side effects;
   - same proof surface: CLI/core tests around message acceptance, no-side-
     effect failure, and unchanged lifecycle state ordering;
   - no separate reviewer loop: commit, remote commit, and extract failures all
     reduce to the same policy precondition and do not require separate release
     interpretation;
   - merge compatibility is conditional and does not authorize broad merge
     runtime rewrites.
3. Intentionally collapsed closures: producer alignment plus fail-closed
   side-effect ordering. They are collapsed because invalid-message handling is
   meaningful only at the producer precondition boundary.
4. Explicitly deferred closures: release automation, docs site, historical
   history rewrite, UI lifecycle, skill install, and new lifecycle states.

### Baseline Preservation

1. Must-preserve behaviors:
   - `pairflow bubble commit` remains allowed only from
     `APPROVED_FOR_COMMIT`.
   - `--stage-all` remains the explicit stage-all path.
   - staged-path safety and clone source-branch sync protections remain intact.
   - remote commit stays laptop-routed unless already executing inside the
     verified remote clone context.
   - `pairflow bubble merge` remains the lifecycle merge path; merge commits
     remain integration artifacts, not release authority.
   - `bubble extract --commit` remains available as one command; the policy
     change must not force operators to perform manual Git steps for ordinary
     selected-artifact extraction.
2. Allowed resolution paths:
   - explicit valid conventional `--message`
   - deterministic valid conventional default for extract commit only, using
     `docs(extract): copy selected ideation artifacts`, unless implementation
     discovers a concrete blocker and routes back before changing behavior
   - clean already-committed bubble branch head reuse when no new commit is
     needed
   - configured merge-header exception forms for merge commits
3. Forbidden regression interpretations:
   - removing clone retry/continuity behavior to simplify message validation
   - accepting finalize defaults when hooks would reject them
   - rejecting valid merge/revert recovery forms that `2b` accepts
   - treating extract commits as outside the commit policy
4. Replacement proof required if removed: any removed finalize-default path
   must have a tested replacement path that either validates an explicit
   conventional message, reuses an existing valid committed head, or fails
   closed before side effects.
5. Explicit no-default decision for lifecycle commit: `pairflow bubble commit`
   must not introduce a new automatic lifecycle content-message default in this
   task. For any new local or remote lifecycle commit, the accepted message
   source is explicit `--message`; clean-head reuse/import remains the
   no-new-commit path.

### Success / Completion Proof Boundary

1. Current canonical success proof source: lifecycle commit/merge commands
   report Git commit SHAs, state snapshots, transcript envelopes, and result
   payloads.
2. Target canonical success proof source: the same lifecycle result surfaces,
   plus proof that newly created commit messages are accepted by the
   repo-local commit policy or that no new commit was created because a clean
   committed head was reused.
3. Current canonical completion proof source: bubble state transitions to
   `DONE` after commit and merge cleanup after merge.
4. Target canonical completion proof source: unchanged lifecycle state proof,
   with commit-message validity enforced before any new commit side effect.
5. Reused proof contract: existing cleanup/delete/reconcile contracts from
   `UsePairflow.CloseBubble` and commit/merge command state transitions.
6. Proof-parity rule: inherit_full_parity.
7. Final truth surfaces affected: commit result `commitMessage`,
   transcript commit envelope, remote commit payload, extract commit result
   `message`, and merge result presentation only where it exposes merge commit
   messages.
8. Mixed-truth surfaces allowed: remote continuity import may carry historical
   commit messages as compatibility evidence, but new remote commit creation
   must use the same validation policy as local creation.
9. Failure truth surfaces affected: command failure objects/errors and CLI
   text must expose policy failure distinctly from Git failure, with guidance
   pointing to `docs/commit-message-guidance.md`.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: consumer_family_alignment.
2. Secondary shape: fail_closed_hardening, because producer paths must reject
   invalid/missing messages before Git commit side effects.
3. Preconditions that must pass before side effects:
   - lifecycle state gate (`APPROVED_FOR_COMMIT` for bubble commit)
   - staged/selected path scope checks
   - message classification accepted for any new commit
   - remote started pointer and continuity context checks for remote commit
   - selected extract path transfer/staging checks before extract commit
4. Side effects forbidden before preconditions pass:
   - `git commit`
   - force-empty commit creation
   - remote commit execution
   - remote SSH commit dispatch for a new commit
   - extract commit creation
   - state transition or transcript append that claims commit success
5. Invalid/precondition-failure behavior: zero new Git commit side effects for
   invalid or missing commit messages; existing state/transcript must not claim
   commit completion.
6. Coordination primitives in scope: no new locks or leases; preserve existing
   remote and clone sync safety.

### In Scope

1. Replace or remove default lifecycle finalize message creation in
   `pairflow bubble commit`.
2. Validate explicit and derived commit messages against the approved
   commit-message policy before local and remote commit creation.
3. Preserve clean committed-head reuse for clone/worktree close paths where no
   new commit is needed.
4. Align remote commit execution and continuity import with the same message
   contract without breaking laptop-routed remote lifecycle commands.
5. Align `bubble extract --commit` default/explicit message behavior with the
   accepted taxonomy.
6. Preserve merge/revert compatibility with accepted merge-header and revert
   recovery classes.
7. Add or update focused tests for local commit, remote commit, extract
   commit, merge compatibility, invalid-message fail-closed behavior, and
   no-side-effect guarantees. Commit lifecycle parity requires CLI and core
   proof; extract commit proof is CLI-first because the current repository has
   `tests/cli/bubbleExtractCommand.test.ts` and no separate core extract suite.
8. Update CLI help text for `bubble commit` so `--message` is described as
   required whenever a new lifecycle commit will be created, and `--force` is
   no longer described as creating an empty finalize commit.
9. Update any legacy test fixtures or expected transcript payloads that assert
   new finalize commits, while preserving fixtures that intentionally represent
   already existing historical import/compatibility payloads.

### Out of Scope

1. Changelog generation, semver bumping, release tags, GitHub Releases, and npm
   publishing.
2. Rewriting or revalidating historical commits.
3. Broadening the validator taxonomy or editing commit-message authority docs
   except for narrow clarifications required by implementation reality.
4. New Pairflow lifecycle states, new bubble close order, or new merge strategy
   unrelated to commit-message compatibility.
5. Docs site and onboarding pages.
6. UI lifecycle work.

### Safety Defaults

1. Prefer explicit conventional `--message` over heuristic derivation.
2. When no valid message is available for a new commit, fail closed before
   running `git commit`.
3. Preserve existing lifecycle state gates and staged-path safety checks.
4. Treat remote and local commit producer behavior as parity requirements
   unless a remote path is explicitly compatibility-only import of already
   committed history.

### Capability Closure

| Capability Claim | Closure Classification | Activation Trigger / Entrypoint | Config Owner / Boundary | Success / Failure Output Contract | Last-Mile Proof |
|---|---|---|---|---|---|
| `pairflow bubble commit` no longer creates new invalid lifecycle finalize commits. | end_to_end | Operator or close workflow runs `pairflow bubble commit --id <id> [--message ...] [--stage-all]`. | Repo owns command behavior; operator/close workflow owns providing an explicit message when needed. | Success returns existing commit result after accepted message or safe reuse; failure returns message-policy reason before Git commit/state success. | Core and CLI commit tests plus build. |
| Remote `pairflow bubble commit` follows the same message precondition for new commits. | end_to_end | Laptop-routed remote commit or verified remote inner commit execution. | Repo owns local pre-dispatch validation and remote inner guard; remote executor owns transport only. | Invalid/missing message fails before SSH commit dispatch when local context has the candidate; remote inner command also rejects before Git commit as defense in depth. | Remote commit tests/payload tests. |
| `pairflow bubble extract --commit` uses accepted commit messages. | end_to_end | Operator runs `pairflow bubble extract --commit [--message ...]`. | Repo owns deterministic default or explicit-message validation; operator owns path selection. | Success creates selected-scope commit with accepted message; invalid explicit message returns extract policy failure before commit. | Extract CLI tests, with core tests added only if implementation introduces or exposes a separate core extract test harness. |
| Merge/revert compatibility remains bounded to accepted taxonomy classes. | foundation_only | Existing merge/revert lifecycle or tests encounter merge/revert first lines. | Validator authority owns accepted forms; merge command owns integration only. | Merge commits are tolerated integration artifacts, not release authority. | Existing validator tests plus merge tests only if merge runtime changes. |

### Scoped Invariants

| Invariant | Applies To | Does Not Apply To | Proof Surface | Deferred / External Surfaces | Reviewer Non-Goals |
|---|---|---|---|---|---|
| New Pairflow-created commits use accepted first lines. | `bubble commit`, remote commit, `bubble extract --commit`. | Existing historical commits and already imported remote completion history. | Unit/CLI tests for valid, invalid, missing, and explicit messages. | Release automation in `3-release-automation`. | Do not require historical rewrite. |
| Invalid messages have zero commit side effects. | Local commit, remote commit dispatch, extract commit. | Merge conflict recovery after a valid commit exists. | Tests assert no commit/state success after rejected message. | Broader recovery UX. | Do not require new lock primitives. |
| Merge commits stay integration artifacts. | `bubble merge` local/remote result paths. | Semver/changelog calculation. | Tests/documented accepted merge headers and unchanged release-authority boundary. | `3-release-automation`. | Do not implement release traversal here. |
| Reuse of committed clean head remains allowed. | Clean bubble branch/clone retry paths with existing content commits. | New uncommitted changes. | Core commit tests for no new finalize commit. | None. | Do not force empty commits for ceremony. |

### Review Scope Fence

| Edge-Case Family | Why Not Required Now | Safe Current Behavior | If Discovered During Review | Route |
|---|---|---|---|---|
| Exact release-range traversal | Owned by `3-release-automation`. | Full-history strategy is documented but not automated. | Record as successor requirement. | follow_up |
| Historical invalid commits in repo history | Existing history is not rewritten by policy. | Validator applies only to new checked commits/safe ranges. | Do not block this task for old history. | accepted_limitation |
| Docs site release wording | Owned by `4-docs-site-pages`. | Operator guidance already exists. | Create docs-site follow-up if needed. | follow_up |
| Non-GitHub merge message variants | Authority accepts only configured prefixes. | Unknown variants fail validation or require refinement. | Route to policy refinement, not local exception. | route_back_to_plan |

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: yes.
2. Impacted contracts: public CLI behavior for `pairflow bubble commit`,
   `pairflow bubble extract --commit`, and lifecycle merge compatibility;
   internal result/payload contracts for commit messages and remote continuity.

### Gate Detail Budget

| Gate | Detail Level | Evidence / Reason |
|---|---|---|
| Control-Model Readiness Gate | triggered_split_or_contract_risk | Commit-message authority, lifecycle producer behavior, and release successor semantics are separate authorities. |
| Closed-Contract Drift Check | triggered_split_or_contract_risk | This task consumes the closed `2a`/`2b` taxonomy and must not reinterpret it. |
| Bounded-Task-Shape Gate | triggered_split_or_contract_risk | Multiple producer paths are aligned only because they consume one policy family. |
| Refactoring Guidance Gate | triggered_split_or_contract_risk | Cross-layer command orchestration and remote parity are touched. |
| Contract-Dense Task Gate | triggered_split_or_contract_risk | Structured message classes, result payloads, fallback/fail-closed behavior, and downstream consumers are mirrored. |

### Complexity Risk Gate

1. `authority_risk`: 1
2. `surface_spread`: 2
3. `identity_join_risk`: 0
4. `activation_coupling`: 1
5. `prerequisite_risk`: 0
6. `acceptance_multiplicity`: 2
7. `risk_score`: 6
8. `single-task allowed`: yes
9. If no, required split: N/A
10. Identity/join note:
    - canonical identity path: command message first line classified by
      `tools/commit-policy` policy.
    - competing identifiers or fallback identities: bubble id, branch name,
      transcript refs, and historical commit messages are not message policy
      identity.
11. Authority/source-of-truth note:
    - canonical source: `docs/commit-and-release-history-authority.md` plus
      `tools/commit-policy/commitMessagePolicy.ts`.
    - forbidden secondary sources: guidance prose parsing, branch names,
      bodies, footers, PR titles, old finalize commits.
12. Closure-budget triage:
    - closure buckets touched: consumer-family alignment, fail-closed
      hardening, public CLI behavior.
    - intentionally collapsed closures: local/remote commit and extract commit
      producers, because all are one commit-message producer family and share
      the same validation/fail-closed contract.
    - explicitly deferred closures: release automation, docs site, historical
      rewrite, UI lifecycle, skill install.
13. Bounded-task-shape decision:
    - primary shape: consumer_family_alignment
    - secondary shape: fail_closed_hardening
    - decomposed closures: validator consumption, message derivation/removal,
      side-effect precondition ordering, result payload parity, tests.
    - adjacent call-site/consumer-family scan: present with local/remote
      commit, extract commit, merge, hooks, release automation, and docs.
    - why this bounded mix is safe: it is limited to one taxonomy consumer
      family and forbids unrelated release/read-model activation.
14. Scoped-invariant decision:
    - gate triggered: yes
    - scoped invariant records: `Scoped Invariants`
    - unbounded invariant route-back: no
15. Review-scope-fence decision:
    - fence needed: yes
    - fenced families: release traversal, historical history, docs site,
      non-GitHub merge variants
    - invalid fence route-back: no
16. Contract-dense decision:
    - gate triggered: yes
    - trigger reasons: API/result shape, structured payload, fallback/
      precedence, split ownership, downstream consumers, mirrored surfaces
    - canonical matrix source: `L1 - Canonical Producer Compatibility Matrix`
    - mirrored surfaces: L0 control model, baseline preservation,
      precondition boundary, acceptance criteria, tests

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Pairflow must not create new invalid lifecycle commit messages. | Every new Git commit producer validates or derives an accepted first line before side effects. | P1 | required-now |
| Control model | Docs/validator own taxonomy; command flows own commit creation timing. | Runtime code imports/uses the validator contract, not guidance prose. | P1 | required-now |
| Read-path rule | Message policy comes from `tools/commit-policy`. | Do not duplicate regexes in lifecycle code unless wrapped behind a shared helper using the same source. | P1 | required-now |
| Forbidden fallback | Bubble id, branch name, transcript text, and old finalize defaults are not valid message fallbacks. | Missing/invalid message fails before `git commit`. | P1 | required-now |
| Allowed resolution path | Explicit valid lifecycle commit message, deterministic valid extract default, or clean committed-head reuse. | Implement and test each supported branch without adding a new lifecycle commit fallback message. | P1 | required-now |
| Missing-data rule | No valid message means no new commit. | Return a typed failure with guidance to provide `--message`. | P1 | required-now |
| Phase boundary | Producer alignment only. | Do not implement release automation or docs site in this task. | P2 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Accepted conventional classes | `docs/commit-and-release-history-authority.md`, `tools/commit-policy/commitMessagePolicy.ts` | Exact existing allowlist and reason codes remain authoritative. | preserve | P1 | required-now |
| Merge artifact exception | Authority docs and validator tests | Only configured header prefixes are tolerated. | preserve | P1 | required-now |
| Historical finalize | Authority docs and validator tests | Historical-only, rejected for new validation. | preserve | P1 | required-now |
| Full-history release inheritance | Authority docs | Successor release automation must see content commits; this task must not narrow strategy. | preserve | P2 | required-now |

### Canonical Producer Compatibility Matrix

| Producer / Flow | Current Risk | Required Behavior | Message Source | Side-Effect Rule | Result / Test Proof |
|---|---|---|---|---|---|
| Local `pairflow bubble commit` with staged files | Defaults to `bubble(<id>): finalize` when no message is provided. | Reject missing/invalid message; do not introduce a replacement lifecycle default. | explicit `--message` only. | No `git commit`, state write, or transcript success before message acceptance. | Core and CLI tests cover accepted, missing, and invalid messages. |
| Local force-empty commit | Can create an empty finalize commit. | Require explicit accepted message for any forced empty commit. | explicit `--message`. | No empty commit before message acceptance. | Core tests cover fail-closed and accepted force-empty branches. |
| Clean committed bubble head reuse | Existing content commit may already be the real work. | Reuse clean committed head when existing logic proves it is safe; do not create ceremony commit. If the reused head first line is rejected, report compatibility evidence and do not create a replacement commit automatically. | existing Git commit first line is evidence, not a new message source. | No new commit side effect; no release authority is inferred from a rejected reused historical head. | Core tests prove no new finalize commit is created and document valid/rejected reuse behavior. |
| Remote `bubble commit` | Remote command may create or import finalize messages. | New remote commit creation follows the same accepted-message precondition; imported already-completed remote history is compatibility evidence, not new validation authority. | explicit accepted message for new remote commit; imported payload for already completed remote route. | Remote SSH commit dispatch counts as a side effect. Local routed command must reject invalid/missing messages before dispatch when creating a new remote commit; remote inner command must also reject before Git commit. | Remote command/payload tests cover parity and import compatibility. |
| `bubble extract --commit` | Default is `extract(<id>): copy selected ideation artifacts`, outside the accepted taxonomy. | Use accepted deterministic default `docs(extract): copy selected ideation artifacts`; validate explicit messages. | explicit `--message` or accepted deterministic extract default. | No extract commit before selected-path and message preconditions pass. | CLI tests cover default, explicit, and invalid messages; add core tests only if a separate core extract suite is created by the implementation. |
| `bubble merge` | Merge commits are integration artifacts. | Preserve fast-forward preference and tolerate only configured merge header forms when merge commit is required. | Git merge header, not release content. | Do not use merge message as semver/changelog authority. | Merge tests cover accepted header/result compatibility. |
| Revert recovery | Recovery commits may be standard or conventional reverts. | Preserve acceptance of standard/conventional revert messages when lifecycle or tests encounter them. | validator policy. | No lifecycle producer-specific exception beyond validator. | Validator and lifecycle tests cover accepted recovery where relevant. |

### Ownership and Deferred Semantics

1. This task owns message-policy consumption in Pairflow commit-producing
   command paths. It does not own the taxonomy itself.
2. `tools/commit-policy/**` may be imported or wrapped, but accepted classes,
   rejected classes, reason-code names, and allowed conventional types must not
   change here.
3. Local and remote new-commit creation share one semantic rule: no new Git
   commit side effect occurs until the candidate first line is accepted.
4. Remote already-completed import is compatibility evidence. It may carry a
   historical invalid message, but it must not cause a new invalid commit or
   broaden validation for future commits.
5. Clean committed-head reuse is no-new-commit completion. It preserves the
   existing branch head and reports its message; it does not infer release
   authority from an invalid historical message.
6. Merge commits remain integration artifacts. This task may preserve or test
   accepted merge-header compatibility, but release automation owns semantic
   traversal later.

### Structured Contract Rules

1. Validator taxonomy rule: lifecycle code must consume the existing
   `CommitMessagePolicyResult` accepted/rejected status and must not add new
   taxonomy classes or reason codes.
2. Commit policy failure rule: local/remote `bubble commit` policy failures use
   `COMMIT_MESSAGE_POLICY_REJECTED` for rejected explicit messages and
   `COMMIT_MESSAGE_REQUIRED` for missing messages where a new commit would be
   created.
3. Extract policy failure rule: `bubble extract --commit` policy failures use
   extract-specific failure reasons, not generic Git failure:
   `EXTRACT_COMMIT_MESSAGE_POLICY_REJECTED` for rejected explicit messages.
   `EXTRACT_COMMIT_MESSAGE_REQUIRED` is reserved only for a route-back-approved
   future contract that removes the deterministic extract default.
4. Remote dispatch rule: SSH remote commit dispatch is a side effect. The local
   routed command must reject invalid/missing messages before dispatch for new
   remote commits, and the remote inner command must enforce the same rule
   before Git commit as defense in depth.
5. State persistence rule: transcript append, `DONE` state writes, remote sync
   success, and commit result payloads may occur only after an accepted new
   commit or safe no-new-commit reuse/import result.
6. Merge compatibility rule: merge first lines are accepted only through the
   existing validator merge-artifact class. No lifecycle-specific merge-message
   exception is added.

### Mirrored Surface Checklist

| Contract Element | Mirrored In | Required Alignment |
|---|---|---|
| Accepted/rejected first-line taxonomy | L0 control model, Producer Compatibility Matrix, Functional Requirements, tests | Must stay subordinate to `2b` validator API and tests. |
| Missing/invalid message side-effect ordering | Precondition boundary, Failure/Error Contract, Acceptance Criteria | Must say no Git commit/state success before accepted message. |
| Remote dispatch as side effect | Producer matrix, Functional Requirements, Structured Contract Rules | Must require local pre-dispatch rejection plus remote inner guard. |
| Clean-head reuse semantics | Baseline Preservation, Producer matrix, Acceptance Criteria | Must say no new commit and no automatic release-authority inference. |
| Extract failure reasons | Structured Contract Rules, Failure/Error Contract, Testing Requirements | Must distinguish policy failure from Git failure. |
| Merge artifact boundary | Canonical anchors, Producer matrix, Scoped Invariants | Must remain integration-only and successor release-owned. |

### Policy Failure Result Matrix

| Flow | Missing Message For New Commit | Rejected Explicit Message | Accepted Message | No-New-Commit Reuse / Import |
|---|---|---|---|---|
| Local `bubble commit` | `COMMIT_MESSAGE_REQUIRED`; no Git commit, no state success. | `COMMIT_MESSAGE_POLICY_REJECTED`; no Git commit, no state success. | Existing success result with accepted `commitMessage`. | Existing reusable-head result; no new commit. |
| Remote routed `bubble commit` | `COMMIT_MESSAGE_REQUIRED` before SSH commit dispatch. | `COMMIT_MESSAGE_POLICY_REJECTED` before SSH commit dispatch. | Remote command executes and returns existing success payload. | Remote already-completed import may sync compatibility payload without creating a new commit. |
| Remote inner `bubble commit` | Same as local route before remote Git commit. | Same as local route before remote Git commit. | Existing success payload. | N/A unless already-completed import path is used by local route. |
| `bubble extract --commit` | Use accepted deterministic default `docs(extract): copy selected ideation artifacts`; no missing-message failure expected unless implementation routes back with a blocker before changing behavior. | `EXTRACT_COMMIT_MESSAGE_POLICY_REJECTED`; no Git commit. | Existing extract success with accepted message. | N/A. |

### 1) Functional Requirements

1. `pairflow bubble commit --message <text>` must reject messages classified as
   rejected by `classifyCommitMessage` before running `git commit`.
2. `pairflow bubble commit` without `--message` must no longer create
   `bubble(<id>): finalize` for staged changes.
3. `pairflow bubble commit --force` must require an explicit accepted
   conventional message before creating an empty commit.
4. Existing committed clean-head reuse must remain available when no staged
   files exist and the existing logic proves a reusable bubble head.
5. Remote commit execution must not create a new invalid finalize commit by
   default. For new remote commit creation, the local routed command must fail
   before remote SSH commit dispatch when no accepted message is available, and
   the remote inner command must also reject before Git commit as defense in
   depth.
6. Remote continuity import may preserve already completed historical payloads,
   but new tests must distinguish import compatibility from new commit
   creation.
7. `bubble extract --commit` must use accepted deterministic conventional
   default `docs(extract): copy selected ideation artifacts` when no
   `--message` is provided; explicit invalid messages must fail before Git
   commit.
8. `bubble merge` must preserve fast-forward behavior and keep merge commits
   within the accepted merge-header exception forms when a merge commit is
   created.
9. If implementation discovers that an explicit-message-only extract contract
   is materially safer than preserving a deterministic default, it must stop
   and route back to the plan/task instead of silently changing this contract.

### 2) Failure / Error Contract

1. Invalid or missing commit message failures must use the reason codes in
   `Policy Failure Result Matrix`, or implementation-equivalent names updated
   in this task before approval. They must be distinguishable from Git failures.
2. Failure output must point operators to `docs/commit-message-guidance.md` or
   the same guidance text used by `2b`.
3. No failure branch may append a commit-success envelope, write `DONE` state,
   sync remote completion as successful, or report a commit SHA unless an
   accepted message was used or an already-committed clean head was reused.
4. If remote parity cannot be proven for a path, fail closed and record the
   unsupported branch rather than accepting finalize compatibility.

### 3) Testing Requirements

1. Add or update core tests for:
   - accepted explicit commit message creates a commit,
   - missing message with staged files fails before commit,
   - invalid finalize message fails before commit,
   - force-empty without accepted message fails,
   - clean committed-head reuse does not create a new finalize commit,
   - remote commit creation parity for accepted/missing/invalid messages.
2. Add or update CLI tests for:
   - help text describes `--message` and accepted-message requirement for new
     lifecycle commits,
   - invalid message output is actionable,
   - `--force` help no longer says it creates an empty finalize commit,
   - extract commit default/explicit/invalid branches.
   Existing extract coverage is CLI-first; do not invent a separate core
   extract suite solely for symmetry unless implementation creates a reusable
   core extract testing boundary.
3. Add merge compatibility tests only where implementation touches merge
   message behavior or result presentation; otherwise cite existing validator
   tests as the merge-header proof and leave merge runtime unchanged.
4. Run focused tests before broad verification:
   - `pnpm vitest tests/core/bubble/commitBubble.test.ts`
   - `pnpm vitest tests/cli/bubbleCommitCommand.test.ts`
   - `pnpm vitest tests/cli/bubbleExtractCommand.test.ts`
   - `pnpm vitest tests/cli/index.test.ts` if shared CLI fixture expectations
     are updated
   - merge-focused tests if merge code changes

### L2 - Acceptance Criteria

1. New `pairflow bubble commit` Git commits are never created with
   `bubble(<id>): finalize` unless the command is reading an already existing
   historical commit as compatibility evidence.
2. Missing or invalid messages fail before Git commit side effects and before
   lifecycle success state/transcript writes.
3. Explicit accepted conventional messages work for local and remote commit
   producers.
4. Clean already-committed bubble branch/head reuse remains supported and does
   not create an extra ceremony commit.
5. `bubble extract --commit` produces accepted conventional commit message
   `docs(extract): copy selected ideation artifacts` by default, accepts valid
   explicit messages, and rejects invalid explicit messages before commit side
   effects.
6. Merge commit compatibility remains limited to the configured merge-header
   exception forms; merge commits are not release authority.
7. The implementation does not modify release automation, changelog behavior,
   npm publish workflow, docs site, skill install, or UI lifecycle.
8. Verification evidence includes typecheck, lint, fitness, focused affected
   tests, broader affected tests, full test suite, and build, or exact skipped
   reasons.
