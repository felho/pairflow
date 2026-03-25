---
artifact_type: task
artifact_id: task_commit_snapshot_envelope_and_done_package_removal_phase1_v1
title: "Commit Snapshot Envelope + Done-Package Removal (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/types/protocol.ts
  - src/core/protocol/validators.ts
  - src/v11/application/commit/commitCommandContract.ts
  - src/v11/shared/commit/commitCommandApi.ts
  - src/v11/shared/commit/commitCommandApiContract.ts
  - src/v11/shared/commit/commitCommandFinalization.ts
  - src/v11/shared/commit/commitDonePackage.ts
  - src/cli/index.ts
  - tests/core/bubble/commitBubble.test.ts
  - tests/v11/application/commit/commitCommandApi.test.ts
  - tests/cli/bubbleCommitCommand.test.ts
  - tests/contracts/v11/commit.contract.runner.ts
  - tests/contracts/v11/commit.contract.test.ts
  - docs/pairflow-initial-design.md
  - docs/llm-doc-workflow-v1.md
  - README.md
plan_ref: plans/archive/pairflow-initial-plan.md
prd_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - README.md
owners:
  - "felho"
---

# Task: Commit Snapshot Envelope + Done-Package Removal (Phase 1)

## L0 - Policy

### Goal

Egyszerusitsuk a bubble commit lezaro modelljet ugy, hogy:

1. a kulon `artifacts/done-package.md` artifact megszunik mint kotelezo commit input,
2. a transcriptben a `DONE_PACKAGE` summary-bundle envelope helyett egy pontosabb, teny-alapu `COMMIT_SNAPSHOT` envelope marad,
3. a commit-flow semmilyen generated summary/prose allapotot ne perzisztaljon,
4. a rendszer ne tartson fenn backward-compatibility reteget a `DONE_PACKAGE` / `done-package.md` writer pathra.

### Context (Observed Evidence)

1. A jelenlegi modellben a `done-package.md` egy mar letezo transcript/evidence forrasokbol szarmaztathato, kezzel karbantartott prose artifact.
2. Ez a redundans artifact stale allapotba kerulhet, es approval-anyagot tehet felrevezetove, mikozben a canonical transcript es a kod mar helyes.
3. A commit pipeline jelenleg ezt a fajlt olvassa be, majd ebbol kepzi a `DONE_PACKAGE` transcript envelope summary-jat.
4. Agent-first bubble workflowban a canonical source of truth mar most is a `transcript.ndjson`, a `state.json`, a review/meta-review artifactok, a verification artifactok es a git.

### In Scope

1. A `DONE_PACKAGE` envelope tipus atnevezese `COMMIT_SNAPSHOT`-ra.
2. A `done-package.md` artifact kotelezettseg es auto-generator teljes kivezetese a commit-flowbol.
3. A commit transcript envelope payloadjanak szukitese minimalis, first-party commit tenyekre.
4. A commit CLI/runtime/tests/docs frissitese az uj, summary-mentes modellre.
5. A kapcsolodo dokumentacioban a done-package mint canonical/final bundle eltavolitasa.

### Out of Scope

1. Read-time summary view vagy uj UI handoff nezeti reteg bevezetese.
2. Historical transcript/artifact migracio regi bubble snapshotokra.
3. Barmilyen compatibility alias a `DONE_PACKAGE` -> `COMMIT_SNAPSHOT` kozos writer pathra.
4. Approval/meta-review policy redesign a commit envelope valtoztatason tul.

### Safety Defaults

1. No backward compatibility by policy: uj commit-flow nem irhat `DONE_PACKAGE` envelope-ot es nem varhat `done-package.md` artifactot.
2. Nincs dual-write, nincs legacy alias, nincs transitional fallback a regi commit artifact modellre.
3. Commit envelope payload csak direct commit tenyeket tartalmazhat; generated summary/prose tilos.
4. Ha egy meglovo helper csak a done-package writer/reader modell miatt letezik, egyszeruen torolheto vagy leszukulethet; ne tartsunk meg dead compatibility reteget.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett boundary-k:
   - protocol envelope type contract,
   - commit command/runtime contract,
   - docs/CLI user-facing commit flow contract.

### Non-Compatibility Policy (Explicit)

