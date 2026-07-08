# Packet Flow v2 — Process + Skill Design

Status: **draft — rounds 1–3 of the two-arm review folded (§6); awaiting
final approve/ratification.** No skill/process file changes land before
this document is ratified. On ratification the Status flips to
ratified and §5 becomes the change plan's authority; once Phase 0/1 land,
the REALIZED files (README/template/skill/AGENTS.md) are the authority and
this document is a historical record — its own D2 rule ("never a third
permanent authority"), applied to itself.
Date: 2026-07-08.

Provenance, by verifiability class:

- **Tracked:** the ch7-P2 eight-round retro — the process-log P2-retro
  block (landed with the `9e223c2b` skill-gates commit) and the two
  P2-window skill commits. The packet's own flags ledger
  (`packets/ch7-p2-diag-store.md`) is supporting detail only: it lands
  WITH its build commit (one-commit rule), so the tracked process-log
  lines are the citable evidence until then.
- **Repo-verifiable:** every §4 claim about v1 machinery names its source
  file (`.claude/skills/CreatePairflowSpec/…`,
  `docs/reviewer-severity-ontology.md`) — verified against those files
  during the round-1 review.
- **Operator-reported (session-ephemeral):** the v1 operating experience —
  the round counts (1–3 skill-review rounds, 1–4 refinement rounds), the
  ~9-round safety cap of the ExecutePairflowPlan-era autonomous loop
  (present in NO repo file — checked), the mechanical verdict-following
  practice, and the "whether delivery is 5 packets or 7, I don't care"
  sizing stance. These exist nowhere in the repo except here; they are
  marked `(operator-reported)` at their use sites and this document is
  their durable record.

Decision authority: the user settled every decision below explicitly in a
seven-question decision round; **D1–D7 map 1:1 to those seven questions**
(classification / draft artifact / autonomy envelope / review pipeline and
phases / finding policy / trust rollout / metrics). This document compiles
those decisions.

## 1. Problem

The packet pre-approval loop converges too slowly, and its cost lands in
the wrong place. Evidence: ch7-P1 took 15 refine rounds, ch7-P2 took 8 —
against v1's 1–3 skill-review rounds plus 1–4 pairflow refinement rounds
for comparable task documents (operator-reported). Diagnosis (all three
confirmed):

1. **Altitude gap.** ch5 packets converged fast because they PROJECTED from
   a months-converged, row-granular source (the ledger). ch7 packets are
   memo-born: chapter ratification converges ~10 bullet-level decisions,
   the packet needs ~40 row-level contracts — the missing middle altitude
   was filled inside the human pre-approval rounds. "Projection, not
   invention" silently inverts for memo-born surfaces.
2. **The human ran as a message bus, not a decision-maker.** Across P2's
   eight rounds there were ~2 genuine human decisions; the rest of the
   traffic was derivation (sweeps, propagation, re-derivation) and
   probe-able substrate facts, transported manually between sessions.
3. **Missing v1 convergence machinery.** v1's task flow had: sizing gates
   BEFORE drafting (its Complexity-Risk gate retro-scored on P2 trips one
   of its own hard-stop rules — the scope is split-required), an
   autonomous verdict loop (`approve_task` / `refine_task` /
   `route_back_to_plan`, mechanically followed — operator-reported; v2's
   split/refine/approve is D4's adaptation of this set), fresh-context
   re-review, a 4-perspective sub-agent review, and a phase split (skill
   loop optimizes for QUICK DOWNSTREAM CONVERGENCE; pairflow's
   document-refinement finds the rest adversarially). None of these
   existed in the v3 packet flow.

Total convergence work is roughly conserved (pre-approval rounds traded
against build/aftermath rounds — ch4: 4 aftermath rounds; ch7-P1: 15
pre-approval rounds, zero build surprises). The optimization target is
therefore NOT fewer iterations, but: **machine iterations + human only at
decisions.**

## 2. Target picture

```
                       ┌─ human: intent injection (permanent)
                       ▼
  [B-case only] contract-draft round  ──ratified──┐
                                                  ▼
  PHASE 1 — packet creation (the skill's domain, single model, autonomous)
    AuthorPacket (provenance-disciplined projection)
      → review pass: tier 0 (scripts) + tier 1 (lens panel)
      → verdict: split | refine | approve   (+ STOP → human)
      → loop until approve (watchdog-capped)
                       │
                       ▼ human: approve (calibration; auto-approve deferred)
  PHASE 2 — refinement + implementation (pairflow's domain, adversarial,
    cross-model; severity ontology P0–P3, blocking threshold config,
    two-clean-meta stop — ALL pre-existing pairflow workflow configuration,
    out of this design's scope)
```

The human lives on the decision plane (draft ratification, STOP events,
flag-bearing approves), never on the message bus. v1 proved the loop shape
(ExecutePairflowPlan ran creation→review→refinement→implementation fully
autonomously); v3 adds what v1 lacked — a DEFINED mechanism for when a
human must be pulled in, so autonomy no longer produces silent intent
drift.

## 3. Design decisions

### D1 — Packet classification by row provenance (projection vs invention)

Every canonical row of a packet (matrix row, type row, token-list element,
inventory member) carries a provenance class:

| Class | Meaning |
|---|---|
| `anchored(ref)` | pulled from a ratified source (ledger §, unit file, plan §, prior packet row, contract-draft § — ratified-or-later per D2, ADR) |
| `derived(refs)` | no literal source, but entailed by anchored decisions — carries a one-line derivation note |
| `new-decision` | new semantics nothing prior determines |

Classification is DISCOVERED during authoring (reality beats label) and
doubles as the case verdict:

- new-decision ≈ 0, or a handful of peripheral rows → **Case A
  (projection)**: the rows ride as pre-approval flags; the autonomous loop
  proceeds.
- substantial new-decision mass, or ANY new-decision row touching
  authority/separation/availability-class semantics → **Case B
  (invention)**: STOP; exactly that row set becomes the contract-draft's
  content (D2). Calibration-permissive threshold; tightening is a config
  change, not a redesign.

The chapter ratification additionally records a one-word PREDICTED class
per packet-table row (`projection (source: …)` / `invention (memo-born)`),
used for scheduling (draft rounds planned ahead) and as a testable
prediction — a prediction/discovery mismatch is itself a signal (the plan
believed a row-granular source existed; it did not) and routes to a
friction-log line. The authoring-time discovery is always the authority.

### D2 — The contract-draft artifact (the missing altitude)

- **Scope: the CHAPTER's memo-born surface**, not a single packet (ch7's
  churn was cross-packet: one diag-channel contract family fed P1–P4).
- **Home:** `docs/v3/implementation/contracts/chN-<surface>-contract.md`;
  the plan's §N.7 table references it (`draft: …, ratified <date>`). The
  plan stays slim ("ownership, not content" — also a v1 lesson).
- **Granularity bar — tree-independence:** the draft carries what is
  decidable WITHOUT our code tree; the packet adds what requires the live
  tree. Litmus: "if `v3/src` were deleted and rewritten from the packets,
  would this row still be true and decidable?" In: type matrices with FULL
  field lists, contract matrices with every lane, token lists as declared
  claims, presence/enum rules, proof boundaries, inventory SKELETONS
  (lanes/rules/keysets), substrate-probe results (platform facts are
  tree-independent — probes run at draft time). Out (packet-time):
  embedding gates, mutation boundary, inventory source-site columns,
  fixtures, acceptance counts.
- **Lifecycle:** canonical home of its rows DURING the chapter (packets
  anchor to it; the mirror-map machinery handles cross-artifact mirrors);
  at chapter close the boundary review marks it **realized** with pointers
  to where each row landed. Nothing lives only in the draft afterwards —
  it never becomes a third permanent authority.
- **Artifact contract (the anti-third-authority machinery, and what a
  machine can check):** rows carry stable IDs (`C1…Cn`, unique per draft;
  packets anchor as `anchored(chN-<surface>-contract §C7)`). The draft
  header carries `status: draft | ratified | realized` plus a
  ratification block (date, reviewing arms, and a sha256 over the
  **canonical row payload** — the contract rows themselves, row IDs +
  row content, EXCLUDING the status field, the ratification blocks, and
  the realized map: no self-reference, and neither the `realized` status
  flip nor the realized-map addition can break the check; the
  packet-basis discipline applied to drafts; a packet may only anchor to
  a ratified-or-later draft). **Reopening a ratified row is a NEW
  ratification block** (re-hash + human re-ratification — the D6 rule
  that draft ratification never delegates applies to re-ratification
  too); the reopen TRIGGER arrives on the STOP 2 family — a ratified
  draft row vs reality conflict is the flag-1 class's draft-flavored
  analog; the status machine stays monotonic at the STATUS level
  (draft→ratified→realized) while ratification blocks may accumulate. At
  chapter close the boundary review fills a **realized map** (row ID →
  landing site: packet § / code / test) and flips the status IN PLACE —
  the file never moves and row IDs never change, so `anchored(…)`
  references stay resolvable forever (archival is a status transition,
  not a relocation). Draft-lint checks (Phase 0): row-ID uniqueness;
  packet anchors resolve to existing row IDs in a **ratified-or-later**
  draft (a `realized` flip must not break old anchors); status
  transitions monotonic; a ratified-or-later draft's CANONICAL ROW
  PAYLOAD matches its latest ratification block's hash — checked in
  `ratified` AND `realized` status (a silently edited
  post-ratification row is a lint failure, not a quiet
  reinterpretation); `realized` requires a complete landing map.
- **The form's durable authority is docs-side, not this document and not
  the skill:** `docs/v3/implementation/contract-draft-template.md` (§5)
  is the canonical template/format authority, exactly on the
  task-packet-template pattern — the DraftContract workflow carries
  procedure only, and if they disagree, the docs win.
- **Pre-ratification review:** the draft runs the same tier-0
  (draft-lint) + tier-1 panel machinery scoped to its tree-independent
  content (the substrate lens fully applies — probes are
  tree-independent; embedding-class checks are n/a), then the
  transitional cross-model arms, as with packets; the detailed procedure
  lives in the DraftContract workflow (§5 item 5). The draft loop's
  verdict set is the packet loop's minus `split` — a draft that wants
  splitting is a chapter-structure question and therefore a STOP, not an
  autonomous act — and the same watchdog discipline applies (cap 8,
  exhaustion → STOP with diagnosis; the "expected 2–3 rounds" prediction
  is an expectation, not the cap).
- **Draft metrics (one line each, at ratification and at close):** rounds
  to ratify, new-decision row count, post-ratification reopenings (rows a
  packet had to reopen — measured as ratification blocks beyond the
  first) — D2's own "expected 2–3 rounds" prediction is testable only if
  measured.
- **ADR relation (four rules):** (1) draft rows may anchor to ADRs as
  provenance; (2) decision-class new-decision rows mint their ADR at DRAFT
  ratification, and that ADR lands **`accepted` WITH the draft
  ratification** — the ratification IS the human acceptance act (the
  three ADR lanes OF THE PACKET FLOW, stated once here: draft-ratified
  content → accepted at draft ratification; plan-ratified content whose
  ADR is authored during packet work → acceptance rides with the packet
  approve, per D3; a genuinely new ADR-class decision mid-loop → STOP 1,
  and its ADR follows whichever ratification act resolves it. A
  chapter-ratification-born ADR — the ch-2 seed pattern — sits outside
  this list and is accepted by that ratification act itself, today's
  live rule); (3) shape
  never goes into an ADR — the ADR records decision+rationale and
  references the draft; the draft cites the ADR for decision provenance;
  (4) after chapter close: decisions persist in ADRs, shapes persist in
  packets/code/tests, the draft archives. The routing rule gains its missing third row: *model
  decisions → corpus+memos; implementation decisions → ADRs;
  implementation-plane contract SHAPE → contract-draft.*
- **Ratification: lightweight and permanently HUMAN** — this is the intent
  injection point (the antidote to v1's silent drift). The author drafts
  from the chapter's ratified bullets + memos; review runs without packet
  apparatus (no embedding/acceptance/fixture material); expected 2–3
  rounds serving every packet of the chapter. The Control-Model Readiness
  question set (business invariant / control model / read-path / forbidden
  fallback / allowed resolution / missing-data) is the draft's round-0
  checklist — v1's gate, repurposed as the skeleton.

### D3 — Autonomy envelope

**Principle: the loop stops exactly where a NEW SEMANTIC DECISION is
needed** (functionality/behavior/performance trade-off not derivable from
ratified sources). Everything else is mechanical. The new-decision detector
is D1's provenance machinery — one mechanism drives classification, draft
routing, and the autonomy boundary.

Autonomous (no human):

- **split within the chapter** — sizing, not scope ("whether delivery is
  5 packets or 7, I don't care" — operator-reported); the coverage script
  guards the union mechanically; the §N.7 repartition is applied directly
  with a visible report; split parts INHERIT the parent row's mode,
  predicted class, and watchpoints, and each part gets a fresh watchdog
  budget; **autonomous split depth is 1** — a split part wanting a further
  split is a STOP (the diagnosis is then a wrong cut or a missing draft,
  not sizing);
- **propagation-class plan edits** — terminology/consistency sweeps of
  already-decided semantics, applied and visibly reported;
- **ADR recording** of already-ratified decisions;
- **parking proposals** onto routes (D5), batch-ratified at approve;
- probes, panel orchestration, all tier-0 scripts, prepared edits.

STOP (human), four cases:

1. **Undecided semantics surfaces** — new-decision rows exceed the
   threshold mid-loop (late B-signal); divergence stop (model-plane bug —
   the same case's special form); a fold would require a genuinely open
   behavioral/performance choice (contested-probe resolutions that mint
   new-decision rows arrive here too).
2. **Plan-boundary conflict** — three members, one family: an alignment
   that would ALTER ratified semantics rather than propagate them; a
   split that would change chapter scope, sequencing, or dependencies
   (the matrix row below); and a **contested ratified-surface↔reality
   mismatch** (the ReviewPacket `plan_contract_challenge` class) — a
   ratified surface (plan text OR a ratified draft row) and live
   behavior disagree AND more than one resolution direction exists. The precedent is ch7-P2 flag 1: plan §7.3 claimed "-0
   rejected" while the live `getTimeline` accepted it — the row was
   ANCHORED to plan text (not STOP 1) and aligning code to plan reads
   as propagation (not an alteration), yet the (a)/(b) choice — clarify
   the plan text vs harden the ch-6 surface — was a genuine human
   decision. Without this member, that lane would run through the loop
   as an autonomous fold.
3. **Watchdog exhaustion** — round cap reached without approve: STOP with a
   diagnosis (churn composition → size problem: split proposal; undecided
   semantics: draft proposal). Auto-split-remedy delegable later.
4. **Approve of a packet carrying new-decision flags** — the approve's
   substantive content is ratifying those flags. Flag-free approve is
   ceremony and delegable later (D6).

**Verdict-action matrix** (this is the authority-surface change the design
requires — Phase 1 rewrites all THREE live surfaces in ONE commit, see §5
item 8, because they may never disagree with the running process or with
each other. What they say TODAY, verified: `AGENTS.md`'s v3 section
states verbatim that "packet pre-approval verdicts (approve / refine /
split) come from the USER"; `CreateTaskPacket/SKILL.md`'s Hard boundaries
section carries the same checkpoint set (packet pre-approval verdict, ADR
proposed→accepted) as never-automated — the skill's own entry rules would
contradict its workflows if left; README §5.5's standing-checkpoint list
is narrower but still conflicts — "refine/split verdicts when a
mechanical gate fails" is a human checkpoint, and "ADR proposed →
accepted" is listed as never automated, all of which v2 changes: refine
and in-chapter split are the loop's in every case, and ADR acceptance of
PLAN-ratified content authored during packet work rides with the approve
(the three ADR lanes are stated once, in D2's ADR-relation rule 2 —
draft-ratified content is accepted AT draft ratification, not here), with
genuinely new ADR-class decisions arriving as STOP 1):

| Loop event | v2 action |
|---|---|
| `refine` (any fold-now finding) | autonomous: fold + re-run panel |
| `split`, within chapter (coverage union preserved) | autonomous: apply the §N.7 repartition, visible report; inheritance + depth-1 rule above |
| `split` that would change chapter scope, sequencing, or dependencies | STOP 2 |
| `approve`, flag-free | human in calibration; delegable per D6 |
| `approve`, with new-decision flags | human (STOP 4) — ratifies the flags AND the parked routes in one act |
| STOP 1–3 events | human, always |

### D4 — The review pipeline (phase 1 internals)

- **Tier 0 — mechanical gates, zero LLM:** packet-lint at FOLD TIME (id
  registry, cross-ref resolution, lane-range/scalar consistency,
  provenance-mark presence, mutation-boundary block syntax, the D2
  draft-lint checks — mechanizes the fresh-eyes sweep class) and at
  POST-BUILD (the `git diff --name-only` mutation-boundary check — the
  one packet-lint check that cannot run at fold time); plus coverage,
  drift, adr-check, and the substrate-probe scripts. §5 item 1 is the
  single home of every packet-lint check.
- **Tier 1 — the lens panel (the v1 "ReviewSpec with 4 sub-agent
  perspectives" analog), fresh-context sub-agents, single model family is
  FINE here** (model diversity is deliberately phase 2's job). Lenses map
  to v3's observed finding classes:
  1. substrate / contract-reality (probe obligations, strong-word proofs)
  2. projection / delegation-closure (anchors pulled, invalid-but-
     conforming counterexamples) — additionally OWNS two provenance
     duties: (a) the **derived-row entailment attack**: for each
     `derived(refs)` row, attempt to construct an ALTERNATIVE row equally
     consistent with the cited anchors — if one exists, the row was a
     decision, not a derivation → reclassify `new-decision` (the
     misdeclaration risk lives exactly here: `anchored` is
     machine-checkable, `new-decision` stops — `derived` is the soft
     spot); (b) the **draft→packet semantic drift check**: a packet row
     anchored to a draft row must preserve its MEANING, not just resolve
     the reference — the mechanized drift tests cover model↔code, not
     this surface
  3. claim-negatives / matrix-symmetry (every lane driven, collapsed-lane
     inventories, wide-claim coverage)
  4. mirror / propagation (the semantic remainder after packet-lint)
  5. downstream viability (sibling-packet impact, plan consistency — v1's
     Remaining-Task Viability check)
  The panel reconciles through a **Gate Coverage Matrix** (`missing`
  blocks) and collapses to ONE verdict: `split` / `refine` / `approve`
  (+ STOP per D3). The verdict set is an ADAPTATION of v1's, renamed along
  the operator's actual usage — the v1 originals (`ReviewSpec` task-mode):
  `approve_task` / `refine_task` / `route_back_to_plan` /
  `block_not_ready`, with split as the within-plan-scope refine qualifier
  (`split_task_within_same_plan_scope`) and `split_plan` existing only in
  plan-mode; v2's `split` maps to the refine qualifier, v2's STOP absorbs
  `route_back_to_plan`/`block_not_ready`.
- **Approve =** all tier-0 green + one full clean panel round (no fold-now
  findings) + complete coverage matrix — **no `missing` AND no unresolved
  `unknown`** (the adopted Closure-Budget discovery rule lands exactly
  here: an `unknown` discovery state blocks approve until INSPECTED —
  inspection converts it to a known present/absent-with-evidence state,
  which may THEN be routed (out-of-scope / later-chapter /
  boundary-review) or split away; an uninspected `unknown` is never
  routable, because routing an unknown would launder ignorance into a
  decision; it is neither a fold-now finding nor a `missing` matrix cell
  — it is its own blocker class). No severity taxonomy and no
  two-clean at this phase — those are phase-2 (pairflow) configuration.
- **The panel report keeps the ReviewPacket finding taxonomy**
  (`packet_defect` / `packet_plan_drift` / `plan_contract_challenge` /
  `watchpoint` / `considered_not_finding`) and its "nothing is dropped
  silently" discipline — every considered issue is classified;
  `plan_contract_challenge` routes to STOP 2 (never silently accepted,
  never silently "fixed"); `packet_plan_drift` BIFURCATES per D3
  (propagation-class resolution → autonomous plan edit; meaning-changing
  → STOP 2); `packet_defect` → fold-now; `watchpoint` maps to the D5
  routes.
- **Watchdog: 8 rounds** — a pure safety cap, not a tuning lever. (The
  v1-era ExecutePairflowPlan autonomous loop ran with a similar ~9-round
  cap — operator-reported, documented in no repo file; `CreatePairflowSpec`
  itself carried only the "max 2 L1 hardening rounds" discipline, which is
  a different mechanism and deliberately NOT adopted — it belongs to the
  severity-routing world that D5's fix-all replaces.)
- **Phase 2 (out of scope here):** the pairflow document-refinement bubble
  with the canonical severity ontology (`docs/reviewer-severity-ontology.md`),
  blocking-threshold config, adversarial cross-model agents and the
  two-clean-meta stop. Sole phase-1 obligation toward it: packet
  findings/flags/routes must stay EXPRESSIBLE in that ontology's language
  (timing/layer mapping) for when packets flow through doc-bubbles.
  Interim: the user's manual cross-model arms play phase 2 — explicitly a
  TRANSITIONAL skill-validation scaffold, no formal stop criterion; it
  retires as skill trust builds. Quality feedback comes from downstream
  convergence itself (D7).

### D5 — Finding policy: fix-all default, ownership-based routes

**Default: every panel finding is fixed.** Two grounds (both from v1
experience): (a) Bayes — a non-approve triggers a fresh-context re-review
that will likely re-find an unaddressed issue, so deferral saves nothing;
(b) **ambiguity transfer — the fresh-context reviewer is a proxy for the
build-time implementer**: what was ambiguous to one LLM in a clean context
will be ambiguous to the next. This principle goes into the skill text.

Routes exist ONLY for ownership misfit, never for effort deferral — each
with a tracked home. The two DEFERRAL routes carry a guaranteed revisit
point (what v1's later-hardening backlog lacked); `declined` deliberately
does not, because it is not a deferral — it is a DECISION, human-ratified
at approve as part of the flags:

| Route | Home | Revisit |
|---|---|---|
| `boundary-review` | process-log line | chapter DoD's mandatory log review |
| `later-chapter` | proposed plan-map row | ratified by the human at approve/boundary |
| `declined` | packet flag (with the stated reason) | none BY DESIGN — a human-ratified standing decision, not a parked item |

### D6 — Trust rollout (what remains of "the ramp")

The STOP list IS the system; there is no separate staging apparatus. What
remains:

- **The human approve is the detector's measurement instrument** during
  calibration: each approve asks "did the human find new-decision content
  the detector did not flag?" A miss is a detector bug → fix the rule, do
  not add process.
- **Auto-approve of flag-free packets is a deferred, per-work-type,
  evidence-based step**; thresholds are calibrated when measurement data
  exists (D7), not now.
- **The entry mode is the trust dial:** the user chooses per work item —
  prompt-by-prompt in the loop, or delegating a whole packet/chapter. No
  formal mechanism needed; the system supports both cleanly, and
  provenance makes any late-discovered mismatch traceable to its decision
  point (detector bug vs draft gap vs plan under-specification).
- **The draft ratification never delegates**, at any trust level.

### D7 — Metrics

One compact machine block per packet, written once at close, in the
packet's Build record (the `ledger_slice` precedent):

```json
{
  "packet_metrics": {
    "class": "<packet class>",
    "prediction": {
      "predicted": "projection|invention",
      "reasoning": "<one line — why, at ratification>",
      "discovered": "projection|invention"
    },
    "provenance": { "anchored": 0, "derived": 0, "new_decision": 0 },
    "rounds": { "review": 0, "doc_refinement": 0, "implementation": 0 },
    "stops": [ { "type": "<STOP class — for family STOPs the MEMBER, e.g. 2:contested-ratified-vs-reality, never the bare family number>", "what": "…", "resolution": "…" } ],
    "detector_misses": [
      { "found_at": "approve|code-review|architecture-review|refinement|implementation",
        "what": "…", "why_missed": "…" }
    ],
    "learned": "<one-line session assessment — hook, not a process-log substitute>"
  }
}
```

- `rounds.review` = phase-1 panel rounds; `doc_refinement` and
  `implementation` = the pairflow runs' rounds (until pairflow carries
  implementation, `implementation` ≈ build + post-build fix rounds).
- `prediction.reasoning` and `detector_misses[].why_missed` are the
  pattern-mining surfaces (why we mispredict; which lens/rule is weak).
- Late discoveries (code/architecture review "oops" moments) add a
  process-log line + increment the block.
- Answers three questions only: is the packet good (downstream rounds)?
  is the detector reliable (misses)? where is the bottleneck (round/lens
  distribution)? **No aggregation tooling until packet count justifies
  it.**

## 4. What we take from CreatePairflowSpec (v1) — and what we prove out

Source files: `.claude/skills/CreatePairflowSpec/SKILL.md` (gate policy
blocks), its `references/` gates, `Templates/task-template.md`,
`Workflows/ReviewSpec.md` + `CreateTask.md`, and
`docs/reviewer-severity-ontology.md` — every line below was verified
against these during the round-1 review.

**Adopt/adapt, with landing spot:**

- Complexity-Risk Gate (`references/Complexity-Risk-Gate.md`) +
  Bounded-Task-Shape Gate → authoring-time sizing heuristics feeding the
  split verdict (v3 axes: substrate novelty, claim-family/matrix-family/
  dimension counts, sibling-packet fanout).
- **Closure-Budget Gate** (SKILL.md `## Closure-Budget Gate`) → its two
  live rules adopted: the discovery rule ("present/absent/unknown with
  evidence; `unknown` BLOCKS approve") into the D4 approve definition —
  an unresolved `unknown` is its own blocker class there — and its
  bucket-coincidence split trigger adapted into the sizing heuristics
  (v3 buckets: claim families, matrix families, sibling-packet
  consumers).
- Control-Model Readiness Gate → the contract-draft round-0 checklist (D2).
- 4-lane sub-agent review + Gate Coverage Matrix + fresh-context re-review
  loop (`Workflows/ReviewSpec.md`) → D4.
- Remaining-Task Viability check → the downstream-viability lens.
- Autonomous-split policy (SKILL.md `## High-Risk Autonomous Split
  Policy`) → D3.
- **Contract-Dense Task Gate → ALREADY ADOPTED pre-v2** (the packet
  template's Mirrored Surface Map and prose-contract extraction carry its
  provenance explicitly — the ch7-P1-era inheritance); listed so this
  inventory is complete.
- Capability-Closure VOCABULARY only
  (`end_to_end/…/deferred_activation`, one line per packet).
- Gate Detail Budget → the proportionality principle ("mandatory ≠
  maximal").
- `target_files` frontmatter → the mutation-boundary machine block. NOTE:
  v1's Target-File Reality Check was LLM/manual inspection — the MACHINE
  validation is new to v2 (packet-lint runs a post-build
  `git diff --name-only` of the packet commit against the declared
  boundary).
- Review-Scope-Fence's ROUTING half → absorbed into D5's ownership routes.
- **Scoped-Invariant Gate → SPLIT verdict:** the slicing doctrine
  (`applies_to`/`does_not_apply_to`) stays REJECTED — it frontally
  conflicts with the wide-claim + claim-derived-negatives doctrine, v3's
  most expensively learned lesson; but its proof-surface demand survives
  as the proof-boundary convention (live practice since ch7-P2's shape
  gate), and its fence half is the D5 routing above.
- **Closed-Contract Drift Check → ADAPT NARROW:** as a prose apparatus for
  the model↔code surface it stays rejected (the mechanized drift tests +
  R-ALIGNED-UP + delegation closure are strictly stronger there); but the
  draft→packet row relationship (D2) creates a NEW drift surface the
  machine tests do NOT cover — that check is lens 2's explicit duty (D4).
- Severity ontology (`docs/reviewer-severity-ontology.md`) AND v1's
  skill-side severity apparatus (`references/Reviewer-Guidelines.md`:
  P0–P3 + timing + layer + evidence, referenced by ReviewSpec — it DID
  exist in the task-creation phase): **deliberately dropped from phase 1
  BECAUSE of D5** — severity is a routing tool, and fix-all removes
  routing-by-severity; it remains phase 2's canonical language, with the
  phase-1 obligation that flags/routes stay expressible in it.

**Reject, with burden of proof:**

- Execution metadata / Spec Lock (bubble machinery — chaining-era work;
  the template itself defers the choice to "when chaining starts").
- Module Depth / Refactoring gate (no refactor-class packet exists yet;
  AGENTS.md v1 guidance covers the eventuality).
- **Baseline Preservation gate** (same reasoning: no
  existing-behavior-refinement packet class yet; when it appears, its
  must-preserve rows are `anchored` rows by construction and the drift
  suite owns the regression surface).
- Literal authority fan-out bucket list (v3's fanout is sibling-packet
  consumption; the discovery rule is kept via Closure-Budget above).
- Capability-Closure full field table (the chapter DoD carries the proof
  side).

## 5. Change plan (ordered; nothing lands before this doc is ratified)

**Phase 0 — mechanical substrate:**
1. `tools/v3-plan/check_packet.py` (packet-lint: id registry, cross-ref
   resolution, lane-range/scalar consistency, provenance-mark presence,
   mutation-boundary block syntax, **post-build mutation-boundary check**
   — `git diff --name-only` of the packet commit vs the declared boundary
   — and the D2 **draft-lint** checks: row-ID uniqueness, anchor
   resolution to row IDs in a ratified-or-later draft, monotonic status,
   canonical row payload matches the latest ratification block's hash,
   complete realized map)
   + `pnpm v3:packet-lint` bridge + negative self-tests (the check.sh
   culture).
2. `task-packet-template.md`, split by authority weight: the ADDITIVE
   machine blocks are Phase-0-safe (provenance marks on canonical rows;
   route field in the flags section; the **Build record section
   formalized into template §1** — today it exists by practice only —
   carrying the `packet_metrics` block; mutation-boundary machine
   block); but the **§2 projection-checklist rewrite is
   AUTHORITY-BEARING and lands in the authority-flip commit (item 8)** —
   §2 is the checklist the AuthorPacket workflow itself declares
   authoritative, and under the docs-win rule an un-updated §2 would
   formally OVERRIDE the rewritten workflows. The §2 alignment: the D1
   classification step, the sizing heuristics, the draft-routing STOP,
   and step 10's review description rewritten from the
   content-half/ergonomic-half rubric to the lens-panel form.

**Phase 1 — skill + process authority** (items 3–8 define CONTENT; every
authority-bearing piece lands together in item 8's single flip commit):
3. `CreateTaskPacket/Workflows/AuthorPacket.md`: provenance discipline +
   classification output (D1); sizing heuristics; draft-routing STOP;
   entry-mode note.
4. `CreateTaskPacket/Workflows/ReviewPacket.md`: restructure the
   pre-approval engine into the 5-lens panel with Gate Coverage Matrix;
   verdict set split/refine/approve + STOP; approve definition; fix-all
   policy + ambiguity-transfer rationale; route taxonomy; watchdog 8.
   **PRESERVED SURFACES** (the restructure must not drop the
   ch7-P2-retro gates that landed in this same file days ago — our own
   propagation lesson applied to skill files): the Substrate Reality
   Probe + contested-probe corollary → lens 1; Projection/Delegation
   Closure → lens 2; the Packet-basis hash binding and the report
   validity gate → the panel's report contract; **the finding taxonomy
   + the "nothing is dropped silently" discipline → the panel report
   (D4), with `plan_contract_challenge` wired to STOP 2**. Each must be
   traceable to a named lens or report element in the new structure.
5. NEW `docs/v3/implementation/contract-draft-template.md` — the
   canonical FORM authority for drafts (row-ID scheme, status field,
   ratification block, realized map — the task-packet-template pattern:
   docs win, the skill carries procedure) — plus NEW
   `CreateTaskPacket/Workflows/DraftContract.md`: the authoring +
   review + ratification PROCEDURE (D2), incl. the Control-Model
   checklist and tree-independence bar. Without the docs-side template,
   the form's authority would default to this historical design doc or
   the skill — both wrong per D2's own rule.
6. README content, TO BE INCLUDED IN ITEM 8 (this item defines content
   only, it is not a separate commit): the D3 autonomy envelope + STOP
   list as process authority; the draft phase in the build loop; the
   routing rule's third row (shape → draft); metrics convention.
7. `docs/v3/implementation/plan.md` — TWO sections: §1.3 gains the
   predicted-class column convention for future ratifications, and the
   ch7 §7.7 packet-table rows (P3/P4) are annotated IN THIS SAME COMMIT
   — before P3 authoring starts — so the pilot's `prediction` fields
   carry real pre-registered predictions (a boundary-time
   retro-annotation would make them worthless).
8. **The authority-flip commit — EVERY authority-bearing edit of Phase 1
   lands as ONE commit.** The class regenerates at every level (round-2
   caught README-vs-itself; round-3 caught SKILL.md-vs-its-own-Workflows
   in the window between items 3–4 and a later item 8): any partial
   landing leaves one authority surface contradicting another. The ONE
   commit therefore carries: items 3–4 (the two workflow rewrites), item
   5's workflow half (DraftContract + the docs-side template), item 6's
   README content, item 2's §2 checklist rewrite, `AGENTS.md`'s verbatim
   sentence ("packet pre-approval verdicts (approve / refine / split)
   come from the USER"), `CreateTaskPacket/SKILL.md`'s Hard boundaries
   section (the third live authority surface — it directs the agent at
   skill entry and today carries the same pre-approval-verdict + ADR
   proposed→accepted checkpoints), and README §5.5's standing-checkpoint
   list (its "refine/split verdicts when a mechanical gate fails" clause
   and its unconditional "ADR proposed → accepted" entry). All rewritten
   to the D3 verdict-action matrix (STOPs and flag-bearing approves are
   the user's; refine and in-chapter split are the loop's; the three
   packet-flow ADR lanes per D2 rule 2). The surviving never-automated
   checkpoints — chapter ratification, divergence stop, draft
   ratification (new) — are restated identically on every surface. NO
   packet work starts between Phase 0 landing and this commit.

**Phase 2 — deferred (explicitly NOT now):** pairflow doc-bubble
integration (metadata contract), auto-approve machinery + thresholds,
severity mapping table realization, aggregation tooling.

**Pilot:** ch7-P3/P4 run under the phase-0/1 machinery. The class
predictions — pre-registered into plan §7.7 by item 7 above, BEFORE P3
authoring: P3 `projection` (sources: the P1/P2 packet contracts + plan
§7.4), P4 `projection` (the six-precedent CLI class + plan §7.5). The
first full contract-draft exercise is ch8 (template file format —
predicted `invention`). The pilot's `packet_metrics` are the first
calibration data points.

## 6. Review of this document

Per its own rules: this design doc receives the two-arm (cross-model)
review before any Phase 0/1 file changes; findings fold under the fix-all
default; the ratified version is the change plan's authority.

**Round 1 (2026-07-08): both arms returned refine; all findings folded.**
The fold classes: provenance/attribution precision (verifiability-class
header, operator-reported markers, the watchdog attribution corrected to
the ExecutePairflowPlan-era operator experience, the v1 verdict-set named
as an adaptation), §4 inventory completeness (Closure-Budget,
Contract-Dense-already-adopted, skill-side severity, Baseline
Preservation), design completions (the D2 artifact contract + draft
metrics + in-place archival, the D3 verdict-action matrix + split
inheritance/depth-1, the lens-2 derived-entailment attack and
draft→packet drift duty, the D5 declined-route reframing, the Phase-0
post-build boundary check + draft-lint, the Build-record formalization,
the AGENTS.md/README §5.5 authority alignment item, the pre-registered
pilot predictions, the ReviewPacket preserved-surfaces list). Three
findings were consciously narrowed rather than adopted whole: the
declined route carries no revisit BY DESIGN (it is a ratified decision,
not a deferral); the Scoped-Invariant slicing doctrine stays rejected
(the fence/proof-boundary halves adopted); the Closed-Contract Drift
Check is adapted narrowly to the new draft→packet surface only.

**Round 2 (2026-07-08): both arms returned refine (small round); all
findings folded.** Arm 1: the third live authority surface
(`CreateTaskPacket/SKILL.md` Hard boundaries) joined item 8; the
contract-draft gained its durable docs-side form authority
(`contract-draft-template.md`, item 5 — the task-packet-template
pattern); the ADR lifecycle disambiguated into three lanes stated once
in D2 rule 2 (draft-ratified → accepted AT draft ratification;
plan-ratified authored in packet work → acceptance rides with approve;
new mid-loop → STOP 1); the status header now tracks the review rounds.
Arm 2 (hunting rifts the round-1 folds themselves minted — the "rule
change MINTS lanes" lesson applied to the doc): items 6+8 collapse into
ONE authority-alignment commit (a two-commit split would have made the
README contradict itself); the Closure-Budget `unknown` rule landed in
the approve definition ("no missing AND no unresolved unknown" — its own
blocker class); STOP 2 widened into the plan-boundary conflict family
whose third member is the contested plan↔reality mismatch
(`plan_contract_challenge` — the ch7-P2 flag-1 precedent would otherwise
run through the loop as an autonomous fold), and the ReviewPacket
finding taxonomy + "nothing dropped silently" joined the preserved
surfaces; draft reopening defined (a new ratification block, human
re-ratified, with the lint checking ratified bytes against the latest
block's hash); the anchor predicate corrected to ratified-or-later; item
7 names both plan sections (§1.3 + §7.7); the draft's pre-ratification
reviewer stated (tier-0/tier-1 scoped to tree-independent content, then
the transitional arms; procedure in DraftContract).

**Round 3 (2026-07-08): both arms returned refine (small round); all
findings folded.** Arm 1: the ratification hash got its canonical
payload (contract rows only — status, ratification blocks, and realized
map excluded: no self-reference, and the check now runs in `ratified`
AND `realized` status); the `unknown` blocker lost its routing loophole
(inspection first — an uninspected unknown is never routable); item 6
reworded to content-only. Arm 2 (the authority-flip edge cases): Phase 1
collapsed into a SINGLE authority-flip commit — the round-2 README fix
had regenerated one level down as SKILL.md-vs-its-own-Workflows, so the
rule is now stated at the class level (every authority-bearing edit
lands together, no packet work in between); the template §2
projection-checklist rewrite joined the flip (under docs-win, an
un-updated §2 would have formally overridden the new workflows — the
sharpest catch of the round); the reopen trigger wired to STOP 2 (a
ratified surface is plan text OR a ratified draft row) with `stops[]`
recording the family MEMBER; the "exactly three ADR lanes" scalar
narrowed to the packet flow (chapter-ratification-born ADRs accepted by
that act, outside the list); the taxonomy map completed
(`packet_plan_drift` bifurcates per D3); the draft loop got its verdict
set (packet's minus `split` — a draft split is a chapter-structure STOP)
and the same watchdog cap.
