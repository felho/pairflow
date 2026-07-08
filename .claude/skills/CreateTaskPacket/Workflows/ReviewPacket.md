# ReviewPacket Workflow

Self-review a task-packet draft BEFORE the human pre-approval round. This is
the authoring-side half of the review rubric (README §5.2): it catches what
a checklist can catch, so the human round spends its findings on judgment,
not mechanics. It never replaces the pre-approval verdict.

## Input

- `PACKET_PATH`: the packet file under `docs/v3/implementation/packets/`

## Workflow

### 1) Content half — ledger consistency

1. The `ledger_slice` machine block parses and uses only the template §1
   machine tokens (dispositions, id syntax). An operability packet declares
   `[]` on every axis EXPLICITLY [R-EMPTY-SLICE].
2. Every declared unit id resolves to a file under
   `docs/v3/convergence/model-src/units/` (spot-check by `ls`, not memory).
3. Rejection strings match ledger §3 EXACTLY (grep the ledger).
4. Operative material is verbatim (spot-check one unit against its source);
   contract/type rows carry registry **field lists**, not entity names
   [R-FIELD-LISTS].
5. The trace is an executable expectation, not narrated behavior.
6. Rejection branches of the slice are covered or explicitly deferred; the
   drift-test surface is named in acceptance.

### 2) Claim half — the learned failure classes

1. The Claim is stated WIDE and its dimensions are enumerated BEFORE any
   derived test rows [R-WIDE-CLAIM, R-DIMENSIONS].
2. Every canonical matrix lane maps to a named test obligation — a lane
   with no driving test is a finding NOW, not at aftermath [R-MATRIX-LANES,
   R-CLAIM-NEGATIVES].
3. Any new validator over a numeric domain states the full ladder,
   including `-0` via `Object.is` [R-NUMERIC-LADDER].
4. Structure-vs-semantics: if the packet splits malformed input from
   semantic failure, the line is drawn in exactly ONE place
   [R-STRUCTURE-SEMANTICS].
5. Hostile fixture values are staged through provably preserving channels
   (raw text, not `JSON.stringify`) [R-RAW-FIXTURES].
6. Test obligations are phrased as EXECUTION, not intention — "driven by
   test X", never "should be tested" [R-EXECUTION].

### 3) Ergonomics half — the v1-inherited rubric

1. **Self-containment:** the operative set is in full text; nothing the
   task needs is a pointer ("see file X for the rules" = finding).
2. **Density:** every in-context note line has failed both the
   "environment?" and "data?" tests; an overflowing budget means the cut is
   wrong → recommend split along constraint cohesion.
3. **Embedding gates current:** target files/entrypoints verified against
   the live tree (`ls`/`grep`), type-ripple targets (fakes, stubs, test
   files) included; the mutation boundary is exact.
4. **Plan consistency:** no packet decision silently contradicts ratified
   plan text — any contradiction has its prepared same-commit plan edit
   [R-ALIGNED-UP].

### 4) Verdict

- **ready-for-pre-approval** — all checks pass; hand to the user.
- **refine** — findings listed, fold and re-run this workflow.
- **split** — the density/size gates fired; propose the cut along
  constraint cohesion (split packets re-declare slices; the coverage union
  must still close).

## Report

```
Self-review: <PACKET_PATH>
Content half:    <pass | findings…>
Claim half:      <pass | findings…>
Ergonomics half: <pass | findings…>
Verdict: ready-for-pre-approval | refine | split
```
