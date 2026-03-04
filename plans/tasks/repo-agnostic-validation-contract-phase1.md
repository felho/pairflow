# Task: Repo-Agnostic Validation Contract (Unified Phase 1)

## Status
- Date: 2026-03-04
- Owner: felho
- State: Planned

## Context
A Pairflow quality gate-ek jelenleg több helyen implicit környezeti feltételekre támaszkodnak, ami heterogén/multi-app repo-kban instabil működést okoz.

Azonosított problémák:
1. Friss/csupasz worktree-ben a lint/typecheck/test parancsok fals hibát adhatnak vagy el sem indulnak (dependency bootstrap hiány).
2. Multi-app repo-kban ugyanazon parancs root `cwd`-ből hibás, app `cwd`-ből viszont helyes.
3. Apponként eltérő gate-képesség van (pl. egyik targeten van `lint`, másikon nincs), amit a jelenlegi modell nem kezel explicit.

Következtetés:
A Pairflow-nak repo-agnosztikusnak kell maradnia, de a validációt target-alapon, deklaratív policy szerint kell futtatnia.

## Goal
Egységes, repo-agnosztikus validation contract bevezetése, amely:
1. monorepo és single-repo esetet is natívan támogat,
2. target-specifikus `cwd` + prepare + gates modellt ad,
3. docs/code/auto scope szerint deterministicen enforce-ol,
4. lint fail esetén required gate-ben javítást kényszerít (nem silent warning).

## Non-Goals (Phase 1)
1. Nem cél teljes build graph engine (Nx/Turbo szint).
2. Nem cél automatikus tökéletes impact analysis.
3. Nem cél UI alapú policy szerkesztő.

## Design Principle
"Core orchestrator + repo validation contract":
1. Pairflow core csak lifecycle/protokoll/gate végrehajtó.
2. A repo deklarálja a prepare és gate policy-t.
3. A core nem feltételez konkrét toolchaint (`pnpm`, `npm`, `pytest`, stb.).

## Proposed Contract
Fájl: `pairflow.validation.toml` (repo root, verziózott)

### Schema (target-alapú)
Top-level mezők:
1. nincsen külön mode kapcsoló; Phase 1-ben a target futtatás kizárólag changed-path mapping alapján történik

Target mezők (`[[targets]]`):
1. `id` (egyedi)
2. `cwd` (repo-roothoz relatív munkakönyvtár)
3. `path_selectors` (glob lista target kiválasztáshoz)
4. `prepare.commands` (idempotens bootstrap parancsok)
5. `gates.<name>.command`
6. `gates.<name>.required_for = ["document"|"auto"|"code"]`
7. `gates.<name>.block_on_fail = true|false`
8. `gates.<name>.if_missing = "fail"|"skip"|"warn"`

### Példa (heterogén multi-app repo)
```toml
[[targets]]
id = "finder"
cwd = "05_finder"
path_selectors = ["05_finder/**", "@docs/**", "@progress/**"]

[targets.prepare]
commands = ["pnpm install --frozen-lockfile"]

[targets.gates.typecheck]
command = "pnpm typecheck"
required_for = ["code", "auto"]
block_on_fail = true
if_missing = "fail"

[targets.gates.test]
command = "pnpm test"
required_for = ["code"]
block_on_fail = true
if_missing = "fail"

[[targets]]
id = "pitch"
cwd = "11_pitch"
path_selectors = ["11_pitch/**"]

[targets.prepare]
commands = ["npm ci"]

[targets.gates.lint]
command = "npm run lint"
required_for = ["code", "auto"]
block_on_fail = true
if_missing = "fail"

[[targets]]
id = "retriever"
cwd = "04_retriever"
path_selectors = ["04_retriever/**"]

[targets.prepare]
commands = ["python -m pip install -r requirements.txt"]

[targets.gates.test]
command = "python -m pytest -q"
required_for = ["code", "auto"]
block_on_fail = true
if_missing = "fail"
```

### Példa (single-target repo, pl. Pairflow)
```toml
[[targets]]
id = "pairflow-core"
cwd = "."
path_selectors = [
  "src/**",
  "tests/**",
  "docs/**",
  "plans/**",
  "scripts/**",
  "package.json",
  "tsconfig*.json",
  "eslint.config.mjs"
]

[targets.prepare]
commands = ["pnpm install --frozen-lockfile"]

[targets.gates.lint]
command = "pnpm lint"
required_for = ["code", "auto"]
block_on_fail = true
if_missing = "fail"

[targets.gates.typecheck]
command = "pnpm typecheck"
required_for = ["code", "auto"]
block_on_fail = true
if_missing = "fail"

[targets.gates.test]
command = "pnpm test"
required_for = ["code"]
block_on_fail = true
if_missing = "fail"
```

## Target Resolution Strategy
Prioritás:
1. changed paths + `path_selectors` mapping
2. ha nincs egyértelmű találat:
   - ha pontosan 1 target létezik: azt használjuk
   - ha több target létezik: fail-fast, explicit target szükséges

## Runtime Behavior
1. start/resume elején profile load (`pairflow.validation.toml`).
2. target resolve (changed-path selector alapján).
3. target prepare futtatás.
4. scope (`document|auto|code`) szerinti required gate-ek aktiválása.
5. evidence verifier targetből származó required command listával dolgozik.
6. `if_missing` policy alapján script-hiány kezelése.

