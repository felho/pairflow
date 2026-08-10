# ch13-p1a — arm gate 2 (build close): the run record

The README §5.5 BUILD-CLOSE gate. Five runs in all: one INVALID
(pin-nonconformant), one full review, three hash-citing re-checks. The
gate CLOSED clean.

## Transport

**Ruling (user, 2026-08-10):** arm gate 2 runs primarily on the **gptsol
agent** (the Agent tool; model `codex/gpt-5.6-sol`, effort `high`, pinned
in the agent definition at `~/.claude/agents/gptsol.md`), with
`arm_run.sh`'s external runner kept as the FALLBACK for portability. The
ReviewPacket §6 guards are reproduced BY HAND on this transport: the byte
guard before and after every run, neutral QA vocabulary in every charter,
and this verdict record committed. The pin table's transport column is
formalized at the boundary review.

**Pin conformance.** `v3/implementation/arm-pin.md`'s current row is
`gpt-5.6-sol` / `high`; the agent definition pins exactly that, and every
valid run below opens its report with
`MODEL: gpt-5.6-sol; REASONING EFFORT: high` — transcript-verified, per
§6 item 6. These are the FIRST pin-conformant runs on this transport.

## Run 1 — INVALID (pin mismatch), 2026-08-10, on basis `09a0bda2`

Launched with an explicit `model` override on the Agent call. That
parameter takes precedence over the agent definition's own pin, so the
run did NOT execute on `gpt-5.6-sol`. Under §6 item 4's PIN-MISMATCH RULE
the verdict is INVALID and the run counts as an INFRA failure (item 8's
retry ladder: ONE retry in a new session — taken, as run 2).

Discarded as a gate result. Its one finding was nevertheless real and
carried its own executed evidence, so it was independently REPRODUCED by
the build agent before folding (mutate-run-restore, `templateSurface.ts`
`81744e7e…` before and after): D7(c)'s raw-read discipline was undriven —
swapping the audit's operand to `run.normalized` left 762 tests across
the three ch13 suites green. Folded at `02be5f4e`.

**The lesson worth keeping:** on this transport the pin lives in the
agent definition, and any per-call model override silently defeats it.
The invocation must pass NO model parameter.

## Run 2 — the full review, on basis `02be5f4e`

Packet sha256 `c09b1fd3c1a785416dfb4c6f3ab064e2a597d3cf1ea06e7069e517730c201ebc`.

**VERDICT: FAIL — 5 findings (0 BLOCKER, 4 MAJOR, 1 MINOR).** ZERO
product findings: the implementation was conformant on every canonical
row D1–D14. All four MAJORs were one class — a declared inventory
instantiated at fewer members than the packet's parameterization implies
— and each arrived with an executed mutate-run-restore rather than a
prediction:

1. the block-id `nonempty` lane absent from both inventories (removing
   the declaration left 351 tests green);
2. D13's five normative pairs driven on the direct channel only (a
   file-channel-only break of C7 per-occurrence resolution left 351
   green);
3. the admitted-form matrix missing `step × present-populated × file`
   (replacing the produced value with `[]` left all 211 file tests
   green);
4. the code-travel negative twin sampled where D9 prescribes it
   PARAMETERIZED (a code added to the duplicate lane left all 46 CLI
   tests green).

The MINOR was the packet's own gate-state line quoting a stale test
count. All five folded at `d891fa00`.

The run's own mutation-restoration ledger records eight
mutate-run-restore probes across five files, each returned to its
original sha256.

## Re-check 1 — on basis `d891fa00`

Packet sha256 `c4aedef05f89b0fc10a076d86fc2d04cbf1729c56367bb59081fb4feaf6544eb`.

**VERDICT: FAIL — 1 finding (0 BLOCKER, 1 MAJOR, 0 MINOR).** All five
round-2 folds CONFIRMED closed and each one DISCRIMINATING: the arm
re-ran its own four mutations and every one now reds on the fold that
closed it. One further member of the same class surfaced — the catalog
KEY node's TYPE lane driven on the file channel but not the direct one (a
direct-channel-only skip of the key class for non-string keys left 367
green). Folded at `c962c4d3`.

## Re-check 2 — on basis `c962c4d3`

Packet sha256 `a444fd844789c9dd53a528ef966264e0f32db1f79a0f1dbcc9da5ea3611f23b1`.

**VERDICT: FAIL — 1 finding (0 BLOCKER, 1 MAJOR, 0 MINOR).** The
round-3 fold confirmed closed, and confirmed NOT passing for the wrong
reason: under the mutation the key TYPE finding disappears ALONE while
the hygiene finding survives, so the assertion sees the lane it names.

This round was also asked for an explicit CUTOFF JUDGEMENT — two
consecutive rounds had each returned exactly one finding of one class,
and the question was whether the remainder was an enumerable set or an
open-ended trickle. The answer was the former: the catalog-key inventory
is complete, and what remained was TWELVE file-channel stand-down routes,
enumerated in full. Executed evidence: removing `d-agentconfig` alone
from the trigger set left the file definition suite green at 223/223.
Folded in ONE pass at `532d0dd0`.

## Re-check 3 — on basis `532d0dd0` — **GATE CLOSED**

Packet sha256 `33917114f1f9c9e25edeb4aef2f98a3b1458ff61464d4c9f87b558a8a1c31a46`.

**VERDICT: PASS — 0 findings.** The twelve routes correspond to the
derived floor (eleven markable tags; `d-gates` carries two routes), and
none passes for the wrong reason — the arm verified that by excluding
each tag from the trigger set ONE AT A TIME and observing that exactly
its own route reds, eleven mutations in all, every one restored to
`81744e7e…`. Cutoff judgement: **the Acceptance inventory is complete**,
family by family, with no further remainder bounded or otherwise.

Gates at the closing basis: `v3:typecheck`, `v3:lint`, `v3:test` (72
files / 2259 tests), `v3:coverage`, `v3:adr-check` all green;
`v3:packet-lint` red on exactly the expected schema-lock error and no
second one.

## Byte guards

Taken before AND after every valid run: HEAD, the porcelain hash, the
FULL tracked-diff hash vs HEAD (`git diff --binary HEAD`, index
included), the untracked enumeration, and the packet's own sha256 —
every measurement identical on both sides of every run, with the
clean-tree gate (`git diff HEAD --exit-code` plus an empty porcelain)
green. No guard tripped.

## Yield accounting (the boundary review's arm-yield metric)

Seven findings over four valid rounds, by class: **product 0**,
**packet-docs 1**, **test-evidence 6**. The yield curve is 5 → 1 → 1 → 0,
and its shape is the datum: every substantive finding was a declared
family instantiated more narrowly than its own parameterization, none was
a behaviour defect, and the last two rounds each returned exactly one —
which is what made the cutoff question worth asking rather than assuming.

## The instrument, recorded

The tmux orphan the arm-pin operational notes name bit twice during this
gate: an interrupted suite run left a `p4atest-*` session on the shared
default socket, wedging every later `tmux` call and producing one
non-reproducing runner-journey failure on the next run. Both times the
remedy was the note's own — clear the orphan, re-run serially. The
per-run-socket fix stays a boundary candidate.
