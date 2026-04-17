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
2. Per commit: build the brief (see Briefing Discipline below), then spawn a single subagent (Explore, `very thorough`) with the prompt template in §Subagent Prompt Template.
3. First run is exploratory: commit `01ecf168` (Complexity-Risk Gate). Review what the subagent returned, refine this plan and the template, then proceed with the remaining commits.
4. Subagent returns a filled template; main conversation validates the returned quotes (spot-check via `rg -n`) and only then appends to `docs/spec-skill-evolution.md`. If validation fails, iterate on the prompt and rerun — do not hand-patch the output, because hand-patching breaks the process we are trying to make trustworthy.

## Briefing Discipline (strict)

Before invoking a subagent, the caller MUST build the brief from the commit itself, never from the current skill state:

1. Read the committed diff: `git show <HASH> -- .claude/skills/CreatePairflowSpec/`.
2. Derive the diff summary only from what the commit adds/changes at that point in time.
3. The gate-specific keyword list for the subagent must contain only names, axes, fields, scoring bands, and concepts **introduced by this commit**. Do not include names that land in later commits.
4. Include the exact scoring bands and numeric scales as committed (e.g. `0-3 / 4-6 / 7-10`, not as they appear in later refinements).
5. If the caller accidentally leaks a later-commit name into the brief, the subagent cannot know — and the resulting "matches" verdict will be unreliable. Double-check before invoking.

## Key Domain Knowledge (for the subagent)

User-provided context that frames the search:

1. Workflow: generate task file → run task refinement bubble (multiple rounds).
2. Trigger for skill change: a bubble is **not converging** — round after round it keeps surfacing P1 issues (typical threshold ~round 10+ in refinement, ~round 20+ in implementation). The bubble is not necessarily doing anything wrong; the pattern is that the current approach is not reaching a findings-free state.
3. The user then has a reflective conversation with Codex (not Claude Code) about what keeps going wrong structurally. That conversation usually ends in a plan/skill change.
4. For each skill commit there is typically one Codex session in the hours immediately before the commit where that reflective conversation happened — this is the authoring session. Sometimes the conversation is proactive design ("I see this pattern across several bubbles, let's formalize a gate") rather than reactive fix; both count.
5. Projects in scope: `pairflow` (this repo) and `precedens.ai` (worked on via `make-it-legal` repo at `/Users/felho/dev/make-it-legal/`, which contains `.pairflow-worktrees/precedens.ai/...` subdirs). User used Codex for these reflective conversations in the last weeks.
6. When the authoring session names a specific bubble, its archived transcript may show the round-by-round findings that motivated the change. See Search Heuristics below for archive location.

### Important distinctions (learned from exploratory run for `01ecf168`)

1. **User vs agent voice.** A session typically has far more agent_message entries than user_message entries (e.g. 62 vs 11 in the `01ecf168` authoring session). The Codex agent often proposes the actual gate text in an agent_message after the user describes a problem. For the final doc, the *user's* framing of the problem is the primary "why"; the agent's proposed solution is secondary and should be labeled as such.
2. **Session content ≠ commit content.** The gate as discussed in the authoring session may differ from what eventually lands in the commit (e.g. 5 axes discussed vs 6 axes committed). There can be a second refinement session or manual edits between the session and the commit. Flag the delta explicitly.
3. **"Not converging" is the dominant frustration signal**, not "the bubble did X wrong". Search for user statements about round counts, repeated findings, or structural dead-ends.

## Search Heuristics (for the subagent)

