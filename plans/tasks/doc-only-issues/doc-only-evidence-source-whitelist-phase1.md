---
artifact_type: task
artifact_id: task_doc_only_evidence_source_whitelist_phase1_v11
title: "Docs-Only Evidence Source Whitelist (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/reviewer/testEvidence.ts
  - tests/core/reviewer/testEvidence.test.ts
  - docs/llm-doc-workflow-v1.md
prd_ref: null
plan_ref: plans/tasks/doc-only-issues/doc-only-priority-and-rollout-plan-2026-03-04.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/reviewer-severity-ontology.md
  - plans/tasks/doc-only-issues/doc-only-summary-verifier-consistency-gate-phase1.md
owners:
  - "felho"
---

# Task: Docs-Only Evidence Source Whitelist (Phase 1)

## Context

Tobbszor elofordult, hogy `--ref` alatt prose/artifact fajlok (`done-package.md`, `reviewer-test-verification.json`) command outputnak tuno szoveget tartalmaztak, es ez hamis `verified` jeloltekhez vezetett a verifier input oldalon.

Ez a feladat a P1/1 stabilizacios lepes: az evidence forrasok explicit whitelistre szukitese, determinisztikus fallbackkel.

## Goal

A command verification path csak megbizhato logforrasokbol olvashasson command evidence-t. Nem-whitelisted ref sem kozvetlenul, sem kozvetve ne tudjon `verified` allapotot megalapozni.

## Scope

In scope:
1. `--ref` forrasok explicit, determinisztikus whitelist szabalyanak bevezetese.
2. Nem-whitelisted refek kizarsa a `loadEvidenceSources` inputjabol.
3. Kizarasi diagnosztika rogzitheto contract (reason + rejected lista) az auditability miatt.
4. Regression tesztek a korabbi false-positive mintakra.
5. Docs update a tamogatott evidence ref patternrol.

Out of scope:
1. Uj evidence pipeline.
2. Uj command parser/NER rendszer.
3. Altalanos trust scoring.
4. Docs-only runtime-check policy (`review_artifact_type=document`) ujratervezese.

## Normative Alignment

1. `NR1` (`normative_refs[0]`): `docs/reviewer-severity-ontology.md`
   - finding/priority/timing kifejezesek es gate-sulyok konzisztens hasznalata.
2. `NR2` (`normative_refs[1]`): `plans/tasks/doc-only-issues/doc-only-summary-verifier-consistency-gate-phase1.md`
   - docs-only bypass (`review_artifact_type=document`) traceability (`CS6`, `T9`, `AC#6`) ehhez igazodik.

## L0 - Policy

### Policy Statement

1. Command evidence csak whitelisted ref fajlokbol olvashato.
2. Whitelistelt ref definicio (Phase 1 default policy):
   - fragment (`#...`) resz canonicalization elott levagasra kerul,
   - canonicalized absolute path,
   - repo vagy worktree root alatt van,
   - a canonical path tartalmazza a `/.pairflow/evidence/` szegmenst,
   - a canonical path pontos mintaja: `/.pairflow/evidence/<fajlnev>.log`,
   - `<fajlnev>` egyetlen path-segment (Phase 1-ben nincs alkonyvtar: `/.pairflow/evidence/subdir/x.log` nem engedett).
   - ALLOW csak akkor, ha a fenti feltetelek MIND egyszerre teljesulnek (logical AND).
3. Nem-whitelisted refet a verifier nem olvassa be source-kent.
4. Mixed ref set esetben csak allowed refek szamitanak; rejected refek csak diagnosztikai celra maradnak meg.
5. Policy parse/normalization hiba eseten strict fallback aktiv:
   - csak canonical `/.pairflow/evidence/<single-segment>.log` fogadhato el (Phase 1 direct-child policy fallbackban is valtozatlan),
   - nested path fallbackban is rejected (pl. `/.pairflow/evidence/subdir/x.log`).
6. Ismeretlen artifact fajl (`done-package.md`, `reviewer-test-verification.json`, egyeb markdown/json) nem adhat `verified` command statuszt ref-forraskent.

### Security and Safety Defaults

