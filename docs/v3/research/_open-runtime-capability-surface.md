# Open: Runtime capability surface

Status: open research memo.

This memo records the Omnigent `sys_*` lesson for v3. The point is not the
prefix itself. The useful pattern is that Omnigent exposes selected runtime
control-plane operations to the agent as explicit, typed, LLM-callable tools.

## Context

The question started from recurring Omnigent names like `sys_os_shell`,
`sys_session_send`, `sys_read_inbox`, `sys_terminal_launch`, and
`sys_add_policy`.

In Omnigent these are not ordinary domain tools and not policies. They are
runtime-owned system tools. The runtime registers them, decides which agent sees
which ones, dispatches many of them through runner/server control paths, and
allows policy gates to intercept them.

Observed Omnigent references:

- `omnigent/tools/manager.py`: registers runtime-owned tool families.
- `omnigent/tools/builtins/*`: defines built-in system tool schemas.
- `omnigent/runner/tool_dispatch.py`: dispatches many `sys_*` tools via
  runner-local logic or server REST calls.
- `omnigent/spec/types.py`: documents which spec switches enable surfaces such
  as `os_env`, `terminals`, `spawn`, `timers`, and async inbox.

## Omnigent pattern

Omnigent gives the agent a controlled platform API:

- `sys_os_*`: workspace/OS operations such as read, write, edit, shell.
- `sys_session_*`: create, drive, inspect, close, and share sessions/subagents.
- `sys_terminal_*`: explicit terminal resources, separate from the agent's main
  communication channel.
- `sys_call_async`, `sys_read_inbox`, `sys_cancel_async`, `sys_cancel_task`:
  async work and result collection.
- `sys_add_policy`, `sys_policy_registry`: runtime policy discovery and
  session policy creation.
- `sys_agent_*`: agent discovery and agent bundle inspection/download.

Some surfaces are always present, some are opt-in through the agent spec, and
some are advertised but still authority-checked server-side. For example,
session read tools can be broadly visible while mutation/spawn/share operations
remain separately gated.

This is a useful split:

- visibility: what the actor can see in its tool/capability list;
- authority: whether the runtime will actually allow the operation;
- policy: whether an operation should be allowed, denied, or parked for user
  approval at this moment.

## v3 lesson

v3 should treat runtime control-plane operations as a first-class capability
surface, not as hidden orchestration side effects and not as ordinary domain
tools.

The v3 shape should likely be:

```text
context packet
  -> available domain actions
  -> available runtime operations
  -> schemas for each operation
  -> authority binding / op_id discipline
  -> policy / approval expectations
```

Candidate runtime-operation families:

- `emit`: submit actor output for the current step.
- `spawn_actor_run` / `spawn_session`: start a child or delegated actor run.
- `send_to_session`: drive an existing child/session.
- `read_inbox`: collect completed async or child results.
- `close_session`: tombstone a child/session.
- `list_sessions` / `get_session_info` / `get_session_history`: inspect related
  sessions.
- `open_terminal` / `read_terminal` / `send_terminal` / `close_terminal`: manage
  explicit terminal resources.
- `propose_policy`: ask the user/admin to add a runtime/session policy.

These should be typed kernel/runtime operations, projected into the actor's
context packet only when applicable. The actor should not infer them from
prompt prose.

## Layer mapping

- L0b context packet: projects the available runtime operation surface for the
  current actor/step.
- L1 capability matrix: decides whether an actor/role/step may see or invoke a
  runtime operation.
- L2 policy gates: can turn an invocation into allow/warn/block/ask, for
  example shell, spawn, policy mutation, or credential-sensitive operations.
- L4/L8 child/channel model: represents child run completion and async inbox
  delivery without transcript scraping.
- L0e runtime context provider: owns concrete execution resources such as
  worktrees, sandboxes, terminals, and process adapters.
- Observe/attach surface: may render terminals or sessions, but is separate
  from the structured actor communication path.

## Important cautions

Do not copy Omnigent's prefix mechanically. `sys_*` is a useful naming signal,
but the v3 design should name the abstraction: runtime operations or kernel
capabilities.

Do not expose kernel internals as template configuration. Authority fields and
context binding are protocol/kernel-owned. The template or workflow can request
shape-specific capabilities, but it should not decide which security bindings
are mandatory.

Do not route every runtime action through free-form LLM tool calls by default.
For v3's commit-based model, some operations may be better represented as typed
emits or kernel transitions. The lesson is explicitness and gateability, not
that every operation must be an LLM tool.

Do not conflate terminal observation with actor communication. Omnigent's
terminal tools are explicit resources; its stronger pattern is to keep
communication, tool/output protocol, and observe/takeover surfaces separate.

## Open questions

1. What is the v3 name for this surface: runtime ops, kernel ops, system
   capabilities, or something else?
2. Which operations are actor-callable, and which remain kernel-internal
   transitions triggered only by committed emits?
3. How does this interact with a future dynamic orchestrator workflow, where an
   actor can decide to spawn or message other actor runs during execution?
4. Should policy mutation be supported at all in v3, and if yes, is it limited
   to "propose policy" with mandatory user/admin approval?
5. How are runtime ops recorded in the transcript or ledger so replay/recovery
   does not depend on screen scraping or prompt-only convention?

## Current takeaway

Omnigent demonstrates a practical model where the platform control plane is
visible to agents as explicit, typed capabilities. For v3, the durable version
of that idea is not a `sys_*` clone; it is a context-packet-projected runtime
operation surface, backed by L1 authorization, L2 policy/approval, and L8-style
result channels.
