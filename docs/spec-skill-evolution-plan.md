# Plan: CreatePairflowSpec Skill Evolution Research

Temporary plan and progress tracker for documenting what triggered each gate/rule added to `.claude/skills/CreatePairflowSpec/` between 2026-04-05 and 2026-04-16.

## Goal

For each skill commit in this window, produce one section in the final document (`docs/spec-skill-evolution.md`) that captures:

1. What the commit introduced (from diff + commit message).
2. The authoring session — the Codex conversation where the skill change itself was discussed and written.
3. The incident session(s) — the Pairflow bubble(s) whose failure triggered the reflective conversation.
4. The concrete problem the change solves, stated in the author's own words when possible.
5. Links to related archived bubble transcripts when they add signal about which P1 issues recurred.

This is information gathering, not analysis or refactoring.

## Output

- Final document: `docs/spec-skill-evolution.md` (created incrementally as commits are processed).
- This plan: `docs/spec-skill-evolution-plan.md` (temporary, can be removed after the research is complete).

## Operating Model

1. One commit at a time, coordinated from the main conversation.
2. Per commit: spawn a single subagent (Explore, `very thorough`) with the prompt template in §Subagent Prompt Template below.
3. First run is exploratory: commit `01ecf168` (Complexity-Risk Gate). Review what the subagent returned, refine this plan and the template, then proceed with the remaining commits.
4. Subagent returns a structured summary; main conversation composes the final section and appends it to `docs/spec-skill-evolution.md`.

## Key Domain Knowledge (for the subagent)

User-provided context that frames the search:

1. Workflow: generate task file → run task refinement bubble (multiple rounds).
2. Trigger for skill change: round ~10+ in refinement (or round ~20+ in implementation) still surfacing P1 issues. This signals the current approach is structurally broken, not just buggy.
3. The user then has a reflective conversation with the LLM (typically Codex) about what keeps going wrong. That conversation usually ends in a plan change, which becomes the skill commit.
4. Therefore, for each skill commit there is typically one specific session in the hours immediately before the commit where that reflective conversation happened. That is the authoring session.
5. Projects in scope: `pairflow` (this repo) and `precedens.ai` (via `make-it-legal` worktrees). User used Codex (not Claude Code) for these skill conversations in the last weeks.
6. When the authoring session names a specific bubble as the source of frustration, the archived bubble transcript shows the round-by-round P1 issues — that is the incident evidence.

## Search Heuristics (for the subagent)

1. Codex sessions live in `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`. Each line is a JSON object with `type` in {`session_meta`, `event_msg`, `response_item`}.
2. `session_meta.payload.cwd` — filter to paths containing `pairflow`, `precedens.ai`, or `make-it-legal`.
3. Time window per commit: **start narrow** — commit timestamp minus 8 hours. Widen to 24h only if nothing relevant found.
4. Keyword grep inside rollout files (use `rg` on the JSONL):
   - Gate-specific terms (e.g. `closure-budget`, `control model`, `authority producer`, `bounded-task-shape`, `closed-contract`, `baseline preservation`).
   - Generic frustration signals: `P1`, `round 10`, `round 20`, `refinement`, `let's change the plan`, `what might go wrong`, `reflective`.
5. When a bubble name appears (e.g. `bubble/<name>`, `pairflow bubble <name>`), search the pairflow repo and `.pairflow-worktrees/` in related projects for archived transcripts. The subagent should check for archive locations and report what it finds.
6. For the authoring session, evidence often includes: the user quoting a rule, asking "should this be a gate?", or discussing a previous bubble's failure mode. Pull direct quotes.

## Output Section Template (append to `docs/spec-skill-evolution.md`)

```markdown
## <commit-date> — `<short-hash>` — <title>

**Commit message:** <one-line>

**What it introduced (from diff):**
<2-4 sentence summary>

**Authoring session:**
- File: `<absolute path to rollout>`
- Session id: `<uuid>`
- `cwd`: `<cwd at the time>`
- Direct quotes (1-3 excerpts that show the reasoning):
  > "..."
  > "..."

**Incident evidence:**
- Bubble / task referenced: `<name or n/a>`
- Archived transcript (if found): `<path or n/a>`
- Recurring P1 pattern: <1-3 bullets>

**Problem solved (synthesized):**
<2-3 sentences, paraphrasing the user's reasoning>

**Related prior sessions (if the frustration built up over multiple runs):**
- `<path>` — <one-line relevance>

**Gaps / uncertainty:**
<explicit note if authoring session not found, or if the link is speculative>
```

## Subagent Prompt Template

Use this as the body of each Explore subagent invocation, substituting the commit-specific fields:

