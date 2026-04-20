---
name: UsePairflow
description: Manage pairflow bubble lifecycle with strict state-aware routing and optional evidence bootstrap planning. USE WHEN create/start bubble OR intervene/troubleshoot active bubbles OR review for approval OR close/approve/rework/commit/merge OR cleanup/recovery OR bootstrap evidence.
---

# UsePairflow

State-aware Pairflow orchestration skill.

This skill exists to avoid lifecycle mistakes (wrong command in wrong state, lost worktree changes, stuck watchdog loops, accidental rebase/merge chaos).

## Maintainer Warning

- Workflow files under `Workflows/` are reusable templates: keep default wording project-agnostic.
- Do not hardwire project-specific routes, selectors, or product copy as defaults in a workflow.
- Keep project-specific pieces in workflows only as clearly labeled examples/placeholders.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CreateBubble** | "create bubble", "start bubble", "kick off bubble", "ideation kickoff" | `Workflows/CreateBubble.md` |
| **InterveneBubble** | "bubble stuck", "watchdog", "waiting human", "continue loop", "pass to implementer/reviewer" | `Workflows/InterveneBubble.md` |
| **TroubleshootBubble** | "pairflow issue", "something is odd", "status mismatch", "why command failed" | `Workflows/TroubleshootBubble.md` |
| **ReviewBubble** | "explain bubble changes", "detailed review", "approval review", "deep mode" | `Workflows/ReviewBubble.md` |
| **CloseBubble** | "close bubble", "bubble done", "approve and merge", "finalize bubble", "clean bubble" | `Workflows/CloseBubble.md` |
| **RecoverBubble** | "cancelled bubble but keep changes", "recover worktree", "commit cancelled bubble" | `Workflows/RecoverBubble.md` |
| **BootstrapEvidence** | "bootstrap evidence", "evidence plan", "trusted test evidence", "how to generate evidence logs" | `Workflows/BootstrapEvidence.md` |
| **TestBubble** | "manual test report", "test bubble", "smoke test plan", "fixture and browser matrix", "what to click and run" | `Workflows/TestBubble.md` |

## ReviewBubble Mental Model

- `Bubble` source means findings from the bubble loop context (reviewer/implementer transcript and related runtime artifacts).
- `MetaReview` source means findings from the meta-reviewer layer.
- `ReviewBubble` always runs the surviving direct review path from bubble worktree/task/transcript context.
- Existing meta-reviewer artifacts can still be cited as `[MetaReview]`, but there is no operator-facing source-mode selector.

## Core Principles

1. Always run `pairflow bubble status --id <id> --json` before any state-changing command.
2. Use the command that matches current state. Never guess.
3. Prefer Pairflow lifecycle commands over raw git/tmux when state progression is normal.
4. If bubble has valuable unmerged work but lifecycle state blocks normal flow (for example `CANCELLED`), switch to explicit recovery workflow.
5. Treat workflow boundaries as strict contracts: do only what the selected workflow is for.
6. For any bubble message payload (`reply`, `request-rework`, `ask-human`), use shell-safe message passing. Never inline raw text containing backticks or `$` directly in `--message "..."`.
7. For bubble creation, always include `--review-artifact-type <document|code>` in `pairflow bubble create`.
8. For implementation bubbles (`review_artifact_type=code`), `CloseBubble` includes mandatory post-merge completion: README/docs/progress check + required updates + task archival under `plans/archive/tasks/` with mirrored relative path.
9. In `ReviewBubble` outputs, every finding must include source label: `[Bubble]` (from bubble transcript/tool output, e.g. reviewer findings) or `[MetaReview]` (from meta-reviewer artifacts already present in bubble context).
10. `ReviewBubble` uses the surviving direct review contract only; do not expose or suggest any removed source-selection flag.
11. Hard rule: do not route `ReviewBubble` through `pairflow bubble meta-review *` read-model commands as an operator source-selection path.
12. Decision separation: `--decide approve|rework` controls lifecycle action only (`bubble approve` / `bubble request-rework`) and is independent from review content gathering.
13. Ideation lifecycle is explicit: if a bubble was created with `--ideation`, run `pairflow bubble kickoff` before any `pass`/`converged` loop command.
14. If runtime is unhealthy (agent pane unresponsive, tmux/session mismatch, token/login refresh needed), prefer `pairflow bubble restart --id <id> [--repo <path>]` over manual tmux kill/start steps.
15. Remote exception: if a started remote bubble reports runtime loss (`remoteExecution.pointerKind="started"` with runtime unavailable/missing), treat that fail-closed. Do not assume `bubble start` or `bubble restart` is the supported recovery contract on top of preserved remote state in this phase.
16. For remote bubble creation, use `pairflow bubble create --remote <host> ...`; execution still begins only at `bubble start`.
17. Remote attach is a separate operator step. `bubble attach` for remote bubbles uses the persisted started pointer plus optional `--port-forward`, not local tmux attach.
18. `RUNNING round=0` ideation state is a valid hold state. Do not auto-kickoff. Exception: if the user asks for a loop action (`pass`/`converged`) while still in round-0 ideation, run kickoff first because loop actions require an active round.
19. Pre-kickoff manual preparation in the bubble worktree is allowed when explicitly requested by the user. In this pattern, kickoff text should summarize already-applied work and define expected first handoff behavior.
20. `ReviewBubble` should explain findings in business-technical language by default, not just reviewer shorthand:
  - explain the technical issue,
  - explain why it matters in practical terms,
  - state whether it is blocking now or only future hardening debt.

