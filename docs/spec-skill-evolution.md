# CreatePairflowSpec Skill Evolution

Research log documenting the context behind each gate/rule added to `.claude/skills/CreatePairflowSpec/` between 2026-04-05 and 2026-04-16. Each section captures the triggering bubble (if any), the authoring Codex session, verbatim quotes from that session, the concept-level delta between session and commit, and a synthesis of the problem solved.

Status: historical research log
Owner: Pairflow core
Scope: provenance for CreatePairflowSpec skill-rule changes from 2026-04-05 through 2026-04-16.

The temporary research plan that produced this log has been retired. The durable methodology is preserved below so this document remains self-contained.

---

## Methodology

Each section below was produced from the same evidence discipline:

1. Read the committed diff for the relevant skill change first, using `git show <hash> -- .claude/skills/CreatePairflowSpec/`.
2. Derive the "what changed" summary only from that commit, not from the current skill state.
3. Locate the authoring Codex session in `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`, usually within eight hours before the commit and widened only when necessary.
4. Prefer user wording for the problem framing and label agent-proposed solution text as agent voice.
5. If the session names a Pairflow bubble, inspect the archived bubble state/transcript under `~/.pairflow/archive/<repo_key>/bi_*/` and cite only what the archive directly supports.
6. Record deltas between session discussion and committed text instead of smoothing them over.
7. Mark gaps explicitly when the authoring session, bubble archive, or finding-level data is missing.

Operational search note: `~/.codex/.gitignore` ignores sessions by default, so directory searches under `~/.codex/sessions/**` must use `rg --no-ignore` or `rg -uuu`.

The output shape for each entry is: commit message, committed diff summary, authoring session, selected quotes, session-vs-commit delta, incident evidence, synthesized problem solved, related prior sessions, and known uncertainty.

---

## 2026-04-05 — `01ecf168` — Complexity-Risk Gate

**Commit message:** docs: add complexity risk gate to CreatePairflowSpec

**What it introduced (from diff):**
New `Complexity-Risk-Gate.md` reference document (116 lines) defining a five-axis risk scoring framework: `authority_risk`, `surface_spread`, `activation_coupling`, `prerequisite_risk`, `acceptance_multiplicity`. Each axis scored `0|1|2`, with total bands `0-3` (single task OK), `4-6` (split strongly recommended, prefer `Plan -> Task`), `7-10` (refactor-first split mandatory), plus four hard-stop rules. Split vocabulary: `foundation` (or `authority refactor`) → `feature delivery` → `activation` (or `rollout`). Integrated into `SKILL.md`, task/plan templates, and both `CreateTask` and `CreatePlan` workflows.

**Authoring session:**
- File: `/Users/felho/.codex/sessions/2026/04/05/rollout-2026-04-05T16-27-23-019d5e0a-8dcf-7620-af10-25d962cc91c3.jsonl`
- Session id: `019d5e0a-8dcf-7620-af10-25d962cc91c3`
- `cwd`: `/Users/felho/dev/pairflow`
- Time window: `2026-04-05T14:27:29.349Z` → `2026-04-05T15:22:47.457Z` (≈55 minutes, ending ~2 minutes before the commit)
- User prompt count / agent message count: 11 user / 62 agent

**Verbatim quotes**

> [user, line 670] "So what I noticed is that this is probably the 20th to 30th rounds where we do the same: let's find some issues, fix it, let's find some issues, fix it. And maybe we are just a few rounds left from being perfect. But usually when this happens, it's a sign of unmanageable complexity, some kind of architecture issue, or just the task being too ambitious. Maybe we should have done some kind of refactoring before we add this new feature. [...] But right now what I see is that we changed a huge amount of files and we just keep running into issues."

> [agent, line 863] "Nem az a bajjel, hogy sok fájl változik. Az a bajjel, hogy egy task egyszerre akar: - új canonical source-of-truthot bevezetni, - erre rögtön új runtime behavior-t építeni, - és ezt több surface-en egyszerre megjeleníteni. Ez volt itt is a minta. [...] Én egy egyszerű `Task Risk Gate`-et vezetnék be, 5 tengellyel."
>
> *(EN)* "The problem isn't that many files change. The problem is that a task wants to do all at once: introduce a new canonical source-of-truth, immediately build new runtime behavior on top of it, and surface it across multiple layers simultaneously. That was the pattern here too. [...] I would introduce a simple Task Risk Gate with 5 axes."

**Session content vs commit content delta:**

```
Session-side (from agent_message rollout:L863):
- Axes (5): Authority risk, Surface spread, Activation coupling, Prerequisite risk, Acceptance multiplicity
- Scoring: 0-2 per axis (0 alacsony, 1 közepes, 2 magas)
- Bands: 0-3 mehet egy task | 4-6 split strongly recommended | 7-10 kötelező refactor-first
- Hard stops: 4 rules (new canonical object + runtime behavior; 3+ surfaces simultaneously; future-milestone-gated behavior; multiple authority paths for same decision)
- Split order: foundation → behavior → activation / UI rollout
- Output fields to record: risk_score, authority_change, feature_activation, surface_count, prerequisite_boundaries, acceptance_goals

Commit-side (from `git show 01ecf168 -- .claude/skills/CreatePairflowSpec/references/Complexity-Risk-Gate.md`):
- Axes (5): authority_risk, surface_spread, activation_coupling, prerequisite_risk, acceptance_multiplicity
- Scoring: 0|1|2 per axis
- Bands: 0-3 single task OK | 4-6 split strongly recommended | 7-10 refactor-first mandatory
- Hard stops: 4 rules (same conditions)
- Split order: foundation (or authority refactor) → feature delivery → activation (or rollout)
- Output fields at risk_score >= 4: risk_score, authority_change, surface_count, feature_activation, prerequisite_boundaries

Match analysis:
- Axis count: 5 = 5 ✓
- Axis names: align (Title Case → snake_case; cosmetic only) ✓
- Scoring: 0-2 ≡ 0|1|2 ✓
- Bands: identical (0-3 / 4-6 / 7-10) ✓
- Hard stops: 4 vs 4, same conditions ✓
- Split order: identical in essence (commit adds parenthetical aliases "or authority refactor", "or rollout") ✓
- Output fields: commit drops `acceptance_goals` — absorbed into the `acceptance_multiplicity` axis rather than tracked as a separate output field; no semantic loss.

Verdict: matches on all five axes and the policy structure; one minor drop (`acceptance_goals`) absorbed into axis-level framing.
```

**Incident evidence (bubble):**
- Bubble id (from session): `review-policy-runtime-surface-phase1`
- Archive instance(s) found: `/Users/felho/.pairflow/archive/b8d470bb2ac6be3b/bi_00mnkttf0v_089a8f7d6d8f99b59642/`
- Final state + final round: `CANCELLED at round 4` (`state.json:state`, `state.json:round`)
- Characterization of non-convergence (each backed by a direct archive citation):
  - Round-over-round advisory findings despite passing lint/typecheck/test: R2 `3×P2 + 1×P3`, `advisory_findings_open_total: 4` (`transcript.ndjson:L5` CONVERGENCE payload); R3 `4×P2 + 1×P3`, `advisory_findings_open_total: 5` (`transcript.ndjson:L9`); R4 `3×P2 + 2×P3`, `advisory_findings_open_total: 5` (`transcript.ndjson:L13`).
  - Same classes of issues resurface across rounds: severity comparison fragility (R2, R4 summaries), missing test coverage for `updateBubbleReviewPolicy` happy/empty-patch paths and `reviewPolicy.ts` pure functions (R2, R3, R4 summaries), `ActionBar` policy feedback cleared by `useEffect` on configVersion (R2, R3 summaries) — see `transcript.ndjson:L5,L9,L13` summary fields.
  - Task scope mixed foundation (new `review_policy` canonical authority) + feature delivery (runtime threshold enforcement) + surface spread (config, write, routing, read projection, UI) in one bubble, matching the user's framing at `rollout:L670`: "we changed a huge amount of files and we just keep running into issues".
- Watchdog history: `/Users/felho/dev/pairflow/.pairflow/runtime/watchdog-history/review-policy-runtime-surface-phase1.ndjson` (supplementary, not the primary evidence source).

