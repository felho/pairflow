# Pairflow PASS Boundary Validation Hardening (Phase 1)

## Status
- Date: 2026-03-08
- Owner: felho
- State: Planned

## Objective
Deterministic hard gate bevezetese az implementer oldali `pairflow pass` boundary-n, hogy code bubble atadas csak sikeres projekt-validacio utan tortenhessen.

## Context
A feedback loop jelenleg tul keson jelezhet: a validation hiba gyakran csak hosszu implementacios kor utan derul ki. A CI/commit hook csak masodlagos vedelem, nem a leghamarabbi visszacsatolas.

## Problem Statement
A Pairflow flow-ban nincs kotelezo, rendszer-szintu gate az implementer PASS ponton. Emiatt a handoff megtortenhet ugy is, hogy a projekt altal elvart ellenorzesek nem zoldok.

## Scope (Required-Now)
1. A gate primary enforcement celja: `review_artifact_type=code`.
2. Trigger pont: implementer oldali `pairflow pass`, az envelope append elott.
3. Kotelezo command forras: bubble config `[commands]`.
4. Required commandok: `commands.typecheck` es `commands.test`.
5. Vegrehajtas: determinisztikus sorrend + fail-fast.
6. Legacy kompatibilitas: ha bubble configban `review_artifact_type=auto` fordul elo, a Phase 1 gate applicability code-equivalent (ugyanaz a PASS-gate viselkedes, mint `code` esetben).

## Out of Scope (Phase 1)
1. Pre-commit/pre-push hook bevezetese.
2. CI/branch protection policy modositas.
3. Kulon `pairflow converged` hard gate.
4. Reviewer PASS policy attervezese.
5. Barmilyen product/app implementacios tartalomvaltozas e taskon kivul.

## Behavioral Contract

### BC1 - Applicability
Given `review_artifact_type=code` vagy `review_artifact_type=auto` bubble es implementer actor,  
When `pairflow pass` fut,  
Then a hard validation kotelezoen lefut PASS append elott.

### BC2 - Command Source
Given bubble config `[commands]`,  
When required commandokat feloldjuk,  
Then a rendszer kizarolag configbol szarmazo parancsokat hasznal, repo-hardcode nelkul.

### BC3 - Execution Policy
Given tobb required command,  
When a gate fut,  
Then a sorrend determinisztikus (`typecheck` -> `test`) es fail-fast.

### BC4 - Failure Behavior
Given barmely required command nem sikeres,  
When `pairflow pass` fut,  
Then a CLI non-zero exittel leall es PASS envelope nem kerul transcriptbe.

### BC5 - Diagnostics Contract
Given gate failure,  
When hiba riportalasa tortenik,  
Then az uzenet tartalmazza a hibas commandot, exit kodot, evidence/log hivatkozast es stabil, gepileg feldolgozhato reason code-ot a kovetkezo keszletbol:
1. `pass_validation_command_failed` - required command non-zero exit.
2. `pass_validation_command_missing` - required command hianyzik vagy ures a bubble configban.
3. `pass_validation_execution_error` - command runner inditasi/runtime hiba (ideertve timeoutot a meglovo runner policy szerint).

### BC6 - Success Behavior
Given minden required command sikeres,  
When `pairflow pass` fut,  
Then a normal PASS handoff valtozatlanul folytatodik.

### BC7 - Non-Code Safety
Given `review_artifact_type=document` bubble,  
When implementer PASS fut,  
Then ez a Phase 1 hard gate nem aktiv.

### BC8 - Missing Command Safety
Given a bubble configban barmely required command (`commands.typecheck` vagy `commands.test`) hianyzik vagy ures,  
When implementer `pairflow pass` fut,  
Then a command futtatasa helyett azonnali hard fail tortenik `reason_code=pass_validation_command_missing` mellett, PASS envelope append nelkul.

### BC9 - Reviewer Isolation
Given reviewer actor hajt vegre `pairflow pass` parancsot,  
When PASS feldolgozas tortenik,  
Then ez az implementer boundary hard gate nem valtoztatja a reviewer PASS semantics-et.

## Configuration Notes
1. Ha a projekt lintet is kotelezove akar tenni, composite verify scriptet adhat a command mezokben (pelda: `pnpm pairflow:verify`).
2. A task nem vezet be uj command-schema elemet; csak a meglovo `[commands]` mezokre epit.
3. Evidence infra location: repo/worktree `.pairflow/evidence/*.log` (pl. `lint.log`, `typecheck.log`, `test.log`) marad a canonical PASS `--ref` csatorna.

## Change Surface
Required:
1. `src/core/agent/pass.ts` - implementer PASS elotti hard gate.
2. `tests/core/agent/pass.test.ts` - success/failure/path coverage.

Optional (csak ha szukseges a contract-konzisztenciahoz):
1. `src/core/reviewer/testEvidence.ts` - kozos command/diagnosztika normalizalas.
2. `tests/core/reviewer/testEvidence.test.ts` - regresszio.
3. `src/core/runtime/tmuxDelivery.ts` es kapcsolodo docs - rovid guidance pontositas.

## Acceptance Criteria (Binary)
1. `review_artifact_type=code` es `review_artifact_type=auto` bubble-ben az implementer `pairflow pass` elott a required commandok determinisztikusan lefutnak.
2. Elso bukasnal a futas fail-fast megall, a parancs non-zero exittel ter vissza.
3. Gate bukasnal PASS envelope nem appendelodik a transcriptbe.
4. Gate siker eseten a PASS handoff normalisan megtortenik.
5. Required command forras bubble config `[commands]`; nincs repo-specifikus hardcode fallback.
6. Failure outputban szerepel: failed command, exit code, evidence/log utvonal, es a Phase 1 reason code keszlet egy eleme (`pass_validation_command_failed|pass_validation_command_missing|pass_validation_execution_error`).
7. `review_artifact_type=document` bubble viselkedese valtozatlan marad (Phase 1 gate nem fut).
8. Required command hiany/ures config eseten azonnali hard fail tortenik (`pass_validation_command_missing`) envelope append nelkul.
9. Composite verify script hasznalat dokumentalt marad (`commands.typecheck`/`commands.test` mezokon keresztul).
10. Erintett tesztek lefedik legalabb: pass success, pass fail, command source, missing-command, auto/document scope split, reviewer-pass regression.

## Test Mapping
1. AC1/AC2/AC3/AC4 -> `tests/core/agent/pass.test.ts`
2. AC5/AC6/AC8 -> `tests/core/agent/pass.test.ts` (+ opcionisan `tests/core/reviewer/testEvidence.test.ts`)
3. AC7 -> regresszios eset `review_artifact_type=document` scenariora
4. AC10 -> explicit scenario coverage: `auto` applicability, reviewer isolation, missing-command hard fail
5. AC9 -> docs coverage (task-level command contract pelda)

## Implementation Decisions (Resolved in this task)
1. Multi-command policy: fail-fast.
2. Command order: `typecheck` majd `test`.
3. Timeout policy: nem vezet be uj override mechanizmust; a meglovo command runner timeout policy ervenyes.
4. Reason code policy: a Phase 1 gate-hez kotott canonical keszlet `pass_validation_command_failed|pass_validation_command_missing|pass_validation_execution_error`.
5. `review_artifact_type=auto` policy: Phase 1-ben code-equivalent applicability.

## Notes
Ez a task szandekosan csak PASS-boundary validation hardening. CI/hook tovabbra is opcionlis, masodlagos defense-in-depth retegek maradnak.
