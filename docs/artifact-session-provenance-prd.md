---
artifact_type: prd
artifact_id: prd_artifact_session_provenance_v1
title: "Artifact Session Provenance"
status: draft
owners:
  - "felho"
---

# PRD: Artifact Session Provenance

**Date:** 2026-04-27
**Author:** felho
**Status:** Draft / future design. Not implemented runtime authority.

Current note: this PRD remains useful design input for artifact-level session
provenance, but existing Pairflow runtime provenance work is bubble-side and
does not implement this frontmatter recorder contract. Use an approved plan/task
or implementation artifact before treating this as active behavior.

## Context

Pairflow specs (PRDs, plans, tasks) and skill definitions are produced through chat-based work — primarily inside Claude Code sessions. Today the resulting artifacts carry no machine-readable pointer back to the session(s) that produced or modified them.

The companion bubble-provenance work (`task_analyse_bubble_provenance_and_session_analytics_phase1_v1`) closes the *implementation-side* end of the provenance graph: bubble → agent sessions → code. The *design-side* end remains open: there is no first-class link from an artifact to the chat session that produced it.

Without that link:
1. `AnalyseBubble` cannot reason about *what context the spec was born in* — only what was implemented.
2. Spec-quality signals such as "how many review-loop passes did this PRD survive" or "which session keeps coming back to fix findings on this task" are not derivable.
3. Cross-artifact provenance (e.g., "the plan was refined in the same session that created the task that drove this bubble") cannot be reconstructed.

The intent of this PRD is to make the missing link first-class: every in-scope artifact carries a deterministic `provenance:` metadata block in its YAML frontmatter pointing back to the Claude Code session(s) that produced or modified it.

## Goal

Close the design-side provenance edge so the full chain `chat_session → artifact → bubble → agent_sessions → code` is traversable from local artifact metadata alone, deterministically and offline, with explicit fallback behavior when a session attribution is unavailable.

## Business Invariants

1. Every artifact mutation in scope that happens during a Claude Code session SHOULD be attributable to that session in the artifact's metadata.
2. Artifact integrity comes first: a missing or unavailable `session_id` MUST NOT block the underlying edit.
3. Provenance metadata is a *cached pointer* into the authoritative Claude Code transcript log. The frontmatter is not a substitute for the transcript itself.

## Control Model

1. **State/control owner**: The Claude Code transcript directory (`~/.claude/projects/<project-slug>/<session_id>/`) is the source of truth for session content. The artifact's `provenance.sessions[]` entry is a deterministic *pointer* to that source.
2. **Read-path rule**: Consumers (e.g., `AnalyseBubble`, future review tooling) MAY read provenance from the artifact frontmatter without rescanning transcript files. They MAY drill down into the transcript via the recorded `transcript_path` when richer signal is needed.
3. **Forbidden fallback**: V1 MUST NOT infer `session_id` by fuzzy timestamp matching for artifacts that lack the block. Heuristic backfill is forbidden.
4. **Allowed resolution path**: Deterministic backfill from durable session markers (Claude Code hook input, env var, transcript-directory mtime correlated to git blame) is allowed when each component of the linkage is exact, not probabilistic.
5. **Missing-data rule**: When a `session_id` cannot be deterministically captured (manual external edit, pre-existing artifact, hook unavailable), the recorder MUST either (a) skip recording entirely, or (b) record an entry with `confidence: missing` and a `reason_code`. Recording MUST NOT invent or guess a session.

## Baseline Preservation

1. **Must-preserve**: Existing artifacts in `plans/**`, `docs/**`, and `.claude/skills/**` without a `provenance:` block remain valid. Consumers MUST treat absence as `missing`, not as a parse error.
2. **Must-preserve**: All existing YAML frontmatter fields on in-scope artifacts (`artifact_type`, `artifact_id`, `status`, `phase`, `target_files`, etc.) remain authoritative. The `provenance:` block is additive.
3. **Replacement expectation**: None — this is a purely additive metadata extension.

