# LLM Document Workflow v1

Status: draft
Date: 2026-03-04

## Purpose

This workflow defines how to create PRDs, plans, and task files so:
1. docs stay implementable for LLMs,
2. review loops do not become infinite,
3. teams can keep repo-specific writing style while following one minimal contract.

## Artifact Topology

Default topology for medium/large work:
1. PRD file: `docs/prd/<feature>-prd.md`
2. Plan file: `plans/<feature>-plan.md` (must reference PRD)
3. Task files: `plans/tasks/<feature>/<phase>-<slug>.md` (must reference PRD and Plan)

Small standalone change (bugfix/small task):
1. One task file only, with `prd_ref: null` and `plan_ref: null`.

Contract-boundary override (mandatory):
1. If the change modifies DB/API/event/auth/config contract, task-only is not enough.
2. Minimum chain becomes `Plan -> Task` (`plan_ref` must be non-null).
3. For large/new-app scope, keep `PRD -> Plan -> Task`.

## Required Frontmatter Contract

Every task file must contain:
1. `artifact_type: task`
2. `artifact_id`
3. `status`
4. `prd_ref` (path or `null`)
5. `plan_ref` (path or `null`)
6. `system_context_ref` (path or `null`)
7. `phase` (string)

## Task Structure (Single Source of Truth)

Each task has one source-of-truth file with this order:
1. `L0 - Policy` (goal/scope/out-of-scope/safety defaults)
2. `L1 - Change Contract` (must-have implementation contract)
3. `L2 - Implementation Notes` (optional hardening only)

Rule: only `L1` blocker items can block implementation.

## Reviewer Focus Authoring Contract (Phase 1)

Reviewer Focus must be authored in one canonical place so runtime bridge is deterministic:
1. Preferred source: frontmatter `reviewer_focus`.
2. Fallback source: first `## Reviewer Focus` or `### Reviewer Focus` section.
3. If both are present, frontmatter wins by design.
4. Section heading matcher is strict after heading marker removal:
   - trim + collapse internal whitespace + case-insensitive compare to `reviewer focus`,
   - variants like `Reviewer Focus (Optional)` and `**Reviewer Focus**` are not matched.
5. Allowed frontmatter value forms:
   - non-empty string,
   - non-empty list of strings.
6. Block-scalar frontmatter (`reviewer_focus: |` or `reviewer_focus: >`) is supported with line-preserving normalization in Phase 1 parser behavior.
7. If frontmatter parsing fails (for example unclosed `---` fence), extraction returns invalid frontmatter parse warning and does not fall back to section parsing in that pass (fail-open, no startup bridge injection).
8. Unexpected extraction parse warnings are represented as invalid reviewer-focus status for diagnostics, while runtime flow remains fail-open.
9. Empty or invalid focus content is fail-open (bubble flow continues), but reviewer startup bridge is not injected for that task.

## Review Policy

Every review finding must include:
1. `priority`: `P0|P1|P2|P3`
2. `timing`: `required-now|later-hardening`
3. `layer`: `L1|L2`
4. `evidence`: repro, failing output, or precise code-path proof

Round policy:
1. Max 2 L1 hardening rounds.
2. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
3. Other findings move to `later-hardening`.

Spec lock:
1. If all `P0/P1 + required-now` are closed, task state is `IMPLEMENTABLE`.

## Roles and Order

1. Engineer
   - creates/updates PRD/Plan/Task docs,
   - chooses explicit bubble ownership type (`document` or `code`) at creation time,
   - commits doc artifacts on `main`,
   - starts bubble from committed task.
2. Implementer agent
   - implements against L1 contract.
3. Reviewer agent
   - tags findings with required fields,
   - keeps blocker boundary (`P0/P1`) strict.
4. Engineer
   - responds in `WAITING_HUMAN`,
   - decides approve/rework in `READY_FOR_APPROVAL`,
   - closes bubble.

