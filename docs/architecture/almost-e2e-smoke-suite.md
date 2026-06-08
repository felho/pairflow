# Almost-End-to-End Smoke Suite

Status: design (pre-implementation)  
Owner: testing/runtime  
Scope: testing strategy for the public-entrypoint smoke layer that catches CLI dispatch, defaults wiring, and lifecycle bugs the unit/contract suites do not see

## Purpose

Several recent bugs reached us despite passing unit and contract tests:

- The UI **Open** button stopped working.
- **Restart** broke (the actual cause was a wrong CLI import path, not the
  restart flow itself).

The pattern is consistent: the bugs were not in the internal logic the unit
tests exercise. They were in the **wiring around rarely-used entrypoints** —
top-level CLI dispatch, dependency defaults, route handlers, lifecycle
transitions, UI action endpoints. Unit and contract tests run too close to
the internal modules to see this class of bug.

This document defines an **almost-end-to-end smoke suite** that exercises the
public entrypoints with a faked LLM and faked external side effects (editor,
terminal), but with everything else (CLI dispatch, state, transcript,
registry, routing, defaults) real.

## Why mocking the LLM is the right boundary

The bugs we have been catching late are not prompt-quality issues. They are
dispatch / wiring / lifecycle issues. Two test surfaces serve two concerns:

| Concern                         | Best caught by                              |
|---------------------------------|---------------------------------------------|
| Prompt quality, reasoning paths | Dogfooding + targeted reviewer/prompt tests |
| Wiring, dispatch, lifecycle     | Almost-E2E smoke with faked LLM             |

Mocking the LLM also makes the suite fast, deterministic, and cheap to run on
every PR. The tradeoff is honest: this suite does not validate prompt
behavior, by design.

## Three-Layer Architecture

The principle is **small, canonical coverage of high-risk rarely-used
entrypoints**, not a second test pyramid. Three thin layers:

### Layer 1: CLI lifecycle smoke

- Drives the **top-level CLI entrypoint**. **Runs against the compiled
  artifact (`dist/cli/index.js`), not TypeScript modules directly.** This is
  non-negotiable: the recent restart bug was a wrong CLI import path that
  surfaced only in the compiled build. TS-direct execution would have hidden
  it. Layer 1's job is to catch exactly that category.
- Covers the public CLI bug class: `bubble create`, `start`, `kickoff`,
  `pass`, `restart`, `delete`, `attach`, `merge`, `commit`.
- Validates: dependency wiring, defaults, state machine, transcript
  ordering, command entrypoint resolution, build/packaging integrity.
- LLM is replaced by a deterministic fake actor (see LLM Mocking Strategy).

### Layer 2: UI action API smoke

- **In-process route handler invocation, not HTTP, in this iteration.** The
  goal is dispatch / wiring, not socket / port lifecycle. HTTP transport may
  be added later as one additional smoke if a wire-format bug class emerges.
- Drives the UI action handlers directly with the same payload shape the UI
  would send (Open, Restart, Approve, Delete, Reply, etc.).
- Real backend, real registry, real state — but no real editor opening, no
  real terminal opening.
- Validates the UI → backend dispatch path the recent Open and Restart bugs
  lived on. **Real browser tests (Playwright) are explicitly out of scope** —
  the bugs we see are dispatch bugs, not render bugs.

### Layer 3: One golden full-ish bubble smoke

- A single canonical happy path on a minimal repo fixture.
- Real filesystem, real git, real state, real transcript.
- Faked LLM, faked editor, faked terminal.
- Target runtime: 10–30 seconds. If it grows past that, it stops getting
  run.
- This is the integration ceiling. Likely a post-merge / pre-release gate
  rather than per-PR.

## Fake / Real Boundary

The discipline is **targeted fakes, not "fake everything"**. What stays real
is what fails when wiring rots; what gets faked is what is slow, external,
or unrelated to the bug class.

| Component                                         | Faked?    | Why                                                                          |
|---------------------------------------------------|-----------|------------------------------------------------------------------------------|
| LLM / agent process (claude, codex)               | Fake      | Slow, expensive, non-deterministic; prompt quality is not what we test here  |
| Tmux session launch / terminate                   | Fake      | External process lifecycle; flaky; hides nothing about wiring                |
| Editor spawn (Open command)                       | Fake      | External process; we only need to assert the right command was issued        |
| Terminal spawn (Attach command)                   | Fake      | Same as editor                                                               |
| CLI dispatch (top-level command resolution)       | **Real**  | This is exactly where the recent bugs lived                                  |
| Defaults wiring (port → adapter)                  | **Real**  | Wiring rot is the target bug class                                           |
| Route handler / UI action API                     | **Real**  | Layer 2's whole purpose                                                      |
| State / transcript / inbox / registry pipeline    | **Real**  | The fake actor MUST go through this to validate ingestion                    |
| Git / filesystem (against fixture repo)           | **Real**  | Cheap; catches workspace bugs                                                |
| Sequence allocator, envelope validation           | **Real**  | Bypassing these would erase most of the suite's value                        |

