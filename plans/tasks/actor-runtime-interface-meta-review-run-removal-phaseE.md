---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_run_removal_phaseE_v1
title: "Actor Runtime Interface Meta-Review Run Removal (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts
  - src/v11/application/metaReview/metaReviewCliOptionParser.ts
  - src/v11/application/metaReview/metaReviewCliOptionValueReader.ts
  - src/v11/application/metaReview/metaReviewCliValueParsers.ts
  - src/v11/application/metaReview/metaReviewCliOptionTypes.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliTypes.ts
  - src/v11/application/metaReview/metaReviewCliCommand.ts
  - src/v11/application/metaReview/metaReviewCliRenderers.ts
  - src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/application/metaReview/metaReviewCommandContract.ts
  - src/v11/shared/metaReview/metaReviewCommandApi.ts
  - src/v11/shared/metaReview/metaReviewCommandContract.ts
  - src/core/bubble/metaReview.ts
  - src/cli/index.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/cli/index.test.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/v11/application/metaReview/metaReviewFacadeParity.test.ts
  - tests/core/bubble/metaReview.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Run Removal (Phase E)

## L0 - Policy

### Goal

Kivezetni a public `pairflow bubble meta-review run` operator commandot es a hozza tartozo retained code pathot ugy, hogy:
1. a retained operator namespace csak `status | last-report | recover` maradjon,
2. a canonical actor write path tovabbra is kizarolag a `pairflow agent emit --kind meta_review_result` legyen,
3. a `status` / `last-report` / `recover` viselkedese ne valtozzon.

### In Scope

1. A `bubble meta-review run` CLI grammar, help text, dispatcher es renderer surface kivezetese.
2. A `run` command option/result union, `--depth` input plumbing, es top-level CLI print path eltavolitasa vagy dead-code-cleanupkent rendezese.
3. A `runMetaReview` live-run service es a hozza tartozo v11/shared export/alias surface torlese, ha nincs valos `src/**` runtime caller.
4. A kapcsolodo tesztek atirasa vagy torlese ugy, hogy a retained `status` / `last-report` / `recover` coverage megmaradjon.

### Out of Scope

1. `status` vagy `last-report` redesign, removal vagy semantics-hardening.
2. `recover` refaktor, removal vagy generic reconcile iranyba mozgatasa.
3. A canonical `pairflow agent emit --kind meta_review_result` submit flow redesignja.
4. A broader unified actor emit pipeline implementacioja.
5. A `README.md` operator command tablajanak vagy a `docs/meta-review-gate-prd.md` normativ `run` leirasanak teljes atirasa ebben a bounded taskban; ha a removal utan barmelyik aktiv docs surface-en stale `run` leiras marad, azt explicit follow-up vagy conditional docs-closure decisionkent kell kezelni, nem csendes scope-bovitessel.

### Safety Defaults

1. A task fail-closed maradjon: removed `run` helyen ne legyen alias, hidden reroute vagy no-op success.
2. A retained `status` / `last-report` / `recover` commandok maradjanak olvaso vagy snapshot-replay jelleguek; uj write side effect nem nyithato rajtuk.
3. Ha a removal kozben konkret nem-teszt `src/**` consumer derul ki a `runMetaReview` service-re, a full removal nem improvizalhato vissza; explicit blocker vagy follow-up decision kell.
4. A `runMetaReview` live-run function/export removal es a `MetaReviewRunResult` snapshot/recovery adatkontraktus sorsa kulon kerdes: a task csak a dead live-run invoke/export seamet kotelezoen szunteti meg, de nem kenyszerit `MetaReviewRunResult`-torlest ott, ahol azt retained `recover` / snapshot helper code tenylegesen hasznalja.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - public CLI/interface contract: a `bubble meta-review` subcommand grammar elvesziti a `run` spellinget,
   - internal v11/shared export contract: a retained live-run export surface megszunhet,
   - human-facing help/error contract: explicit removal-guidance kell a korabbi `run` hivasokra,
   - shared parser-helper contract: a canonical `agent emit --kind meta_review_result` submit/rework option-reader surface nem torhet a run-only cleanup kovetkezmenyekent,
   - docs decision contract: a public CLI removal utan explicitten zarni kell, hogy ebben a taskban conditional docs-closure keszul-e, vagy kulon follow-upban marad a stale `README.md` / `docs/meta-review-gate-prd.md` sync.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `1`
