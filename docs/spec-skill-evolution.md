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
