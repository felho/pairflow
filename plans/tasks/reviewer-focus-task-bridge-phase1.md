---
artifact_type: task
artifact_id: task_reviewer_focus_task_bridge_phase1_v5
title: "Reviewer Focus Task-to-Protocol Bridge (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/core/bubble/createBubble.ts
  - src/core/bubble/startBubble.ts
  - src/core/agent/pass.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/core/reviewer/reviewerBrief.ts
  - docs/llm-doc-workflow-v1.md
  - tests/core/agent/pass.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/bubble/createBubble.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/reviewer/reviewerBrief.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer Focus Task-to-Protocol Bridge (Phase 1)

## L0 - Policy

### Goal

Make task-level `Reviewer Focus` deterministic at runtime by bridging it into reviewer protocol context (`reviewer-brief`) instead of relying on implicit reading behavior.

Primary outcomes:
1. Clear source-of-truth for Reviewer Focus extraction.
2. Deterministic bridge contract from task artifact -> reviewer brief context.
3. Explicit fallback/error behavior that preserves existing workflow safety.

### Problem Frame

Current behavior is insufficient because reviewer focus is currently implicit:
1. The reviewer may or may not pick up author intent from free-form task text.
2. There is no deterministic extraction contract (section ambiguity, frontmatter ambiguity, malformed layout).
3. There is no auditable reason code path when focus is absent/unreadable.

This creates avoidable review variance and weak implementability for review-policy dependent tasks.

### In Scope

1. Define and implement a deterministic extraction contract for Reviewer Focus from `task.md`.
2. Define and implement deterministic bridge payload contract into reviewer context.
3. Ensure startup prompt path includes bridged focus when available.
4. Keep behavior additive and backward-compatible when focus is missing or invalid.
5. Update workflow documentation to describe canonical authoring expectations.
6. Add tests for extraction, bridge, and fallback semantics.

### Out of Scope

1. Full reviewer prompt redesign.
2. New bubble lifecycle states or protocol envelope types.
3. New external parser dependency only for this feature.
4. Enforcing Reviewer Focus presence as a hard requirement for all tasks.

### Safety Defaults

1. Fail-open compatibility: if no valid Reviewer Focus is extracted, keep current reviewer flow unchanged.
2. Bridge is additive only; it must not override existing reviewer policy blocks.
3. Ambiguous/malformed inputs must be downgraded to deterministic fallback with reason code.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Affected boundaries:
   - task artifact parsing contract,
   - reviewer-brief composition contract,
   - reviewer startup context contract.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/createBubble.ts` | task parsing layer | `extractReviewerFocus(taskContent: string, frontmatter?: Record<string, unknown>) -> ReviewerFocusExtractionResult` | Deterministically resolve Reviewer Focus from canonical sources with reasoned status | P1 | required-now | T1,T2,T3,T4,T5,T6,T7,T8,T9,T10 |
| CS2 | `src/core/bubble/startBubble.ts` | reviewer startup assembly | `buildReviewerStartupPrompt(input: { bubbleId: string; repoPath: string; worktreePath: string; taskArtifactPath: string; reviewArtifactType: ReviewArtifactType; reviewerBriefText?: string; reviewerFocus?: ReviewerFocusExtractionResult; }) -> string` | Keep existing object-parameter shape; inject bridged focus via additive optional field without breaking current startup prompt API | P1 | required-now | T11,T12,T13 |
| CS3 | `src/core/reviewer/reviewerBrief.ts` | brief formatter compatibility | `formatReviewerBriefPrompt(brief: string) -> string` (unchanged) + optional additive helper `formatReviewerFocusBridgeBlock(focus: ReviewerFocusExtractionResult) -> string` | Preserve non-breaking public signature in Phase 1 while enabling deterministic focus block rendering | P1 | required-now | T14,T15 |
| CS4 | `docs/llm-doc-workflow-v1.md` | task authoring policy | `documentReviewerFocusAuthoringContract() -> markdown_delta` | Clarify canonical Reviewer Focus section and deterministic bridge expectations | P2 | required-now | T18 |
| CS5 | `src/core/agent/pass.ts` | reviewer handoff prompt context | `runPassCommand(...) -> EmitPassResult` (reviewer handoff path) | Reviewer handoff startup/resume reminder consumes the same canonical reviewer-focus bridge text semantics as startup path | P2 | later-hardening | T16 |
| CS6 | `src/core/runtime/tmuxDelivery.ts` | reviewer delivery action text | `buildDeliveryMessage(...) -> string` | Delivery reminder path stays consistent with reviewer-focus bridge semantics; no contradictory wording vs startup guidance | P2 | later-hardening | T17 |

#### 1a) Placement and Single-Parse Contract

1. CS1 extraction runs once at task-artifact read boundary in `createBubble`.
2. `startBubble` must consume the extraction result (or persisted equivalent metadata), not re-parse raw task markdown.
3. Any re-parse fallback path must emit `REVIEWER_FOCUS_PARSE_WARNING` and remain fail-open.
4. Reviewer handoff paths (`pass.ts`, `tmuxDelivery.ts`) must consume canonical bridge output text, not independently reinterpret task markdown.

### 2) Data and Interface Contract

#### 2.1 Extraction Source Precedence (Deterministic)

1. Source A (highest): frontmatter key `reviewer_focus` when it is a non-empty string or non-empty string list.
2. Source B: first Markdown heading (`##` or `###`) whose normalized heading text equals `reviewer focus`; normalized matcher is deterministic: trim, collapse internal whitespace runs to single spaces, then case-insensitive compare.
3. If both A and B are present, A wins and reason code `REVIEWER_FOCUS_FRONTMATTER_PRECEDENCE` is recorded at info level.
4. If multiple valid `Reviewer Focus` headings are found, first heading wins and warning reason code `REVIEWER_FOCUS_MULTIPLE_SECTIONS` is recorded.
5. Matcher operates on raw heading text after markdown heading marker removal only; inline markdown formatting tokens are not stripped.
6. Non-matching variants (for example `Reviewer Focus (Optional)` or `**Reviewer Focus**`) are not valid Source B matches.