## In Scope

1. Canonical `provenance:` YAML block schema, applied uniformly to:
   - `plans/**/*.md` (PRDs, plans, tasks, archive)
   - `docs/**/*.md` (design docs, PRDs in `docs/`)
   - `.claude/skills/**/SKILL.md` and `.claude/skills/**/Workflows/*.md`
2. Per-artifact `sessions[]` list — ordered, append-mostly, multi-session aware.
3. Reader API/utility that parses provenance deterministically and exposes diagnostics for missing/malformed blocks.
4. Recorder mechanism for **Claude Code** sessions only, capable of populating/updating the block on Edit/Write of in-scope artifacts.
5. Integration hook for `AnalyseBubble`: when a bubble's archived provenance carries a `task_artifact_path`, the analyzer can resolve the spec's session list from that file.
6. Documentation of the schema in skill references so `CreatePairflowSpec` and `CraftPRD` can populate it correctly.

## Out of Scope

1. **Codex session parity** — V1 is Claude Code only. Codex parity is a later phase pending an equivalent durable session-id mechanism.
2. **Heuristic backfill of historical artifacts** — every existing artifact stays without provenance unless and until it is edited under the recorder. A best-effort backfill tool is later-hardening.
3. **Reverse `session_id → artifacts[]` index** — V1 only persists the forward direction in artifact frontmatter. A reverse sidecar index is a follow-up if query patterns demand it.
4. **Source code files (`src/**`, `tests/**`, scripts)** — git blame/log already provides this attribution at line granularity.
5. **Generic markdown outside the three scoped roots** — e.g., README.md at repo root, `CLAUDE.md`, `AGENTS.md`. Out of scope unless explicitly added later.
6. **UI for browsing provenance** — V1 is CLI/programmatic.
7. **Cross-host normalization** — sessions remain identified by the host they ran on; cross-host correlation is not solved here.
8. **Capping or rotating the `sessions[]` history** — V1 is unbounded. Cap/rotate is later-hardening if frontmatter size becomes an issue.

## Canonical Schema Sketch

Concrete shape of the `provenance:` YAML block proposed for V1. Field names and enum values are subject to refinement during the Plan phase, but the overall structure is committed.

```yaml
provenance:
  schema_version: 1
  sessions:
    - session_id: "0057aa62-cb3e-4738-a0ad-68b64ea28101"
      agent: claude_code               # claude_code | codex (codex deferred to later phase)
      model_id: "claude-opus-4-7"      # nullable when unknown
      action: create                    # create | refine | review | fix-findings | restructure | edit
      skill: "CreatePairflowSpec/CreatePRD"   # optional, populated when a skill drove the edit
      started_at: "2026-04-27T10:00:00Z"
      ended_at: "2026-04-27T11:15:00Z"
      transcript_path: "~/.claude/projects/-Users-felho-dev-pairflow/0057aa62-cb3e-4738-a0ad-68b64ea28101"
      host: "felho-mbp"                # OS hostname or stable machine id
      user: "felho"                    # system user
      confidence: strong                # strong | probable | missing
      reason_code: null                 # populated when confidence != strong
    - session_id: "08f0fab0-4ca0-41fc-9dbf-87a41fbc6899"
      agent: claude_code
      model_id: "claude-sonnet-4-6"
      action: fix-findings
      skill: "CreatePairflowSpec/ReviewSpec"
      started_at: "2026-04-28T14:00:00Z"
      ended_at: "2026-04-28T14:45:00Z"
      transcript_path: "~/.claude/projects/-Users-felho-dev-pairflow/08f0fab0-4ca0-41fc-9dbf-87a41fbc6899"
      host: "felho-mbp"
      user: "felho"
      confidence: strong
      reason_code: null
```

### Confidence Tiers

