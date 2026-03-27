# Pairflow PASS Handoff Validation Hardening (Phase 1)

## Status
- Date: 2026-03-08
- Owner: felho
- State: Planned

## Objective
Deterministic, orchestrator-owned validation gate bevezetese az implementer `pairflow pass` handoff boundary-n, hogy code bubble atadas csak sikeres, trusted projekt-validacio utan tortenhessen, es a reviewer full rerun csak akkor maradjon meg, ha az orchestrator nem tud biztonsagosan trusted evidence-re tamaszkodni.

## Context
A feedback loop jelenleg tul keson jelezhet: a validation hiba gyakran csak hosszu implementacios kor utan derul ki. A CI/commit hook csak masodlagos vedelem, nem a leghamarabbi visszacsatolas.

## Problem Statement
A Pairflow flow-ban ma az implementer gyakran futtat validaciot, majd a reviewer sok esetben ujra lefuttatja ugyanazokat a checkeket, mert nincs eleg eros, orchestrator altal trusted modon ellenorizheto bizonyitek arra, hogy:
1. a required commandok tenyleg lefutottak,
2. ugyanarra a code/worktree allapotra futottak,
3. ugyanazokat a kotelezo commandokat fedik le,
4. es az evidence meg eleg friss a reviewer rerun biztonsagos kihagyasahoz.

## Scope (Required-Now)
1. A gate primary enforcement celja: `review_artifact_type=code`.
2. Trigger pont: implementer `pairflow pass` kezdeményezése utan, a reviewer delivery elott.
3. Authority owner: az orchestrator dont a validacio trust statuszarol; sem az implementer summary-claim, sem a reviewer sajat feltetelezese nem authority.
4. Kotelezo command forras: bubble config `[commands]`.
5. Required validation command set: a bubble/project altal PASS boundary-ra explicit modon kijelolt, mar feloldott validation commandok.
6. Az orchestrator eloszor trusted Pairflow-generated evidence ujrahasznosithatosagat ellenorzi.
7. Ha a reuse feltetelek nem teljesulnek, az orchestrator maga futtatja a required validation command setet Pairflow-beli belso validation runnerrel, determinisztikus sorrend + fail-fast policy mellett.
8. A belso runner automatikusan canonical evidence logot es metadata artifactot ir a futtatott required validation commandokhoz.
9. Null command set csak explicit project/bubble policyval elfogadhato; implicit hiany nem eleg trusted skip alapnak.

## Out of Scope (Phase 1)
1. Pre-commit/pre-push hook bevezetese.
2. CI/branch protection policy modositas.
3. Kulon `pairflow converged` hard gate.
4. Reviewer PASS policy attervezese.
5. Barmilyen product/app implementacios tartalomvaltozas e taskon kivul.
6. Publikus, altalanos celu `pairflow evidence run` vagy mas kulon standalone proxy CLI parancs bevezetese.
7. Framework-specifikus parser/proxy logika (Jest/Vitest/tsc/eslint mely kimenet-ertelmezese).

## Behavioral Contract

### BC1 - Applicability
Given `review_artifact_type=code` bubble es implementer actor,  
When `pairflow pass` fut,  
Then az orchestrator-owned validation gate kotelezoen lefut a reviewer delivery elott.

### BC1a - Authority Ownership
Given implementer handoff validationrol kell donteni,  
When PASS feldolgozas tortenik,  
Then a trusted/untrusted dontes kizárólag az orchestrator responsibility-je; a reviewer csak az orchestrator skip/run direktivajat kapja, nem nyers trust-logikat ertelmez.

### BC2 - Command Source
Given bubble config `[commands]`,  
When a PASS boundary-ra required validation command setet feloldjuk,  
Then a rendszer kizarolag config/policy altal feloldott parancsokat hasznal, repo-hardcode nelkul.

### BC3 - Trusted Evidence Reuse Check
Given letezik Pairflow-generated korabbi validation evidence,  
When az orchestrator a PASS handoffot ertekeli,  
Then csak akkor reuse-olhatja azt, ha egyszerre teljesul:
1. ugyanaz a `head_sha`,
2. ugyanaz a `git_status_hash`,
3. ugyanaz a review round,
4. a metadata ugyanazt a feloldott required validation command setet fedi le,
5. nincs a futas ota watchdog/reconcile recovery jellegu bizonytalansagi esemeny,
6. es az evidence legfeljebb `30 perc`e keszult.

### BC4 - Orchestrator Fallback Execution
Given a trusted evidence reuse check barmely ponton elbukik,  
When a gate fut,  
Then az orchestrator Pairflow-beli belso validation runnerrel maga futtatja a feloldott required validation command setet determinisztikus sorrendben es fail-fast policyval.