1. Fail-safe default: ha egy refrol nem bizonyithato, hogy whitelisted, akkor rejected.
2. URL/protocol ref (`://`) minden esetben rejected.
3. Realpath/canonicalization sikertelenseg eseten ref candidate rejected (nem best-effort accept).
4. Worktree/repo root canonicalization fallback (`realpath` -> `resolve`) csak scope-bootstrap celu; onmagaban nem tehet elfogadotta egy refet.
5. Docs-only bypass (`review_artifact_type=document`) valtozatlanul ervenyes; ez a task csak a nem-document verification pathra vonatkozik.

### Allowed vs Rejected Examples

Allowed:
1. `.pairflow/evidence/lint.log`
2. `/abs/path/to/repo/.pairflow/evidence/test.log`
3. `/abs/path/to/worktree/.pairflow/evidence/typecheck.log#L1`
4. `./.pairflow/evidence/typecheck.log`

Rejected:
1. `.pairflow/bubbles/.../artifacts/done-package.md`
2. `.pairflow/bubbles/.../artifacts/reviewer-test-verification.json`
3. `docs/llm-doc-workflow-v1.md`
4. `https://example.com/evidence.log`
5. `.pairflow/evidence/lint.txt`
6. `../outside/.pairflow/evidence/test.log`
7. `#L1` (fragment-only ref, path nelkul)
8. `.pairflow/evidence/subdir/test.log` (Phase 1 depth policy szerint nested path)

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/core/reviewer/testEvidence.ts` | extend existing: `isAllowedRefPath` + `resolveRefPath` + `loadEvidenceSources` | `EvidenceSourcePolicyDecision` letrehozasa, ref candidatek whitelist filtere canonical path alapon | P1 | required-now | T1-T7, T10-T19 |
| CS2 | `src/core/reviewer/testEvidence.ts` | extend existing: source-policy diagnostics assembly | rejected ref lista + reason szerzodeses mezokkel tovabbitva; required field preservation | P1 | required-now | T2, T4, T5, T7, T10, T12-T13, T18-T19 |
| CS3 | `src/core/reviewer/testEvidence.ts` | `classifyEvidence` reason detail shaping | source-policy miatt unverifiable/missing dontes auditably magyarazhato, empty-ref-list ag explicit | P1 | required-now | T4, T7, T11-T12 |
| CS4 | `tests/core/reviewer/testEvidence.test.ts` | regression suite | explicit tesztek non-log artifact reject, canonical log accept, docs-only bypass, outside-scope reason, empty-ref-list es lifecycle binding esetre | P1 | required-now | T1-T7, T9-T19 |
| CS5 | `docs/llm-doc-workflow-v1.md` | accepted `--ref` source guidance | rovid policy note a helyes evidence ref hasznalathoz | P2 | later-hardening | T8 |
| CS6 | `src/core/reviewer/testEvidence.ts` | extend existing: `verifyImplementerTestEvidence` docs-only branch owner | docs-only bypass traceability ownership (`AC#6`, `T9`) explicit call-site kotes | P2 | required-now | T9 |

CS6 timing rationale:
1. `required-now` marad, mert docs-only bypass regresszioja kozvetlenul hamis verification-dontes kockazatot okozhat safety-critical pathban.
2. Rationale mapping: `CS6` -> `T9` -> `AC#6`.

### 2) Data and Interface Contract

Required internal contract (additive, backward-compatible):
1. `EvidenceSourcePolicyDecision` (internal):
   - `allowed_ref_paths: string[]`
   - `rejected_refs: Array<{ input_ref: string; reason: string }>`
   - `fallback_applied: boolean`
2. Per-ref diagnostics reason code set (closed, internal):
   - `source_not_whitelisted`
   - `source_outside_repo_scope`
   - `source_protocol_not_allowed`
   - `source_canonicalization_failed`
   - `source_duplicate_ref`
3. Policy-mode diagnostics marker (decision-level, nem per-ref):
   - `source_policy_fallback`
4. `claim-free summary` definicio ebben a taskban:
   - summary nem tartalmaz verifikalhato command execution allitast (`typecheck/test/lint` pass claim nelkul).
