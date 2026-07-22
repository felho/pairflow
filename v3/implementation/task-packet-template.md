# Task Packet — Template + Projection Checklist

Status: chapter-1 named deliverable (PI-11), ratified 2026-07-07.
Process context: [`README.md`](README.md) §5.2–5.3 (the two-layer principle
and the constraint-transformation discipline);
[`plan.md`](plan.md) §1.4 (the inventory the slice declaration feeds).

Executed **manually** during the calibration stage; since 2026-07-08 the
flow runs through the repo-local `CreateTaskPacket` skill (README §8 —
this file stays the canonical template/checklist/registry source; the
skill carries procedure only). The global `CreatePairflowSpec` stays
untouched — its ergonomics layer is inherited below as rubric content,
not by forking the skill.

**Pairflow metadata rule.** The packet is the executable unit (plan genre
note), but this template does not itself satisfy the v1 Pairflow task
metadata contract. A packet enters the machinery in one of two forms:
either it is authored WITH Pairflow Task frontmatter (the packet IS the
task document), or it is embedded as the **"v3 packet" section** of a
metadata-bearing Pairflow task document — in which case the wrapper task
owns routing/lineage/bubble metadata and the packet is content, **not a
standalone routing authority**. During calibration (manual execution)
either form is fine; the choice per task class is recorded when chaining
starts.

## 1. The template

````markdown
# Task Packet: <packet-id> — <title>

Plan step: <plan.md chapter/step reference>
Autonomy stage: calibration | measurement | chaining
Classification: projection | invention — <one-line derivation from the
manifest tally + the semantic trigger (README §5.5 D1)>

## Ledger slice (declared — feeds the coverage accounting)

The slice is declared ONCE, in the machine block below — the coverage
script (`tools/v3-plan/check_coverage.py`, plan §3.6) parses it. No prose
duplicate beside it (prose drifts; the block is the declaration).

```json
{
  "ledger_slice": {
    "units": [
      { "id": "<section>/<UnitName>", "disposition": "<unit-disposition>" }
    ],
    "rejections": ["<exact rejection string from ledger §3>"],
    "invariants": [
      { "id": "<section>/<slug>", "disposition": "<invariant-disposition>" }
    ],
    "traces": ["<section>"],
    "shared_ownership": [
      { "item": "<unit or invariant id>", "co_owner": "<packet-id>" }
    ]
  }
}
```

Syntax (machine tokens, no free-form variants — the script rejects them):
- unit `id` = `<section>/<UnitName>` ↔ the file
  `v3/model/units/<section>/<UnitName>.txt`; `<unit-disposition>` one of
  `implement` | `type/schema` | `test-only` | `generated/mapped` |
  `alias/inherited` | `review-only`;
- `rejections` = exact names from ledger §3;
- invariant `id` = `<section>/<slug>` from ledger §2;
  `<invariant-disposition>` one of `checker` | `type/schema` | `test` |
  `review`;
- `traces` = unit-section names (chapter traces); rejection-branch trace
  refs join the syntax when the scoped extension starts;
- `shared_ownership` = `[]` when none — an absent declaration with an
  overlapping slice is a coverage error, not an implicit share.

## Operative material (full text — projection, not invention)
<The unit pseudocode VERBATIM. The exact rejection strings — never
"name things consistently". The trace as an executable expectation:
"make this committed-row sequence pass" — never narrated behavior.>

## In-context notes (the scarce budget — see checklist step 5)
<ONLY: intent notes, embedding knowledge, non-lintable idiom/tradeoff
calls. Every line here has failed both the "can it become environment?"
and the "can it become data?" tests.>

## Embedding gates (v1-inherited, unchanged in kind)
- Target files: <...>
- Entrypoints: <...>
- Mutation boundary: <the files this task may change; extend-don't-fork notes>

