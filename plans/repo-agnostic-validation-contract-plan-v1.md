---
artifact_type: plan
artifact_id: plan_repo_agnostic_validation_contract_phase1_v1
title: "Repo-Agnostic Validation Contract (Phase 1 Plan)"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Repo-Agnostic Validation Contract (Phase 1)

## Objective

Egységes, repo-szintű validation contract bevezetése, amely:
1. csökkenti a bubble create bemeneti terhelést,
2. megszünteti a bubble-önkénti command driftet,
3. egyértelműen elválasztja a projekt default és a bubble override felelősségi szintet,
4. single-repo és multi-target repo esetben is determinisztikus futást ad.

## Decision Baseline

1. Canonical forrás: meglévő `pairflow.toml` (repo root), ezen belül `[validation]` szekció.
2. Precedence: explicit bubble override > repo profile > legacy fallback default.
3. Missing command policy deklarációs helye: gate-szinten (`if_missing = fail|warn|skip`).
4. `lint` helye: első osztályú gate command a profile-ban (nem kötelezően composite verify script része).
5. Backward compatibility: profile hiányában legacy működés marad.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1A | Project-level command profile foundation (single-target mode) | `plans/repo-agnostic-validation-contract-plan-v1.md`, korábbi reminder döntési pontok, jelenlegi bubble command flow | `pairflow.toml` `[validation]` parser/validator + policy resolver + createBubble wiring + reviewer evidence command-deriváció | repo profile-ból determinisztikusan jönnek a command defaultok; precedence és fallback tesztekkel zárva |
| Phase 1B | Multi-target target-resolution és runtime integráció | Phase 1A contract, `path_selectors` design | target resolver + lifecycle integration + ambiguous mapping fail-fast + target-aware prepare | multi-target repo case explicit resolve/deny viselkedéssel és regressziómentesen működik |

## Task List

1. `plans/tasks/repo-agnostic-validation-contract-phase1a-project-command-profile.md`
2. `plans/tasks/repo-agnostic-validation-contract-phase1b-multi-target-resolution-and-runtime-integration.md` (későbbi task)

## Dependencies

1. `docs/pairflow-initial-design.md` (state/lifecycle invariánsok).
2. Jelenlegi bubble config contract (`src/config/bubbleConfig.ts`, `src/core/bubble/createBubble.ts`).
3. Reviewer evidence döntési contract (`src/core/reviewer/testEvidence.ts`).

## Risks and Mitigations

1. Risk: profile és bubble config precedence félreértés -> Mitigation: explicit precedence tesztek és hibaüzenetek.
2. Risk: túl széles első implementációs kör -> Mitigation: strict split (1A single-target, 1B multi-target).
3. Risk: repo-közti kompatibilitási regresszió -> Mitigation: profile-hiány legacy fallback kötelező megtartása.

## Validation Strategy

1. Unit tesztek: profile parser/validator, policy resolver, precedence.
2. Integration tesztek: createBubble command öröklés, reviewer evidence required command deriváció.
3. Regression: profile hiány esetén meglévő behavior változatlan.

## Assumptions

1. Phase 1-ben nem kell PRD; Plan -> Task lánc elég a contract-boundary változáshoz.
2. A multi-target runtime target-resolve külön taskban kezelhető, nem blokkolja a project-level command profile bevezetését.