## Execution Modes (Mandatory)

- Default execution mode for bubble-scoped requests is `bubble_autonomous`.
- `bubble_autonomous` mode:
  - Allowed: Pairflow lifecycle/protocol actions (`bubble ...`, `pass`, `ask-human`, `converged`) and state diagnostics.
  - Forbidden: direct feature implementation via manual file edits/tests as the primary execution path.
  - Exception: ideation pre-kickoff prep edits are allowed only when explicitly requested by the user; after kickoff, return to lifecycle/protocol-driven flow.
- `manual_assist` mode is allowed only with explicit user opt-in.
- Never silently switch from `bubble_autonomous` to `manual_assist`.
- If intent is ambiguous between modes, ask exactly one explicit clarification question before editing files.

## Workflow Scope Contract

- `CreateBubble` is **lifecycle-only**:
  - Allowed: pre-flight checks, `pairflow bubble create`, `pairflow bubble start`, `pairflow bubble kickoff`, `pairflow bubble status`.
  - Not allowed: reading/implementing/reviewing the feature/task content after bubble start.
- If the user asks only to start/create a bubble, stop immediately after reporting the started state.
- Any task execution inside the bubble must be a separate, explicit follow-up request.
- In `bubble_autonomous` mode, follow-up handling remains lifecycle/protocol-driven; do not replace it with direct edits.

## State-to-Action Map

- `CREATED` -> `pairflow bubble start`
- `RUNNING` with ideation pending (`round=0` and `[ideation].task_pending=true`) -> `pairflow bubble kickoff --id <id> (--task <text> | --task-file <path>)`
- `RUNNING` with ideation pending and no kickoff request yet -> hold in round-0; report status and wait for explicit kickoff decision
- `RUNNING` (active round, typically `round>=1`) -> no approve/rework yet; use normal loop commands (`pass`, `converged`) in agent panes
- Runtime-health issue in non-final active states (for example stalled pane, refreshed agent login/session) -> `pairflow bubble restart --id <id> [--repo <path>]`
- Remote started-pointer runtime loss (`remoteExecution.pointerKind="started"` with runtime unavailable/missing) -> inspect `pairflow bubble status --id <id> --repo <path> --json` or `pairflow bubble list --refresh`; report preserved-state fail-closed and do not imply that `start`/`restart` is already the supported recovery path
- `WAITING_HUMAN` -> use `pairflow bubble reply` (NOT `bubble request-rework`)
- `META_REVIEW_RUNNING` -> inspect `pairflow bubble status --id <id> --json`; if gate appears stuck or runtime is unhealthy, use `pairflow bubble restart --id <id> [--repo <path>]`
- `READY_FOR_HUMAN_APPROVAL` (legacy compatible: `READY_FOR_APPROVAL`) -> choose `pairflow bubble approve` OR `pairflow bubble request-rework`
  - `pairflow bubble approve` enforces override requirements from transcript context.
  - If approve fails with `APPROVAL_OVERRIDE_REQUIRED` or `APPROVAL_PARITY_OVERRIDE_REQUIRED`, rerun only with explicit human justification via `--override-non-approve --override-reason "<reason>"`.
- `APPROVED_FOR_COMMIT` -> `pairflow bubble commit --auto`
- `DONE` -> `pairflow bubble merge`
- `CANCELLED` with needed changes -> recovery workflow (manual git path from bubble worktree)

## Practical Guardrails

- Pre-flight before starting a bubble:
  - Start from clean `main` worktree.
  - Ensure no ongoing merge/rebase/cherry-pick.
  - If task file exists on `main`, commit it before bubble start.
  - Exception: if the only pre-flight blocker is that the selected task file is uncommitted (new or modified), auto-commit that task file without asking for approval, then continue bubble create/start.
  - This exception applies to both docs-only refinement bubbles and implementation bubbles when the task source is that file.
- Remote create/start guardrails:
  - `pairflow bubble create --remote <host>` configures a remote executor but does not touch the remote host yet.
  - Keep `bubble attach` as a separate explicit step after remote start; do not assume create/start should auto-attach.
  - Respect repository-specific bubble-create guardrails such as required `--bootstrap-command` when they are declared in the repo docs or AGENTS instructions.