## Pairflow Lifecycle Command Order

Pre-flight:
```bash
git status --short
```

Create/start:
```bash
pairflow bubble create --id <id> --repo <abs_repo_path> --base main --review-artifact-type <document|code> --task-file <abs_task_path>
pairflow bubble start --id <id> --repo <abs_repo_path> --attach
pairflow bubble status --id <id> --repo <abs_repo_path> --json
```

`pairflow bubble create` requires `--review-artifact-type <document|code>`.
`auto` is not available as a create-time ownership option.

Human intervention:
```bash
pairflow bubble reply --id <id> --repo <abs_repo_path> --message "<message>"
pairflow bubble request-rework --id <id> --repo <abs_repo_path> --message "<message>"
pairflow bubble approve --id <id> --repo <abs_repo_path>
```

Close:
```bash
pairflow bubble commit --id <id> --repo <abs_repo_path> --auto
pairflow bubble merge --id <id> --repo <abs_repo_path>
```

## Evidence Ref Policy (Phase 1)

Command verificationhez csak whitelistelt log refeket adj:
1. Elfogadott minta: `.pairflow/evidence/<single-segment>.log`
2. Elfogadott minták példái:
   - `--ref .pairflow/evidence/lint.log`
   - `--ref /abs/path/to/worktree/.pairflow/evidence/test.log#L1`
3. Nem elfogadott:
   - nested path (`.pairflow/evidence/subdir/test.log`)
   - nem `.log` kiterjesztés (`.pairflow/evidence/test.txt`)
   - artifact/prose ref (`done-package.md`, `reviewer-test-verification.json`)
   - URL/protocol ref (`https://...`)

## Docs-Only Operational Decision Matrix (Phase 1)

Source of truth:
1. `plans/tasks/doc-only-issues/doc-only-operational-decision-matrix-and-rollout-phase1.md`
2. Ez a szekcio operational kivonat; konfliktus eseten a fenti task file az elsoseges.

| Scenario | Runtime check requirement | Claim policy | Evidence policy | Summary wording |
|---|---|---|---|---|
| docs-only + no runtime claim | not required | tilos pozitiv test/typecheck/lint pass claim | nincs extra evidence requirement | kotelezo explicit docs-only formula |
| docs-only + explicit runtime claim | required for that claim | claim csak trusted verifier mellett engedett | claimhez whitelistelt evidence ref kotelezo | claim szovegnek konzisztensnek kell lennie a verifier statusszal |
| code/auto bubble | existing policy unchanged | existing policy applies | existing policy applies | existing policy applies |

Standard docs-only no-claim wording:
1. `docs-only scope, runtime checks not required in this round`

Disallowed docs-only wording:
1. Evidence nelkuli vagy untrusted verifier melletti pozitiv runtime pass claim (`tests pass`, `typecheck clean`, `lint clean`).

## Docs-Only Rollout Gates (Phase 1 / P1-2)

Preconditions:
1. P0/1 aktiv: docs-only runtime check requirement temporary disable.
2. P0/2 aktiv: summary-verifier consistency gate.
3. P1/1 aktiv: evidence source whitelist.

Baseline contract (required before rollout-on):
| Field | Definition |
|---|---|
| `baseline_window` | `2` completed, consecutive weekly observation windows immediately before rollout activation. |
| `baseline_source` | `pairflow bubble status --json` history snapshot, reviewer artifacts + summary audit, rework decision logs + bubble decision trail. |
| `baseline_snapshot_ts` | ISO-8601 UTC timestamp when the baseline snapshot is frozen. |
| `baseline_owner` | Named owner accountable for baseline capture and approval (must be populated before rollout go-live). |

Baseline aggregation and metric identity rule (must match rollout plan wording):
1. `baseline(metric_id, baseline_window, baseline_source, baseline_snapshot_ts, baseline_owner)` = arithmetic mean of weekly metric values across the `baseline_window` completed consecutive observation windows from `baseline_source`, frozen at `baseline_snapshot_ts`, approved by `baseline_owner`.
2. `false_blocker_ratio(window) := docs_only_evidence_rework_ratio(window)` (pure alias; no independent computation stream).

