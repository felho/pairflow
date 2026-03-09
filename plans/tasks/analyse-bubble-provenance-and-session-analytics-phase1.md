---
artifact_type: task
artifact_id: task_analyse_bubble_provenance_and_session_analytics_phase1_v1
title: "AnalyseBubble - Provenance Persistence and Session Analytics (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/types/archive.ts
  - src/core/archive/archiveSnapshot.ts
  - src/core/archive/archiveIndex.ts
  - src/core/bubble/deleteBubble.ts
  - src/core/runtime/sessionsRegistry.ts
  - src/core/provenance/sessionLinking.ts
  - src/core/provenance/provenanceStore.ts
  - src/core/bubble/provenanceReport.ts
  - src/core/bubble/analyseBubble.ts
  - src/cli/commands/bubble/provenance.ts
  - src/cli/commands/bubble/analyze.ts
  - src/cli/index.ts
  - tests/core/archive/archiveSnapshot.test.ts
  - tests/core/archive/archiveIndex.test.ts
  - tests/core/provenance/sessionLinking.test.ts
  - tests/core/bubble/provenanceReport.test.ts
  - tests/core/bubble/analyseBubble.test.ts
  - tests/cli/bubbleProvenanceCommand.test.ts
  - tests/cli/bubbleAnalyzeCommand.test.ts
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/AnalyseBubble.md
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - docs/bubble-metrics-archive-strategy.md
  - docs/review-loop-optimization.md
owners:
  - "felho"
---

# Task: AnalyseBubble - Provenance Persistence and Session Analytics (Phase 1)

## L0 - Policy

### Goal

Enable reliable post-hoc bubble analysis by making agent-session provenance first-class and archived.

Primary outcomes:
1. Codex/Claude session linkage is persisted in machine-readable provenance records.
2. Provenance survives bubble delete and is queryable from central archive.
3. A dedicated CLI command returns provenance quickly for active and archived bubbles.
4. A deterministic `AnalyseBubble` analysis path can score workflow quality and efficiency without mandatory LLM usage.

### Problem Frame

Current archive scope preserves core bubble files, but does not persist agent-session IDs/links explicitly.
That blocks fast, deterministic mapping from bubble history to real coding-agent sessions, and makes advanced analysis expensive and manual.

### In Scope

1. Define canonical provenance schema for agent session linkage (`codex`, `claude`).
2. Persist provenance during runtime for active bubbles.
3. Include provenance in archive snapshot during delete.
4. Add `pairflow bubble provenance` subcommand for active+archived lookup.
5. Add deterministic analysis service/CLI surface (`AnalyseBubble`) driven by transcript/state/provenance.
6. Add skill workflow contract under `UsePairflow` for `AnalyseBubble`.

### Out of Scope

1. Retroactive perfect backfill for all historical bubbles.
2. Mandatory LLM-driven analysis as baseline behavior.
3. Provider-specific deep parsing beyond minimal stable fields in Phase 1.
4. UI visualization of full analytics dashboard (CLI-first in this phase).

### Safety Defaults

