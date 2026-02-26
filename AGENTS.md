# Pairflow Agent Guidelines

## Language

In the Codex or Claude Code chat I will use both in English (works better with dictation app) and Hungarian. If not stated otherwise, ALWAYS answer in Hungarian.

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
- Keep architecture aligned with `docs/pairflow-initial-design.md`.
- If protocol or state machine behavior changes, update the spec in the same work.

## Verification Before Commit

- Run lint, typecheck, and tests relevant to changed code.
- If any check is skipped, state it explicitly in the summary.

## Session Close

- Add a short progress update to the repository progress note (if present) or commit message context.

---

## Blocker & Escalation Policy

1. **Escalation-first kritikus parancsoknál**
   - Ha egy szükséges parancs sandbox/permission miatt elbukik, az első lépés az escalation kérés.
   - Nem szabad csendben alternatív megoldásra váltani user döntés nélkül.

2. **No silent downgrade**
   - Ha a fallback stack- vagy minőségváltást jelent (pl. TypeScript teszt helyett JavaScript, más toolchain), meg kell állni és jóváhagyást kérni.
   - Automatikus fallback csak akkor mehet, ha ekvivalens minőséget és viselkedést ad.

3. **Git history safety gate**
   - `git reset`, `rebase`, `cherry-pick`, `revert` csak explicit user jóváhagyással.
   - History-átírás előtt kötelező biztonsági pont (pl. reflog referencia / rövid mentési terv) és utána állapotellenőrzés.

4. **Pre-commit scope check**
   - Commit előtt kötelező ellenőrizni a stage-elt fájllistát.
   - Ha a stage-ben a kért scope-on kívüli fájl is van, commit előtt egyeztetni kell.

5. **Blocker decision checkpoint**
   - Elakadásnál röviden fel kell kínálni a döntést:
     - A) escalation és az eredeti megközelítés folytatása (ajánlott)
     - B) fallback, explicit tradeoff leírással
