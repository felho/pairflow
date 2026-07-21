# Superpowers Study — The Methodology Lens: Workflow Design & the Verification Gate

Date: 2026-06-20

## Purpose

This note captures what Pairflow v3 can learn from **Superpowers**
(`obra/superpowers`, by Jesse Vincent) — "a complete software development methodology for
your coding agents, built on top of a set of composable skills." Unlike the prior eight
studies (all *systems* — kernels, queues, memory engines), Superpowers is a **curated,
opinionated, behaviorally-tested methodology library**: ~14 skills as `SKILL.md` files that
chain into one agentic SDLC pipeline (brainstorm → plan → execute → review → verify → finish),
packaged for 8+ agent harnesses. It is small (~2.4 MB, 14 skills, ~84 markdown files) but
widely adopted, and it is the human-methodology counterpart to the engineering studies.

The study's value for v3 is bounded but real, on two axes: **L5 (the skill system — format,
triggering, portability)** as a second data point alongside the Hermes/agentskills.io findings,
and — more importantly — **the methodology itself as a worked reference v3 workflow definition**.
v3's entire purpose is to durably run exactly this kind of agentic-development workflow, so a
respected practitioner's opinionated pipeline (and the *discipline gates* that make it reliable)
is a direct input to v3's workflow-template design and its WF-1..WF-7 test scenarios. This study
does NOT move the kernel/durability findings; it sharpens the *workflow-design* and *L5* layers,
and it delivers one sharp, broadly-applicable primitive: the **verification gate**.

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/superpowers` (analyzed at HEAD `896224c`, pushed 2026-06-18; plugin version 6.0.3)

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)
- [`../../model/core-model.html`](../../model/core-model.html) — the model itself

Ninth in a series. Read alongside (esp. the L5 and methodology references):

- [`hermes-agent-study.md`](hermes-agent-study.md) — the L5 baseline: agentskills.io format, 3 generic tools + cached prompt-catalog, agent-authored skills via a forked reviewer.
- [`vibe-kanban-study.md`](vibe-kanban-study.md) — human-review board; left the L4 fan-in gap open; the "agents over-claim done" anti-pattern.
- [`temporal-study.md`](temporal-study.md) — solved L4 fan-in with an initiated-event-id slot; "LLM call = recorded Activity, never replayed."
- [`ruflo-v3-sdlc-workflow.md`](ruflo-v3-sdlc-workflow.md) — the other studied SDLC-workflow reference.
- (also: omnigent / symphony / paperclip / dbos / honcho — the systems studies.)

> Method: first pass used four parallel sub-agent analyses (a leaner fan-out, proportionate
> to the smaller, content-rather-than-architecture scope), each reading whole `SKILL.md` files
> with `file:line` citations. A second independent pass used ten lenses: state/source-of-truth,
> lifecycle/recovery, concurrency/ownership, runtime adapter, policy/security,
> delegation/scheduling, channels/events, memory/context, operator UX, and modularity. The
> second-pass deltas below add only the details that were missing or too coarsely stated in the
> first pass.

## Executive Summary

Three load-bearing findings.

> **1. The verification gate is the broadly-applicable primitive — and it cures a recurring
> series anti-pattern.** Superpowers' `verification-before-completion` skill encodes the "agents
> over-claim done" failure mode (seen across vibe-kanban, hermes) as a *structural gate*: the Iron
> Law is "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE", and crucially **a step's own
> success report does NOT satisfy a downstream gate — the gate must check an *independent* artifact**
> (VCS diff shows changes, test command output = 0 failures, line-by-line requirements checklist),
> NOT the agent's word (`verification-before-completion/SKILL.md:18-51`). The subagent-driven loop
> operationalizes it: on a child's "DONE", the controller independently runs `review-package` against
> the git diff rather than trusting the report. **This is the structural form of v3's core contract
> "durable state is authority, agent self-report is not evidence" — v3 should make `verify` a
> kernel-enforced gate type whose contract is `fresh independent evidence in this transition`.**

> **2. Superpowers is a worked reference instance of the canonical v3 workflow — and it maps cleanly
> onto v3's vocabulary.** The pipeline is `brainstorm-gate (L3 block-until-approve) → plan (durable
> artifact) → execute (agent step with status-enum routing) → TDD/review rounds (loop-back with
> advancing counter) → verification gate (independent-evidence L2) → finish (closed-enum L3 with
> destructive-route validation)`. Every v3 primitive is exercised at least once. Two specifics worth
> lifting wholesale: **closed-enum human-decision gates with validation on the irreversible route**
> (finish = exactly merge/PR/keep/discard, with a *typed confirmation* on "discard"), and **round
> caps that escalate into a human-decision gate** (systematic-debugging: after 3 failed fixes, stop
> looping and question the architecture with a human). A v3 test workflow modeled on this stresses
> exactly the primitives WF-1..WF-7 must cover.

> **3. The L5 standouts: action-indirection portability + bootstrap-as-coercive-contract + trigger-only
> descriptions.** The skill *format* is the same agentskills.io directory+SKILL.md as Hermes, but three
> design moves are new: (a) **action-indirection** — skill text names *capabilities* ("dispatch a
> subagent", "create a todo"), and a tiny per-host table binds capability→concrete tool, so ONE skill
> source projects to 8+ harnesses with no per-host skill copies; (b) **bootstrap-as-coercive-contract**
> — instead of Hermes's passive system-prompt catalog, a single rationalization-proofed entry skill is
> injected at session-start that forces "check for an applicable skill before acting"; (c)
> **`description` = trigger-only, never workflow-summary** — an empirical finding that a description
> which summarizes the body makes agents follow the summary and *skip the body* ("two reviews became
> one review"). And skills are TDD'd (no skill without first watching a fresh agent FAIL the scenario),
> the human-curated opposite of Hermes's agent-authored memory.

Where this study sits in the series: it is the **methodology/human-discipline lens**, orthogonal to
the kernel-spectrum axis. It does not change `commit-based, leaderless`; it informs *what v3 runs*
(workflow templates) and *how v3's L5/L3/L4 should be shaped*, and it confirms the
"durable-state-over-self-report" contract from the practitioner side.

The synthesis line for the series, lightly extended:

> **v3 = a commit-based, leaderless kernel (DBOS storage discipline + per-instance expected_version +
> Temporal's commit/outbox/fencing/fan-in/sticky/look-ahead/validate-before-mutate disciplines + CHASM's
> component-registry + paperclip's broker & audit ledger + Hermes/vibe-kanban/honcho outer-layer breadth)
> — running workflow templates shaped like Superpowers' SDLC (brainstorm-gate → durable plan → status-routed
> agent steps → escalating review rounds → independent-evidence verification gate → closed-enum finish),
> with a kernel-enforced `verify` gate, file-handle ContextPackets, action-indirection-portable skills, and
> LLM calls modeled as recorded Activities, never replayed.**

---

## L5 — The Skill System (format, triggering, portability)

**3-sentence verdict.** Superpowers is a *curated, opinionated, behavior-tested* skills LIBRARY whose
skills are not reference docs but **eval-tuned behavioral code** — most are discipline-enforcers (Iron
Laws, rationalization tables, red-flag lists) developed via TDD-for-prose. It shares Hermes's on-disk
format (a directory + `SKILL.md` with `name`/`description` frontmatter, explicitly citing
`agentskills.io/specification` at `writing-skills/SKILL.md:96`) but bolts on a **single bootstrap meta-skill
injected at session-start** that makes the agent self-police skill invocation, plus a **"skills speak in
actions, not tool names" indirection layer** that projects ONE skill source across 8+ harnesses. The
standout L5 angle is portability: skill *content* is harness-agnostic, and each harness gets only a thin
adapter (a hook script, a `.ts`/`.js` extension, or a manifest) plus a per-harness action→tool table — no
per-harness copies of the skills.

### Skill format + the writing-skills authoring discipline

A skill is `skills/<name>/SKILL.md` (required) + optional supporting files, **flat single namespace**
(`writing-skills/SKILL.md:72-92`); frontmatter is two required fields `name` + `description` (max 1024 chars),
the same minimal shape as Hermes but *without* Hermes's namespaced `metadata.<vendor>` blocks (cross-skill
identity is carried in prose as `superpowers:<name>`). The body is a consistent house style: `## Overview` →
optional `## The Iron Law` (a fenced all-caps absolute, e.g. TDD's "NO PRODUCTION CODE WITHOUT A FAILING TEST
FIRST", `test-driven-development/SKILL.md:32-34`) → `## When to Use` → a graphviz flowchart *for decision
points only* → Good/Bad code pairs → `## Common Rationalizations` table → `## Red Flags - STOP` → `##
Verification Checklist`. **The `description` field is a hard discipline and the sharpest divergence from generic
formats: it describes ONLY when to use, NEVER what the skill does** (`writing-skills/SKILL.md:99-101,150-172`),
because a summarizing description empirically caused agents to follow it and skip the body.

### Auto-triggering — the key contrast with Hermes

A three-layer mechanism whose cornerstone is a **SessionStart hook**, not a static catalog: (1) the hook injects
the *full text* of the entry skill wrapped in `<EXTREMELY_IMPORTANT>You have superpowers…` (`hooks/session-start:11,29`),
so every session boots holding the meta-rules; (2) that entry skill is a **self-policing behavioral contract** —
"if there is even a 1% chance a skill might apply… you ABSOLUTELY MUST invoke the skill… not negotiable", with a
rationalization table pre-empting "this is just a simple question / let me explore first"
(`using-superpowers/SKILL.md:10-16,82-99`); (3) per-skill `description` frontmatter is the matcher the harness's
native loader reads on demand. **Contrast Hermes:** Hermes pushes a *broad-but-soft catalog* of all descriptions +
"load when relevant"; Superpowers pushes *one narrow-but-coercive bootstrap* that forces an applicable-skill check
before every response, delegating discovery of the *other* skills to each harness's native loader on the same
`description` field.

### Composition + multi-harness portability

Composition is an explicit prose dependency graph via `**REQUIRED SUB-SKILL:**` / `**REQUIRED BACKGROUND:**`
markers (NOT `@`-imports, which force-load 200k+ context and are forbidden, `writing-skills/SKILL.md:286-288`),
forming the pipeline `brainstorming → writing-plans → subagent-driven-development/executing-plans →
requesting-code-review → finishing-a-development-branch`, with `test-driven-development` as cross-cutting required
background. **Multi-harness portability is the standout L5 primitive: there is ONE `skills/` tree, never copied
per harness.** Two design moves make one source project to N hosts: (a) **action-indirection** — skills "speak in
actions ('dispatch a subagent', 'create a todo') rather than naming any one runtime's tools"
(`using-superpowers/SKILL.md:43-44`); per-host tables (`references/claude-code-tools.md` vs `gemini-tools.md`) bind
capability→tool, so skill bodies never change per host, only the small table does; (b) **deterministic sync codegen**
(`scripts/sync-to-codex-plugin.sh`) that rsyncs `skills/` into a foreign marketplace fork, same upstream SHA →
identical diff, guarded by `tests/codex-plugin-sync`.

### LEARN / AVOID / ORTHOGONAL (L5)

**LEARN**
- **Action-indirection as the portability primitive** — skill text names *capabilities*; a tiny per-host table binds
  capability→tool. For a v3 kernel running subflows across heterogeneous hosts, this is the clean L5 portability
  contract: one skill source + N capability-binding tables, never N skill copies.
- **`description` = trigger-only, never workflow-summary** — the empirical finding (agents shortcut on a summarizing
  description) is a hard rule for any auto-trigger/discovery layer; keep the routing field free of process detail so
  the body is always read.
- **Bootstrap-as-coercive-contract over a passive catalog** — v3's L5 "help subflow" entry point should be an active
  gate ("check for an applicable skill before acting"), not a passive index.
- **Testability as authoring law** ("no skill without a failing test first" + rationalization tables built from
  observed baseline failures) — behavior-shaping units need a regression discipline, not just a linter.
- **Explicit lazy composition via named REQUIRED markers** — keeps the dependency graph readable and on-demand,
  avoiding context blowup; relevant to a kernel composing subflows.

**AVOID**
- **Prose-only dependency graph with no machine-checked manifest** — nothing validates that a referenced skill exists
  or that the chain is acyclic. A v3 kernel should make the subflow dependency graph a first-class, validatable
  structure.
- **Per-harness hand-written adapters with duplicated bootstrap-injection logic** (the JSON-escape + wrap logic is
  re-implemented in bash, `.ts`, and `.js`) — generate adapters from one spec.
- **No machine-readable capability schema** — the provider capability model exists, but it lives mostly in Markdown
  mapping files and adapter glue. v3 should promote `session-start injection`, `skill discovery`, `subagent`, `todo`,
  `shell`, `file IO`, and `web/browser` into a typed capability descriptor instead of parsing prose.
- **Coercion-heavy prose ("1% chance you MUST", "not negotiable") as the trigger mechanism** — a workaround for the
  absence of a real router. A kernel routes to subflows structurally; don't import the all-caps pressure as control flow.

**ORTHOGONAL** — graphviz flowcharts, Good/Bad pairs, the "human partner" voice (presentation/culture); the specific
methodology *content* (TDD, debugging) is domain payload, independent of the L5 container; the marketplace governance.

---

## Methodology — The SDLC as a Reference v3 Workflow

**3-sentence verdict.** Superpowers is an opinionated, gate-heavy agentic SDLC encoded as ~13 composable skills that
chain into one linear pipeline — `brainstorming → writing-plans → (subagent-driven|executing)-plans → per-task review
loop → verification → finishing` — where the load-bearing innovation is not the stages but the **discipline gates
between them**: hard rules ("NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST", "NO COMPLETION CLAIMS WITHOUT FRESH
VERIFICATION EVIDENCE") that exist specifically to defeat the LLM failure modes of over-claiming, rationalizing
shortcuts, and skipping verification. The methodology treats the durable plan file as the single source of truth that
survives across fresh-context subagents, and treats every transition as a gate that must produce *evidence* before it
opens. For v3 this is the canonical answer to "what should a workflow template actually enforce" — the stages are
obvious; the gates and the durable artifact handoff are the real product.

### The pipeline stages + artifacts

| Stage | Skill | Durable artifact | Cite |
|---|---|---|---|
| 1. Brainstorm | `brainstorming` | spec/design doc, committed | `brainstorming/SKILL.md:29,106-109` |
| 2. Plan | `writing-plans` | implementation plan (bite-sized checkbox tasks + Global Constraints + Interfaces) | `writing-plans/SKILL.md:18,54-126` |
| 3. Worktree | `using-git-worktrees` | isolated workspace + clean test baseline | `using-git-worktrees/SKILL.md:48-140` |
| 4. Execute | `subagent-driven-development` / `executing-plans` | code + commits; progress ledger `.superpowers/sdd/progress.md` | `subagent-driven-development/SKILL.md:247-264` |
| 4a. TDD | `test-driven-development` | failing test → minimal code → green | `test-driven-development/SKILL.md:33-69` |
| 4b. Debug | `systematic-debugging` | root-cause evidence + repro test | `systematic-debugging/SKILL.md:18-20,170-191` |
| 5. Review | `requesting/receiving-code-review` | review report (Critical/Important/Minor + verdict) | `requesting-code-review/code-reviewer.md:82-109` |
| 6. Verify | `verification-before-completion` | fresh verification evidence | `verification-before-completion/SKILL.md:18-38` |
| 7. Finish | `finishing-a-development-branch` | merge/PR/keep/discard decision + teardown | `finishing-a-development-branch/SKILL.md:64-91,162-182` |

### Mapping onto v3 vocabulary

- **HUMAN-DECISION gates (L3):** the design-approval `<HARD-GATE>` blocking all implementation until the user approves
  (`brainstorming/SKILL.md:12-14`); the **finish decision** = a *closed enum* of exactly merge/PR/keep/discard with a
  **typed confirmation on the irreversible "discard" route** (`finishing-a-development-branch/SKILL.md:68-91,138-148`).
- **GATES (L2 — allow/warn/block on evidence, no human):** the TDD red gate ("Verify RED… MANDATORY", blocks GREEN) and
  green gate (tests pass + pristine output); the **verification gate** (run-fresh-then-claim); the baseline gate (clean
  tests before work); the finish test gate (tests must pass before the finish menu is shown).
- **ACTIONS (run a process, route by outcome):** dispatch implementer subagent → routes on a 4-status enum
  **DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED** (`subagent-driven-development/SKILL.md:132-148`) — precisely
  v3's "action: run process, route by outcome".
- **LOOP-BACK rounds (advancing counter):** review → fix → re-review; red-green-refactor; the **debug loop with a round
  CAP that escalates** — after 3 failed fixes, stop and question the architecture with a human
  (`systematic-debugging/SKILL.md:192-213`); the design-approval revise loop.

### Verification-before-completion as a structural gate

The most directly v3-relevant skill — it **encodes the "agents over-claim done" anti-pattern as a structural gate.** The
Iron Law: "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE… if you haven't run the verification command in this
message, you cannot claim it passes" (`verification-before-completion/SKILL.md:18-22`). The Gate Function makes it a
literal precondition: IDENTIFY the proving command → RUN fresh → READ full output/exit code → VERIFY → "ONLY THEN make
the claim. Skip any step = lying" (`:26-38`). Crucially it maps *claim types to required evidence*: **"Agent completed"
requires "VCS diff shows changes", NOT "agent reports success"; "Requirements met" requires "line-by-line checklist",
NOT "tests passing"** (`:42-51`). The subagent loop operationalizes it: on a child's DONE, the controller independently
runs `review-package` against the diff rather than trusting the report (`subagent-driven-development/SKILL.md:136`). This
is exactly the failure mode v3 must guard structurally.

### LEARN / AVOID / ORTHOGONAL (Methodology)

**LEARN**
- **Verification-before-completion belongs as a kernel-enforced `verify` gate type, not an honor system.** Its contract:
  *fresh evidence in this transition*, and specifically **a step's own success report does NOT satisfy a downstream gate —
  the gate checks an independent artifact** (VCS diff, test output, line-by-line checklist). The structural cure for the
  recurring "agents over-claim done" pattern.
- **The durable plan file is the run record** — an explicit, committed artifact with Global Constraints + per-task
  Interfaces so a *fresh-context subagent sees only its task brief* yet stays consistent. v3's durable-run-record +
  definition split should mirror this: the template carries constraints; each step gets a curated brief, not the whole
  history.
- **Progress ledger as crash-recovery, separate from conversation memory** — "controllers that lost their place
  re-dispatched entire completed task sequences — the single most expensive failure observed"
  (`subagent-driven-development/SKILL.md:247-264`). v3's durable instance state must be the authority over any agent's
  recollection — this validates v3's L4 atomic-commit/lifecycle-binding direction.
- **Closed-enum human-decision gates with validation on the destructive route** (finish = exactly 4 options + typed
  "discard" confirmation). v3 L3 gates should be closed enums + per-route validation, not open-ended "what next?".
- **Status-enum routing for agent steps** (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED) — the canonical shape for a v3
  agent-step → action route table.
- **Round caps that escalate into a human-decision gate** ("3+ fixes failed → stop, question architecture, involve human")
  — v3's loop-back-with-advancing-round should be able to *terminate into a human-decision gate* rather than loop forever.
- **Two-stage review: spec-compliance AND code-quality as separate verdicts** — v3 review gates should carry distinct
  verdicts (built-the-right-thing vs built-it-well), not one blended pass/fail.

**AVOID**
- **Process-rule bloat encoded as persuasion prose** (TDD's 11-row rationalization table aimed at one agent's psychology) —
  v3 is a kernel; it should encode these as *machine-checkable gate conditions* (test exit code, diff presence), not import
  the persuasion text. The prose works because there's one LLM to convince; a kernel enforces, it doesn't persuade.
- **The moralizing evidence language as product UX** — the underlying rule is excellent, but words like "lying" and
  "dishonesty" are better translated into an evidence contract in Pairflow: "claim blocked until fresh command output,
  exit code, diff, or checklist evidence exists."
- **Human-trust heuristics baked into mechanism** ("be skeptical of external reviewers") — keep gate verdicts independent of
  the orchestrator's wishes (the anti-pre-judging rule is good), but that skepticism is policy, not kernel mechanism.
- **The linear single-branch / one-human-partner assumption** — v3's distributed multi-instance model should not inherit the
  implicit "one active workstream" framing.

**ORTHOGONAL** — the browser-mockup visual companion; model-selection cost tiering (an executor/runtime policy, not a
template gate); git-worktree harness-detection plumbing (maps loosely to L0e but is harness-specific); agent-tone social rules.

> **Net for WF-1..WF-7:** Superpowers IS a worked reference instance of the canonical SDLC workflow v3's test suite should
> cover. A v3 test workflow modeled on it exercises every primitive — brainstorm-gate (L3 block-until-approve) → plan
> (durable artifact) → execute (status-routed agent step) → TDD/review rounds (loop-back, advancing counter) → verification
> gate (independent-evidence L2) → finish (closed-enum L3 with destructive-route validation) — and the verification gate +
> progress ledger most directly stress v3's "durable state is authority, agent self-report is not evidence" contract.

---

## L4 — Subagent & Parallel Orchestration (as methodology)

**3-sentence verdict.** Superpowers' subagent orchestration is a *controller-discipline methodology*: a long-lived
orchestrator executes a plan by spawning a **fresh, context-isolated subagent per task** (never inheriting the controller's
history), gating each result through a **two-verdict review** (spec compliance + code quality) before advancing, and handing
all bulk context across the spawn boundary **as files, not pasted text**. It treats the spawn/fan-in *mechanism* as given
(the platform's subagent dispatch) and instead codifies the *human-orchestration rules* a kernel cannot: what goes in the
context-packet, who reviews whom, how failures escalate, and how progress survives the controller's own context loss. Its
central insight: **reliable multi-hour autonomy comes not from smarter subagents but from a disciplined controller that
curates context narrowly, reviews every handoff, and persists progress durably outside conversation memory.**

### The loop + the task-brief ContextPacket

The core loop is an explicit per-task state machine: read plan → dispatch implementer → implementer
implements/tests/commits/self-reviews → write diff file, dispatch task reviewer → if not approved, dispatch fix subagent and
re-review → mark complete in ledger → next task → final whole-branch review → finish
(`subagent-driven-development/SKILL.md:47-83`). The **task-brief is the ContextPacket, built mechanically not pasted**:
`scripts/task-brief PLAN_FILE N` awk-extracts exactly one task's text into a uniquely-named file and prints the path — the
task text *never passes through the controller's context* (`scripts/task-brief:27-33`). The dispatch prompt is a strict
5-part contract (`SKILL.md:227-244`): (1) where the task fits, (2) the brief-as-file ("read this first — your requirements,
exact values verbatim"), (3) cross-task interfaces the brief can't know, (4) the controller's ambiguity resolutions, (5) the
report-file path. **Exact values live ONLY in the brief** (`SKILL.md:235`). The named anti-pattern: "a real session's
dispatch hit 42k chars of which 99% was pasted history" (`SKILL.md:189-193`).

### Fan-out + fan-in/integration discipline

Fan-out is strictly gated on independence: "one agent per independent problem domain… 2+ independent tasks without shared
state or sequential dependencies" (`dispatching-parallel-agents/SKILL.md:14-15,1-3`); "multiple dispatch calls in one
response = parallel". **The fan-in discipline — the gap vibe-kanban left open — is an explicit 4-step collect-and-reconcile**
(`:80-86,170-177`): read each summary → check for conflicts ("did agents edit the same code?") → run the full suite to verify
fixes work *together* → spot-check ("agents make systematic errors"). **Correlation is structural and empirical, not an ID
match: partition into non-overlapping domains up front (so results can't collide), then verify non-collision after** via
conflict-check + full-suite. Note the asymmetry: parallelism is reserved for *independent debugging/fixes*; plan
*implementation* tasks stay sequential (`subagent-driven-development/SKILL.md:373`) because they share the evolving branch.

### Review-before-continue + isolation

Three stacked gates: self-review (the implementer fixes its own issues before reporting, but self-review never *replaces*
real review, `SKILL.md:380`); the task review spine (`scripts/review-package BASE HEAD` writes a diff file that never enters
the controller's context; the reviewer returns two mandatory verdicts and is hardened — "do not trust the report… a stated
rationale never downgrades a finding's severity"); and a final whole-branch review on the most-capable model. The controller is
**forbidden from pre-judging** ("if your prompt contains 'do not flag'… stop: you are pre-judging to spare yourself a review
loop"). Failures are a **typed protocol, never a silent retry** (DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT; "never force the
same model to retry without changes"). The fourth pillar is the **durable progress ledger** (`.superpowers/sdd/progress.md`),
trusted over the controller's own recollection after compaction. Isolation is two-layer: context (fresh subagents) +
filesystem (worktrees). A sharp transferable detail: `scripts/sdd-workspace` puts the handoff dir in the **working tree, not
under `.git/`**, because the harness denies agent writes to `.git/` — **the spawn-input/output channel must live where the
spawned agent is actually permitted to write** (`sdd-workspace:8-12`).

### LEARN / AVOID / ORTHOGONAL (L4)

**LEARN**
- **The ContextPacket is a file handle, mechanically extracted, never pasted, and the *sole* source of exact values.** A child
  gets (a) its brief-as-file, (b) cross-instance interfaces, (c) the parent's ambiguity resolutions, (d) a result-channel path.
  v3 should make ContextPacket a file handle, not inlined payload — the "42k-char, 99%-pasted" failure is the anti-pattern a
  kernel should make impossible by construction.
- **Scratch artifact space belongs in the repo worktree, but outside tracked source.** `.superpowers/sdd` is local to the
  working tree and self-ignored, so handoff files and review packages are writeable by spawned agents without polluting git.
  Treat this as a temporary artifact bus, not canonical workflow state.
- **Fan-in = partition-then-verify, empirically.** Correlate results not by trusting them but by partitioning into
  non-overlapping domains then conflict-check + full-suite. The concrete *methodology* fill for vibe-kanban's open fan-in gap:
  integration is a reconciliation step the parent owns. (Complements Temporal's *mechanism* fill: the initiated-event-id slot.)
- **Durable progress ledger / spawn-correlation binding survives parent restart** — the parent's correlation state must survive
  parent restart/compaction; the named commits exist in git even when the parent forgets dispatching them. Validates v3's L4
  atomic-commit direction (persist the spawn→correlation binding so re-dispatch-after-amnesia is structurally prevented).
- **Typed child-completion protocol + no-blind-retry rule** — a clean child-result status contract for v3 fan-in.
- **The write-permission boundary insight** — a child's result-channel must be writable by the child; a kernel handing a child
  a write-back slot must verify the child has authority to write it.

**AVOID**
- **Parent-driven review as the *only* gate** — in a kernel this is an availability/latency single point; v3 should make the
  review/correlation gate a kernel primitive (a correlated event the child writes), not a parent's manual `git diff`.
- **Sequential-only implementation** — a workaround for shared mutable state; a v3 kernel with proper per-child isolation
  (worktrees/branches) need not inherit it.
- **Correlation-by-naming-convention** (`task-N-brief.md → task-N-report.md`) — correlate by *identity* (Temporal's slot), not
  string matching, which silently breaks under concurrency.
- **Scratch files without lock/atomic-write protocol as durable state.** The helper scripts use simple file writes and
  predictable names; the repo contains no evidence of lockfiles, owner ids, or atomic rename discipline for concurrent
  controllers. v3 can borrow the artifact layout but needs a real run id, lock/lease, and atomic write protocol.

**ORTHOGONAL** — model-selection economics; the anti-pre-judging review-quality rules; the pre-flight plan conflict scan.

---

## L12/Authoring — Skill Discipline & Process Automation

**3-sentence verdict.** Superpowers treats a skill as *production code for an agent's behavior* and applies literal TDD to
authoring it: no skill ships without first watching a fresh agent FAIL the target scenario, then writing the minimal
documentation that flips it to compliance, then closing the loopholes the agent rationalizes through. Quality is held by three
independent mechanisms — a meta-skill (`writing-skills`), a real shell test suite that runs `claude -p` headless and asserts on
the resulting tool-call stream, and a hardened convention of red-flags/rationalization tables that bake hard-won failure modes
directly into each skill as a first-class section. This is the **human-curated, expert-opinionated, regression-tested** end of
the procedural-knowledge spectrum — the opposite of Hermes's agent-mined memory.

### The mechanism

The meta-skill's Iron Law is "NO SKILL WITHOUT A FAILING TEST FIRST" (`writing-skills/SKILL.md:374-393`); its sharpest
contribution is **"Match the Form to the Failure"** (`:459-474`): classify the baseline failure type first — discipline-violation
→ prohibition + rationalization-table + red-flags; wrong-shaped-output → *positive recipe* (prohibitions measurably *backfire*
here); omitted-element → REQUIRED structural slot; conditional-behavior → predicate-keyed conditional. Token budgets are enforced
(`wc -w`: getting-started <150 words, others <500); `@`-imports are forbidden (force-load 200k context). Quality is maintained by
**behavioral regression tests over an agent** — `tests/explicit-skill-requests/run-test.sh` greps the `stream-json` tool log for
a `"skill"` invocation AND detects *premature action* (any non-Skill tool fired before the Skill call); `tests/claude-code/`
spins a real Node project and asserts on actual behavior (plan read once not per-task, spec review before code review, real git
commits); `tests/hooks/` asserts the session-start hook emits the correct JSON shape per harness. The **red-flags/rationalization
tables ARE the anti-poisoning analog** — where Hermes uses anti-poisoning *prompts* on agent-authored memory, Superpowers bakes
the failure knowledge *into the artifact* as a self-check section sourced from observed baseline rationalizations. Process
automation is deliberately thin: ONE session-start context-injection hook + offline scripts (version-bump with `--check` drift
detection across 7 version-bearing files, codex-sync, shell-lint) — **no PostToolUse/pre-commit gate; the real enforcement lives
in skill prose, not blocking hooks.**

### LEARN / AVOID / ORTHOGONAL (L12/Authoring)

**LEARN**
- **"Match the Form to the Failure" is a transferable law** — classify *why* an instruction will be violated before choosing its
  form (discipline-violation → prohibition+table; wrong-shape → positive recipe; omission → required slot). Empirical evidence that
  mismatching backfires. The single most portable authoring finding.
- **Behavioral regression tests over an agent** — a procedure isn't "done" when written; it's done when a headless agent run
  produces the asserted primitive/tool-call sequence. For a v3 kernel this argues for a conformance harness that replays a
  procedure against a fresh agent and asserts on the emitted event stream (analogous to v3's event log).
- **Red-flags/rationalization tables as encoded failure-memory with provenance** — v3 can treat "encoded failure modes sourced
  from observed baseline" as a required field of a curated procedure (the human-curated counterpart to Hermes's anti-poisoning prompt).

**AVOID**
- **The cost model doesn't scale to a kernel** — every skill costs a human-run RED baseline + pressure scenarios + REFACTOR loops;
  14 skills is the point. v3 can't hand-TDD thousands of procedures this way. The lesson is *which* procedures deserve it
  (cross-cutting discipline skills), not "do this for everything."
- **Context-injection-as-enforcement is fragile** — the bootstrap is injected every session but explicitly yields to user
  CLAUDE.md; enforcement is persuasion prose, not a hard gate. Don't mistake "EXTREMELY_IMPORTANT you must" for a guarantee; a
  kernel needs actual mechanism.

**ORTHOGONAL** — the multi-harness sync machinery (distribution/packaging; though note the *deterministic-sync* idempotency
property: same upstream SHA → identical PR diff); graphviz tooling, shell-lint, ruff/ty pre-commit (authoring ergonomics).

---

## Second-pass deltas

The ten-lens pass mostly confirmed the first report. It added sharper boundaries around what Superpowers is:
a portable skill-methodology distribution and test harness, not a runtime kernel, lock manager, or product
dashboard.

### State, recovery, and ownership

- **Scratch state is useful, but deliberately non-canonical.** `.superpowers/sdd` is a repo-local, self-ignored
  handoff space for task briefs, progress ledgers, and review packages. It is ideal for transient controller/agent
  artifacts, but Superpowers itself notes that `git clean -fdx` can remove it and recovery then falls back to
  `git log`. v3 should treat this pattern as a local artifact cache, not the durable instance store.
- **Commit ranges are the real checkpoint primitive.** Review packages are based on explicit `BASE..HEAD`, with
  commit list, stat, and diff written to a file. That is stronger than conversation memory and weaker than a
  kernel transcript. v3 should keep the idea that "completed work" is tied to a concrete VCS range, while still
  storing the lifecycle transition in its own log.
- **Do not checkpoint uncertain ownership.** The brainstorm companion only persists port/token data when it owns
  the non-fallback server state; fallback ports deliberately do not overwrite persisted state. That is a small but
  useful principle for v3 leases: uncertain owner means "observe, don't commit."
- **Process ownership needs identity, not PID alone.** The stop script validates an instance id in the command line
  before signaling a PID and fails closed on stale/impostor metadata. v3 should apply the same idea to worker,
  branch, and runtime-context cleanup.
- **There is no visible lock or lease model for concurrent controllers.** File names such as `task-N-brief.md` and
  review-package paths are predictable and per-worktree. The methodology avoids conflicts by policy: isolated
  worktrees, serial implementation tasks, read-only reviewers, and post-fan-in conflict checks.

### Adapter, channel, and provider contracts

- **Provider integration has three recurring shapes.** Superpowers ports through shell hooks, in-process plugins,
  and instruction/context files. That is more realistic than pretending every harness can satisfy one universal
  adapter API.
- **Session-start injection is the decisive provider contract.** Skill files without bootstrap are inert; the
  acceptance test is behavioral, not static: start a clean session, ask for a React todo list, and verify
  `brainstorming` triggers before coding. v3 provider adapters should prove how lifecycle/protocol context enters
  the model before work begins.
- **Hook/message shapes are provider-owned contracts.** Claude/Codex use nested `hookSpecificOutput.additionalContext`,
  Cursor uses `additional_context`, SDK/Copilot use top-level `additionalContext`, OpenCode mutates message parts, and
  Pi reinjects after compaction. Superpowers tests these exact shapes. v3 should make adapter message-shape tests
  first-class, not rely on docs.
- **Routing tests check event order, not only final behavior.** Explicit skill request tests warn if any other tool
  call happens before the first skill invocation, and multi-turn tests isolate the relevant later turn. This is a
  strong pattern for v3 route/order regressions around resume, continuation, and compaction.
- **The browser companion is a useful miniature relay, but not a general event bus.** Browser choice events flow over
  WebSocket to stdout and append newline JSON to `state/events`; file changes broadcast a simple `reload`. There is
  no general request id, trace/span envelope, ack/backpressure, or runtime stream protocol.
- **Stateful local UI still needs real auth.** The companion uses a per-session key, constant-time comparison,
  query/cookie bootstrap, security headers, origin checks, and file-serving guards. v3 should not treat loopback as
  a security boundary by itself.

### Skills, context, and operator experience

- **Trigger metadata is an anti-shortcut mechanism.** The `description` field should say when to use a skill, not
  summarize the workflow, because a summary can cause the agent to follow the summary and skip the body. This is
  worth making part of v3's skill authoring checks.
- **Context loading is deliberately staged.** Frequently loaded skill bodies are kept short; heavier references are
  loaded on demand, and `@` force-loading is discouraged for required sub-skills because it can pull huge context.
  v3 should prefer explicit dependency metadata plus lazy loading over implicit large imports.
- **Evidence-first UX is the real operator interface.** Superpowers has no full product dashboard in this repo; its
  operator UX is structured CLI/menu output, short child summaries, report paths, review packages, transcript
  analyzers, and strict completion gates. That is still valuable: Pairflow should make evidence easy to inspect
  without flooding the controller context.
- **Behavior tests measure the agent, not just the artifact.** The test harness checks transcript markers, skill
  invocation, subagent dispatch count, task tracking, commits, test runs, and token/cost breakdown. v3 should keep
  workflow conformance tests at the event/behavior layer, not only final file state.

### Modularity and distribution

- **The main seam is content core vs provider adapter.** `skills/` is the shared source of truth; provider packages
  supply discovery, bootstrap, and tool mapping. That maps cleanly to v3 as: reusable workflow/skill definition plus
  provider capability binding.
- **Capability mapping is too implicit for a kernel.** Superpowers has good Markdown mappings for Codex, Claude,
  Gemini, Pi, Antigravity, OpenCode, Kimi, etc., but no single machine-readable provider capability schema. v3 should
  have one if runtime routing depends on these capabilities.
- **Manifest/version skew is a real distribution risk.** `.version-bump.json` enumerates multiple harness manifests,
  and the Codex sync preserves platform-owned OpenAI metadata while overlaying shared source. v3 should treat provider
  package sync as a tested release pipeline, not a manual copy.
- **Some contracts require live-harness tests.** OpenCode tests can skip when the harness is unavailable, and the
  porting guide explicitly calls for live session acceptance. v3 should distinguish CI-safe adapter unit tests from
  live provider conformance tests.

## Consolidated Direction for v3

| v3 level | What Superpowers contributes | Verdict |
|---|---|---|
| **L2 gates** | The **verification gate**: a step's self-report does NOT satisfy a downstream gate — check an independent artifact (diff/test-output/checklist). | **Adopt `verify` as a kernel-enforced gate type.** The structural cure for "agents over-claim done"; validates "durable state > self-report". |
| **L3 human-decision** | Closed-enum decision gates with validation on the irreversible route; round caps that escalate into a human gate. | **Adopt closed-enum + per-route validation + escalating round caps.** |
| **L4 spawn/fan-in** | ContextPacket as a *file handle* (never pasted); fan-in = partition-then-verify; durable progress ledger; typed child-completion protocol; write-permission boundary; scratch artifact bus. | **Adopt the file-handle ContextPacket + the partition-then-verify fan-in discipline** (methodology complement to Temporal's slot-correlation mechanism), but back it with kernel ids/locks instead of naming conventions. |
| **L5 skills** | Action-indirection portability (one source → N hosts); bootstrap-as-coercive-contract; `description` = trigger-only; TDD'd skills; short core + lazy references. | **Adopt action-indirection + trigger-only descriptions + active-entry bootstrap.** Add machine-readable dependency/capability metadata that Superpowers lacks. |
| **Provider adapters** | Shared skill core with provider-specific discovery, session-start injection, message shape, and tool mapping; contracts tested per harness. | **Adopt capability-bound adapters.** Treat session-start injection and message/event ordering as conformance tests, not documentation. |
| **Operator evidence** | Review packages, short child summaries, transcript/token analysis, and evidence-first completion gates; no product dashboard. | **Adopt evidence packages and behavior telemetry; do not mistake this for a runtime UI model.** |
| **L12 authoring** | "Match the Form to the Failure"; behavioral regression tests; red-flags-as-encoded-failure-memory. | **Adopt the form-matching law + a conformance harness for curated procedures.** Human-curated complements Hermes's agent-authored. |
| **Workflow templates / WF-1..WF-7** | A worked reference SDLC: brainstorm-gate → durable plan → status-routed steps → escalating review rounds → verification gate → closed-enum finish. | **Use as the reference instance for v3's canonical test workflow.** |

## Reconsiderations for v3

1. **The verification gate is the one finding that should change v3's gate model.** Across the series the "agents over-claim done"
   anti-pattern recurred (vibe-kanban's ephemeral approvals, hermes's best-effort everything). Superpowers turns it into a crisp
   structural rule: **a `verify` gate's contract is "fresh, independent evidence produced in this transition," and an upstream step's
   own success report is explicitly NOT evidence.** v3 should add `verify` as a first-class L2 gate kind whose evaluator reads an
   independent artifact (the git diff, the test exit code, a requirements checklist) — never the actor's self-report. This is the
   structural form of v3's "durable state is authority, agent self-report is not evidence" contract, and it's the most broadly
   applicable thing this study yields.

2. **Superpowers is the reference workflow v3's WF-1..WF-7 should be measured against.** It is a real, opinionated, battle-tested
   agentic SDLC by a respected practitioner, and it maps cleanly onto v3's vocabulary (L3 brainstorm-gate, durable-plan artifact,
   status-routed agent steps, escalating review rounds, the verification gate, closed-enum finish). v3's test workflows should cover
   this exact shape; if a v3 primitive can't express one of these stages, that's a gap in v3, not in the methodology.

3. **The L4 fan-in question now has both halves.** Temporal gave the *mechanism* (initiated-event-id slot = correlation + authorization);
   Superpowers gives the *discipline* (partition into non-overlapping domains up front, then reconcile empirically with conflict-check +
   full-suite; the ContextPacket is a file handle so the "42k-char pasted history" failure is impossible; the spawn-correlation binding
   is persisted in a durable ledger so a forgetful parent can't re-dispatch completed work). v3's L4 should implement the mechanism AND
   bake in the discipline (file-handle packets, persisted spawn bindings).

4. **This is the methodology lens — it confirms more than it changes.** Unlike the systems studies, Superpowers doesn't reshape the
   kernel verdict (commit-based, leaderless). Its job in the series is to (a) supply a worked reference workflow, (b) harden v3's L5/L3/L4
   shaping with concrete primitives, and (c) confirm — from the practitioner side — that durable state must outrank agent self-report.
   The single most actionable output is the `verify` gate; the rest sharpens layers the systems studies had already established.

## Caveats

- **A small, content-not-architecture study.** The first pass used four agents over the core methodology files; the second pass used
  ten lenses over source, docs, hooks, scripts, and tests. Findings about the *skill format, triggering, methodology shape, provider
  adapters, and authoring discipline* are high-confidence; this study does not — and is not meant to — supply kernel/durability
  mechanism.
- **A methodology, not a system.** Superpowers' "gates" are *prose disciplines* aimed at one LLM's psychology (rationalization tables,
  all-caps Iron Laws), not machine-checked kernel conditions. The study's job is to extract the *structural intent* (a `verify` gate, a
  file-handle packet, a closed-enum decision) and leave the persuasion prose behind — a kernel enforces, it does not persuade.
- **Judged against v3's bar.** Many "AVOID" verdicts (prose-only dependency graph, context-injection-as-enforcement, sequential-only
  implementation) mean "appropriate for a single-agent methodology, wrong for a distributed kernel," not "wrong."
- **Same-recent HEAD.** Analyzed at `896224c` (plugin v6.0.3), pushed 2026-06-18 — an actively-maintained library. Line numbers are a snapshot.