## CI Parity And Test Isolation Lessons

Local green tests and GitHub green tests are not the same business signal
when a test depends on leaked state, global timers, or shared browser
storage. GitHub may run the same suite with different timing, process
ordering, or environment defaults, and that can expose hidden coupling that
does not appear locally.

The operational lesson from the expanded timeline retry failures is:

- Treat a CI-only UI failure as an isolation suspect before assuming product
  behavior is broken.
- Browser and store tests must start from explicit, private state. Do not
  rely on ambient `localStorage`, leftover expanded IDs, global timers, or
  prior test order.
- Tests that exercise retry behavior should control their scheduler and
  assert the observable final state, not only internal call counts or
  transient intermediate states.
- The smoke layer should preserve real wiring, but still keep each scenario's
  state and timing under explicit runner control.

In business terms: a release gate is only valuable if a pass means the same
thing every time. Shared test state turns the gate into a source of noise,
slows down release readiness, and makes engineers spend time debugging the
test environment instead of the product. Isolation is therefore part of the
quality contract, not only a testing convenience.

### Injection discipline (harness rule)

"Real defaults wiring" and "faked external adapters" coexist by following a
strict rule: the harness replaces adapters **only at existing port
boundaries** — `ProcessSpawnPort`, `LaunchBubbleSessionAckPort`,
`TerminateBubbleTmuxSessionPort`, and the agent command string in
`LaunchBubbleSessionInput`.

The harness **does not** call internal application APIs to inject
dependencies. Reaching into the application layer to substitute a port would
bypass the public CLI dispatch path the suite is designed to validate, and
would silently turn Layer 1 into a contract-test surface.

In practice: the way the smoke harness wires fakes must look identical to
how production wires real adapters — through `Dependencies` overrides at the
public entrypoint, not through internal seams. This rule is what preserves
Layer 1's reason to exist. It is also a discipline rule for the
implementation phase: when test setup gets awkward, the temptation is to
shortcut through an internal helper. That shortcut compromises the suite.

## Existing Seams

A short audit confirms the seams already exist in the port-and-adapter
layout. This is not greenfield infrastructure work.

| Boundary                          | Existing seam                                                        | Where                                                                    |
|-----------------------------------|----------------------------------------------------------------------|--------------------------------------------------------------------------|
| Editor spawn                      | `ProcessSpawnPort` injected via `BubbleOpenCommandDependencies`      | `src/cli/commands/bubble/open.ts:21-30`, `src/v11/ports/processSpawn.ts` |
| Restart cleanup                   | `TerminateBubbleTmuxSessionPort`, `RemoveRuntimeSessionPort`         | `src/v11/defaults/restart/restartCommandDefaults.ts`                     |
| Tmux launch / stop                | `LaunchBubbleSessionAckPort`, `TerminateBubbleTmuxSessionPort`       | `src/v11/ports/tmuxSessions.ts`                                          |
| Agent process command             | `LaunchBubbleSessionInput.implementerCommand` (string, swappable)    | `src/v11/ports/tmuxSessions.ts:19-39`                                    |
| **Agent → app feedback path**     | **Public CLI: `pairflow agent emit --kind ...`**                     | **`src/cli/commands/agent/emit.ts`**                                     |

The last row is the architectural keystone of the design. See LLM Mocking
Strategy below.

The architectural pattern in the codebase:

- `ports/` = interfaces (the "ports" in hexagonal architecture)
- `infrastructure/` = real adapters (Node spawn, tmux runner, fs, ssh)
- `defaults/` = production wiring (port → adapter)
- CLI commands accept a `Dependencies` object that overrides defaults.

## LLM Mocking Strategy

The agent (claude / codex) does **not** run as an in-process SDK call. It is
launched as a separate process inside a tmux pane, via the command string in
`LaunchBubbleSessionInput.implementerCommand` (and reviewer / meta-review
equivalents). SDK-level mocking from the parent process is the wrong
boundary.

The right boundary is the **process boundary itself**: the agent command is
replaced with a small fake binary / Node script for the smoke suite.

### The fake actor uses the public actor command surface

