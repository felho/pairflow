# Task: Role-Scoped Reviewer Brief Injection + Accuracy Enforcement (Ideal Design)

## Problem

For critical documentation tasks (security plans, migration plans, architecture truth docs), the current loop can still converge with factual drift if reviewer context is incomplete or inconsistent across rounds.

The core gap is not just “better wording in task.md”, but missing first-class reviewer control:

1. No dedicated, explicit reviewer brief channel at bubble creation.
2. No structured, machine-checkable "fact verification contract" for reviewer rounds.
3. No hard convergence gate for "accuracy-critical" work.
4. Human intent ("this document must be source-of-truth accurate") is not represented as enforceable runtime policy.

## Goal

Design a first-class "review control plane" so accuracy-critical bubbles can guarantee reviewer behavior and evidence quality without relying on fragile prompt wording.

## Ideal Solution Summary

Introduce **Role-Scoped Task Contracts** + **Reviewer Brief Artifacts** + **Accuracy Gates**:

1. Bubble task stays global (`task.md`) but adds role-scoped overlays:
   - implementer contract
   - reviewer contract
2. Reviewer receives a dedicated brief artifact (not mixed into implementer task text).
3. Reviewer output becomes machine-checkable against an explicit verification matrix.
4. Convergence is blocked until required fact checks pass.

This should work for both docs-only and code-heavy tasks, with stricter mode for accuracy-critical docs.

## Product Model

### 1) New Bubble Inputs

Add optional bubble-create inputs:

- `--implementer-brief <text>` (inline)
- `--implementer-brief-file <path>`
- `--reviewer-brief <text>` (inline)
- `--reviewer-brief-file <path>`
- `--review-contract <path>` (YAML/JSON schema)
- `--accuracy-critical` (boolean)

Behavior:
- If omitted: current behavior remains.
- If provided: briefs/contracts are persisted in bubble artifacts and injected role-specifically.

### 2) New Artifacts

Under `.pairflow/bubbles/<id>/artifacts/`:

- `task.md` (existing)
- `implementer-brief.md` (new, optional)
- `reviewer-brief.md` (new, optional)
- `review-contract.yaml` (new, optional)
- `review-verification.json` (new, generated each reviewer round)

### 3) Review Contract Schema (concept)

`review-contract.yaml` should allow exact expectations, e.g.:

- `mode: docs_accuracy_critical`
- `required_source_of_truth`: list of files/globs
- `required_claims`: list of claim IDs to verify
- `required_output_sections`: fixed reviewer PASS structure
- `evidence_rules`: e.g. each critical finding needs `file:line`
- `convergence_gates`: booleans and thresholds

Example capabilities:
- "All corrected flow claims must map to concrete code refs."
- "Unknown facts must be marked UNKNOWN, not guessed."
- "Convergence forbidden if any required claim is unverified."

### 4) Role-Specific Prompt Injection

At bubble start/resume and implementer->reviewer handoff:

- Implementer prompt = global task + implementer brief
- Reviewer prompt = global task + reviewer brief + review contract summary

Important:
- Reviewer prompt must be built from dedicated reviewer artifacts, not inferred from task text heuristics.
- In fresh reviewer mode, the same reviewer brief+contract must be rehydrated every round.

### 5) Accuracy-Critical Runtime Gates

If `accuracy-critical` is enabled:

1. Reviewer PASS must include required structured verification payload (machine-parseable).
2. Reviewer PASS must reference verification evidence for required claims.
3. `pairflow converged` must fail if verification report is incomplete/failed.
4. State/inbox should show which gate is failing.
5. Gate bypass is allowed only via explicit admin override (audited).

## Reviewer PASS Contract (ideal)

For accuracy-critical mode, reviewer handoff must contain:

1. `Scope Covered`
2. `Claim Verification Matrix`
3. `Mismatches`
4. `Residual Unknowns`
5. `Convergence Decision`

Each claim in matrix:
- claim_id
- status: `verified | mismatch | unknown`
- evidence_refs (file:line or artifact refs)
- note

Parser stability requirement:
- Do not rely on markdown heading parsing alone.
- Require a deterministic structured block, for example JSON payload under a dedicated marker (`review_verification_v1`) or via a dedicated `--review-verification-file <path>` handoff input.
- Reviewer markdown sections remain human-readable only; gate logic reads the structured payload.