1. **Codex sessions** live in `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`. Each line is a JSON object with `type` in {`session_meta`, `event_msg`, `response_item`}. The `event_msg` payload has a `type` field with values like `user_message`, `agent_message`, `exec_command_end`, etc.
2. **Critical gotcha:** `~/.codex/.gitignore` contains `*` (ignore all) with a narrow whitelist that does NOT include `sessions/`. Plain `rg <pattern> <dir>` traversals therefore SKIP all rollout files — returning zero hits even when the match exists. **Always use `rg --no-ignore` (or `rg -uuu`) when searching directories under `~/.codex/`.** Direct file-path `rg <pattern> <file>` works without the flag, but directory globs need it.
3. `session_meta.payload.cwd` — filter to paths containing `pairflow`, `precedens.ai`, or `make-it-legal`. To enumerate session_meta lines across a day: `rg --no-ignore -n '"type":"session_meta"' ~/.codex/sessions/2026/04/05/ | head -N`, then filter on the cwd field.
4. Time window per commit: **start narrow** — commit timestamp minus 8 hours. Widen to 24h only if nothing relevant found.
5. Sessions are large (1–90 MB). Never read whole files. Use `rg --no-ignore -n` with `-B/-A` context and `sed -n '<line>,<line>p'` to pull targeted excerpts.
5. Keyword grep inside rollout files:
   - Gate-specific terms (commit-specific list given in the per-commit prompt).
   - Language tip: **user often writes in Hungarian**. Include Hungarian frustration terms (`konvergál`, `nem konvergál`, `kör`, `mégis`, `megint`, `újra előjön`, `refactor`, `bontás`, `ez így nem fog menni`) alongside English ones (`round`, `P1`, `not converging`, `keeps coming back`, `let's split`).
6. **Bubble transcript archive**: `~/.pairflow/archive/<repo_key>/bi_<ULID>_<hex>/` per instance. Each dir contains:
   - `bubble.toml` — the original human-readable bubble id (field `id`), instance id, branch name
   - `archive-manifest.json` — `archived_at`, `repo_path`, `bubble_id`, list of archived files
   - `state.json` — final state (`DONE`/`CANCELLED`/…) and final round count
   - `transcript.ndjson` — full message log (agent emits, inbox, human answers, etc.)
   - `inbox.ndjson` — human/agent messages
   - `artifacts/` — task.md, findings, etc.
   - A master `~/.pairflow/archive/index.json` maps instance ids to metadata.
   - Lookup by bubble id: `rg -l '^id = "<bubble-id>"' ~/.pairflow/archive/*/bi_*/bubble.toml` (there may be multiple instances — follow-ups, restarts).
7. **Live watchdog trail** also exists: `/Users/felho/dev/pairflow/.pairflow/runtime/watchdog-history/<bubble>.ndjson`. Useful for round counts and state transitions even if the full archive is gone.
8. When a bubble name appears in the authoring session, pull its state + round count + last few `transcript.ndjson` entries to characterize the failure pattern. Do not paste entire transcripts.

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
- Time window: `<session_meta.timestamp>` → `<last message timestamp>`
- User prompt count / agent message count: `<N user / M agent>`

**Verbatim quotes** (every quote MUST be copy-pasted from the rollout file with the JSONL line number; mark speaker; prefer user quotes for the "why"; if originally in Hungarian, give the Hungarian text AND a concise English paraphrase after):

  > [user, line 124] "<exact Hungarian>"
  > *(EN)* "<short paraphrase>"
  > [agent, line 863] "<exact quote>"

**Session content vs commit content delta:**
<Explicitly note if the gate as discussed differs from the committed text (e.g. "5 axes in session, 6 axes in commit"). If no delta, write "matches".>

**Incident evidence (bubble):**
- Bubble id (from session): `<name or n/a>`
- Archive instance(s) found: `<path(s) to ~/.pairflow/archive/.../bi_...>` or `n/a (not archived / not found)`
- Final state + final round: `<e.g. CANCELLED at round 12>` or `n/a`
- Characterization of non-convergence (1-3 bullets from state/transcript — what kept coming back):
  - <bullet>
  - <bullet>
- Watchdog history (if archive missing): `<path to .ndjson or n/a>`

