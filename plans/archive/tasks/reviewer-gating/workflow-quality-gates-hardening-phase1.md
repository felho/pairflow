# Pairflow PASS Handoff Validation Hardening (Phase 1)

## Archive Status
- State: Superseded
- Archived On: 2026-03-28
- Superseded By:
  - `plans/tasks/workflow-quality-gates-phase1a-pass-validation-gate-core.md`
  - `plans/tasks/workflow-quality-gates-phase1b-pass-validation-reuse-recovery.md`
  - `plans/tasks/workflow-quality-gates-phase1c-meta-review-approval-parity.md`
- Archive Reason:
  - Az eredeti task tul sok egymasba csuszo concern-t fogott ossze egyetlen implementacios szeletben.
  - A tovabbi konvergenciahez kisebb, egy-authority-s vertikalis taskokra lett bontva.

## Status
- Date: 2026-03-08
- Owner: felho
- State: Superseded

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
6. Az orchestrator eloszor explicit PASS-boundary policy-allapotot old fel.
7. `policy_configured` allapotban eloszor trusted Pairflow-generated evidence ujrahasznosithatosagat ellenorzi.
8. Ha `policy_configured` allapotban a reuse feltetelek nem teljesulnek, az orchestrator maga futtatja a required validation command setet Pairflow-beli belso validation runnerrel, determinisztikus sorrend + fail-fast policy mellett.
9. A belso runner automatikusan canonical evidence logot es metadata artifactot ir a futtatott required validation commandokhoz.
10. A PASS-boundary policy feloldasakor a `policy_missing`, `policy_configured` es `policy_explicit_null` allapotok kulonbozoek; ezek nem kezelhetok ekvivalensnek.
11. Null command set csak explicit project/bubble policyval elfogadhato; implicit hiany vagy meg nem konfiguralt policy nem eleg trusted skip alapnak.

## Execution Sequence (Normative)
1. A gate eloszor actor + artifact-type alapon eldonti, hogy a Phase 1 hard gate egyaltalan alkalmazando-e; ez csak implementer + `review_artifact_type=code` esetben igaz.
2. A `[commands]` config/policy alapjan eloszor explicit policy-allapotot old fel: `policy_missing`, `policy_configured` vagy `policy_explicit_null`. Csak ezutan oldja fel az ordered required validation command setet es annak stable coverage markeret (`required_command_set_id` vagy ekvivalens azonosito), ha az adott allapot ezt ertelmezhetove teszi.
3. Ha az allapot `policy_missing`, a gate ezt onboarding/setup helyzetnek tekinti: nem trusted success, nem explicit null-set success, nem hard fail. Canonical metadata artifactot ir `trust_reason_code=pass_validation_policy_missing` jelzessel, trusted reuse shortcut nelkul, majd a BC7a szerinti untrusted reviewer `run_checks` direktivaval folytatja a PASS handoffot.
4. Ha az allapot `policy_explicit_null`, a gate runner futtatas nelkul sikeres a BC4c szerinti explicit null-set pathon, canonical metadata artifactot ir `commands=[]` tartalommal, majd a BC7 szerinti normal PASS handoffra lep tovabb.
5. Ha az allapot `policy_configured`, de a feloldott command set barmely kotelezo eleme hianyzik, invalid, nem futtathato, vagy ervenytelen implicit ures halmazra oldodik, a PASS a BC5/BC6/BC9 szerinti reviewer delivery nelkuli deterministic hard failure-rel megall.
6. Ha az allapot `policy_configured` es a feloldott command set ervenyes, az orchestrator megprobalja a legfrissebb Pairflow-generated validation evidence reuse-olhatosagat ellenorizni ugyanarra a bubble/round/allapot kombinaciora.
7. Ha a reuse check sikeres, a gate a canonical metadata artifactot es a hozza tartozo korabbi evidence refeket PASS inputkent ujrahasznositja, majd a normal PASS handoff valtozatlanul folytatodik az orchestrator altal meghatarozott reviewer direktivaval.
8. Ha a reuse check `stale`, `mismatch` vagy recovery-uncertainty okbol elbukik, az orchestrator ezt a BC3a szerinti reuse-denial diagnosztikakent rogziti, majd determinisztikusan atvalt a BC4 szerinti fallback futtatasra.
9. Ha a fallback futtatas sikeres, a gate friss canonical evidence logokat + metadata artifactot ir, ezeket a PASS evidence-hez csatolja, majd tovabblep a reviewer deliveryre.
10. Ha a fallback futtatas barmely kotelezo ponton elbukik, a PASS a BC5/BC6/BC9 szerinti reviewer delivery nelkuli deterministic feedbackkel megall.

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

