# Pairflow Documentation Index

Status: active
Owner: Pairflow core
Scope: navigation and authority map for `docs/**`

## Purpose

This index separates current source-of-truth documents from historical context,
working drafts, and archived planning material. When documents disagree, prefer
the most specific active architecture/spec document for the affected subsystem,
then the relevant implemented task/plan artifact, then historical context.

## Canonical / Active

Use these as current contract or governance inputs:

- [pairflow-initial-design.md](./pairflow-initial-design.md) - implemented MVP baseline and retained protocol contract anchors.
- [reviewer-severity-ontology.md](./reviewer-severity-ontology.md) - canonical reviewer severity policy and source for generated runtime ontology.
- [reviewer-evidence-governance.md](./reviewer-evidence-governance.md) - active review/evidence trust, skip/run, and docs-only evidence policy.
- [architecture/architecture-fitness-checks.md](./architecture/architecture-fitness-checks.md) - active architecture fitness policy and CI gate documentation.
- [architecture/v11-placement-and-extraction-governance.md](./architecture/v11-placement-and-extraction-governance.md) - active placement rules for `src/v11/**`.
- [architecture/sandbox-compatibility-gate.md](./architecture/sandbox-compatibility-gate.md) - active sandbox compatibility gate.
- [actor-runtime-interface/](./actor-runtime-interface/) - active actor-runtime contract notes.
- [remote-bubble-execution.md](./remote-bubble-execution.md) - retained remote-bubble design baseline; newer phase task artifacts may narrow authority for specific implementation details.

## Active Roadmaps And Design Baselines

These are useful for ongoing architecture direction, but they may contain
implementation-era snapshots:

- [v1.1-boundary-simplification/v1.1-implementation-roadmap.md](./v1.1-boundary-simplification/v1.1-implementation-roadmap.md)
- [v1.1-boundary-simplification/decision-log.md](./v1.1-boundary-simplification/decision-log.md)
- [v1.1-boundary-simplification/component-one-pagers/](./v1.1-boundary-simplification/component-one-pagers/)
- [v2/pairflow-v2-architecture-plan-joint.md](./v2/pairflow-v2-architecture-plan-joint.md)

## Product / Feature PRDs And Runbooks

These are feature documents whose status is mixed. Prefer current code/README
or the linked active governance document when they disagree with an implemented
historical PRD.

- [meta-review-gate-prd.md](./meta-review-gate-prd.md)
- [meta-review-governance.md](./meta-review-governance.md)
- [pairflow-ui-prd.md](./pairflow-ui-prd.md)
- [repo-registry-prd.md](./repo-registry-prd.md)
- [bubble-metrics-archive-strategy.md](./bubble-metrics-archive-strategy.md)

## Draft / Future Design

These are not current runtime authority. Use them as design input only until an
approved plan/task or implementation adopts the contract:

- [artifact-session-provenance-prd.md](./artifact-session-provenance-prd.md)

## Superseded Exploratory Drafts

These are retained for design rationale, but a newer implementation artifact is
the current authority:

- [execute-pairflow-plan-draft.md](./execute-pairflow-plan-draft.md) - superseded by repo-local
  [`ExecutePairflowPlan`](../.claude/skills/ExecutePairflowPlan/SKILL.md)
  skill source and the archived implementation plan/tasks.

## Historical Context / Incident Notes

These documents preserve why a policy or feature changed. They should not
override active contract documents unless an active document explicitly points
to them as authority:

- [reviewbubble-task-hardening-dontesi-keret-2026-03-12.md](./reviewbubble-task-hardening-dontesi-keret-2026-03-12.md)
- [reviewer-pass-converged-issue-assessment-2026-03-21.md](./reviewer-pass-converged-issue-assessment-2026-03-21.md)
- [spec-skill-evolution.md](./spec-skill-evolution.md)
- [cmux-ideas.md](./cmux-ideas.md)

## Removed Historical Meta-Review Docs

The active meta-review operational policy was consolidated into
[meta-review-governance.md](./meta-review-governance.md). The following
rollout-era notes, templates, and pilot reports were removed from the working
tree so LLM context does not accidentally treat them as current authority:

- `docs/meta-review-gate-rollout-runbook.md`
- `docs/meta-review-gate-e2e-validation.md`
- `docs/review-loop-ws-d-pilot-report-2026-03.md`

Use git history only for rollout detail:

```bash
git log --diff-filter=D -- docs/meta-review-gate-rollout-runbook.md
git show <deletion-commit>^:docs/meta-review-gate-rollout-runbook.md
```

Do not use removed files as current policy authority.

## Removed Historical Review/Evidence Docs

The current review/evidence policy was consolidated into
[reviewer-evidence-governance.md](./reviewer-evidence-governance.md). The
following historical notes, drafts, and trackers were removed from the working
tree so LLM context does not accidentally treat them as current authority:

- `docs/review-loop-optimization.md`
- `docs/pairflow-evidence-governance-context-2026-03-03.md`
- `docs/pairflow-docs-only-evidence-gating-context-2026-03-03.md`
- `docs/reviewer-test-execution-skip-spec.md`
- `docs/reviewer-evidence-autolog-task.md`
- `docs/structural-enforcement-ideas.md`

Use git history only for incident detail:

```bash
git log --diff-filter=D -- docs/review-loop-optimization.md
git show <deletion-commit>^:docs/review-loop-optimization.md
```

Do not use removed files as current policy authority.

## Archive / Cleanup Candidates

These are retained for traceability but are not current authority:

- [v1.1-boundary-simplification/archive/](./v1.1-boundary-simplification/archive/)
- [v2/claude/](./v2/claude/) and [v2/codex/](./v2/codex/) - source drafts behind the joint v2 architecture plan.
- [mockups/pairflow-ui-mockup.html](./mockups/pairflow-ui-mockup.html) - standalone UI mockup; verify whether the implemented UI still uses it as design reference before deleting.
- [v1.1-boundary-simplification/component-one-pagers/component-one-pager-template.md](./v1.1-boundary-simplification/component-one-pagers/component-one-pager-template.md) - retained template only.

## Maintenance Rules

1. Add a short status block to new substantial docs: `Status`, `Owner`, and `Scope`.
2. If a document is superseded, mark the replacement at the top before moving or deleting it.
3. Keep one current source of truth per policy area; move old drafts to an archive folder or link them from this index as historical context.
4. Do not use historical incident notes as implementation authority without an active spec, plan, or task artifact that re-adopts the relevant rule.
