# Codex First Idea: Boundary Simplification Report

Date: 2026-03-14
Scope: initial situation report + solution direction
Status: draft

## 1) Executive Summary

A jelenlegi rendszer fo problemaja nem az, hogy hianyzik 1-2 extra guard, hanem hogy tobb kritikus felelosseg egyben van:
1. domain policy dontes
2. state transition
3. transcript append / artifact write
4. runtime delivery (tmux/session)
5. legacy kompatibilitasi logika

Emiatt:
1. novelheto a race-condition felulet
2. gyakori a "append sikerult, state write nem" kompenzacios minta
3. ugyanazok a guardok tobb helyen duplikalodnak
4. a modulok nehezen tesztelhetok izolaltan

Javaslat: retegzett, explicit boundary modell bevezetese (domain -> application -> ports -> infrastructure -> legacy_compat), fokozatos migracioval, big-bang rewrite nelkul.

## 2) Helyzetkep a jelenlegi kod alapjan

## 2.1 Tulsagosan nagy orchestration modulok

Megfigyeles:
1. `src/core/bubble/metaReviewGate.ts` ~2484 sor
2. `src/core/bubble/metaReview.ts` ~2101 sor
3. `src/core/agent/pass.ts` ~1581 sor
4. `src/core/human/approval.ts` ~692 sor
5. `src/core/convergence/policy.ts` ~614 sor

Kovetkezmeny:
1. policy + I/O + rollback + delivery + compatibility ugyanabban a modulban
2. nehez atlatni, melyik sor "dontes", melyik sor "mellekhatas"

## 2.2 Nem atomi mutacio minta (duplikalt hibaagakkal)

A kovetkezo minta tobb commandban ujra es ujra jelenik meg:
1. transcript append
2. state write expectedFingerprint/expectedState checkkel
3. hiba eseten recovery uzenet / kompenzacio

Evidencia:
1. `src/core/agent/pass.ts:1218`, `src/core/agent/pass.ts:1310`
2. `src/core/human/approval.ts:427`, `src/core/human/approval.ts:453`
3. `src/core/human/reply.ts:132`
4. `src/core/agent/askHuman.ts:132`
5. `src/core/bubble/watchdogBubble.ts:414`

Kovetkezmeny:
1. sok helyen kezzel irt, enyhen eltero rollback/recovery narrativak
2. nehez garantalni az egyseges viselkedest minden commandnal

## 2.3 Kulon lockolasi tengelyek, nincsen kozponti mutation boundary

Evidencia:
1. transcript lock: `src/core/protocol/transcriptStore.ts:282` (`withFileLock`)
2. state lock: `src/core/state/stateStore.ts:71` (`withFileLock`)
3. state optimistic checkek: `src/core/state/stateStore.ts:104`

Kovetkezmeny:
1. a mutacios sorrend commandonkent szetszorodik
2. race/fingerprint conflict kezelese sok helyre kerul
3. nincs egy kozponti "BubbleMutationRunner" keret

## 2.4 Domain policy es parser heuristics keveredese hot pathban

Evidencia:
1. summary parser logika: `src/core/convergence/policy.ts:59`
2. approval summary normalization + parity metadata: `src/core/bubble/approvalRequestEnvelope.ts`
3. approval dontesi policy + legacy allapot + run-failed fallback: `src/core/human/approval.ts:158`

Kovetkezmeny:
1. parser/compat korok vissza-visszajonnek bugfixkent
2. parity/source-of-truth hatar nehezen enforce-olhato

## 2.5 String-alapu metadata contract tulterhelve

Evidencia:
1. `delivery_target_role`, `findings_parity_status` stb.: `src/types/protocol.ts`
2. additional keys tobb helyrol dinamikusan irva (approval/meta-review/pass)

Kovetkezmeny:
1. konnyu typo vagy semantikailag eltero kulcsot bevinni
2. nehez compile-time szinten ervenyesiteni a route-specifikus metadata alakot

## 3) Miert lett ilyen bonyolult (gyokerok)

1. A rendszer fejlodese "issue-by-issue hardening" modon tortent, nem explicit boundary redesign szerint.
2. A stabilitasi cel miatt jogosan sok fail-closed guard kerult be, de ezek centralisitett policy engine helyett tobb commandban jelentek meg.
3. A legacy compatibility nyomas (regi allapotok, regi summary parser) a domain core helyett a command pathokra kerult.
4. A "transcript canonical" jo dontes volt, de a state projection/mutacio pipeline nem lett ehhez hasonloan egysegesitve.