## Caching / Performance
Target prepare cache:
1. cache key: `{bubble_id, target_id, lockfile_hash, runtime_version}`
2. cache hit: prepare skip
3. cache miss: prepare run

Cél: ne fusson minden roundban teljes install.

## Backward Compatibility
1. `pairflow.validation.toml` hiányában legacy működés marad.
2. A jelenlegi bubble config alapú fallback (`commands.typecheck` + `commands.test`) változatlan marad.
3. Későbbi schema-váltás esetén külön migration task készül; Phase 1-ben nincs többverziós parser.

## Implementation Notes
### 1) Types
- `src/types/validation.ts` (új)
  - `ValidationProfile`
  - `ValidationTarget`
  - `ValidationGateMissingPolicy`
  - `ValidationArtifactScope`

### 2) Parser / validator
- `src/config/validationProfile.ts` (új)
  - `resolveValidationProfilePath(repoPath)`
  - `loadValidationProfile(repoPath)`
  - `parseValidationProfileToml(input)`
  - `assertValidValidationProfile(input)`

### 3) Target resolver
- `src/core/runtime/validationTargetResolver.ts` (új)
  - `resolveValidationTarget({ profile, changedPaths?, bubbleConfig })`

### 4) Prepare executor
- `src/core/runtime/validationPrepare.ts` (új vagy bővítés)
  - target-aware execute
  - cache marker kezelés
  - evidence log targetenként

### 5) Validation policy resolver
- `src/core/runtime/validationPolicy.ts` (új vagy bővítés)
  - target-aware required gate command lista deriválás
  - profile-hiány fallback

### 6) Bubble lifecycle integration
- `src/core/bubble/startBubble.ts`
  - target resolve + prepare start/resume pathon
  - ambiguous target esetén actionable fail-fast üzenet

### 7) Evidence verifier integration
- `src/core/reviewer/testEvidence.ts`
  - `normalizeRequiredCommands()` helyett contractból jövő required command lista
  - docs-only policy továbbra is konzisztens marad

### 8) Bubble config / CLI plumbing
- Phase 1-ben nincs explicit target override mező/flag.
- A kiválasztás kizárólag changed-path alapú.

## Suggested Touchpoints
1. `src/types/validation.ts` (új)
2. `src/config/validationProfile.ts` (új)
3. `src/core/runtime/validationTargetResolver.ts` (új)
4. `src/core/runtime/validationPrepare.ts`
5. `src/core/runtime/validationPolicy.ts`
6. `src/core/bubble/startBubble.ts`
7. `src/core/reviewer/testEvidence.ts`
8. `tests/config/validationProfile.test.ts` (új)
9. `tests/core/runtime/validationTargetResolver.test.ts` (új)
10. `tests/core/runtime/validationPrepare.test.ts`
11. `tests/core/runtime/validationPolicy.test.ts`
12. `tests/core/bubble/startBubble.test.ts`
13. `tests/core/reviewer/testEvidence.test.ts`
14. `README.md` (validation contract docs)

## Acceptance Criteria
1. Single-target és multi-target repo is támogatott ugyanazzal a contract rendszerrel.
2. Target `cwd` nélküli fals root check-ek megszűnnek.
3. Required gate fail blocker marad (`block_on_fail=true`).
4. Script-hiány kezelés policy-vezérelt (`if_missing`).
5. `document|auto|code` scope szerinti gate requirement működik targetenként.
6. Ambiguous target mapping esetén nincs találgatás, explicit target kérés történik.
7. Profile-hiány esetén backward-compatible fallback működik.

## Test Plan
1. Unit: profile parser/validator
   - schema parse
   - invalid schema hiba
   - invalid `if_missing` hiba

2. Unit: target resolver
   - selector match
   - ambiguous match fail
   - no match fail

3. Unit: prepare executor
   - target cwd-ben fut
   - cache hit skip
   - cache miss run
   - fail-fast hiba

4. Integration: startBubble
   - target resolve + prepare fut
   - ambiguous target actionable fail
   - resume ugyanazt a changed-path alapú targetfeloldási logikát követi

5. Integration: testEvidence
   - required commands contractból jönnek
   - scope-alapú (document/auto/code) különbségek

6. Regression
   - profile hiány -> legacy behavior

## Rollout Plan
1. Phase A: types + parser + validator + unit tests
2. Phase B: target resolver + lifecycle integration
3. Phase C: prepare cache + evidence integration
4. Phase D: verifier integration
5. Phase E: pilot egy valós multi-app repón
6. Phase F: docs + migration guide

## Risks
1. Target selector drift nagy repo-kban.
2. Prepare lassíthatja a startot.
3. Ambiguous mapping UX súrlódás.

Mitigation:
1. egyértelmű hibaüzenetek és target selector guideline,
2. prepare cache,
3. pilot rollout és finomhangolt selector guideline.

## Open Decisions
1. Changed paths forrása: git diff baseline vs task metadata vs explicit user scope?
2. Ambiguous mappingnál legyen-e configurable default target?

## Definition of Done
1. Pairflow core repo-agnosztikus marad.
2. Multi-app/heterogén repo-ban stabil target-alapú validation működik.
3. Lint/typecheck/test enforcement megbízható, fals root-cwd hiba nélkül.
