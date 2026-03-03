# Task: Reviewer Brief Injection + Accuracy Gate Enforcement (Phase 1)

## Goal

Ship a practical Phase 1 implementation that makes reviewer guidance explicit and enforceable for accuracy-critical bubbles, without changing default behavior for existing workflows.

Primary outcomes:
1. Reviewer receives a dedicated, persisted brief artifact.
2. Accuracy-critical mode enforces a deterministic reviewer verification payload.
3. Convergence is blocked when required review verification data is missing or invalid.

## Problem

The current flow can converge with factual drift when reviewer expectations are implicit. Task wording alone is not reliable enough for high-stakes documentation accuracy.

Current gaps:
1. Reviewer brief is not a first-class persisted artifact.
2. Reviewer verification output is not deterministic and machine-checkable.
3. Accuracy-critical intent is not enforced by runtime gates.

## Scope Boundaries

### In Scope (Required)

1. Bubble create inputs (Phase 1 minimum):
   - `--reviewer-brief <text>`
   - `--reviewer-brief-file <path>`
   - `--accuracy-critical`
   - if `--accuracy-critical` is set, reviewer brief input is mandatory (inline or file)
2. Artifact persistence under `.pairflow/bubbles/<id>/artifacts/`:
   - `task.md` (existing)
   - `reviewer-brief.md` (new, optional)
   - `review-verification.json` (new, generated per reviewer PASS)
3. Reviewer prompt injection surfaces:
   - startup,
   - resume,
   - implementer -> reviewer handoff,
   - fresh reviewer respawn rounds.
4. Deterministic reviewer verification payload contract (`review_verification_v1`) accepted from reviewer PASS input.
5. Explicit payload transport contract using existing reviewer PASS refs:
   - reviewer attaches a JSON file via `pairflow pass --ref <path>`,
   - canonical input filename for parser lookup: `review-verification-input.json`,
   - in `accuracy-critical` mode, PASS is rejected if no matching valid payload ref is found.
6. Accuracy-critical convergence gate:
   - reject reviewer PASS if verification payload is missing/invalid,
   - reject `pairflow converged` when latest reviewer verification is not passing.
7. Status diagnostics in `pairflow bubble status --json` to explain gate failures.
8. Automated tests for persistence, prompt injection, payload validation, and convergence gating.

### Out of Scope (Do Not Implement in This Task)

1. Implementer brief channel.
2. General `review-contract` schema and claim-template engine.
3. Admin override path (for example `--override-review-gate`).
4. UI editing for reviewer briefs/contracts.
5. Protocol-wide replacement of existing finding format.

## Naming and Terminology Contract

Use these exact terms consistently in code, docs, and status payloads:
1. `reviewer-brief` (CLI input concept)
2. `reviewer-brief.md` (artifact filename)
3. `accuracy-critical` (runtime mode flag)
4. `review_verification_v1` (verification payload schema ID)
5. `review-verification.json` (generated artifact filename)
6. `review-verification-input.json` (canonical reviewer-provided verification input filename)

Do not introduce alternate names for the same concept in Phase 1.

Naming convention mapping (Phase 1):
1. CLI flags: kebab-case (for example `--reviewer-brief-file`, `--accuracy-critical`).
2. Artifact filenames: kebab-case with `.json`/`.md` suffix (for example `review-verification.json`).
3. Structured payload keys: snake_case (for example `claim_id`, `evidence_refs`, `generated_at`).
4. Enum-like values: lowercase snake_case where applicable (for example `fix_request`).

## Phase 1 Verification Payload Contract

Accepted reviewer payload schema (`review_verification_v1`):

```json
{
  "schema": "review_verification_v1",
  "overall": "pass",
  "claims": [
    {
      "claim_id": "C1",
      "status": "verified",
      "evidence_refs": ["src/path.ts:42"],
      "note": "optional"
    }
  ]
}
```

Validation rules:
1. `schema` must equal `review_verification_v1`.
2. `overall` must be one of `pass` or `fail`.
3. `claims` must be a non-empty array.
4. Claim `status` must be one of `verified`, `mismatch`, `unknown`.
5. Every claim must contain non-empty `claim_id`.
6. `evidence_refs` is required and non-empty when `status=verified` or `status=mismatch`.
7. When `status=unknown`, `evidence_refs` is optional, but `note` is required and must explain why verification could not be completed.
8. `note` is optional for `verified` and `mismatch`; when present, it must be a string.
9. `review-verification.json` must be generated deterministically from parsed payload + metadata (timestamp, reviewer round id).

## Verification Payload Transport (Phase 1)

Use existing CLI surface only (no new PASS flags in this phase):
1. Reviewer provides verification payload as a JSON file attached by `--ref`.
   - accepted ref path forms: worktree-relative path or absolute path.
