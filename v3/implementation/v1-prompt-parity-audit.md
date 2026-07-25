# V1 prompt-parity audit — what carries an actor's instructions, and where it lands in v3

**Measured 2026-07-25** against v1 `HEAD` and the v3 tree at the ch9 close.
Status: REFERENCE. Not a plan surface, not a ratified contract — a measurement
a later session re-runs rather than trusts (method in §6).

**Why this exists.** The v3 L2b layer renders `context_blocks` into the
dispatched packet, and it is tempting to read that as "v3 assembles the actor's
prompt". This audit measures what v1 actually puts in front of an agent, splits
it by kind, and maps each kind to the v3 mechanism that carries it. The finding
that motivated the write-up: **L2b carries roughly one-seventh of it, by
design** — the rest belongs to packet fields, to the emit contract (EC), or to
capabilities the model explicitly defers.

---

## 1. V1 already has this mechanism

`src/v11/shared/role/prompts/rolePromptConcerns.ts` implements exactly the
pattern the v3 model calls `prompt_concern_refs`:

- `PromptConcernId` — a closed union of **37 ids**
  (`rolePromptConcernTypes.ts`).
- `promptConcernCatalog` — id → builder function
  (`rolePromptConcerns.ts`).
- **Six ordered ref lists** — role × phase
  (`implementer | reviewer | meta_reviewer` × `startup | resume`), in
  `rolePromptConcernIds.ts`. The reviewer-startup list holds 18 ids.
- `buildRolePromptConcernLines()` renders the list to flat lines, dropping
  builders that return `undefined`.

So the v3 ref-list idea is not novel; it is the descendant of a working v1
mechanism. Two v1 axes have **no v3 L2b counterpart**: the phase axis
(startup vs resume) and conditional bodies (a concern that renders nothing
when its input is absent — L2b selects by the authority predicate only).

## 2. The three classes

Every one of the 37 ids falls into exactly one class. The class is what
decides which v3 mechanism should carry it.

### Class A — Pairflow protocol ("how to behave as an agent in here") — 11

`pairflow_command_guidance` · `canonical_actor_emit_lookup_guidance` ·
`implementer_emit_handoff_contract` · `reviewer_canonical_command_gate_lines` ·
`reviewer_findings_pass_instruction` · `reviewer_no_manual_state_edits` ·
`meta_review_submit_command_template` ·
`meta_review_submit_approve_parity_note` ·
`meta_review_no_manual_state_edits` · `launch_workspace_command_scope_line` ·
`done_package_update_contract`

These exist because v1 drives agents through tmux panes with typed CLI
commands. Representative content: which `pairflow` binary resolves and from
where; re-fetch `handoffId` + `executionId` from `status --json` **before every
emit** because authority changes after each handoff; the exact
`pairflow agent emit --kind pass …` command form with `<repo>` / `<id>` /
`<handoff-id>` / `<execution-id>` placeholders the agent must fill itself;
never hand-edit transcript/inbox/state files.

### Class B — Role judgment content — 9

`reviewer_severity_ontology_reminder` · `reviewer_decision_matrix_reminder` ·
`reviewer_scout_expansion_workflow_guidance` ·
`reviewer_pass_output_contract_guidance` · `reviewer_test_execution_directive` ·
`reviewer_agent_selection_guidance` ·
`document_primary_artifact_reviewer_guardrail` ·
`implementer_evidence_handoff_guidance` ·
`meta_review_finding_severity_contract`

Authored domain prose: what P0–P3 mean and what evidence each severity
requires (generated into TS from `docs/reviewer-severity-ontology.md` at build
time); the decision matrix; the scout-expansion workflow; the PASS output
contract; the document-scope guardrail.

### Class C — Run-instance data rendered as prose — 17

`repository_launch_workspace_line` · `repo_launch_workspace_task_line` ·
`resume_state_context_line` · `transcript_context_line` ·
`kickoff_diagnostic_line` · `implementer_start_activation_contract` ·
`implementer_resume_artifact_context` · `implementer_resume_role_instruction` ·
`reviewer_start_activation_contract` · `reviewer_resume_artifact_context` ·
`reviewer_resume_role_instruction` · `reviewer_policy_snapshot_contract` ·
`reviewer_brief_overlay` · `reviewer_focus_bridge_overlay` ·
`meta_reviewer_idle_contract` · `meta_reviewer_task_artifact_context` ·
`meta_reviewer_resume_activation_contract`