## 4) Javasolt elegans modell (cel-architektura)

## 4.0 Architecture Invariants (explicit boundary + forbidden lista)

Cel:
1. A reteg-hatarok ne "ajanlasok" legyenek, hanem kovetheto, review-olhato szerzodes.
2. Refaktor utan se csusszon vissza a rendszer felelosseg-keveresbe.

Kotelezo reteg-sorrend:
1. `CLI` -> `Application/Orchestrator` -> `Domain` + `Infrastructure/Ports`
2. `Domain` tisztan policy/dontes reteg, I/O nelkul.

Forbidden szabalyok:
1. `Domain` NEM hivhat file/tmux/git/network/metrics I/O-t.
2. `Domain` NEM importalhat Node.js runtime API-t (`fs`, `child_process`, `path`, stb.) uzleti donteshez.
3. `CLI` NEM vegezhet kozvetlen state/transcript mutaciot; csak use-case/orchestrator hivast.
4. `Orchestrator` NEM implementalhat policy-dontest inline; policy a domainban legyen.
5. State-changing path NEM irhat state-et megkerulo uton; kotelezo a kozos mutation pipeline (`BubbleMutationRunner`).
6. Legacy parser/compat NEM szivaroghat vissza a domain core-ba; csak explicit legacy boundary-ben maradhat.

Kotelezo lifecycle transition gate:
1. Normal (nem-operator-force) state write elott kotelezo az `applyStateTransition()` hasznalata.
2. Kifejezetten tiltott a kezi spread alapu "next state" epites olyan pathon, ahol transition-validacio szukseges.
3. Az explicit operator-force utak kulon jelolt bypass pathon mehetnek, de kotelezo audit eventtel.
4. Lint/test guard:
   - lint/szabaly: tiltsa a kozvetlen `writeStateSnapshot(..., { ...state, ... })` mintat normal flow-ban,
   - teszt: legalabb egy architekturateszt ellenorizze, hogy a fo state-changing commandok `applyStateTransition`-on mennek at.

Kotelezo error contract (`PairflowError`):
1. Alap hibaforma: `code` + `message` + opcionis `context` + opcionis `cause`.
2. Tiltott a "message-only" ujracsomagolas olyan helyen, ahol strukturalt hibaadat mar rendelkezesre all.
3. Ha hibat ujracsomagolunk boundary valtashoz, a `code` kotelezoen megmarad, es a lenyegi `context` mezoket tovabbitani kell.
4. Retry/recovery donteseket elsodlegesen `code` alapjan kell hozni (ne szabad szoveges message-match legyen a fo mechanizmus).
5. Minimum context mezok state/transcript mutacios hiban: `bubble_id`, `state`, `expected_fingerprint`, `actual_fingerprint` (ha ertelmezheto), `operation_id` (ha van).

Bevezetesi minimum (fokozatos):
1. Elso korben eleg egyetlen `PairflowError` base class, nem kell teljes exception-hierarchia.
2. Kritikus pathokban (pass/converged/approval/meta-review gate) kezdjuk a `code + context` megtartast.
3. Adjunk tesztet legalabb egy reprezentativ flow-ra, hogy ujracsomagolas utan is megmaradjon a strukturalt hibaadat.

Kotelezo metrics boundary (`MetricsDispatcher` adapter):
1. Az orchestrator ne hivjon kozvetlen metrics I/O-t; csak domain/use-case esemenyt adjon at a dispatchernek.
2. A metrics delivery policy (validalas, dedupe, retry/backoff, warning/error kezeles) egy helyen, a dispatcherben legyen.
3. A metrics hiba alapertelmezetten ne torje meg a fo uzleti flow-t (best-effort/fail-open), kivetel csak explicit policy-vel.
4. A command/use-case tesztekben elsodlegesen az esemeny-kibocsatas legyen ellenorizve, ne a konkret metrics sink mellkhatasai.

Bevezetesi minimum (fokozatos):
1. Elso korben eleg egy vekony `MetricsDispatcher` interface + jelenlegi emitter adapterezese.
2. Kritikus command pathokban fokozatos atallitas: `pass`, `converged`, `approval`, `start/commit`.
3. Adjunk legalabb egy integracios tesztet arra, hogy metrics hiba mellett a fo command kimenet valtozatlanul sikeres marad.

