# ch13-p1a — arm gate 1 RE-CHECK verdict

## Provenance — both runs, per the user's ruling

| | gate-1 initial | gate-1 re-check |
|---|---|---|
| Basis | `767f7ec4…`, 71 719 B | `eb1d7b4b…`, 76 049 B |
| HEAD | `3a6bb5c7` | `a454be3d` |
| Started / ended | ~14:38 → 14:47 | 15:37:48 → 15:44:32 |
| Transport | gptsol agent (llmp) | gptsol agent (llmp) |
| Model | `codex/gpt-5.6-sol` (the pin's model) | `codex/gpt-5.6-sol` |
| Effort | **proxy default, NOT the pin's `high`** — the agent definition gained `effort: high` at 14:45:52 (`~/.claude` commit `4a8fa67`), i.e. DURING the run, and an agent reads its config at spawn | **`high`, pin-conform** — asserted from the agent definition's frontmatter, not from the arm's self-report; the arm states it cannot observe its own setting |
| Byte guard | target hash, HEAD, porcelain identical before/after | identical before/after |
| Effort waive | the user's ruling recorded effort as a NOTE, not a pin match, for the initial run — a human act under §6 | not needed |

Preceding the initial run, the `arm_run.sh` transport returned an INFRA
failure: timeout at the uniform 1200 s cap with the process group killed
and guards clean, while the review was ACTIVELY WORKING (66 exec turns,
no verdict). That consumed the one §6 item-8 retry, which the user's
ruling directed to this transport at full charter.

Trajectory across the two runs: **4 BLOCKER → 0 BLOCKER.** The re-check's
two not-closed items and its new MAJOR are all mechanical residue of the
folds themselves, not fresh design defects — the same fold-prose signature
this phase has measured throughout.

---

## The arm's re-check verdict, verbatim

BASIS: eb1d7b4b4fb499a145f5f3ca61c5555cae7904a19d3b243bb04c0d2ebbb1a62e
TRANSPORT: gptsol agent (llmp)
MODEL: codex/gpt-5.6-sol
EFFORT: I cannot observe my own reasoning-effort setting

FINDING 1 — CLOSED — D5 now requires the dead-config skip to mark the enclosing tag through `markTag`, and D7 plus family 2 bind both the post-growth `["d-gates"]` signal and the two-entry zero-hygiene counterexample (packet:180, :182, :658-669).
FINDING 2 — PARTIALLY CLOSED — D3/D4 correctly place the exemption mechanism in an ADR-019 prerequisite amendment, but flag 2 still describes that act as editing only the three D10/D11 surfaces rather than D4's required fourth closure surface (packet:178-181, :471-474).
FINDING 3 — CLOSED — flag 2 withdraws the NODE route, identifies the closed `NormalizerHookDecl` union as vocabulary growth, and makes both prerequisite acts unconditional (packet:476-494, vocabulary.ts:411-435).
FINDING 4 — NOT CLOSED — flag 4 and the review record now make D6's form-authority act the only conformant route, but canonical row D6 still instructs the builder what to do "if the human takes flag 4's declined alternative instead", preserving the withdrawn route inside the build brief (packet:181, :513-544, review-record.md:72-85).
FINDING 5 — CLOSED — family 2 now names the exact two-catalog-entry dead-config counterexample, requires zero hygiene findings, and separately asserts that the engine marks the enclosing tag (packet:658-669).
FINDING 6 — CLOSED — both replacement scripts apply exact-anchor patches in temporary trees, execute successfully, and reproduce M1's eleven-tag pre-growth result and M3's eight growth-only failures in four files with zero baseline-only failures.

NEW 1 — MAJOR — M3's claimed non-droppable floor is asserted only by cardinality
  The script checks only `N >= 8` and baseline-only zero; it computes but never checks the four-file count and never verifies that each original failure remains, so one original member can disappear while one unrelated failure appears and the receipt still prints OK.
  CONSEQUENCE: the new self-check can certify a run that violates D14's rule that dropping any floor member is a finding.

NEW 2 — MINOR — Flag 3 points to the wrong canonical row for the folded alternatives
  The machine-code and C9-reopen alternatives are stated in D5, not D7.

VERDICT: FAIL — basis eb1d7b4b4fb499a145f5f3ca61c5555cae7904a19d3b243bb04c0d2ebbb1a62e — 2 not closed, 0 new BLOCKER, 1 new MAJOR, 1 new MINOR

---

## Disposition (orchestrator, all four verified verbatim before folding)

All four folded at basis `eec94ec34bdf8fe6` (76 619 B): D6's surviving
conditional replaced by the withdrawal and the ch9-repair scope; flag 2's
act now names FOUR surfaces; flag 3 re-pointed to D5; and M3's receipt
now asserts the four-file span AND pins the eight floor members BY NAME,
re-executed green. A further re-check is owed on the new basis.