Not instructions at all — instance state and paths flattened into sentences
("Pairflow reviewer start for bubble X.", "Task: <path>.", the state snapshot,
the transcript summary).

## 3. Static vs computed bodies

Counted mechanically over the catalog's builder signatures (§6):

| Body kind | Count | Class split |
|---|---|---|
| Static (builder takes no input) | 10 | A: 6 · B: 4 · C: 0 |
| Phase-only (two static variants) | 1 | B: 1 |
| Computed (needs run or config input) | 26 | A: 5 · B: 4 · C: 17 |

Computed inputs in use: `bubbleId`, `repoPath`, `workspacePath`,
`pairflowCommandProfile`, `taskArtifactPath`, `reviewArtifactType`,
`reviewerBlockingMinSeverity`, `policySnapshotPathAbs`, `kickoffDiagnostic`,
`reviewerTestDirectiveLine`, `reviewerBriefText`, `reviewerFocus`,
`validationCommands`, plus the resume-side state snapshot and transcript
summary.

**This is the load-bearing number for L2b.** An L2b block body is authored
static text in the template catalog; computed/templated bodies and conditional
bodies are declared Absents. Of v1's 37 concerns, **11 have a body an L2b
catalog can hold as-is**.

## 4. Where each class lands in v3

| v1 class | v3 carrier | State at the ch9 close |
|---|---|---|
| C — run-instance data (17) | **ContextPacket fields** — `instanceId`, `task`, `role`, `instruction`, `availableOps`, `effectiveAgentConfig`, `runtimeContext` projection | **realized** (ch4/ch11/ch12) |
| A — protocol (11) | **Mechanized, not prose.** The adapter's `PAIRFLOW_PACKET` / `PAIRFLOW_EMIT` env pair replaces "which CLI, where, with which ids"; the model's EC layer pushes `op_contracts` (per offerable op: required fields, domains, assertions, evidence obligations) into the packet | env pair **realized** (ch9, `v3/src/runner/actorAdapter.ts`); **EC unrealized** (1/12 units, after the MVP cut) |
| B — role judgment (9) | **L2b `context_blocks`** — 4 static + 1 phase-only fit the catalog directly; 4 are computed from config and need computed bodies | L2b **unrealized** (0/4 units); computed bodies are a declared L2b Absent |

The v3 kernel deliberately erases part of class A rather than porting it: an
actor that writes one emit file cannot hand-edit state, and does not chase
authority ids across a CLI.

## 5. The open gap

**No v3 surface tells a real actor the emit envelope shape today.** The packet
carries `availableOps` (which ops exist) but not how to emit them; `op_contracts`
is EC's, and EC is unbuilt. Evidence: in the ch9 dogfooding checkpoint
(2026-07-25) the tier-2 real-LLM leg ran codex as the actor through the shipped
`--actor-cmd` + `--env-allow HOME`, and that knowledge was supplied by hand in
the invocation. The process-log entry records the run, not the prompt text —
the absence is itself the datapoint: **this instruction lives outside the
system.**

An L2b catalog block is a legitimate interim carrier for it (static authored
prose — the class the catalog holds cleanly), retired when EC lands.

## 6. Method — how to re-run this

1. Ids and lists: `src/v11/shared/role/prompts/rolePromptConcernTypes.ts`
   (the `PromptConcernId` union), `rolePromptConcernIds.ts` (the six ordered
   lists), `rolePromptConcerns.ts` (the catalog + `buildRolePromptConcernLines`).
2. Static-vs-computed split: parse the `promptConcernCatalog` object literal and
   bucket entries by whether the builder's parameter list is empty. Entry count
   must equal the union's member count (37 at measurement time) — a mismatch
   means the audit is stale.
3. v3 packet fields: `v3/src/domain/dispatch.ts` (`ContextPacket`) and
   `v3/src/kernel/dispatchIntent.ts` (what dispatch fills).
4. v3 actor hand-off: `v3/src/runner/actorAdapter.ts` — the
   `PAIRFLOW_PACKET` / `PAIRFLOW_EMIT` env pair and the canonical `packet.json`
   write.
5. Layer realization state: `pnpm v3:coverage`, then bucket the packets'
   `ledger_slice` unit ids by their `<section>/` prefix.

The class assignment in §2 is a judgment call, not a machine output; a re-run
that disagrees on a specific id should say so rather than silently re-bucket.