Kotelezo config boundary (`ConfigLoader` + TOML util egységesítés):
1. A TOML parse/merge/normalize logika egyetlen kozos util-ben legyen; tilos duplikalt parser segedeket fenntartani tobb config modulban.
2. A config precedence (global -> repo -> bubble) legyen egy helyen formalizalva.
3. Minden config-hozzaferes orchestrator/adaptern keresztul tortenjen, ne ad-hoc fileolvasassal commandonkent.

Decision-point config read policy (safe mezok):
1. Safe mezoknel (pl. `max_rounds`, `watchdog_timeout_minutes`, `quality_mode`) a rendszer a dontesi ponton olvassa a friss configot.
2. Strukturális mezok (pl. agent mapping, work_mode, base_branch, bubble_branch) mid-flight ne valtozzanak; ezek restart-kotelesek.
3. Minden operator config valtoztatast audit eventtel kell rogzitani (`OPERATOR_CONFIG_CHANGE`), meg akkor is, ha a valtozas csak kesobbi decision-pointon ervenyesul.

Bevezetesi minimum (fokozatos):
1. Elso korben csak a TOML util egyesites + `ConfigLoader` interface bevezetese.
2. Safe mezok listajat explicit modon rogzitjuk (allowlist), es csak ezeket olvassuk decision-pointban.
3. Adjunk legalabb egy regresszios tesztet arra, hogy safe mezovaltozas ujrainditas nelkul ervenyesul, strukturális mezonel pedig "restart required" viselkedes marad.

Migracios pilot order (kotelezo sorrend):
1. Pilot #1: `ConvergencePolicy` extraction pure modulba (behavior-valtozas nelkul).
2. Pilot #2: `BubbleMutationRunner` bekotes 1-2 kritikus commandra (elso korben javasolt: `pass` + `approval` vagy `reply`).
3. Pilot #3: gate pipeline/adapternyereseg fokozatos bovitese (gate-ek, agent adapter boundary, metrics/config boundary veglegesitese).

Miert ez a sorrend:
1. Pilot #1 ad gyors attekinthetosegi nyereseget alacsony runtime kockazattal.
2. Pilot #2 adja a legnagyobb stabilitasi nyereseget (mutacios konzisztencia), de kontrollalt blast radius-szal.
3. Pilot #3 csak stabil mutacios alapra epulve indul, igy kisebb a regresszios kockazat.

Pilot exit kriterium (phase gate):
1. Minden pilot utan kotelezo regresszios futas a kritikus pathokon (`pass`, `converged`, `approval`, `meta-review gate` relevans reszei).
2. Uj pilot csak akkor indulhat, ha az elozo pilot utan nincs nyitott P1 regresszio.
3. Ha pilot kozben policy drift jele van, rollback a pilot scope-on belul es ujratervezes (nem tovabblépés).

Review checklista (minimum):
1. Uj policy logika -> domain modulban van?
2. Uj I/O hivas -> infrastructure adapteren megy?
3. Uj command -> orchestratoron keresztul mutal?
4. Uj exception mapping -> strukturalt `code` + `context` informacio megmarad?

## 4.1 Retegzes

1. `domain` (pure)
2. `application` (use-case orchestration)
3. `ports` (interface-ek)
4. `infrastructure` (fs/tmux/runtime adapterek)
5. `legacy_compat` (regi parser/allapot/fallback csak itt)

## 4.2 Domain objektumok (minimal, de eleg eros keszlet)

1. `BubbleAggregate`
2. `RoundContext`
3. `ReviewVerdict`
4. `MetaReviewGateDecision`
5. `ApprovalDecisionPolicyResult`
6. `MutationIntent`
7. `DomainEvent`

Fopont:
1. a domain objektumok nem olvasnak fajlt, nem hivnak tmuxot
2. csak dontest es eventet adnak vissza

## 4.3 Application use-case objektumok

1. `EmitPassUseCase`
2. `EmitConvergedUseCase`
3. `ApplyMetaReviewGateUseCase`
4. `SubmitMetaReviewUseCase`
5. `EmitApprovalDecisionUseCase`