### BC2a - Policy State Separation
Given a PASS-boundary validation policy a bubble config/policy surface-bol oldodik fel,  
When az orchestrator a gate-et ertekeli,  
Then pontosan egy explicit policy-allapot ervenyesul:
1. `policy_missing` - nincs meg explicit PASS-boundary validation policy konfiguracio,
2. `policy_configured` - van explicit policy es az legalabb egy kotelezo validation commandot jelol ki,
3. `policy_explicit_null` - van explicit policy es az szandekosan ures required setet jelol ki,
4. e harom allapot nem ekvivalens: `policy_missing` nem kezelheto se explicit null-set successkent, se configured hard-failurekent,
5. kizarolag `policy_configured` allapotban alkalmazhato a BC9 szerinti hard fail, es kizarolag `policy_explicit_null` allapotban ervenyes a BC4c szerinti runner-nelkuli success path.

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

### BC3a - Reuse Denial Semantics
Given a reuse check `pass_validation_evidence_stale`, `pass_validation_evidence_mismatch` vagy `pass_validation_evidence_recovery_uncertain` okbol meghiusul,  
When az orchestrator a PASS handoffot ertekeli,  
Then ez onmagaban nem terminal gate failure, hanem fallback-trigger: a denial okot metadata/diagnosztika szinten rogziti, majd a gate a BC4 szerinti sajat futtatassal folytatodik.

### BC4 - Orchestrator Fallback Execution
Given a trusted evidence reuse check barmely ponton elbukik,  
When a gate fut,  
Then az orchestrator Pairflow-beli belso validation runnerrel maga futtatja a feloldott required validation command setet determinisztikus sorrendben es fail-fast policyval.

### BC4a - Internal Runner Contract
Given egy required validation command futtatasa szukseges,  
When a PASS gate runner meghivodik,  
Then:
1. a konfiguralt shell commandot futtatja a bubble/worktree contextben,
2. a stdout/stderr kimenetet canonical evidence logba irja,
3. stabil eredmenyt ad vissza legalabb `command`, `exit_code`, `log_path` mezokkel,
4. nem probal framework-specifikus CI parser lenni; a gate dontes alapja a runner exit statusza es a sajat futtatasi eredmenye.

### BC4b - Fail-Fast Return Policy
Given a required validation command set tobb commandot tartalmaz,  
When az orchestrator fallback futtatast vegez,  
Then:
1. a commandokat a canonical required-set sorrendben futtatja,
2. az elso non-zero exit vagy execution error utan azonnal leall,
3. nem probalja ugyanabban a gate korben a kesobbi commandokat is lefuttatni,
4. az implementernek a mar lefutott commandok eredmenyeit es az elso bukas deterministic diagnosztikajat adja vissza.

### BC4c - Explicit Null-Set Success Path
Given a required validation command set uresre oldodik fel es ezt explicit project/bubble policy engedelyezi,  
When implementer `pairflow pass` fut code bubble-ben,  
Then a gate nem tekinti ezt command-hianynak, nem indit fallback runnert, canonical metadata artifactot ir `commands=[]` coverage-gel, es a normal PASS handoff valtozatlanul folytatodik.

### BC5 - Failure Behavior
Given barmely required validation command nem sikeres,  
When az orchestrator-owned gate fut,  
Then a PASS reviewerhez nem megy tovabb, deterministic feedback megy vissza az implementernek, es a parancs non-zero exittel all le.

