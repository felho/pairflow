# Reviewer Evidence Autolog Task (Project-Side, Minimal Change)

**Date:** 2026-02-28  
**Status:** Draft task file  
**Scope:** Pairflow as a development project (not Pairflow as a product feature surface change).

## Context and Why This Change Is Needed

We already implemented reviewer skip/run decisioning based on test evidence verification.  
However, in practice the speed gain depends on whether implementer handoffs include **hard evidence** (`--ref` log artifacts).

Current risk:

1. Implementers often provide only summary text ("soft evidence").
2. Soft evidence is intentionally treated as untrusted by provenance rules.
3. Reviewer receives `run_checks` fallback more often than needed.
4. Result: quality stays safe, but latency reduction is weaker than expected.

We want a low-risk, low-complexity project change that increases trusted evidence rate without making Pairflow project-specific.

## Strategy (Minimal, Project-Specific Setup)

Do **not** add new Pairflow product command for this step.

Instead:

1. Reuse existing project scripts (`typecheck`, `test`, `lint`, `check`).
2. Make these scripts emit stable evidence logs under `.pairflow/evidence/`.
3. Ensure implementer workflow uses these scripts as the default validation path.
4. Require passing generated evidence logs as `--ref` in `pairflow pass`.

This keeps Pairflow agnostic while improving this repository's local integration quality.

## Required Changes

### 1. Evidence-producing script behavior

Update project scripts so that running validation also writes logs:

1. `.pairflow/evidence/typecheck.log`
2. `.pairflow/evidence/test.log`
3. `.pairflow/evidence/lint.log` (when running `pnpm lint` directly or via `pnpm check`)

Requirements:

1. Include explicit command header and explicit exit marker in each log.
2. Header must include minimum freshness metadata fields: UTC timestamp, git commit SHA, and command string.
3. Exit marker must include explicit exit code (for example `PAIRFLOW_EVIDENCE_EXIT=<code>`).
4. Preserve normal terminal output (do not hide lint/test/typecheck output from the user); use `tee` (or shell-equivalent) so output remains visible while writing logs.
5. Wrapper examples should retain true command failure semantics (`set -o pipefail` or equivalent) so piped logging does not mask non-zero exits.
6. Keep existing script names usable (`pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm check`).

### 2. Evidence artifact lifecycle and git policy

Treat generated evidence logs as ephemeral runtime artifacts:

1. Explicitly gitignore `.pairflow/evidence/*.log`.
2. Keep `.pairflow/evidence/` available locally for writing logs (for example with a tracked placeholder like `.gitkeep`, if needed).
3. Do not require committing log contents as part of normal task changes.

### 3. Implementer guidance in AGENTS.md

Add explicit rule in `AGENTS.md`:

1. Implementer should run project validation via the evidence-producing scripts.
2. Implementer handoff must include available evidence logs via `--ref`.

Target handoff pattern:

```bash
pairflow pass --summary "..." \
  --ref .pairflow/evidence/lint.log \
  --ref .pairflow/evidence/typecheck.log \
  --ref .pairflow/evidence/test.log
```

### 4. Prompt-level reinforcement

Update implementer startup/resume handoff guidance so it explicitly states:

1. If evidence logs exist, include them as `--ref` on PASS.
2. Missing expected evidence logs should be treated as incomplete validation packaging.
3. When only a subset of validation commands ran, attach refs for the commands that actually ran and state what was intentionally not executed.

Note: this is prompt wording and workflow guidance, not new protocol fields.

## Non-Goals

1. No new Pairflow CLI command (for this task).
2. No change to evidence trust policy semantics.
3. No project-agnostic plugin/provider framework in this step.

## Acceptance Criteria

1. Running `pnpm typecheck` generates/upgrades `.pairflow/evidence/typecheck.log`.
2. Running `pnpm test` generates/upgrades `.pairflow/evidence/test.log`.
3. Running `pnpm lint` (or `pnpm check`) generates/upgrades `.pairflow/evidence/lint.log`.
4. Each generated log includes timestamp, commit SHA, command header, and explicit exit code marker.
5. Script output remains visible in terminal (developer UX preserved).
6. `.pairflow/evidence/*.log` is explicitly gitignored as ephemeral evidence output.
7. `AGENTS.md` clearly requires attaching available evidence refs in implementer PASS handoff.
8. Implementer prompt text includes evidence-ref reminder.
9. Documentation/examples in repo reflect the new expected handoff pattern (including lint ref when present).

## Validation Plan

1. Run `pnpm typecheck` and verify `typecheck.log` contains header metadata + explicit exit marker.
2. Run `pnpm test` and verify `test.log` contains header metadata + explicit exit marker.
3. Run `pnpm lint` (or `pnpm check`) and verify `lint.log` contains header metadata + explicit exit marker.
4. Confirm terminal output remains visible during logging (tee behavior).
5. Create a sample implementer-style PASS with refs and confirm verifier marks trusted when inputs are valid.
6. Confirm fallback behavior still works when refs are omitted (safety unchanged).

## Risks and Mitigations

1. Risk: script wrappers become brittle across shells/platforms.
   - Mitigation: keep wrapper logic minimal and test in current dev environment.
2. Risk: logs grow large or include noisy output.
   - Mitigation: cap or rotate in a follow-up if needed; keep this task minimal.
3. Risk: agents forget attaching refs despite logs existing.
   - Mitigation: enforce via AGENTS.md + prompt reminder.

## Follow-up (Optional, Later)

If this minimal approach still leaves too much manual handling:

1. introduce a generic evidence-provider interface contract,
2. keep Pairflow agnostic by only consuming standardized outputs,
3. avoid embedding project-specific command semantics in Pairflow core.
