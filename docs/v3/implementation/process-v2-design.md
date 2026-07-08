# Packet Flow v2 — Process + Skill Design

Status: **draft** (awaiting the two-arm review; no skill/process file changes
land before this document is ratified).
Date: 2026-07-08.
Provenance: the ch7-P2 eight-round pre-approval retro (process-log, flags
1–13 of `packets/ch7-p2-diag-store.md`), the full `CreatePairflowSpec`
analysis (v1's task/gate/workflow machinery, two-project track record), and
the seven-question decision round (this session). Decision authority: the
user settled every decision below explicitly; this document compiles, it
does not invent.

## 1. Problem

The packet pre-approval loop converges too slowly, and its cost lands in
the wrong place. Evidence: ch7-P1 took 15 refine rounds, ch7-P2 took 8 —
against v1's 1–3 skill-review rounds plus 1–4 pairflow refinement rounds
for comparable task documents. Diagnosis (all three confirmed):

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
   BEFORE drafting (its Complexity-Risk gate retro-scored on P2 fires a
   hard stop: split), an autonomous verdict loop (split/refine/approve,
   mechanically followed), fresh-context re-review, a 4-perspective
   sub-agent review, and a phase split (skill loop optimizes for QUICK
   DOWNSTREAM CONVERGENCE; pairflow's document-refinement finds the rest
   adversarially). None of these existed in the v3 packet flow.

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
| `anchored(ref)` | pulled from a ratified source (ledger §, unit file, plan §, prior packet row, contract-draft §, ADR) |
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
- **ADR relation (four rules):** (1) draft rows may anchor to ADRs as
  provenance; (2) decision-class new-decision rows mint their ADR at DRAFT
  ratification (earlier than today's build-time authoring); (3) shape never
  goes into an ADR — the ADR records decision+rationale and references the
  draft; the draft cites the ADR for decision provenance; (4) after chapter
  close: decisions persist in ADRs, shapes persist in packets/code/tests,
  the draft archives. The routing rule gains its missing third row: *model
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

- **split within the chapter** — sizing, not scope (v1: "whether delivery
  is 5 packets or 7, I don't care"); the coverage script guards the union
  mechanically; the §N.7 repartition is applied directly with a visible
  report; each part gets a fresh watchdog budget;
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
2. **Meaning-changing plan conflict** — an alignment that would ALTER
   ratified semantics rather than propagate them.
3. **Watchdog exhaustion** — round cap reached without approve: STOP with a
   diagnosis (churn composition → size problem: split proposal; undecided
   semantics: draft proposal). Auto-split-remedy delegable later.
4. **Approve of a packet carrying new-decision flags** — the approve's
   substantive content is ratifying those flags. Flag-free approve is
   ceremony and delegable later (D6).

### D4 — The review pipeline (phase 1 internals)

- **Tier 0 — mechanical gates, zero LLM, every fold:** packet-lint
  (id/cross-ref/lane-range/scalar consistency — mechanizes the fresh-eyes
  sweep class), coverage, drift, adr-check, substrate-probe scripts.
- **Tier 1 — the lens panel (the v1 "ReviewSpec with 4 sub-agent
  perspectives" analog), fresh-context sub-agents, single model family is
  FINE here** (model diversity is deliberately phase 2's job). Lenses map
  to v3's observed finding classes:
  1. substrate / contract-reality (probe obligations, strong-word proofs)
  2. projection / delegation-closure (anchors pulled, invalid-but-
     conforming counterexamples)
  3. claim-negatives / matrix-symmetry (every lane driven, collapsed-lane
     inventories, wide-claim coverage)
  4. mirror / propagation (the semantic remainder after packet-lint)
  5. downstream viability (sibling-packet impact, plan consistency — v1's
     Remaining-Task Viability check)
  The panel reconciles through a **Gate Coverage Matrix** (`missing`
  blocks) and collapses to ONE verdict: `split` / `refine` / `approve`
  (+ STOP per D3).
- **Approve =** all tier-0 green + one full clean panel round (no fold-now
  findings) + complete coverage matrix. No severity taxonomy and no
  two-clean at this phase — those are phase-2 (pairflow) configuration.
- **Watchdog: 8 rounds** (v1 used ~9; pure safety cap, not a tuning lever).
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
with a tracked home and a guaranteed revisit point (what v1's
later-hardening backlog lacked):

| Route | Home | Revisit |
|---|---|---|
| `boundary-review` | process-log line | chapter DoD's mandatory log review |
| `later-chapter` | proposed plan-map row | ratified by the human at approve/boundary |
| `declined` | packet flag | visible standing non-decision |

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
    "stops": [ { "type": "<STOP class>", "what": "…", "resolution": "…" } ],
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

Adopt/adapt (with their landing spot): Complexity-Risk + Bounded-Task-Shape
→ authoring-time sizing heuristics feeding the split verdict (v3 axes:
substrate novelty, claim-family/matrix-family/dimension counts,
sibling-packet fanout); Control-Model Readiness → the contract-draft
round-0 checklist (D2); 4-lane sub-agent review + Gate Coverage Matrix +
fresh-context re-review loop → D4; Remaining-Task Viability → the
downstream-viability lens; autonomous-split policy → D3; Capability-Closure
VOCABULARY only (`end_to_end/…/deferred_activation`, one line per packet);
Gate Detail Budget → proportionality principle ("mandatory ≠ maximal");
`target_files` as machine-validatable frontmatter → mutation-boundary
machine block (packet-lint checks the built commit against it);
Review-Scope-Fence's routing half → absorbed into D5's routes; severity
ontology → phase-2 shared language (already canonical in pairflow), skill
side only keeps the mapping obligation.

Reject, with burden of proof: Scoped-Invariant SLICING half (frontally
conflicts with the wide-claim + claim-derived-negatives doctrine — v3's
most expensively learned lesson); Closed-Contract Drift Check (v3's
mechanized drift tests + R-ALIGNED-UP + delegation closure are strictly
stronger); execution metadata / Spec Lock (bubble-machinery — chaining-era
work); Module Depth / Refactoring gate (no refactor-class packet exists
yet; AGENTS.md v1 guidance covers the eventuality); literal authority
fan-out bucket list (v3's fanout is sibling-packet consumption; the
"discovery-first, unknown ≠ absent, unknown blocks" rule is kept);
Capability-Closure full field table (chapter DoD carries the proof side).

## 5. Change plan (ordered; nothing lands before this doc is ratified)

**Phase 0 — mechanical substrate:**
1. `tools/v3-plan/check_packet.py` (packet-lint: id registry, cross-ref
   resolution, lane-range/scalar consistency, provenance-mark presence,
   mutation-boundary block syntax) + `pnpm v3:packet-lint` bridge +
   negative self-tests (the check.sh culture).
2. `task-packet-template.md`: provenance marks on canonical rows; route
   field in the flags section; `packet_metrics` block in the build-record
   convention; mutation-boundary machine block.

**Phase 1 — skill + process authority:**
3. `CreateTaskPacket/Workflows/AuthorPacket.md`: provenance discipline +
   classification output (D1); sizing heuristics; draft-routing STOP;
   entry-mode note.
4. `CreateTaskPacket/Workflows/ReviewPacket.md`: restructure the
   pre-approval engine into the 5-lens panel with Gate Coverage Matrix;
   verdict set split/refine/approve + STOP; approve definition; fix-all
   policy + ambiguity-transfer rationale; route taxonomy; watchdog 8.
5. NEW `CreateTaskPacket/Workflows/DraftContract.md`: the contract-draft
   authoring + ratification workflow (D2), incl. the Control-Model
   checklist and tree-independence bar.
6. `docs/v3/implementation/README.md`: the D3 autonomy envelope + STOP
   list as process authority; the draft phase in the build loop; the
   routing rule's third row (shape → draft); metrics convention.
7. `docs/v3/implementation/plan.md` §1.3: the predicted-class column
   convention for future ratifications (applies from ch8; ch7's remaining
   rows annotated at the boundary).

**Phase 2 — deferred (explicitly NOT now):** pairflow doc-bubble
integration (metadata contract), auto-approve machinery + thresholds,
severity mapping table realization, aggregation tooling.

**Pilot:** ch7-P3/P4 run under the phase-0/1 machinery (both are
precedented/near-projection classes — P3 consumes P1/P2 contracts + plan
§7.4; P4 is the 6-precedent CLI class). The first full contract-draft
exercise is ch8 (template file format — predicted invention). The pilot's
`packet_metrics` are the first calibration data points.

## 6. Review of this document

Per its own rules: this design doc receives the two-arm (cross-model)
review before any Phase 0/1 file changes; findings fold under the fix-all
default; the ratified version is the change plan's authority.
