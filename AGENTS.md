# Pairflow Agent Guidelines

## Scope
- These rules apply only to this repository (`pairflow`).
- Focus on building the Pairflow orchestrator tool.

## Priorities
1. Output quality and robustness first.
2. Reduce coordination mistakes and state inconsistencies.
3. Optimize speed only if it does not harm 1 or 2.

## Workflow
1. Plan before implementation.
2. Implement in small, verifiable increments.
3. Validate each increment before moving on.

## Safety
- Do not run destructive git/history commands (`reset --hard`, rebase, force push, etc.) without explicit user approval.
- Do not change files outside this repo unless explicitly requested.

## Tech Conventions
- Language: TypeScript-first.
- Keep architecture aligned with `agent-pair-orchestrator-mvp-spec-2026-02-21.md`.
- If protocol or state machine behavior changes, update the spec in the same work.

## Verification Before Commit
- Run lint, typecheck, and tests relevant to changed code.
- If any check is skipped, state it explicitly in the summary.

## Session Close
- Add a short progress update to the repository progress note (if present) or commit message context.