2. Canonical reviewer-provided filename is `review-verification-input.json`.
3. Parser behavior in `accuracy-critical` mode:
   - scans PASS refs in order,
   - selects the first ref whose basename equals `review-verification-input.json`,
   - resolves it to a concrete file path in current worktree context,
   - validates content against `review_verification_v1`.
4. If no PASS ref basename matches `review-verification-input.json`, reviewer PASS fails with explicit error.
5. If the matched file path cannot be resolved/read, reviewer PASS fails with explicit error.
6. If the matched file is invalid JSON or schema-invalid, reviewer PASS fails with explicit error.
7. Orchestrator-generated normalized output is always written to `artifacts/review-verification.json` (distinct from input filename).

## Generated Output Artifact Schema (Phase 1)

`artifacts/review-verification.json` must use this deterministic shape:

```json
{
  "schema": "review_verification_v1",
  "overall": "pass",
  "claims": [
    {
      "claim_id": "C1",
      "status": "verified",
      "evidence_refs": ["src/path.ts:42"],
      "note": "optional"
    }
  ],
  "input_ref": "review-verification-input.json",
  "meta": {
    "bubble_id": "reviewer-brief-refinement-01",
    "round": 2,
    "reviewer": "claude",
    "generated_at": "2026-03-03T09:00:00Z"
  },
  "validation": {
    "status": "valid",
    "errors": []
  }
}
```

Required output rules:
1. Top-level keys required: `schema`, `overall`, `claims`, `input_ref`, `meta`, `validation`.
2. `input_ref` must be the matched payload ref basename.
3. `meta` requires: `bubble_id`, `round`, `reviewer`, `generated_at` (UTC ISO8601).
4. `validation.status` must be `valid` or `invalid`.
5. `validation.errors` must be an array (empty when valid).
   - each error item uses `{ code: string, message: string, path?: string }`.
6. Output for identical parsed input + identical runtime metadata must be stable (deterministic normalization).

Multi-round overwrite semantics (source-of-truth policy):
1. `artifacts/review-verification.json` is a single canonical file per bubble.
2. On each reviewer PASS round with a valid verification payload, orchestrator must overwrite this file atomically with the latest normalized content.
3. Convergence/status gate evaluation must use only the latest persisted artifact (last successful reviewer PASS write), not any prior round content.
4. If a later round write fails validation and is rejected, previous persisted artifact remains unchanged.

## Accuracy-Critical Input Rules (Create-Time)

1. `accuracy-critical=false`:
   - reviewer brief remains optional.
2. `accuracy-critical=true` with reviewer brief provided (inline or file):
   - bubble create is allowed.
3. `accuracy-critical=true` with no reviewer brief provided:
   - bubble create is rejected with explicit, actionable error.
4. If both `--reviewer-brief` and `--reviewer-brief-file` are provided:
   - bubble create is rejected (mutually exclusive input sources), regardless of `accuracy-critical` value.

## Runtime Gate Behavior (Phase 1)

When `accuracy-critical=true`:
1. Reviewer PASS without valid `review_verification_v1` payload must fail with explicit error code/message.
2. Reviewer PASS with valid payload stores normalized `review-verification.json`.
3. `overall=fail` payload is allowed only for reviewer handoff with open findings (`pass_intent=fix_request`).
4. `overall=pass` payload is allowed only for reviewer clean handoff (`--no-findings` / no open findings, `pass_intent=review`).
5. Cross-check rule: invalid `overall` + `pass_intent` combinations are rejected at reviewer PASS validation time.
6. `pairflow converged` must fail unless latest reviewer verification has `overall=pass`.
7. `pairflow bubble status --json` must expose:
   - `accuracy_critical` (boolean),
   - `last_review_verification` (`pass|fail|missing|invalid`),
   - `failing_gates` (array of machine-readable gate IDs).
8. `last_review_verification=invalid` is used when `artifacts/review-verification.json` exists but is unreadable or schema-invalid at status/converged evaluation time.

When `accuracy-critical=false`:
1. Existing reviewer PASS behavior remains backward-compatible.
2. Existing converge flow remains backward-compatible.
3. Presence of `artifacts/review-verification.json` must not block convergence.

## Reviewer Injection Surface Mapping

Required file-level mapping for reviewer brief injection:
1. `src/core/bubble/startBubble.ts`:
   - startup and resume kickoff content includes `reviewer-brief.md` content when present.
2. `src/core/runtime/tmuxDelivery.ts`:
   - implementer -> reviewer PASS delivery includes reviewer brief reminder/rehydration.
3. `src/core/runtime/agentCommand.ts`:
   - startup prompt transport path; if reviewer brief text is part of startup prompt, this command path must deliver it unchanged.
4. `src/core/runtime/reviewerContext.ts`:
   - respawn orchestration only; it must not be the source-of-truth for brief text generation.
   - when used, it should consume upstream startup prompt content rather than re-deriving reviewer brief semantics locally.

## Suggested Touchpoints

