# Task: Reviewer Convergence Decision Gate for Round 4+ Non-Blockers

## Goal

Eliminate the loop where `round >= severity_gate_round` and only non-blocking reviewer findings (`P2/P3`) remain, but the reviewer still sends `pairflow pass` and opens another implementer fix cycle.

Expected outcome:
1. Reviewer command selection is deterministic (`pass` vs `converged`).
2. Prompt guidance and runtime enforcement use the same rule.
3. Round-gated non-blocker convergence works in practice, not only in policy text.

## Background

Incident reference: `ai-chat-session-idempotency-refine-2026-03-03` bubble.

Observed behavior:
1. Round 4 had a single remaining `P3` finding.
2. Reviewer sent `PASS` with finding payload, creating `pass_intent=fix_request`.
3. A new fix cycle started even though this was non-blocking.

Current behavior snapshot:
1. Reviewer `PASS` intent defaults to `fix_request` when findings are present.
2. Convergence policy blocks `P2` in pre-gate rounds and allows convergence from gate round onward (default transition: from round 4).
3. Policy checks run on explicit `pairflow converged`; they are not currently mirrored as a reviewer `PASS` non-blocker gate.

## Terminology

1. `blocking finding`: `P0` or `P1`.
2. `non-blocking finding`: `P2` or `P3`.
3. `severity_gate_round`: round threshold from which reviewer `PASS` with non-blocking-only findings is rejected.

## Source-of-Truth Decision

`severity_gate_round` default is **4** for this task.
`severity_gate_round` minimum is **2** for this task (to preserve round-1 guardrail semantics).
Round-1 guardrail precedence is explicit: round 1 remains pre-gate compatibility behavior, regardless of later round-gate enforcement.

To remove cross-doc ambiguity, this task must keep all references aligned:
1. Runtime/config defaults and validation.
2. Task spec.
3. `docs/review-loop-optimization.md` references and examples (must also use default `4`).

## Scope

### In Scope

1. Add a reviewer command decision gate to startup/resume/handoff prompts.
2. Add runtime reviewer `PASS` guard for `round >= severity_gate_round` + non-blocking-only findings.
3. Add configurable `severity_gate_round` with default `4`.
4. Keep policy, prompt, CLI/help, and runtime error wording aligned.
5. Close the convergence helper blind spot so `P3`-only cases are represented explicitly.
6. Update tests for round/severity decision branches and reject-path observability.
7. Make gate ownership explicit: `pass.ts` and converged policy checks share one policy input/evaluator contract.

### Out of Scope

1. New severity levels or ontology redesign.
2. Full reviewer output contract redesign.
3. UI-level interactive decision support.

## Required Behavior

### Decision Matrix

| Condition | Allowed reviewer command | Expected result |
| --- | --- | --- |
| `round = 1`, has any `P0/P1` | `pairflow pass --finding ...` | Round-1 guardrail: first review cycle can always request blocker fixes |
| `round = 1`, findings are only `P2/P3` | `pairflow pass --finding ...` | Round-1 guardrail: pre-gate non-blocker rework remains allowed |
| `round = 1`, no findings | `pairflow converged --summary ...` (preferred) or `pairflow pass --no-findings` (compat) | Explicit round-1 clean-review closure path |
| `1 < round < severity_gate_round`, has any `P0/P1` | `pairflow pass --finding ...` | Pre-gate blocker fix-loop remains allowed |
| `1 < round < severity_gate_round`, findings are only `P2/P3` | Existing behavior (`pairflow pass --finding ...`) | No regression in pre-gate flow |
| `1 < round < severity_gate_round`, no findings | `pairflow converged --summary ...` (preferred) or `pairflow pass --no-findings` (compat) | Pre-gate clean-review closure path is explicit |
| `round >= severity_gate_round`, has any `P0/P1` | `pairflow pass --finding ...` | New fix cycle remains allowed |
| `round >= severity_gate_round`, findings are only `P2/P3` | `pairflow converged --summary ...` | Converged path required |
| `round >= severity_gate_round`, no findings | `pairflow converged --summary ...` | Converged path required |

### Runtime Guard Contract

Reject reviewer `PASS` in either of these cases:
1. `round >= severity_gate_round` and findings payload is non-empty and contains no `P0/P1`.
2. `round >= severity_gate_round` and reviewer explicitly declares no findings (`--no-findings`) instead of using `converged`.

Reject response requirements:
1. Explicitly state why `PASS` was rejected.
2. Include clear next step: `pairflow converged --summary ...`.
3. Do not append PASS envelope to transcript on reject.
4. Do not switch active role / start new implementer fix round on reject.
5. Reject error text must include a specific reason string for non-blocker-only post-gate rejection (for example: "only P2/P3 findings at round >= severity_gate_round").

### Non-Blocking Payload Preservation (Must-Fix)

When reviewer `PASS` is rejected post-gate due to only `P2/P3` findings, the non-blocking review payload must remain preservable through the converged path.

Required behavior:
1. Reviewer can transfer the same non-blocking context into converged summary/notes artifact without reclassification loss.
2. Severity mix (`P2/P3`) and references survive in structured reviewer notes artifact or explicitly structured converged metadata.
3. Converged flow must not silently drop non-blocking findings that triggered the command-choice redirect.