1. `strong` — explicit and durable `session_id` capture from a Claude Code hook input or env var inside the running session. Default for V1 Claude Code recordings.
2. `probable` — deterministic correlation without the canonical session_id (e.g., transcript-directory mtime exactly matches edit time within a tight window AND only one candidate exists). V1 does not produce `probable` entries; reserved for later-hardening backfill.
3. `missing` — no usable linkage. Entry MAY still be recorded for diagnostics, paired with a `reason_code`.

### Reason Codes (V1)

- `PROVENANCE_BLOCK_ABSENT` — block missing entirely on read (legacy artifact).
- `PROVENANCE_HOOK_INPUT_INCOMPLETE` — hook fired but `session_id` was not present in input.
- `PROVENANCE_DERIVED_COPY_SKIPPED` — file is a sync-installed derived copy of a skill; recording suppressed.
- `PROVENANCE_RECORDER_DISABLED` — recorder disabled via env switch (`CLAUDE_PROVENANCE=off`) or `.provenanceignore`.
- `PROVENANCE_SCHEMA_VERSION_MISSING` — block exists but lacks `schema_version`; treated as legacy.
- `PROVENANCE_SCHEMA_VERSION_UNKNOWN` — block carries a major version newer than the reader supports.
- `PROVENANCE_PATH_OUT_OF_SCOPE` — file path is outside the in-scope roots; reader treats as missing-by-design.

## Requirements