The fake actor must **not** write transcripts, append envelopes, or modify
state directly. Doing so bypasses exactly the layer the suite is meant to
defend — sequence allocation, envelope validation, normalization, inbox
routing, state transitions. The smoke would pass even if the actor →
application ingestion pipeline broke. That is the failure mode this whole
design is trying to prevent.

Instead, the fake actor uses the same public CLI the real actor uses:

```text
pairflow agent emit --kind <kind> --repo <path> --bubble-id <id> \
                    --handoff-id <id> --execution-id <id> ...
```

`pairflow agent emit` is the **only** canonical actor feedback surface.
Earlier aliases (`pairflow pass`, `pairflow ask-human`, `pairflow converged`,
`orchestra` actor commands) were removed in Phase 5. The supported `--kind`
values, all routed through the single subcommand, are:

- `pass` — implementer pass, with optional findings and refs
- `human_question` — actor asks a human a question
- `convergence` — reviewer convergence with optional findings
- `meta_review_result` — meta-review approve / rework / inconclusive

This way, the only thing replaced is the AI reasoning step. Everything from
"the agent has decided to emit X" onward — CLI dispatch, validation, state
transitions, transcript pipeline, inbox, sequence allocation — runs with
production code paths. That is what makes the suite "almost end-to-end" and
not "integration theater".

### How the fake actor is launched

The fake `LaunchBubbleSessionAckPort` does **more than ack**. When pairflow
would launch a real tmux session, the fake records the launch metadata
(captured handoff/execution IDs, agent command, role, etc.) and **registers
the scenario with the test runner** so the runner can advance it. Without
this, `bubble start` would succeed but the actor loop would never run, and
all downstream lifecycle assertions would observe a stalled bubble.

In other words: the fake tmux is not just a "yes I started the session"
stub. It is the spawn point for the fake actor scenario. The scheduling
itself stays under the test runner's explicit control (see Runner-driven
below).

### Runner-driven, not event-driven

The fake actor advances scenarios **explicitly under runner control**, not
by watching handoffs and reacting. The test does the moral equivalent of:

```text
runner.start();                       // bubble start (real CLI, faked tmux + agent)
runner.advance("pass");               // re-reads authority, then `pairflow agent emit --kind pass`
runner.advance("convergence");        // authority rotated after pass; re-reads before emit
runner.advance("meta_review_result", { recommendation: "approve" });
```

Each `advance(...)` shells out (or invokes the same handler the public CLI
uses) to `pairflow agent emit ...`, parameterized with the **current**
handoff-id / execution-id.

#### Authority freshness rule

The runner does **not** assume that an earlier captured handoff / execution
ID remains valid across emits. After every successful emit the active
handoff and execution authority rotates; using a stale ID would either be
rejected by the emit guard rails (`--expected-role`,
`--expected-state-fingerprint`) or, worse, silently target the previous
turn.

Before each `advance(...)`, the runner must:

1. Read the current handoff / execution authority from the public status /
   read-model surface (the same surface the UI and CLI use), **or**
2. Validate that its captured authority is still current (e.g., compare
   against status before issuing the emit).

The launch metadata captured by the fake `LaunchBubbleSessionAckPort` is
sufficient for the **first** advance only. Subsequent advances refresh from
the public surface.

Why runner-driven rather than an event-driven fake that watches state and
reacts:

- **Determinism.** The test specifies the exact sequence and timing.
- **Failure clarity.** When a smoke fails, the failing step and its inputs
  are obvious from the runner script. An event-driven fake makes "why
  didn't it advance" debugging much harder.
- **Smaller infrastructure.** Event subscription / state observation in the
  fake is real complexity we do not need to ship in Phase 1.

An event-driven mode may be added later if a Phase 2 scenario requires it
(e.g., timing-sensitive reactions). It is not on the Phase 1 critical path.

## Scenario Format: TypeScript

Scenarios are written in TypeScript, not JSON.

The reason is type safety on protocol envelopes and action payloads.
Protocol drift (a renamed field, a changed enum value, a new required
property) is exactly the kind of bug we want the smoke suite to catch at
authoring time, not at run time. A TS scenario file imports the same types
the production code uses; a JSON scenario file silently accepts whatever
shape the test author typed.

JSON would only earn its keep if non-engineers needed to author scenarios.
That is not the current need.

## Phase 1 Minimal Matrix

The first iteration is deliberately narrow. Discipline matters more than
coverage at this stage — a small stable suite that runs in seconds is more
valuable than a broad flaky one. Expand only after the first cut is stable.

**Phase 1 includes:**