3. `activation_coupling`: `0`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `3`
7. `single-task allowed`: `yes`
8. Split note:
   - ez mar a korabbi high-risk retained meta-review cleanup scopebol kicsavart bounded delivery task,
   - kulon kezeli a `run` removal-t, es nem viszi tovabb a `recover` vagy `status` / `last-report` vitat.
9. Authority/source-of-truth note:
   - canonical source: `pairflow agent emit --kind meta_review_result`
   - forbidden secondary sources: public `bubble meta-review run`, hidden live-review operator alias, operator-origin submit replacement

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts` | `parseMetaReviewSubcommand` | `(value: string \| undefined) -> MetaReviewSubcommand \| null` | removed subcommand handling | `run` ne legyen ervenyes subcommand; explicit removal-guidance hibaval bukjon, ne generic unknown-kent rejtodjon el | P1 | required-now | a helper ma `run`-t meg engedelyezi |
| CS2 | `src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts`, `src/v11/application/metaReview/metaReviewCliOptionValueReader.ts`, `src/v11/application/metaReview/metaReviewCliValueParsers.ts` | `assertRunOnlyDepthAllowed`, `parseMetaReviewCliOptionValues`, `parseDepth` | `(depth: string \| undefined) -> void`; `(values: Record<string, unknown>) -> ParsedMetaReviewOptionValues`; `(value: string \| undefined, raiseInvalidOption: RaiseInvalidMetaReviewOption) -> MetaReviewDepth` | depth validation + input plumbing cleanup | `--depth` barmely retained subcommand mellett typed schema-invalid hibaval bukjon; a message mondja ki, hogy a `meta-review run` mar removed, es a run-only `depth` string read/parse plumbing teljesen kikeruljon vagy dead-code-cleanupkent rendezodjon, ne maradjon retained CLI pathon felig elo seamkent. Ugyanebben a cleanupban a submit/rework parse helper exportok nem torhetnek: az `agent emit` altal hasznalt nem-run parser helper surface semantikaja valtozatlan marad. | P1 | required-now | a flag ma a `run` retained surface-hez kotott, a value-reader/parser meg kulon run-only plumbingot tart fenn, mikozben ugyaninnen jonnek a submit helper exportok is |
| CS3 | `src/v11/application/metaReview/metaReviewCliOptionParser.ts`, `src/v11/application/metaReview/metaReviewCliOptionTypes.ts` | `parseBubbleMetaReviewCommandOptions`, `BubbleMetaReviewRunCommandOptions` | `(args: string[]) -> BubbleMetaReviewCommandOptions`; `interface BubbleMetaReviewRunCommandOptions extends BubbleMetaReviewCommandBase` | subcommand dispatch branch + dead option type cleanup | az option union csak `status | last-report | recover | help` maradjon; `run` branch torlodjon, es a nev szerint dead `BubbleMetaReviewRunCommandOptions` tipus is kikeruljon a retained option contractbol | P1 | required-now | a parser ma kulon `run` aggat epit depth-pel, a `metaReviewCliOptionTypes.ts` pedig kulon `BubbleMetaReviewRunCommandOptions` tipust tart fenn |
| CS4 | `src/v11/application/metaReview/metaReviewCliOptions.ts` | `getBubbleMetaReviewHelpText` | `() -> string` | usage/help text | a help textbol kikerul a live-run section es a `--depth`; csak retained operator read/recovery + canonical actor submit guidance marad | P1 | required-now | a help ma kulon "Operator live-run command" blokkot tartalmaz |
| CS5 | `src/v11/application/metaReview/metaReviewCliDispatcher.ts` | `dispatchMetaReviewCommand` | `({ options, cwd }: { options: BubbleMetaReviewExecutableCommandOptions; cwd: string }) -> Promise<BubbleMetaReviewCommandResult>` | command routing | a dispatcher csak `status | last-report | recover` commandot route-olhat; `runMetaReviewRunCommand` branch torlodjon | P1 | required-now | a dispatcher ma kozvetlenul hivja a live-run service-t |
| CS6 | `src/v11/application/metaReview/metaReviewCliTypes.ts` | `BubbleMetaReviewCommandResult` | `type union` | result contract | a result unionbol kikerul a `{ command: "run"; run: ... }` ag | P1 | required-now | a top-level CLI ma kulon run result formatot kezel |
| CS7 | `src/v11/application/metaReview/metaReviewCliCommand.ts` | `runBubbleMetaReviewCommand` | `(args: string[] \| BubbleMetaReviewCommandOptions, cwd?: string) -> Promise<BubbleMetaReviewCommandResult \| null>` | exported command wrapper | a parsed/pre-parsed overload retained commandokra maradjon stabil; `run` option shape megszunjon | P1 | required-now | a wrapper ma `run` command resultot is tovabbit |
| CS8 | `src/cli/index.ts` | `handleBubbleMetaReviewCommand` | `(args: string[]) -> Promise<number>` | top-level CLI rendering | text es JSON output csak `status | last-report | recover` agakat rendereljen; `run` renderer/export ne maradjon bent | P1 | required-now | a CLI ma kulon JSON/text `run` aggat kezel |
| CS8a | `src/v11/application/metaReview/metaReviewCliRenderers.ts`, `src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts` | `renderMetaReviewRunText`, run-only renderer helper branches | `(result: MetaReviewRunResult) -> string`; renderer helper branches -> text lines | renderer/helper cleanup | a `run` text renderer export es minden kizarolag run-outputhoz tartozo helper branch eltunik; a retained `status` / `last-report` rendereleshez szukseges helper surface valtozatlan marad | P1 | required-now | a renderer fajlok target_files szinten mar bent vannak, de a konkret run-only render seam explicit neve nelkul konnyen CS8 ala rejtodik |
| CS8b | `src/v11/application/metaReview/metaReviewCliOptions.ts`, `src/v11/application/metaReview/metaReviewCliCommand.ts` | `BubbleMetaReviewRunCommandOptions` re-export, `renderMetaReviewRunText` re-export | `export type {...}`; `export {...}` public facade branches | public re-export cleanup | a removed `run` commandhoz tartozo public re-export seamek (`BubbleMetaReviewRunCommandOptions`, `renderMetaReviewRunText`) is tunjenek el a retained CLI facade-bol; a megmarado help/status/last-report/recover exportok valtozatlanok maradjanak | P1 | required-now | a task mar erinti e fajlokat, de a run-only public re-export cleanup explicit neve nelkul konnyen implicit marad |
| CS9 | `src/v11/shared/metaReview/metaReviewCommandApi.ts`, `src/v11/application/metaReview/emitMetaReviewV11.ts`, `src/v11/application/metaReview/metaReviewCommandContract.ts`, `src/v11/shared/metaReview/metaReviewCommandContract.ts` | live-run export/alias surface | `re-export / alias surface` | shared + v11 facade boundary | ha nincs konkret `src/**` caller, a shared/v11 facade-bol kikerul a `runMetaReview` / `runMetaReviewV11` live-run function seam; a shared contract origin (`src/v11/shared/metaReview/metaReviewCommandContract.ts`) es az application re-export shim csak akkor vesziti el a `MetaReviewRunResult` type exportot, ha nincs retained snapshot/recovery type consumer. Ellenkezo esetben ezek legfeljebb type-only retained surface-kent maradnak. | P1 | required-now | a facade ma retained CLI live-run seamet visz tovabb a v11 re-exportokon keresztul, mikozben a `MetaReviewRunResult` valodi originje a shared contract fileban van |
| CS10 | `src/core/bubble/metaReview.ts` | `runMetaReview` | `(input: MetaReviewRunInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewRunResult>` | core live-run service | preferred target: torles, ha nincs konkret runtime caller; minimum fallback csak explicit blockerrel megengedett | P1 | required-now | `rg` alapjan produkcios caller ma a CLI retained branch; nem latszik mas runtime path |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `BubbleMetaReviewCommandOptions` union | `run | status | last-report | recover | help`, a `run` ag `depth`-et is hordoz | `status | last-report | recover | help`; nincs `run`, nincs `depth`, nincs retained `--depth` input plumbing, es a nev szerint dead `BubbleMetaReviewRunCommandOptions` tipus is torlodik | `command`, `id`, `json`, `verbose`, `help` | `repo` | breaking-by-design a retained operator CLI-n belul; a Phase E direction change ezt mar elfogadta | P1 | required-now |
| `BubbleMetaReviewCommandResult` union | `run`, `status`, `last-report`, `recover` result ag | csak `status`, `last-report`, `recover` marad | `command` + branch-specific payload | N/A | breaking-by-design a removed command surface-en | P1 | required-now |
| v11/shared meta-review export surface | exportalja a `runMetaReview*` function/alias surface-t, a facade ma `MetaReviewRunResult`-ot is tovabbvihet, es a type origin a shared contract fileban van | live-run function/alias export megszunik, ha nincs konkret runtime caller; `MetaReviewRunResult` retained recovery/snapshot type-kent maradhat, ha nem dead | retained exports: `getMetaReviewStatus`, `getMetaReviewLastReport`, `submitMetaReviewResult`, `toMetaReviewError`, `MetaReviewError` | `MetaReviewRunResult`, ha retained snapshot/recovery path meg hasznalja | internal-contract cleanup; parity tesztekkel zarando; a shared contract origin es az application re-export shim kulon olvasando | P1 | required-now |
| human-facing removal guidance | `run` ma valid live-run operator command | removed command explicit guidance-dzsel bukik: nincs operator live-run replacement | removal message, canonical submit emlitese mint actor write path, retained commandok listaja | repo-specific detail | non-silent behavioral change; szandekos UX contract | P1 | required-now |
| submit/rework parser helper surface | a canonical actor emit path ugyanazt a shared option-reader/helper reteget hasznalja, ahol a run-only `depth` plumbing ma meg jelen van | a run-only cleanup utan a `parseSubmitRound`, `parseSubmitRecommendation`, `parseRequiredSubmitReportJson`, `parseOptionalReworkTarget` es a kapcsolodo reader surface semantikaja valtozatlan marad | `agent emit --kind meta_review_result` altal hasznalt submit/rework helper exportok | N/A | internal shared-contract non-regression; a removal nem torheti a canonical actor write pathot | P1 | required-now |
| docs decision closure | aktiv user-facing docs surface-ek egy resze meg explicit `meta-review run` contractot ir le (`README.md`, `docs/meta-review-gate-prd.md`) | explicit closure kell: vagy conditional docs diff keszul, vagy a task completion summary / follow-up note kimondja, hogy a stale `README.md` / `docs/meta-review-gate-prd.md` sync kulon taskba van kivezetve | docs-closure decision, indoklas, follow-up ownership ha nincs docs diff | N/A | bounded-scope transparency; ne maradjon implicit docs drift | P2 | conditional-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI parser/help/render | `run` grammar, help, renderer, top-level print path torlese; `--depth` read/parse plumbing torlese vagy dead-code-cleanupja | silent alias `run -> recover`, silent alias `run -> submit`, generic success response, retained dead `parseDepth` seam reachable option readerbol | removalnak operator-szinten egyertelmunek kell latszania | P1 | required-now |
| shared/core meta-review API | dead live-run export/service torlese, ha nincs valos runtime caller | "internal for now" retained live-run function seam caller-evidence nelkul; retained recovery typeok eroszakos torlese csak azert, mert a live-run function eltunt | code-reduction a task egyik fo celja, de a `MetaReviewRunResult` recovery/snapshot szerepet ez a task nem irhatja at kulon refaktorra | P1 | required-now |
| retained operator commands | `status`, `last-report`, `recover` jelenlegi behavioranak megtartasa | read/replay semantics valtoztatasa, uj write side effect, uj authority shortcut | ez a task nem nyithat uj projection vagy recovery cleanup vitat | P1 | required-now |
| docs / task closure | explicit docs diff vagy explicit docs-defer decision rogzitese | hallgato stale public contract hagyasa docs-decision nelkul | a bounded `run` removal user-visible surface valtozas, ezert a docs dontes nem maradhat implicit | P2 | conditional-now |

Constraint: a task nem vezethet be uj runtime side effectet; ez removal/cleanup munka.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| operator `bubble meta-review run` hivasa | N/A | throw | explicit removal-guidance; nincs operator live-run replacement | `META_REVIEW_SCHEMA_INVALID` | warn | P1 | required-now |
| `--depth` hasznalata barmely retained subcommand mellett | N/A | throw | explicit removal-guidance; `--depth` mar unsupported | `META_REVIEW_SCHEMA_INVALID` | warn | P1 | required-now |
| legacy `submit` hivasa | N/A | throw | a mar meglevo canonical actor submit guidance maradjon ervenyben | `META_REVIEW_SCHEMA_INVALID` | warn | P1 | required-now |
| konkret nem-teszt `src/**` caller derul ki a `runMetaReview` service-re | code search / typecheck | fallback | stop full-removal; expliciten dokumentalt blocker vagy follow-up seam decision kell | `META_REVIEW_RUN_INTERNAL_CONSUMER_BLOCKS_REMOVAL` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `MetaReviewError` typed error normalization; canonical `pairflow agent emit --kind meta_review_result` guidance ott, ahol actor write pathra kell utalni; meglvo retained `status | last-report | recover` contract | P1 | required-now |
| must-not-use | hidden alias a removed `run` helyen; deprecated no-op stub; `runMetaReview` retained export caller-evidence nelkul; `status` / `last-report` / `recover` semantics valtoztatasa; `MetaReviewRunResult` cleanupbol levezetett opportunistic recovery-type redesign; canonical actor submit helper surface accidental torese a run-only parser cleanup miatt | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | removed `run` parse failure explicit | operator `bubble meta-review run --id ...` argv | parseBubbleMetaReviewCommandOptions fut | typed schema-invalid hiba jon, explicit removal-guidance-dzsel; nem generic help, nem generic unknown | P1 | required-now | a parser ma meg elfogadja a `run` subcommandot |
| T2 | help text csak retained surface-et mutat | help kerese aktiv | getBubbleMetaReviewHelpText fut | nincs "Operator live-run command", nincs `pairflow bubble meta-review run`, nincs `--depth`; retained `status | last-report | recover` + canonical submit guidance latszik | P1 | required-now | a help ma meg run usage blokkot tartalmaz |
| T3 | top-level CLI fail-closed a removed commandra | `runCli(["bubble","meta-review","run",...])` | CLI fut | exit code nem-zero, stderr typed `meta_review_error reason_code=META_REVIEW_SCHEMA_INVALID` formatumban jelenik meg | P1 | required-now | a top-level CLI ma valid run pathot kezel |
| T4 | retained command routing valtozatlan marad | bubble fixture es retained subcommandok | `runBubbleMetaReviewCommand` status/last-report/recover utakon fut | mindharom command tovabbra is route-ol, text/json result formatjuk nem torik | P1 | required-now | a task nem nyithat regressziot a megmarado namespace-ben |
| T5 | `--depth` fail-closed removal utan | `status` vagy `last-report` vagy `recover` melle `--depth` erkezik | parser fut | typed schema-invalid hiba jon, amely a removed run contractra utal | P1 | required-now | a depth flag ma retained parser branch logikabol marad vissza |
| T6 | v11/shared facade cleanup megtortenik | v11 parity/export teszt fut | emitMetaReviewV11 es shared command API ellenorzodik | nincs retained `runMetaReviewV11` parity-kotelezettseg; csak a marado exportok maradnak source-of-truth parity alatt | P1 | required-now | a facade parity ma meg a live-run exportot is vedi |
| T7 | core live-run service nem marad arva | removal implementalva | code search / type-level references / test suite fut | nincs produkcios import a `runMetaReview` symbolra; type-level `MetaReviewRunResult` hasznalat onmagaban nem blocker, ha retained recovery/snapshot pathot szolgal | P1 | required-now | `rg -n "runMetaReview" src/v11 src/core src/cli`, kulon `rg -n "runMetaReview" tests`, es kulon `rg -n "MetaReviewRunResult" src/v11/shared src/core tests` a function-call/import seam es a type-only recovery usage szetvalasztasara |
| T8 | canonical submit helper surface non-regression | a run-only parser/value-reader cleanup landed | `tests/contracts/v11/metaReviewSubmitCoverage.test.ts` vagy azzal ekvivalens coverage fut | a canonical `agent emit --kind meta_review_result` altal hasznalt submit/rework helper exportok valtozatlanul elfogadjak a required structured mezoket, es a cleanup nem okoz accidental schema driftet a submit pathon | P1 | required-now | a submit contract ugyanebbol a shared option-reader/helper retegbel fogyaszt |
| T9 | docs decision closure explicit | implementation kesz | completion summary / task closeout megtortenik | vagy keszul a szukseges conditional docs diff, vagy explicit rogzitett docs-defer/follow-up decision szuletik arra, hogy az aktiv PRD `meta-review run` leirasanak syncje kulon task | P2 | conditional-now | a public operator command removal user-visible contract delta, de a jelen bounded task nem akar csendben PRD-scopeot novelni |

## L2 - Implementation Notes (Optional)

1. [later-hardening] A `run` removal utan a `recover` draft konkretizalasa kovetkezik; ez a task ne pre-emptelje annak naming- vagy architecture-donteseit.
2. [later-hardening] A `run` removal es a `recover` refaktor utan kulon decision checkpointban kell visszaterni a `status` / `last-report` retained surface kerdesere.
3. [later-hardening] Ha a `runMetaReview` torlese tul nagy, kulon follow-up nyithato a remaining core type/comment cleanupra, de ez nem blokkolhatja a public command removal-t.
4. [implementation-guard] A review/implementation validacio kulon ellenorizze, hogy `runMetaReview` function caller maradt-e `src/**` alatt, es ezt ne keverje ossze a retained `MetaReviewRunResult` type importokkal a recovery/projection retegekben.
5. [implementation-guard] A shared `metaReviewCliOptionValueReader` / `metaReviewCliValueParsers` cleanup utan a canonical actor emit submit-contract coverage kotelezoen ujrafuttatando vagy azzal ekvivalens evidence-del zarando, mert ugyanebbol a helper retegbol olvas a `meta_review_result` emit path is.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | `metaReview.ts` belso commentjeiben vagy helper-neveiben megmaradhat historical live-run nyelv | L2 | P2 | later-hardening | current draft | kulon low-risk cleanup csak a removal landing utan |
| H2 | A broader actor emit / reconcile target architecturehez kesobb kulon shared contract task kellhet | L2 | P2 | later-hardening | direction-change discussion | ne ebben a taskban oldjuk meg; recovery draft ala tartozik |

## Review Control

1. A review blocker scope csak a `run` removal contractra vonatkozik.
2. Uj `required-now` item csak akkor nyithato, ha kozvetlenul erinti a removed `run` grammar/export/service vagy a retained `status | last-report | recover` non-regression szelvenyt.
3. `recover`, `status`, `last-report`, vagy unified actor emit architecture temak reviewban alapertelmezetten `later-hardening` vagy kulon follow-up, ha nem okoznak kozvetlen P1 regressziot ebben a taskban; ide tartozik a retained `MetaReviewRunResult` recovery-type redesignja is.
4. Max 2 L1 hardening round.
5. `contract_boundary_override=yes`, ezert a `plan_ref` kotelezo es mar rogzitve van.
6. A docs review closure nem maradhat implicit: ha a bounded scope miatt nincs azonnali `README.md` vagy `docs/meta-review-gate-prd.md` diff, azt explicit docs-defer/follow-up ownershipgal kell lezarni a completion summaryban.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:
1. a `run` public command surface parser/help/dispatcher/renderer/CLI szinten eltunt,
2. a live-run shared/core function export/alias surface torolve van vagy explicit blockerrel indokoltan visszatartott; retained recovery-only type export csak akkor maradhat, ha nem live-run invoke seam,
3. a retained `status | last-report | recover` coverage zold marad,
4. a canonical actor submit helper surface non-regression evidence-del zart marad a shared parser cleanup ellenere,
5. a public command removal docs decisione explicitten le van zarva: conditional docs diff vagy nev szerint rogzitett `README.md` / `docs/meta-review-gate-prd.md` follow-up/defer,
6. nincs uj review-scope inflacio a `recover` vagy a projection surfaces korul.
