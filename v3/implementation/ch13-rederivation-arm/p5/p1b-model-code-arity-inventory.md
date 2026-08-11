# Model↔code arity inventory and triage — recorded at the ch13-p1b approve (2026-08-11)

Recorded at the owner's instruction when ratifying ch13-p1b's flag 8 (the
render's signature deviation). The flag argued from "the tree already diverges";
this artifact is the measurement behind that claim, and the triage that says
what the divergences actually ARE.

## The measurement

Sweep: every `implement`/`realized` row of `v3/src/drift/unitMap.json` that
carries a `codeRef`; the unit's spelled parameter list against the codeRef
symbol's actual parameter list.

| | |
|---|---|
| realized `implement` rows with a codeRef | 32 |
| comparable (both signatures parsed) | 25 |
| **arity divergences among the comparable** | **15** |
| skipped — parser could not match a signature | 7 |

The 7 skipped are NOT measured and are claimed in neither direction; six are
`HANDLE`-family rows whose codeRef targets a factory (`createKernel`), where
the unit's shape and the code's shape are not comparable as parameter lists.
Receipt: `p1b-arity-sweep-out.txt` beside this file, with the script inline in
its header. Independently reproduced by the external arm (AST-based, same
count).

## The triage

The taxonomy the owner set at ratification:

- **Representational mapping** — the same INFORMATION reaches the function,
  packaged differently. Not a model divergence.
- **Information delta** — the code genuinely receives less than the model
  specifies. A packet-grade decision, and the only class that owes a record.

### Information delta — ONE

**`emit-contract-pseudocode/payload_digest`** → `emit/opId.ts#deriveEmitDigest`
model `(envelope, contract)` → code `(envelope)`.

The model folds contract identity — schema id plus referenced vocabulary and
catalog versions — into the digest. The implementation realizes the
**schema-less branch**, where there is no schema identity to fold, and its own
header says so ("the model's payload_digest unit, schema-less branch").

Disposition: **branch-scoped deferral**, recorded on both planes by comment,
carrying a REGROWTH OBLIGATION — when the schema-bearing branch is built, the
parameter and the contract-identity material return with it. This artifact is
the record; no machinery is added for it.

### Representational mappings — FOURTEEN

Four shapes, none of which moves information. The category counts below sum to
14, and with the one delta above to the measured 15 — checked, because an
earlier revision of this artifact did not (it double-counted one row across two
categories and omitted another entirely; the external arm's re-check caught
both).

**(a) Vestigial parameter the MODEL's own body never reads — 2 rows.**
`l0d-pseudocode/admit_loaded` and `l1-pseudocode/admit_loaded` →
`kernel/admission.ts#admitLoaded`, model `(instance, expect, input?)` → code
`(instance, expect)`. The unit's body operates entirely on `expect` and
`instance`; `input?` appears in the signature and in one explanatory comment,
never in a rung. **This is ch13-p1b's own class**: the render's dropped
parameter is likewise unread by the unit body, so the packet's decision sits
inside an existing pattern rather than opening one.

**(b) Bundling into a deps/input object — 3 rows.**
`l0b-pseudocode/START_INSTANCE` and `l0d-pseudocode/CREATE_INSTANCE` (both →
`lifecycle.ts#createInstance`, `(deps, input)`), and
`l0e-pseudocode/activate_or_hold` (`(deps, args)`). The model's named arguments
arrive as fields of one object; injected dependencies the model treats as
ambient arrive as `deps`.

**(c) Identity instead of value, caller-precomputed derivative, or injected
port — 8 rows.**
`l0d-pseudocode/FAIL` (`instance` → `instanceId`, plus `deps`),
`l0e-pseudocode/RUNTIME_CONTEXT_READY` (same shape — counted HERE and not under
(b), which an earlier revision of this artifact double-counted),
`l0d-pseudocode/activate` (`instance` → the committed instance plus its
already-resolved template and the injected registry),
`l2-pseudocode/gate_projection` (`envelope` decomposed into `committed` +
`eventType`), `l2a-pseudocode/run_process_gate` (`gate` → the resolved effective
config, `template` → carried by that config and the projection, plus the
workspace path the model treats as ambient and the injected runner port), and
the three `dispatch_intent` reprints (`l0b`/`l0d`/`l1` → `deriveDispatchIntent`),
where the code additionally receives an injected provider registry and a
`handoff` the model derives in-body from the same inputs.

**(d) Precondition hoisted to the call site — 1 row.**
`l0d-pseudocode/COMPLETE` → `kernel/kernel.ts#complete`, model `(instance)` →
code `()`. The model's `REQUIRE instance.kernel_status = ACTIVE` is enforced
upstream: the code's own header records that the branch is reachable only from
an admitted ACTIVE commit, so the guard is stated as the invariant it protects.
The function is a pure value producer; the information is present at the call
site.

## What this establishes for ch13-p1b's flag 8

The render's signature drops a parameter the unit's own body never reads.
Under the taxonomy that is class (a) — **representational**, with two existing
rows of the identical class. The one true information delta in the tree
(`payload_digest`) is a strictly harder case and is not the precedent flag 8
rests on.

## Carried forward

- The `payload_digest` regrowth obligation, above — owner: the chapter that
  builds the schema-bearing branch.
- The 7 unmeasured rows: a factory-targeted codeRef is not comparable as a
  parameter list. Recorded as a limit of this sweep, not as a finding.
