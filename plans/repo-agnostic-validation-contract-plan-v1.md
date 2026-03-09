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

1. Canonical forrás: a meglévő repo-root `pairflow.toml`, ezen belül a `[validation]` szekció. Phase 1-ben nem vezetünk be külön `pairflow.validation.toml` vagy más párhuzamos validation config fájlt.
2. Terminológia: a "repo-level validation profile" mindig a `pairflow.toml` `[validation]` szekcióját jelenti; a "bubble override" az explicit bubble create input/CLI mezőket; a "legacy built-in defaults" a profile hiányában tovább élő jelenlegi beépített parancs-defaultokat jelenti; az `if_missing` a gate-szintű hiányzó-command policy, amely omitted esetben `fail`-re defaultol; a `required_for` gate-szintű scope-szűrő a kötelező command-derivációhoz; a `block_on_fail` pedig az execution-layer failure handling flagje, amelynek authoritative enforcementje Phase 1A-ben változatlanul a meglévő runnerben marad.
3. Precedence plain language: ha van explicit bubble override, az nyer; ha nincs, akkor a repo-level validation profile adja a parancsot; ha egyik sincs, a meglévő built-in default marad aktív.
4. Missing command policy deklarációs helye: gate-szinten (`if_missing = fail|warn|skip`), omitted esetben `fail` defaulttal, és ez csak arra az esetre vonatkozik, amikor a kiválasztott configból hiányzik a command mező.
5. Runtime failure boundary: ha egy command már ki lett választva és lefut, a futás közbeni hiba nem `if_missing` eset, és nem esik vissza legacy defaultra; azt a meglévő command-exit handling és a `block_on_fail` szemantika kezeli. Phase 1A-ben ez boundary clarification only: nem hoz új required-now `createBubble`/policy-resolver runtime-execution kötelezettséget.
6. `lint` helye: első osztályú gate command a profile-ban (nem kötelezően composite verify script része), de Phase 1A-ben ez parseable optional field marad, nem külön acceptance-driving verifier scope.
7. Backward compatibility plain language: ha nincs `[validation]` szekció, a jelenlegi built-in defaults maradnak; ha viszont a `pairflow.toml` vagy a `[validation]` tartalom hibás, akkor actionable hibával megállunk, nem downgrade-elünk csendben.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1A | Project-level command profile foundation (single-target mode) | `plans/repo-agnostic-validation-contract-plan-v1.md`, korábbi reminder döntési pontok, jelenlegi bubble command flow | meglévő `pairflow.toml` `[validation]` parser/validator + policy resolver + createBubble wiring + reviewer evidence command-deriváció | a repo-level validation profile-ból determinisztikusan jönnek a command defaultok; nincs külön validation config fájl; precedence, fallback és `if_missing` boundary tesztekkel zárva; runtime failure csak boundary clarification ebben a fázisban |
| Phase 1B | Multi-target target-resolution és runtime integráció | Phase 1A contract, `path_selectors` design | target resolver + lifecycle integration + ambiguous mapping fail-fast + target-aware prepare | multi-target repo case explicit resolve/deny viselkedéssel és regressziómentesen működik |

## Task List

1. `plans/tasks/repo-agnostic-validation-contract-phase1a-project-command-profile.md`
2. `plans/tasks/repo-agnostic-validation-contract-phase1b-multi-target-resolution-and-runtime-integration.md` (későbbi task)

## Dependencies

1. `docs/pairflow-initial-design.md` (state/lifecycle invariánsok).
2. Jelenlegi bubble config contract (`src/config/bubbleConfig.ts`, `src/core/bubble/createBubble.ts`).
3. Reviewer evidence döntési contract (`src/core/reviewer/testEvidence.ts`).

## Risks and Mitigations

1. Risk: a repo-level validation profile és a bubble override precedence félreértése -> Mitigation: explicit precedence tesztek, plain-language docs és source-decision hibaüzenetek.
2. Risk: az `if_missing`, `required_for` és `block_on_fail` policy mezők fedetlenül maradnak a downstream contractokban -> Mitigation: terminológiai rögzítés + parser/policy/evidence traceability a Taskban és a tesztmátrixban.
3. Risk: a runtime failure rossz execution layerhez kötése -> Mitigation: Phase 1A-ben boundary clarification only; execution-layer enforcement külön follow-upban.
4. Risk: túl széles első implementációs kör -> Mitigation: strict split (1A single-target, 1B multi-target).
5. Risk: repo-közti kompatibilitási regresszió -> Mitigation: `[validation]` hiányában a legacy built-in defaults kötelező megtartása, de invalid config esetén fail-fast.

## Validation Strategy

1. Unit tesztek: repo-level validation profile parser/validator, parse-error ág, policy resolver, precedence, `if_missing` config-time jelentés és az omitted `if_missing => fail` default.
2. Integration tesztek: createBubble command öröklés, reviewer evidence required command deriváció.
3. Regression: `[validation]` hiány esetén a meglévő built-in behavior változatlan marad.
4. Error-path tesztek: invalid `pairflow.toml` vagy invalid `[validation]` esetén actionable hiba; hiányzó command path parser/policy szinten tesztelt; `block_on_fail` invalid sémaérték ugyanebben a validator-útban rejectálódik.
5. Boundary verification: a Task tesztmátrixa külön bizonyítja, hogy a `required_for` evidence-scope mező downstream hatású, míg a futásidejű command failure boundary Phase 1A-ben dokumentált non-goal, és továbbra is a meglévő execution layer kezeli.

## Assumptions

1. Phase 1-ben nem kell PRD; Plan -> Task lánc elég a contract-boundary változáshoz.
2. A multi-target runtime target-resolve külön taskban kezelhető, nem blokkolja a project-level command profile bevezetését.