### BC4b - Fail-Fast Return Policy
Given a required validation command set tobb commandot tartalmaz,  
When az orchestrator fallback futtatast vegez,  
Then:
1. a commandokat a canonical required-set sorrendben futtatja,
2. az elso non-zero exit vagy execution error utan azonnal leall,
3. nem probalja ugyanabban a gate korben a kesobbi commandokat is lefuttatni,
4. az implementernek a mar lefutott commandok eredmenyeit es az elso bukas deterministic diagnosztikajat adja vissza.

### BC4a - Internal Runner Contract
Given egy required validation command futtatasa szukseges,  
When a PASS gate runner meghivodik,  
Then:
1. a konfiguralt shell commandot futtatja a bubble/worktree contextben,
2. a stdout/stderr kimenetet canonical evidence logba irja,
3. stabil eredmenyt ad vissza legalabb `command`, `exit_code`, `log_path` mezokkel,
4. nem probal framework-specifikus CI parser lenni; a gate dontes alapja a runner exit statusza es a sajat futtatasi eredmenye.

### BC5 - Failure Behavior
Given barmely required validation command nem sikeres,  
When az orchestrator-owned gate fut,  
Then a PASS reviewerhez nem megy tovabb, deterministic feedback megy vissza az implementernek, es a parancs non-zero exittel all le.

### BC6 - Diagnostics Contract
Given gate failure,  
When hiba riportalasa tortenik,  
Then az uzenet tartalmazza a hibas commandot, exit kodot, evidence/log hivatkozast es stabil, gepileg feldolgozhato reason code-ot a kovetkezo keszletbol:
1. `pass_validation_command_failed` - required validation command non-zero exit.
2. `pass_validation_command_missing` - a required validation command set barmely kotelezo eleme hianyzik vagy ures.
3. `pass_validation_execution_error` - command runner inditasi/runtime hiba (ideertve timeoutot a meglovo runner policy szerint).
4. `pass_validation_evidence_stale` - letezo Pairflow-generated evidence mar nem reuse-olhato freshness/trust okbol.
5. `pass_validation_evidence_mismatch` - letezo Pairflow-generated evidence nem ugyanarra a worktree state-re vagy command setre vonatkozik.

### BC7 - Success Behavior
Given a trusted evidence reuse check sikeres vagy minden required orchestrator-run command sikeres,  
When `pairflow pass` fut,  
Then a normal PASS handoff valtozatlanul folytatodik, a gate altal eloallitott evidence logok automatikusan canonical PASS refekkent csatolodnak, es a reviewer `skip_full_rerun` vagy `run_checks` direktivat az orchestrator dontese alapjan kapja meg.

### BC8 - Non-Code Safety
Given `review_artifact_type=document` bubble,  
When implementer PASS fut,  
Then ez a Phase 1 hard gate nem aktiv.

### BC9 - Missing Command Safety
Given a feloldott required validation command set barmely kotelezo eleme hianyzik, ures vagy nem futtathato,  
When implementer `pairflow pass` fut,  
Then a command futtatasa helyett azonnali hard fail tortenik `reason_code=pass_validation_command_missing` mellett, PASS envelope append nelkul.

### BC10 - Reviewer Isolation
Given reviewer actor hajt vegre `pairflow pass` parancsot,  
When PASS feldolgozas tortenik,  
Then ez az implementer boundary hard gate nem valtoztatja a reviewer PASS semantics-et.

## Configuration Notes
1. A projekt tobbfele validation commandot is kijelolhet PASS boundary-ra, peldaul `lint`, `typecheck`, `test`, `e2e`, `fitness`, `verify`.
2. A task nem a command selection policyrol szol, hanem a mar feloldott required validation command set futtatasarol es trustolhatosagarol.
3. Evidence infra location: repo/worktree `.pairflow/evidence/*.log` marad a canonical PASS `--ref` csatorna.
4. Phase 1 mechanizmus: a required validation commandok trusted evidence logjat a Pairflow belso runner hozza letre; nem elvaras, hogy a projekt sajat scriptjei maguktol logoljanak ide.
5. Canonical lognev policy Phase 1-ben: a runner command-kind vagy stable command-id alapu lognevet hasznal; a pontos fajlnev a feloldott command sethez kotott, nem fixen `typecheck.log`/`test.log`.
6. Null command set csak explicit project/bubble policyval ervenyes; implicit command-hiany eseten trusted skip nem engedelyezett.
7. Trusted metadata artifact location: `.pairflow/artifacts/pass-validation-evidence.json`.

