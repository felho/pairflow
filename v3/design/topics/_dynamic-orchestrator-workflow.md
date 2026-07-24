# Open Topic - Dynamic Orchestrator Workflow

Date: 2026-06-25 · Settled: 2026-07-07
Status: **SETTLED direction (2026-07-07).** No first-class dynamic-orchestrator mode; the
shape is a template pattern over six constructs; sessions are not kernel objects; see
"Settled direction" at the end. Verified against the Omnigent codebase by three
adversarial sweeps (examples 5/5, runtime source, design docs) before ratification.

Relation to other research:

- [`_open-agent-runtime-and-pane-layout.md`](_open-agent-runtime-and-pane-layout.md) covers how
  an actor runtime is executed and observed. (Its §4 restates this memo's §1 correction
  table for its own live-run record; this memo owns the open questions.)
- This memo covers a different issue: whether v3 needs a first-class dynamic orchestrator
  workflow shape, where an actor plans, delegates, waits, and re-delegates at runtime.
- This memo **owns Q1** (`ActorSessionRef` first-class or not); the storage memo's open
  question 9 covers only its residence (T1 vs T7) once Q1 lands.

> **Evidence update (2026-07-06, the BitSafe workflow simulation —
> `../research/bitsafe-workflow-simulation.md`):** the static half of this memo's
> territory got real-world grounding. The planner/worker split (S9 ARQ dispatcher,
> S12 Code Factory queues) showed the *template-authored* dispatcher shape works but
> exposed two constructs this memo's questions anticipate, now registered as
> future-topic items: **L4 #11 detached spawn** (mint-without-parking with a durable
> link — GAP-9) and **L4 #12 runtime-sized data-driven fan-out** (GAP-3). The
> *dynamic* half — an actor deciding mid-performance whom to consult — landed
> separately as the L5 help-ask (built), with the agent-addressed helper leg open as
> future-topic **L5 #9** (GAP-12 / S14). Q2 ("workflow mode, step type, or tool
> surface") should be re-read against those three items: they may jointly dissolve
> it, or reduce it to the session-reuse residue (Q1/Q3).

> **Evidence update (2026-07-24, Sakana Fugu —
> `../research/sakana-fugu-study.md`):** external confirmation of the settled
> direction from a *trained* orchestrator. Sakana's Fugu-Ultra — an RL-trained
> production orchestrator — converges on emitting a **declared workflow object**
> (steps + worker IDs + per-step context access lists) that is *fixed at
> generation time*, with no mid-flight re-delegation: dynamism is *which plan
> gets generated*, exactly this memo's "chooses at runtime — among declared
> possibilities." Their access-list isolation (motivated by a failure they name
> **"orchestration collapse"**) independently corroborates issued-context
> strictness. One forward pointer: a model-authored plan submitted through
> normal ingress is a viable *use pattern* of the template pattern — keep that
> door open when the orchestrator template gets authored.

---

## 1. The correction

The word "child" is misleading across the two systems.

In Omnigent, a **child session** is mainly a session-ownership and coordination concept:

- it was created by a parent session;
- it appears under that parent in the UI;
- its terminal/completion can be observed separately;
- its result is delivered back to the parent inbox.

That does **not** automatically mean it maps to v3 L4 `child_workflow`.

The better v3 mapping is conditional:

| Omnigent concept | Usually closer v3 concept | When it becomes v3 `child_workflow` |
|---|---|---|
| child session used for one delegated read/review/implementation task | an `actor_session` or runtime conversation used by a step/role dispatch | only if the delegated unit has its own kernel-modeled workflow instance and lifecycle |
| parent/child session tree | coordination metadata over actor sessions | L4 only when the parent waits on a full child workflow lifecycle |
| terminal for a child session | observe/takeover surface for the actor runtime | not a workflow primitive |

So the useful conclusion is:

```text
Omnigent child session != v3 child_workflow by default.
Omnigent child session is often closer to "the actor runtime conversation used inside a v3 step".
```

---

## 2. What Omnigent demonstrates

Polly behaves like a workflow, but not like a static template-authored workflow. It is a
**dynamic orchestrator workflow**:

```text
human goal
  -> Polly plans at runtime
  -> Polly dispatches child sessions
  -> child sessions run independently
  -> Polly waits on inbox results
  -> Polly may dispatch follow-up work, reviews, fixes, or summaries
  -> Polly eventually answers the user
```

The workflow shape is authored by Polly during the run, not fully declared ahead of time by a
static kernel template.

Omnigent's key runtime primitives:

- `sys_session_send(agent, title, args)` creates or continues a child session.
- In named mode, `(agent, title)` is a reuse key:

  ```text
  first send(agent="codex", title="auth-review") -> create child session
  later send(agent="codex", title="auth-review") -> continue same child session
  ```

- `sys_session_send(session_id=...)` can address an existing child session directly.
- `sys_session_create(...)` can create a child session explicitly.
- `sys_read_inbox` lets the parent drain completed async work.
- A child can become a parent of its own children if it has the tool surface to spawn them.