5. Existing public artifact schema (`reviewer-test-verification.json`) schema-version bump nelkul maradjon kompatibilis.
6. Existing top-level reason_code enum (`evidence_missing|evidence_unverifiable|...`) nem kotelezoen bovul; source-policy ok reszletezese command-level diagnostics oldalon tortenik.
7. `source_policy_fallback` canonical location (deterministic placement):
   - internal diagnostics objektumban: `diagnostics.source_policy.mode_marker = "source_policy_fallback"` ha `fallback_applied=true`,
   - public artifact (`reviewer-test-verification.json`) oldalon a `reason_detail` mezot string-compatible formatban kell tartani; marker itt csak string tokenkent jelenhet meg (nem objektumkent),
   - tilos a marker `rejected_refs[].reason` mezoben.

### 2/a) `EvidenceSourcePolicyDecision` Lifecycle Binding (Required)

1. Letrehozas (single source of truth):
   - `loadEvidenceSources` elejen, az input `refs` listabol, canonicalization + whitelist szures utan.
2. Kotelezoleg megorzendo mezo-szerzodes a lifecycle teljes hosszan:
   - `allowed_ref_paths`
   - `rejected_refs`
   - `fallback_applied`
3. Fogyasztas / alkalmazasi pontok:
   - source assembly: csak `allowed_ref_paths` alapjan olvashato ref content,
   - diagnostics assembly: `rejected_refs` reason list atadva a reason shapingnek,
   - classifier/reason path: fallback es reject okok lete transzparensen visszakeresheto.
4. Tiltott viselkedes:
   - ad-hoc ujraszures masik policyval a lifecycle kozben,
   - required mezok eldobasa, atnevezese vagy implicit derivalt helyettesitese.
5. Tesztelheto elvaras:
   - mixed, outside-scope, fallback, empty-ref-list esetekben ugyanaz a lifecycle objektum allapot vezeti a dontest.

### 2/b) Reason-Code Precedence (Deterministic, Required)

1. Egy rejected refhez pontosan egy canonical per-ref reason code rendelheto.
2. Ha tobb per-ref reject feltetel egyszerre igaz, a reason kivalasztasa fix prioritasi sorrend szerint tortenik:
   - `source_protocol_not_allowed`
   - `source_canonicalization_failed`
   - `source_outside_repo_scope`
   - `source_not_whitelisted`
3. `source_policy_fallback` nem per-ref reason: kizárólag decision-level policy mode marker (`fallback_applied=true`) mellett hasznalhato, canonical helye `diagnostics.source_policy.mode_marker`.
4. A sorrendtol valo elteres nem megengedett (nincs implementation-defined branch).
5. A precedence szabaly a `rejected_refs[].reason` mezore vonatkozik, igy ugyanazon bemenetre determinisztikus diagnostics keletkezik.
6. `source_duplicate_ref` szandekosan nincs az 1-4 precedence listaban, mert az csak Stage-7 dedupe fazisban ertelmezheto (mar canonicalizalt/whitelistelt candidatek kozotti utkozes), nem kezdeti reject-condition konfliktus.

### 2/c) Reason Namespace Boundary (Required)

1. Top-level verifier artifact `reason_code` namespace:
   - pl. `evidence_missing`, `evidence_unverifiable` (artifact-level decision).
2. Source-policy per-ref namespace:
   - `rejected_refs[].reason` only (`source_*` codes).
3. Empty-ref-list szabaly:
   - top-level path: `reason_code=evidence_missing`,
   - policy-mode path: `fallback_applied=false`,
   - source-policy path: `rejected_refs=[]` (nincs per-ref reason).
4. A ket namespace nem keverheto (tiltott: top-level kod `rejected_refs[].reason` mezoben, vagy forditva).

### 2/d) Ref Processing Pipeline Order (Deterministic)

1. Stage-1 normalize:
   - fragment strip.
2. Stage-2 empty-path gate:
   - ha a fragment-strip utan ures path marad -> `source_not_whitelisted` (canonicalization elott).
3. Stage-3 protocol gate:
   - `://` detektalas -> `source_protocol_not_allowed`.
4. Stage-4 canonicalization gate:
   - realpath/canonicalization/read hiba -> `source_canonicalization_failed`.
5. Stage-5 scope gate:
   - repo/worktree rooton kivuli canonical path -> `source_outside_repo_scope`.