### BC6 - Diagnostics Contract
Given terminal gate failure output vagy reuse-denial diagnosztika generalasa,  
When hiba/diagnosztika riportalasa tortenik,  
Then:
1. a terminal gate-failure uzenet tartalmazza a hibas commandot (ha van), exit kodot (ha van), evidence/log hivatkozast (ha van) es stabil, gepileg feldolgozhato terminal reason code-ot,
2. a canonical Phase 1 reason-code vocabulary normativan harom csoportra valik:
   - terminal gate-failure kodok:
     1. `pass_validation_command_failed` - required validation command non-zero exit,
     2. `pass_validation_command_missing` - `policy_configured` allapotban a feloldott required validation command set barmely kotelezo eleme hianyzik, invalid, nem futtathato, vagy az explicit policy ervenytelen implicit ures halmazra oldodik,
     3. `pass_validation_execution_error` - command runner inditasi/runtime hiba (ideertve timeoutot a meglovo runner policy szerint),
   - setup / onboarding diagnosztikak:
     4. `pass_validation_policy_missing` - nincs meg explicit PASS-boundary validation policy; ez nem trusted success, nem explicit null-set success, nem terminal hard failure, hanem onboarding/setup jelzes, amely reviewer `run_checks` direktivahoz vezet,
   - reuse-denial / fallback-trigger diagnosztikak:
     5. `pass_validation_evidence_stale` - letezo Pairflow-generated evidence mar nem reuse-olhato freshness/trust okbol; ez reuse-denial/fallback trigger, nem onallo terminal failure, ha a fallback futtatas sikeres,
     6. `pass_validation_evidence_mismatch` - letezo Pairflow-generated evidence nem ugyanarra a worktree state-re vagy command setre vonatkozik; ez reuse-denial/fallback trigger, nem onallo terminal failure, ha a fallback futtatas sikeres,
     7. `pass_validation_evidence_recovery_uncertain` - a reuse ota watchdog/reconcile recovery vagy ezzel ekvivalens runtime-helyreallitasi esemeny tortent, ezert a korabbi evidence trusted reuse-ja tiltott; ez reuse-denial/fallback trigger, nem onallo terminal failure, ha a fallback futtatas sikeres,
3. `pass_validation_policy_missing`, `pass_validation_evidence_stale`, `pass_validation_evidence_mismatch` es `pass_validation_evidence_recovery_uncertain` nem jelenhet meg terminal gate-failure reason code-kent, ha a handoff a maga allapotaban tovabb folytatodik.

### BC7 - Success Behavior
Given a trusted evidence reuse check sikeres, vagy a required validation command set explicit null-set policyval ervenyes `commands=[]` success pathra oldodik fel, vagy minden required orchestrator-run command sikeres,  
When `pairflow pass` fut,  
Then a normal PASS handoff valtozatlanul folytatodik, a gate altal eloallitott canonical evidence artifactok automatikusan PASS inputta valnak, es:
1. ha legalabb egy required command lefutott, a gate altal eloallitott evidence logok canonical PASS refekkent csatolodnak,
2. ha explicit null-set policy ervenyesult, canonical metadata artifact keszul, de evidence log ref nem kotelezo, mert nem futott command,
3. a reviewer `skip_full_rerun` vagy `run_checks` direktivat az orchestrator dontese alapjan kapja meg, beleertve az explicit null-set success pathot is.

### BC7a - Missing Policy Onboarding Path
Given a PASS-boundary policy `policy_missing` allapotra oldodik fel,  
When implementer `pairflow pass` fut code bubble-ben,  
Then a gate:
1. nem tekinti ezt trusted successnek,
2. nem tekinti ezt explicit null-set successnek,
3. nem hasznal trusted evidence reuse shortcutot,
4. canonical metadata artifactot ir `trust_reason_code=pass_validation_policy_missing` jelzessel es onboarding/setup warninggal,
5. a reviewernek untrusted `run_checks` direktivat ad, es a PASS handoff hard fail nelkul folytatodik.

### BC8 - Non-Code Safety
Given `review_artifact_type=document` bubble,  
When implementer PASS fut,  
Then ez a Phase 1 hard gate nem aktiv.

### BC9 - Missing Command Safety
Given a policy-allapot `policy_configured`, es a feloldott required validation command set barmely kotelezo eleme hianyzik, invalid vagy nem futtathato, vagy az explicit policy ervenytelen implicit ures halmazra oldodik,  
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
8. A `required_command_set_id` ugyanannak a resolver-outputnak az ordered command-id + resolved `run` string materializaciojabol kepzodik evidence-irasnal es reuse-ellenorzesnel; ad-hoc kulon hash-eles nem elfogadhato. Ugyanez a lezart policy az Implementation Decisions 12-ben is rogzitett.
9. Explicit null-set policy eseten is canonical metadata artifact jon letre `commands=[]` tartalommal; ilyenkor evidence log hianya nem hiba, mert nem futott command.

### Illustrative Config Shape (Not Required Deliverable For This Phase 1 Task)