This is not a free global agent-to-agent bus. The default topology is still parent/child oriented:

```text
parent can send to its children
child results return to parent inbox
child may spawn its own children if allowed
sibling-to-sibling direct messaging is not the primary model
```

But it is much more dynamic than a static step graph.

---

## 3. What current v3 models well

Current v3 is strongest when the workflow shape is known and authored as a template:

```text
template step
  -> role/actor binding
  -> actor receives issued context
  -> actor emits a structured output
  -> kernel validates/dedups/CAS-commits
  -> template routes to the next step
```

This gives v3 strong correctness properties:

- actor output is accepted through explicit `emit`;
- authority binding, `op_id`, payload digest, and CAS can be enforced at ingress;
- step routing is owned by the kernel/template, not inferred from chat text;
- human decisions, gates, child lifecycle events, and action results can become audited kernel
  facts.

L4 `child_workflow` is one particular extension of this static model:

```text
parent child_workflow step
  -> ChildWorkflowLink
  -> SpawnIntent
  -> CREATE_INSTANCE child
  -> parent WAITING(child_event)
  -> CHILD_LIFECYCLE routes parent
```

This is appropriate when the delegated unit is itself a full workflow instance with its own
kernel-modeled lifecycle.

---

## 4. What current v3 does not model yet

The current v3 model does not yet have a clear first-class shape for Omnigent/Polly-style dynamic
orchestration:

- An actor receives a high-level goal and dynamically creates work items.
- The actor decides at runtime how many worker sessions to use.
- The actor can continue a named worker conversation rather than always spawning a fresh
  invocation.
- The actor can wait on inbox results, inspect them, then decide whether to send follow-up work.
- The actor can manage a task/review/fix loop without that loop being fully pre-authored as a
  static template graph.

Current L4 explicitly covers a stricter shape:

- child execution is a declared `child_workflow` step;
- the parent waits on declared lifecycle keys;
- MVP is sequential, one child link per parent step;
- a terminal child link means a future re-entry with the same `child_key` spawns a fresh attempt,
  not a continued conversation;
- parent-driven live child steering is deferred.

That is a feature for correctness, but it means Omnigent's dynamic session workflow is not yet
represented.

---

## 5. Candidate missing concept: ActorSessionRef

The missing concept may be an `ActorSessionRef`: a durable reference to a runtime conversation used
by a step/role dispatch, separate from L4 `ChildWorkflowLink`.

Possible shape:

```text
ActorSessionRef {
  session_id,
  owner_instance_id,
  owner_step_id?,
  role,
  actor,
  title_or_key,
  status,
  reuse_policy,
  observe_surface_refs
}
```

This would model a reusable worker conversation without forcing it to be a full child workflow
instance.

Useful reuse policies:

```text
fresh_per_invocation
reuse_per_step_instance
reuse_per_role_in_workflow
reuse_by_named_task_thread
explicit_session_id
close_or_tombstone_on_completion
```

Omnigent's `(agent, title)` mode is closest to:

```text
reuse_by_named_task_thread
```

---

## 6. Candidate missing mode: Dynamic Orchestrator Step

Another missing concept is a step or workflow mode where the actor is allowed to orchestrate
sub-work dynamically through kernel-owned primitives:

```text
dynamic_orchestrator step
  -> actor can create/continue actor sessions
  -> actor can send turns to actor sessions
  -> actor can wait/drain inbox
  -> actor can close/tombstone actor sessions
  -> actor eventually emits a final structured result
```

The key v3 requirement: dynamic must not mean unaudited chat-only behavior. The orchestrator's
actions should still become committed intents/facts:

```text
ACTOR_SESSION_CREATE_OR_CONTINUE intent
ACTOR_SESSION_SEND intent
ACTOR_SESSION_CLOSED
INBOX_ITEM_DELIVERED
ORCHESTRATOR_FINAL_EMIT
```

This preserves v3's source-closed discipline while allowing Omnigent-like flexibility.

---

## 7. Relationship to step, role, and child workflow

The likely hierarchy:

```text
workflow instance
  -> step
    -> role binding
      -> actor dispatch
        -> actor session / runtime conversation
          -> observe surface
```

L4 `child_workflow` is different:

```text
workflow instance
  -> child_workflow step
    -> child workflow instance
      -> its own steps/roles/actor sessions
```

So:

- If the delegated unit is "ask Codex to investigate and report", it can be an actor session inside
  a step.
- If the delegated unit is "run a full implement/review/merge workflow", it may deserve L4
  `child_workflow`.
- If Polly itself dynamically decides which of those to do, Polly is acting as a dynamic
  orchestrator workflow.

---

## 8. Open design questions

1. Should v3 support `ActorSessionRef` as a first-class durable object, or keep actor sessions
   adapter-local until a later level?
2. Should dynamic orchestration be a workflow mode, a step type, or just a packaged tool surface
   available to selected roles?
