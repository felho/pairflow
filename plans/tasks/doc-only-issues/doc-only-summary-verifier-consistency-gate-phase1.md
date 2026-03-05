# Task: Docs-Only Summary/Verifier Consistency Hard Gate (Phase 1)

## Context

Visszatérő hiba volt, hogy human summary "tests pass / typecheck clean" állítást tartalmazott, miközben a machine verifier `untrusted` állapotot jelzett. Ez approval ping-pongot és döntési bizonytalanságot okozott.

Ez a feladat a docs-only stabilizációs prioritási terv P0/2 eleme, és közvetlenül a P0/1 (docs-only runtime check requirement temporary disable) után következik.

## Goal

Vezessünk be hard konzisztencia szabályt: docs-only körben sem kerülhessen approval summary-ba olyan validation claim, amelynek machine státusza nem konzisztens.

## Scope

In scope:
1. Validation claim detektálás summary szövegben (minimum: `test`, `typecheck`, `lint` siker-claim osztály).
2. Claim-vs-verifier gate az approval előtti ponton.
3. Auditálható gate döntés (`allow` / `block` / `not_applicable`) explicit reason code-dal.
4. Regressziós lefedés a korábbi ellentmondás mintára.

Out of scope:
1. Teljes NLP-alapú claim parsing.
2. Új evidence pipeline vagy command parser redesign.
3. Teljes UI redesign.
4. Code bubble policy újradefiniálása.

## Rollout Alignment

1. Ez a task a `doc-only-priority-and-rollout-plan-2026-03-04.md` szerinti P0/2 lépést konkretizálja.
2. P0/1 által bevezetett docs-only könnyítés (runtime check nem kötelező) marad érvényben.
3. A P0/2 gate célja nem a docs-only könnyítés visszavonása, hanem a summary-verifier ellentmondás megszüntetése.
4. Rollback esetben is ez a konzisztencia gate maradjon bekapcsolva (a prioritási tervvel konzisztensen).
5. A `docs_only_runtime_check_required` policy toggle csak a docs-only runtime-check requirement policyt kapcsolja; a consistency gate decision matrix kimeneteit nem modositja.

## Definitions

1. Runtime validation claim:
   - Phase 1-ben determinisztikus, zárt trigger-lista alapján detektált állítás (nem nyitott szinonima-értelmezés).
   - Matching szemantika (Phase 1):
     - case-insensitive (kis-/nagybetu nem szamit),
     - whitespace-normalized (egymast koveto whitespace egy whitespace-kent kezelendo),
     - whole-phrase/token-boundary match kotelezo (substring match nem elfogadott),
     - token-boundary explicit halmaz: szoveg eleje/vege, whitespace, vagy punctuation separator (`. , ; : ! ? ( ) [ ] { } " ' / -`),
     - punctuation adjacency token-boundarynek szamit (pl. `tests pass,` es `tests pass.` ervenyes match),
     - csak az itt felsorolt explicit phrase mintak fogadhatok el.
   - Elfogadott claim osztályok és trigger minták:
     - `test`: `tests pass`, `test pass`, `pnpm test pass`, `pnpm test clean`
     - `typecheck`: `typecheck clean`, `pnpm typecheck pass`, `tsc --noEmit pass`
     - `lint`: `lint clean`, `pnpm lint pass`, `pnpm lint clean`
   - A fenti listán kívüli szöveg Phase 1-ben nem minősül runtime claimnek.
2. Claim-free docs-only summary:
   - Olyan docs-only summary, amely nem állít runtime check sikert, hanem explicit docs-only formulát használhat (pl. `runtime checks not required`).
3. Verifier compatibility:
   - `trusted` -> kompatibilis pozitív runtime claimekkel.
   - `untrusted` -> nem kompatibilis pozitív runtime claimekkel.
4. Hard mismatch:
   - Pozitív runtime claim + `verifier != trusted`.
