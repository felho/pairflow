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

## Evidence Handoff (Implementer)

- Run validation through the evidence-producing scripts (`pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check`) so logs are written under `.pairflow/evidence/`.
- Implementer `pairflow pass` handoff must include available evidence logs via `--ref`.
- If only a subset of validation commands ran, attach refs for what ran and explicitly state what was intentionally not executed.
- Missing expected evidence logs should be treated as incomplete validation packaging.

## Session Close

- Add a short progress update to the repository progress note (if present) or commit message context.

---

## Bubble Workflow Guardrails

Ezek kötelező működési szabályok bubble életciklusnál, hogy elkerüljük a rebase/merge instabil állapotokat.

1. **Bubble indítás előtti pre-flight**
   - `main` branchen indulj, tiszta worktree-vel (`git status` clean).
   - Nem lehet folyamatban merge/rebase/cherry-pick.
   - Ha a bubble input egy task fájl, akkor azt indítás előtt commitolni kell `main`-re, vagy kizárólag bubble branchen létrehozni. Ugyanazon path ne maradjon untracked `main`-en.

2. **Párhuzamos módosítás tiltás**
   - Bubble futása közben `main`-en ne módosítsd ugyanazokat a fájlokat, amiket a bubble branch is érint.
   - Ha mégis szükséges, előbb egyeztetés és explicit merge stratégia kell.

3. **Kötelező zárási sorrend**
   - `bubble approve` -> `bubble commit` -> `bubble merge` -> push.
   - A merge után kötelező ellenőrzés: branch tiszta, nincs rebase/merge state.

4. **Pull/Push biztonsági policy (repo-local)**
   - Alapértelmezett: `pull.rebase=false`, `branch.main.rebase=false`, `pull.ff=only`.
   - Automatikus pull-rebase flow kerülendő, mert bubble merge commitoknál ismétlődő konfliktust okozhat.

5. **Incidens recovery protokoll**
   - Ha `git status` szerint rebase fut: állj meg, ne resolve-olj reflexből.
   - Először állapotdiagnosztika (`git status`, `git reflog`, `git ls-files -u`), majd userrel egyeztetett döntés.
   - Alapértelmezett javaslat: indokolatlan/árva rebase esetén `git rebase --abort`, majd tiszta állapotból folytatás.

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
