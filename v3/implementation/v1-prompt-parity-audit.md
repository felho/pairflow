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

## 7. Addendum — the ch13 boundary walk (2026-08-13; discharges plan §1.3 carried item 3)

The obligation: before the plan sequences the chapters that follow ch13,
walk the post-cut and late-Block-A layers against this audit and record,
per layer, whether v1-workflow replication needs it EARLIER than the cut
("build until local WF-7 runs", `approach.md`) implies. Walked at the
ch13 boundary; every claim was source-cited at execution (the boundary
session's walk record); the per-layer verdicts:

| Layer (state) | Needs it earlier if target = v1-replacement? | Ground |
|---|---|---|
| **EC** emit-contract (post-cut; 11/12 units pending in `unitMap.json` — the tripwire holds) | **YES** — a real actor's malformed/empty payload is ACCEPTED today (no payload validation, no verify-gate family); a swapped-in v3 would be weaker than v1 exactly where v1 mechanizes discipline. For the WF-7 target: NO | this audit §4/§5; `approach.md` "the last v1-parity gap" |
| **L5** Help (post-cut; 11 units pending) | **PARTIAL** — needed for full local v1 parity by the model's own sentence, but ZERO prompt-parity evidence (none of the 37 v1 concerns is a help instruction) | `approach.md` L5 note |
| **L3** human decision (PRE-cut; 18 units pending; **no chapter**) | NO — it is inside the cut. But it is the largest unbuilt pre-cut slice and no chapter owns it | audit silent; cut definition |
| **L4** child workflows (PRE-cut; 14 units pending; **no chapter**) | NO — cut-defining, same gap: no chapter | audit silent |
| **LC3a** workflow actions (pre-cut; 11 pending) | NO — but an L3 chapter without LC3a leaves approve→commit→merge half-manual; sequence adjacent | L3's `commit_pending` deferral note |
| **LC1/LC2/LC3b/LC4, L0f, L0g** (pre-cut) | NO for each — audit-silent, no actor-facing content | — |
| **L2b declared Absents** (computed/templated bodies; the phase axis; conditional bodies — NO level, NO candidate) | **YES** for v1-replacement — 4 of the audit's Class-B concerns need computed bodies, the startup-vs-resume axis has no v3 counterpart; a v1-replacement template must hardcode config-derived values into static prose, which silently lies after a config bump (the shipped caveat's exact hazard). IF v1-replacement becomes a target, these route to the MODEL PLANE for leveling first ("no Absent is speculatively implemented" — plan §1.4); no plan candidate may precede that act | this audit §2/§3 |

**The system-level vs workflow-level split (the owner's 2026-07-26
sub-question, answered).** Workflow-level prose (role instructions,
severity/decision rubrics, gate-rule communication) is correctly
template-carried by the ch13 catalog. THREE system-level instructions
survive kernel-design erasure, with their carriers:

1. **The packet-read bootstrap** ("your packet is at `$PAIRFLOW_PACKET`
   — read it"): only ADAPTER-SIDE shaping can carry it — a block inside
   the packet cannot bootstrap reading the packet, and the adapter
   already owns the transport (it defines both env names,
   `actorAdapter.ts`). Today it is supplied BY HAND per invocation.
2. **The emit envelope** (write ONE `{type, payload}` JSON to
   `$PAIRFLOW_EMIT`; malformed = silent no-output; well-formed may
   still be rejected): the recorded retirement plan (EC's
   `op_contracts` supersedes the interim block) has a GAP — the
   projection carries per-op SHAPE, not the file-transport MECHANICS.
   Retiring the interim block on EC alone reopens §5 in a narrower
   form. The EC chapter's ratification MUST therefore decide the
   transport carrier: adapter-side shaping (implementation-plane
   Absent-narrowing) or a kernel-injected default block (a MODEL-PLANE
   act — not modeled today). Bound into the plan's EC candidate row.
3. **Per-op payload contracts**: EC's designed, modeled projection —
   covered, no debate.

**THE STAKE MEASUREMENT (carried here so the EC chapter's transport
decision never re-derives it).** Today a from-scratch template admits
CLEANLY with zero catalog and zero refs — the ref check proves
resolution, not presence, and only the SHIPPED template's entry
presence is pinned. Its dispatched packet carries `availableOps` but no
emit instruction; an actor that does not guess the envelope writes no
emit file, which the system reads as producing NO OUTPUT AT ALL —
silently, with nothing to correct. The instance sits dispatched
indefinitely; NO admission-time or run-time signal tells the author an
instruction was missing. The knowledge is back outside the system —
§5's finding, re-created per new template. This sentence is the stake
of the EC transport-carrier decision.

**Sequencing read (recorded, not enacted — chapter entry stays the
owner's explicit act):** no re-cut is warranted (a mis-drawn cut would
be a model-plane divergence-stop matter, and the walk found none); the
cut's own critical path is L3 + L4 (chapters missing); EC is the first
post-cut chapter with audit-evidenced actor-facing need; ch10
(recourse card) is audit-silent — no evidence moves it either way.