5. Multi-claim aggregation (Phase 1):
   - Ez az aggregacios szabaly kizarolag docs-only (`review_artifact_type=document`) bubble eseten alkalmazando.
   - Nem docs-only (`review_artifact_type=code|auto`) eseten a gate kimenete `not_applicable` (`reason_code=not_applicable_non_docs`), aggregacios allow/block dontes nem fut.
   - Nem docs-only (`review_artifact_type=code|auto`) eseten claim detection nem fut; auditban kotelezo fix ertekek: `claim_classes_detected=none`, `matched_claim_triggers=[]`.
   - Summarybol claim class halmazt kell kepezni (`{test,typecheck,lint}`, deduplikalva).
   - A claim class halmaz canonical serializacioja `claim_classes_detected` mezoben comma-separated stable-order format (`test,typecheck,lint` sorrend); ures halmaz eseten `none`.
   - Ha a claim class halmaz nem ures es `verifier=trusted` -> `allow`, `reason_code=claim_verified`.
   - Ha a claim class halmaz nem ures es `verifier=untrusted` -> `block`, `reason_code=summary_verifier_mismatch`.
   - Ha a claim class halmaz ures es docs-only bubble -> `allow`, `reason_code=no_claim_in_docs_only`.
   - `summary_verifier_mismatch` eseten a mismatch-diagnosztikai minimum mezok:
     - `claim_classes_detected=<test|typecheck|lint|test,typecheck|test,lint|typecheck,lint|test,typecheck,lint>`
     - `verifier_status=untrusted`
     - `verifier_origin_reason=<opaque-string|unknown>`
   - `reason_detail` kontraktus (Phase 1): logikai/csoportosito megnevezes, de a canonical audit rekord flat top-level mezoket hasznal; nested `reason_detail` objektum output tiltott.
6. Verifier origin reason:
   - Gate szinten opaque passthrough mezokent kezelendo (nem kotott enum ebben a taskban).
   - Forrasa a verifier output/artifact; peldak: `evidence_missing`, `evidence_unverifiable`.
   - Ha upstream ok nem elerheto, kotelezo fallback ertek: `unknown`.
   - Presence szabaly: `summary_verifier_mismatch` block agban kotelezo, allow/not_applicable agakban nem hasznalhato (omitted kotelezo).
7. review_artifact_type:
   - Bubble-level artifact ownership field (`document|code|auto`), amely meghatarozza, hogy a docs-only consistency gate aktiv (`document`) vagy `not_applicable` (`code|auto`).
   - Normalization szabaly (safe-by-default): ha a raw input hianyzo/ismeretlen/invalid, akkor `review_artifact_type=auto`-ra normalizalando.
   - A gate dontes minden esetben a normalizalt artifact type alapjan tortenik.
8. Rollback simulation method (testable):
   - Toggle A (artifact type): ugyanabban a fixture-ben `review_artifact_type=document` -> majd `review_artifact_type=code|auto`.
   - Toggle B (docs-only runtime-check requirement mode): boolean policy fixture flag `docs_only_runtime_check_required=false` -> `true` (rollback szimulacio).
   - Toggle B intent (explicit): policy-level requirement toggle (nem gate input); a docs-only runtime-check requirement policyt modellezi, de nem kapcsolja ki es nem irja felul a consistency gate dontesi logikajat.
   - Observable output elvaras:
     - `document` + positive claim + `untrusted` minden toggle kombinacioban `block` + `reason_code=summary_verifier_mismatch`,
     - `document` + claim-free summary + `untrusted` minden toggle kombinacioban `allow` + `reason_code=no_claim_in_docs_only`,
     - `code`/`auto` minden toggle kombinacioban `not_applicable` + `reason_code=not_applicable_non_docs`.
9. `matched_claim_triggers` contract (Phase 1):
   - Canonical audit mező: `matched_claim_triggers`.
   - Tipus/formatum: JSON string array, minden elem lowercased normalized trigger phrase; duplicate elem nem engedett.
   - Sorrend: stable-order a claim class prioritasi sorrend szerint (`test`, `typecheck`, `lint`), claim classon belul first-match sorrend.
   - Deduplikacio granularitasa: string-level dedup.
   - Azonos claim classon belul tobb kulonbozo trigger string megtartando (nem collapse-elunk egy triggerre/class).
   - Presence szabaly:
     - a mező minden gate kimenetnel kotelezo (omitted disallowed),
     - `claim_verified` vagy `summary_verifier_mismatch` eseten nem ures tomb kotelezo,
     - `no_claim_in_docs_only` vagy `not_applicable_non_docs` eseten kotelezoen ures tomb (`[]`).

## Verifier Status Contract (Phase 1)

1. A gate canonical bemeneti verifier státusztere explicit és zárt: `trusted | untrusted`.
2. Upstream status jelzes tartalmazhat `missing` allapotot is (pl. bubble status `last_review_verification`).
3. Hiányzó/missing/invalid/ismeretlen verifier státusz Phase 1-ben `untrusted`-ra normalizálandó.
4. A gate döntés normalizálás után történik, ezért gate-szinten nincs harmadik "implicit" státusz.
5. Következmény:
   - pozitív runtime claim + `trusted` -> `allow` (`claim_verified`)
   - pozitív runtime claim + normalizált `untrusted` -> `block` (`summary_verifier_mismatch`)
   - claim-free docs-only summary -> `allow` (`no_claim_in_docs_only`) akkor is, ha verifier státusz `untrusted`