#### 2.2 Canonical Runtime Shape

`ReviewerFocusExtractionResult` target shape:
1. `status`: `present | absent | invalid`
2. `focus_text`: normalized text (required when `status=present`)
3. `focus_items`: optional ordered list (if source is list-like)
4. `source`: `frontmatter | section | none`
5. `reason_code`: machine-readable reason (required for `absent/invalid`, optional otherwise)
6. Source-state rule:
   - `status=present` -> `source` must be `frontmatter` or `section` (never `none`),
   - `status=absent` -> `source=none`,
   - `status=invalid` -> `source` must identify offending source (`frontmatter` or `section`), never `none`.

#### 2.3 Normalization Rules

1. Trim leading/trailing whitespace.
2. Normalize line endings to `\n`.
3. Collapse repeated blank lines to max 1 blank separator.
4. Preserve item order for bullet/numbered lists.
5. Reject payload as `invalid` when normalized content is empty.
6. Frontmatter empty value handling:
   - empty string,
   - empty list,
   - list containing only empty/whitespace items,
   must map to `status=invalid`, `source=frontmatter`, reason `REVIEWER_FOCUS_EMPTY_FRONTMATTER`.
7. Mixed frontmatter list handling:
   - if at least one non-empty string item remains after normalization, extraction is `present` from `frontmatter`,
   - fully empty normalized list remains `invalid` (`REVIEWER_FOCUS_EMPTY_FRONTMATTER`).

#### 2.5 Frontmatter Parser Boundary Contract

1. Phase 1 must reuse existing frontmatter parse output (if available) and must not require a new dependency.
2. If frontmatter parsing itself fails, bridge must fail-open with `status=invalid`, `source=frontmatter`, reason `REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING`.
3. If frontmatter is not available in the current parse path, extraction continues with Source B and/or `absent` fallback without crashing startup.

#### 2.4 Compatibility Contract (CS3)