The machine face of the mutation boundary (v2 — its presence is what
marks a packet as v2 for the lint; the post-build check compares the
packet commit's changed files against it):

```json
{
  "mutation_boundary": {
    "files": ["<repo-relative path>", "..."]
  }
}
```

## Row manifest (v2 — the D1 classification's machine face; Amendment 1)

ONE machine block declares every canonical row's provenance. The
inline-mark convention (`[P:*]`) was withdrawn at DESIGN TIME
(Amendment 1) — it never went live; the lint rejects a reappearing
mark or standalone counts block, because a second provenance home a
reader might trust is the drift class. Rules (lint-enforced):

- row ids unique, lane-grammar shaped — one or two uppercase letters +
  an integer with NO leading zeros (`O01` is red), compared as EXACT
  strings — and **bidirectionally table-defined**: every manifest id
  is the FIRST cell of a table row and every table-defined lane id is
  in the manifest (fenced code is excluded; reserved non-lane
  families: `P`). Finer elements (token-list members, inventory
  members) travel with their host row;
- `class` ∈ `anchored` / `derived` / `new-decision`; anchored/derived
  carry ≥1 ref, new-decision carries none;
- every ref either parses EXACTLY as a strict form —
  `contract:ch<N>-<surface>#C<n>` (a ratified-or-later contract-draft
  row) or `ADR-<NNN>` (file exists) — or carries the `prose:` prefix
  with a NONEMPTY remainder (unverified, human-facing provenance:
  ledger §, plan §, packet §); anything else is red;
- a `derived` row's one-line DERIVATION NOTE lives in the row's own
  table text — review material for the lens-2 entailment attack,
  never manifest data (the manifest keyset stays {id, class, refs});
- close-time counts live in `packet_metrics.provenance` and must equal
  the manifest tally (lint-locked; the duplicate home is deliberate —
  D7's aggregation surface reads the metrics block);
- every PROSE statement of the tally (`<n> anchored / <m> derived /
  <k> new-decision`, e.g. the Classification line) is lint-locked to
  the manifest at EVERY run, not just at close (the fold-time
  prose-tally cross-lock, ch8-opening fix — the AL-20 rule: compute
  tallies from the block, never recall; a quoted/fenced tally is
  material and stays out of the scan).

```json
{
  "packet_rows": {
    "rows": [
      { "id": "O1", "class": "anchored", "refs": ["contract:ch7-diag#C3"] },
      { "id": "O2", "class": "derived", "refs": ["ADR-006", "prose:plan §7.2"] },
      { "id": "O3", "class": "new-decision", "refs": [] }
    ]
  }
}
```

## Pre-approval flags

<Every flag, narrowing, or decision point the summary will raise lives
HERE in full — the summary may only reference it. Each flag carries a
route:> `Route: fold-now | boundary-review | later-chapter |
approve-ratified | declined — <reason>` <(a `declined` route ALWAYS
carries its stated reason: it is a human-ratified standing decision
with no revisit by design — README §5.5; `approve-ratified` marks a
decision whose ratification point IS the approve act — a resolved
STOP verdict OR a below-Case-B new-decision riding to a human
approve — the flag is the dated decision record, revisit: none, the
approve ratified it; minted at the ch7-P3 pilot, generalized at the
ch7 boundary)>

## Acceptance
- Contract tests: <CT-* ids this packet must turn green>
- Checks: <CHK-* ids in force>
- Test disciplines + family inventories: <each test obligation stated
  as a DISCIPLINE over a DECLARED family inventory — parameterized
  membership with its owner named — never fixture-level enumeration;
  the enumeration is build work, verified member-by-member by the
  build-close arm gate's sensitivity pass (README §5.5 altitude line)>
- Drift tests green (standing, unconditional — PI-3)
- Standing review rules in force: <REV-* ids from §3 applicable here>

## Build record

<Filled at build close: rounds, test delta, surprises — prose; plus the
machine block. The prose NAMES the BUILD EXECUTION CONTEXT used
(fresh-context-delegated [the README §4 default] vs main-context, plus
any build-guidance notes handed over) and the Aftermath names the
AUTHOR of each fix (build agent vs orchestrator) — data for the
boundary's authorship read (ch12 boundary; no authorship rule exists
yet by design). `stops[].type` comes from the canonical STOP member-token
registry (README §5.5). `baseline_note` (optional) is the ONLY home for
unit/regime qualifiers — never ad hoc keys. `main_thread_model`
(adopted at the ch12 boundary — the model-tier experiment's capture
gap) records the MAIN thread's model id (e.g. `claude-fable-5`,
`claude-opus-4-8`); required on every packet from ch13 on
(lint-optional for grandfathering), because tier decisions cannot be
adjudicated from memory.>