Ezek feladata:
1. input validation
2. domain policy hivasa
3. mutation runner hasznalata
4. notifier/metrics adapter meghivasa

## 4.4 Ports

1. `TranscriptRepository`
2. `StateRepository`
3. `ArtifactRepository`
4. `SessionDeliveryPort`
5. `MetricsPort`
6. `ClockPort`
7. `IdGeneratorPort`

## 4.5 Infrastructure

1. jelenlegi `stateStore.ts` -> `StateRepository` adapter
2. jelenlegi `transcriptStore.ts` -> `TranscriptRepository` adapter
3. jelenlegi `tmux*` modulok -> `SessionDeliveryPort` adapter
4. jelenlegi artifact read/write -> `ArtifactRepository` adapter

## 4.6 Legacy compat boundary

1. `legacy_summary_parser` logika elkulonitve
2. legacy allapot route/fallback kulon policy adapterben
3. domain oldalon canonical structured claim az elso

## 5) Kritikus uj absztrakcio: BubbleMutationRunner

Cel:
1. egyetlen helyen kezelni a transcript + state mutaciot
2. egyseges conflict/retry/recovery reason code schema
3. minden command ugyanazt a tranzakcios mintat hasznalja

Minta:
1. read snapshot
2. apply domain command -> events + nextState
3. append envelopes/events
4. persist nextState with expected fingerprint/state
5. emit standardized mutation outcome

Transcript-first ADR (kotelezo formalizalas):
1. Kulon ADR-ben rogzitjuk, hogy normal mutacios flow-ban a sorrend kotelezoen:
   - eloszor transcript append,
   - utana state persist.
2. Az ADR kimondja, hogy a transcript a canonical source-of-truth recovery/reconcile helyzetben.
3. Tiltott a state-first sorrend normal command pathon.
4. Kivetel csak explicit, dokumentalt operator-force path lehet, kotelezo audit eventtel.
5. Minden olyan valtozas, ami a mutacios sorrendet erinti, ADR-hivatkozast es celzott regresszios tesztet igenyel.

Eredmeny:
1. jelentos duplikacio csokkenes
2. race/rollback kezeles konzisztens lesz
3. az orchestrator file-ok drasztikusan karcsusodnak

Kotelezo szabaly (must):
1. Minden state-changing command kotelezoen ugyanazon mutation pipeline-on fusson.
2. Minden ilyen command ugyanazt a recovery es reason-code szerzodest adja vissza.

## 6) Konkret decomposition terkepezes (mostani -> cel)

1. `src/core/agent/pass.ts`
   - policy resz -> `domain/pass/PassPolicy.ts`
   - handoff resz -> `domain/round/RoundContextPolicy.ts`
   - IO/orchestration -> `application/EmitPassUseCase.ts`
2. `src/core/agent/converged.ts`
   - policy check -> `domain/convergence/ConvergencePolicy.ts`
   - gate orchestration -> `application/EmitConvergedUseCase.ts`
3. `src/core/bubble/metaReviewGate.ts`
   - route/parity dontes -> `domain/metaReview/MetaReviewGatePolicy.ts`
   - recover/dispatch orchestration -> `application/ApplyMetaReviewGateUseCase.ts`
4. `src/core/bubble/metaReview.ts`
   - canonical report normalization -> `domain/metaReview/MetaReviewReportPolicy.ts`
   - runner/process orchestration -> `application/RunMetaReviewUseCase.ts`
5. `src/core/human/approval.ts`
   - approve override policy -> `domain/approval/ApprovalPolicy.ts`
   - command I/O -> `application/EmitApprovalDecisionUseCase.ts`

## 7) Fokozatos migracios terv (no big-bang)

## Phase A - Policy extraction (biztonsagos, gyors nyereseg)

1. policy fuggvenyek kivagasa pure modulokba
2. behavior valtozas nelkul delegalas
3. regresszio tesztek valtozatlanul zolden maradjanak

## Phase B - Mutation runner bevezetes

1. kozos `BubbleMutationRunner` bevezetes
2. pass/approval/reply/ask-human path atallas erre
3. unified reason code + error envelope policy

## Phase C - Meta-review gate kettévagas

1. policy modul (route/parity)
2. orchestration modul (state/transcript/tmux/recover)
3. targeted race-condition tesztmatrix