1. A valtozas szandekosan breaking a write pathon.
2. Nem cel a regi `DONE_PACKAGE` emit path vagy a `done-package.md`-re epulo commit pipeline eletben tartasa.
3. Historical archive/read tooling utolagos kompatibilitasa csak kulon, jovobeli task kereteben targyalhato, most nem resze a feladatnak.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/types/protocol.ts` | protocol message type domain | `DONE_PACKAGE` kikerul a canonical type enum-bol, helyere `COMMIT_SNAPSHOT` kerul; nincs legacy alias | P1 | required-now | T1 |
| CS2 | `src/core/protocol/validators.ts` | protocol envelope validation | validator csak az uj `COMMIT_SNAPSHOT` tipust fogadja commit transcript eventkent; a regi type write-path support megszunik | P1 | required-now | T1, T2 |
| CS3 | `src/v11/shared/commit/commitCommandApi.ts`, `src/v11/application/commit/commitCommandContract.ts`, `src/v11/shared/commit/commitCommandApiContract.ts` | commit runtime preparation/result contract | commit elokeszites nem olvas/letrehoz `done-package.md`-t; a result contract nem hordoz `donePackagePath` kotelezettseget | P1 | required-now | T2, T3 |
| CS4 | `src/v11/shared/commit/commitDonePackage.ts` | done-package helper | a helper megszunik vagy minimalis commit-snapshot helperre cserelodik; nincs summary-derivation, nincs file IO a done-package artifact miatt | P1 | required-now | T3 |
| CS5 | `src/v11/shared/commit/commitCommandFinalization.ts` | commit transcript append | `DONE_PACKAGE` helyett `COMMIT_SNAPSHOT` envelope appendelodik; payload csak direct commit tenyeket tartalmaz | P1 | required-now | T4, T5 |
| CS6 | `src/cli/index.ts` | bubble commit command text output | CLI output az uj envelope nevet hasznalja, es nem utal done-package-re | P2 | required-now | T6 |
| CS7 | `tests/core/bubble/commitBubble.test.ts`, `tests/v11/application/commit/commitCommandApi.test.ts`, `tests/cli/bubbleCommitCommand.test.ts`, `tests/contracts/v11/commit.contract.*` | regression + contract tests | a tesztek az uj envelope tipusra es a done-package mentes commit-flowra allnak at | P1 | required-now | T1-T7 |
| CS8 | `docs/pairflow-initial-design.md`, `docs/llm-doc-workflow-v1.md`, `README.md` | canonical docs | a dokumentacio eltavolitja a done-package kotelezettseget es az uj `COMMIT_SNAPSHOT` envelope szerepet irja le | P1 | required-now | T8 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Commit transcript event type | `DONE_PACKAGE` | `COMMIT_SNAPSHOT` | envelope `type` | none | intentionally breaking, no alias | P1 | required-now |
| Commit transcript payload | final summary bundle + done-package metadata | minimal commit facts only | `commit_sha` | `commit_message` | breaking simplification | P1 | required-now |
| Commit preparation input | staged files + non-empty done-package, vagy `--auto` generated done-package | staged files / auto-stage only; no prose artifact prerequisite | git staged content | none | breaking simplification | P1 | required-now |
| Commit result contract | includes done-package path in runtime context/result | no done-package path semantics | `commitSha`, `stagedFiles`, envelope id/type | none | breaking simplification | P2 | required-now |

Normative rules:
1. `COMMIT_SNAPSHOT` envelope payload nem tartalmazhat generated summary-t, handoff prose-t vagy mas transcript/evidence sourcebol szarmaztatott derived nezeti adatot.
2. `COMMIT_SNAPSHOT.payload.metadata.commit_sha` kotelezo.
3. `commit_message` csak akkor megengedett, ha kozvetlenul a letrejott git commit tenye; nem LLM-derived szoveg.
4. `staged_files` transcript payloadba nem kotelezo; csak akkor maradhat, ha first-party commit-fact es kulon explicit consumer igazolhato. Default policy: ne noveljuk a payloadot feleslegesen.
5. A commit-flow sem manual, sem `--auto` modban nem irhat vagy varhat `done-package.md` artifactot.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Transcript persistence | minimal commit boundary event append | generated summary bundle append | audit marker maradjon, prose ne | P1 | required-now |
| Commit runtime | git commit + state transition | done-package file read/write | commit-flow egyszerusites a cel | P1 | required-now |
| Docs/CLI text | breaking terminology csere | regi `DONE_PACKAGE` / `done-package` wording meghagyasa active flow leiraskent | docs legyenek kovetkezetesek | P1 | required-now |

Pure-by-default rule:
1. Ha nincs szukseg fajl-artifact IO-ra a commit snapshot eloallitasahoz, a commit metadata kepzes maradjon tisztan transcript/git/state alapu.

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Commit invoked `APPROVED_FOR_COMMIT` allapoton kivul | state snapshot | throw | nincs fallback | `COMMIT_STATE_INELIGIBLE` | error | P1 | required-now |
| Legacy `done-package.md` hianyzik | filesystem | no-op | nincs hiba, mert mar nem input | N/A | info | P1 | required-now |
| Legacy `done-package.md` jelen van | filesystem | ignore | commit-flow nem olvassa | `COMMIT_LEGACY_DONE_PACKAGE_IGNORED` | info | P2 | required-now |
| Legacy `DONE_PACKAGE` type-ra epito test/contract bukik | test suite | fix test/docs | ne adjunk runtime alias fallbackot | N/A | info | P1 | required-now |
| Commit append succeeded, DONE state persist failed | transcript + state store | throw | transcript marad canonical recovery source | existing post-commit state failure reason path | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing git commit outcome (`commit_sha`, optional `commit_message`) mint first-party commit fact | P1 | required-now |
| must-use | existing transcript append + state transition recovery model | P1 | required-now |
| must-not-use | generated summary, done-package prose, handoff bundle mint persisted commit input | P1 | required-now |
| must-not-use | backward compatibility alias (`DONE_PACKAGE`, `done-package.md`, dual-write, fallback parser) | P1 | required-now |
| must-not-use | multi-step deprecation path ehhez a scope-hoz | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Protocol type rename | current protocol types | validator/types betoltodnek | `COMMIT_SNAPSHOT` canonical, `DONE_PACKAGE` nem active type | P1 | required-now | automated test |
| T2 | Commit no longer requires done-package artifact | approvalra kesz bubble, staged valtozas, nincs `done-package.md` | `bubble commit` fut | commit sikeres, nincs missing done-package hiba | P1 | required-now | automated test |
| T3 | Auto mode without prose artifact generation | approvalra kesz bubble, unstaged valtozas, `auto=true` | `bubble commit --auto` fut | commit sikeres, nem jon letre `done-package.md` | P1 | required-now | automated test |
| T4 | Commit transcript emits new envelope | sikeres commit | transcript tail olvasas | utolso envelope `COMMIT_SNAPSHOT` | P1 | required-now | automated test |
| T5 | Envelope payload excludes generated summary | sikeres commit | appended envelope vizsgalat | payload nem tartalmaz summary bundle / done-package path metadata-t | P1 | required-now | automated test |
| T6 | CLI output terminology update | sikeres commit command | text output render | `COMMIT_SNAPSHOT` jelenik meg, `DONE_PACKAGE` nem | P2 | required-now | automated test |
| T7 | Contract suite no longer encodes done-package invariant | v11 commit contract tests | contract runner fut | invariants az uj commit snapshot modellhez igazodnak | P1 | required-now | automated test |
| T8 | Docs no longer instruct done-package writing | docs/README/design review | diff ellenorzes | active flow leirasokbol eltunik a mandatory done-package artifact | P1 | required-now | doc diff |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha kesobb emberi read-model summary kell, azt transcriptbol/read model presenterbol generaljuk, ne persisted envelope payloadbol.
2. [later-hardening] UI oldalon a commit summary card lehet derived view a `COMMIT_SNAPSHOT` + elozo `CONVERGENCE` + verification artifactok alapjan.

## Assumptions

1. A mostani scope-ban a breaking write-path valtozas elfogadhato, es nem kovetelmeny regi bubble archive runtime-kompatibilitasanak fenntartasa.
2. A commit envelope minimumban a `commit_sha` eleg a boundary marker szerephez; `commit_message` megtartasa megengedett, ha nem hoz vissza derived view logikat.
3. Nincs olyan kritikus runtime consumer, amelynek a `done-package.md` tovabbra is szukseges input lenne.

## Open Questions

1. A `COMMIT_SNAPSHOT` payload vegleges minimalis shape-je legyen csak `commit_sha`, vagy maradhat benne `commit_message` is mint kozvetlen commit-fact?

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Derived commit summary presenter | L2 | P3 | later-hardening | discussion outcome | csak akkor vezessuk be, ha lesz explicit emberi/UI consumer |

## Review Control

1. A review ne kerjen compatibility reteget a `DONE_PACKAGE` vagy `done-package.md` writer pathra, hacsak nincs uj, konkret runtime consumer evidence.
2. A breaking valtozas itt desired outcome, nem regresszio.
3. Minden javasolt extra envelope fieldre igazolni kell, hogy first-party fact-e es van-e konkret consumer; egyebkent maradjon ki.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:
1. a commit-flow mar sem manual, sem auto modban nem fugg `done-package.md` artifacttol,
2. a transcript commit boundary event canonical neve `COMMIT_SNAPSHOT`,
3. az envelope payload nem hordoz generated summary/prose adatot,
4. a docs/test/CLI surface egységesen az uj, backcompat-mentes modellre all at.