**Problem solved (synthesized, in the user's framing):**
<2-3 sentences paraphrasing the user's own words from the authoring session. Do NOT invent reasoning the user did not state.>

**Related prior sessions (if the frustration built up over multiple runs):**
- `<path>` — <one-line relevance>

**Gaps / uncertainty:**
<Explicit. Examples: "Authoring session not found within 24h window." / "Bubble named in session not found in archive." / "Agent proposed the gate text; user framing of the underlying problem is short — extrapolated meaning flagged below.">
```

### Quote-discipline rules (strict)

1. Every quote in the `Verbatim quotes` block MUST come from an `rg -n` match on the exact rollout file cited. Include the line number. No paraphrasing inside the quote block — paraphrases go in the "Problem solved (synthesized)" section.
2. Always label the speaker (`[user]` or `[agent]`). The rollout uses `event_msg.payload.type` = `user_message` / `agent_message` to distinguish.
3. If the language is Hungarian, keep the original text verbatim and add an English paraphrase prefixed with `*(EN)*`.
4. If unable to produce a verbatim quote that is both on-topic and under ~3 lines, say so in `Gaps / uncertainty` instead of padding with synthesized text.

### Incident-evidence discipline (strict)

1. Any claim about bubble findings — P-level severity, round-by-round finding counts, finding categories, convergence detail — MUST be backed by a direct citation to a file and line inside the bubble archive (e.g. `transcript.ndjson:L<N>`, `inbox.ndjson:L<N>`, `artifacts/<file>:L<N>`) or `watchdog-history/<bubble>.ndjson:L<N>`.
2. If the bubble archive does not contain explicit finding-level records (no `FINDING` type, no `severity` field, no round-by-round issue counts), the `Characterization of non-convergence` section must only state what the available records actually support — typically: final state, final round count, timeline of high-level events (`TASK` / `PASS` / `CONVERGENCE` / `APPROVAL_REQUEST` / `APPROVAL_DECISION`), target-file scope. Do NOT infer specific P-level counts or finding categories that are not directly recorded.
3. "The user said there were ~N rounds" is an indirect signal, not a substitute for archive evidence. If the user's framing and the archive record disagree (e.g. user says "20-30 rounds", archive says round 4), record both under `Gaps / uncertainty`.

### Output fidelity rules (strict)

1. The `Output Section Template` in this plan is normative. The subagent MUST copy the exact structure (headers and `**labels:**`) verbatim, only filling the `<placeholders>`. Do not rename, reorder, or add sibling sections (e.g. no "Core Content", no "Lineage Validation", no "Motivation Type" — use the provided sections).
2. The final response consists of exactly two blocks: (a) the filled template, (b) the `## Methodological Notes` section. No preamble, no trailing summary, no extra headers.

## Subagent Prompt Template

The caller will substitute the `<PLACEHOLDERS>` with commit-specific values. Keep the body self-contained (subagent starts cold, without conversation context).

> **Task:** Investigate the context behind one specific commit to the CreatePairflowSpec skill by finding (a) the Codex authoring session where the change was discussed, and (b) any archived Pairflow bubble whose non-convergence motivated it.
>
> **Commit under investigation:**
> - Hash: `<HASH>`
> - Timestamp: `<YYYY-MM-DD HH:MM:SS +TZ>` (`<HH:MM UTC>`)
> - Commit message: `<MESSAGE>`
> - Files changed (from `git show --stat`):
>   `<LIST>`
> - One-paragraph diff summary from the caller: `<SUMMARY>`
>
> **User context (important; subagent must absorb this):**
> The workflow is: generate task file → run task refinement bubble over multiple rounds. A typical trigger for a skill change is a bubble **not converging** — round after round it keeps surfacing P1 findings. The user does not think "the bubble did X wrong"; the user thinks "the current approach is not converging, something is structurally off". The user then has a reflective conversation with Codex, and the conversation often ends in a plan/skill change that becomes the commit. Sometimes the discussion is proactive design rather than reactive fix. Two projects are in scope: `pairflow` (`/Users/felho/dev/pairflow/`) and `precedens.ai` (worked on via `/Users/felho/dev/make-it-legal/.pairflow-worktrees/precedens.ai/...`). User often writes in Hungarian.
>
> **Deliverable:** Fill the "Output Section Template" from `docs/spec-skill-evolution-plan.md` with your findings, following the "Quote-discipline rules" strictly. Return only the filled template + a short "Methodological Notes" section.
>
> **Search method:**
>
> **CRITICAL tool gotcha (must read first):** `~/.codex/.gitignore` sets `*` (ignore all) with a narrow whitelist that does NOT cover `sessions/`. Every `rg` that walks a directory under `~/.codex/` MUST include `--no-ignore` (or `rg -uuu`). Without it, `rg` returns zero hits even when matches exist, because it treats the rollout files as gitignored. Direct file-path `rg <pattern> <abs-path.jsonl>` works without the flag. `grep -r` works too but is slower. When in doubt, sanity-check with `rg --no-ignore -c '"type":"session_meta"' <dir>` and confirm the count matches `ls <dir> | wc -l`.
>
> 1. Find Codex session candidates:
>    - `~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl` for the commit day and the day before.
>    - Enumerate cwd of each rollout in the day: `rg --no-ignore -n '"type":"session_meta"' ~/.codex/sessions/<YYYY>/<MM>/<DD>/ | head -100` then extract the cwd field.
>    - Filter to `cwd` containing `pairflow`, `precedens.ai`, or `make-it-legal`.
>    - Start window: commit-timestamp minus 8 hours. Widen to 24h / earlier days only if nothing relevant found.
> 2. Identify the authoring session by `rg --no-ignore` searches on candidate JSONL files (directory form) or `rg` on a specific file path:
>    - Commit-specific keywords: `<KEYWORDS>`
>    - Frustration signals (English): `not converging`, `keeps coming back`, `round`, `P1`, `let's split`, `refactor-first`.
>    - Frustration signals (Hungarian): `nem konvergál`, `konvergál`, `kör`, `mégis`, `megint`, `újra előjön`, `bontás`, `ez így nem megy`.
>    - Use `rg -n` so you always capture line numbers.
> 3. Extract quotes (strict rules):
>    - Every quote MUST be copy-pasted from an `rg -n` match, with the line number cited.
>    - Distinguish `user_message` vs `agent_message` (via `event_msg.payload.type` in the JSONL).
>    - Prefer user quotes for the "why"; agent quotes are secondary (label them).
>    - If Hungarian, keep original verbatim, then add `*(EN)*` paraphrase.
>    - If you cannot produce a verbatim on-topic quote under ~3 lines, omit it and note the gap — do not fabricate or paraphrase inside a quote block.
> 4. Detect session-vs-commit delta (MANDATORY, do not skip):
>    - Run `git show <HASH> -- .claude/skills/CreatePairflowSpec/` yourself to read the actual committed content. The caller's diff summary is a convenience, not the source of truth.
>    - Extract the concrete list of names/concepts introduced in the session (axis names, field names, scoring bands, keywords the user or agent explicitly wrote).
>    - Extract the concrete list of names/concepts committed (from your own `git show`).
>    - List BOTH lists side by side in your response. Only write "matches" when the names themselves align — not merely when the counts align. A session that introduced concept X under one name and a commit that lands concept Y under a different name is a delta, not a match.
>    - If there is a **second** session between the first discussion and the commit (e.g. a refinement session), try to locate it and note it under "Related prior sessions".
> 5. Locate bubble archive (if a bubble name or instance id appears in the session):
>    - `rg -l '^id = "<bubble-id>"' ~/.pairflow/archive/*/bi_*/bubble.toml` — multiple instances possible (restarts, follow-ups).
>    - Alternatively use `~/.pairflow/archive/index.json` if helpful.
>    - Read `state.json` for final state + round count; scan the last ~50 entries of `transcript.ndjson` for recurring finding patterns; use `inbox.ndjson` for human gates and emits.
>    - If archive missing, check `/Users/felho/dev/pairflow/.pairflow/runtime/watchdog-history/<bubble>.ndjson`.
> 6. Do NOT read whole rollout files (they can be 1–90 MB). Use `rg --no-ignore -n -B 2 -A 10` for directory walks and `sed -n 'L1,L2p'` for pinpointed ranges (sed does not need the flag).
>
> **Methodological Notes section** (append after the filled template):
> - Was the 8-hour window sufficient? How wide did you widen?
> - Which keywords hit; which were noise?
> - Any structural notes that would speed up future runs (e.g. reliable markers in the session, patterns in bubble archive naming)?
> - Surprises or dead ends.
>
> **Response budget:** Under 700 words for the entire response.
>
> **Absolutely forbidden:**
> - Fabricating quotes or paraphrasing inside a `>` quote block.
> - Asserting a bubble's P-level issues without citing transcript/state lines.
> - Mixing user framing with agent framing — label everything.

## Commit Progress Tracker

| Status | Date | Hash | Title | Gate-specific keywords for search |
|--------|------|------|-------|-----------------------------------|
| [retry] | 2026-04-05 | `01ecf168` | Add Complexity Risk Gate (1st pass had fabricated quotes — rerunning with hardened prompt) | `complexity risk`, `Task Risk Gate`, `risk_score`, `authority_risk`, `surface_spread`, `identity_join_risk`, `activation_coupling`, `prerequisite_risk`, `acceptance_multiplicity`, `foundation -> delivery`, `refactor-first`, `boundary-kockázat` |
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