Ez a shape csak illustrative target a policy-allapotok szemantikajahoz. A jelen task nem teszi implicit kotelezettsegge a bubble config schema/parser/renderer migraciojat ehhez a formatumhoz; eleg, ha a meglovo config surface determinisztikusan fel tudja oldani a `policy_missing|policy_configured|policy_explicit_null` allapotokat.

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
5. Ez az illustrative shape a stable command-id + required-set coverage egyik lehetseges celalakja; ha a jelenlegi schema ettol elter, ez a task nem implicit schema-migracios megbizas.

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
   - `reuse_denied_reason_code`, ha korabbi evidence vizsgalata fallbackre terelte a gate-et; egyebkent `null` (`pass_validation_evidence_stale|pass_validation_evidence_mismatch|pass_validation_evidence_recovery_uncertain`)
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
4. Explicit null-set policy eseten nincs runner-futtatas, de az orchestrator altal eloallitott metadata artifact marad az authority arra, hogy ezen a PASS boundary-n nem volt kotelezo futtatando validation command.
5. `policy_missing` eseten nincs trusted reuse shortcut, a metadata onboarding/setup jelzes marad, es a reviewer direktiva `run_checks`.

## Change Surface
Ez a Phase 1 task a gate-orchestration, diagnostics es evidence/trust logika pontositasarol szol. Bubble config schema/parser/renderer migracio az illustrative target shape fele nem implicit resze ennek a required change surface-nek.

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

Out of scope here:
1. Bubble config schema/parser/renderer migracio csak azert, hogy az illustrative target shape fizikailag megegyezzen a dokumentacios peldaval.

## Acceptance Criteria (Binary)
1. `review_artifact_type=code` bubble-ben az orchestrator a reviewer delivery elott mindig elvegzi a policy-allapot feloldasat, es `policy_configured` allapotban trusted evidence reuse checket is futtat.
2. Reuse csak `policy_configured` allapotban engedelyezett, ha egyezik a `head_sha`, a `git_status_hash`, a round, a required validation command set coverage, nincs a futas ota recovery-bizonytalansagi esemeny, es az evidence maximum `30 perc`es.
3. Reuse check bukasa eseten az orchestrator `policy_configured` allapotban determinisztikusan lefuttatja a required validation command setet fail-fast policyval.
4. Elso bukasnal a futas fail-fast megall, a PASS reviewerhez nem jut el, es deterministic feedback megy vissza az implementernek.
5. Gate siker eseten a PASS handoff normalisan megtortenik.
6. Required validation command set forrasa config/policy feloldas; nincs repo-specifikus hardcode fallback.
7. Terminal gate failure outputban szerepel a failed command/exit code/evidence-log adat, amikor az adott hibatipushoz ertelmezheto, es a canonical reason code keszletbol megfelelo kodot hasznal (`pass_validation_command_failed|pass_validation_command_missing|pass_validation_execution_error`); a `pass_validation_policy_missing|pass_validation_evidence_stale|pass_validation_evidence_mismatch|pass_validation_evidence_recovery_uncertain` kodok nem-terminalis setup/reuse-denial diagnosztikak.
8. `review_artifact_type=document` bubble viselkedese valtozatlan marad (Phase 1 gate nem fut).
9. `policy_configured` allapotban required validation command set hiany/invalid/nem futtathato/ervenytelen implicit ures config eseten azonnali hard fail tortenik (`pass_validation_command_missing`) reviewer delivery nelkul.
10. Composite verify script hasznalat dokumentalt marad (peldaul `commands.verify` jellegu project-defined commanddal).
11. A gate altal futtatott required validation commandok canonical evidence logjai automatikusan letrejonnek stable `.pairflow/evidence/*.log` utvonalakon.
12. A trusted metadata artifact canonical formaban letrejon es tartalmazza legalabb: `head_sha`, `git_status_hash`, `round`, `producer_role`, `generated_at`, `commands[]`, a required command set coverage markeret, es a conditional `reuse_denied_reason_code` mezot; explicit null-set policy eseten is letrejon `commands=[]` tartalommal.
13. A reviewer nem nyers metadata trust-logika alapjan dont, hanem az orchestrator `skip_full_rerun` / `run_checks` direktivaja alapjan.
14. Erintett tesztek lefedik legalabb: reuse success, reuse stale, reuse mismatch, recovery-uncertain reuse denial, orchestrator fallback run, pass success, pass fail, command source, configured-policy missing-command, execution_error, code/document scope split, reviewer-pass regression, evidence-log es metadata artifact letrehozas.
15. `policy_explicit_null` allapotban a gate kulon binary success case-kent viselkedik: runner futtatasa nelkul sikeres PASS boundary-t enged, canonical metadata artifactot ir `commands=[]` tartalommal, es a reviewer tovabbra is orchestrator-owned `skip_full_rerun` vagy `run_checks` direktivat kap.
16. `policy_missing` allapotban a gate onboarding/setup warninggal es `trust_reason_code=pass_validation_policy_missing` metadata jelzessel nem-trusted handoffot ad, reviewer `run_checks` direktivaval, trusted reuse shortcut es hard fail nelkul.