## UX / CLI Proposal

### Bubble creation

```bash
pairflow bubble create \
  --id p11-h1-doc-hardening \
  --repo /repo \
  --base main \
  --task-file /tmp/task.md \
  --implementer-brief-file /tmp/implementer-brief.md \
  --reviewer-brief-file /tmp/reviewer-brief.md \
  --review-contract /tmp/review-contract.yaml \
  --accuracy-critical
```

### Runtime visibility

`pairflow bubble status --id ... --json` should expose:
- `accuracy_critical: true|false`
- `review_contract_present: true|false`
- `last_review_verification: pass|fail|missing`
- `failing_gates: []`

### Convergence failure example

`pairflow converged` returns:
- "Blocked: review contract gate failed"
- Missing/failed claim IDs
- quick fix hint: "Reviewer must submit Claim Verification Matrix with evidence"

### Admin escape hatch

Add explicit emergency override (audited):

```bash
pairflow bubble approve --id <id> --override-review-gate --reason "Emergency unblock: <reason>"
```

Rules:
- restricted to human/admin command path only
- requires non-empty reason
- recorded in transcript + state metadata + metrics event
- never available to implementer/reviewer agent commands

## Orchestrator Responsibilities

1. Persist role briefs and contract at create time.
2. Inject role-specific context in start/resume/handoff.
3. Parse reviewer PASS output for structured sections.
4. Generate `review-verification.json` per reviewer round.
5. Enforce convergence gates.

## Compatibility & Adoption

- Default mode remains unchanged (no contract => no new gate).
- Gate activation is opt-in **only** via `--accuracy-critical`.
- Presence of `review-contract` alone does not activate convergence gate.
- Existing bubbles continue to run.

## Security / Trust

- Verification report must be generated by orchestrator logic, not only reviewer self-report.
- Reviewer claims without evidence are accepted only as `unknown`, never `verified`.
- Contract parsing failures should fail safe (block convergence in accuracy-critical mode).

## Phased Delivery

### Phase 1 (MVP)

1. Add artifact plumbing:
   - reviewer brief
   - review contract
2. Inject reviewer brief at start/resume/handoff (including fresh reviewer respawn rounds).
3. Add minimal deterministic verifier output (`review-verification.json`).
4. Add one minimal gate in accuracy-critical mode:
   - require valid `Claim Verification Matrix` payload.
   - block `converged` when missing/invalid.

### Phase 2

1. Full schema validation for `review-contract.yaml`.
2. Rich verification report generation.
3. Better status/inbox diagnostics for failing gates.

### Phase 3

1. Optional UI editor for contract/brief.
2. Reusable contract templates (docs accuracy, migration safety, security fix verification).
3. Analytics on review contract compliance.

## Acceptance Criteria

1. User can provide reviewer-specific brief independently of implementer task.
2. Reviewer receives this brief on start/resume and each fresh round.
3. Accuracy-critical bubbles cannot converge without required verification payload.
4. Orchestrator produces deterministic machine-readable verification artifact for each reviewer pass.
5. Status clearly explains convergence blockers.
6. Non-accuracy-critical bubbles remain backward-compatible.
7. Admin override is available, audited, and human-only.

## Suggested Initial Template for This Use Case

For "critical doc must match repo reality" tasks, include a ready-made contract template:

- verify all flow tables against listed code files
- require file:line evidence for every corrected claim
- require explicit UNKNOWN markers for unprovable statements
- forbid convergence if any mandatory section is missing

This template should be first-party and discoverable (e.g. `pairflow templates list`).

## Out of Scope

- Replacing existing severity ontology.
- Replacing current PASS/finding format globally.
- Automatic semantic verification of source code correctness.

## Why This Is the Best Fit

Prompt quality alone is not enough for high-stakes documentation accuracy. The ideal solution is a **policy + artifact + gate** model:

- policy (`review-contract`)
- role-specific context (`reviewer-brief`)
- enforceable runtime gate (`accuracy-critical convergence checks`)

This turns "please be careful" into deterministic workflow behavior.