- **CLI lifecycle (against `dist/cli/index.js`):**
  - `bubble create` + `start` against a fixture repo
  - `bubble restart`
  - `bubble open` (assert the right editor command would be spawned; no real
    editor)
  - `bubble delete`
- **Actor loop (one minimal happy path through the runner-driven fake):**
  - One scripted scenario: agent emits `pass`, then `convergence`, then a
    `meta_review_result` with `--recommendation approve`.
- **UI action API (Layer 2, in-process):**
  - Open action
  - Restart action
  - Delete action

**Phase 1 explicitly excludes:**

- Full happy path through commit / merge / approve
- Multi-round review loops
- Failure-mode scenarios (malformed envelopes, tmux launch failures, etc.)
- Layer 3 (golden full bubble run)
- Real browser tests
- Real HTTP transport for Layer 2

These are not abandoned; they are deferred until Phase 1 is stable and the
fake actor + scenario infrastructure is proven.

## Decided Choices

For traceability, the architectural choices in this design:

1. **Fake at the LLM / process boundary**, not the SDK boundary, because
   the agent runs as a separate process via tmux.
2. **Fake actor uses the public `pairflow agent emit --kind ...` CLI** —
   never direct transcript or state writes.
3. **Fake `LaunchBubbleSessionAckPort` schedules the scenario** so the
   actor loop actually runs after start.
4. **Runner-driven scenario advancement**, not event-driven, for
   determinism in Phase 1.
5. **TypeScript scenario format**, not JSON, for protocol type safety.
6. **Layer 1 runs against `dist/cli/index.js`** to catch import path /
   packaging bugs (the recent restart bug class).
7. **Layer 2 is in-process** (route handler invocation), not HTTP, in
   Phase 1.
8. **No Playwright / real browser** in Phase 1.
9. **Editor and terminal spawns are recorded, not executed** — the fake
   asserts the spawn command and arguments without launching anything.
10. **Harness injects fakes only at existing port boundaries** — never via
    internal application APIs. The public CLI dispatch path stays in the
    test surface; bypassing it would erase Layer 1's value.
11. **Runner refreshes handoff / execution authority before each
    `advance(...)`** — never assumes captured IDs remain valid across emits.
    Authority rotates after every successful emit.

## Estimated Pre-Suite Work

Approximate effort before the first Phase 1 smoke can run:

| Item                                                                                                                | Estimate    |
|---------------------------------------------------------------------------------------------------------------------|-------------|
| `FakeProcessSpawn` (records, does not spawn)                                                                        | ~30 lines   |
| `FakeTmuxSessions` pair (launch schedules scenario; terminate is a no-op ack)                                       | ~80 lines   |
| Fake agent runner (invokes `pairflow agent emit --kind ...` per step, refreshes handoff/execution authority between steps) + scenario loader | ~½–1 day    |
| Minimal repo fixture (Phase 1)                                                                                      | small       |
| Phase 1 scenarios (CLI lifecycle + one actor loop + three UI actions)                                               | small       |

The architectural pieces (ports, defaults, DI, public agent CLI) are
already in place.

## Open Questions

1. **Layer 3 cadence.** Per PR or post-merge / nightly? Depends on actual
   runtime once Layer 3 is built.
2. **Failure-mode scenarios (Phase 2).** When and how to seed them. High
   value — these are the rarely-walked paths the suite is meant to defend.
3. **Smoke matrix scope discipline.** What is the explicit rule for what
   earns a smoke test slot vs what does not? Without a rule we will drift
   into "every new feature gets a smoke test" and lose the cost advantage.
4. **Where does the suite live in the repo?** New top-level `tests/smoke/`
   or extend an existing folder? Contract tests already use a runner
   pattern that may be reusable.
5. **Fake actor invocation in dist.** When Layer 1 runs against
   `dist/cli/index.js`, how does the spawned bubble pick up the fake agent
   binary instead of the real `claude` / `codex`? Likely via an env var or
   a fixture-local `pairflow.toml` agent command override. To be confirmed
   during the runner spike.

## Next Step

Convert this architecture document into a Pairflow plan with explicit
L0/L1/L2 contracts and a task breakdown.

The first plan task is the **fake launch + runner contract**:

- the fake `LaunchBubbleSessionAckPort` (records launch metadata, registers
  scenario with the runner),
- the fake `TerminateBubbleTmuxSessionPort`,
- the runner-driven scenario advancement layer (with authority refresh
  between steps),
- the scenario loader and TS scenario type definitions.

Phase 1 smoke scenarios (CLI lifecycle, actor loop, UI action API) are
**downstream tasks**. They must not be bundled into the same first task,
because they depend on the runner contract being stable and reviewable on
its own.