6. Stage-6 whitelist pattern gate:
   - csak `/.pairflow/evidence/<single-segment>.log` engedett (Phase 1 direct-child only),
   - ettol eltero pattern (nem `.log`, nested path, egyeb location) -> `source_not_whitelisted`.
   - fallback (`fallback_applied=true`) esetben is pontosan ugyanez a direct-child gate ervenyes.
7. Stage-7 duplicate gate:
   - canonical duplicate -> `source_duplicate_ref` + `rejected_refs` bejegyzes; stable first-seen retained.
   - ez post-precedence dedupe lepes; a 2/b precedence lista nem vonatkozik ra.

### 3) Behavior Contract

1. `review_artifact_type=document` utvonal erintetlen:
   - tovabbra is trusted skip (`docs-only scope, runtime checks not required`).
2. Nem-document utvonalon:
   - only whitelistelt ref content kerulhet `EvidenceSource(kind="ref")` listaba.
   - summary source maradhat candidate, de nem eleg trusted provenance-hez.
3. Ha csak rejected refek vannak:
   - ne lehessen `verified` command status ref provenance-szel.
   - vegso status `untrusted` maradjon (`evidence_missing` vagy `evidence_unverifiable`, a meglevo szabalyok szerint).
4. Mixed refs eset:
   - allowed refek rendesen feldolgozhatok,
   - rejected refek diagnosztikaban latszanak,
   - rejected ref jelenlete onmagaban ne torje meg az allowed log evidence pozitiv esetet.
5. Empty-ref-list explicit policy:
   - nem-document bubble + `refs=[]` + claim-free summary esetben ref source ures marad,
   - vart kimenet: `status=untrusted`, `reason_code=evidence_missing` (missing command evidence path),
   - vart policy allapot: `fallback_applied=false`,
   - ez kulon edge-case-kent lefedendo (nem csak mixed/all-rejected reszekent).
6. Fragment-only ref explicit policy:
   - ha a ref fragment-strip utan ures pathra esik (pl. `#L1`), akkor rejected (`source_not_whitelisted`).
7. Duplicate ref explicit policy:
   - canonical path alapjan deduplikacio kotelezo; ugyanaz a canonical ref tobbszor nem olvashato be.
   - tie-break rule: az elso sikeresen canonicalizalt es beolvasott ref nyer input-sorrend szerint (stable first-seen).
   - duplicate refek `rejected_refs` listaba kerulnek `source_duplicate_ref` reasonnel.
8. Relative ref explicit policy:
   - relativ ref elfogadhato, ha canonicalizalva repo/worktree gyokeren belul marad es whitelistelt (`.pairflow/evidence/<single-segment>.log`),
   - traversal/outside relativ ref rejected (`source_outside_repo_scope`).

### 4) Error and Fallback Contract

| Trigger | Behavior | Fallback | Priority | Timing |
|---|---|---|---|---|
| ref protocol detected (`://`) | reject ref | continue with remaining refs | P1 | required-now |
| canonicalization/read failure | reject ref | continue with remaining refs | P1 | required-now |
| policy evaluator error | strict fallback mode | accept only canonical direct-child `/.pairflow/evidence/<single-segment>.log` (nested tovabbra is rejected) | P1 | required-now |
| all refs rejected | no trusted ref evidence | existing classifier path (`missing/unverifiable`) | P1 | required-now |
| mixed allowed+rejected | partial accept | allowed refs only influence verification | P1 | required-now |
| empty refs list (`refs=[]`) | explicit edge-case classification | claim-free summary mellett `evidence_missing` path, `fallback_applied=false` | P2 | required-now |
| fragment-only ref (`#...`) | invalid normalized path | reject as `source_not_whitelisted` | P2 | required-now |
| duplicate refs (same canonical path) | dedupe before read | first canonical hit retained; duplicates go to `rejected_refs` with `source_duplicate_ref` | P2 | required-now |