```json
{
  "packet_metrics": {
    "class": "<packet class>",
    "prediction": { "predicted": "projection", "reasoning": "<why, from ratification>", "discovered": "projection" },
    "provenance": { "anchored": 0, "derived": 0, "new_decision": 0 },
    "rounds": { "review": 0, "doc_refinement": 0, "implementation": 0 },
    "stops": [],
    "detector_misses": [],
    "learned": "<one-line hook — the process-log carries the detail>",
    "main_thread_model": "<model id of the main authoring/build thread>"
  }
}
```
````

## 1a. The v2 machine blocks (process-v2-design.md §5, Phase 0)

Carrier per process-v2-design.md §7 (Amendment 1, ratified 2026-07-09
— manifest + git-native ratification); the §2 checklist carries the
process-v2 steps since the Phase-1 flip (2026-07-09). **Mirror rule
(packet side):** §1 + this section are the canonical PACKET-form
authority and the lint's packet form checks are their mechanical
mirror — on a mismatch the TEMPLATE wins and the lint is the bug,
scoped to form checks over declared data (the lint's gate/audit
checks have their own homes: README §5.5 and the audit contract
below). This section is
the CANONICAL statement of the cross-cutting machine-block rules —
duplicate JSON keys are parse errors, and fences follow the
line-oriented CommonMark scanner (openers/closers may be indented 0–3
spaces; a longer outer fence QUOTES inner fences as material) — the
contract-draft template defers to it:

- **A packet is v2 iff it carries the `mutation_boundary` machine
  block.** The 16 pre-v2 packets (ch4–ch7-P2) are GRANDFATHERED: the
  lint reports and skips them; v2 obligations bind from the ch7-P3
  pilot onward, never retroactively. No silent demotion: a packet
  NAMING `mutation_boundary` in raw text stays v2 even when that
  fence is malformed.
- **Lint:** `pnpm v3:packet-lint` (selftest + live; wired into the CI
  surfaces). Fold-time checks (Amendment-1 carrier): machine-block
  syntax with exact keysets, the `packet_rows` manifest rules
  (strict-or-`prose:`-prefixed refs, bidirectional table-defined lane
  ids), withdrawn-carrier rejection, and the `packet_metrics` deep
  schema + manifest-tally cross-lock. Post-build check:
  `check_packet.py --post-build <commit-sha> --packet <path>` — the
  audited ref must be a PINNED commit sha (hex shape AND resolving to
  a COMMIT object: HEAD, branch, and tag names are rejected — they
  move — and a tag OBJECT is not the build commit), the commit must
  change the packet file itself (the one-commit rule, enforced
  positively — a code-only or follow-up commit is the wrong audit
  target), the boundary is read from the PACKET'S BYTES AT the
  audited commit and re-validated against the full shape rules on the
  audit path, and its changed files must stay inside the declared
  boundary (plus the packet file). The vacuous-audit family is closed
  at the sink: merge commits rejected, root commits diffed against
  the EMPTY TREE, an empty change list red regardless of cause.
  Invocation: README §4 step 8 (build-close; no CI surface runs this
  mode).