**Problem solved (synthesized, in the user's framing):**
After four rounds of the `review-policy-runtime-surface-phase1` bubble still surfacing repeated P2 advisory findings in recurring categories, the user recognized the issue as structural rather than incremental — the task was simultaneously introducing a new canonical authority, activating new runtime behavior on top of it, and spreading the concept across multiple surfaces (config, write, routing, read, UI). The gate formalizes this pattern into five orthogonal risk axes that must be scored before a task enters a bubble, forcing split decisions upfront rather than discovering scope problems through round-after-round rework.

**Related prior sessions:**
None found within the 8-hour pre-commit window. The authoring session itself contains both the diagnosis and the gate design in a single sitting.

**Gaps / uncertainty:**
- The user's "20th to 30th rounds" framing (rollout:L670) does not align numerically with the archive record of 4 rounds for this specific bubble. The user is likely aggregating across multiple refinement attempts (and possibly earlier related bubbles); this specific archive shows 4 codex+claude rework rounds.
- The bubble archive's `transcript.ndjson` has no dedicated `FINDING` message type; advisory findings live inside `CONVERGENCE` payload `findings[]` arrays, so characterization is based on `summary` and `findings[]` fields in each round's CONVERGENCE message.

---

## 2026-04-10 — `ca22d258` — Complexity Gate Tightening (`identity_join_risk` axis)

**Commit message:** skills: tighten CreatePairflowSpec complexity gate

**What it introduced (from diff):**
Inserts a new risk axis `identity_join_risk` ("Identity / Join Fragility") as axis #3 in the Complexity-Risk Gate, growing the gate from 5 axes to 6. Expands the total score range `0-10` → `0-12` and rebalances bands `0-3 / 4-6 / 7-10` → `0-4 / 5-7 / 8-12`. Adds a 5th hard-stop rule and a brand-new "Escalation Rules Below Hard-Stop" section with three escalation rules. Also adds a policy point in `SKILL.md` (default to split when public contract/UI consume + fragile identity matching), an `identity_join_risk` entry in the Minimum Contract Rules, a new "Identity/join note" block in the task template, and matching guidance in both `CreatePlan` and `CreateTask` workflows.

**Authoring session:**
- File: `/Users/felho/.codex/sessions/2026/04/10/rollout-2026-04-10T22-38-29-019d791e-1c35-7b92-b0c3-6ab491e3d26d.jsonl`
- Session id: `019d791e-1c35-7b92-b0c3-6ab491e3d26d`
- `cwd`: `/Users/felho/dev/make-it-legal/precedens.ai`
- Time window: `2026-04-10T20:38:29.699Z` → `2026-04-11T07:57:43.138Z` (≈11 hours; the commit at 21:18 UTC lands mid-session)
- User prompt count / agent message count: 18 user / 102 agent

**Verbatim quotes**

> [user, line 352] "So before we do that, we have this complexity risk gate in the task file. So can you please locate in the use pairflow skill how that one is constructed and what I'm curious about? So based on this experience and learning related to this task file, I'm very curious whether that complexity risk gates should be improved or not. Because right now what I see is that the risk score is 5. But it's team that we still run into some kind of complexity issue, probably this is something which is not yet fully considered, so please check that part of the scale and think about whether we should improve it or not."

**Session content vs commit content delta:**

```
Session-side trigger (from user_message rollout:L352):
- Observed risk_score: 5 (in the then-current 4-6 "split strongly recommended" band)
- Claim: task "still runs into some kind of complexity issue" despite the existing 5-axis gate
- Request: review and improve the gate

Pre-commit gate (the old 01ecf168 state):
- Axes (5): authority_risk, surface_spread, activation_coupling, prerequisite_risk, acceptance_multiplicity
- Score range: 0-10
- Bands: 0-3 single task OK | 4-6 split strongly recommended | 7-10 refactor-first mandatory
- Hard stops: 4 rules
- Escalation rules: none

Post-commit gate (from `git show ca22d258 -- .../Complexity-Risk-Gate.md`):
- Axes (6): authority_risk, surface_spread, identity_join_risk (NEW, inserted as #3), activation_coupling, prerequisite_risk, acceptance_multiplicity
- identity_join_risk scoring: 0|1|2
  - 0: no cross-seam identity matching
  - 1: one stable cross-seam mapping, but consumer correctness depends on it
  - 2: multiple identifier forms / legacy+new seams / competing mappings
  - Domain examples committed inline: Stripe invoice id → local authority row; payment_intent vs invoice id vs vendor id reconciliation; legacy payload identity vs new canonical authority identity
- Score range: 0-10 → 0-12 (because of the new 6th axis)
- Bands: 0-3/4-6/7-10 → 0-4/5-7/8-12
- Hard stops: 4 → 5 (new #5: "task mixes contract cutover and UI consume cutover while the primary consumer depends on fragile identity matching")
- Escalation rules: 0 → 3 (new section "Escalation Rules Below Hard-Stop"):
    1. surface_spread = 2 and acceptance_multiplicity >= 1
    2. identity_join_risk = 2 and surface_spread >= 1
    3. authority_risk >= 1 and identity_join_risk >= 1 and public payload/UI consume changes
- Template addendum: Task template gains "Identity/join note" block (canonical identity path, competing/fallback identities)
- Workflow addenda: CreatePlan adds "isolate authority/read-model seam before UI/payload cutover when identity_join_risk >= 1"; CreateTask adds a blocker "if identity_join_risk >= 1, task must state the matching seam and forbidden fallback identities" and a split-preference policy
- SKILL.md policy rule #7 (new): default to split even below the top score band when public contract/UI consume + fragile identity matching

Match analysis:
- The session-side input is the user's observation that risk_score=5 passed the old gate yet still led to a non-converging bubble — i.e. the existing 5 axes did not penalize the fragility that caused the failure.
- The commit's response is a structural addition (new axis + new hard-stop + new escalation rules + band rebalance), not a rename or a drop.
- No concept present in the session is missing from the commit. The commit adds concepts the session did not yet have names for — these were synthesized during the session (see `Gaps`).

Verdict: structural extension (not a matches / non-matches call). Every change in the commit is directly motivated by the session's diagnosis of the `bci3-impl` failure; the commit adds the missing concept the session identified was needed.
```

**Incident evidence (bubble):**
- Bubble id (from session): `bci3-impl`
- Archive instance(s) found: `/Users/felho/.pairflow/archive/be2ac5d87a57bdcc/bi_00mntathfz_b3df49791cc3bada749e/`
- Final state + final round: `CANCELLED at round 2` (`state.json:state`, `state.json:round`).
- Bubble repo: `/Users/felho/dev/make-it-legal/precedens.ai` (`bubble.toml:repo_path`); artifact type `code` (`bubble.toml:review_artifact_type`).
- Characterization of non-convergence (each backed by a direct archive citation):
  - R2 `CONVERGENCE` surfaced `4×P2 + 1×P3` advisory findings (`transcript.ndjson:L5`, `advisory_findings_open_total: 5`). The five finding titles: `hasDependencyFailure scope couples seat API failures to billing fail-closed`; `BillingManualTransferLifecycleCard critical render branches uncovered`; `settlement_ops.source_kind yearly fallback detection path untested`; `resolveBillingDocumentStatusCopy send_failed+openUrl and created branches untested`; `suppressRecoveryPrimaryAction not asserted for annual_manual_transfer`.
  - Task scope bundled authority contract (Stripe/Billingo invoice bridge) + runtime activation + UI consume (`BillingManualTransferLifecycleCard` render branches, `resolveBillingDocumentStatusCopy`) + fallback logic (`settlement_ops.source_kind yearly`) across multiple seams — the exact pattern the new hard-stop #5 and escalation rule #3 target.
  - Event types observed in `transcript.ndjson`: `TASK`, `PASS`, `CONVERGENCE`, `APPROVAL_REQUEST` (no `APPROVAL_DECISION`), consistent with user-initiated cancellation after round 2 rather than an approval / rework cycle.
- Watchdog history: n/a — no separate `watchdog-history/<bubble>.ndjson` for this bubble; findings fully contained in archive `transcript.ndjson`.

**Problem solved (synthesized, in the user's framing):**
After the `bci3-impl` bubble on precedens.ai billing integration failed to converge at round 2 despite having passed the existing complexity-risk gate with `risk_score = 5`, the user recognized that the gate missed a specific failure axis: the task bundled a Stripe/Billingo invoice bridge, `payment_intent`-vs-invoice-id mapping, legacy vendor reconciliation, and UI consume paths that depended on all those identities aligning correctly. The old 5-axis gate had no way to price this cross-seam identity fragility. The commit introduces `identity_join_risk` as a dedicated axis, along with a matching hard-stop and three sub-hard-stop escalation rules, to force split-before-implementation decisions whenever identity matching is fragile.

**Related prior sessions:**
None found within the 8-hour pre-commit window; the authoring session itself contains both the diagnosis and the gate redesign. Bubble `bci3-impl` was in-flight during the session — the skill change was a direct response rather than a delayed reflection across multiple Codex sessions.

**Gaps / uncertainty:**
- The session is 4.6 MB; full transcript not exhaustively read. The specific messages where the agent proposes the `identity_join_risk` axis name and the three escalation rules were not individually line-cited. The verdict that the commit's new concepts were synthesized during the session rests on the commit timestamp falling mid-session (21:18 UTC, between 20:38 start and 07:57 end) combined with the user's explicit request at line 352 to review and improve the gate.
- The Stripe / `payment_intent` / Billingo domain examples in the committed reference file are strongly consistent with a billing-integration bubble, and `bci3-impl` is a billing-integration bubble on precedens.ai — but no direct line in the archive explicitly links the committed example text to this specific bubble. The link is contextual (session cwd, bubble scope, finding titles, timing) rather than quoted.
- `round_role_history` timestamps in `state.json` were not spot-verified; the exact gap between bubble start and session start is not confirmed in this appendix.

---

## 2026-04-11 — `bdd4646f` — Control-Model Readiness Gate

**Commit message:** skills: harden CreatePairflowSpec control model gating

**What it introduced (from diff):**
Adds a brand-new `Control-Model Readiness Gate` (mandatory) across the skill, with a new 156-line reference `references/Control-Model-Readiness-Gate.md` defining six required answers when the gate applies: `business_invariant`, `control_model`, `read_path_rule`, `forbidden_fallback`, `missing_data_rule`, `phase_boundary`. Hardens anti-heuristic policy ("never invent a control model, fallback rule, or missing-data behavior just to make the artifact look implementable"; "do not convert missing control-model decisions into clever technical seams"). Adds 4 new Core Principles (10-13) and 3 new Minimum Contract Rules (14-16) to `SKILL.md`. Extends PRD / Plan / Task templates with matching sections (PRD: `Business Invariants` + `Control Model`; Plan: `Guiding Principles`; Task: `Domain / Control Model`). Updates all three workflows (`CreatePRD`, `CreatePlan`, `CreateTask`) with the gate as a new step before implementation-level design.

**Authoring session:**
- File: `/Users/felho/.codex/sessions/2026/04/11/rollout-2026-04-11T20-06-00-019d7db8-ddf1-74c0-b59c-89f27be0d220.jsonl`
- Session id: `019d7db8-ddf1-74c0-b59c-89f27be0d220`
- `cwd`: `/Users/felho/dev/pairflow`
- Time window: `2026-04-11T18:06:00.691Z` → `2026-04-11T18:32:59.196Z` (≈27 minutes; commit at 18:23 UTC, 17 minutes after session start and 10 minutes before session end).
- User prompt count / agent message count: 2 user / 7 agent.
- Session type: **review-only**. The skill changes were already written to disk as uncommitted edits *before* the session started; the user opened the session to ask for a consistency review, not to co-design the gate.

**Verbatim quotes**

> [user, line 7] "So there are some uncommitted changes related to the createPerflowSpecSkill. So please review those changes and I'm very curious whether you see you can have general comments, please have an eye on whether the new changes are consistent, etc."

> [agent, line 33] "A diff alapján a fő változás egy új, kötelező `Control-Model Readiness Gate` bevezetése a skill egészében. Most azt ellenőrzöm, hogy ez mindenhol ugyanazzal a jelentéssel szerepel-e, és hogy a template-ek tényleg lefedik-e azt, amit a workflow-k már megkövetelnek."
>
> *(EN)* "Based on the diff, the main change is introducing a new mandatory `Control-Model Readiness Gate` across the skill. I'm now checking whether it carries the same meaning everywhere, and whether the templates actually cover what the workflows already require."

**Session content vs commit content delta:**

Because this is a **review-only session** (the skill diff already existed on disk when the session opened), the usual "session-introduced concept → committed concept" alignment does not apply. The relevant comparison here is **review-identified issues → commit final state as merged**.

```
Pre-session state (uncommitted edits on disk, pre-review):
- New gate conceptually present, but with structural inconsistencies (per agent review during session)

Review-identified structural issues (from agent review across the 7 agent messages):
- CreateTask gate placement vs the skill's own "context-first" principle
- Task template coverage of L1 implementation clarity
- PRD workflow marking control-model as "when applicable" vs PRD template mandating the sections

Commit-side final state (from `git show bdd4646f -- .claude/skills/CreatePairflowSpec/`):
- Gate definition in SKILL.md (Core Principles 10-13, Minimum Contract Rules 14-16)
- 6-answer gate mechanics in the new reference file
- CreateTask: gate at step 0a, Complexity-Risk Gate moved to 0b; context-first retained at steps 1+; Required Blockers #9-10 for control-model blockers
- CreatePlan: gate at 1a, Complexity-Risk Gate moved to 1b; new policy #6 on ambiguity → close control model before delivery
- CreatePRD: gate at 1a with "when applicable" gating; PRD template's new sections are structural but the workflow treats them as conditional
- All three templates gain dedicated control-model sections

Verdict: the commit represents the final state *after* the user read the session's review feedback. The 3 structural items the agent flagged during review were either resolved in the diff before commit, or the user accepted them as-is. This appendix cannot precisely attribute which flagged items changed which lines of the pre-commit diff, because the pre-session uncommitted diff was not captured anywhere.
```

**Incident evidence (bubble):**
- Bubble id (from session): `n/a` — this is a skill-review session, not a bubble-triggered reflection.
- Archive instance(s) found: `n/a` directly from this session.
- Final state + final round: `n/a`.
- Characterization of non-convergence: `n/a` for this specific session. The underlying motivation is almost certainly the billing-integration bubbles from the prior 24–48 hours on precedens.ai (`bci3-impl` CANCELLED per the `ca22d258` section above; `bci3a-impl` DONE at round 2 per `/Users/felho/.pairflow/archive/be2ac5d87a57bdcc/bi_00mnunonm9_d808cdfafaf5b5dd5d2c/state.json:state`), but the linkage is contextual rather than quoted in this session.
- Watchdog history: `n/a`.

**Problem solved (synthesized, in the user's framing):**
Between 2026-04-10 and 2026-04-11, several precedens.ai billing-integration bubbles (`bci3-impl`, `bci3a-impl`) exposed a failure mode not captured by the existing gate suite: specs that described *what* the product wants without pinning down *what controls* the decision — leaving authority/read-path/missing-data behavior implicit and allowing round-after-round drift once implementation started. Offline, the user drafted a new Control-Model Readiness Gate with 6 explicit required answers and integrated it across SKILL.md, templates, and workflows, then opened this short Codex review session to check the diff for internal consistency before committing. The commit reflects that review's adjustments.

**Related prior sessions:**
- `/Users/felho/.codex/sessions/2026/04/10/rollout-2026-04-10T22-38-29-019d791e-...jsonl` — the `ca22d258` authoring session (20:38 UTC 2026-04-10 → 07:57 UTC 2026-04-11). Ended ~10h before this review session. Contained the `bci3-impl` diagnosis that likely informed the control-model gate design authored offline between the two sessions.
- A parallel precedens.ai session `rollout-2026-04-11T20-37-44-019d7dd5-...jsonl` starts 14 minutes **after** this commit (18:37 UTC 2026-04-11), cwd `/Users/felho/dev/make-it-legal/precedens.ai` — user returned to billing-integration work immediately after committing the skill change. Not a prior session, but a contextual neighbor worth noting.

**Gaps / uncertainty:**
- No pre-session diff was captured anywhere the main conversation can inspect. The exact shape of the uncommitted edits at session-open time vs the final committed state cannot be reconstructed from the archive; the 3 review-identified structural issues are therefore a summary of agent feedback, not a precise "before/after" diff.
- The session transcript was not exhaustively line-cited for the 3 structural issue descriptions; the summary is derived from the subagent's read of the 7 agent messages rather than individual quoted lines with numbers. This is the main fidelity gap for this section relative to the plan's quote-discipline.
- The contextual link to `bci3-impl` / `bci3a-impl` failure patterns is inferred from the commit timing, the Stripe/billing/settlement domain examples embedded in the new reference, and the parallel precedens.ai session that opens minutes after commit — but this session itself does not quote bubble names or P-level findings.

---

## 2026-04-11 — `8b57b962` — Authority Fan-out Scan (generalized authority sequencing)

**Commit message:** docs: generalize CreatePairflowSpec authority sequencing guards

**What it introduced (from diff):**
Adds a new mandatory `Authority Fan-out Scan` gate with six generic authority buckets (`authority_producer`, `persisted_authority`, `internal_execution_consumers`, `workflow_orchestration_consumers`, `read_model_consumers`, `cleanup_recovery_consumers`). Expands `phase_boundary` from a single free-form field to seven named closures (contract / producer / internal_execution / workflow_orchestration / read_model / activation / cleanup_recovery). Adds a new `Shared Contract Compatibility Gate` in the `CreateTask` workflow with required current-consumer inventory and additive-vs-breaking classification. Adds three new `SKILL.md` Core Principles (14-16: producer-first, shared-contract inventory, minimum viable sequencing), extends Minimum Contract Rules (14-20) with authority-fan-out / shared-contract / `Phase Ownership Grid` / `Authority Boundary Map` requirements. Templates gain `Authority Fan-out Scan` and `Phase Ownership Grid` (plan) and `Authority Boundary Map` (task). Terminology rename across the skill: "public-consume" → "multi-consumer".

**Authoring session:**
- File: `/Users/felho/.codex/sessions/2026/04/11/rollout-2026-04-11T22-31-39-019d7e3e-3762-7f83-999a-88c69fc9fba6.jsonl`
- Session id: `019d7e3e-3762-7f83-999a-88c69fc9fba6`
- `cwd`: `/Users/felho/dev/pairflow`
- Time window: `2026-04-11T20:31:39.885Z` → `2026-04-11T22:24:07.087Z` (≈113 minutes; commit at 21:48 UTC falls 1h 17min after session start, 36 minutes before session end — mid-session).
- User prompt count / agent message count: 18 user / 84 agent.
- Session type: **authoring** — user opens with a non-convergence frustration (line 284), agent diagnoses the structural blind spot (line 458), user iteratively steers the gate design including an explicit domain-agnostic rename at line 621, then commits at line 763.

**Verbatim quotes**

> [user, line 284] "So something is not okay. Keep running to these P1 issues and this is the 10th round. So usually this is the indication of some unanticipated complexity or something is not clear. It's pleasing about whether the goal of this task file or the scope of this task file is correct or not."

> [agent, line 458] "A skill jelenleg túl gyakran 'feature slicing' szemmel bont. Itt viszont 'authority propagation slicing' kellett volna."
>
> *(EN)* "The skill currently slices too often with a 'feature slicing' lens. In this case 'authority propagation slicing' would have been needed instead."

> [user, line 621] "So I see an issue here because some of these items are perflow specific, but the scale is perflow agnostic, so we can use to create any type of task for any type of application. [...] make sure that the way how we improve the scale is perflow agnostic. I mean not perflow as a tool but perflow as a domain, so the skill cannot reference some domain elements of perflow because it should be able to use for any project."

**Session content vs commit content delta:**

```
Session-side (initial agent proposal at rollout:L458 after bubble diagnosis):
- Split vocabulary introduced (explicit list): persisted authority / authority producer / bubble-loop consume / tmux/runtime consume / activation / operator read-model / cleanup / recovery
- Authority bucket names (initial draft agent-suggested): authority_producer, persisted_authority, internal_runtime_consumers, bubble_loop_consumers, operator_read_model_consumers, cleanup_lifecycle_consumers
- Diagnosis framing: "feature slicing" vs "authority propagation slicing" (rollout:L458)

Session-side user steering (rollout:L621):
- Mandate: bucket names MUST be "perflow agnostic" (domain-generic, not pairflow-specific)

Commit-side (from `git show 8b57b962` on the reference + SKILL.md):
- Authority buckets (generic, committed): authority_producer, persisted_authority, internal_execution_consumers, workflow_orchestration_consumers, read_model_consumers, cleanup_recovery_consumers
- `phase_boundary` (7 named closures): contract_closure, producer_closure, internal_execution_closure, workflow_orchestration_closure, read_model_closure, activation_closure, cleanup_recovery_closure
- `Authority Fan-out Scan` gate (mandatory), `Shared Contract Compatibility Gate` (new in CreateTask), `Phase Ownership Grid` (plan template), `Authority Boundary Map` (task template)
- Terminology rename: "public-consume" → "multi-consumer"

Match analysis (names):
- authority_producer: session ↔ commit ✓ identical
- persisted_authority: session ↔ commit ✓ identical
- internal_runtime_consumers → internal_execution_consumers: **renamed** (pairflow-specific "runtime" → generic "execution") per user mandate at L621
- bubble_loop_consumers → workflow_orchestration_consumers: **renamed** (pairflow-specific "bubble-loop" → generic "workflow_orchestration") per L621
- operator_read_model_consumers → read_model_consumers: **shortened** (pairflow-specific "operator" prefix dropped) per L621
- cleanup_lifecycle_consumers → cleanup_recovery_consumers: **renamed** (domain-generic "recovery" instead of pairflow-specific "lifecycle") per L621
- Split vocabulary: session listed 8 stages; commit landed 7 named closures under `phase_boundary` (the session's "tmux/runtime consume" + "operator read-model" collapsed into `workflow_orchestration_closure` + `read_model_closure`).

Verdict: **structural alignment with explicit domain-agnostic renames**. The agent's initial proposal used pairflow-specific consumer names; the user's line 621 intervention drove every consumer-bucket rename that appears in the commit. No concept dropped; one structural collapse (8 session stages → 7 closures) occurred between session proposal and final commit. The commit names are 1:1 what the user explicitly asked for, not what the agent initially proposed.
```

**Incident evidence (bubble):**
- Bubble id (from session): `remote-phase1b-docref` (inferred from the "Phase 1B" agent framing at rollout:L458; confirmed via archive lookup).
- Archive instance found: `/Users/felho/.pairflow/archive/b8d470bb2ac6be3b/bi_00mnup5jii_96e154efb80daf76218f/`
- Final state + final round: `CANCELLED at round 3` (`state.json:state`, `state.json:round`).
- Bubble repo: `/Users/felho/dev/pairflow` (`bubble.toml:repo_path`); artifact type `document` (docs-only refinement of a remote-execution design task).
- Characterization of non-convergence (each bullet backed by an archive citation):
  - Transcript has 12 lines with event types `TASK / PASS / CONVERGENCE / APPROVAL_REQUEST / APPROVAL_DECISION` (same high-level structure as the earlier `bci3-impl` and `review-policy-runtime-surface-phase1` archives). No dedicated `FINDING` type — advisory findings live inside `CONVERGENCE` payloads, consistent with the archive schema seen in earlier sections of this document.
  - `state.json:round_role_history` records 3 codex+claude rework rounds before the user-initiated cancellation.
  - User's own framing at rollout:L284 ("10th round") is higher than the archive's round count (3 in this bubble); the user is likely aggregating across the full refinement-plus-implementation attempt chain and/or adjacent phase-1 bubbles. The archive round count and the user-stated round count should both be recorded — they are not a contradiction, they are two viewpoints on the same work.
- Watchdog history: not separately checked for this bubble; the archive `transcript.ndjson` is the primary evidence.

**Problem solved (synthesized, in the user's framing):**
On reaching the 10th round of P1 findings on the Phase 1B docref task, the user concluded the failure pattern was structural rather than incremental. The agent's diagnosis at rollout:L458 is the key: the existing skill was defaulting to "feature slicing" (foundation → delivery → activation) when the scope actually required "authority propagation slicing" — separating who produces canonical authority from each consumer family that reads it. The commit formalizes that diagnosis into a new mandatory `Authority Fan-out Scan` gate with six domain-agnostic authority buckets (per user's line 621 mandate), expands `phase_boundary` into seven explicit closures, and adds a `Shared Contract Compatibility Gate` so shared-interface changes cannot silently drift across consumer families.

**Related prior sessions:**
- `/Users/felho/.codex/sessions/2026/04/11/rollout-2026-04-11T22-46-40-019d7e4b-f389-7103-a7f0-e4d07e77dfc5.jsonl` — starts 20:46 UTC (15 minutes after this session starts), also `cwd=/Users/felho/dev/pairflow`. Overlapping parallel session; not spot-verified as a contributing source in this appendix.

**Gaps / uncertainty:**
- The agent quote at line 458 is much longer than the single-sentence excerpt quoted above. The full message contains the 8-stage split vocabulary ("persisted authority / authority producer / bubble-loop consume / tmux/runtime consume / activation / operator read-model / cleanup / recovery") which is captured in the delta block above rather than the quote block. The quote block deliberately kept a single verbatim sentence to satisfy quote discipline; the broader content is summarized in the `Problem solved` section.
- The `remote-phase1b-docref` transcript's individual `CONVERGENCE` payloads were not line-by-line checked for finding titles in this section (unlike the `ca22d258` / `bci3-impl` section where finding titles were fully enumerated). The round-by-round finding pattern here is asserted by the user at rollout:L284 ("10th round"), not recomputed from `advisory_findings_open_total` per round in the archive.
- The companion session (`019d7e4b-...`) is noted but not analyzed; its role in the skill refinement (if any) is not established.

---

## 2026-04-12 — `ef55d8a1` — Baseline Preservation + `allowed_resolution_path`

**Commit message:** pairflow: tighten baseline preservation in specs and review

**What it introduced (from diff):**
Adds a 7th Core Question `allowed_resolution_path` to the Control-Model Readiness Gate ("which resolution or reconciliation paths are explicitly allowed inside the same authority chain"), inserted between `forbidden_fallback` and `missing_data_rule`. Introduces a dedicated `Baseline Preservation` section across PRD / Plan / Task templates with fields `must_preserve_behaviors`, `allowed_resolution_paths`, `forbidden_regression_interpretations`, `replacement_proof_required_if_removed`. Adds new Task L1 row "Allowed resolution path" and new L1 subsection "0b) Baseline Preservation (if applicable)" (Current Behavior / Preserve|Replace|Forbid / Required Proof / Priority / Timing). Two new SKILL.md Core Principles (17-18), two new Minimum Contract Rules (21-22), two new Control-Model Gate policy rules (7-8), two new README design choices (13-14), and matching extraction/validation/blocker steps in all three workflows.

**Authoring session:**
- File: `/Users/felho/.codex/sessions/2026/04/12/rollout-2026-04-12T14-30-42-019d81ac-3ecb-75f0-ac11-120c2d4ac164.jsonl`
- Session id: `019d81ac-3ecb-75f0-ac11-120c2d4ac164`
- `cwd`: `/Users/felho/dev/pairflow`
- Time window: `2026-04-12T12:49:27.580Z` → `2026-04-12T20:52:36.559Z` (≈8h 3min; commit at 17:32:53 UTC, ~4h 43min after start, ~3h 20min before end).
- User prompt count / agent message count: 37 user / 202 agent across the full session.
- Session type: **hybrid — domain implementation + agent-proposed mid-session skill tightening**. The session's primary activity until 17:00 UTC was domain work (`actor-runtime-interface-meta-review` repo-surface cleanup, the `last-report` removal). The skill commit at 17:32 UTC was a mid-session side-track: the agent proposed a skill update based on the removal-task experience, and the user approved it. The session then continued with more domain work (post-commit through 20:52 UTC).

**Verbatim quotes**

No single user message before the commit (17:32 UTC) articulates the "why" for this commit in one sentence. The skill tightening emerged from a *pattern* across multiple pre-commit user messages, each catching a specific case where a removal pass had left trailing behavior in place — the kind of slip that in the inverse direction (spec forbids fallback too broadly) would remove a valid deterministic path. Relevant pre-commit user messages cited verbatim:

> [user, line 600, 2026-04-12T15:55:37Z] "akkor a last-report kivétele terv az teljesen készen van?"
> *(EN)* "so — is the last-report removal plan completely done?"

> [user, line 626, 2026-04-12T15:59:46Z] "nem, értem, az előbb pont ezt kérdeztem, légyszi ne doksikban lévő státuszt nézd, mert az lehet félrevezető, nézd meg a kódot is"
> *(EN)* "no, I got it — that's what I was asking. please don't look at doc status, that can be misleading; check the code too."

> [user, line 815, 2026-04-12T16:09:01Z] "akkor tegyél még egy ellenőrzést a kódban, hogy a last-report-nak van-e még bármi nyoma"
> *(EN)* "then do one more check in the code for any remaining trace of last-report."

> [user, line 1704, 2026-04-12T16:41:47Z] "több helyen láttam, hogy a writeFile kikeürlt, de van egy readFile, ott a readFile az micsoda?"
> *(EN)* "I saw in several places that writeFile was removed, but there's a readFile — what is that readFile doing there?"

The L1704 quote is the clearest single illustration of the commit's motivation: a removal pass had silently left a readFile path in place — exactly the class of regression risk the commit's `forbidden_regression_interpretations` + `replacement_proof_required_if_removed` fields are designed to catch. The commit's inverse framing ("do not let 'forbidden fallback' wording accidentally ban a deterministic same-authority resolution path") is the counterpart: a removal-task reviewer could equally over-remove a valid deterministic path by treating it as a forbidden heuristic.

**Session content vs commit content delta:**

This is a `hybrid` session where the concepts were NOT explicitly named by the user before the commit. The session-side signal is indirect — the domain-task practice generated a pattern; the agent proposed the skill-level formalization between ~17:00 and 17:32 UTC; the user approved and committed. The main conversation confirms the concepts exist in the post-17:00 portion of the session by keyword search but did not spot-verify each one line-by-line for this section.

```
Commit-side (from `git show ef55d8a1`):
- Control-Model Gate Core Questions: 6 → 7 (adds `allowed_resolution_path` as #5)
- Control-Model Gate Policy rules: 6 → 8 (adds #7 canonicalization-classification and #8 no-accidental-ban)
- Templates (PRD/Plan/Task): new `Baseline Preservation` sections
- Task template L0: new fields `must_preserve_behaviors`, `allowed_resolution_paths`, `forbidden_regression_interpretations`, `replacement_proof_required_if_removed`
- Task template L1: new "Allowed resolution path" row in Domain/Control Contract; new "0b) Baseline Preservation (if applicable)" table
- SKILL.md Core Principles: +2 (17-18, baseline-preservation-before-cleanup, state-allowed-deterministic-paths)
- SKILL.md Minimum Contract Rules: +2 (21-22, Baseline Preservation section + replacement proof)
- README design choices: +2 (13-14)
- Workflows: `allowed_resolution_path` extraction + baseline-preservation blockers in CreatePRD / CreatePlan / CreateTask

Session-side (direct signal, pre-commit):
- No explicit mention of "Baseline Preservation", "allowed_resolution_path", "forbidden_regression_interpretations", "must_preserve_behaviors", or "replacement_proof_required_if_removed" in pre-commit user messages.
- Strong pattern in pre-commit user messages (L600, L626, L815, L934, L1704, L1713, L1943): repeated requests to verify the removal is complete, explicit rejection of doc-level status as authority ("check the code too"), and the specific writeFile/readFile asymmetry catch at L1704.
- Agent-proposed mid-session skill update (between the 16:59 UTC domain commit and the 17:32 UTC skill commit): not spot-verified line-by-line in this section — see `Gaps`.

Verdict: structural extension of the Control-Model Gate and Task template from the prior Control-Model Readiness Gate (bdd4646f) and Authority Fan-out Scan (8b57b962). The session contains the *domain experience* that motivated the tightening but not an explicit pre-commit user statement of the new rule names.
```

**Incident evidence (bubble and direct-edit work):**
- **Pre-commit bubble context (earlier in the session):** `imp-ari-mr-repo-surface` (`bi_00mnvro250_7d06f1136a49416cabef`, archived). This is the implementation bubble the user was reviewing at L267 (14:19 UTC) and L391 (15:48 UTC). Related docs-only predecessor: `doc-ari-mr-repo-surface` (`bi_00mnvqnckp_7d60bdcd4c63de79a697`).
- **Main pre-commit work from L574 onwards (no archived bubble found):** the user continued with `plans/tasks/actor-runtime-interface-meta-review-cached-repo-surface-cleanup-phaseE.md` — the `last-report` removal task — via direct-edit workflow rather than a standalone bubble. No archive instance with `*phaseE*` or `*cleanup*` in the bubble id was found for the 2026-04-12 15:00-21:00 UTC window; this work appears to have been committed directly (see L790 "commit" at 16:08 and L2207 "commit" at 16:59).
- **Characterization of non-convergence / risk pattern (from pre-commit user messages, directly cited above):**
  - The user repeatedly insists that the removal cannot be confirmed by doc-level status (L626) and must be re-verified against actual code (L815, L1713, L1943) — three explicit re-check requests within 50 minutes.
  - At L1704 the user personally catches that the agent had removed `writeFile` but left `readFile` in place — i.e. the removal pass was incomplete and only human inspection caught it.
  - The skill commit at 17:32 UTC formalizes the inverse failure mode into the spec/review framework: when a removal/refactor task forbids a fallback, it must also say which deterministic same-authority paths remain allowed, so reviewers do not silently over-remove.
- **Watchdog history:** not separately checked for this commit; the direct-edit pattern means there may be no watchdog trail for the phaseE cleanup.

**Problem solved (synthesized, in the user's framing):**
Across a long implementation session on `actor-runtime-interface-meta-review` cleanup (the `last-report` removal), the user discovered through repeated manual verification that removal passes can silently leave asymmetric remnants (writeFile removed but readFile remaining) and that doc-level status is untrustworthy. This practical experience surfaced a framework-level gap: the Control-Model Readiness Gate's existing `forbidden_fallback` question, without a paired `allowed_resolution_path` question, lets reviewers swing the other way and over-remove valid deterministic paths under the label "heuristic fallback". The commit adds the missing paired question, new Baseline Preservation fields across PRD / Plan / Task, and matching validation/blocker steps in all three workflows, so that future removal-oriented tasks carry both sides of the contract explicitly.

**Related prior sessions:**
None found within the 8-hour window that explicitly authored different parts of this commit. The session itself contains the full hybrid story (domain work → agent-proposed skill update → commit). The prior-day `8b57b962` session (`019d7e3e-...`) established the Authority Fan-out Scan vocabulary that this commit extends.

**Gaps / uncertainty:**
- **No single pre-commit user quote articulates the new rule names.** The "why" is a *multi-message domain-work pattern* followed by an agent-proposed skill update. This differs from the earlier sections where a single user message named the gate or problem directly.
- **The specific agent message that proposed the skill update (between 16:59 UTC "commit" and 17:32 UTC skill commit) was not spot-verified in this main conversation** — the subagent retry that examined this session chose quotes from the post-commit portion (19:10 UTC), which is temporally invalid. A narrower pre-commit agent-message enumeration would be needed to cite the exact skill-proposal turn.
- **No archived bubble for the phaseE cleanup task.** Direct-edit workflow, two commits (16:08 and 16:59 UTC) in the pairflow repo main branch, then the skill commit at 17:32 UTC. The phaseE cleanup commits themselves are not referenced by hash in this appendix.
- **User message counts** (37 user / 202 agent) are session-total; only ~28 user messages occur before the 17:32 UTC commit (L7 through L2207). The post-commit messages do not inform this section.

---

## 2026-04-14 — `26bff313` — Closure-Budget Gate

**Commit message:** Harden CreatePairflowSpec closure-budget planning

**What it introduced (from diff):**
Introduces a new mandatory `Closure-Budget Gate` (scope triggers: authority / runtime / read-model / shared-contract work). The gate counts how many of seven closure buckets materially change in the same bounded artifact: `authority_producer`, `shared_contract`, `internal_execution_consumers`, `workflow_orchestration_consumers`, `read_model_consumers`, `persisted_authority_or_schema`, `cleanup_recovery_consumers`. Six policy rules force split or route-back when combinations exceed the budget (e.g. producer + shared-contract + any two consumer buckets together). Adds two new Complexity-Risk Gate hard stops (#7-8) for the same pattern, two new SKILL.md Core Principles (19-20: closure-width primacy, no single-task carry of producer-closure + shared-contract-migration + consumer-rollout + diagnostics together), one new Minimum Contract Rule (23: explicit closure-budget triage in artifacts), one new README design choice (15), a `closure-budget triage` bullet in plan and task templates, and matching workflow steps (CreatePlan 1d, CreateTask 1c.1). Commit body also mentions a parallel update to `plans/feature-ideas.md` for "implementation-phase bubble process ideas" — out of scope for this skill-evolution appendix.

**Authoring session:**
- File: `/Users/felho/.codex/sessions/2026/04/14/rollout-2026-04-14T12-24-44-019d8b85-a25c-7911-aacf-ea91026daf2e.jsonl`
- Session id: `019d8b85-a25c-7911-aacf-ea91026daf2e`
- `cwd`: `/Users/felho/dev/pairflow`
- Time window: `2026-04-14T10:24:50.969Z` → `2026-04-14T12:25:23.724Z` (≈2h; commit at 11:18 UTC, ≈54 min after session start, ≈67 min before end).
- User prompt count / agent message count: 15 user / 71 agent.
- Session type: **authoring** — user explicitly asks for a retrospective on why the existing planning apparatus failed, then asks for process improvements. The agent synthesizes the fix during the session (the term `closure budget` is introduced by the agent at rollout:L344 within 2 minutes of the user's reflection request at L339).

**Verbatim quotes**

> [user, line 329, 2026-04-14T10:47:38Z] "So we are officially in round eleven. But there were multiple runs when I asked you to fix something directly in the bubble verb tree. So at least we are at run twenty. So I'm not 100% sure that the approach driven by this task is good enough or not. So maybe you need to reconsider re-sequencing the task or at least just check whether what might be the issue why we have so many P1s even in RAN to N. But that is usually definitely the sign of something is too complex"

> [user, line 339, 2026-04-14T10:56:54Z] "Please, before we do that, let's reflect back what went wrong here and how could we improve the overall process. This time we used the existing skills, the risk card. I even asked you to do a simulation, and you said that based on the simulation this will probably work, which means that we definitely can and should improve the process. Because usually by the time we get to a point where we need to give up, we lose two, three, four hours of work. So we need to improve and minimize the number of such cases with better planning."

> [agent, line 344, 2026-04-14T10:57:29Z] "Túl nagy volt az egyszerre mozgatott authority-scope. Egy taskba került a producer boundary, a shared contract, több downstream consumer, a persistence/schema, a status/CLI fallout és a meta-review diagnostics is."
>
> *(EN)* "The authority-scope moved at once was too large. A single task bundled the producer boundary, the shared contract, multiple downstream consumers, the persistence/schema, the status/CLI fallout, and the meta-review diagnostics."

**Session content vs commit content delta:**

```
Session-side (from agent synthesis at rollout:L344, continuation of the same message):
- Diagnosis of what went wrong: "Too large authority-scope" — single task bundled producer boundary + shared contract + multiple downstream consumers + persistence/schema + status/CLI fallout + meta-review diagnostics (6 closure families named in one sentence).
- Proposed naming: "Vezessünk be külön `closure budget`..." — agent introduces the `closure budget` term explicitly in the same message.
- Diagnosis: round count (11) was misleading because direct worktree-fixes multiplied real iteration count (~20); simulation validated coherence but not rollout-friction.
- Proposed rule: early stop-rule when too many seams change, too many consumers break, too many validation surfaces need stabilization per bubble, too much "spec drift" expected, too many manual interventions before re-scoping.

Commit-side (from `git show 26bff313` on the skill):
- Gate name: `Closure-Budget Gate` (commit form, cosmetic difference from session's `closure budget` lower-case phrase).
- Closure buckets (7): `authority_producer`, `shared_contract`, `internal_execution_consumers`, `workflow_orchestration_consumers`, `read_model_consumers`, `persisted_authority_or_schema`, `cleanup_recovery_consumers`.
- Six policy rules (producer + shared-contract + any two consumers → split; schema + shared-contract + two+ consumers → Plan→Task; producer + shared contract + read-model/status/CLI → sequencing-failure; adjacent closures only with explicit proof; "do not let task stay broad merely because each sub-area looks understandable"; output must name collapsed vs deferred).
- Two new Complexity-Risk Gate hard stops (#7-8) mirroring the Closure-Budget Gate triggers.
- SKILL.md Core Principles 19-20 (closure-width primacy; no single-task carry).
- Minimum Contract Rule 23 (explicit triage).
- README design choice 15.
- Template additions (plan + task closure-budget triage bullets).
- Workflow additions (CreatePlan 1d, CreateTask 1c.1, plus blockers and L1 updates in CreateTask).

Match analysis:
- Session diagnosis lists 6 closure families ("producer boundary / shared contract / multiple downstream consumers / persistence/schema / status/CLI fallout / meta-review diagnostics"); commit lands 7 formal buckets (session's "multiple downstream consumers" is split into 3 consumer-family buckets: `internal_execution_consumers`, `workflow_orchestration_consumers`, `read_model_consumers` — these 3 inherit from the Authority Fan-out Scan introduced in `8b57b962`; session's "status/CLI fallout" is folded into `read_model_consumers` and/or `cleanup_recovery_consumers`).
- Session term: `closure budget` (lowercase, phrase). Commit term: `Closure-Budget Gate` (titled, hyphenated). Cosmetic difference, same concept.
- Session "early stop-rule" intent is realized as the 6 policy rules in the committed gate.
- Session-proposed metrics ("too many seams / consumers / validation surfaces / spec drift / manual interventions") do not appear as a formal per-axis score in this commit; they are embedded in the qualitative policy ("do not let a task stay broad...").

Verdict: **structural match, with the expected formalization gap**: the session proposed the concept and the agent introduced the term `closure budget` explicitly; the commit formalizes it into the skill's gate-and-triage vocabulary reusing the 7-bucket inventory already established by the prior Authority Fan-out Scan commit (`8b57b962`). No renames or drops; one minor expansion (session's 6 families → commit's 7 buckets via finer-grained consumer split).
```

**Incident evidence (bubble or direct-edit work):**
- Bubble id (from session): no single bubble is quoted by name in the pre-commit portion of this session. The user at L329 references "round eleven" with ~9 additional direct-worktree fixes ("at least run twenty") — the subagent's retry suggested `actor-runtime-e2-impl` as the external reference, but the main conversation did not spot-verify a specific bubble id in the session.
- Archive instance(s) found: no archive hit for the implied external bubble (likely not yet archived at commit time, or archived under a different id).
- Final state + final round: `n/a` in this appendix.
- Characterization of the non-convergence pattern (cited directly from pre-commit session content):
  - Round ≥ 11 in a single bubble, with ≥ 9 additional direct worktree fixes outside the lifecycle — i.e. ~20 real rework passes in one task (rollout:L329, user).
  - Simulation over the existing skill/risk-card pipeline had reported "this will probably work" — i.e. the existing gate apparatus passed a broad scope and the failure only surfaced after hours of wasted implementation (rollout:L339, user).
  - Diagnosis: "too large authority-scope" — 6 closure families (producer / shared contract / multiple consumers / persistence/schema / status/CLI fallout / meta-review diagnostics) bundled into one bounded task (rollout:L344, agent).
- Watchdog history: not inspected for this appendix.

**Problem solved (synthesized, in the user's framing):**
After a task reached round 11 in a lifecycle bubble plus ~9 additional direct worktree fixes without converging, and the existing planning apparatus (skill + risk card + simulation) had judged the scope "probably workable", the user asked for a retrospective on why the process itself failed rather than another local bug fix. The agent identified the pattern as excessive closure-breadth: one task bundled six distinct closure families (producer / contract / consumers / schema / status-CLI / diagnostics). The commit codifies that diagnosis into a new `Closure-Budget Gate` with a 7-bucket inventory (reusing the Authority Fan-out vocabulary from `8b57b962`) and six split-forcing policy rules, so future tasks of this shape are blocked at planning time rather than after hours of implementation.

**Related prior sessions:**
None found within the pre-commit window that author a different part of this commit. The session itself contains the full user reflection → agent synthesis → commit chain in a single ~2h sitting.

**Gaps / uncertainty:**
- The specific bubble whose rounds 1-11 triggered this reflection is named in passing ("round eleven", "at least run twenty") but not quoted by id in the session. The corresponding pairflow archive entry was not located in this appendix.
- `plans/feature-ideas.md` was updated in the same commit with "implementation-phase bubble process ideas"; that file's content is out of scope for this skill-evolution appendix and has not been inspected here.
- The first subagent-produced count of 8 user / 12 agent was spot-corrected to 15 user / 71 agent after direct `rg -c` verification on the session file.

---

## 2026-04-15 — `77d2210e` — Bounded-Task-Shape Gate + ReviewSpec workflow

**Commit message:** Improve CreatePairflowSpec planning gates

**What it introduced (from diff):**
Introduces a new mandatory `Bounded-Task-Shape Gate` for mutable/runtime flows with six primary shapes (`contract_or_persisted_authority_foundation`, `authority_producer`, `consumer_family_alignment`, `fail_closed_hardening`, `coordination_concurrency_hardening`, `activation_or_read_model`) and seven policy rules. Adds a brand-new 151-line `ReviewSpec` workflow (planning-only review, not code review) plus two new reference files (`Bounded-Task-Shape-Gate.md` 82 lines, `Remaining-Task-Viability-Check.md` 69 lines). Adds 2 new Core Principles (21-22, precondition-before-side-effect + concurrency-is-its-own-closure), 6 new Minimum Contract Rules (24-29, bounded-task-shape classification / Precondition and Side-Effect Boundary section / invalid-case test / spec-review planning-only / parent-plan load / remaining-task viability), template additions (Mutation / Precondition Boundaries section, Primary Task Shape column, L0 Precondition and Side-Effect Boundary subsection, L1 "0c)" table, L1 Test Matrix T3 row), and a new SKILL.md routing entry + Example #4 for ReviewSpec.

**Authoring session:**
- File: `/Users/felho/.codex/sessions/2026/04/15/rollout-2026-04-15T17-11-54-019d91b2-e9be-7b30-8e6a-807893124f96.jsonl`
- Session id: `019d91b2-e9be-7b30-8e6a-807893124f96`
- `cwd`: `/Users/felho/dev/pairflow`
- Time window: `2026-04-15T15:11:59.040Z` → `2026-04-15T18:11:41.284Z` (≈3h; commit at 16:42:11 UTC, 1h 30min after session start, 1h 29min before session end)
- User prompt count / agent message count: 21 user / 91 agent
- Session type: **authoring** — user opens with the recurring "review the bubble, deep mode" intro (L7: `impl_phase2b_remote_create: review the bubble, deep mode, be very verbose`), then asks at L186 why the planning skill keeps missing the over-wide-task pattern, the agent diagnoses the two concrete gaps at L309 and reports that it has already applied the fix to the skill, and the commit lands ~30 minutes later.

**Verbatim quotes**

> [user, line 186, 2026-04-15T15:19:02Z] "amit nem értek, hogy elvileg a plan lépésekre bontásánál igyekszünk figyelni arra, hogy ilyen szempontok figyelembe legyenek véve, de valahogy ez mintha nem működne, mert rendre futunk bele, hogy 15 kör után jövünk rá arra, hogy nem lehet ebben a formában megcsinálni, és kisebb darabokra kell bontani, hogyan lehetne ezt a bontást jobb alapokra helyezni?"
>
> *(EN)* "what I don't understand — in theory we try to pay attention to these considerations when splitting the plan into steps, but somehow this isn't working: we keep hitting the case where after 15 rounds we realize it can't be done in this form and it has to be split into smaller pieces. How could we put this splitting on a better foundation?"

> [agent, line 309, 2026-04-15T16:12:52Z] "a planning-oldali fő hiány nem az volt, hogy ne lennének gate-ek, hanem az, hogy a jelenlegi skill túl könnyen átengedi a rossz shape-ű bounded taskokat. Két konkrét hiány volt: 1. Nem volt külön kényszer arra, hogy a task/phase elsődleges shape-jét kimondjuk. [...] 2. Nem volt kötelező `precondition-before-side-effect` boundary."
>
> *(EN)* "the main planning-side gap was not that gates were missing, but that the current skill lets wrong-shape bounded tasks slip through too easily. Two concrete gaps: 1. there was no explicit requirement to name the primary shape of the task/phase. [...] 2. there was no mandatory `precondition-before-side-effect` boundary."

**Session content vs commit content delta:**

```
Session-side (user framing at rollout:L186 + agent diagnosis at rollout:L309):
- User problem: planning splits fail despite existing gates; users discover "after 15 rounds" that the task has to be broken into smaller pieces.
- Agent-named gaps (literally from L309):
  - Gap 1: no explicit requirement to name the primary task/phase shape; producer / fail_closed_hardening / coordination_concurrency_hardening slip into one task.
  - Gap 2: no mandatory `precondition-before-side-effect` boundary; the plan/task is not forced to state what must be validated before any side effect, what invalid-input behavior is, and whether lock/rollback/retry are their own closures.
- Agent explicitly names the three problem-shape labels: `producer`, `fail_closed_hardening`, `coordination_concurrency_hardening`.
- Agent lists modified files at L309 (matches the committed file set exactly): SKILL.md, CreatePlan.md, CreateTask.md, plan-template.md, task-template.md, Complexity-Risk-Gate.md, L1-Contract-Boundaries.md, README.md. (The ReviewSpec.md + Bounded-Task-Shape-Gate.md + Remaining-Task-Viability-Check.md files were added later in the session, before commit.)

Commit-side (from `git show 77d2210e` on the skill):
- New mandatory `Bounded-Task-Shape Gate` with exactly 6 shape labels: `contract_or_persisted_authority_foundation`, `authority_producer`, `consumer_family_alignment`, `fail_closed_hardening`, `coordination_concurrency_hardening`, `activation_or_read_model`.
- 7 gate policy rules.
- New `Precondition and Side-Effect Boundary` section in Task template + `Mutation / Precondition Boundaries` in Plan template + L1 "0c)" table + L1 Test Matrix T3 row.
- New 151-line `ReviewSpec` workflow + new `Remaining-Task-Viability-Check.md` (69 lines) reference.
- New 82-line `Bounded-Task-Shape-Gate.md` reference.
- New SKILL.md Core Principles 21-22, Minimum Contract Rules 24-29, README design choices 16-17, Routing entry for ReviewSpec, Example #4.

Match analysis:
- The **two agent-named gaps at L309** (no-primary-shape, no-precondition-boundary) match the commit exactly:
  - Gap 1 → Bounded-Task-Shape Gate (6 shapes) + SKILL.md Core Principle 22 + Minimum Contract Rule 24 + templates "Primary Task Shape" column / bullet 13 / primary-shape L0 subsection.
  - Gap 2 → Core Principle 21 + Minimum Contract Rule 25 + Plan "Mutation / Precondition Boundaries" + Task "Precondition and Side-Effect Boundary" + L1 "0c)" + Test Matrix T3.
- The agent's three labeled problem shapes at L309 (`producer`, `fail_closed_hardening`, `coordination_concurrency_hardening`) appear verbatim in the committed gate's 6-shape list.
- The **ReviewSpec workflow + Remaining-Task-Viability-Check** are not explicitly requested in the L186 user quote or L309 agent diagnosis — they appear later in the session (subagent retrieval notes L319, L346, L356 agent messages and a post-L309 user approval). Not spot-verified in this appendix at line-level, but the commit includes them as part of the same change.

Verdict: **structural match on the two gaps explicitly named by the agent at L309**, plus one additional in-scope concept (ReviewSpec workflow + remaining-task viability check) that developed later in the same pre-commit session window and is documented by the subagent retrieval but not line-cited in this appendix.
```

**Incident evidence (bubble):**
- Bubble id (from session L7): `impl_phase2b_remote_create`
- Archive instance found: `/Users/felho/.pairflow/archive/b8d470bb2ac6be3b/bi_00mnzt8dm4_b31050a38042c1c12469/`
- Final state + final round: `DONE at round 13` (`state.json:state`, `state.json:round`)
- Bubble repo: `/Users/felho/dev/pairflow` (`bubble.toml:repo_path`); artifact type: code (implementation of Phase 2B remote-create write path).
- Characterization of the non-convergence pattern (from archive `transcript.ndjson`, cited by line):
  - Multi-round reviewer CONVERGENCE with advisory findings persisting round-over-round: R4 `advisory_findings_open_total: 4` (`transcript.ndjson:L9`); R5 `3` (`:L14`); R6 `5` (`:L19`); R7 `6` (`:L24`); R8 `3` (`:L29`). The bubble eventually reached `DONE` at round 13, but the pattern through rounds 4-8 matches the user's "15-round" framing at rollout:L186.
  - Recurring P2 classes across rounds include: `writeRemotePointer` contract/validation asymmetry (R4-R5), partial-write inconsistency window between `bubble.toml executor.remote` and `remote_pointer.json` (R6, R7 "orphan remote.json has no compensating rollback"), repeated test-coverage gaps, and the `T6 fail-closed coverage layer drift` (R8). These are exactly the mixed-shape pattern (producer + fail-closed hardening + coordination-flavored ordering) that the new Bounded-Task-Shape Gate targets.
  - Persistence-write ordering is the core recurring concern: remote.json vs bubble.toml write ordering, partial rollback absence — this is the `precondition-before-side-effect` and `fail_closed_hardening` territory the commit formalizes.
- Watchdog history: archive `transcript.ndjson` has 57 lines; no separate watchdog-history file required — the round-by-round reviewer CONVERGENCE findings are sufficient evidence for the "mixed producer + fail-closed + coordination" pattern.

**Problem solved (synthesized, in the user's framing):**
The `impl_phase2b_remote_create` bubble reached round 13 (with round 4-8 reviewer convergences repeatedly surfacing persistence-write-ordering and rollback-symmetry findings) despite the existing skill having Control-Model Gate, Authority Fan-out Scan, Complexity-Risk Gate, Baseline Preservation, and Closure-Budget Gate. The user's framing at L186 is direct: "we keep hitting the case where after 15 rounds we realize it can't be done in this form and it has to be split into smaller pieces." The agent's L309 diagnosis names the two missing forcing functions (primary-shape classification at plan/task creation; precondition-before-side-effect boundary), and the commit formalizes them into the Bounded-Task-Shape Gate + matching template sections, plus a new ReviewSpec workflow so the same over-wide-task pattern can be caught during planning review rather than at round 15.

**Related prior sessions:**
None found within the pre-commit window. The session itself contains the full "review → diagnosis → skill update → commit" chain in one ~3h sitting.

**Gaps / uncertainty:**
- The ReviewSpec workflow (151-line new file) and `Remaining-Task-Viability-Check` reference were added to the skill as part of this commit but are not explicitly named in the L186 user message or the L309 agent diagnosis. The subagent retrieval mentions agent turns at L319, L346, L356 where ReviewSpec is proposed, but those lines are not individually line-cited or verbatim-quoted in this appendix. A narrower follow-up would be needed to quote the exact ReviewSpec proposal turn.
- The agent quote at L309 is long; the excerpt shown in `Verbatim quotes` is the central "two gaps" sentence with `[...]` between the two numbered points. The full L309 message includes the exact list of modified skill files (matching the committed diff exactly) — the main conversation verified this match but did not inline the full file list in the quote block.
- One subagent methodological note contained a self-contradictory timestamp statement ("16:42:11 UTC ... = 14:42:11 UTC") which was corrected here: the commit timestamp is `2026-04-15T16:42:11 UTC` (i.e. 18:42:11 CEST).

---

## 2026-04-16 — `911af8a2` — Artifact Responsibilities refactor

**Commit message:** spec: align skill rules with artifact boundaries

**What it introduced (from diff):**
Refactor commit (no new gate). Introduces an explicit `Artifact Responsibilities` section in `SKILL.md` separating PRD / Plan / Task / `ReviewSpec` roles. Adds a new `Target-File Reality Check` section (mandatory for Task drafting and Task review). Reshapes the Control-Model Readiness Gate's "Minimum required answers" into `Artifact-specific minimums`. Relaxes plan-level requirements (per-task numeric risk scores, `Phase Ownership Grid`, full mutation/precondition sections are no longer plan defaults) in favor of task-self-containment. Widens the opening lines of the Authority Fan-out Scan, Closure-Budget Gate, and Bounded-Task-Shape Gate to cover "reviewing task boundaries" in addition to drafting. Adds three new Core Principles (23-25: "Plan slimness is a feature"; "Task reality beats task label"; "Review must be mode-specific"). Revises Minimum Contract Rules 15-18 to require target-file scope proof from Tasks / `ReviewSpec task-mode` and explicitly restrict plan bloat. Updates `README.md` design choices 8-17 accordingly.

**Authoring session:**
- File: `/Users/felho/.codex/sessions/2026/04/16/rollout-2026-04-16T18-33-13-019d9723-b5a0-7e73-a9d7-c6bce1c58557.jsonl`
- Session id: `019d9723-b5a0-7e73-a9d7-c6bce1c58557`
- `cwd`: `/Users/felho/dev/make-it-legal/precedens.ai`
- Time window: `2026-04-16T16:33:13.161Z` → `2026-04-16T19:35:31.088Z` (≈3h 2min; commit at 19:02:34 UTC, ≈2h 29min after session start, ≈33 min before session end).
- User prompt count / agent message count: 33 user / 115 agent.
- Session type: **authoring** — user opens with the recurring "review the bubble, deep mode" intro (L7: `p3b-impl: review the bubble, deep mode, be very verbose, focus on the implementation and not on bubble process related issues`), asks a sequence of "why" questions about the skill (L202, L212, L222), the agent diagnoses the over-stuffing at L286 and proposes the Plan-minimal / Task-self-contained model at L296, the user approves and directs the agent to write changes directly into the skill files at L303 ("írd át őket közvetlenül itt: /Users/felho/dev/pairflow/.claude/skills/CreatePairflowSpec"), then serializes the result through several "commit" user messages (L582, L617, L660, L705, L736, L774, L805, L879). The `911af8a2` commit corresponds to the last pre-commit user "commit" message at L879 (2026-04-16T19:02:17Z, 17 seconds before the commit hash timestamp).

**Verbatim quotes**

> [user, line 222, 2026-04-16T16:42:55Z] "de most azt mondtad el, hogy mi történt, de nem azt, hogy vajon mi miatt történt, vagy átfordítva, ott van a $CreatePairflowSpec skill, és a CreateTask workflow jelenlegi verzióján is ez átment, valamint többször használtuk a ReviewSpec-et is erre a taszkra, és ott sem jelzett semmilyen problémát"
>
> *(EN)* "you told me WHAT happened, but not WHY it happened — or put another way: the $CreatePairflowSpec skill is there, and this got past the CreateTask workflow's current version, plus we used ReviewSpec several times on this task, and even that didn't flag any problem."

> [agent, line 296, 2026-04-16T16:56:28Z] "A plan ne task-shape dokumentum legyen, hanem **coverage + dependency dokumentum**."
>
> *(EN)* "The plan shouldn't be a task-shape document — it should be a coverage + dependency document."

**Session content vs commit content delta:**

This is a **relocation and role-clarification** commit, not an additive-new-concept commit. The session-to-commit mapping is unusually clean.

```
Session-side proposal (agent at rollout:L286 and L296; context from user "why" sequence L202/L212/L222):
- Diagnosis: Plan-level and Task-level rules overlap too much; the skill passed the p3b-impl task through CreateTask + ReviewSpec without catching its over-wide scope.
- Prescribed structural model (L296):
  - **Plan = coverage + dependency document** (objective / done definition, open task list, dependency/order, per-task short purpose+status, coverage map, deferred/successor items).
  - **Task = self-contained bounded slice** (bounded slice, primary/secondary shape, risk triage, mutation branch inventory, precondition/side-effect boundary, fail-closed/rollback/retry semantics, target_files, L1 contract).
  - **ReviewSpec two-mode**: plan-mode (coverage / dependency / remaining-task viability) vs task-mode (artifact + target-file reality check — explicitly NOT a bug-hunting code review).
  - Explicit removals from Plan: numeric `risk_score`, phase-specific bounded-shape explanations, task self-descriptions duplicated in plan.
  - Caveat: "nem nullára csökkentsük az overlapet" — the plan must still answer "if all open tasks land, does the overall goal close?"

Commit-side (from `git show 911af8a2`):
- New `Artifact Responsibilities` section in SKILL.md — 4 role definitions match the session model 1:1:
  - PRD: product intent / business invariant / control model / user-visible behavior. "No task-local closure math."
  - Plan: coverage/dependency artifact. "Do not use the plan as a duplicate task-spec repository."
  - Task: bounded implementation slice. "Must prove its scope using `target_files`, touched entrypoints, mutation boundaries, and bounded-task shape."
  - ReviewSpec: plan-mode + task-mode.
- New `Target-File Reality Check` section — maps directly to the agent's "task-mode ... target fájlokat is ellenőrzi" + "artifact + scope reality check".
- Control-Model Readiness Gate: `Minimum required answers` restructured into `Artifact-specific minimums` — maps to the agent's Plan-minimal vs Task-full responsibility split.
- Core Principles 23-25: "Plan slimness is a feature" + "Task reality beats task label" + "Review must be mode-specific" — three compact restatements of the session's three conclusions.
- Minimum Contract Rule 15 reshape: scope-reality proof required for Task and ReviewSpec task-mode.
- Minimum Contract Rule 16 new: "Plans should not carry per-task numeric risk scores, full phase ownership grids, or full mutation/precondition boundary sections by default" — direct port of L296 "plan-level risk score nem kell".
- Complexity-Risk Gate policy #11 new: "Do not persist per-task numeric risk scoring in plans by default".
- Authority Fan-out Scan / Closure-Budget Gate / Bounded-Task-Shape Gate opening lines widened to cover "reviewing task boundaries" — the ReviewSpec two-mode integration.
- Removed from plan defaults: the pre-existing rule requiring `Phase Ownership Grid` for plans (previously a Minimum Contract Rule) — demoted to optional.

Match analysis:
- The agent's L296 five-point model lands exactly in the SKILL.md refactor; no drops.
- No gate renamed; no gate removed. Only structural relocations: Plan-specific rules moved to Task defaults or to "not by default"; gate applicability widened to review.

Verdict: **structural refactor reflecting the agent's L296 prescription 1:1** into SKILL.md vocabulary. One demotion (Plan numeric risk score + Phase Ownership Grid defaults); one widening (gate-opening lines include review). Every new / renamed / widened rule has a clear session-side counterpart.
```

**Incident evidence (bubble):**
- Bubble id (from session L7): `p3b-impl`
- Archive instance found: `/Users/felho/.pairflow/archive/be2ac5d87a57bdcc/bi_00mo1hkzsh_3d71140d1896c302317e/`
- Bubble repo: `/Users/felho/dev/make-it-legal/precedens.ai` (`bubble.toml:repo_path`); artifact type: `code`; branch: `bubble/p3b-impl`.
- Final state + final round: not individually spot-verified for this section.
- Characterization: the user's triple "why" sequence (L202 "mi az oka annak, hogy ilyen sok kört futunk ezzel a taszkkal?"; L212 "és annak mi az oka, hogy ezt nem láttuk előre, és mondjuk bontottuk kisebb taszkokra?"; L222 the full skill framing above) establishes the incident pattern at the **skill level**, not the bubble-implementation level. The commit targets the skill gap rather than any specific bubble finding.

**Problem solved (synthesized, in the user's framing):**
After running the `p3b-impl` bubble through the existing `CreateTask` workflow and `ReviewSpec` multiple times without the skill flagging the over-wide task scope, the user asked directly: why did none of the gates catch this? The agent's diagnosis was that Plans had accumulated too much Task-scope content (per-task risk scores, Phase Ownership Grids, full mutation boundaries), and `ReviewSpec` was undifferentiated between plan-mode and task-mode review. The commit reorganizes the skill around four explicit artifact responsibilities (PRD / Plan / Task / `ReviewSpec`), slims plan-level requirements, and introduces the Target-File Reality Check so `ReviewSpec task-mode` can validate bounded-slice claims against actual code rather than just the task's self-description.

**Related prior sessions:**
None found within the pre-commit window. The session itself contains the full "review → why questions → agent diagnosis → user approval → file edits → commit" chain in one ~3h sitting. Two follow-up commits in the same work window (`5f0f0254` at 19:08 UTC and `a75bca03` at 19:53 UTC) are commits #9 and #10 and have their own sections.

**Gaps / uncertainty:**
- `p3b-impl` bubble `state.json` (final state, round count) not spot-verified for this section. The session records establish the incident context; exact round-by-round finding counts are out of scope.
- The first subagent run on this commit produced incorrect session metadata (session end timestamp 17:19 instead of 19:35 UTC; counts 9/8 instead of 33/115; cwd labelled as pairflow rather than precedens.ai) and **fabricated two user quotes** at L50 and L56 that are actually `exec_command_end` and `function_call` events, not `user_message` events. The main conversation recovered the correct metadata and the real pre-commit user_message list by direct `rg -n '"type":"user_message"' <rollout>` enumeration. The append above uses only validated lines.
- The agent message at L296 is much longer than the one-sentence verbatim excerpt above; it contains a full 5-point proposed model. The excerpt was kept short to satisfy quote discipline; the full model is summarized in the delta block.

---

## 2026-04-16 — `5f0f0254` — Post-refactor coherence cleanup

**Commit message:** spec: finalize artifact boundary cleanup

**What it introduced (from diff):**
Small follow-up to `911af8a2` (6 minutes later). Three file changes, all cleanup:
1. `SKILL.md`: Complexity-Risk Gate policy numbering fix — the prior commit left duplicate "4." entries; this commit renumbers into a contiguous 1-12 sequence.
2. `references/Complexity-Risk-Gate.md`: explicit `Task` / `Plan` distinction in "Output expectations" — replaces ambiguous "spec" wording with "the Task artifact" where the output fields apply, and adds a dedicated "For Plans:" block (gate drives decomposition decision only; no per-task numeric risk score persisted; only resulting split/dependency shape recorded when it changes plan correctness). Also removes "phase/task" wording in favor of "bounded task" where the Task is the intended owner.
3. `references/Control-Model-Readiness-Gate.md`: replaces the Core Question 7 from `phase_boundary` (with its 7-closure field list) to `sequencing_boundary` (a lightweight note; the detailed 7-closure ownership now lives only in Task-scope when the bounded slice needs it). Plan applicability is relaxed correspondingly (from "detailed phase boundary ownership" of 7 closures → "a lightweight sequencing note only when ordering depends on it"). `READY` and `NOT_READY` conditions rephrased to match.

In short: the `911af8a2` refactor established the Plan-minimal / Task-self-contained split in `SKILL.md`, but the reference files and one policy numbering were still carrying the pre-refactor 7-closure `phase_boundary` shape. This commit ports that cleanup into the references so the whole skill is consistent.

**Authoring session:**
- File: `/Users/felho/.codex/sessions/2026/04/16/rollout-2026-04-16T18-33-13-019d9723-b5a0-7e73-a9d7-c6bce1c58557.jsonl` (same session as `911af8a2`).
- Session id: `019d9723-b5a0-7e73-a9d7-c6bce1c58557`.
- `cwd`: `/Users/felho/dev/make-it-legal/precedens.ai`.
- Relevant window for this commit: `2026-04-16T19:02:17Z` (prior commit request) → `2026-04-16T19:08:29Z` (this commit's "commit" message at L1035) → `2026-04-16T19:08:44Z` (commit timestamp). ≈6 minutes.
- Session type: **authoring (continuation of the `911af8a2` cleanup loop)** — same session, same conversation thread; the user asks for a coherence check on the just-committed state, the agent finds residual inconsistencies in the reference files and numbering, the user approves the fixes, commit lands.

**Verbatim quotes**

> [user, line 910, 2026-04-16T19:03:40Z] "most gondold át az egészet egyben, hogy van-e még valami változtatandó, meg azt, hogy a mostani állapot koherens-e"
>
> *(EN)* "now think through the whole thing together — whether there's anything else to change, and whether the current state is coherent."

> [user, line 962, 2026-04-16T19:05:15Z] "javítsd ezeket"
>
> *(EN)* "fix these."

**Session content vs commit content delta:**

```
Session flow between the two commits:
- L910 (19:03): user requests a full coherence check on the post-refactor state.
- Agent response (between L910 and L962): proposed residual inconsistencies (not individually line-cited in this appendix; they correspond to the three cleanup areas that land in the commit).
- L962 (19:05): user approves ("javítsd ezeket").
- Agent applies the three edits across SKILL.md, Complexity-Risk-Gate.md, Control-Model-Readiness-Gate.md.
- L1012 (19:07): user asks the same coherence check a second time.
- L1035 (19:08): user issues "commit"; `5f0f0254` lands 15 seconds later.

Commit-side (from `git show 5f0f0254`):
- SKILL.md: Complexity-Risk Gate policy renumbered 4 → 5, 5 → 6, ..., 10 → 11, 11 → 12 (single-line numeric fix).
- Complexity-Risk-Gate.md: "the spec" → "the Task artifact"; closure-budget triage paragraph retargeted to "in the Task"; "bounded phase/task" → "bounded task"; "For mutable existing flows, also record" → "For mutable existing flows, the Task should also record"; added new "For Plans:" block (3 bullets: decomposition-only role / no per-task numeric scores / only split-dependency shape when it changes plan correctness).
- Control-Model-Readiness-Gate.md: `phase_boundary` (Core Question 7 with 7-closure field list) → `sequencing_boundary` (lightweight plan note OR detailed task-local ownership); Plan applicability "detailed phase boundary ownership" (7 closures) → "a lightweight sequencing note only when ordering depends on it" (3 bullets); `READY` condition 7 rephrased ("phase/task ownership boundaries" of 7 closures → "ownership/sequencing boundaries at the right level"); `NOT_READY` policy #5 rephrased ("Never compress phase_boundary" → "Never compress sequencing-critical ownership").

Match analysis:
- All three file changes are direct completions of the `911af8a2` refactor intent (Plan-minimal / Task-self-contained / reference files consistent with SKILL.md).
- Nothing substantively new is introduced — this is a coherence-closure commit, not a concept commit.

Verdict: **finalization of the 911af8a2 refactor**. Strict subset of the prior commit's conceptual scope; no new gate, no new concept, no rename that changes semantics.
```

**Incident evidence (bubble):**
- Bubble id: `n/a` — this commit is a same-session follow-up to the `911af8a2` refactor. The triggering incident context (`p3b-impl`) is documented in the prior commit's section and is not re-established here.
- Archive instance: `n/a`.
- Characterization: this commit has no standalone incident; its driver is the user's coherence-check request at `rollout:L910`.

**Problem solved (synthesized, in the user's framing):**
After the `911af8a2` refactor committed the Artifact Responsibilities reorganization in `SKILL.md`, residual inconsistencies remained in the two reference files (`Complexity-Risk-Gate.md` and `Control-Model-Readiness-Gate.md` still referenced "the spec" and "phase_boundary" with 7 closures at plan level, contradicting the new Plan-minimal rule) and the Complexity-Risk Gate policy had a numbering glitch. The user asked for a coherence check on the whole skill at `rollout:L910`; the agent identified and applied three focused fixes; the commit closes the refactor loop.

**Related prior sessions:**
- Same session as `911af8a2` (commit #8), 6 minutes earlier. No separate authoring chain.

**Gaps / uncertainty:**
- The specific agent message that enumerated the three inconsistencies between `rollout:L910` and `rollout:L962` was not individually line-cited in this appendix. The correspondence between what the agent identified and what the commit applies is 1:1 by construction (the user approved with "javítsd ezeket" before any commit).
- This commit was not researched via a subagent because its scope (three focused edits, same session as the prior commit, short pre-commit window) did not warrant a full investigation round; the main conversation read the pre-commit user messages directly.

---

## 2026-04-16 — `a75bca03` — Closed-Contract Drift Check

**Commit message:** Add closed-contract drift checks to CreatePairflowSpec

**What it introduced (from diff):**
New mandatory `Closed-Contract Drift Check` gate in `SKILL.md` (applies when a refined implementation-oriented Plan or Task touches an already-established authority / shared-contract / read-model contract). New reference file `references/Closed-Contract-Drift-Check.md`. The gate covers five trigger situations: (1) existing canonical authority being "clarified / tightened / preserved", (2) refinement introduces new terminology for an existing contract, (3) task/plan inherits wording from an upstream artifact, (4) a field might silently shift from canonical to guard / compat language, (5) the artifact is docs-only but still changes implementation-significant contract wording. Artifact-specific minimums per Plan / Task / `ReviewSpec` and six policy rules (notably: "local coherence is not enough"; "new terminology requires source-anchor + concrete field mapping"; "docs-only refinements that change implementation-significant meaning are contract-risk, not harmless polish"). Adds two new SKILL.md Core Principles (26-27: closed-contract meaning preserved explicitly; new wording must anchor back to source artifacts before becoming `required-now`). Adds two new Minimum Contract Rules (32-33: drift check mandatory when refined Plan/Task touches closed contract; a refined artifact must not be marked implementable if only locally coherent but contradicts repo-local source anchors). Templates gain a `Canonical Contract Anchors` section (Plan and Task L0) and a new L1 "0a) Canonical Contract Preservation" table (renumbering 0b-0f of prior sections). Workflows gain new steps: `CreatePlan 1a.1 Run the Closed-Contract Drift Check`, `CreateTask 1b.1 Run the Closed-Contract Drift Check`, with matching extraction / blocker / L1 / Consistency-Gate rules. `ReviewSpec` updated: repo-local source-anchor comparison added to Allowed; the drift check runs in both plan-mode and task-mode when applicable.

**Authoring session:**
- File: **none found.** This commit appears to be **offline-authored**: no Codex session in the commit-minus-8h window contains the commit-unique keywords (`Closed-Contract Drift Check`, `Canonical Contract Anchors`, `canonical vs guard vs compat`, `drift_status`, `forbidden_reinterpretations`, etc.) before the commit timestamp. The keywords only appear in post-commit sessions starting at `rollout-2026-04-16T22-05-03-019d97e5-...` (≈12 min after commit).
- **Adjacent (non-authoring) session observed:** `rollout-2026-04-16T21-30-29-019d97c6-026a-7431-92be-61990119e2fa.jsonl` — `cwd=/Users/felho/dev/pairflow`, time window `2026-04-16T19:49:59Z → 2026-04-16T19:54:35Z` (4.5 min), 2 user / 10 agent. First user message at L7 is a bubble review request (`e3a-doc-refi: review the bubble, deep mode, be very verbose`), unrelated to the skill commit. The session's `git status --short` output at L17 (2026-04-16T19:50:09Z) already lists all seven modified skill files plus the untracked `references/Closed-Contract-Drift-Check.md` — i.e. the edits were on disk before this session even started. Last user message at L85 (19:53:51 UTC, 18 seconds after the commit) is "rework" referring to the `e3a-doc-refi` bubble, not the skill commit. The `a75bca03` commit was not initiated from this session's conversation.
- Session type: **offline-no-session** — new category in this dataset. Not `authoring` (no agent synthesis), not `review-only` (no user-initiated diff review with the agent), not `sync-only` (no visible mirror-commit request), not `hybrid` (no mid-session skill-tightening). The user drafted and committed the change outside any Codex session.
- Derivation window: between the prior commit `5f0f0254` at `2026-04-16T19:08:44Z` and this commit at `2026-04-16T19:53:33Z` = **≈45 minutes**, of which the last ≈4 minutes are the unrelated `019d97c6-026a` session in pairflow cwd. That leaves ≈41 minutes of undocumented offline drafting time.

**Verbatim quotes**

No pre-commit user or agent quotes exist in Codex session archives for this commit. The user's reasoning can only be inferred from (a) the commit's own text, (b) the `911af8a2` / `5f0f0254` session it follows, and (c) post-commit sessions that start ≈12 minutes later and use the drift-check vocabulary (but those are downstream uses, not the "why").

**Session content vs commit content delta:**

Not applicable in the standard shape — there is no authoring session to compare against the commit. The conceptual delta below is a commit-side-only inventory against the immediate predecessors.

```
Predecessor state after 5f0f0254 (commit #9):
- Artifact Responsibilities (PRD/Plan/Task/ReviewSpec) established in SKILL.md.
- Target-File Reality Check mandatory for Task drafting and Task review.
- Control-Model Readiness Gate reshaped into artifact-specific minimums.
- Plan-level defaults slimmed; Task-self-containment in effect.
- Reference files aligned with the refactor (5f0f0254 cleanup).
- No explicit gate for the scenario where a refinement preserves a closed contract in wording but drifts it in meaning.

Commit-side added by a75bca03:
- New mandatory Closed-Contract Drift Check gate (5 trigger situations, artifact-specific minimums, 6 policy rules).
- New references/Closed-Contract-Drift-Check.md file.
- SKILL.md Core Principles 26-27 added.
- SKILL.md Minimum Contract Rules 32-33 added.
- Plan template: new "Canonical Contract Anchors (Optional)" section.
- Task template: new "Canonical Contract Anchors" section (L0) + new L1 "0a) Canonical Contract Preservation" table; prior tables renumbered 0b-0f; two new Reviewer Tags rules (11-12).
- CreatePlan workflow: new step 1a.1 "Run the Closed-Contract Drift Check"; updated Step 1 extraction to include repo-local source anchors; new Validate rule (9).
- CreateTask workflow: new step 1b.1 "Run the Closed-Contract Drift Check"; updated Step 1 extraction; L0 Draft rules updated; new Required Blockers #19; new L1 rule (16); new Consistency-Gate rule (14); L1 pass list reorganized to include "Canonical contract preservation" as item 2.
- ReviewSpec workflow: "repo-local source-anchor comparison" added to Allowed; Closed-Contract Drift Check added to both plan-mode and task-mode gate runs.

Match analysis:
- This is a pure additive commit layered on top of the 911af8a2/5f0f0254 Artifact Responsibilities refactor. No prior concept is renamed away.
- The gate fits the "refined Plan/Task touches already-closed contract" slot that the prior refactor did not explicitly cover; the triggers (new terminology / inherited wording / silent field-role shifts) are orthogonal to Control-Model Readiness, Target-File Reality Check, Authority Fan-out Scan, Closure-Budget Gate, and Bounded-Task-Shape Gate.

Verdict: additive new gate closing the "silent semantic drift on refinement" failure mode; no renames; no drops.
```

**Incident evidence (bubble):**
- Bubble id: `n/a` (no session to name a bubble).
- Archive instance: `n/a`.
- Characterization: the commit-diff itself is the primary evidence. The immediate predecessor commit (`911af8a2` / `5f0f0254` on the same day) refactored the skill around artifact boundaries and explicitly allowed "refinement" as a common activity — that context makes the omission of a drift-check gate structurally obvious. The user plausibly noticed the gap while reviewing the just-committed refactor state and drafted the new gate offline. This is an inference from commit sequencing, not a transcript citation.

**Problem solved (synthesized, from the commit's own text):**
After the `911af8a2` / `5f0f0254` Artifact Responsibilities refactor slimmed Plans and emphasized Task-self-containment, the skill had an explicit place for *refinements* (Plans and Tasks are frequently refined after initial drafting) but no safeguard against silent semantic drift when a refinement "clarifies" or "tightens" the wording of an already-closed authority / shared contract / read-model contract. The Closed-Contract Drift Check closes that gap: when a refined artifact touches a closed contract, the author must cite repo-local source anchors, classify fields as canonical / guard / compat, and prove no unauthorized reinterpretation. The two SKILL.md Minimum Contract Rules (32-33) make this mandatory and explicitly forbid marking a refined artifact implementable when it is only locally coherent but contradicts the repo-local sources of truth.

**Related prior sessions:**
- `rollout-2026-04-16T18-33-13-019d9723-...jsonl` — the `911af8a2` and `5f0f0254` session (same cwd `precedens.ai`). The immediate conceptual predecessor: this drift-check gate layers on top of the Artifact Responsibilities refactor established there.
- No sessions earlier in the series reference the "closed-contract drift" or "canonical vs guard vs compat" vocabulary; the pattern is first named in this commit.

**Gaps / uncertainty:**
- **The commit has no Codex authoring session.** This is a category that had not appeared in the prior 9 commits (which split between `authoring`, `review-only`, `hybrid`, and `sync-only`). The user's "why" for this gate is therefore not directly citable from any session archive; it can only be read from the commit's own text and inferred from the prior same-day refactor context.
- The adjacent pairflow session (`019d97c6-026a`) is NOT the authoring session — it ran 4.5 min, was dedicated to a separate `e3a-doc-refi` bubble review, and its `git status` output at L17 proves the skill edits were already on disk before it started.
- Post-commit sessions starting at `rollout-2026-04-16T22-05-03-019d97e5-...` (2026-04-16T20:05+ UTC) are the first Codex sessions to use the new drift-check vocabulary; they are *consumers* of the gate, not its source.
- The precise reasoning the user went through offline between `5f0f0254` (19:08 UTC) and `a75bca03` (19:53 UTC) — whether it was triggered by a concrete spec instance they just saw, a general reflection, or a review of the refactor itself — is not recoverable from the archive alone.

---

# Appendix A — Skill Assessment Trace

Captured on 2026-04-17 during the research session that produced this document. Two snapshots are recorded here verbatim for future reference: the assessment given at the start of the research session (before any commit-level investigation), and the revised assessment after the 10-commit research was complete. Kept side-by-side so future readers can see how evidence moved the opinion.

## A.1 Initial assessment — 2026-04-17, pre-research

*Context: at the start of the session the user asked for an opinion on the `CreatePairflowSpec` skill at its then-current state (after `a75bca03`, ≈2,585 lines across `SKILL.md` + 4 Workflows + 7 references + 3 Templates, with 7 mandatory gates). No commit-level history research had been done yet.*

**Overall impression:** well thought out, but overly heavy. Strong core (artifact-responsibility separation, work-type triage, L0/L1/L2, Target-File Reality Check), bureaucratic periphery (gate stack, Minimum Contract Rules, Core Principles) — some of which appears to duplicate work across sections.

### Strengths

1. Clean responsibility separation: PRD = intent, Plan = coverage/sequencing, Task = bounded slice, Review = boundary. Rarely this sharply distinguished in practice.
2. "Context-first, gap-only interview" and evidence-based P0/P1 grading — right principles, crisply stated.
3. Target-File Reality Check: pragmatic defence against "the label lies about the scope". The single most practical piece in the skill.
4. `forbidden_fallback` + `allowed_resolution_path` pairing. Rarely seen: explicitly preventing review-tightening regression. Sophisticated.
5. Baseline Preservation section concept: a refinement may not sneak away baseline behavior.

### Concerns

1. **Gate overgrowth.** Seven mandatory gates in SKILL.md (Control-Model, Closed-Contract, Target-File, Authority Fan-out, Closure-Budget, Bounded-Task-Shape, Complexity-Risk). At least three (Authority Fan-out + Closure-Budget + Bounded-Task-Shape) appear to count the same closure-bucket set from different angles — consolidation candidate.
2. **Ironic size.** The skill campaigns against "review-loop inflation", yet the `Minimum Contract Rules` (33 points) + `Core Principles` (27 points) + 7 gates + 4 workflows is itself a review-loop generator. Every activation carries a high context cost, and LLM attention fragments.
3. **Significant redundancy.** `Minimum Contract Rules` and `Core Principles` are largely re-statements of the gates — the same idea said a third time. Today the SKILL.md is not "router + policy", it is "router + policy + encyclopedia".
4. **Abstraction-level issue.** The `closure bucket` vocabulary (`authority_producer`, `read_model_consumers`, `cleanup_recovery_consumers`, …) works when the team has lived with it; in a new project it would over-complicate trivial work.
5. **No concrete good-output example is visible.** Templates carry scaffolding but SKILL.md does not point to "here is what an acceptable L0/L1/L2 task looks like". Examples in the doc are routing-level, not artifact-level.
6. **Risk-proportional gate application is weak in practice.** On paper bugfix/docs-only can skip gates; in reality the text leans heavily on "mandatory", and the CreateTask workflow step 0 lands most scopes on full gate evaluation.

### Suggestions (ordered by priority)

1. **Gate consolidation**: merge `Authority Fan-out` + `Closure-Budget` + `Bounded-Task-Shape` into a single `Scope Classification Gate` that does the fan-out inventory, the collapse/split decision, and the primary-shape classification in one pass.
2. **SKILL.md slimming to ~150 lines**: router table + work-type triage + contract-boundary override + brief gate index. Most of `Minimum Contract Rules` and `Core Principles` moves under `references/`, referenced per workflow.
3. **One fully worked example** in `references/Example-Task.md` showing what a complete, acceptable L0/L1/L2 task looks like — more valuable than another rule.
4. **Explicit bugfix/docs-only fast path**: reduce the gate list outright when the work-type triage classifies them that way.

## A.2 Revised assessment — 2026-04-17, post-research

*Context: after researching all ten skill commits between 2026-04-05 and 2026-04-16 and documenting them earlier in this file, the initial assessment was re-examined against the actual incident evidence.*

### What the research refuted in the initial assessment

1. **"Gate overgrowth" is largely inaccurate as framed.** Each gate is tied to a specific documented bubble-failure pattern, not a theoretical abstraction. The research section for each commit above names the triggering bubble, cites round-by-round `CONVERGENCE` findings from `transcript.ndjson`, and shows the gate closing exactly that failure mode. Summary:
   - Complexity-Risk → `review-policy-runtime-surface-phase1` CANCELLED R4.
   - `identity_join_risk` → `bci3-impl` Stripe / `payment_intent` / vendor id reconciliation.
   - Control-Model Readiness → billing/Stripe source-of-truth confusion.
   - Authority Fan-out → `remote-phase1b-docref` round 3 "too many consume families".
   - Baseline Preservation → last-report removal (`writeFile` removed, `readFile` left in place).
   - Closure-Budget → bubble at round 11 + 9 direct fixes, passing every prior gate.
   - Bounded-Task-Shape → `impl_phase2b_remote_create` R13 with mixed producer + fail-closed + coordination.
   - Closed-Contract Drift → refinement drift risk after the `911af8a2` refactor.
   The gates operate as **defence-in-depth**, not as naive duplication.
2. **My own "gate consolidation" proposal would have been a regression.** Authority Fan-out, Closure-Budget, and Bounded-Task-Shape each answer an orthogonal question (*how many consume families? how many closure families move together? is the task's primary shape producer vs fail-closed vs coordination?*). Collapsing them into one gate would lose coverage of the specific failure modes each is designed to catch.
3. **The user already noticed the bloat and course-corrected.** Commits `911af8a2` and `5f0f0254` (2026-04-16) are exactly a redundancy-reduction pass: Plan slimmed, Task self-contained, `ReviewSpec` two-mode. The user's correction is more sophisticated than my original "merge gates" suggestion — it is layering rather than brutal consolidation.

### What remains valid from the initial concerns

1. **The skill is still sizeable.** SKILL.md in the `a75bca03` state is still ≈430 lines; the `911af8a2` refactor reduced structural duplication but the total rule count has grown. New-user onboarding is still heavy.
2. **The `closure bucket` / `authority_producer` / `cleanup_recovery_consumers` vocabulary is deliberately generic** (see `8b57b962` user instruction at rollout:L621 demanding "perflow agnostic" bucket names), but the abstraction price is real: without Pairflow-domain context the vocabulary is hard to onboard onto.
3. **There is still no single fully worked L0/L1/L2 reference example.** Templates give the scaffold, domain examples in the gate reference files have grown (Stripe invoice id etc. in `identity_join_risk`), but an end-to-end acceptable task artifact is not shown anywhere.
4. **Risk-proportional gate application is still weak for bugfix / docs-only.** Work-type triage exists at the top of SKILL.md, but the gate list is additive and does not auto-skip for lower-risk work-types. Every new commit has been additive in this regard.

### What the research surfaced that the initial assessment did not see

1. **Evidence-based iteration, not ad-hoc accretion.** Each gate has an archived bubble behind it, and the user's "20–30 rounds" framing (rollout:L284 at `ca22d258`) aggregates across a real bubble chain (bci3 → bci3a → phaseE). The perception is not paranoia; the archive corroborates it.
2. **User self-correction is part of the skill's design loop.** One of ten commits (`911af8a2`) is an explicit refactor; the user audits their own skill and does not only add to it. This changes how additional gates should be weighed: not "is it worth the cost?" alone, but "is the self-audit frequency sane?" — and it is (10 commits / 12 days, plus one explicit redundancy-reduction pass).
3. **The "incident ledger" I suggested at the start of the session implicitly already exists** in the triad of commit message + commit diff + adjacent Codex session. This document has now made it explicit in `docs/spec-skill-evolution.md`.
4. **New session-type taxonomy** emerged during the research: `authoring` (co-design), `review-only` (user brings pre-drafted diff), `hybrid` (domain work + mid-session skill tightening), `sync-only` (mirror commit to another repo), `offline-no-session` (no Codex session at all). This is not skill-criticism — it characterises how the user designs, and shows the gates were not all produced the same way.

### Revised verdict in one sentence

The initial "too much, too redundant" impression underestimated the skill's depth. The skill is in fact an **evidence-based safety system** for a specific domain (Pairflow bubble refinement's recurring failure modes), and the user's own self-correction (the `911af8a2` refactor) was already targeting redundancy reduction more sophisticatedly than my original proposal. Onboarding difficulty and abstraction level remain legitimate concerns, but the rule count is no longer more than the evidence warrants.

---

# Appendix B — Theoretical framing (conceptual understanding)

Captured on 2026-04-17 as a conceptual exercise, not a refactor proposal. The user's motivation: the skill grew from trial-and-error on two different projects (Pairflow + precedens.ai billing integration), the vocabulary feels Pairflow-specific but the patterns generalize, and they want a deeper mental model — both for themselves and for explaining the skill to others. This appendix records the most illuminating theoretical frames, ordered from deepest/most unifying to most transfer-friendly.

## B.1 One-sentence thesis

The skill is a **refinement-type-checker for work packages**: each gate checks whether the task is "well-typed" in one dimension. Seen through this lens, the gates are different facets of one deeper concept, not ad-hoc rules.

## B.2 Why "refinement type"?

A refinement type is not only a set of values, but a set of values that satisfy a predicate (e.g. `Positive = { x: Int | x > 0 }`). The skill does exactly this at the *task* level: it is not enough that a work item "is a task" — the task must satisfy predicates (effect-monomorphism, ownership separation, preserved baseline invariants, and so on). Each gate encodes one such predicate.

## B.3 Gates as predicate-checkers

| Gate | Predicate it checks | Closest CS analog |
|---|---|---|
| Bounded-Task-Shape | Is the task **effect-monomorphic** (one primary shape)? | Effect systems / algebraic effects (Koka, Eff) |
| Authority Fan-out Scan | Are the touched ownership regions **separated**? | Separation Logic frame rule |
| Closure-Budget Gate | How many **independent closures** move together? | Transaction atomicity / isolation budget |
| Control-Model Readiness Gate | Are the read paths **deterministic and non-ambiguous**? | CQRS + unambiguous state-machine |
| Baseline Preservation | Is the task a **refinement** rather than a replacement? | Liskov / behavioral subtyping / refinement calculus |
| Closed-Contract Drift Check | Is the refinement **invariant-preserving**? | Contract compatibility / Hyrum's Law mitigation |
| Target-File Reality Check | Does the **declared type match the observed type**? | Type inference vs. annotation correspondence |
| Complexity-Risk Gate | Is the type **too complex** to verify as one bounded slice? | Decidability / tractability budget |

## B.4 Why this generalizes across domains

Refinement-type discipline is **domain-independent**: in any system with state, multiple readers, a lifecycle, and refinement, these predicates are meaningful. Both Pairflow (bubble refinement with producer-consumer authority flows) and precedens.ai billing integration (Stripe ↔ Billingo ↔ local authority reconciliation) are exactly such systems. The concrete vocabulary (`payment_intent`, `writeRemotePointer`, meta-reviewer) is domain-specific, but the *type properties* are generic. The fact that the same gate set holds up on two domains is empirical evidence that the underlying frame is type-theoretic rather than Pairflow-specific — two data points is not proof, but it is the right shape of evidence for a generic invariant.

## B.5 Complementary frames (different views of the same phenomenon)

These are not alternatives to Appendix B.3's type frame; they look at the same structure from other angles and are useful in different audiences.

1. **Parnas-style modularity at task granularity.** "On the Criteria to Be Used in Decomposing Systems into Modules" (1972): each module should encapsulate a single *secret*. The skill lifts this to task granularity — each bounded task should close a single design decision; the gates detect secret-mixing (authority + coordination + rollback bundled together). **Most transfer-friendly frame for senior engineers** — one-line elevator pitch: "it's Parnas at task granularity."

2. **Architectural smell detection at design time.** Each gate maps onto a known anti-pattern, but applied to the *task specification* rather than the code: `surface_spread` ↔ Shotgun Surgery; producer + consumer mixing ↔ Feature Envy; closure-budget overflow ↔ God Object; `forbidden_fallback` without `allowed_resolution_path` ↔ silent precondition weakening; `target_files` disagreeing with declared shape ↔ Mislabeled Interface. **Most pragmatic frame for onboarding** — new contributors recognise the anti-patterns first, can come back to the type story later.

3. **Hoare logic at the spec level.** `{P} task {Q}`: the Precondition-and-Side-Effect Boundary section is a direct Hoare triple; the Control-Model Readiness Gate fixes `P`; Baseline Preservation fixes the `Q` invariants. Especially clean for mutation-flow tasks.

## B.6 Relationship between the three frames

- **Depth:** the type frame is deepest — Parnas modularity and smell detection are both derivable from it (Parnas's "module secret" is the information-hiding predicate; anti-patterns are mis-typings).
- **Transferability:** the Parnas frame is easiest to state to an experienced engineer who does not think in types.
- **Pragmatic onboarding:** the architectural-smells frame is closest to lived experience and requires the least prior theory.
- **Operational depth:** Hoare logic is the closest to the actual gate mechanics for mutation tasks and the cleanest frame for writing new gates that fit the existing system.

All three look at the same phenomenon from different abstraction levels.

## B.7 One non-theoretical but important observation

The skill looks strongly type-theoretic *in retrospect* because the **failure modes** it catches are the same ones that programming language theory has been catching for decades at the code level (effect mixing, ownership violations, precondition/postcondition drift, invariant erosion, specification/implementation divergence). The skill does at the task-specification level what a type checker does at the code level: **preventive, locally-checkable, domain-independent invariant enforcement**. The only difference is the object of typing — task specifications instead of program expressions.

## B.8 What this frame is for (and what it is not)

This appendix is intended to **deepen understanding**, not to drive a refactor. The operational SKILL.md is still needed as the LLM-executable form; the type-theoretic frame sits *underneath* it and explains *why* the rules are what they are. A useful future artifact (out of scope here) would be a short "theoretical introduction" (≈2 pages) pointing out: here is the task-typing discipline; here is how each gate fits; here is why it generalizes. That would give new contributors a skeleton on which to hang the operational rules, rather than asking them to learn 430 lines of SKILL.md cold.