| ID | Requirement | Rationale | Priority |
|---|---|---|---|
| R1 | A canonical `provenance:` YAML block schema MUST be defined with `schema_version`, `sessions[]`, and per-entry fields (session_id, agent, model_id, action, started_at, ended_at, transcript_path, host, user, confidence, optional reason_code). | Without a single canonical shape, consumers cannot read deterministically. | must |
| R2 | The recorder MUST be able to capture session metadata automatically when an in-scope artifact is edited via Edit/Write inside a Claude Code session. | Manual recording in every skill is brittle and easy to forget. | must |
| R3 | The recorder MUST be able to also be invoked explicitly by skills (e.g., `CreatePairflowSpec`) to attach an authoritative `action` label (create, refine, review, fix-findings, restructure). | Auto-detection cannot infer intent; the producing skill knows it. | must |
| R4 | A multi-session artifact MUST preserve an ordered list with stable timestamps. The recorder MUST update the latest entry's `ended_at` on subsequent edits in the same session+action; otherwise it MUST append a new entry. | Balances diff noise against multi-session fidelity. | must |
| R5 | The reader MUST parse missing/malformed provenance blocks deterministically and surface `confidence: missing` with a reason code rather than throwing. | Fail-open guarantees: provenance is auxiliary, not load-bearing. | must |
| R6 | Recording failure (env var unset, hook unavailable, parse error) MUST NOT block the underlying Edit/Write. | Lifecycle integrity invariant. | must |
| R7 | The schema MUST include `host` and `user` fields so cross-machine edits are explicitly distinguishable. | `session_id` is host-local; without qualifiers, cross-host correlation silently misleads. | must |
| R8 | `AnalyseBubble` MUST be able to resolve linked spec sessions from a bubble's `task_artifact_path` by reading the artifact's frontmatter only, with no transcript scan. | Read-path rule; offline-first analysis. | must |
| R9 | Codex session capture is explicitly deferred to a later phase but the schema MUST allow `agent: codex` so future entries are forward-compatible. | Avoid a later schema break. | must |
| R10 | The `sessions[]` shape MUST be stable enough to feed both forward (artifact→sessions) and a future reverse (session→artifacts) index without renaming fields. | Forward-compatible with future tooling. | should |
| R11 | Existing artifacts without a `provenance:` block remain valid and continue to be read with `confidence: missing`. | Backwards compatibility. | must |
| R12 | The writer MUST round-trip unknown frontmatter fields without modification, mutating only the `provenance:` subtree. | YAML files often carry tool-specific or future-extension fields the recorder cannot interpret; corrupting them would block adoption. | must |
| R13 | The schema MUST define an explicit major/minor versioning policy. The reader MUST reject only newer *major* versions; minor-version additions MUST be backward-readable (unknown fields ignored, not errored). | Allows additive evolution without breaking older readers. | must |
| R14 | Confidence MUST be expressed via a closed enum (`strong | probable | missing`). V1 records only `strong` or `missing`; `probable` is reserved for later-hardening backfill. | Deterministic analysis requires a stable, machine-readable confidence tier. | must |
| R15 | Cross-artifact session lineage (the same `session_id` appearing across PRD/plan/task) MUST be derivable by readers from the existing `sessions[]` data without a separate dedicated field. | Avoid premature materialization; keep V1 schema lean. A reverse index sidecar is later-hardening. | should |
| R16 | The recorder MUST NOT write provenance into a sync-installed derived copy of a skill file (e.g., `~/.claude/skills/**`); only the repo-local source (`<repo>/.claude/skills/**`) is authoritative. | Per AGENTS.md, derived copies are not editable source; writing there silently loses data on next sync. | must |
| R17 | The recorder MUST be controllable via an environment switch (`CLAUDE_PROVENANCE=off`) for non-interactive/batch contexts where attribution adds no value. | Operational override for CI, scripts, automation. | should |
| R18 | The recorder MUST honor a per-repo opt-out file (`.provenanceignore`, gitignore-style globs) so sensitive or high-churn paths can be excluded without disabling globally. | Granular control without all-or-nothing. | should |
| R19 | The schema MUST keep the `skill` field optional and free-form text in V1 (e.g., `"CreatePairflowSpec/CreatePRD"`), so analytic queries can group by skill without forcing a closed enum prematurely. | Skill set evolves; analytic value is high; locking enum now would block experimentation. | should |
| R20 | When the recorder opens a target file for a write, it MUST verify the file's current `provenance.schema_version` is readable; if not, it MUST refuse to mutate the block and surface a clear diagnostic instead of silently overwriting. | Prevents downgrade or corruption when a newer-major writer accidentally edits an older-major file (and vice versa). | must |
| R21 | The system MUST have a single canonical write path. When both an automatic hook and an explicit skill call apply to the same edit, the skill's `action`/`skill` signal MUST be merged into the hook's write, not produce a duplicate entry. | Hook + skill running in tandem is the expected steady state; double-write would corrupt the timeline. | must |
| R22 | The schema MUST treat `session_id` as host-and-instance-local — a resumed session that re-emits the same `session_id` is the same logical session (update `ended_at`); a resumed session emitted under a new `session_id` is a new entry. | Claude Code's session-resume semantics are not frozen; we anchor on the emitted ID rather than inferring continuity. | should |

## Acceptance Criteria

