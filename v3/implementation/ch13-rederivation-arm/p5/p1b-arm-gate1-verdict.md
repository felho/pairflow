# ch13-p1b — external arm, gate 1 (the approve-ready bytes)

Run at the owner's explicit call to invert the ratification order: the arm
round ran BEFORE ratifying the flags, the same shape taken at ch13-P0.

## Invocation record

| | |
|---|---|
| Transport | the `gptsol` agent (the pin lives in the agent definition; the call passed no model parameter) |
| Model / effort, from the run's own header | `codex/gpt-5.6-sol` / `high` — matches the current `arm-pin.md` row |
| Basis | `acc9a5603cba4bc59903b00c88ab46e67f8152b435407278d48545850b05bf16` |
| Charter | `p1b-arm-gate1-charter.md` beside this file (authored under the neutral-QA-vocabulary note) |
| Byte guard | taken before and after — HEAD, target sha256, porcelain hash, full tracked-diff hash, untracked path+content hashes; **identical**, repository unchanged |
| Verdict | **FAIL** — 2 findings, both on the shipped-catalog flag |

## Findings, and their disposition

**1 — BLOCKER, packet-docs. The flag asked for a ratification of wording and
supplied no wording.** The flag decided the entry's SCOPE and left the exact id
and body text to the build, so two builders could ship different prose with
every declared test green — the fixtures reproduce whatever value was authored.
FOLDED: the flag now carries the exact id and the complete body text in
block-scalar form, and that is what the approve ratified.

**2 — MAJOR, product. The recommended content described a mechanism this system
does not have.** The recommendation was to carry v1's "re-fetch the emit ids
before every emit, because authority moves after each handoff". VERIFIED
independently against the tree: `handoffId`, `executionId`, `status --json` and
`agent emit` appear nowhere in `v3/src`. v3 gives each attempt a scoped emit
FILE whose path arrives in an environment variable, and the actor writes one
JSON object with exactly `type` and `payload`; any other shape is taken as no
output at all, silently. An actor following the recommended text would have
hunted a non-existent surface while its real output channel sat unused.
FOLDED: the v1 rule is out — not on scope grounds, which was the packet's
earlier and wrong reasoning, but because it is untrue here. What carries over
is the lesson, not the rule: the shipped body names the silent-no-output class,
which is v3's analogue of what v1's rule was protecting against.

Both findings were reproduced by this session before folding.

## What the arm cleared

The arm independently reproduced the M6 compile-negative sweep (67 directives
across 6 files; exactly one changes character), re-counted the machine blocks
(25 boundary files, 16 rows at 11/4/1, 12 dimensions, 13 families), verified
the three-lookup guard census and its roles exemption, the prototype-collision
claim on both key grammars, the routed kernel defect's boundary conformance,
and ran a discriminating-power pass over all thirteen test families against the
contract rows they serve. It found no test family whose fixture cannot separate
the right implementation from the plausible wrong one.

Its arity census (15 divergences) is recorded, measured independently and
triaged, in `p1b-model-code-arity-inventory.md` beside this file.