### Convergence Helper Blind Spot (Must-Fix)

Current helper logic in convergence policy tracks `hasP2` but does not expose full non-blocker composition (`P2` vs `P3`) for shared gate logic.

Required change:
1. Extend helper output from ad-hoc booleans to severity-aware counts/flags (`P0`, `P1`, `P2`, `P3`).
2. Expose explicit `hasNonBlocking` (or equivalent) that covers both `P2` and `P3`.
3. Update the gate condition to use the extended helper signal (not `hasP2`-only branching), including the existing convergence-policy round gate path in `src/core/convergence/policy.ts`.
4. Ensure gate decisions are based on structured findings payload first; summary text parsing remains fallback-only diagnostics.
5. Replace hardcoded "round 3 / round 4" policy wording with messaging derived from `severity_gate_round` (for example, "`through round N-1`" and "`from round N`"), so behavior and text stay aligned when config changes.
6. Extend `ConvergencePolicyInput` with `severity_gate_round` and use the same policy-owned gate input in both `src/core/agent/pass.ts` and converged-path policy validation to avoid split ownership.

## Implementation Touchpoints

### Prompt Surfaces

1. `src/core/bubble/startBubble.ts`
2. `src/core/runtime/tmuxDelivery.ts`

### Runtime/Policy

1. `src/core/agent/pass.ts`
2. `src/core/convergence/policy.ts`
3. `src/core/agent/converged.ts` (invokes convergence policy; ensure end-to-end gate wiring is explicit)
4. `src/core/bubble/startBubble.ts` (runtime prompt/bootstrap must inject the same gate semantics)

### Config + Types

1. `src/types/bubble.ts`
2. `src/config/defaults.ts`
3. `src/config/bubbleConfig.ts`
4. `src/core/bubble/createBubble.ts` (thread default/config value into bubble config artifact)
5. `src/cli/commands/bubble/create.ts` (ensure config input threading path is covered)

### CLI/Contract Surface

1. `src/cli/commands/agent/pass.ts` (help/error guidance alignment)
2. `src/cli/commands/agent/converged.ts` (pass/converged symmetry in user guidance)

### Docs Sync

1. `docs/review-loop-optimization.md` (default-value consistency)
2. `docs/reviewer-severity-ontology.md` (terminology and decision mapping consistency)

### Tests

1. `tests/core/agent/pass.test.ts`
2. `tests/core/convergence/policy.test.ts` (including `P3`-only and gate-message assertions)
3. `tests/core/runtime/tmuxDelivery.test.ts`
4. `tests/config/bubbleConfig.test.ts`
5. `tests/core/bubble/createBubble.test.ts` (config threading coverage)
6. `tests/core/agent/converged.test.ts` (policy integration coverage from converged command path)
7. E2E/integration scenario covering reject-path observability

## Acceptance Criteria

1. `severity_gate_round` exists in config schema, is validated as an integer `>= 2`, defaults to `4`, and is TOML render/parse stable.
2. Reviewer prompt blocks include a top-priority decision gate with the same round/severity rules as runtime.
3. Reviewer `PASS` is rejected for `round >= severity_gate_round` + only `P2/P3` findings.
4. Reject error text instructs `pairflow converged --summary ...` explicitly.
5. `round >= severity_gate_round` + at least one `P0/P1` still allows reviewer `PASS`.
6. `round < severity_gate_round` keeps previous PASS behavior unchanged.
7. Convergence helper/policy tests in `tests/core/convergence/policy.test.ts` verify `P3`-only cases are explicitly represented and do not rely on `P2`-only shortcuts.
8. E2E/integration assertion is observable and deterministic:
   - Setup: reviewer at `round >= severity_gate_round` with only non-blocking findings (`P2`-only or `P3`-only).
   - Action: invoke reviewer `pairflow pass --finding "P2:..."` (or `P3:...`).
   - Assert: command fails with explicit non-blocker post-gate reject reason text, transcript has no new PASS envelope, and implementer round does not increment.
9. At `round >= severity_gate_round`, reviewer `pairflow pass --no-findings` is rejected and directs to `pairflow converged --summary ...`, because post-gate clean review must use the converged command path for deterministic command semantics.
10. At `round < severity_gate_round`, reviewer `pairflow pass --no-findings` remains accepted for compatibility (prompt still prefers `converged --summary` for clean closure).
11. Docs mention of default gate value is consistent across task + design doc references (no `3` vs `4` split).
12. Convergence policy user-facing round-gate text is parameterized by `severity_gate_round` and does not hardcode "round 3".
13. `severity_gate_round = 1` is rejected by config validation (no runtime normalization fallback) to preserve explicit round-1 guardrail precedence.
14. Gate ownership is explicit and singular: `ConvergencePolicyInput` carries `severity_gate_round`, and both reviewer `pass` and converged-policy checks consume the same policy-level gate contract.
15. Converged-path verification is symmetric to pass-path rigor: redirected non-blocking findings (`P2/P3`) remain represented in converged notes/metadata with traceable refs.

## Notes

1. This task does not force automatic convergence for every finding.
2. The objective is to stop non-blocker-only rounds from opening unnecessary fix loops after the configured gate round.

## Date

2026-03-03
