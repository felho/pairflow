# Open Topic - V3 Core API Surface

Date: 2026-06-27
Status: draft open research note

## Question

V1 was primarily experienced as a CLI. The v3 core model is moving toward a
general kernel with workflows, typed transitions, gates, waits, runtime contexts,
child instances, observe streams, and later external orchestration.

The question is whether the v3 core API should remain CLI-shaped, or whether the
CLI should become only one client of a typed kernel API.

## Current conclusion

The v3 core API should not be the CLI. The CLI should remain, but as a thin
client over the same typed command / query / observe API used by the UI, actor
adapters, tests, and external orchestrators.

The core model already points in this direction:

```text
RECEIVE(input) -> Outcome
  operator_intent
  kernel_event
  actor_envelope
```

That is a typed ingress model, not a shell-first model. A CLI command can produce
one of those inputs, but it should not be a privileged path around the kernel.

## Why the CLI is insufficient as the core API

The CLI is useful for local operation, debugging, scripts, and developer
ergonomics. It is not the right source contract for v3 because several consumers
need the same core behavior:

- a web workflow inspector UI;
- actor adapters submitting structured emits;
- local scripts and tests;
- external orchestrators or IDE integrations;
- observe/read-model consumers;
- later remote hosts, task inboxes, and fleet tools.

If the CLI is the source API, every non-CLI consumer either shells out or
re-implements hidden command semantics. That recreates the v1 problem where a lot
of load-bearing behavior lived in command-specific validation and UX conventions.

## Proposed surface families

The v3 API should have at least three families.

### 1. Command ingress

State-changing operations enter as typed commands or events. Every command must
flow through the normal kernel protections: `op_id`, authority checks,
capability/grant checks, schema validation, expected-version / CAS, and
idempotency.

Examples:

```text
resolveStart(command, project_config) -> ResolvedStartRequest | Rejected
createInstance(resolved_template_ref, activation_mode, task, binding, run_overrides)
start(instance_id, op_id, expected_version)
submitActorEmit(actor_envelope)
submitDecision(decision)
resumeWait(event)
runAction(intent)
cancel(instance_id, op_id, expected_version)
deleteRequested(instance_id, op_id, expected_version)
```

Some public commands may be convenience compositions. For example, a user-facing
`startWorkflow(...)` can compose:

```text
RESOLVE_START -> CREATE_INSTANCE -> START
```

But that composition should not erase the underlying kernel steps. The audit and
failure modes remain attached to the primitive transitions.

### 2. Query / read-model API

The UI, CLI, and external tools need stable projections rather than raw storage
rows.

Examples:

```text
listInstances(filter)
getInstanceDetail(instance_id)
getCurrentRequest(instance_id)
getWorkflowGraphProjection(instance_id)
getTimeline(instance_id, cursor)
getChildLinks(instance_id)
getEvidenceRefs(instance_id)
```

These projections are read models. They are useful for humans and tools, but they
are not authoritative by themselves. Mutations must go back through command
ingress.

### 3. Observe API

Observation should be stream-based and resumable, not only "poll the latest
status".

Examples:

```text
historyPlusStream(stream_address, offset)
subscribe(stream_address, offset)
resumeFromOffset(stream_address, offset)
```

This is the API family needed by the workflow inspector UI, CLIs, dashboards, and
external orchestrators. It should support durable replay, live tail, terminal
markers, gap markers, and typed observable events.

> **Canonical home note (2026-07-06):** the observe contract has since been
> absorbed, in more detail, into
> [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)
> "Observe seam" §§1–7 (atomic history-plus-tail, three media, typed envelope,
> addressed streams/offsets, backpressure/terminal markers, external protocol
> adapter, control-commands-re-enter-through-ingress). That section is the
> canonical spec surface; this section remains as the API-family framing only.

## The CLI's role

The CLI should remain important, but its implementation should be a client of the
API surface.

Example mapping:

```text
pairflow start ...
  -> resolveStart(...)
  -> createInstance(...)
  -> start(...)

pairflow inbox
  -> listCurrentRequests(...)

pairflow decision submit ...
  -> submitDecision(...)

pairflow observe ...
  -> historyPlusStream(...)

pairflow cancel ...
  -> cancel(...)
```

The CLI can provide operator-friendly defaults, formatting, prompts, local config
lookup, and shell ergonomics. It should not own unique state-transition semantics
that the UI or external protocol cannot use.

## Relation to other open topics

- [`_open-v3-workflow-inspector-ui.md`](_open-v3-workflow-inspector-ui.md) needs
  query/read-model and observe APIs. The UI should submit commands, not mutate
  projections.
- [`_open-agent-runtime-and-pane-layout.md`](_open-agent-runtime-and-pane-layout.md)
  shows why observe/takeover surfaces are separate from authoritative command
  ingress.
- [`_dynamic-orchestrator-workflow.md`](_dynamic-orchestrator-workflow.md) will
  need explicit command shapes if a dynamic orchestrator can create/continue
  actor sessions, send work, drain inboxes, and emit final results.
- `core-model.html` already treats `CREATE_INSTANCE` plus `START` as kernel-level
  primitives, with "start workflow" as a convenience operator API.

## Design pressure

The API boundary should preserve v3's core invariant:

```text
all load-bearing state changes are explicit, validated, idempotent, committed
kernel facts
```

That means the API should be protocol-first, not CLI-first. The CLI is a first
client and a good local UX. It is not the authority.

## Open questions

1. What is the minimal API shape needed for the first prototype: in-process TS
   service, local HTTP server, JSON-RPC, or both?
2. Should the public API expose primitive commands only, or also convenience
   compositions such as `startWorkflow`?
3. Where should command canonicalization and `op_id` generation live for
   operator commands: client-side, server-side helper, or both with a collision
   guard?
4. Should query/read-model APIs be generated from projection definitions, or
   hand-authored initially?
5. What protocol should external orchestrators use later: a custom HTTP/JSON API,
   JSON-RPC, ACP-style typed protocol, MCP tools, or an adapter layer over the
   same internal service?
6. How much of this needs to be specified before the first runnable v3 kernel
   prototype?