1. Bubble create input + artifact plumbing:
   - `src/cli/commands/bubble/create.ts`
   - `src/core/bubble/createBubble.ts`
   - `src/core/bubble/paths.ts`
   - `src/types/bubble.ts`
   - `src/config/bubbleConfig.ts`
   - `src/core/bubble/startBubble.ts`
2. Reviewer handoff/prompt content generation:
   - `src/core/bubble/startBubble.ts`
   - `src/core/runtime/tmuxDelivery.ts`
3. Reviewer startup command plumbing and respawn path:
   - `src/core/runtime/agentCommand.ts`
   - `src/core/runtime/reviewerContext.ts`
4. Reviewer PASS validation and artifact generation:
   - `src/cli/commands/agent/pass.ts`
   - `src/core/agent/pass.ts`
   - `src/core/protocol/validators.ts`
5. Convergence gate enforcement/status diagnostics:
   - `src/cli/commands/agent/converged.ts`
   - `src/core/agent/converged.ts`
   - `src/cli/commands/bubble/status.ts`
   - `src/core/bubble/statusBubble.ts`

## Acceptance Criteria (Binary, Machine-Checkable)

1. Bubble create with `--reviewer-brief` persists `artifacts/reviewer-brief.md` with the provided content.
2. Bubble create with `--reviewer-brief-file` persists the same artifact with file content.
3. Reviewer startup/resume/handoff/respawn reviewer prompt path includes reviewer brief content when artifact exists.
4. Bubble create with `--accuracy-critical` and no reviewer brief input is rejected.
5. Bubble create with both reviewer brief sources (`--reviewer-brief` + `--reviewer-brief-file`) is rejected regardless of `accuracy-critical` value.
6. In `accuracy-critical` mode, reviewer PASS without `--ref` to `review-verification-input.json` is rejected.
7. In `accuracy-critical` mode, reviewer PASS with refs present but basename mismatch (no `review-verification-input.json`) is rejected.
8. In `accuracy-critical` mode, reviewer PASS with malformed/invalid `review-verification-input.json` is rejected.
9. Accuracy-critical reviewer PASS with payload using wrong schema ID is rejected.
10. In `accuracy-critical` mode, `overall=fail` payload is accepted only with reviewer `fix_request` + open findings; otherwise rejected.
11. In `accuracy-critical` mode, `overall=pass` payload is accepted only for clean reviewer handoff; otherwise rejected.
12. Accuracy-critical reviewer PASS with valid `review_verification_v1` payload is accepted and writes `artifacts/review-verification.json`.
13. Generated `review-verification.json` includes required top-level keys (`schema`, `overall`, `claims`, `input_ref`, `meta`, `validation`) and deterministic normalized content.
14. `pairflow converged` is blocked when latest verification is `missing`, `invalid`, or `fail`.
15. `pairflow bubble status --json` exposes `accuracy_critical`, `last_review_verification`, and `failing_gates`.
16. Non-accuracy-critical bubbles remain unchanged, and existing `review-verification.json` presence does not gate convergence.
17. Across consecutive reviewer PASS rounds in the same bubble, `artifacts/review-verification.json` is overwrite-replaced by the latest successful round, and convergence/status use this latest artifact as source-of-truth.

## Test Mapping

1. AC1-AC2: create-bubble tests for reviewer brief artifact persistence.
2. AC3: startup/resume/handoff plus respawn reviewer path tests assert reviewer brief injection continuity.
3. AC4-AC5: create-bubble validation tests for accuracy-critical reviewer-brief requirements and mutual exclusivity.
4. AC6-AC9: reviewer PASS validator tests for missing file/basename mismatch/invalid file/wrong schema.
5. AC10-AC12: reviewer PASS validator tests for `overall=fail` gating, `overall=pass` clean-handoff gating, and valid payload acceptance.
6. AC13: artifact writer tests assert required output schema keys and deterministic normalization.
7. AC14-AC15: convergence/status tests assert gate behavior and `invalid` artifact diagnostics.
8. AC16: regression tests for non-accuracy-critical workflows and non-gating behavior with existing verification artifact.
9. AC17: multi-round artifact tests assert deterministic overwrite semantics (round N+1 replaces round N) and latest-artifact-only gate evaluation.

## Validation Plan

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`

Optional shortcut:
1. `pnpm check` (runs lint + typecheck + test)

## Deliverables

1. Reviewer brief CLI input and artifact persistence.
2. Reviewer prompt injection across all reviewer entry points.
3. Accuracy-critical verification payload validation.
4. Deterministic `review-verification.json` generation.
5. Convergence/status gate diagnostics.
6. Automated tests covering acceptance criteria.

## Why This Phase 1 Is Practical

1. Adds only one new role-scoped artifact (`reviewer-brief.md`).
2. Uses one minimal deterministic payload contract (`review_verification_v1`).
3. Enforces runtime safety only when explicitly enabled via `--accuracy-critical`.
4. Preserves backward compatibility for all existing non-critical bubbles.