3. Which session reuse policies should be kernel-owned versus adapter/presentation-owned?
4. How should dynamic actor-session sends relate to v3 `emit`?
   - Is "send to actor session" a committed intent?
   - Is the worker response a normal actor emit?
   - Does parent wake derive from an inbox item, a wait condition, or both?
5. How much of Omnigent's parent inbox model belongs in v3 L8 channel/task-inbox work versus an
   earlier dynamic-orchestrator slice?
6. How should observe/takeover attach to an `ActorSessionRef` without becoming part of workflow
   truth?

---

## 9. Design pressure summary

Omnigent demonstrates something current v3 does not yet model cleanly:

```text
a long-lived LLM orchestrator can dynamically construct and supervise a workflow at runtime
using reusable child agent sessions and inbox completion.
```

Current v3 demonstrates something Omnigent does not enforce as strongly:

```text
every load-bearing transition should be an explicit, validated, idempotent, committed kernel fact.
```

The synthesis is not to replace one with the other. The promising direction is:

```text
Omnigent-style dynamic actor-session orchestration
+ v3-style committed intents, emit contracts, idempotency, and wait resolution.
```


---

## Settled direction (2026-07-07, ratified)

**No first-class dynamic-orchestrator mode.** The question dissolved: every
dynamic-orchestration element lands in one of **six shapes**, and what remains
of "the dynamic orchestrator" is a **template pattern** (plan → delegate →
wait/collect → re-plan, authored as a workflow over these constructs), not a
kernel mechanism. "Dynamic" is made precise: *the agent chooses at runtime —
among declared possibilities*; which route it takes, how many workers it
mints, whom it consults are its runtime decisions, and every one of them is a
committed fact.

The six shapes:

1. **Declared spawn-and-await** — the built L4 child step.
2. **Detached spawn** (mint-and-move-on with a durable link) — future-topic
   L4 #11.
3. **Runtime-discovered N fan-out** — future-topic L4 #12.
4. **Mid-work help-ask** — the built L5 subflow (+ the agent-addressed leg,
   L5 #9).
5. **Session-internal tool calls** — below the kernel floor by the ratified
   weight rule (`_open-kernel-floor.md`).
6. **The multi-round child** (absorbed from the Omnigent verification): a
   child instance that **parks between rounds** — its template loops work →
   report → wait-for-input → resume — re-instructed through **normal ingress**,
   addressed by its durable **instance id**. What Omnigent models as a
   "resumable warm session", v3 models as a live parked instance: the
   load-bearing continuity (worktree, PR, the rounds' record) is the child's
   instance state + runtime_context — kernel-tracked; conversational warmth is
   adapter-side optimization under issued session intent. Consequence: L4
   future #3 (intermediate lifecycle subscriptions) is **promoted to
   load-bearing** — the parent must learn "reported, awaiting input", not only
   termination.

Answers to this memo's open questions:

- **Q1 (`ActorSessionRef` first-class?): No.** Sessions are not kernel
  objects; only structural records are durable, and v3's durable structural
  record is the *instance* (+ links) — strictly stronger than a session row
  (survives restart, carries typed state). Session handles live adapter-side
  (storage memo Q9 ⇒ T7), recorded kernel-side only as issued intent;
  proving reuse/freshness is the attestation seam (GAP-8/GAP-13).
- **Q2 (mode / step type / tool surface): dissolved** into the six shapes +
  the template pattern.
- **Q3 (session-reuse policies): adapter/presentation-owned**, declared via
  L0c run config; the kernel records the issued intent.
- **Q4 (session sends vs emit):** inside a performance = tool call (shape 5);
  anything load-bearing re-enters through normal ingress as a committed fact —
  the no-side-door rule (`_open-runtime-capability-surface.md` rule 2).
- **Q5 (inbox):** L8 task-inbox territory. **Q6 (observe/takeover):** the
  observe seam.

**Verification record.** Before ratification, three adversarial Opus sweeps of
the Omnigent codebase tested the decomposition: (a) all five `examples/`
(polly, debby, scribe, sentinel, kimi_hello) — every coordination element
classified; (b) the runtime source (spawn/session/inbox/timer/policy
machinery); (c) the design docs (QUEUE_STEER, CUJ maps, POLICIES,
plugin seam). Findings: **no live mid-flight steering of a running child
exists** (queue-steer is human-to-own-session input delivered at step
boundaries through ordinary persist-before-forward ingress); **no
worker-to-worker mesh** ("siblings only communicate via the parent" is
Omnigent's own stated rule); **no kernel plan object** (Polly's plan is its
context + a registry file); **no durable cross-restart session addressing is
exercised anywhere**; timers are unimplemented on their current path. The one
shape the original five buckets missed — the cross-review fix loop / debate
rounds re-instructing the same child — was absorbed as shape 6. Omnigent's
own architecture corroborates the session split (they persist only structural
conversation rows; liveness/inbox/wake is in-memory) and its bug history
corroborates the no-side-door rule (the transient inbox queue is their
documented defect source: stranded wakes, dropped completions, restart
rebuild scaffolding).
