# V3 Research — External System Studies

This directory holds the **reverse-engineering research corpus** behind the v3
design: comparative studies of external systems, the synthesis bridge over
them, and raw source captures. Everything here reads *other* systems; nothing
here is a v3 design decision by itself.

V3 design memos (open questions, design syntheses) live in
[`../topics/`](../topics/README.md). The converged model contract lives in
[`../approach.md`](../approach.md).

## What is here

- **`_synthesis.md`** — the convergence bridge. The cross-study distillation:
  the kernel spectrum, the resolved central bets, the per-level decision
  matrix, and the settled-vs-open ledger. **Start here**; it also contains the
  canonical study table with each study's one-line role.
- **`*-study.md`** — 17 reverse-engineering studies (in writing order:
  omnigent, symphony, paperclip, dbos, hermes-agent, vibe-kanban, honcho,
  temporal, superpowers, langgraph, gastown, gstack, agent-harness-survey,
  onecli, mnemon, nanoclaw, ai-maestro). Each maps one external system's
  mechanisms onto v3 levels (L0a..L14) with `file:line` citations and
  LEARN/AVOID/ORTHOGONAL verdicts, plus a second-pass delta section.
  `nanoclaw` is the runtime component behind the `bitsafe-ai-os-capture.md`
  fleet — the transport/supervision/isolation reference, explicitly *not* a
  kernel. `ai-maestro` is the outer-levels reference (L8 channels / L10
  federation / L13 cryptographic identity / agent mobility) and the corpus's
  clearest specimen of *half-primitives*: kernel-primitive shapes present
  without their enforcement.
- **`sakana-fugu-study.md`** — a web/paper research capture (not a codebase
  study): Sakana AI's Fugu product and its TRINITY/Conductor papers — a
  *trained* dynamic orchestrator in production. Serves as an external checksum
  on the settled direction of
  [`../topics/_dynamic-orchestrator-workflow.md`](../topics/_dynamic-orchestrator-workflow.md),
  plus a reception/adoption snapshot (2026-07-24).
- **`loop-engineering-capture.md`** — a small article capture (not a codebase
  study): Addy Osmani's *Practical Loop Engineering*, read against the v3
  model. Parks three cheap deterministic stop signals (done-predicate vs
  quality-judge split, progress-stagnation budget, identical-action
  repetition) for the L9 liveness/recovery contracts (2026-08-16).
- **`harness-situated-agents-capture.md`** — a small article capture (not a
  codebase study): Drew Breunig's *Harnesses are Situated Agents*, read against
  the v3 ladder. Records the external eight-layer harness vocabulary (Session ·
  Environment · Repo · Memory · Skills · Team · Organization · Model), maps each
  layer onto its nearest v3 surface, and flags the "session" collision (v3
  ratified sessions as *non*-kernel; instance + transcript carry that role).
  **Carries an open research task** — the vocabulary-sync review (what to
  disambiguate, what to gloss, what to leave alone) has NOT been run
  (2026-08-29).
- **`bitsafe-ai-os-capture.md`** — a raw information capture (not analysis) of
  BitSafe's "How BitSafe Runs on AI" public writing. Internal links inside the
  captured material point at the *source* repo and intentionally do not
  resolve here.
- **`ruflo-v3-sdlc-workflow.md`** — pre-series method study (SPARC/DDD);
  distilled into
  [`../design-method-playbook.md`](../design-method-playbook.md).

## Where results flow

```text
*-study.md  ->  _synthesis.md  ->  ../approach.md + ../../model/core-model.html
                                   ../../model/core-model-todo.md         (active contract follow-ups)
                                   ../../model/core-model-future-topic.md (deferred, level-owned topics)
                                   topics/*                               (standalone design memos)
```
