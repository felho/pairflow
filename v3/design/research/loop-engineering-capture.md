# Loop Engineering Capture — Cheap Deterministic Stop Signals for L9

Date: 2026-08-16

## Purpose

A small article capture (not a codebase study): Addy Osmani's *Practical Loop
Engineering* (https://addyo.substack.com/p/practical-loop-engineering), read
against the v3 model. Most of the article is ground the corpus already covers
more formally — separate verifier actors (the review panel), risk-tiered
supervision (gate policy config), loop/goal/cron primitives (harness survey),
and "delegate the task, never the judgment" (the ch14 human-decision
contract). Three narrow heuristics are *not* yet recorded anywhere in the v3
surfaces, and all three land on L9's liveness/recovery slice. This note parks
them so they are on the table when the L9 contracts are written.

Reference points:

- [`../approach.md`](../approach.md) — L9 ("Wait conditions & external/fuzzy
  correlation"; watchdog/retry/timeout deferred there from L4/L6).
- `../../model/core-model-future-topic.md` §"L9 — Wait conditions, liveness,
  and recovery" — the target ledger section, deliberately **not** edited by
  this capture (ledger edits follow the chapter process).

## The three findings

### 1. Split the deterministic done-checker from the quality judge

The article's `/goal` loop uses an evaluator that checks **only hard rules
against the transcript** (tests passed, metric threshold met, turn limit
reached) and explicitly does *not* judge quality. That role split — a cheap,
deterministic, small-model-capable stop-condition checker distinct from the
expensive quality review — is not named in v3. The existing `verify` gate and
review-panel verdicts are quality-tier; L9 §5's judgment tier is for stuck
diagnosis. A declared, referentially transparent done-predicate on the work
loop itself would sit *below* both, in the same "cheap tier below judgment"
family as nanoclaw's workload-declared silence budget.

### 2. Progress-based abort, not just deadlines

Example criterion from the article: "abort after two turns with no metric
improvement." This measures **stagnation while alive** — a different signal
from the silence budget (which measures death) and from wait deadlines (which
measure elapsed time). L9 §5 routes a "merely slow or suspiciously inactive
worker" to the judgment tier; a workload-declared *progress metric* with a
stagnation budget would give the watchdog a deterministic pre-filter before
that routing, exactly analogous to the declared silence budget: let the work
declare what "progress" means before "not progressing" is escalated to
intelligence.

### 3. Identical-action repetition as a stuck signal

"Same command run three times with no change in result → stop the loop." A
trivially cheap, deterministic spinning detector: the actor is alive, emitting
actions, and going nowhere. Neither the silence budget (there is no silence)
nor a deadline (it may be well within budget) catches this. As a recorded
signal it is watchdog-grade evidence for the L9 §5 judgment tier — or grounds
for a direct stop when the repetition is exact.

Half-finding, recorded for completeness: the article's cost practice — route
routine loop bodies to smaller/faster models, reserve the capable model for
judgment calls — is already lived practice here (gptsol offload) but written
down nowhere as policy. It is orthogonal to the kernel; if it lands anywhere,
it is runner/config policy, not model surface.

## Where this should flow

When the L9 §2/§5 contracts are drafted (future-topic R1–R8 disposition), the
"cheap tier below judgment" list should be evaluated as *three* declared
budgets, not one: silence (nanoclaw), progress stagnation (#2), and
identical-action repetition (#3); and the done-predicate role split (#1)
should be weighed when the loop-driving primitive around goals/waits is
shaped. This capture carries no verdict beyond "park these; do not lose them."