## Phase D - Legacy compat izolacio

1. legacy parser/allapot fallback kulon adapterbe
2. canonical structured claim elsosege minden hot pathban
3. parity rules centralizalasa

## Phase E - Opcionalis tovabblepes (ha kell)

1. state projection erosebb formalizalasa transcript eventekbol
2. checkpoint + replay tooling
3. recovery automatizalas

## 8) Elfogadasi kriteriumok (stabilitasfokusz)

1. Nincs behavior regresszio a jelenlegi critical pathokon (pass/converged/meta-review/approval).
2. "append succeeded but state failed" kezeles minden commandban ugyanazt a mutation keretet hasznalja.
3. `metaReviewGate` es `pass` file merete erdemben csokken (felelossegek szetvalasztva).
4. Domain policy modulok onallo unit tesztekkel fedettek (I/O nelkul).
5. Legacy compatibility logika explicit boundary moge kerul.

## 9) Kockazatok es mitigacio

1. Kockazat: refaktor kozben finom policy drift.
   - Mitigacio: golden path regression test matrix marad, phase-by-phase atallas.
2. Kockazat: mutation runner hibas bevezetese globalis hatassal.
   - Mitigacio: eloszor csak 1-2 command migracio, feature-flag szeru rollout.
3. Kockazat: legacy pathok rejtett fuggosege.
   - Mitigacio: legacy_compat adapter explicit ownership, snapshot alapu backtest.

## 10) Rogton indithato kovetkezo lepesek

1. `BubbleMutationRunner` interface draft + ADR rovid forma.
2. `PassPolicy` pure modul kivagasa behavior-valtozas nelkul.
3. `ApprovalPolicy` pure modul kivagasa behavior-valtozas nelkul.
4. commandonkenti common mutation outcome schema bevezetese.

## 11) Operational Flexibility Requirements (MVP, szukitett)

Ez a blokk szandekosan minimal. A cel: operativ rugalmassag noveles keves uj komplexitassal.

MVP scope (this phase):
1. operator state-intervention (`state set`)
2. operator agent-intervention (`agent restart`)
3. bubble control-plane intervention (`bubble reset` a worktree/branch megtartasaval)

Minden fenti commandra kozosen kotelezo a kovetkezo harom guardrail:
1. `reason` kotelezo mezokent
2. `operation_id` idempotencia-kulcs (CLI auto-generalja, operator retry eseten explicit megadhatja)
3. audit event kotelezoen a transcriptben

Kotelezo minimal metadata minden operator eventhez:
1. actor
2. operation_id
3. reason
4. timestamp
5. command_type

Elfogadasi minimum (MVP):
1. minden operator command elutasit `reason` nelkul
2. minden operator command idempotens `operation_id` menten
3. minden operator command audit eventet ir transcriptbe

MVP+1 jelolt (csak ha egyszeruen szallitato):
1. `pairflow bubble reconcile` light valtozat transcript alapjan.
2. Scope: state ujraepites transcriptbol es eltérés esetén state visszairas.
3. Nincs benne extra quarantine/partial-recovery mechanika.
4. Ugyanaz a 3 guardrail kotelezo (`reason`, `operation_id`, `audit event`).
5. Egyszeru outcome: `applied | no_change | rejected`.

Out of scope / Later (ebben a fazisban NEM implementaljuk):
1. `skip-gate` altalanos operator command.
2. `inject` (operator-to-agent ad-hoc uzenetkuldes) altalanositett formaja.
3. Hot-config teljeskoru, strukturális mezoket is erinto mid-flight valtoztatas.
4. Teljes intervencios queue/quarantine framework.
5. RBAC/policy-tenant szintu operator jogosultsagkezeles.

Scope gate szabaly:
1. Ami ebben a blokkban `Out of scope / Later`, az csak kulon explicit jovahagyassal hozhato vissza az aktualis fazis MVP-jebe.
2. PR review soran ez hard gate: ne csusszon be "gyorsan meg ez is" jellegu valtozas.

Kovetkezo kritikus operativ irany (evidence-based agent health):
1. A watchdog ne fix idolimit alapjan eszkalaljon, hanem elorehaladas bizonyitek alapjan.
2. Fobb pain pointok:
   - az agent valojaban dolgozik 30+ percig, de timeout miatt feleslegesen eszkalalunk,
   - az agent vizualisan "el", de valojaban beragadt/crashelt (nem irhato, nem reagal),
   - kulso prompt/update (pl. CLI update kerdes) miatt a folyamat blocked allapotba kerul.
