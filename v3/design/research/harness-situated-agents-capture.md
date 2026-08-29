# Harnesses-as-Situated-Agents Capture — an External Layer Vocabulary for the Harness

Date: 2026-08-29

## Purpose

A small article capture (not a codebase study): Drew Breunig's *Harnesses are
Situated Agents*
(https://www.dbreunig.com/2026/08/14/harnesses-are-situated-agents.html), read
against the v3 model. The article carries no mechanism v3 is missing — its
substance is a **naming and ordering proposal** for the territory around the
agent loop. That is exactly why it is worth capturing: v3 has spent the whole
corpus building a *level ladder* over the same territory, under different
names and a different ordering principle. This note records the external
vocabulary, maps it onto v3's own, and parks one open research task.

Reference points:

- [`../approach.md`](../approach.md) — the L0a..L14 ladder this maps against.
- [`agent-harness-survey-study.md`](agent-harness-survey-study.md) — the
  corpus's existing survey of harness-shaped systems.
- [`_synthesis.md`](_synthesis.md) — the kernel spectrum; the article is a
  *product-surface* taxonomy, not a kernel one, and the distinction matters
  (see finding 5).

## The article's claim, in one paragraph

The thesis is that a harness is best understood as a **situated agent**: the
agent proper is the inner loop the developer controls directly (Breunig cites
Harrison Chase's four elements — system prompt, planning tool, file system,
subagents), and the harness is the *world* that loop sits inside. The article
then names eight layers of that world, ordered from the agent outward, and
states the organizing gradient explicitly: **the further out a layer sits, the
more people use it and the less often it changes.** The closing argument is
commercial — outer layers are stickier than inner ones, so harness lock-in
will come to resemble SaaS-era network effects, not model switching costs.

The eight layers, from the inside out: **Session · Environment · Repo ·
Memory · Skills · Team · Organization · Model**. (The Model sits outermost as
the shared substrate, not as part of the loop.) The article surveys a batch of
2026 harness releases — Omnigent, DeepSeek Harness, Buzz, QM, Flue, Muse Code,
plus OpenClaw/NanoClaw/Hermes/Conductor/Prime Agent — and argues their
similarity is the evidence for the metapattern. Three of those (Omnigent,
NanoClaw, and the harness survey's subjects) are already first-class studies
in this corpus.

## Mapping the eight layers onto the v3 ladder

| Breunig layer | Nearest v3 surface | Fit |
|---|---|---|
| Session | *No kernel object by design* — the durable address is the **instance**; the transcript is the log | **Collision** (see finding 1) |
| Environment | **L0e** runtime context spec / provider contract | Strong; different name |
| Repo | **L0f** project/repository configuration + definition resolution | Strong; different name |
| Memory | Deferred everywhere — `approach.md` L0b/L2b out-of-scope lines, L11 "memory scopes" | **Named absent** (finding 3) |
| Skills | `skill_refs` slot (L0c), templates/definitions, **L12** definition PRs | Partial; v3 splits what the article merges |
| Team | **L4** child instances · **L8** channels & task inbox · **L11** agent registry | v3 is finer-grained |
| Organization | **L2/L2a** gate policy · **L10** gatekeeper/federation · **L14** org-scale | v3 is finer-grained |
| Model | **L0c** agent run configuration · **L13** trust calibration & evals | v3 splits config from evaluation |

## The findings

### 1. "Session" is a live vocabulary collision, and v3 is on the other side

The article puts Session **innermost and durable**: a trajectory plus a
branchable log you can rewind, fork, and replay. V3 ratified the opposite
placement. [`../topics/_dynamic-orchestrator-workflow.md`](../topics/_dynamic-orchestrator-workflow.md)
Q1 settled that **sessions are not kernel objects** — they are adapter-side
handles and issued intent; the durable, addressable thing is the *instance*,
and the replayable log is the *transcript*. A grep of `approach.md` finds
"session" only in runtime/tmux teardown contexts, never as a model noun.

So v3 already owns both halves of what the article calls a Session (instance =
the durable address, transcript = the branchable log) and deliberately refuses
the word for them. This is the one place where reading external harness
writing straight into v3 discussion produces a real misread, in both
directions. It is also the cheapest thing to fix in writing: a single
disambiguation line, not a rename.

### 2. Two different ordering axes over the same territory

The v3 ladder is ordered by **kernel dependency** — what must exist before
what can be built (L0a's skeleton before L0b's dispatch before L0d's
lifecycle). The article's ladder is ordered by **audience breadth × change
frequency** — used by more people, changed less often, as you move out.

These are not rivals; they are orthogonal projections, and neither is derivable
from the other. Note that they run in roughly opposite directions where they
overlap: v3's late levels (L10 federation, L13 identity, L14 org-scale) are
also the article's outer, slow, many-user layers, which is a coincidence worth
testing rather than a confirmation. Whether the v3 ladder *implicitly* encodes
the article's gradient — and where it visibly does not — is the substance of
the open task below.

### 3. Memory is the article's layer with no v3 owner

Every other layer maps to at least one named v3 surface. Memory maps to three
deferrals: `approach.md` L0b's out-of-scope list ("context assembly /
retrieval (later)"), L2b's §11.4 pointer ("semantic retrieval, memory,
skill-doc retrieval"), and L11's "memory scopes (instance / agent / org)" — a
concept named at a level that is not yet designed. That is a coherent choice
for a kernel (memory is a context-assembly concern, not a kernel primitive),
but it means the corpus has no single place that answers "where does memory
live in v3". This is a scope observation, not a gap to close by this note.

### 4. The article merges Skills where v3 splits, and vice versa

The article's Skills layer bundles *reusable workflow* and *domain knowledge*.
V3 splits these: reusable workflow is a **template/definition** (a versioned,
governed artifact with its own L12 PR path), while domain knowledge is a
`skill_refs` context slot on L0c. That split is load-bearing — a template is
kernel-governed and a skill doc is context — and it is a place where v3's
vocabulary is *more* precise than the emerging external one, not less. Same
shape in reverse at Team and Organization, where v3's finer levels (L4/L8/L11,
L2/L10/L14) each carry contracts the article's single layer does not.

The asymmetry is the point: adopting external names wholesale would cost
precision. Adding external names as *glosses* would not.

### 5. "Harness" vs "kernel" — the framing v3 already has

The corpus uses "harness" throughout the research studies to mean other
people's systems (`agent-harness-survey-study.md`, the Omnigent meta-harness,
NanoClaw as "explicitly not a kernel"), and "kernel" for v3's own core. That
distinction is already deliberate and is written down in
[`../topics/_open-kernel-floor.md`](../topics/_open-kernel-floor.md)'s
kernel-vs-product framing. The article's thesis is a clean external statement
of the *other* side of that line: everything the kernel-floor memo pushes out
of the kernel is what the article calls the harness. Nothing to change — worth
noting that the corpus's own boundary and the article's are the same boundary
seen from opposite sides. (The word "situated" appears nowhere in `v3/`.)

