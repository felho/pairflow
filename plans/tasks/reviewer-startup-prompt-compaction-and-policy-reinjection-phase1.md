---
artifact_type: task
artifact_id: task_reviewer_startup_prompt_compaction_and_policy_reinjection_phase1_v4
title: "Reviewer startup policy delivery: snapshot artifact + absolute pointer"
status: draft
phase: phase1
target_files:
  - src/v11/shared/start/startCommandPrompts.ts
  - src/v11/shared/start/startCommandResumePrompts.ts
  - src/v11/shared/start/startCommandContext.ts
  - src/v11/shared/start/startCommandTmuxLaunch.ts
  - src/v11/shared/start/startCommandApi.ts
  - tests/core/bubble/startBubble.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer startup policy delivery: snapshot artifact + absolute pointer

## L0 - Policy

### Goal

A reviewer startup/resume promptban a nagy inline policy szoveg helyett artifact snapshot legyen, es a prompt csak erre a snapshotra mutato abszolut path pointert adjon.

### In Scope

1. Startup prompt: inline policy dump eltavolitasa, policy file pointer beadasa.
2. Resume prompt: inline policy dump eltavolitasa, ugyanarra a policy file pointerre hivatkozas.
3. Bubble start elokeszites: policy snapshot fajl MINDIG ujrairas canonical forrasbol startup/resume elott, utana read-back olvashatosag + non-empty ellenorzes.
4. Top-level start hibaagban reasonCode megtartas: a policy snapshot hibakod ne vesszen el wrapping kozben.
5. Tesztmigracio: startup/resume assertok frissitese pointer-modera.

### Out of Scope

1. PASS uzenetek es PASS policy delivery modositas.
2. Reviewer policy tartalmi ujratervezes.
3. Barmilyen egyeb startup/resume prompt refaktor, ami nem a fenti pointer-celhoz kell.

### Safety Defaults