1. AC1: Creating a new in-scope artifact during a Claude Code session yields a `provenance.sessions[]` with exactly one entry: `action: create`, current `session_id`, `agent: claude_code`, `model_id`, `started_at`, `host`, `user`.
2. AC2: A subsequent edit during a different Claude Code session appends a new entry (with appropriate `action`) without mutating prior entries.
3. AC3: A subsequent edit during the same session and the same `action` updates the latest entry's `ended_at` rather than appending.
4. AC4: A subsequent edit during the same session but a different `action` (e.g., `create` → `refine`) appends a new entry.
5. AC5: An edit in a context where the recorder cannot determine `session_id` (no hook, no env var) leaves the artifact unchanged in its provenance state and does not block the edit. The next deterministic-recording event resumes correctly.
6. AC6: An artifact without a `provenance:` block can be read by the reader API without error and yields `confidence: missing` with `reason_code: PROVENANCE_BLOCK_ABSENT`.
7. AC7: Edits made by tools other than Claude Code (e.g., manual editor save) do not corrupt an existing `provenance:` block; subsequent Claude Code edits resume recording correctly.
8. AC8: `AnalyseBubble`, given a bubble whose archived provenance includes `task_artifact_path`, returns the spec's session list deterministically by reading that file, with no network or transcript scan.
9. AC9: The schema accepts `agent: codex` entries and the reader/writer round-trip them without loss, even though V1 has no Codex recorder.
10. AC10: The `provenance.schema_version` field is set to `1` and any reader rejects unknown *major* versions explicitly with `reason_code: PROVENANCE_SCHEMA_VERSION_UNKNOWN`.
11. AC11: A frontmatter file with unknown additional top-level fields (e.g., `feature_flags:` from a future tool) round-trips through the writer without modification of those fields.
12. AC12: A `provenance:` block missing `schema_version` is read with `confidence: missing` and `reason_code: PROVENANCE_SCHEMA_VERSION_MISSING`; the file is otherwise readable and the block is preserved on read.
13. AC13: An edit performed inside a sync-installed derived copy (e.g., `~/.claude/skills/<skill>/SKILL.md`) does NOT write provenance; the corresponding repo-local source file remains the authoritative target.
14. AC14: With `CLAUDE_PROVENANCE=off` set, no provenance entries are written; existing entries are preserved unchanged on subsequent edits.
15. AC15: A path matched by `.provenanceignore` does not trigger a write; the reader returns `reason_code: PROVENANCE_RECORDER_DISABLED` for paths in the ignore set.
16. AC16: A reader given a path outside the in-scope roots (`plans/**`, `docs/**`, `.claude/skills/**`) returns `confidence: missing` with `reason_code: PROVENANCE_PATH_OUT_OF_SCOPE` rather than attempting to parse.
17. AC17: When the writer encounters a target file with `schema_version` greater than the writer's supported major, it refuses to mutate the `provenance:` block and surfaces a clear diagnostic.

## Risks

1. **Frontmatter diff noise** — every recorded edit produces a YAML diff; PRs become noisy. *Mitigation*: same-session same-action `ended_at` updates instead of appends; consider sidecar log if noise becomes unacceptable (later-hardening).
2. **Hook input shape uncertainty** — the recorder depends on Claude Code passing `session_id` in hook input or via env var. If unavailable, V1 must fall back to manual skill-side recording. *Mitigation*: validate this in the Plan phase before committing to a hook-only design.
3. **Multi-host edits** — `session_id` is host-local; correlating sessions across machines requires `host`+`user`. *Mitigation*: include both fields from V1; document non-correlation as expected behavior.
4. **YAML corruption from manual edits** — hand-edited frontmatter can produce malformed `provenance:` blocks. *Mitigation*: defensive parser; the writer round-trips unknown fields and rebuilds only the `provenance:` subtree.
5. **Two recorders, one truth** — if both an automatic hook and an explicit skill call write entries, double entries can appear. *Mitigation*: single canonical write path; skills mark intent via a sidecar action signal that the hook merges before write.
6. **Pre-existing artifacts stay missing forever** — without backfill, large parts of the repo remain `confidence: missing`. *Mitigation*: accepted as V1 behavior; explicit backfill is later-hardening and bounded.
7. **Skill files churn** — `.claude/skills/**` files are frequently sync-installed from the source repo to `~/.claude/skills`. Provenance written into the source would be copied verbatim, but `~/.claude/skills` edits would not flow back. *Mitigation*: document that the repo-local file is the only authoritative provenance source; suppress recording on installed (derived) copies.

## Rollout

1. **Phase 1 — Schema + Reader + Manual Writer**:
   - Define schema and `provenance.schema_version: 1`.
   - Ship a deterministic reader utility that returns `sessions[]` or `missing` diagnostics.
   - Ship a writer utility callable explicitly from skills (no auto-hook yet).
   - Update `CreatePairflowSpec` and `CraftPRD` skills to call the writer on artifact create/refine.
2. **Phase 2 — Auto-Recorder via Claude Code Hook**:
   - Add a `PostToolUse` hook on Edit/Write filtered by in-scope path globs.
   - Hook merges with skill-supplied `action` label (where present) or defaults to `edit`.
   - Validate that `session_id` is reliably available in hook input across the supported Claude Code versions.