- **Contract-drafts** (`v3/implementation/contracts/`) are linted
  by the same tool per the D2 artifact contract on the Amendment-1
  carrier: meta block, C-row registry, `{date, arms, commit}`
  ratification blocks (dates non-decreasing; the block lands in a
  follow-up commit — the recorded sha binds content, not the record),
  the recorded-commit equality check (working-tree C-rows ==
  C-rows at the latest block's commit; suspended only at `reopened`),
  state-consistency status rules, and realized-map completeness
  (any map row ⇔ `realized` + complete). `reopened` is a transient
  STOP-artifact: the lint lists reopened drafts and
  `--forbid-reopened` is the zero-reopened gate form (packet approve /
  chapter close / process flips). Form authority:
  [`contract-draft-template.md`](contract-draft-template.md).

## 2. The projection checklist (compiling a packet)

Spec-writing is projection, not invention. In order:

0. **Classify + size, BEFORE any drafting (process-v2, README §5.5):**
   read the chapter's predicted class (plan §1.3 convention); run the
   sizing heuristics — substrate novelty, claim families, matrix
   families, dimension count, sibling-packet fanout — and the RISK
   GATE below. The gate is SELF-CONTAINED — the v1 Complexity-Risk
   gate carried with a CLOSED two-element exclusion list: the
   numeric 0|1|2 scoring wrapper (the axes and combinations below
   carry the same decisions) and the workflow/orchestration scan
   role (the v3 kernel IS the orchestrator — that consumption is the
   execution-consumer role; a separate role would double-count it).
   Do not estimate risk from file count; estimate it
   from boundary spread, on SIX axes:
   - **authority movement** — the packet introduces or MOVES a
     canonical source of truth;
   - **surface spread** — how many distinct surfaces must change for
     ONE concept (kernel logic / store schema / ingress-write seam /
     read projection (floor) / CLI-human payload / testkit — testkit
     counts ONLY when its CONTRACT changes: a new fake/seam, a
     fixture type, a recording-sink shape; tests merely EXERCISING
     the change never count — every packet has tests, so counting
     the drive makes three surfaces trivial (v1 counted production
     surfaces only). A packet that CHANGES the testkit contract
     counts it and, on a trip, continues only with closure proof —
     the ch7-P1 retro-check lands on THIS branch: it introduced the
     recording sink, trips hard stop 2, and closes — the gate's
     intended shape, not an exemption);
   - **identity/join fragility** — consumer correctness depends on
     cross-seam identity matching (e.g. diag rows correlated to
     instances/timeline across two stores; multiple id forms that
     must align);
   - **foundation + activation coupling** — build-the-base and
     turn-it-on in ONE packet (the ch8/MD-1 migrate-and-activate
     shape);
   - **prerequisite coupling** — depends on unfinished sibling work;
   - **acceptance multiplicity** — distinct success classes proven at
     once (schema / write path / read projection / CLI behavior /
     migration).
   **Consume-family scan (authority-heavy packets, discovery-first):**
   for every plausibly relevant role — producer, validator/gate,
   persistence/replay, execution consumer, read/presentation
   (floor + CLI), recovery/cleanup, external/integration (the
   dispatch/egress surface), testkit — record `present`,
   `absent`, or `unknown`, from the tree, not from the packet's own
   list. `unknown` is not a pass state (the panel's unknown rule).
   Testkit records in the scan as a role; it COUNTS toward the
   family-count stops (6, 7) only under the surface rule above (its
   contract changes).
   **Hard stops (these combinations are split-REQUIRED — split is not
   advisory):**
   1. authority movement + new runtime behavior turned on, in one
      packet;
   2. one concept across 3+ surfaces;
   3. activation depending on an unfinished prerequisite;
   4. correctness relying on multiple COMPETING authority paths for
      the same decision;
   5. a contract cutover mixed with its consumer cutover while the
      join is fragile (identity axis);
   6. the authority touches 3+ consume families — then the split is
      producer-first + consumer-family, not the generic shape;
   7. one packet changes the authority producer + a shared
      contract/result shape + any two fallout families;
   8. a persisted authority/schema change + shared-contract migration
      + read-projection/CLI fallout in one packet;
   9. producer behavior changed together with rollback/retry/cleanup/
      preservation semantics, or lock/lease/idempotency/serialization
      semantics, or precondition ordering that decides whether side
      effects precede validation;
   10. changing WHERE success/completion is proven while also changing
      cleanup or final status/event truth surfaces;
   11. reusing an existing proof contract (matrix/test suite) without
      explicit proof-parity or an explicitly narrowed reuse.
   **Escalation below hard-stop (default to split, in COUNTS — the
   uncarried 0|1|2 scale is never the referent):** 4+ surfaces for
   one concept AND 3+ success classes proven at once; multiple
   competing identity forms that must align AND 3+ surfaces (these
   two overlap hard stop 2 at 3+ surfaces — carried for
   self-containment); ANY authority change (a clarification that
   moves nothing still counts) AND a consumer-relied cross-seam
   mapping AND a CLI/human-payload change in one packet — the one
   combo that fires BELOW hard stop 2.
   **A single packet may continue past a trip ONLY with
   implementation-closure proof:** one build closes it without
   separate sequencing; the same bounded code change closes the
   touched buckets; the same consumers own the fallout; the same
   proof surface validates it; no per-consumer-family review loop is
   expected; no separate compatibility/diagnostics/read-projection/
   recovery/ordering risk is introduced. **Shared invariant coherence
   is NOT sufficient proof** — most broad features serve one
   invariant; the question is whether one implementation closure
   actually closes the work.
   **Split shapes:** default `foundation → delivery → activation`;
   with 3+ consume families: `persisted authority → producer →
   consumer-family alignment → activation → read-model → cleanup`.
   **Milestone-gated behavior:** when the scope includes behavior
   gated on a FUTURE milestone — document the contract now, keep
   activation in a later packet, keep current runtime behavior
   fail-closed.
   **RECORD (materialized, not implied):** the packet carries the
   assessment — axes touched, the consume-family scan when run,
   `single-packet allowed: yes|no`, and the closure proof or the
   split shape — as a `## Sizing/risk` section (or an explicit
   one-line `N/A — no axis triggered` with evidence). Conditional
   annexes, each triggered by its own material: **closure-budget
   triage** (authority/runtime/read-projection/shared-contract
   buckets in scope → which buckets are touched, which adjacent
   closures are intentionally collapsed and why that collapse is
   safe, which are explicitly deferred); **proof-boundary triage**
   (success/completion proof semantics changing → current and target
   canonical proof source, the final status/event surfaces affected,
   whether any surface goes mixed-truth across phases, whether a
   reused proof contract needs full proof-parity HERE or is
   explicitly deferred); **mutable-flow record** (hard-stop-9
   material near → does precondition failure produce ZERO side
   effects, is rollback/retry/preservation in this same slice, are
   coordination primitives introduced, or are those explicitly split
   out of the producer slice). The outcome
   feeds the split decision (an in-chapter split executes
   autonomously per the verdict-action matrix; a scope-changing one
   is STOP 2). **Chapter-level use (the v1 "For Plans" tail):** the
   same gate informs the CHAPTER's packet cut at ratification (the
   chapter's Packets-and-flow-mode table in the plan); no numeric
   score is persisted anywhere — the
   record is always the resulting split/dependency shape.
   **Draft-routing STOP:** a memo-born
   surface whose chapter contract-draft is not ratified-or-later
   routes to the DraftContract round first; mid-authoring, a Case-B
   signal (new-decision mass over the permissive
   threshold, or ANY new-decision row touching authority / separation
   / availability-class semantics) STOPS the same way, handing the
   new-decision row set over as the draft's seed. Every canonical row
   is declared in the `packet_rows` manifest AS IT IS WRITTEN (§1),
   and the classification verdict goes in the header.
1. **Select the slice** from the plan step: which units, rejection names,
   invariants, and traces this task realizes. Cut along **constraint
   cohesion** (rules that cling to the same ledger block stay together),
   not just size.
2. **Pull the units verbatim** into the operative material. No paraphrase.
   For contract/type rows (a canonical contract matrix, a domain-type
   table), pull the registry **field lists** from the model source too —
   ledger §4 entity NAMES alone under-specify a shape (the ch-4 P1
   lesson: `round` dropped out of `WorkflowInstance` until a
   ratification finding caught it).
3. **Pull the exact rejection strings** for the slice.
4. **Carry the trace as an executable expectation** — the committed-row
   sequence the tests must reproduce.
5. **Constraint-transformation pass** — for each candidate rule the task
   would otherwise carry as prose:
   - can it become **environment** (type / schema / lint / fixture)? →
     it costs zero context; if the environment piece is missing, that is
     backlog for a constraint-sink chapter, not packet prose;
   - else can it become **data** (an already-resolved artifact: unit text,
     exact name, trace)? → include it verbatim;
   - only if neither → it consumes the **in-context budget**.
6. **Self-containment check**: the packet includes in full what the task
   needs and excludes entirely what it does not. No pointer-shaped
   constraint dumps ("see file X for the rules").
7. **Density gate** (v1-inherited): if the in-context budget overflows, the
   task is cut wrong — go back to step 1 and split along constraint
   cohesion. Split packets re-declare their slices; the coverage union must
   still close.
8. **Size/split thresholds + embedding gates** (v1-inherited): target
   files, entrypoints, mutation boundary. The corpus describes target
   semantics, not the growing codebase — the embedding knowledge is
   packet-local and must be current.
9. **Declare the slice** into the coverage accounting (plan §1.4 inventory;
   the ch-3 script asserts the union).
10. **The panel loop** — the `ReviewPacket` five-lens engine
    (fresh-context sub-agents; Gate Coverage Matrix; approve-time
    tier-0 gates first). Verdicts: `split` / `refine` / `approve` +
    STOP reporting, per the README §5.5 verdict-action matrix —
    refine and in-chapter split iterate AUTONOMOUSLY; every STOP,
    every flag-bearing approve, and the ch7-pilot/first-of-a-kind
    approves are the human's; a flag-free approve is AUTONOMOUS from
    ch8 on and proceeds to build through the two mandatory
    transitional external-arm gates (README §5.5's autonomous-path
    rule, user-ratified 2026-07-11). Re-run scoping and model policy
    per README §5.5's panel re-run paragraph (first pass full;
    content folds → targeted re-run; bookkeeping folds → one
    reconciliation pass; the approve gate = the v1-shape close, a
    top-level reconciliation decision over the final hash; EVERY
    pass Opus-class — amended 2026-07-10). The old
    content-half/ergonomic-half rubric is retired: its content checks
    live in lens 2, its ergonomics in lenses 4–5.

Write-time coverage disciplines (adopted 2026-07-10 — the ch7-P3
pilot evaluation; they FRONT-LOAD what the panel otherwise discovers
lane-by-lane across rounds):

- **The site × shape × phase coverage grid.** When a packet declares
  failure lanes over a seam whose execution has PHASES (normal
  rounds vs a stop/drain path; pre- vs post-commit), the packet
  writes the FULL grid ONCE at authoring — every awaited site ×
  every failure shape (rejection, null/empty return, synchronous
  throw where a catch exists, domain error) × every phase — and
  every cell is either a driven lane id or an explicit rule-out
  with its reason. A phase change MINTS cells (the ch7-P2 flag-8(b)
  lesson); discovering them one panel round at a time is the cost
  pattern the ch7-P3 pilot measured.
- **The combination-lane heuristic.** A precedence or ordering claim
  ("X takes precedence over Y", "A fires before B") is driven by a
  COMBINATION lane staging both conditions at once — isolated lanes
  cannot falsify a reordered implementation (the ch7-P3 round-3 E3
  lesson).
- **The activation-journey rule (adopted at the ch8 boundary,
  2026-07-11 — the §8.9 P2 journey ratification generalized).** A
  packet that wires previously-built foundation into a live path
  reachable from a SHIPPED entrypoint ships at least one JOURNEY
  SMOKE through that entrypoint: subprocess, production bindings,
  the full lifecycle from the operator-authored input artifact to
  the end-state reads (the ch8-P2 `journey.test.ts` is the
  template). No shipped entrypoint touched → the rule does not
  fire. **Determinism clause:** the journey runs with DETERMINISTIC
  actors — a stub bound through the SHIPPED actor-configuration
  surface is legal (in this system the production actor IS a
  spawned command, so the stub is configuration, not test
  machinery); an injection-borne test seam is not. Real-LLM runs
  are a SEPARATE non-CI tier (the dogfooding class), never a CI
  journey lane.
- **The spec-vs-build altitude line (adopted 2026-07-17 — the
  ch11-P3a process reset; README §5.5 is canonical).** Test
  obligations are authored as DISCIPLINE + FAMILY INVENTORY (the
  Acceptance section's form): the discipline names the rule ("every
  declared lane driven, both iff directions, full discriminating
  ladders"), the inventory declares the family's membership as a
  parameterized set with its owner named. Fixture-level enumeration
  is BUILD work — at review, a finding demanding it at spec time is
  `deferred-to-build` by rule (the build-close arm gate's
  sensitivity pass owns the member-by-member check against the
  BUILT test bodies). What remains spec-time: a missing family, a
  missing discipline, a wrong membership rule, an intra-packet
  contradiction, a ratified-row conflict.
- **The claim-grammar rule (adopted 2026-07-17).** Every
  completeness/universality claim takes one of three CLOSED forms:
  MEASURED — the set is the current tree, riding its untruncated
  sweep receipt (R-UNTRUNCATED-SWEEP); PARAMETERIZED — "every member
  of the declared <set> satisfies X", the parameter marked and the
  membership owner named (the packet's family inventory, a ratified
  draft row, the plan); SCOPED — explicit named exclusions with
  their deferral home. Bare wholesale rhetoric (*all / only / exact
  / complete*) without one of the three closures is a review
  finding. Exhaustivity rhetoric attracts completeness findings
  indefinitely; a closed form converts them into checks against
  declared sets — a completeness finding must name WHICH closure
  fails.
- **The present-tense rule (adopted 2026-07-17).** The operative
  reading path speaks in the present, written for a reader who never
  saw an earlier revision: zero round references, fold provenance,
  or review residue (litmus: would the sentence survive had the
  packet been authored this way on day one?). Provenance lives in
  the machine blocks, the flags section (dated decision records),
  the process log, and git. Present-tense intent notes (§5.3
  in-context budget) are NOT scars. Scar findings are
  bookkeeping-class.

## 3. Standing review rules (the `REV-*` registry)

Applied at build-loop step 6 (README §4) to every packet whose slice touches
the relevant surface. Supplementary form only — a `REV-*` never closes an
IC item by itself (plan §1.1).

- **REV-A1-TXN** — the operation record insert/append and the instance CAS
  commit under ONE transaction/CAS boundary; the transcript pre-check is a
  fast path, never the correctness mechanism.
- **REV-B-LOCAL-NOT-AUTHORITY** — no code path treats a process-local
  lock/cache/`versions_seen` map as authority; worker claiming
  (`SELECT ... FOR UPDATE SKIP LOCKED` etc.) is scheduling, not semantics.
- **REV-C-PROJECTIONS-READONLY** — metrics/analytics/UI/activity readers
  consume projections derived from `DECISION_REQUEST`/`DECISION_MADE`; they
  never write audit tables, and a telemetry event never stands in for a
  missing decision record.
- **REV-E-NO-ADAPTER-BRANCH** — kernel code never branches on a concrete
  adapter type; adapters arrive as injected interfaces.
- **REV-DIAG-FAILOPEN** — the diagnostic channel swallows its OWN failures
  and NEVER throws out of `emit`; no diag-store state or failure can change
  an `Outcome`, a committed row, or a committed read surface. Call sites
  call the sink BARE — a defensive wrapper would blur the owner (born at
  ch7-P1, plan §7.2; first review subject is the ch7-P2 store-backed sink).

This registry is rubric input for the third QA axis alongside the ADR
compliance review (PI-10) and the drift tests (PI-3).