1. Startup/resume promptban tilos a teljes `Full canonical ontology` inline dump.
2. Startup/resume promptban kotelezo a policy snapshot fajl abszolut path pointer es az explicit "olvasd be" utasitas.
3. Pointer formatum: `Reviewer policy file: <absolute-path>`.
4. A `<absolute-path>` kotelezoen a bubble artifacts snapshotra mutat: `<repoPath>/.pairflow/bubbles/<bubbleId>/artifacts/reviewer-policy-snapshot.md`.
5. Relativ path pointer startup/resume promptban tiltott.
6. Minden `bubble start` futas elejen kotelezo a snapshot fajl deterministic ujrairasa canonical policy forrasbol (nincs "reuse existing snapshot as source-of-truth" mod).
7. Snapshot write/read-back/non-empty validation hiba eseten `bubble start` alljon le fail-fast hibaval.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: reviewer startup/resume prompt szoveg + start context snapshot fajlkezeles + start api hiba wrap reasonCode-megorzessel.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/start/startCommandPrompts.ts` | `buildReviewerStartupPrompt` | `(input: { ..., policySnapshotPathAbs: string }) -> string` | reviewer startup prompt epites | inline full policy helyett `Reviewer policy file:` abszolut pointer + `Read this file before first review action`; rovid `Severity Ontology v1 reminder` megmarad | P1 | required-now | T1 |
| CS2 | `src/v11/shared/start/startCommandResumePrompts.ts` | `buildResumeReviewerStartupPrompt` | `(input: { ..., policySnapshotPathAbs: string }) -> string` | reviewer resume prompt epites | inline full policy helyett `Reviewer policy file:` abszolut pointer + `Read this file before first review action`; rovid `Severity Ontology v1 reminder` megmarad | P1 | required-now | T2 |
| CS3 | `src/v11/shared/start/startCommandContext.ts` | `loadStartExecutionContext` (+ helyi helper) | `(input) -> StartExecutionContext` | context osszeallitas soran, prompt epites elott | minden startkor canonical forrasbol deterministic snapshot-write a `reviewer-policy-snapshot.md` fajlba; read-back + non-empty check; abszolut path visszaadasa (`policySnapshotPathAbs`) | P1 | required-now | T3,T4,T5,T8 |
| CS4 | `src/v11/shared/start/startCommandTmuxLaunch.ts` | fresh/resume launch prompt input wiring | `(input) -> launch config` | startup/resume prompt builder hivasok | contextbol kapott `policySnapshotPathAbs` atadasa reviewer startup/resume promptoknak | P1 | required-now | T1,T2,T3,T7 |
| CS5 | `src/v11/shared/start/startCommandApi.ts` | `startBubble` top-level error handling | `(input,deps) -> StartBubbleResult` | context-load + start flow top-level error kezeles | ha error mar `StartBubbleError` reasonCode-dal, valtozatlan tovabbitas context-load es start-flow hibakra is; nem-StartBubbleError csak ekkor wrap | P1 | required-now | T6 |
| CS6 | `tests/core/bubble/startBubble.test.ts` | startup/resume regresszio + hibaag | vitest | startup/resume command assert + fail-fast assert + overwrite assert | no-inline-full-ontology + abszolut pointer token + read-instruction token + reminder kept + reasonCode lock + overwrite-on-start | P1 | required-now | T1,T2,T4,T5,T6,T7,T8 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer startup policy delivery | policy full inline szoveg a startup promptban | policy snapshot fajl + abszolut prompt pointer | `policySnapshotPathAbs`, `Reviewer policy file:` sor, `Read this file before first review action` sor, `Severity Ontology v1 reminder` sor | N/A | behavior-tightening | P1 | required-now |
| Reviewer resume policy delivery | policy full inline szoveg a resume promptban | policy snapshot fajl + abszolut prompt pointer | `policySnapshotPathAbs`, `Reviewer policy file:` sor, `Read this file before first review action` sor, `Severity Ontology v1 reminder` sor | N/A | behavior-tightening | P1 | required-now |
| Start snapshot lifecycle | create-if-missing + reuse | always-overwrite-on-start canonical snapshot | `policySnapshotPathAbs`, deterministic write on every start, read-back non-empty validation | N/A | behavior-tightening | P1 | required-now |
| Start fail-fast policy snapshot | generic wrapped start error | policy-snapshot specifikus reasonCode megtartott top-level hibaig | `StartBubbleError.reasonCode=REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE` snapshot write/read/empty hiba eseten | N/A | behavior-tightening | P1 | required-now |

Normative rules:

1. Startup/resume prompt nem tartalmazhat `Full canonical ontology (embedded from` szoveget.
2. Startup/resume prompt kotelezoen tartalmazza a `Reviewer policy file:` sort.
3. Startup/resume prompt kotelezoen tartalmazza a `Read this file before first review action` sort.
4. `Reviewer policy file:` sorban szereplo path kotelezoen abszolut path.
5. Kotelezo snapshot artifact path: `<repoPath>/.pairflow/bubbles/<bubbleId>/artifacts/reviewer-policy-snapshot.md` (fresh es resume esetben is ugyanez).
6. Snapshot artifactot minden start elejen canonical policy forrasbol kotelezo felulirni; mar meglevo fajl csak output target, nem source-of-truth.
7. Canonical policy snapshot tartalom forrasa kotelezoen ugyanaz a canonical ontology source, amelybol a runtime full ontology text is keszul (nincs kulon kezi szoveg forras).
8. Snapshot artifactnak read-back utan non-empty tartalommal kell rendelkeznie.
9. A rovid `Severity Ontology v1 reminder` szakasz a promptban megmarad; csak a full inline dump tiltott.

Required interface deltas:

1. `StartExecutionContext` kotelezo uj mezo: `policySnapshotPathAbs: string`.
2. `buildReviewerStartupPrompt` kotelezo uj input mezo: `policySnapshotPathAbs: string`.
3. `buildResumeReviewerStartupPrompt` kotelezo uj input mezo: `policySnapshotPathAbs: string`.
4. Startup/resume prompt builder hivasokban a `policySnapshotPathAbs` atadasa kotelezo, implicit/global lookup tiltott.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Filesystem (`.pairflow/bubbles/<id>/artifacts`) | `reviewer-policy-snapshot.md` deterministic feluliras minden start elejen canonical forrasbol; utana read-back + non-empty ellenorzes | silent fallback pointer nelkul, relativ pointer, inline dump visszaallitas, ures snapshot elfogadasa, preexisting snapshot tartalom valtozatlan reuse-ja | determinisztikus startup/resume viselkedes | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| policy snapshot fajl write/feluliras sikertelen | local FS | throw | bubble start megszakitasa | REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE | error | P1 | required-now |
| policy snapshot fajl read-back sikertelen | local FS | throw | bubble start megszakitasa | REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE | error | P1 | required-now |
| policy snapshot fajl read-back utan ures | local FS | throw | bubble start megszakitasa | REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE | error | P1 | required-now |
| top-level start error handling (context-load szakasz) | StartBubbleError | throw | ha StartBubbleError erkezik reasonCode-dal, valtozatlan tovabbitas | preserve incoming reasonCode | error | P1 | required-now |
| top-level start error handling (run flow szakasz) | StartBubbleError | throw | ha StartBubbleError erkezik reasonCode-dal, valtozatlan tovabbitas | preserve incoming reasonCode | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `buildReviewerSeverityOntologyReminder` rovid reminder resze megmarad | P1 | required-now |
| must-use | start context prep pathban snapshot artifact deterministic overwrite (fresh/resume kozosen) | P1 | required-now |
| must-use | snapshot tartalom canonical forrasa a reviewer severity ontology canonical source legyen (single source-of-truth) | P1 | required-now |
| must-not-use | `includeFullOntology: true` startup/resume prompt epiteskor | P1 | required-now |
| must-not-use | preexisting snapshot content implicit trust/reuse ujrageneralas nelkul | P1 | required-now |
| must-not-change | PASS delivery path ebben a fazisban | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Startup prompt pointer mode | fresh start | `bubble start` | reviewer startup command tartalmazza: `Reviewer policy file:` + `Read this file before first review action` + `Severity Ontology v1 reminder`; es nem tartalmazza: `Full canonical ontology (embedded from` | P1 | required-now | automated test |
| T2 | Resume prompt pointer mode | resumable bubble | `bubble start` resume | reviewer resume command tartalmazza: `Reviewer policy file:` + `Read this file before first review action` + `Severity Ontology v1 reminder`; es nem tartalmazza: `Full canonical ontology (embedded from` | P1 | required-now | automated test |
| T3 | Snapshot lifecycle overwrite-on-start | snapshot hianyzik | `bubble start` | start soran `reviewer-policy-snapshot.md` letrejon/felulirjon canonical tartalommal, es az atadott pointer abszolut path legyen | P1 | required-now | automated test |
| T4 | Fail-fast when snapshot write fails | snapshot write hiba | `bubble start` | start fail-fast es `StartBubbleError.reasonCode=REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE` | P1 | required-now | automated test |
| T5 | Fail-fast when snapshot read-back fails or empty | snapshot read/empty hiba | `bubble start` | start fail-fast es `StartBubbleError.reasonCode=REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE` | P1 | required-now | automated test |
| T6 | Reason-code preservation through top-level error handling | snapshot hiba context-load vagy start-flow retegekben | `bubble start` | top-levelben is megmarad a `REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE` reasonCode | P1 | required-now | automated test |
| T7 | Resume pointer exact artifact path | resumable bubble | `bubble start` resume | `Reviewer policy file:` sor pontosan `<repoPath>/.pairflow/bubbles/<bubbleId>/artifacts/reviewer-policy-snapshot.md` abszolut pathra mutat | P1 | required-now | automated test |
| T8 | Existing stale snapshot is overwritten | snapshot mar letezik eltero (nem ures) tartalommal | `bubble start` | start deterministicen canonical tartalomra felulirja; prompt pointer az ujrairt fajlra mutat | P1 | required-now | automated test |

## Assumptions

1. A policy snapshot ugyanaz lehet fresh es resume esetben.
2. A hossz problema fo oka a startup/resume inline policy dump.
3. A policy snapshot tartalma a `bubble start` futas elejen deterministicen ujrageneralodik, es utana a futas soran nem mutaljuk.

## Review Control

1. Minden finding legyen evidence-alapu, es startup/resume pointer contractra + fail-fast reasonCode-megorzesre fokuszaljon.

## Spec Lock

Task `IMPLEMENTABLE`, ha mind teljesul:

1. Startup/resume reviewer promptban nincs inline full ontology dump.
2. Startup/resume reviewer promptban van policy file pointer + explicit read utasitas.
3. Startup/resume pointer abszolut path, es a snapshot artifactra mutat (fresh/resume egyezo celpath).
4. Policy snapshot fajl minden startkor canonical forrasbol felulirva/ujrageneralva van.
5. Snapshot write/read-back/empty hiba eseten `bubble start` fail-fast.
6. Fail-fast policy snapshot hiba `StartBubbleError.reasonCode` mezoben `REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE` ertekkel jelenik meg, top-level error handlingben is megorizve.

## Hardening Backlog (Optional)

1. Opcionalis: snapshot hash marker a tartalom-drift explicit detektalasara.