### Recommended Config Shape (Phase 1 target)

Example:

```toml
[commands]
bootstrap = "pnpm install --frozen-lockfile"
validation_required = ["lint", "typecheck", "test"]

[commands.validation.lint]
run = "pnpm lint"

[commands.validation.typecheck]
run = "pnpm typecheck"

[commands.validation.test]
run = "pnpm test"

[commands.validation.e2e]
run = "pnpm test:e2e"
```

Explicit null-set example:

```toml
[commands]
validation_required = []
validation_required_explicit = true
```

Format rules:
1. `validation_required` sorrendje a canonical orchestrator execution order.
2. A `commands.validation.<id>.run` shell string a futtatando command.
3. A `validation_required` csak mar definialt `<id>`-kre hivatkozhat.
4. `validation_required = []` csak `validation_required_explicit = true` mellett ervenyes.
5. A Phase 1 target formatum celja a stable command-id + required-set coverage; ha a jelenlegi schema ettol elter, az implementacio reszekent ehhez kell kozeliteni.

## Mechanism Decision

Phase 1-ben a javasolt mechanizmus nem kulso CI parser es nem projekt-specifikus wrapper script, hanem egy orchestrator-owned, belso Pairflow validation runner + trusted evidence reuse model.

Runner contract (minimum):
1. `runPassValidationCommand({ kind, command, worktreePath, bubbleId })`
2. `kind`: project-defined stable validation command identifier (peldaul `lint`, `typecheck`, `test`, `e2e`, `fitness`, `verify`)
3. Eredmeny minimum mezoi:
   - `command`
   - `exitCode`
   - `logPath`
   - `durationMs`
   - opcionális `reasonCode`
4. A runner feladata:
   - shell command futtatasa,
   - stdout/stderr capture,
   - `.pairflow/evidence/<kind>.log` vagy ezzel ekvivalens stable log path irasa,
   - stabil execution result visszaadasa a PASS gate-nek.
5. A runner nem parse-olja framework-specifikusan a kimenetet; a success/failure alapja Phase 1-ben a process exit status es az inditasi/futtatasi hibak kezelese.
6. Keso bbi hardeningkent lehet kulon publikus CLI surface (`pairflow evidence run`), de ez nem Phase 1 kotelezettseg.

Trusted evidence metadata contract (minimum):
1. `.pairflow/artifacts/pass-validation-evidence.json`
2. Required fields:
   - `schema_version`
   - `bubble_id`
   - `round`
   - `producer_role` (`implementer` vagy `orchestrator`)
   - `generated_at`
   - `head_sha`
   - `git_status_hash`
   - `trust_level`
   - `trust_reason_code`
   - `commands[]`
   - `required_command_set_id` vagy ezzel ekvivalens stable coverage marker
3. `commands[]` minimum mezoi:
   - `kind`
   - `command`
   - `exit_code`
   - `log_path`
   - `duration_ms`

Trust decision policy:
1. Az implementer altal Pairflow runnerrel eloallitott evidence csak optimalizacios input lehet.
2. A reviewer rerun elhagyasarol az orchestrator dont a metadata + freshness/trust szabalyok alapjan.
3. Ha a reuse check nem sikeres, az orchestrator ujrafuttatja a required validation command setet es csak a sajat gate-altal validalt eredmenyt tekinti authoritative-nek.

## Change Surface
Required:
1. `src/core/agent/pass.ts` - PASS command orchestration entry a gate-be kotve.
2. `src/v11/application/pass/normalPassDeliveryExecution.ts` vagy a hozzatartozo orchestration/dependency wiring - orchestrator-owned validation decision a reviewer delivery elott.
3. Uj vagy kozositett validation runner helper (pelda: `src/core/runtime/passValidationRunner.ts`) a required validation command set futtatasa + evidence logiras + eredmeny normalizalas feladatra.
4. Uj trusted metadata artifact helper (pelda: `src/core/runtime/passValidationEvidence.ts`) a state fingerprint + freshness/trust + command-set coverage donteshez.
5. `tests/core/agent/pass.test.ts` vagy a relevans pass flow tesztek - success/failure/path coverage.

Optional (csak ha szukseges a contract-konzisztenciahoz):
1. `src/core/reviewer/testEvidence.ts` - kozos command/diagnosztika normalizalas.
2. `tests/core/reviewer/testEvidence.test.ts` - regresszio.
3. `src/core/runtime/tmuxDelivery.ts` es kapcsolodo docs - rovid guidance pontositas.