### 5) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | Markdown artifact reject | `--ref done-package.md` | verifier fut | ref rejected `source_not_whitelisted`; ref nem source, nincs trusted ref provenance | P1 | required-now |
| T2 | Artifact JSON reject | `--ref reviewer-test-verification.json` | verifier fut | ref rejected `source_not_whitelisted`; diagnostics reason explicit | P1 | required-now |
| T3 | Canonical log accept | `--ref .pairflow/evidence/test.log` | verifier fut | ref source elfogadott, jelenlegi pozitiv path nem regresszal | P1 | required-now |
| T4 | Mixed refs | log + markdown refs | verifier fut | csak log szamit, markdown rejected listaban | P1 | required-now |
| T5 | URL ref reject | `--ref https://...` | verifier fut | ref rejected `source_protocol_not_allowed` (precedence szerint) | P1 | required-now |
| T6 | Wrong extension reject | `--ref .pairflow/evidence/test.txt` | verifier fut | ref rejected `source_not_whitelisted` | P1 | required-now |
| T7 | Fallback determinism | policy evaluator forced failure | verifier fut | strict fallback aktiv (`fallback_applied=true`); direct-child policy fallbackban is ervenyes (nested rejected); false-positive nincs | P1 | required-now |
| T8 | Docs guidance sync | docs update | review | accepted patterns explicit dokumentalva | P2 | later-hardening |
| T9 | AC#6 non-regression | `review_artifact_type=document` | verifier fut | docs-only shortcut nem regresszal; trusted skip path valtozatlan | P2 | required-now |
| T10 | Outside repo/worktree ref reason | abs ref a repo/worktree gyokeren kivul | verifier fut | ref rejected `source_outside_repo_scope` reasonnel | P2 | required-now |
| T11 | Empty ref list behavior | `refs=[]` + claim-free summary (nem-document) | verifier fut | `status=untrusted`, `reason_code=evidence_missing`, `fallback_applied=false` | P2 | required-now |
| T12 | Lifecycle binding directness | mixed+outside-scope fixture | verifier fut | `EvidenceSourcePolicyDecision` required fieldjei (`allowed_ref_paths`,`rejected_refs`,`fallback_applied`) letrehozas->fogyasztas uton kovethetoen megmaradnak | P3 | required-now |
| T13 | Canonicalization failure reason | symlink/realpath hiba szimulacio | verifier fut | per-ref reason `source_canonicalization_failed` | P2 | required-now |
| T14 | Fragment-only ref edge case | `--ref #L1` | verifier fut | ref rejected, `source_not_whitelisted`; no source read | P2 | required-now |
| T15 | Duplicate ref dedupe tie-break | ugyanarra a canonical logra mutato tobb ref | verifier fut | tie-break determinisztikus: stable first-seen input ref nyer; duplicate bejegyzesek `rejected_refs`-ben `source_duplicate_ref` reasonnel | P2 | required-now |
| T16 | Relative in-scope ref | `--ref ./.pairflow/evidence/test.log` | verifier fut | whitelist szabaly szerint elfogadhato | P2 | required-now |
| T17 | Relative outside traversal | `--ref ../outside/.pairflow/evidence/test.log` | verifier fut | rejected `source_outside_repo_scope` | P2 | required-now |
| T18 | Reason namespace boundary | claim-free summary + non-empty rejected ref fixture (`--ref done-package.md`) | verifier fut | top-level `reason_code=evidence_missing` es `rejected_refs[].reason=source_not_whitelisted` namespace-ek nem keverednek (`AC#15`) | P2 | required-now |
| T19 | Nested evidence path depth gate | `--ref .pairflow/evidence/subdir/test.log` | verifier fut | rejected `source_not_whitelisted`, mert Phase 1-ben csak direct-child log (`/.pairflow/evidence/<single-segment>.log`) engedett | P2 | required-now |

### 5/a) T12 Observability Test Seam (No Runtime Code Changes)

1. Where:
   - a megfigyelesi seam az existing `verifyImplementerTestEvidence(...)` boundary, plus az abbol kepzett diagnostics/decision output.
2. How:
   - fixture input: mixed refs + outside-scope ref + fallback-trigger scenario,
   - assertion set:
     - only allowed refs jelennek meg command source oldalon,
     - rejected okok precedence-sorrendben jelennek meg diagnosticsban,
     - fallback allapot (`fallback_applied`) dontesi hatasa kimenetben visszakovetheto,
     - nincs ad-hoc re-filtering a lifecycle soran (policy output egyszer kepzodik, es azzal osszhangban marad a dontes),
     - required mezok (`allowed_ref_paths`, `rejected_refs`, `fallback_applied`) drop/rename nelkul maradnak,
     - ugyanazon fixture mellett az output stabil (field-preservation assertion-orientaltan bizonyithato).
