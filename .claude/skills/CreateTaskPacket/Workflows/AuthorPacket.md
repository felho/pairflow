# AuthorPacket Workflow

Compile one task packet from a ratified plan-chapter step. Spec-writing is
**projection, not invention** (README §5.2): the packet selects and compiles
material the model corpus already resolved; it never re-derives semantics.

## Input

- `PACKET_ID`: `ch<N>-p<M>[a-z]?-<slug>` — the split suffix is optional
  (precedent: `ch6-p4a-*` / `ch6-p4b-*` from the ratified P4 split);
  matches the file name under `docs/v3/implementation/packets/`
- `PLAN_SECTION`: the plan.md section this packet realizes (e.g. `§7.2`)
- `PRIOR_FINDINGS`: optional — findings from an earlier refine round to fold

## Workflow

### 0) Preconditions (STOP gates)

1. The owning chapter is **ratified** in `plan.md` (its section exists and
   the chapter header carries an autonomy stage). If not → STOP: packets are
   authored only from ratified chapters.
2. If `PRIOR_FINDINGS` is set, this is a refine pass: read the existing
   packet file first and fold the findings exactly as given — findings are
   folded, not reinterpreted.

### 1) Load the binding sources

Read, in this order (current state, never from memory):

1. `docs/v3/implementation/task-packet-template.md` — template §1,
   projection checklist §2, `REV-*` registry §3. The checklist §2 is the
   authoritative step list; this workflow operationalizes it, it does not
   replace it.
2. The `PLAN_SECTION` in `docs/v3/implementation/plan.md`, including any
   chapter rules and packet watchpoints recorded at ratification.
3. `references/LearnedRules.md` — the failure-class registry applied at the
   steps marked below.
4. The most recent packet of the same class under
   `docs/v3/implementation/packets/` — conventions are inherited from the
   latest precedent, not reinvented.

### 2) Classify the packet

1. **Kernel-semantic** (realizes ledger material) → the slice is non-empty;
   pull it in step 3.
2. **Operability** (CLI / floor / tooling — adds ZERO kernel semantics) →
   declare the **empty** ledger slice explicitly [R-EMPTY-SLICE]; the
   packet's claim surface is its canonical contract matrices instead.
3. **First-of-a-kind?** If this packet class has no precedent →
   autonomy stage `calibration`, verdict path pre-approve [R-FIRST-STOP].
   Otherwise inherit the chapter's declared stage.

### 3) Project the slice (checklist §2 steps 1–4)

For kernel-semantic packets:

1. Select the slice along **constraint cohesion**, from the plan step.
2. Pull the unit pseudocode **verbatim** from
   `docs/v3/convergence/model-src/units/` — no paraphrase.
3. For every contract/type row: pull the registry **field lists** from the
   model source, never entity names alone [R-FIELD-LISTS].
4. Pull the **exact rejection strings** (ledger §3) for the slice.
5. Carry the trace as an **executable expectation** (the committed-row
   sequence tests must reproduce), never narrated behavior.
6. **Divergence stop:** if projection exposes a model bug or gap, STOP
   (README §6). It goes back to the model plane; it is never patched in
   the packet.

### 4) State the claim, then enumerate its dimensions

1. Write the packet **Claim** first, stated WIDE — what the surface
   guarantees, not what the implementation happens to do [R-WIDE-CLAIM].
2. Enumerate the claim's **dimensions** BEFORE deriving any test rows
   [R-DIMENSIONS]. For any validator over a numeric domain the ladder is
   mandatory: value → descriptor → prototype → numeric identity (`-0` via
   `Object.is`) [R-NUMERIC-LADDER].
3. Where the packet declares a surface contract (exit codes, parse rules,
   config resolution, error-doc schemas), write it as a **canonical
   contract matrix** — and remember every lane must be DRIVEN by a test at
   build time [R-MATRIX-LANES]. Negative tests derive from the claim/matrix,
   never from the implemented rule list [R-CLAIM-NEGATIVES].
4. If any validation contract splits malformed-input from
   semantic-failure handling, draw the structure-vs-semantics line in ONE
   place in the packet [R-STRUCTURE-SEMANTICS].

### 5) Constraint transformation + in-context budget (checklist §2 steps 5–7)

For each candidate rule: environment? → backlog for a constraint sink, not
packet prose; data? → include verbatim; neither → it consumes the in-context
budget. If the budget overflows, the cut is wrong — split along constraint
cohesion and re-declare slices (the coverage union must still close).

### 6) Embedding gates (checklist §2 step 8)

Target files, entrypoints, mutation boundary — verified against the
**current codebase** (run `ls`/`grep`; the corpus describes target
semantics, not the growing tree). Include type-ripple targets: fakes,
stubs, and test files that structurally break when a port changes.

### 7) Plan alignment

If any packet decision contradicts ratified plan text, prepare the plan
edit NOW, marked `aligned at <PACKET_ID> pre-approval`, to land in the SAME
commit as the packet [R-ALIGNED-UP]. Never a silent divergence, never a
deferred edit.

### 8) Write the packet file

`docs/v3/implementation/packets/<PACKET_ID>.md`, following template §1
exactly: header (plan step + autonomy stage), the machine `ledger_slice`
block (empty or full — always present), Claim + dimensions, operative
material, canonical matrices, in-context notes, embedding gates,
acceptance (CT-*/CHK-*/REV-* ids). English only. Fixture **watchpoint**
(R-RAW-FIXTURES is WATCH status, not yet a rule): prefer staging hostile
values (e.g. `-0`) through channels that provably preserve them — raw
text, not `JSON.stringify`; a stringify-built hostile fixture is flagged
in the pre-approval summary, not a blocker.

### 9) Self-review, then STOP

1. Run the **ReviewPacket** workflow on the draft.
2. Present the pre-approval summary in the session's chat language: the
   slice (or its declared emptiness), the claim + dimensions, the matrices,
   the embedding gates, open risks.
3. **STOP.** The user's findings round decides: approve / refine / split.
   This workflow never proceeds to build, never commits the packet on its
   own, and never marks a packet approved.

## Report

```
Packet drafted: docs/v3/implementation/packets/<PACKET_ID>.md
Class: kernel-semantic | operability   First-of-a-kind: yes/no
Slice: <n units / n rejections / n invariants / n traces | EMPTY (declared)>
Self-review: <ReviewPacket verdict + any flagged items>
Plan alignment: <none | prepared edit for §X, same-commit>
→ awaiting pre-approval verdict (approve / refine / split)
```