## Acceptance Criteria (Binary)
1. `review_artifact_type=code` bubble-ben az orchestrator a reviewer delivery elott mindig elvegzi a trusted evidence reuse checket.
2. Reuse csak akkor engedelyezett, ha egyezik a `head_sha`, a `git_status_hash`, a round, a required validation command set coverage, es az evidence maximum `30 perc`es.
3. Reuse check bukasa eseten az orchestrator determinisztikusan lefuttatja a required validation command setet fail-fast policyval.
4. Elso bukasnal a futas fail-fast megall, a PASS reviewerhez nem jut el, es deterministic feedback megy vissza az implementernek.
5. Gate siker eseten a PASS handoff normalisan megtortenik.
6. Required validation command set forrasa config/policy feloldas; nincs repo-specifikus hardcode fallback.
7. Failure outputban szerepel: failed command, exit code, evidence/log utvonal, es a Phase 1 reason code keszlet egy eleme (`pass_validation_command_failed|pass_validation_command_missing|pass_validation_execution_error|pass_validation_evidence_stale|pass_validation_evidence_mismatch`).
8. `review_artifact_type=document` bubble viselkedese valtozatlan marad (Phase 1 gate nem fut).
9. Required validation command set hiany/ures config eseten azonnali hard fail tortenik (`pass_validation_command_missing`) reviewer delivery nelkul, kiveve ha explicit null command set policy van beallitva.
10. Composite verify script hasznalat dokumentalt marad (peldaul `commands.verify` jellegu project-defined commanddal).
11. A gate altal futtatott required validation commandok canonical evidence logjai automatikusan letrejonnek stable `.pairflow/evidence/*.log` utvonalakon.
12. A trusted metadata artifact canonical formaban letrejon es tartalmazza legalabb: `head_sha`, `git_status_hash`, `round`, `producer_role`, `generated_at`, `commands[]`, es a required command set coverage markeret.
13. A reviewer nem nyers metadata trust-logika alapjan dont, hanem az orchestrator `skip_full_rerun` / `run_checks` direktivaja alapjan.
14. Erintett tesztek lefedik legalabb: reuse success, reuse stale, reuse mismatch, orchestrator fallback run, pass success, pass fail, command source, missing-command, explicit null-set policy, code/document scope split, reviewer-pass regression, evidence-log es metadata artifact letrehozas.

## Test Mapping
1. AC1/AC2/AC3/AC4/AC5 -> pass flow tests + orchestrator delivery tests
2. AC6/AC7/AC9 -> pass flow tests (+ opcionisan `tests/core/reviewer/testEvidence.test.ts`)
3. AC8 -> regresszios eset `review_artifact_type=document` scenariora
4. AC13/AC14 -> explicit scenario coverage: reviewer isolation, reuse success/failure, missing-command hard fail
5. AC10 -> docs coverage (task-level command contract pelda)
6. AC11/AC12 -> runner + metadata artifact tests

## Implementation Decisions (Resolved in this task)
1. Multi-command policy: fail-fast.
2. Command order: a feloldott required validation command set determinisztikus sorrendje; ezt a command-set resolver adja vissza.
3. Timeout policy: nem vezet be uj override mechanizmust; a meglovo command runner timeout policy ervenyes.
4. Reason code policy: a Phase 1 gate-hez kotott canonical keszlet `pass_validation_command_failed|pass_validation_command_missing|pass_validation_execution_error|pass_validation_evidence_stale|pass_validation_evidence_mismatch`.
5. Evidence-letrehozas policy: a PASS gate runner maga irja a canonical `.pairflow/evidence/*.log` fajlokat; ez nem a projekt scriptjeinek felelossege.
6. Command execution policy: a runner thin wrapper, nem framework-specifikus parser/proxy.
7. Authority policy: a reviewer test rerun skipelesehez trusted evidence authority-je az orchestrator.
8. Freshness policy: maximum `30 perc`, ugyanaz a round, nincs recovery-esemeny a futas utan.
9. State match policy: reuse-hoz kotelezo a `head_sha` es `git_status_hash` egyezese.
10. PASS success eseten a gate-generated log refek automatikusan bekerulnek a PASS evidence-be.
11. Null command set csak explicit project/bubble policyval ervenyes; ez nem lehet implicit config-hiany kovetkezmenye.

## Notes
Ez a task szandekosan csak PASS-boundary validation hardening. CI/hook tovabbra is opcionlis, masodlagos defense-in-depth retegek maradnak.

## Remaining Open Questions
No blocking open questions remain for Phase 1.

Implementation preference (non-blocking):
1. A magas szintu boundary legyen kulon PASS validation runner helper, akkor is, ha belul alacsony szinten kozos command execution utilityt hasznal.