1. If external session-ID resolution is unavailable, persist deterministic fallback with explicit confidence + reason code.
2. No delete path may drop already-captured provenance metadata.
3. Analysis must remain deterministic and runnable offline from local files.
4. Provenance read failures must degrade gracefully, never block core lifecycle commands.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Affected boundaries:
   - runtime session/provenance persistence contract,
   - archive snapshot/index data contract,
   - bubble CLI surface (`provenance`, `analyze`),
   - UsePairflow workflow routing (`AnalyseBubble`).

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/core/provenance/sessionLinking.ts` | provider linkage resolver | Resolve best-effort Codex/Claude session references from runtime/worktree/time context with confidence grading | P1 | required-now | T1,T2,T3,T4 |
| CS2 | `src/core/provenance/provenanceStore.ts` | provenance persistence | Persist per-bubble provenance snapshot with deterministic schema and reason codes | P1 | required-now | T5,T6 |
| CS3 | `src/core/bubble/deleteBubble.ts` + `src/core/archive/archiveSnapshot.ts` | delete->archive bridge | Include provenance artifact in archived snapshot when available; never silently drop it | P1 | required-now | T7,T8 |
| CS4 | `src/types/archive.ts` + `src/core/archive/archiveIndex.ts` | archive metadata extension | Add minimal provenance availability metadata into archive index/manifest contracts | P2 | required-now | T9 |
| CS5 | `src/core/bubble/provenanceReport.ts` + `src/cli/commands/bubble/provenance.ts` | provenance query command | `pairflow bubble provenance --id <id>` returns active/archive provenance in table/json modes | P1 | required-now | T10,T11,T12 |
| CS6 | `src/core/bubble/analyseBubble.ts` + `src/cli/commands/bubble/analyze.ts` | deterministic analytics | Produce scorecard: role adherence, round efficiency, code-vs-LLM opportunities, flow-logic notes | P1 | required-now | T13,T14,T15 |
| CS7 | `.claude/skills/UsePairflow/SKILL.md` + `Workflows/AnalyseBubble.md` | skill routing | Add explicit `AnalyseBubble` workflow contract and command sequence expectations | P2 | required-now | T16 |

### 2) Data and Interface Contract

#### 2.1 Provenance Record Shape

`provenance.json` (active + archived) minimum fields:
1. `schema_version`
2. `bubble_id`
3. `bubble_instance_id`
4. `repo_path`
5. `worktree_path`
6. `tmux_session_name` (if available)
7. `agents[]` with entries:
   - `role`: `implementer | reviewer`
   - `agent`: `codex | claude`
   - `provider_session_id`: `string | null`
   - `provider_session_path`: `string | null`
   - `confidence`: `strong | probable | weak | missing`
   - `reason_code`: nullable machine-readable code
   - `updated_at`
8. `sources[]` summary for traceability (runtime registry, transcript-derived hints, provider logs).

#### 2.2 Confidence Contract

1. `strong`: explicit provider session ID match from provider session metadata.
2. `probable`: strong path/time correlation without explicit provider session ID.
3. `weak`: indirect inference only (for example actor + timestamp window overlap).
4. `missing`: no usable linkage found.

#### 2.3 Archive Contract

1. Archive snapshot must copy `artifacts/provenance.json` when present.
2. Missing provenance file is allowed only with explicit reason code (`PROVENANCE_NOT_AVAILABLE`) in query output.
3. Archive index/manifest should expose whether provenance artifact exists to support fast filtering.

#### 2.4 CLI Contract

1. `pairflow bubble provenance --id <id>`:
   - default: human-readable table
   - `--json`: machine output
   - `--archived`: force archived source lookup first
2. Command must support:
   - active bubble provenance lookup,
   - archived bubble provenance lookup by `bubble_id` and/or `bubble_instance_id`,
   - deterministic missing-state diagnostics with reason codes.

#### 2.5 AnalyseBubble Contract

`pairflow bubble analyze --id <id>` output sections:
1. `Role Adherence`: did actor outputs match assigned responsibilities.
2. `Flow Logic`: sequencing quality (e.g., meta-review/reviewer interactions).
3. `Efficiency`: rounds, churn, repeated findings, watchdog interruptions.
4. `Token/Time Optimization Opportunities`: rule-based suggestions where code automation could replace repetitive LLM work.
5. `Provenance Confidence`: `strong|partial|missing` summary from session linkage coverage.

Baseline implementation must be deterministic code; optional LLM enrichment is later-hardening only.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Runtime provenance store | write/update `artifacts/provenance.json` | blocking normal lifecycle on provider-log read failure | fail-open with reason codes | P1 | required-now |
| Delete/archive path | copy provenance artifact | deleting provenance before archive copy | archive-first guarantee | P1 | required-now |
| CLI read path | active+archive provenance inspection | mutating lifecycle state | read-only | P1 | required-now |
| Analysis path | deterministic scorecard generation | requiring online services | local-first/offline | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Behavior | Fallback Action | Reason Code | Priority | Timing |
|---|---|---|---|---|---|
| Provider session logs unavailable | fallback | keep provenance with `confidence=missing` | `PROVENANCE_SOURCE_UNAVAILABLE` | P1 | required-now |
| Provider session ID absent but path/time match exists | result | store probable linkage | `PROVENANCE_ID_NOT_FOUND_PATH_MATCH` | P2 | required-now |
| Provenance file missing for active bubble | fallback | synthesize minimal runtime provenance view | `PROVENANCE_FILE_MISSING_ACTIVE` | P1 | required-now |
| Provenance file missing for archived bubble | fallback | return diagnostics, no hard failure | `PROVENANCE_FILE_MISSING_ARCHIVE` | P1 | required-now |
| Multiple archived matches by `bubble_id` | result+warning | require/select latest by `updated_at` unless explicit instance requested | `PROVENANCE_AMBIGUOUS_BUBBLE_ID` | P2 | required-now |
| Analysis input incomplete | fallback | produce partial report with missing sections flagged | `ANALYZE_PARTIAL_INPUT` | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing archive snapshot/index infrastructure | P1 | required-now |
| must-use | existing transcript/state/runtime session registry files | P1 | required-now |
| must-use | deterministic, code-based analyzers for baseline | P1 | required-now |
| must-not-use | mandatory external API/network dependency for provenance | P1 | required-now |
| must-not-use | delete-time best-effort that can lose provenance silently | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | Codex strong linkage | explicit provider session ID available | linker runs | `confidence=strong` + ID persisted | P1 | required-now |
| T2 | Claude probable linkage | no ID, but deterministic path/time match | linker runs | `confidence=probable` + reason code | P1 | required-now |
| T3 | Missing sources | provider logs unavailable | linker runs | `confidence=missing`, no crash | P1 | required-now |
| T4 | Multi-candidate tie-break | multiple candidates | linker runs | deterministic winner + ambiguity marker | P2 | required-now |
| T5 | Runtime provenance write | active bubble runtime exists | update runs | `artifacts/provenance.json` written | P1 | required-now |
| T6 | Schema validation | malformed provenance payload | persist/read | deterministic validation error path | P1 | required-now |
| T7 | Archive copy present | provenance exists before delete | delete/archive | archive contains provenance artifact | P1 | required-now |
| T8 | Archive copy missing | provenance absent before delete | delete/archive | delete succeeds + explicit missing reason on query | P1 | required-now |
| T9 | Archive metadata exposure | archived provenance present | index/manifest read | availability metadata is queryable | P2 | required-now |
| T10 | CLI provenance active | active bubble selected | command runs | table/json outputs with linkage confidence | P1 | required-now |
| T11 | CLI provenance archived | archived bubble selected | command runs | archive provenance returned deterministically | P1 | required-now |
| T12 | CLI provenance ambiguous bubble_id | multiple archived instances | command runs | deterministic latest-or-instance behavior | P2 | required-now |
| T13 | Analysis scorecard generation | transcript+state+provenance available | analyze runs | all report sections populated | P1 | required-now |
| T14 | Analysis partial mode | missing provenance/session info | analyze runs | partial report + explicit missing markers | P2 | required-now |
| T15 | Code-first optimization hints | repetitive transcript patterns present | analyze runs | rule-based optimization suggestions emitted | P2 | required-now |
| T16 | Skill workflow routing | user asks for AnalyseBubble | skill routing executed | `UsePairflow` selects `AnalyseBubble` workflow | P2 | required-now |

## Acceptance Criteria (Binary)

1. AC1: Canonical provenance schema exists and is persisted for active bubbles.
2. AC2: Delete/archive flow preserves provenance artifact when available.
3. AC3: Provenance lookup command works for both active and archived bubbles.
4. AC4: Session linkage confidence + reason codes are deterministic and test-covered.
5. AC5: Deterministic `analyze` command outputs role/flow/efficiency/optimization sections.
6. AC6: Missing provenance/sources never blocks lifecycle; fallback diagnostics are explicit.
7. AC7: UsePairflow skill includes an explicit `AnalyseBubble` workflow contract.

## AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T1,T2,T3,T5,T6 |
| AC2 | T7,T8 |
| AC3 | T10,T11,T12 |
| AC4 | T1,T2,T3,T4,T6 |
| AC5 | T13,T14,T15 |
| AC6 | T3,T8,T14 |
| AC7 | T16 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add optional LLM enrichment mode for narrative analysis (`--llm-notes`) behind explicit opt-in.
2. [later-hardening] Add UI panel for provenance confidence and analyze scorecard.
3. [later-hardening] Add historical backfill utility to infer provenance for old archives.

## Spec Lock

Task is `IMPLEMENTABLE` when all are true:
1. Provenance schema and persistence points are deterministic.
2. Delete/archive flow explicitly preserves provenance artifact semantics.
3. CLI provenance and analysis contracts are defined with fallback behavior.
4. Session-link confidence model is defined and test-mapped.
5. Skill workflow routing for `AnalyseBubble` is explicitly documented.