3. Javasolt minimal health modell:
   - `working`: latszik elorehaladas,
   - `idle_but_alive`: fut, de nincs lathato progress,
   - `blocked`: interakcios prompt/update miatt varakozik,
   - `dead`: nem reagal vagy nem irhato.
4. Elorehaladas jelek (evidence):
   - tmux pane tartalom valtozas (snapshot hash/diff),
   - uj protocol esemeny a transcriptben,
   - process/pane irhatosag es eletjel.
5. Kotelezo policy-elv: csak a `dead` allapot triggereljen eros beavatkozast; `working` allapotban ne legyen timeout-eszkalacio.
6. Ennek a fazisnak minimuma: architekturaban legyen helye egy `AgentHealthAssessor` komponensnek; teljes automata health/restart matrix nem kotelezo ebben a korben.

## 12) Evidence Model Shift (current vs future simulation)

Lenyeg:
1. Ne az agent allitasat validaljuk, hanem a runtime altal rogzitett bizonyitekot.
2. Az agent nem "evidence-t gyart", hanem hivatalos futasi utvonalon keres check-et.
3. A policy-gate csak structured evidence rekordbol dont.

### 12.1 Implementer test evidence (PASS elott)

Current:
1. Agent summary + `--ref` alapon ad jelzest (pl. tests/typecheck "pass").
2. Rendszer regex/pattern alapon probal command/exit/completion jeleket kinyerni.
3. Elteto megfogalmazasokra sok hardening patch kell.

Future:
1. Agent hivatalos check-runneren futtat (nem szabad formu evidence szoveg).
2. Runner automatikusan ir structured evidence rekordot (`run_id`, `command_id`, `exit_code`, `log_ref`, `log_hash`, `worktree_fingerprint`).
3. `pairflow pass` csak `evidence_run_id`-ra hivatkozik.
4. Gate csak evidence rekordbol dont, summary nem policy input.

### 12.2 Reviewer findings evidence

Current:
1. Reviewer `--finding` + `--ref` mezoket ad.
2. Policy tobb helyen validal (severity/evidence/claim-source/szoveges konzisztencia).

Future:
1. Findings payload marad, de kotelezoen structured evidence bindinggal.
2. Minden findinghoz formalis evidence mezok tartoznak (`evidence_refs`, `evidence_type`).
3. Gate a schema-valid payload alapjan dont; summary csak emberi magyarazat.

### 12.3 Meta-review parity evidence

Current:
1. report_json + summary + parity guard egyutt kezelve, sok compatibility aggal.
2. Visszatero patch tema: claim/parity/run-link konzisztencia.

Future:
1. Meta-review submit kotelezo structured parity contracttal (`meta_review_run_id`, `findings_claim_state/source`, `findings_count`, `findings_digest_sha256`, `findings_artifact_ref`).
2. Gate csak structured mezokbol + artifactbol szamol parity-t.
3. Summary itt sem policy input.

### 12.4 Miert robusztusabb

1. Nem-determinisztikus agent szoveg helyett determinisztikus runtime meres lesz a forras.
2. Kevesebb regex/phrase patch, kevesebb edge-case drift.
3. Jobban auditalhato dontesek (kiolvashato, milyen evidence rekord alapjan dontottunk).

### 12.5 Pragmatikus bevezetes (kompatibilis)

1. `evidence_v2` structured schema bevezetese.
2. Gate prioritas: eloszor `evidence_v2`, summary parser csak compatibility warning.
3. Fokozatos atallas utan summary parser policy szerep kivezetese.

## 13) Composable Gate Pipeline (middleware-szeru modell)

Cel:
1. A policy ne egy nagy osszefolyo logika legyen, hanem egymas utan futtathato gate-ek lancolata.
2. Gate viselkedes legyen finoman allithato repo szinten, bubble-level override lehetoseggel.

Gate contract (egyseges):
1. Bemenet: `GateContext` (round, findings, claim state/source, evidence status, bubble/repo policy profile).
2. Kimenet: `pass | warn | block` + `reason_code` + `diagnostics`.
3. Minden gate tisztan policy dontes legyen, side effect nelkul.