## Gate Decision Matrix (Auditable)

1. `docs-only + positive runtime claim + verifier=trusted` -> `allow`
   - reason_code: `claim_verified`
2. `docs-only + positive runtime claim + verifier=untrusted` -> `block`
   - reason_code: `summary_verifier_mismatch`
   - mismatch-diagnosztikai minimum tartalom (flat top-level mezok, Definitions-szel konzisztensen):
     - `claim_classes_detected=<comma-separated non-empty stable-order subset>`
     - `matched_claim_triggers=<non-empty normalized trigger array>`
     - `verifier_status=untrusted`
     - `verifier_origin_reason=<opaque-string|unknown>`
3. `docs-only + no runtime claim` -> `allow`
   - reason_code: `no_claim_in_docs_only`
   - verifier dimenzio explicit: `trusted|untrusted` mellett is ugyanaz a kimenet (normalizacio utan).
4. `non-docs-only` bubblek:
   - ez a gate `not_applicable`,
   - reason_code: `not_applicable_non_docs`,
   - ide tartozik minden normalizalt `review_artifact_type=code|auto` eset (beleertve az unknown/invalid -> `auto` normalizaciot),
   - claim detection bypass kotelezo (nem fut claim parsing ebben az agban),
   - fix audit ertekek kotelezoek: `claim_classes_detected=none`, `matched_claim_triggers=[]`,
   - nincs policy drift; meglévő nem-docs-only policy viselkedés változatlan.

## Auditability Requirements