3. Constraint:
   - a seam validalasa test-fixture/assertion szinten tortenik; runtime implementacios kod modositasat nem igenyli.

T8 note:
1. `T8` review checkpoint tipus (docs guidance sync), nem runtime assertion teszt; implementacios coverage kovetelmenyt nem valt ki onmagaban.

### 6) Non-Functional Contract

1. Determinisztikus viselkedes: ugyanazon ref lista mellett ugyanaz allow/reject eredmeny.
2. Nincs uj kulso dependency.
3. Nincs uj network I/O.
4. Ref processing komplexitas linearis maradjon a refszamhoz kepest.

## L2 - Implementation Notes (Optional)

1. Javasolt helper split:
   - `isEvidenceLogPath(path)` (pure path predicate)
   - `filterWhitelistedRefs(refs, roots)` (policy assembly + diagnostics)
2. Reason string format legyen stabil machine-readable prefixszel (pl. `source_policy:<code>`), hogy tesztelheto legyen.
3. Docs update min form:
   - "Command verification evidence-hez csak `.pairflow/evidence/<single-segment>.log` refet adj meg (Phase 1: nincs nested alkonyvtar)."
   - "Artifact/prose ref (done-package, reviewer artifact JSON) nem valid command evidence."
4. Meta note:
   - a korabbi `Review Control` / `Spec Lock` szerkesztoi meta-szekciok szandekosan nincsenek visszahozva; a feladat normativ szerzodesre fokuszal.

## Acceptance Criteria

Timing note:
1. AC #8 P2/later-hardening scope (deferred), konzisztensen CS5/T8 jelolesevel; AC #1-#7 es AC #9-#20 required-now.

1. Nem-whitelisted ref nem jarulhat hozza `verified` command evidence-hez.
2. `done-package.md` es `reviewer-test-verification.json` explicit regressziosan blokkolt ref-forras.
3. Canonical `/.pairflow/evidence/<single-segment>.log` pozitiv path valtozatlanul mukodik.
4. Mixed refs esetben partial-accept viselkedes determinisztikus.
5. Policy fallback hibaag false-positive `verified` nelkul, strict modban fut, explicit `fallback_applied=true` allapottal (`T7`), es fallbackban is direct-child depth policy ervenyes.
6. Docs-only shortcut (`review_artifact_type=document`) nem regresszal.
7. Diagnosticsban visszakeresheto, hogy mely ref miert lett rejected, es a fallback marker canonical helye determinisztikus (`diagnostics.source_policy.mode_marker`, public `reason_detail` string-compatible marad).
8. Docs guidance frissitve van az elfogadott `--ref` patternrol.
9. AC #6 explicit teszttel fedett (`T9`), nem csak implikaltan.
10. `source_outside_repo_scope` reason code explicit teszttel fedett (`T10`).
11. `EvidenceSourcePolicyDecision` lifecycle (letrehozas, fogyasztas, field preservation) call-siteokhoz kotott es dedikalt teszttel (`T12`) fedett.
12. Empty-ref-list edge-case (`refs=[]`) explicit expected kimenettel definialt es tesztelt (`T11`).
13. `source_canonicalization_failed` reason dedikalt teszttel fedett (`T13`).
14. Fragment-only, duplicate es relative ref edge-case-ek dedikaltan lefedettek (`T14-T17`).
15. Reason namespace boundary explicit: top-level `reason_code` es source-policy `rejected_refs[].reason` nem keverheto (`T18`).
16. `source_protocol_not_allowed` dedikalt acceptance kriteriumkent rogzitett es T5-hoz kotott.
17. Duplicate ref tie-break determinisztikus (stable first-seen), es dedikalt teszttel (`T15`) fedett.
18. Duplicate diagnostics explicit: duplicate ref `rejected_refs`-be kerul `source_duplicate_ref` reasonnel (`T15`).
19. Empty-ref-list contract explicit es test-bound: `reason_code=evidence_missing` + `fallback_applied=false` egyutt kotelezo (`T11`).
20. Evidence path depth policy determinisztikus es explicit: Phase 1-ben csak direct-child `/.pairflow/evidence/<single-segment>.log` engedett; nested path rejected (`T19`).