1. `formatReviewerBriefPrompt(brief: string)` is non-breaking and must remain valid in Phase 1.
2. Structured focus rendering must be introduced as additive helper/API, not as a breaking signature rewrite.
3. Any future breaking signature change requires separate task scope with migration plan.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Reviewer startup prompt | Add a dedicated `Reviewer Focus` block from bridge result | Duplicating block multiple times | exactly-once injection | P1 | required-now |
| Reviewer policy text | Additive context enrichment | Overwriting/removing existing mandatory reviewer guardrails | preserve baseline safety prompts | P1 | required-now |
| Task parsing behavior | Deterministic extraction from canonical sources | Heuristic extraction from arbitrary sections | avoid nondeterministic NLP matching | P1 | required-now |

Constraint: if no allowed runtime side effect applies, logic remains pure parsing/formatting.

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior (`throw|result|fallback`) | Fallback Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| No Reviewer Focus source found | task text/frontmatter | fallback | continue without bridge | REVIEWER_FOCUS_ABSENT | info | P1 | required-now |
| Both Source A and Source B present | frontmatter + markdown section | result | choose Source A deterministically | REVIEWER_FOCUS_FRONTMATTER_PRECEDENCE | info | P2 | required-now |
| Frontmatter key present but wrong type | frontmatter parser | fallback | treat as invalid, continue without bridge | REVIEWER_FOCUS_INVALID_FRONTMATTER_TYPE | warn | P1 | required-now |
| Frontmatter parse failure | frontmatter parser | fallback | treat as invalid, continue without bridge | REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING | warn | P1 | required-now |
| Frontmatter key present but empty after normalization | frontmatter parser | fallback | treat as invalid, continue without bridge | REVIEWER_FOCUS_EMPTY_FRONTMATTER | warn | P1 | required-now |
| Section heading present but body empty after normalization | markdown parser | fallback | treat as invalid, continue without bridge | REVIEWER_FOCUS_EMPTY_SECTION | warn | P1 | required-now |
| Multiple Reviewer Focus sections | markdown parser | result + warning | first section wins | REVIEWER_FOCUS_MULTIPLE_SECTIONS | warn | P2 | required-now |
| Unexpected non-frontmatter parse failure | parsing path | fallback | treat as absent (`source=none`) and continue without bridge | REVIEWER_FOCUS_PARSE_WARNING | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing task parsing and reviewer-brief mechanisms | P1 | required-now |
| must-use | existing frontmatter parser output only (fail-open if unavailable/failed) | P1 | required-now |
| must-not-use | new external dependency solely for Reviewer Focus parsing | P1 | required-now |
| must-not-use | parser-stack refactor or parser replacement in this phase | P2 | required-now |
| must-not-use | implicit heuristic extraction from arbitrary prose | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Frontmatter precedence | task has `reviewer_focus` + section | extraction runs | frontmatter selected with precedence reason code and `source=frontmatter` | P1 | required-now | automated test |
| T2 | Section heading match normalization | heading text has case/space variation (still canonical) | extraction runs | section recognized as valid Source B match | P2 | required-now | automated test |
| T3 | Section extraction | no frontmatter key, valid section exists | extraction runs | section content extracted as `present` with `source=section` | P1 | required-now | automated test |
| T4 | Absent focus | no frontmatter key, no section | extraction runs | status=`absent`, `source=none`, default flow unchanged | P1 | required-now | automated test |
| T5 | Invalid frontmatter type | frontmatter key exists with non-string/non-list type | extraction runs | status=`invalid`, `source=frontmatter`, reason `REVIEWER_FOCUS_INVALID_FRONTMATTER_TYPE` | P1 | required-now | automated test |
| T6 | Frontmatter parse warning path | frontmatter parser fails | extraction runs | status=`invalid`, `source=frontmatter`, reason `REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING` | P1 | required-now | automated test |
| T7 | Invalid empty frontmatter | frontmatter key exists but empty string/list | extraction runs | status=`invalid`, `source=frontmatter`, reason `REVIEWER_FOCUS_EMPTY_FRONTMATTER` | P1 | required-now | automated test |
| T8 | Invalid section | heading exists but empty/whitespace body | extraction runs | status=`invalid`, `source=section`, reason `REVIEWER_FOCUS_EMPTY_SECTION` | P1 | required-now | automated test |
| T9 | Multiple sections warning path | two valid `Reviewer Focus` sections exist | extraction runs | first wins, warning reason `REVIEWER_FOCUS_MULTIPLE_SECTIONS` | P2 | required-now | automated test |
| T10 | Parser failure warning path | non-frontmatter parser throws unexpected error | extraction runs | fallback with `status=absent`, `source=none`, reason `REVIEWER_FOCUS_PARSE_WARNING` | P1 | required-now | automated test |
| T11 | Startup injection positive path | bridge status=`present` | startup prompt build | prompt includes canonical `Reviewer Focus` block exactly once | P1 | required-now | automated test |
| T12 | Startup injection negative path (absent) | bridge status=`absent` | startup prompt build | no `Reviewer Focus` block injected | P1 | required-now | automated test |
| T13 | Startup injection negative path (invalid) | bridge status=`invalid` | startup prompt build | no `Reviewer Focus` block injected | P1 | required-now | automated test |
| T14 | CS3 compatibility | existing callers pass `brief: string` | formatter call | no compile/runtime contract break on `formatReviewerBriefPrompt` | P1 | required-now | automated test |
| T15 | Brief formatting stability | focus list input | brief formatting runs | stable heading, order preserved, normalized spacing | P2 | required-now | automated test |
| T16 | pass.ts consumer parity | reviewer handoff path consumes bridge-aligned reminder semantics | reviewer pass handoff runs | startup and handoff guidance remain semantically consistent | P2 | later-hardening | automated test |
| T17 | tmuxDelivery consumer parity | delivery action text includes reviewer-focus reminder path | delivery notification generated | no contradictory reviewer-focus wording vs startup contract | P2 | later-hardening | automated test |
| T18 | Workflow docs alignment | docs updated | policy review | authoring contract states canonical `Reviewer Focus` section semantics | P3 | required-now | doc diff |