- While a bubble is running, parallel direct commits on `main` are allowed only for file-disjoint scope (no overlap with the bubble's touched files).
- After `bubble start`, status may be briefly stale. Poll status once more before deciding it failed.
- If `--repo` lookup behaves unexpectedly, retry from repo root cwd and verify with `status --json`.
- Never start a second bubble for the same change while the first bubble still has unmerged code, unless intentionally abandoning and archiving that work.
- For message-bearing commands, always build the message via quoted heredoc, then pass as a variable. This prevents backtick/`$` shell expansion and quote breakage.
- Artifact type gate for create:
  - `pairflow bubble create` requires `--review-artifact-type`.
  - Use `document` for docs-only refinement/review/update bubbles.
  - Use `code` for implementation/testing/runtime behavior bubbles.
  - If intent is ambiguous, ask one explicit clarification question before create.
- Task input gate for create:
  - Provide exactly one of `--task`, `--task-file`, or `--ideation`.
  - `--ideation` cannot be combined with `--task` or `--task-file`.
  - If created with `--ideation`, run `bubble kickoff` before any `pass`/`converged`.
  - Do not auto-kickoff immediately after create/start unless the user explicitly asks for kickoff now.
- Bubble ID gate for create:
  - `pairflow bubble create --id <id>` accepts only `3-40` chars.
  - Pattern: start with lowercase letter, then lowercase letters, digits, `_` or `-`.
  - This validation is create-time only; do not block lifecycle operations for already existing bubbles that may have longer IDs.
- CloseBubble post-merge completion for `code` bubbles:
  - Determine whether `README.md`, relevant `docs/`, or progress tracker files must be updated based on merged behavior changes, then apply required updates.
  - Archive the completed task from `plans/tasks/...` into `plans/archive/tasks/...` while preserving subdirectory structure (`plans/tasks/FOO/x.md` -> `plans/archive/tasks/FOO/x.md`).

### Shell-safe message pattern (mandatory)

Use this pattern whenever text can contain backticks, `$`, quotes, or markdown:

```bash
msg=$(cat <<'MSG'
Issue details:
- Keep literal text like `previous reviewer clean PASS`
- Keep literal text like `round>=2`
- Keep literal text like $HOME unchanged
MSG
)
pairflow bubble reply --id <id> --message "$msg"
```

Also valid for rework:

```bash
msg=$(cat <<'MSG'
Please rework:
- Enforce most-recent-only overlap handling
- Add explicit round>=2 gate in Given
MSG
)
pairflow bubble request-rework --id <id> --message "$msg"
```

Do not use this with untrusted inline command substitution. The quoted heredoc (`<<'MSG'`) is the default safe route.

## Examples

**Example 1: Watchdog timeout in WAITING_HUMAN**

```
User: "bubble stuck, timeout happened"
-> status shows WAITING_HUMAN
-> build message via quoted heredoc, then `pairflow bubble reply --id <id> --message "$msg"`
```

**Example 2: Human wants rework but bubble is not in approval state**

```
If state is WAITING_HUMAN or RUNNING:
- do not use `bubble request-rework`
- route through `bubble reply` or continue normal reviewer->implementer pass flow
```

**Example 3: Deep approval review requested**

```
Use ReviewBubble (deep mode default)
-> direct Codex review from bubble worktree/task/transcript context
-> file-by-file changes
-> findings labeled by origin (`[Bubble]`, `[MetaReview]`)
-> findings explained in business-technical language by default
-> validation evidence summary
-> explicit approve/rework recommendation
```

**Example 6: Direct review invocation**

```
ReviewBubble --id <id> --mode deep --decide none
```

**Example 4: Cancelled bubble but work is valuable**

```
Use RecoverBubble workflow:
- commit on bubble branch from bubble worktree
- merge to main manually
- delete bubble artifacts
```

**Example 5: Bootstrap evidence planning**

```
Use BootstrapEvidence workflow:
- inspect project validation surface
- propose minimal evidence-generation plan
- provide handoff --ref pattern
```

**Example 7: Operator-ready manual test runbook**

```
Use TestBubble workflow:
- quick mode: critical smoke checks only (`--mode quick`)
- default mode: full recommended manual suite (`--mode default`)
- output must include fixtures, browser/session isolation, exact clicks, console commands, and GO/NO-GO rules
```

**Example 8: Preworked ideation kickoff**

```
User: "Create ideation bubble first; I'll decide kickoff later."
-> create + start only, keep RUNNING round=0 hold

Later user: "Apply these manual edits in bubble worktree, then kickoff."
-> perform requested pre-kickoff edits
-> kickoff with inline task summarizing completed edits
-> first loop step can be explicit validation/pass-to-reviewer
```