1. Minden gate döntésnél rögzített legyen:
   - gate decision (`allow`/`block`/`not_applicable`),
   - reason code,
   - review_artifact_type,
   - `verifier_status=<trusted|untrusted>` (normalizacio utan),
   - claim osztaly detektalas serializacioja (`claim_classes_detected`) a zart formatumban: `none` vagy comma-separated stable-order subset (`test,typecheck,lint`).
   - `matched_claim_triggers` (kotelezoen jelenlevo JSON string array, Definitions #9 szerint).
2. `summary_verifier_mismatch` esetben a diagnosztika egyértelműen visszakövethető legyen:
   - mely claim miatt blokkolt,
   - milyen verifier státusz/ok mellett.
3. A reason code készlet determinisztikus legyen erre a gate-re:
   - `claim_verified`
   - `no_claim_in_docs_only`
   - `summary_verifier_mismatch`
   - `not_applicable_non_docs`
4. A reason code készlet zárt (nem használható ekvivalens vagy alternatív kód ebben a gate-ben).
5. `not_applicable_non_docs` audit shape minimum:
   - `gate_decision=not_applicable`
   - `reason_code=not_applicable_non_docs`
   - `review_artifact_type=code|auto`
   - `verifier_status=<trusted|untrusted>`
   - `claim_classes_detected=none`
   - `matched_claim_triggers=[]`
6. `allow` audit shape minimum (explicit):
   - claimes allow eset (`reason_code=claim_verified`):
     - `gate_decision=allow`
     - `review_artifact_type=document`
     - `verifier_status=trusted`
     - `claim_classes_detected=<non-none stable-order subset>`
     - `matched_claim_triggers=<non-empty normalized trigger array>`
   - claim-free allow eset (`reason_code=no_claim_in_docs_only`):
     - `gate_decision=allow`
     - `review_artifact_type=document`
     - `verifier_status=<trusted|untrusted>`
     - `claim_classes_detected=none`
     - `matched_claim_triggers=[]`
7. `block` audit shape minimum (explicit, `reason_code=summary_verifier_mismatch`):
   - `gate_decision=block`
   - `review_artifact_type=document`
   - `claim_classes_detected=<non-none stable-order subset>`
   - `matched_claim_triggers=<non-empty normalized trigger array>`
   - `verifier_status=untrusted` (normalizacio utan)
   - `verifier_origin_reason=<opaque-string|unknown>`
8. `reason_detail` serialization guard (explicit):
   - canonical audit shape flat top-level mezokkel ervenyes,
   - nested `reason_detail` object nem hasznalhato (disallowed),
   - mismatch diagnosztikai mezok a top-level audit rekord reszei.
9. `verifier_origin_reason` shape guard (explicit):
   - kizarolag `summary_verifier_mismatch` block kimenetnel hasznalhato/kotelezo,
   - allow/not_applicable audit shape-ben `verifier_origin_reason` mező nem jelenhet meg (omitted kotelezo).

## Suggested Touchpoints

1. `src/core/agent/converged.ts` (approval elotti gate beszurasi pont)
2. `src/core/agent/pass.ts` (handoff/summary gate ellenorzes)
3. `src/core/reviewer/testEvidence.ts` (verifier status mapping es reason propagation)
4. `src/core/ui/presenters/bubblePresenter.ts` (auditability status surface, ha szukseges)

## Test Plan

1. Positive path (`test` claim): `docs-only bubble + summary contains "tests pass" + verifier=trusted` -> pass, `reason_code=claim_verified`.
2. Positive path (`typecheck` claim): `docs-only bubble + summary contains "typecheck clean" + verifier=trusted` -> pass, `reason_code=claim_verified`.
3. Positive path (`lint` claim, dedikalt): `docs-only bubble + summary contains "lint clean" + verifier=trusted` -> pass, `reason_code=claim_verified`.
4. Multi-claim positive aggregation path: `docs-only bubble + summary contains "tests pass" es "typecheck clean" + verifier=trusted` -> pass, `reason_code=claim_verified`, es audit mezoben `claim_classes_detected=test,typecheck` + non-empty `matched_claim_triggers`.
5. Multi-claim negative aggregation path: `docs-only bubble + summary contains "tests pass" es "lint clean" + verifier=untrusted` -> hard block, `reason_code=summary_verifier_mismatch`, es a flat mismatch-diagnosztikai mezok `claim_classes_detected` claim class halmazt tartalmaznak.
6. Negative detail path (unconditional): mismatch esetben a flat mismatch-diagnosztikai mezok mindig tartalmazzak a `verifier_origin_reason` mezot; ha upstream ok nem elerheto, kotelezoen `unknown`.
7. Docs-only exemption preservation path: `docs-only bubble + claim-free summary + verifier=untrusted (vagy missing->untrusted)` -> pass, `reason_code=no_claim_in_docs_only`, es nincs implicit runtime-check requirement.
8. Docs-only no-claim trusted path (dedikalt): `docs-only bubble + no runtime claim + verifier=trusted` -> pass, `reason_code=no_claim_in_docs_only`.
9. Empty summary edge path (dedikalt): `docs-only bubble + summary=\"\" (vagy whitespace-only) + verifier=trusted|untrusted` -> pass, `reason_code=no_claim_in_docs_only`.
10. Verifier normalization path (missing): `docs-only bubble + positive runtime claim + verifier missing` -> `block`, `reason_code=summary_verifier_mismatch`.
11. Verifier normalization path (invalid): `docs-only bubble + positive runtime claim + verifier invalid` -> `block`, `reason_code=summary_verifier_mismatch`.
12. Non-docs-only applicability path (code, dedikalt): `code bubble` -> `not_applicable`, `reason_code=not_applicable_non_docs`.
13. Non-docs-only applicability path (auto, dedikalt): `auto bubble` -> `not_applicable`, `reason_code=not_applicable_non_docs`.
14. Non-docs-only audit shape path (dedikalt): `not_applicable` kimenet audit rekordja legalabb a kotelezo mezoket tartalmazza, `claim_classes_detected=none`, `matched_claim_triggers=[]`.
15. Claim-class traceability path (dedikalt): mind `allow`, mind `block` kimenetnel audit mezoben `claim_classes_detected` explicit (`none` vagy comma-separated stable-order subset).
16. Trigger matching boundary path: case-insensitive pelda (`Tests Pass`) claim-nek szamit, qualifying-text prefix pelda (`validation: tests pass`) claim-nek szamit, substring-only pelda (`contests pass`) nem claim, punctuation-adjacent pelda (`tests pass,` / `tests pass.`) claim-nek szamit.
17. Whitespace normalization path (dedikalt): extra whitespace-es claim (`tests   pass`) claim-nek szamit a normalizacios szabaly szerint.
18. Stable-order serialization path (dedikalt): tobb claim eseten `claim_classes_detected` mindig determinisztikus sorrendet hasznal (`test,typecheck,lint`), bemeneti emlitesi sorrendtől fuggetlenul.
19. Duplicate same-class dedup path (dedikalt): summary pontosan ugyanazzal a triggerrel tobbszor szerepel (pl. `tests pass ... tests pass`) -> deduplikalt `claim_classes_detected=test`, es `matched_claim_triggers` string-level deduplikalt/stable-order marad.
20. Same-class distinct-trigger retention path (dedikalt): ugyanazon classban kulonbozo triggerek (pl. `tests pass ... test pass`) egyszerre megtartandok `matched_claim_triggers` mezoben; nem collapse-elunk egy triggerre/class.
21. `matched_claim_triggers` contract path (dedikalt): minden kimenetnel a mező jelen van; `claim_verified`/`summary_verifier_mismatch` eseten non-empty, `no_claim_in_docs_only`/`not_applicable_non_docs` eseten `[]`, omitted allapot rejected.
22. Allow audit shape path (`claim_verified`, dedikalt): minimum allow audit mezok explicit ellenorzese (`gate_decision`, `reason_code`, `review_artifact_type`, `verifier_status=trusted`, `claim_classes_detected`, `matched_claim_triggers`).
23. Allow audit shape path (`no_claim_in_docs_only`, dedikalt): minimum allow audit mezok explicit ellenorzese (`gate_decision`, `reason_code`, `review_artifact_type`, `claim_classes_detected=none`, `matched_claim_triggers=[]`).
24. review_artifact_type normalization path (dedikalt): unknown/invalid/missing artifact type `auto`-ra normalizalodik, es a gate kimenet `not_applicable` + `reason_code=not_applicable_non_docs`.
25. Block audit shape path (dedikalt): `summary_verifier_mismatch` kimenet legalabb a kotelezo block audit shape mezoket tartalmazza (`claim_classes_detected`, `matched_claim_triggers`, `verifier_status`, `verifier_origin_reason`).
26. `reason_detail` structure guard path (dedikalt): mismatch diagnosztikai mezok flat top-level audit mezokent jelennek meg; nested `reason_detail` objektum output rejected.
27. Lint trigger symmetry path (dedikalt): `pnpm lint clean` elfogadott lint trigger, `reason_code=claim_verified` trusted verifier mellett.
28. Closed reason-code set validation path (dedikalt): gate kimeneti reason_code csak a zart keszletbol johet (`claim_verified`, `no_claim_in_docs_only`, `summary_verifier_mismatch`, `not_applicable_non_docs`), barmely mas kod rejected.
29. Rollback safety path (testable mechanism): a Definitions #8-ban leirt Toggle A/B szimulacio mellett a kimenet determinisztikusan a vart reason code marad, beleertve a claim-free + untrusted docs-only utat is.
30. `verifier_status` presence symmetry path (dedikalt): `allow` (`claim_verified` es `no_claim_in_docs_only`) es `not_applicable_non_docs` kimenet audit rekordjaban is kotelezoen jelen van a normalizalt `verifier_status`.
31. False-positive rejection path (dedikalt): unlisted phrase pelda (`tests succeeded`) nem claim, docs-only bubbleben `no_claim_in_docs_only` agra esik (nem valthat ki claim-branch dontest).
32. Slash-boundary path (dedikalt): punctuation separator slash mellett is token-boundary ervenyes (`tests pass/` claim matchnek szamit).
33. Three-class aggregation path (dedikalt): `tests pass + typecheck clean + lint clean` trusted verifier mellett `allow`, `reason_code=claim_verified`, auditban `claim_classes_detected=test,typecheck,lint`.
34. Test trigger variant path (dedikalt): `pnpm test clean` accepted `test` trigger, trusted verifier mellett `allow`, `reason_code=claim_verified`.
35. Typecheck trigger variant path (dedikalt): `tsc --noEmit pass` accepted `typecheck` trigger, trusted verifier mellett `allow`, `reason_code=claim_verified`.
36. Hyphen-boundary path (dedikalt): punctuation separator hyphen mellett token-boundary ervenyes (`tests pass-` claim matchnek szamit).

## Acceptance Criteria

1. Nem mehet ki olyan approval summary, amely pozitív runtime claimet tesz, miközben verifier státusz nem kompatibilis (`!= trusted`).
2. Mismatch esetben a gate hard block és auditálható reason code (`summary_verifier_mismatch`) keletkezik.
3. Docs-only claim-free handoff nem esik false mismatch blockerbe (`reason_code=no_claim_in_docs_only`).
4. A gate diagnosztika visszakövethetően jelzi a claim osztályt és a verifier státuszt.
5. A korábbi ismert regressziós minta (summary PASS + verifier untrusted) teszttel lefedett és reprodukálhatóan blokkolt.
6. A docs-only runtime-check felmentés explicit megmarad: claim-free docs-only summary nem válik blockerré untrusted/missing verifier miatt.
7. A reason code készlet erre a gate-re zárt és determinisztikus: `claim_verified`, `no_claim_in_docs_only`, `summary_verifier_mismatch`, `not_applicable_non_docs`.
8. Non-docs-only bubbleben a gate nem alkalmazando (`not_applicable_non_docs`) es nem okoz policy driftet.
9. A rollback policy teszttel/AC-vel lefedett es tesztelheto mechanizmussal definialt: P0/1 visszagorgetes szimulacio sem kapcsolja ki ezt a consistency gate-et.
10. Multi-claim summary esetben az aggregacios szabaly determinisztikus es tesztelheto (`claim set non-empty + trusted -> allow`, `claim set non-empty + untrusted -> block`).
11. Phrase matching boundary explicit es tesztelheto: whole-phrase/token-boundary kotelezo, substring match tiltott, punctuation-adjacent match elfogadott.
12. A `lint` pozitiv path dedikaltan lefedett (`reason_code=claim_verified`), beleertve a `pnpm lint clean` szimmetrikus triggert.
13. `not_applicable_non_docs` esetben a minimum audit shape kotelezoen teljesul, `review_artifact_type=code|auto` es `claim_classes_detected=none` elvarassal.
14. `auto` artifact tipusra kulon, dedikalt non-docs teszt eset van (nem osszevonva a `code` esettel).
15. No-claim docs-only esetben (trusted es untrusted verifier mellett is) determinisztikusan `no_claim_in_docs_only` kimenet keletkezik.
16. Rollback safety tesztelheto mechanizmussal definialt (Definitions #8 Toggle A/B), es a vart kimenetek explicit ellenorizhetoek, beleertve a claim-free + untrusted docs-only esetet.
17. A claim class serializacio notation konzisztens es zart: `claim_classes_detected` mezoben `none` vagy comma-separated stable-order subset hasznalhato.
18. A `matched_claim_triggers` mező szerzodese explicit es kotelezo: minden kimenetben jelen van; `claim_verified`/`summary_verifier_mismatch` eseten non-empty, `no_claim_in_docs_only`/`not_applicable_non_docs` eseten `[]`; omitted allapot nem megengedett.
19. `summary_verifier_mismatch` kimenetre explicit minimum block audit shape kotelezo (claim classes, triggers, verifier status/origin reason mezokkel).
20. Duplicate same-class summary trigger esetben a kimenet deduplikalt es stable-order marad (`claim_classes_detected` es `matched_claim_triggers` szinten is).
21. `matched_claim_triggers` same-class viselkedese explicit: string-level dedup mellett kulonbozo trigger stringek megtartandok, nem collapse-elunk egy triggerre/class.
22. Allow kimenetekre dedikalt minimum audit-shape ellenorzes van mindket allow agra (`claim_verified` es `no_claim_in_docs_only`).
23. `review_artifact_type` unknown/invalid/missing bemenet safe-by-default `auto` normalizacioval kezelodik, es `not_applicable_non_docs` kimenetet ad.
24. `reason_detail` szerkezeti szabaly explicit: Phase 1-ben canonical flat top-level audit mezok ervenyesek, nested `reason_detail` object nem megengedett.
25. A módosítás konzisztens a docs-only rollout prioritási tervvel (P0/1 után, P1/P2 előtt), és nem bontja meg a docs-only runtime-check könnyítést.
26. `summary_verifier_mismatch` kimenetben a `verifier_origin_reason` mező mindig jelen van; upstream ok hianya eseten kotelezo fallback az `unknown`.
27. Toggle B (`docs_only_runtime_check_required`) modositasa nem irja felul a consistency gate decision matrixot; ugyanazon input summary/verifier/artifact kombinaciokban a gate kimenet determinisztikusan valtozatlan marad.
28. `claim_verified` allow audit shape verifier-statusa explicit trusted-only: `verifier_status=trusted` kotelezo, `untrusted` nem elfogadhato ezen az agon.
29. `verifier_origin_reason` mező presence/omit szabaly explicit: `summary_verifier_mismatch` block kimenetben kotelezo, allow/not_applicable kimenetekben nem megengedett.
30. A `pnpm test clean` es `tsc --noEmit pass` trigger variansok dedikalt teszttel lefedettek, es a zart trigger-lista reszekent mukodnek.