GateContext bovitmeny (history-aware gate-ekhez):
1. `current_round`
2. `current_review_snapshot` (aktualis findings/claim/evidence allapot)
3. `history_window` (utolso N round tomoritett policy-nezete)
4. `history_aggregates` (pl. blocker round count, only-P3 round count, streakek)
5. `previous_gate_outcomes` (ha gate-lanc visszamenolegesen is hivatkozik korabbi dontesre)

Policy elv:
1. A gate-ek ne nyers transcriptet olvassanak, hanem elore osszeallitott history inputot.
2. Igy megmarad a determinisztikus, gyors gate-futtatas.

Execution modell:
1. Gate engine fix sorrendben futtatja a gate-eket.
2. `block` azonnal megallitja a tovabbi policy utat.
3. `warn` felhalmozhato diagnosztika (nem allitja meg a flow-t).
4. Donto kimenet egysegesen kerul vissza a command path-nak.

Konfiguracio elv (repo-first):
1. Repo-szinten definialjuk az aktiv gate profilt (`pairflow.toml`).
2. Bubble szinten csak override/disable legyen (nem teljesen uj policy nyelv).
3. Korlatozott gate parameter domain maradjon (ne legyen altalanos script/DSL).

Minimal gate tipusok (kezdo csomag):
1. `min_reviewer_runs_gate` (pl. legalabb 2 reviewer pass).
2. `round_window_non_blocking_gate` (pl. bizonyos round windowban P2 policy).
3. `structured_claim_consistency_gate` (claim state/source + findings payload konzisztencia).
4. `evidence_trust_gate` (trusted/untrusted evidence status alapu dontes).

History-alapu gate pelda:
1. `round >= 3` es aktualis reviewer kimenet only-`P3` esetben konvergalhato.
2. Opcionis erosites: utolso K reviewer roundban nem volt `P0/P1`.

Bevezetesi taktika (alacsony kockazat):
1. Shadow mode: uj gate engine dontes csak logol, nem enforce-ol.
2. Diff monitor: regi es uj policy dontes kulonbsegek merese.
3. Csak stabil egyezes utan kapcsoljuk enforce modba.

## 14) Agent Adapter Boundary + Session Lifecycle Policy

Cel:
1. Pairflow core ne konkret agent-nevekre legyen huzalozva (`codex|claude` hardcode).
2. Legyen altalanos agent interface, es konkret agentenkent adapter/connector.
3. Agent-valasztas konfiguralhato legyen repo szinten, bubble-level override lehetoseggel.

Adapter boundary elv:
1. Core policy/gate/evidence dontes Pairflow-ban marad.
2. Az adapter csak agent-runtime interakcioert felel (session inditas, uzenetkuldes, health, restart).
3. Uj agent bevezetese adapter feladat legyen, ne core policy atiras.

Minimal adapter contract:
1. `start_session`
2. `send_instruction`
3. `health_check`
4. `restart_session`
5. `capture_progress_snapshot`

Session lifecycle policy (explicit, role-szinten):
1. `persistent`: bubble-elettartam alatt ugyanaz a session marad.
2. `per_round`: minden round elejen uj session indul.
3. Ezt ne implicit kod viselkedes adja, hanem konfiguralt policy.

Konfiguracio elv:
1. Repo szinten: `agents.implementer`, `agents.reviewer`, `agents.meta_reviewer` + role-level lifecycle policy.
2. Bubble szinten csak celzott override.
3. MVP-ben eleg ket built-in adapter (`codex`, `claude`), plugin-rendszer nem kotelezo.

Miert fontos ez most:
1. Egyszerubb agent-csere kiserletek (pl. reviewer=codex).
2. Kevesebb ad-hoc kulonag a core flow-ban.
3. Stabilabb architekturahatar: agent-specifikus kulonbsegek adapterbe kerulnek.

## 15) Prompt Pack Registry (YAML) + Model-specific Override

Cel:
1. A promptok ne legyenek szetszorva tobb orchestration modulban.
2. A reviewer/implementer/meta-reviewer promptok use-case alapon egy helyen legyenek.
3. Legyen egyszeru text-ujrahasznalat (`variables`) es ritka, de formalis model override (`codex|claude`).

### 15.1 File-structure elv (egy domain/use-case = egy file)