> **Task:** Investigate the context behind a specific commit to the CreatePairflowSpec skill by finding the Codex session(s) in which the change was discussed and authored, and any archived Pairflow bubble transcript that shows the failure mode that triggered it.
>
> **Commit under investigation:**
> - Hash: `<HASH>`
> - Timestamp: `<YYYY-MM-DD HH:MM:SS +TZ>`
> - Commit message: `<MESSAGE>`
> - Files changed (from `git show --stat`): `<LIST>`
> - One-paragraph summary of the diff (from me): `<SUMMARY>`
>
> **What you must return:**
> 1. The authoring session — the Codex rollout file where the user discussed this change with the model in the hours before the commit. Give the absolute path, session id, `cwd`, and 1-3 direct quote excerpts that show the reasoning.
> 2. Any incident session(s) — earlier Codex sessions (same day or prior) where a Pairflow bubble was failing in the pattern that motivated this change. If a specific bubble is named, try to locate the archived transcript and summarize the recurring P1 issues round-by-round.
> 3. A synthesized statement of what problem this commit solves, paraphrasing the user's own words from the authoring session.
> 4. Explicit gaps — if you cannot find the authoring session, or the link between incident and commit is speculative, say so clearly.
>
> **Search method:**
> 1. Look in `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`. Start with the commit day and the day before. Filter by `session_meta.payload.cwd` containing `pairflow`, `precedens.ai`, or `make-it-legal`.
> 2. Use `rg` on candidate JSONL files for gate-specific keywords (see below) and frustration signals (`P1`, `round 10`, `round 20`, `refinement`, `let's change the plan`, `what might go wrong`).
> 3. Gate-specific keywords for this commit: `<KEYWORDS>`.
> 4. If a bubble name appears, check the pairflow repo (`/Users/felho/dev/pairflow/`) and `.pairflow-worktrees/` subdirectories in related projects for archived bubble transcripts. Report what you find.
> 5. Do NOT read entire rollout files (they can be 10-90 MB). Use `rg` with context flags and `sed -n` for targeted excerpts.
>
> **Output format:** Fill the "Output Section Template" from `docs/spec-skill-evolution-plan.md` with your findings. Keep direct quotes short (1-3 lines each). Return your filled template as your final answer.
>
> **Budget:** Under 400 words in your final response. You may explore broadly, but return concisely.

## Commit Progress Tracker

| Status | Date | Hash | Title | Gate-specific keywords for search |
|--------|------|------|-------|-----------------------------------|
| [ ] | 2026-04-05 | `01ecf168` | Add Complexity Risk Gate | `complexity risk gate`, `risk_score`, `authority_risk`, `surface_spread`, `identity_join_risk`, `activation_coupling`, `prerequisite_risk`, `acceptance_multiplicity` |
| [ ] | 2026-04-10 | `ca22d258` | Tighten complexity gate | `complexity`, `risk_score`, `hard-stop`, `refactor-first split` |
| [ ] | 2026-04-11 | `bdd4646f` | Control Model Readiness Gate | `control model`, `business_invariant`, `read_path_rule`, `forbidden_fallback`, `missing_data_rule`, `canonical source-of-truth` |
| [ ] | 2026-04-11 | `8b57b962` | Authority sequencing guards (Authority Fan-out Scan) | `authority fan-out`, `authority_producer`, `read_model_consumers`, `cleanup_recovery_consumers`, `workflow_orchestration_consumers`, `producer-first sequencing` |
| [ ] | 2026-04-12 | `ef55d8a1` | Baseline Preservation | `baseline preservation`, `must_preserve_behaviors`, `allowed_resolution_paths`, `forbidden_regression_interpretations`, `replacement_proof` |
| [ ] | 2026-04-14 | `26bff313` | Closure-Budget Gate | `closure-budget`, `closure buckets`, `persisted_authority_or_schema`, `shared_contract`, `collapsed closures`, `deferred closures` |
| [ ] | 2026-04-15 | `77d2210e` | Bounded-Task-Shape Gate + ReviewSpec + Remaining-Task-Viability-Check | `bounded-task-shape`, `contract_or_persisted_authority_foundation`, `fail_closed_hardening`, `coordination_concurrency_hardening`, `activation_or_read_model`, `remaining-task viability`, `ReviewSpec`, `plan-mode`, `task-mode` |
| [ ] | 2026-04-16 | `911af8a2` | Align skill rules with artifact boundaries | `artifact boundaries`, `plan slimness`, `task reality`, `coverage/dependency`, `duplicate task-spec` |
| [ ] | 2026-04-16 | `5f0f0254` | Finalize artifact boundary cleanup | `artifact boundary`, `cleanup`, `finalize` |
| [ ] | 2026-04-16 | `a75bca03` | Closed-Contract Drift Check | `closed-contract`, `contract drift`, `canonical vs guard vs compat`, `forbidden reinterpretations`, `source anchors` |

Notes:

1. `ca22d258` and `01ecf168` may merge into one section if the second commit is just a follow-up refinement of the first.
2. `5f0f0254` is a small cleanup (-7 net) — if no authoring signal is found, the section will be brief and explicitly note "consolidation follow-up to `911af8a2`".
3. If the subagent can't find any authoring session for a commit, document that explicitly — it may indicate the commit was drafted outside Codex (e.g. Claude Code or manual editing).

## Exploratory Run (Step 1)

1. Spawn subagent for `01ecf168` (Complexity-Risk Gate, 2026-04-05 17:21:53 +0200).
2. Review what it returns — check: did the keywords work? was the time window too narrow/wide? did it find authoring vs incident? did the bubble transcript lookup succeed?
3. Update this plan and the prompt template based on learnings before processing the remaining 9 commits.