3. **Phase 3 — `AnalyseBubble` Integration**:
   - Bubble's archived provenance gains `task_artifact_path` (already proposed in the bubble-provenance task).
   - `AnalyseBubble` resolves the spec's `sessions[]` from that file and surfaces it in the analysis report.
4. **Phase 4 (later-hardening)** — Codex parity, reverse `session_id → artifacts[]` sidecar index, optional history cap with archive sidecar, deterministic backfill for repo-local artifacts where exact correlation is possible.

## Related Provenance Work (Cross-Reference Only)

These ideas surfaced in the same conversation that produced this PRD but belong to the *bubble-side* of the provenance graph and are scoped to `task_analyse_bubble_provenance_and_session_analytics_phase1_v1` (currently `draft`, pending re-scope to current `src/v11/**` topology). Captured here so the chain is not lost when the conversation context rotates.

1. **Spec linkage on bubble side** — bubble's `provenance.json` should snapshot `task_artifact_id`, `task_artifact_path`, `prd_ref`, `plan_ref` at archive time (not just runtime references). This is the bubble-side companion to AC8 of this PRD.
2. **Git linkage** — bubble provenance should record `base_commit`, `base_branch`, `head_commit`, `bubble_branch`, `merge_commit`, `pr_url` so the bubble→code edge becomes deterministic and rounds/churn metrics are computable rather than estimated.
3. **Round/turn granularity** — current bubble-provenance schema flattens `agents[]` into a single implementer + reviewer pair; a multi-round bubble with N rework cycles loses per-round session attribution. Recommend `rounds[]` with per-round `agents[]`.
4. **Meta-reviewer role** — current schema's `role: implementer | reviewer` does not cover meta-reviewer (visible in recent commits as a first-class role). Schema should accept `meta_reviewer`.
5. **Model version inside agent** — `agent: claude` is too coarse for token-optimization analysis. Recommend `model_id` per agent entry, mirroring the same field used in this PRD's session entries.
6. **Lifecycle/intervention events** — `events[]` capturing created, started, watchdog-interrupted, escalated, approved, reworked, merged, archived, with timestamp + actor + reason. Required input for AnalyseBubble's flow-logic section.
7. **Cost/usage handle** — `usage_summary_path` or cached `tokens_total` per session entry, so token-optimization analysis does not re-parse large transcript logs at query time.

These items will be raised against the bubble-provenance task during its Phase-1 re-scope. Resolution there is a precondition for AC8 of this PRD (specifically the snapshotted `task_artifact_path` field in bubble provenance).

## Open Questions

