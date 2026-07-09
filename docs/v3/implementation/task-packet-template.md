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
  `model-src/units/<section>/<UnitName>.txt`; `<unit-disposition>` one of
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

ONE machine block declares every canonical row's provenance — inline
marks are retired (one home, no drift; the lint rejects a lingering
`[P:*]` mark or a standalone counts block). Rules (lint-enforced):

- row ids unique, lane-grammar shaped, and **bidirectionally
  table-defined**: every manifest id is the FIRST cell of a table row
  and every table-defined lane id is in the manifest (fenced code is
  excluded; reserved non-lane families: `P`). Finer elements
  (token-list members, inventory members) travel with their host row;
- `class` ∈ `anchored` / `derived` / `new-decision`; anchored/derived
  carry ≥1 ref, new-decision carries none;
- every ref either parses EXACTLY as a strict form —
  `contract:ch<N>-<surface>#C<n>` (a ratified-or-later contract-draft
  row) or `ADR-<NNN>` (file exists) — or carries the `prose:` prefix
  (unverified, human-facing provenance: ledger §, plan §, packet §);
  anything else is red;
- close-time counts live in `packet_metrics.provenance` and must equal
  the manifest tally (lint-locked; the duplicate home is deliberate —
  D7's aggregation surface reads the metrics block).

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
route:> `Route: fold-now | boundary-review | later-chapter | declined`

## Acceptance
- Contract tests: <CT-* ids this packet must turn green>
- Checks: <CHK-* ids in force>
- Drift tests green (standing, unconditional — PI-3)
- Standing review rules in force: <REV-* ids from §3 applicable here>

## Build record

<Filled at build close: rounds, test delta, surprises — prose; plus the
machine block. `stops[].type` comes from the canonical STOP member-token
registry (process-v2-design.md D3, until the Phase-1 flip moves it into
README). `baseline_note` (optional) is the ONLY home for unit/regime
qualifiers — never ad hoc keys.>

```json
{
  "packet_metrics": {
    "class": "<packet class>",
    "prediction": { "predicted": "projection", "reasoning": "<why, from ratification>", "discovered": "projection" },
    "provenance": { "anchored": 0, "derived": 0, "new_decision": 0 },
    "rounds": { "review": 0, "doc_refinement": 0, "implementation": 0 },
    "stops": [],
    "detector_misses": [],
    "learned": "<one-line hook — the process-log carries the detail>"
  }
}
```
````

## 1a. The v2 machine blocks (process-v2-design.md §5, Phase 0)

Additive layer, landed 2026-07-09; carrier per process-v2-design.md §7
(Amendment 1, ratified 2026-07-09 — manifest + git-native ratification).
The §2 checklist itself is rewritten only by the Phase-1 authority-flip
commit:

- **A packet is v2 iff it carries the `mutation_boundary` machine
  block.** The 16 pre-v2 packets (ch4–ch7-P2) are GRANDFATHERED: the
  lint reports and skips them; v2 obligations bind from the ch7-P3
  pilot onward, never retroactively.
- **Lint:** `pnpm v3:packet-lint` (selftest + live; wired into the CI
  surfaces). Fold-time checks (Amendment-1 carrier): machine-block
  syntax with exact keysets, the `packet_rows` manifest rules
  (strict-or-`prose:`-prefixed refs, bidirectional table-defined lane
  ids), retired-carrier rejection, and the `packet_metrics` deep
  schema + manifest-tally cross-lock. Post-build check:
  `check_packet.py --post-build <commit> --packet <path>` — the
  commit's changed files must stay inside the declared mutation
  boundary (plus the packet file itself).
- **Contract-drafts** (`docs/v3/implementation/contracts/`) are linted
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
  chapter close / flip). The docs-side `contract-draft-template.md`
  lands with the Phase-1 flip.

## 2. The projection checklist (compiling a packet)

Spec-writing is projection, not invention. In order:

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
10. **Review** — verdicts: approve / refine / split.
    - *Content half (new):* ledger-consistency — declared slice coherent,
      rejection branches covered or explicitly deferred to the scoped
      extension, drift-test surface named.
    - *Ergonomic half (v1 rubric, unchanged):* size, density, embedding.

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
