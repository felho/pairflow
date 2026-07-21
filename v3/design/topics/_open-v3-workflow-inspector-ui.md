# V3 Workflow Inspector UI

Status: open research note
Date: 2026-06-27

## Question

The current Pairflow UI is tied to bubbles and their known lifecycle. V3 aims to have
a general kernel with configurable workflows, typed transitions, gates, waits,
actions, child instances, and later channels. The question is what a useful baseline
UI should look like when the UI can no longer bake in the bubble-specific state
machine.

Related but separate: tmux panes, terminal attach, browser observe surfaces, and
native TUI views are runtime observation surfaces. They should not become the UI's
source of workflow truth.

## Current conclusion

The v3 UI should be a kernel read-model UI, not a bubble UI and not a pane UI.

The source of truth is the kernel instance state plus transcript. The UI should
consume typed projections and observable event streams derived from that truth. Any
operator action from the UI must re-enter through normal kernel ingress with `op_id`,
`expected_version`, authority checks, CAS, and idempotency. The UI must never mutate a
projection, stream store, adapter-local state, or runtime pane directly as if that were
workflow state.

```text
kernel transcript / instance state
  -> typed projections / read models
  -> UI

UI command
  -> normal kernel ingress
  -> op_id + expected_version + authority checks
  -> committed kernel event
```

## What the baseline UI must answer

### 1. What is running?

The UI needs an instance list or inbox showing:

- workflow/template id;
- instance status;
- current step;
- current role / actor;
- round;
- wait kind, when parked;
- terminal disposition, when closed;
- last update;
- attention markers such as blocked, waiting on human, failed gate, or stale action.

### 2. Where is the workflow?

The UI needs a workflow graph projection, not necessarily a full BPMN editor. The
minimum useful view highlights:

- current step;
- available transitions;
- human gates;
- action steps;
- child workflow waits;
- terminal branches;
- blocked or rejected paths when relevant.

The graph should be template-derived and instance-annotated. It should not infer
meaning from role names or bubble-specific state names.

### 3. What is the instance waiting for?

This is the load-bearing v3 UI question. Every parked state should render as a clear
current request:

- actor dispatch outstanding;
- human decision required;
- action pending or action running;
- runtime context provision / release in progress;
- child workflow lifecycle wait;
- later: external wait condition / fuzzy correlation / task inbox item.

The UI should not force users to read the raw transcript to understand why an instance
is parked.

### 4. What happened?

The UI needs a timeline built from transcript / observable events. The first view
should group events into human-meaningful rows:

- actor emitted a protocol event;
- transition committed;
- gate allowed / warned / blocked;
- decision requested / made;
- action running / result;
- runtime context ready / release failed / released;
- child spawned / completed / failed;
- evidence refs;
- rejected / stale / duplicate diagnostics.

Raw transcript inspection can exist as a diagnostic tab, but it should not be the
primary workflow UI.

### 5. What can I do now?

The UI should render actions from kernel-derived request objects, not hardcoded
workflow vocabulary.

Examples:

- `HumanDecisionRequest` becomes a decision form with allowed decisions, recommendation,
  override requirement, and per-decision required payload fields.
- `ActionRequest` becomes a run-action form with typed payload requirements.
- `DispatchIntent` / `ContextPacket` becomes an actor work-item view.
- `ChildWaitProjection` shows the linked child and its lifecycle status.
- `RuntimeContextProjection` shows provisioning/release state and evidence.
- Terminal projections can expose archive/export/purge later, as ordinary operator
  commands.

## Suggested baseline layout

```text
+--------------------+------------------------------+-------------------------+
| Instance / Inbox   | Workflow + Timeline           | Current Work / Observe  |
|                    |                              |                         |
| runs               | step graph                    | human decision form     |
| waiting items      | current node                  | actor packet            |
| child tree         | event timeline                | action request/result   |
| filters            | evidence markers              | artifacts/logs/terminal |
+--------------------+------------------------------+-------------------------+
```

Left side: what needs attention.

Middle: where this instance is and what happened.

Right side: the current request, work item, evidence, or optional runtime observe
surface.

## Minimal read models

The UI should consume stable read models rather than internal storage rows.

```ts
type InstanceSummary = {
  instance_id: string;
  template_id: string;
  status: "active" | "waiting" | "terminal";
  current_step?: string;
  current_role?: string;
  actor?: string;
  round: number;
  wait_kind?: string;
  terminal_disposition?: "done" | "failed" | "cancelled";
  updated_at: string;
};

type InstanceDetail = {
  summary: InstanceSummary;
  template_graph_projection: TemplateGraphProjection;
  current_request?: CurrentRequest;
  child_links: ChildLinkProjection[];
  evidence_refs: EvidenceRef[];
};

type TimelineEvent = {
  event_id: string;
  instance_id: string;
  transcript_version: number;
  kind: string;
  timestamp: string;
  actor_id?: string;
  step_id?: string;
  op_id?: string;
  summary: string;
  payload_ref?: string;
  evidence_refs: EvidenceRef[];
};

type CurrentRequest =
  | DispatchProjection
  | HumanDecisionProjection
  | ActionProjection
  | ChildWaitProjection
  | RuntimeContextProjection
  | TerminalProjection;
```

These are projections. They are not authoritative by themselves.

## Observe surfaces are plugins, not workflow state

Tmux panes, terminal bridges, browser sessions, native TUI windows, app-server streams,
and logs are observe surfaces. They help humans inspect or take over a runtime, but the
kernel state remains the transcript and instance store.

Examples:

```text
Actor step runs through a Codex app-server adapter
  -> UI shows structured workflow state and progress
  -> optional observe panel attaches to the app-server / terminal surface

Actor step runs through a Claude native TUI in tmux
  -> UI shows the same workflow state
  -> optional observe panel attaches to the tmux / PTY surface
```

This keeps the Omnigent lesson: communication, authoritative output, tools, and
observe/takeover are separate channels. The pane is not the workflow.

## Observation contract

The baseline UI needs a generic kernel observation contract:

```text
subscribe(streamAddress, offset)
queryReadModel(instance_id)
submitCommand(command)
```

Stream addresses should match the unit the consumer needs:

- run;
- instance;
- child link;
- task inbox;
- actor session;
- channel, later.

Observable events should be typed and versioned, with durable replay offsets. Live push
may be lossy or buffered, but it must never be mistaken for the replay cursor. Terminal
markers should be sent in-band so the UI does not infer completion from a timeout.

> **Canonical home note (2026-07-06):** this contract now lives, in more detail, in
> [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)
> "Observe seam" §§1–5 — consume it from there; this section stays as the UI-side
> requirement statement.

## MVP prototype target

A useful learning prototype should not start with visual polish. It should start with a
mock or small v3 kernel event log and prove the read-model contract.

Suggested prototype:

1. Create a tiny workflow event log for one instance with an actor step, a gate, a
   human decision, an action, and a terminal transition.
2. Materialize `InstanceSummary`, `InstanceDetail`, `TimelineEvent[]`, and
   `CurrentRequest`.
3. Render instance list, step graph, timeline, and current request panel.
4. Submit a human decision through a command object carrying `op_id` and
   `expected_version`.
5. Add an optional observe panel as a plugin, not as the state source.

The success criterion: the same UI shell should make sense for a Pairflow bubble,
a document-only workflow, a human approval workflow, and a future external-channel
workflow because it is reading kernel projections, not bubble-specific state.