## Acceptance Criteria (Binary)

1. AC1: Extraction precedence between frontmatter and section is explicitly defined and implemented.
2. AC2: A canonical runtime shape exists for extraction result with status/source/reason semantics.
3. AC3: Startup reviewer context injects `Reviewer Focus` only for `status=present`, and explicitly does not inject for `absent/invalid`.
4. AC4: Missing/invalid focus input never breaks bubble start; fallback keeps current behavior.
5. AC5: All section 4 reason codes are explicit and test-covered (`ABSENT`, `FRONTMATTER_PRECEDENCE`, `INVALID_FRONTMATTER_TYPE`, `FRONTMATTER_PARSE_WARNING`, `EMPTY_FRONTMATTER`, `EMPTY_SECTION`, `MULTIPLE_SECTIONS`, `PARSE_WARNING`).
6. AC6: Task authoring guidance documents canonical `Reviewer Focus` authoring expectations.
7. AC7: CS3 remains non-breaking in Phase 1 (`formatReviewerBriefPrompt(brief: string)` preserved).
8. AC8: Heading matcher semantics are deterministic and unambiguous (including inline markdown formatting behavior).

## AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T1,T3 |
| AC2 | T1,T3,T4,T5,T6,T7,T8,T10 |
| AC3 | T11,T12,T13 |
| AC4 | T4,T5,T6,T7,T8,T10 |
| AC5 | T1,T4,T5,T6,T7,T8,T9,T10 |
| AC6 | T18 |
| AC7 | T14 |
| AC8 | T2 |

### AC-Test Coverage Note

1. `T15`, `T16`, and `T17` are intentional non-AC hardening tests (formatting stability and consumer-parity regression guards).
2. All test IDs now have explicit traceability intent: AC-mapped (`T1..T14`, `T18`) or non-AC hardening (`T15..T17`).

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add structured `focus_tags` extraction if explicit tag grammar is introduced later.
2. [later-hardening] Consider exposing bridge status in `pairflow bubble status --json` for observability.
3. [later-hardening] Add docs linter rule for canonical `Reviewer Focus` section format.

## Spec Lock

Task is `IMPLEMENTABLE` when all are true:
1. Extraction precedence and runtime shape are deterministic and documented.
2. Fallback contract is explicit with reason codes and backward-compatible behavior.
3. Startup/brief injection behavior is single-source and non-duplicative.
4. CS3 contract remains non-breaking for existing `formatReviewerBriefPrompt(brief: string)` call sites.
5. Acceptance criteria map to concrete tests without unresolved ambiguity.