## Test Mapping
1. AC1/AC2/AC3/AC4/AC5 -> pass flow tests + orchestrator delivery tests
2. AC6 -> command source resolution tests
3. AC7/AC9/AC16 -> diagnostics + policy-state routing tests, beleertve a terminal failure, setup/onboarding es reuse-denial reason code csoportokat
4. AC8 -> regresszios eset `review_artifact_type=document` scenariora
5. AC10 -> docs coverage (task-level command contract pelda)
6. AC11/AC12 -> runner + metadata artifact tests
7. AC13 -> reviewer isolation / orchestrator directive routing
8. AC14 -> explicit scenario coverage: reuse success/failure, recovery-uncertain reuse denial, execution_error, configured-policy missing-command hard fail
9. AC15 -> explicit null-set success path

## Implementation Decisions (Resolved in this task)
1. Multi-command policy: fail-fast.
2. Command order: a feloldott required validation command set determinisztikus sorrendje; ezt a command-set resolver adja vissza.
3. Timeout policy: nem vezet be uj override mechanizmust; a meglovo command runner timeout policy ervenyes.
4. Reason code policy: a Phase 1 gate-hez kotott canonical keszlet `pass_validation_command_failed|pass_validation_command_missing|pass_validation_execution_error|pass_validation_policy_missing|pass_validation_evidence_stale|pass_validation_evidence_mismatch|pass_validation_evidence_recovery_uncertain`.
5. Evidence-letrehozas policy: a PASS gate runner maga irja a canonical `.pairflow/evidence/*.log` fajlokat; ez nem a projekt scriptjeinek felelossege.
6. Command execution policy: a runner thin wrapper, nem framework-specifikus parser/proxy.
7. Authority policy: a reviewer test rerun skipelesehez trusted evidence authority-je az orchestrator.
8. Freshness policy: maximum `30 perc`, ugyanaz a round, nincs recovery-esemeny a futas utan.
9. State match policy: reuse-hoz kotelezo a `head_sha` es `git_status_hash` egyezese.
10. PASS success eseten a gate-generated log refek automatikusan bekerulnek a PASS evidence-be.
11. Policy-state separation: `policy_missing`, `policy_configured` es `policy_explicit_null` nem ekvivalens allapotok; az elso onboarding path, a masodik enforced policy, a harmadik runner-nelkuli explicit success path.
12. Coverage marker policy: a `required_command_set_id` ugyanannak a resolver-outputnak az ordered command-id + resolved `run` string materializaciojabol jon letre evidence-irasnal es reuse-ellenorzesnel is. Ez a Configuration Notes 8-ban leirt invarians lezart valtozata.
13. Reuse-denial policy: a `pass_validation_evidence_stale|pass_validation_evidence_mismatch|pass_validation_evidence_recovery_uncertain` kodok fallback-trigger diagnosztikak, nem vegso gate failure-ok, ha a fallback futtatas sikeres.
14. Explicit null-set policy: code bubble-ben is sikeres PASS boundary-t jelenthet, de ekkor is canonical metadata artifact keszul `commands=[]` tartalommal.
15. Missing-policy behavior: `policy_missing` nem trusted success es nem hard failure; onboarding/setup warninggal es reviewer `run_checks` direktivaval folytatja a handoffot.

## Notes
Ez a task szandekosan csak PASS-boundary validation hardening. CI/hook tovabbra is opcionlis, masodlagos defense-in-depth retegek maradnak.

## Remaining Open Questions
No blocking open questions remain for Phase 1.

Implementation preference (non-blocking):
1. A magas szintu boundary legyen kulon PASS validation runner helper, akkor is, ha belul alacsony szinten kozos command execution utilityt hasznal.