Rollout action:
1. Operational matrix + summary wording contract publikacio.
2. Reviewer/orchestrator kommunikacio matrix-szabaly szerinti frissitese.
3. P1/2 rollout plan Step 4 szinkronizalasa ugyanarra a source-of-truth task dokumentumra.
4. Metrika-kovetes inditasa explicit source + weekly cadence mellett (`docs_only_round_count_avg`, `summary_verifier_mismatch_count`, `docs_only_evidence_rework_ratio`, `false_blocker_ratio`).
5. Freeze baseline contract inputs before rollout go-live (`baseline_window`, `baseline_source`, `baseline_snapshot_ts`, `baseline_owner`).

Exit criteria:
1. Workflow doc and rollout plan both reference the same P1/2 matrix source-of-truth.
2. Metrics registry is active (minimum one weekly measured window recorded).
3. No policy ambiguity remains between docs-only and code/auto paths in team guidance text.

Metrics source/cadence extract (intentional subset for operational quick-reference):
| metric_id | Source | Cadence |
|---|---|---|
| `docs_only_round_count_avg` | `pairflow bubble status --json` history snapshot | weekly |
| `summary_verifier_mismatch_count` | reviewer artifacts + summary audit | weekly |
| `docs_only_evidence_rework_ratio` | rework decision logs + bubble decision trail | weekly |
| `false_blocker_ratio` | rework decision logs + bubble decision trail (`Phase 1` operational alias: `docs_only_evidence_rework_ratio`) | weekly |

Rollback trigger:
1. In two consecutive weekly observation windows:
   `summary_verifier_mismatch_count(current_week) >= baseline(summary_verifier_mismatch_count, baseline_window, baseline_source, baseline_snapshot_ts, baseline_owner) + 1`.
2. In one weekly observation window:
   `false_blocker_ratio(current_week) >= baseline(false_blocker_ratio, baseline_window, baseline_source, baseline_snapshot_ts, baseline_owner) + 0.10`.

Threshold semantics (must match rollout plan wording):
1. `+1` means absolute event-count delta.
2. `+0.10` means absolute ratio delta (`+10` percentage points), not relative percentage growth.

Rollback action:
1. Keep P0/2 consistency gate enabled.
2. Revert only P1/2 communication wording/routine changes.
3. Keep evidence whitelist behavior unchanged while investigating.

## Scenario Recipes

### A) Bugfix in existing system

1. Create one task file (`L0/L1/L2` in one file).
2. Commit task file on `main`.
3. Start one bubble from that task file.
4. Run max 2 L1 review rounds.
5. Spec lock -> implement -> close.

### B) Small feature in existing system

1. Check contract-boundary override first:
   - if no contract/interface change: one task file is enough.
   - if contract/interface change exists: create one plan + one or two tasks.
2. Commit docs on `main`.
3. Start bubble per task.
4. Close each bubble independently.

### C) Large feature

1. Create full PRD + phase plan.
2. Create phase task files (one L1 contract per phase).
3. Run bubble phase-by-phase (no giant single task).
4. Lock and merge phase before opening next phase.

### D) New app kickoff

1. Create vision/scope PRD + foundation ADRs + MVP plan.
2. Create stream tasks (backend, frontend, auth, infra).
3. Start bubbles per stream only when task contracts are ready.
4. Merge foundation first, then stream tasks.

## Adoption Strategy

1. Phase 1 (`advisory`): check and warn only.
2. Phase 2 (`required-docs`): hard-gate doc-only/task bubbles.
3. Phase 3 (`required-all`): enforce on all bubbles.
4. Phase 1 docs-only operational mukodesben a fenti decision matrix es rollout gate az iranyado.