Ne az legyen, hogy "egy prompt = egy file", hanem:
1. `prompts/shared.yaml`
2. `prompts/reviewer.yaml`
3. `prompts/implementer.yaml`
4. `prompts/meta-reviewer.yaml`

Minden domain file tartalmazza:
1. `variables` (ujrahasznalhato szovegek)
2. `fragments` (stabil ID-val cimkezett prompt-reszek)
3. `scenarios` (hogyan epul ossze egy adott helyzet vegso promptja)
4. `model_overrides` (ritka, agent/model-specifikus feluliras)

### 15.2 Minimal YAML contract (szandekosan egyszeru)

```yaml
version: 1
domain: reviewer

variables:
  cmd_direct: "Execute pairflow commands directly (no confirmation prompt)."
  scope_guard: "Summary scope guardrail: scope statements must cover only current worktree changes."

fragments:
  ontology_reminder:
    text: "Severity Ontology v1 reminder: {{ontology_text}}"
  pass_contract:
    text: "Required reviewer output contract (machine-checkable)..."

scenarios:
  reviewer_start:
    compose:
      - ontology_reminder
      - pass_contract
      - inline: "{{cmd_direct}}"

  reviewer_handoff_pass:
    compose:
      - ontology_reminder
      - inline: "{{scope_guard}}"
      - inline: "{{cmd_direct}}"

model_overrides:
  claude:
    scenarios:
      reviewer_handoff_pass:
        append:
          - inline: "Claude-specific clarification..."
  codex:
    scenarios:
      reviewer_handoff_pass:
        replace:
          pass_contract:
            text: "Codex-specific stricter contract..."
```

### 15.3 Kotelezo egyszerusitesi guardrailek (hogy ne legyen uj bonyolultsag)

1. A YAML ne legyen altalanos DSL: nincs ciklus, nincs script, nincs bonyolult felteteles nyelv.
2. A felteteles policy logika maradjon TypeScriptben (`scenario` valasztas es context epites).
3. A template nyelv legyen minimal (`{{var_name}}`), beagyazott expression nelkul.
4. Az override mutaciok korlatozottak legyenek: `append | replace | remove`.
5. Minden fragment kapjon stabil ID-t es verziot (`reviewer.pass_contract.v1` jelleggel).

### 15.4 Render pipeline (determinista, debugolhato)

1. `PromptScenarioResolver` kivalasztja a scenariot (pl. `reviewer_handoff_pass`).
2. `PromptComposer` feloldja `variables` + `fragments` + `compose` sorrendet.
3. `ModelOverrideApplier` alkalmazza az agent/model-specifikus felulirast (ha van).
4. `PromptRenderer` legeneralja a vegso textet.
5. `PromptRenderArtifactWriter` elmenti a render eredmenyt:
   - vegso prompt szoveg,
   - hasznalt fragment ID-k,
   - override informacio,
   - context fingerprint/hash.

Javasolt artifact path:
1. `.pairflow/artifacts/prompts/<timestamp>-<bubble>-<role>-<scenario>.json`
2. opcionisan mellette `.md` preview.

### 15.5 Miert oldja meg a mostani pain pointot

1. Egy helyen latszik, adott szerephez milyen prompt-scenariok vannak.
2. A kozos mondatok nem masolva vannak, hanem `variables`/`fragments` alapon ujrahasznalva.
3. Agent-specifikus finomhangolas tamogatott, de nem eroszakolja ra magat a teljes rendszerre.
4. A vegso prompt visszanezheto artifactbol, ezert gyorsabb a hibaelemzes es a policy tuning.
5. A jelenlegi tesztfegyelem megtarthato, de atallhatunk scenario-level golden render tesztekre.

### 15.6 Bevezetesi strategia (alacsony kockazat)

1. Eloszor csak a reviewer promptokat vigyuk at prompt-packbe.
2. A mostani string-epitok maradjanak fallbacknek feature flaggel.
3. Shadow render mod: uj es regi prompt egyutt generalodik, diff csak logolodik.
4. Ha stabil, akkor switch az uj composerre; utana implementer/meta-reviewer migracio.

---

Ez a report direkt ugy keszult, hogy a jelenlegi mukodo rendszert ne boritsa fel.
Fokusz: egyszerusites, erosebb boundary-k, alacsony regresszio-kockazatu fokozatos atallas.