## Open research task — vocabulary sync review

**Task:** review pairflow's own vocabulary (the v3 level ladder and its
surface names, plus the v1 product nouns) against this external layer
vocabulary, and decide what — if anything — is worth changing. Explicitly a
*low-hanging-fruit* pass, not a rename program.

Scope for that review:

1. **Disambiguations to write** (highest expected value, near-zero cost):
   the Session collision (finding 1) is the clear candidate — one line stating
   that v3's instance + transcript are what external harness writing calls a
   session, and that "session" in v3 means the adapter-side handle.
2. **Glosses to add, not renames** (finding 4): whether `approach.md` or
   `v3/README.md` should carry a small "known elsewhere as" column or table —
   L0e ≈ Environment, L0f ≈ Repo — so a reader arriving from external harness
   writing can find the v3 level without translation. Test each gloss against
   whether it *loses* a distinction v3 deliberately makes.
3. **The ordering-axis question** (finding 2): whether the audience-breadth ×
   change-frequency gradient is a useful second reading of the ladder, worth
   stating once in `approach.md`'s framing, or whether it would muddy the
   dependency ordering that the ladder exists to express.
4. **Non-goals to state explicitly:** no renaming of ratified level names, no
   adoption of "Skills" over template/definition, no new level. Any finding
   that reaches the model contract stops and goes through the chapter
   process — this task's output is documentation vocabulary only.

**Where its output flows:** disambiguation and gloss edits are
convergence-doc/README touches (`approach.md`, `v3/README.md`,
`v3/design/research/README.md`); anything that turns out to bind the model
becomes a `core-model-todo.md` item and follows the normal ratification path
instead. This capture carries no verdict beyond "the mapping above is the
input; the review has not been run."