1. **Hook session_id availability**: Does Claude Code's `PostToolUse` hook input include `session_id` directly, or must it be derived from `transcript_path`? *To validate during Plan phase.*
2. **Action vocabulary**: Should `action` be a closed enum (`create | refine | review | fix-findings | restructure | edit`) or open string with a recommended set? Closed-enum keeps analysis deterministic; open-string is forward-flexible.
3. **Same-session bookend policy**: Confirm "update `ended_at` if same session+action; append on action change". Is `action` granular enough, or do we also need a per-skill workflow tag (e.g., `skill: CraftPRD/Deepen`)?
4. **Skill source-of-truth handling**: For `.claude/skills/**`, the project's sync policy (AGENTS.md) treats `~/.claude/skills` as a derived copy. The recorder must avoid writing provenance into the derived copy and only into the repo-local source. How is "this file is a derived copy" detected — by path prefix or by an explicit marker?
5. **Skill-only files vs Workflow files**: Inclusion of every `Workflows/*.md` and every `references/*.md` under skills could blow up scope. Is V1 limited to `SKILL.md` + `Workflows/*.md`, or does it include `references/*.md` too?
6. **Reverse-index demand signal**: At what point does artifact-frontmatter-only forward indexing become insufficient? (Likely when "show me everything this session touched" becomes a frequent query.) Worth tracking as a phase-4 trigger.
7. **Bubble↔Spec link in archived bubbles**: The bubble-provenance task's schema currently has no `task_artifact_path` field. Should this PRD bind the two by adding it now, or is that a separate change request on that task?
8. **Idle-window for same-session bookend**: When the same session+action edits an artifact at T0 and again at T0+8h, do we still update `ended_at`, or treat it as a new bookend? Proposed default: a 60-minute idle window — beyond that, append a new entry even with same session+action.
9. **Implementation surface**: Should the reader/writer ship as a TypeScript module under `src/v11/**`, a CLI subcommand (e.g., `pairflow provenance read|write`), or both? Affects testing strategy, external consumability, and skill-side invocation pattern.
10. **Cross-artifact lineage materialization trigger**: R15 keeps lineage *derivable*. At what query frequency or scale does cross-artifact lineage become worth materializing as a sidecar (`session_artifact_index.json`)? Treat as phase-4 trigger like the reverse index.
11. **Hook input version-detection**: The Claude Code hook input shape is not formally versioned. How do we detect a Claude Code update that changes the input contract before recording silently breaks? Possible answer: a startup self-test that asserts expected fields are present and degrades to manual-only recording on failure.
12. **Per-skill workflow tag granularity**: The `skill` field in the schema sketch combines skill name and workflow (`CreatePairflowSpec/CreatePRD`). Is the combined string sufficient, or do we want separate `skill_name` and `workflow_name` fields for analytic queries?
13. **Skill `references/*.md` and `Templates/*.md` inclusion**: Confirm that V1 covers only `SKILL.md` and `Workflows/*.md`. Reference and template files under skills are excluded — is that the right cut?
14. **Recorder kill-switch granularity**: R17 + R18 propose `CLAUDE_PROVENANCE=off` (global) and `.provenanceignore` (per-path). Is per-skill or per-action opt-out also needed (e.g., suppress recording for `action: edit` to avoid trivial-edit churn)?
15. **Agent enum vocabulary alignment**: This PRD uses `agent: claude_code | codex` (environments that produced the artifact). The bubble-provenance schema uses `agent: claude | codex` (coding agents). The two are semantically different but visually similar. Should they share vocabulary, or remain explicitly distinct with a documented mapping?
16. **`probable` confidence activation criterion**: V1 records only `strong` or `missing`. What concrete signal would justify producing a `probable` entry in a future backfill — e.g., transcript-directory mtime within X seconds of git blame timestamp AND single candidate in a Y-second window?
17. **Schema-version-mismatch write policy**: R20 says the writer refuses to mutate when reader-major and file-major disagree. Should there be a `--force-rewrite-schema` escape hatch for legitimate migrations, or is migration always a separate explicit tool run?
18. **Session continuity / "thread" concept**: When a Claude Code session is resumed (e.g., after `/compact` or after a crash) and emits a new `session_id`, the work is conceptually one continuous session but the schema records it as two separate entries. Do we need an optional `thread_id` (or `previous_session_id`) field to make continuity explicit, or is "two entries with adjacent timestamps" good enough for AnalyseBubble's purposes?
19. **Per-action diff suppression**: Even with the same-session bookend, repeated `action: edit` entries during a session can produce multiple appended entries when the action label is unstable. Should the recorder collapse adjacent entries with the same `(session_id, action)` regardless of intervening entries from other sessions, or strictly chronological?
20. **Trivial-edit filter**: Does it make sense for the recorder to skip recording on no-op or whitespace-only edits, to keep the timeline meaningful? If yes, what's the threshold (e.g., bytes changed outside frontmatter)?
21. **Author identity vs operator identity**: V1 records `user` as the system user. When work is delegated to a subagent or remote bubble, the system user may be a service account. Do we need a separate `operator` (human who initiated) vs `executor` (system user that ran)?
