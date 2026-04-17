# CreatePairflowSpec Skill Evolution

Research log documenting the context behind each gate/rule added to `.claude/skills/CreatePairflowSpec/` between 2026-04-05 and 2026-04-16. Each section captures the triggering bubble (if any), the authoring Codex session, verbatim quotes from that session, the concept-level delta between session and commit, and a synthesis of the problem solved.

Methodology, prompt templates, and progress tracker live in [`docs/spec-skill-evolution-plan.md`](./spec-skill-evolution-plan.md).

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
