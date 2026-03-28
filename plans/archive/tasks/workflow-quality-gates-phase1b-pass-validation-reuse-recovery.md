---
artifact_type: task
artifact_id: task_workflow_quality_gates_phase1b_pass_validation_reuse_recovery_v1
title: "Workflow Quality Gates Phase 1B - PASS Validation Reuse and Recovery Hardening"
status: implementable
phase: phase1b
target_files:
  - "src/core/runtime/passValidationEvidence.ts"
  - "src/v11/application/restart/runRestartFlow.ts"
  - "src/v11/application/reconcile/runReconcileFlow.ts"
  - "src/v11/application/restart/restartCommandContract.ts"
  - "src/v11/application/reconcile/reconcileCommandContract.ts"
  - "src/v11/shared/restart/restartCommandDependencyResolution.ts"
  - "src/v11/shared/reconcile/reconcileCommandDependencyResolution.ts"
  - "tests/core/runtime/passValidationEvidence.test.ts"
  - "tests/v11/application/pass/passValidationGate.test.ts"
  - "tests/v11/application/restart/runRestartFlow.test.ts"
  - "tests/v11/application/reconcile/runReconcileFlow.test.ts"
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Workflow Quality Gates Phase 1B - PASS Validation Reuse and Recovery Hardening

## L0 - Policy

### Goal

A PASS validation trusted reuse modell fail-closed hardeningje ugyanarra az authority-re epitve: reuse csak akkor engedelyezett, ha a canonical artifact tenyleges command coverage-e, fingerprintje, freshness-e es recovery-allapota megbizhato. A restart/reconcile recovery marker logika ezt a dontest tamogatja, de nem hozhat letre uj inkonzisztens allapotot vagy fantom filesystem allapotot.

### Context (Authority Clarification)

1. A canonical PASS validation artifact az egyetlen reuse-authority. A marker vagy korabbi "trusted" allapot csak segedjelzes lehet, de nem irhatja felul a canonical artifact tartalmat.
2. A trusted reuse nem termekcel onmagaban: ha reuse deny tortenik, a rendszer tovabbra is friss fallback futast indithat. A task a deny-semantikat hardeneli, nem terminal hibautat akar generalni.
3. A recovery marker ketfele informaciot hordozhat:
   - recovery tortent es ezert reuse-ot deny-olni kell;
   - recovery allapot bizonytalan, mert a marker korrupt vagy nem ertelmezheto.
   Mindket eset fail-closed, de auditalhatoan kulonbozo ok.
4. A restart/reconcile flow csak olyan recovery marker side effectet vegezhet, amely nem hoz letre uj, korabban nem letezo worktree konyvtarat vagy arva markerfajlt.
5. A repo mar hasznal explicit validation contract mintat: authority split, reason code discipline, acceptance traceability, es fail-closed defaultok. Ez a task ugyanebbe a mintaba kell illeszkedjen.

### Terminology Alignment

1. "Canonical artifact" = a PASS validationhoz eltett authoritative artifact, amely tartalmazza a `required_command_set_id`, `commands[]`, fingerprint/freshness adatokat es a tenyleges command-kimeneteket.
2. "Trusted reuse" = az a dontes, amikor a gate egy uj futas helyett a canonical artifact alapjan elfogadja a korabbi validaciot.
3. "Coverage validation" = annak ellenorzese, hogy a canonical artifact `commands[]` tenylegesen lefedi a required command setet, sikeres exit statusokkal es trusted log pathokkal.
4. "Recovery uncertainty" = olyan allapot, amikor egy letezo recovery marker nem parse-olhato/invalid, ezert nem allapithato meg megbizhatoan, hogy recovery tortent-e.
5. "Repo-level marker" = a canonical bubble/repo recovery marker irasi helye.
6. "Worktree-level marker" = opcionális, csak mar letezo worktree alatt fenntarthato mirror/diagnostic marker; nem lehet uj worktree letrehozasanak oka.

### In Scope

1. Reuse eligibility fail-closed validalasa a canonical artifact `commands[]` tartalmabol, nem csak a tarolt marker-mezo vagy korabbi trusted jelzes alapjan.
2. Artifact command coverage, exit status es log-path trust ellenorzese reuse elott.
3. Malformed vagy szemantikailag serult PASS validation artifact deny-olja a reuse-t.
4. Recovery marker olvasas: korrupcio, truncation, invalid schema, invalid timestamp kezelese recovery uncertainty-kent.
5. A missing recovery marker es a malformed existing marker kozul az utobbi explicit uncertainty-path legyen; ne mosodjon ossze a "nincs marker" esettel.
6. Restart flow marker persistence semantics finomitasa ugy, hogy a restart sikeres maradhasson, mikozben a marker-persist problema auditalhato warning/reason kod marad.
7. Reconcile flow marker persistence finomitasa ugy, hogy ne hozzon letre fantom worktree pathokat, es csak letezo worktree-re irjon worktree-szintu markert.
8. Reuse denial reason code-ok es metadata mezok pontos, auditálhato kitoltese.

### Out of Scope

1. PASS gate core policy resolution vagy runner contract ujratervezese.
2. Meta-review / approval same-round reviewer convergence parity.
3. Uj artifact schema version vagy publikus CLI/API surface.
4. Altalanos restart/reconcile UX vagy unrelated warning taxonomy attervezese.

### Safety Defaults

1. Barmilyen korrupt vagy nem teljes canonical artifact `reusable=false` eredmenyt adjon, ne trusted reuse-t.
2. Letezo, de malformed recovery marker recovery uncertainty-t jelentsen; missing marker viszont ne valjon onmagaban uncertainty-vá.
3. Recovery uncertainty reuse deny legyen, ne silent skip vagy "treat as absent".
4. Reconcile nem teremthet uj worktree konyvtarat csak recovery marker miatt.
5. Restart/reconcile warning oke, de recovery uncertainty es marker-persist hiba ne vesszen el.
6. Worktree-level marker iras best-effort lehet, de a repo-level authority vagy annak hiánya maradjon auditálhato.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Belso artifact/recovery semantics hardening; nincs uj publikus config vagy API contract.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/passValidationEvidence.ts` | `evaluatePassValidationEvidenceReuse` | `(input) -> Promise<PassValidationReuseDecision>` | reuse evaluator | Trusted reuse csak akkor mehessen at, ha a canonical artifact `commands[]` tenylegesen lefedi a required command setet, minden required command sikeres, es a stored marker/trusted flag nem mondhat ellent a canonical artifactnak | P1 | required-now | T1, T2, T3, T8, T11 |
| CS2 | `src/core/runtime/passValidationEvidence.ts` | `readPassValidationRecoveryMarker` | `(repoPath, bubbleId, worktreePath?) -> Promise<ReadPassValidationRecoveryMarkerResult>` | recovery marker reader | A return contract implementacio-kotelezően tri-state legyen: `missing`, `valid`, vagy `recovery_uncertain`; malformed existing marker nem teljesulhet silent `undefined` + side-channel warning mintaval | P1 | required-now | T4, T5, T12 |
| CS3 | `src/v11/application/restart/runRestartFlow.ts` | `runRestartFlow` | `(input, deps) -> Promise<RestartBubbleResult>` | restart flow | Recovery marker figyelmeztetes/siker semantics maradjon egyertelmu: restart sikeres lehet marker-persist warning mellett is, de a warning es reuse deny kovetkezmenye auditalhato maradjon, es marker persistence itt sem hozhat letre uj worktree pathot | P1 | required-now | T7, T10, T13, T15 |
| CS4 | `src/v11/application/reconcile/runReconcileFlow.ts` | `runReconcileFlow` | `(repoPath, input, deps) -> Promise<ReconcileRuntimeSessionsReport>` | reconcile flow | Marker persistence ne hozzon letre uj arva worktree pathokat; worktree marker csak akkor irhato, ha a target worktree mar letezik es a repo-level marker path ettol fuggetlenul kezelheto | P1 | required-now | T6, T9, T13, T14, T15 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reuse authority | marker-field trust only / partial artifact trust | canonical artifact command coverage revalidation | `required_command_set_id`, `commands[].kind`, `commands[].command`, `commands[].exit_code`, `commands[].log_path` | stored trusted marker metadata | non-breaking internal hardening | P1 | required-now |
| Recovery marker read semantics | parse/schema hibak gyakran silently ignored | explicit tri-state read contract: `missing` \| `valid` \| `recovery_uncertain` | `state`; `marker` when `state=valid`; `reason_code`, `marker_path` when `state=recovery_uncertain` | worktree context | non-breaking internal | P1 | required-now |
| Marker persistence scope | repo/worktree viszony implicit | repo-level marker authority explicit, worktree marker only when safe | `repoPath`, `bubbleId`, `source`, `now` | `worktreePath` csak ha letezo es trusted | non-breaking internal | P1 | required-now |
| Reuse denial metadata | okok osszemosodhatnak | mismatch vs recovery uncertainty auditálhatoan elvalik; shared reason code hasznalat eseten az al-esetet metadata vagy trigger-context teszi egyertelművé | reason code, reusable flag, metadata summary | warning detail | non-breaking internal | P1 | required-now |
| Marker persist failure audit metadata | shared reason code, de subcase-mezok nincsenek nev szerint kotve | shared `pass_validation_recovery_marker_persist_failed` csak minimum audit metadata mellett elfogadhato | `flow`, `marker_scope`, `target_path_kind`, `target_path_exists`, `failed_targets`, `persisted_targets` | `worktreePathRequested`, `repo_marker_path`, `worktree_marker_path` | non-breaking internal | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| FS | existing repo-level runtime marker path, optional existing worktree marker path, bubble fallback artifact | nem letezo worktree fa letrehozasa restart/reconcile marker persistence vagy cleanup kozben | Restartban es reconcile-ben egyarant tiltott a `mkdir`-szeru side effect marker miatt | P1 | required-now |
| Reuse decision | deny + fallback trigger | trusted skip korrupt/partial artifact vagy recovery uncertainty alapjan | fail-closed az elvart default | P1 | required-now |
| Marker read | explicit corruption/uncertainty surfacing | malformed existing marker csendes `undefined`-da degradalasa | absence es corruption kulon contract | P1 | required-now |
| Restart/reconcile result contract | successful operation warning metadata mellett | marker write reszleges hibajabol misleading terminal success/failure osszemosas | operation result maradjon ertelmezheto es auditálhato | P2 | required-now |

Constraint: ha itt nincs explicit engedelyezett filesystem side effect, implementacio restartban vagy reconcile-ben sem hozhat letre uj worktree pathot recovery marker miatt.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| artifact `commands[]` coverage mismatch | artifact reader | result | `reusable=false`, fallback runner | `pass_validation_evidence_mismatch` | warn | P1 | required-now |
| artifact `required_command_set_id` mismatch | artifact reader | result | `reusable=false`, fallback runner | `pass_validation_evidence_mismatch` | warn | P1 | required-now |
| artifact command non-zero / missing log / invalid path | artifact reader | result | `reusable=false`, fallback runner | `pass_validation_evidence_mismatch` | warn | P1 | required-now |
| stored trusted marker suggests reuse but canonical artifact disagrees | artifact reader + marker metadata | result | canonical artifact wins; `reusable=false`, fallback runner | `pass_validation_evidence_mismatch` | warn | P1 | required-now |
| corrupt recovery marker JSON/schema/timestamp | marker reader | result | `reusable=false`, fallback runner | `pass_validation_evidence_recovery_uncertain` | warn | P1 | required-now |
| missing recovery marker | marker reader | result | continue normal artifact-based reuse evaluation | none | info | P2 | required-now |
| repo-level marker write blocked during reconcile | FS | fallback | keep reconcile/removal success when otherwise valid, surface warning with minimum audit metadata (`flow`, `marker_scope`, `target_path_kind`, `target_path_exists`, `failed_targets`, `persisted_targets`), do not invent a worktree-level alternate authority, future reuse stays deny-safe | `pass_validation_recovery_marker_persist_failed` | warn | P1 | required-now |
| reconcile marker write requested for non-existent worktree | FS | fallback | skip worktree marker write, do not create directory, preserve repo-level path handling | `pass_validation_recovery_marker_persist_failed` | warn | P1 | required-now |
| reconcile marker write blocked on existing path | FS | fallback | keep removal success, surface warning, preserve repo-level marker if possible; shared reason code remains acceptable only if the blocked-existing-path subcase is explicit in metadata/context | `pass_validation_recovery_marker_persist_failed` | warn | P2 | required-now |
| repo-level marker write blocked during restart | FS | fallback | restart may still succeed with warning carrying the same minimum audit metadata (`flow`, `marker_scope`, `target_path_kind`, `target_path_exists`, `failed_targets`, `persisted_targets`), but no alternate authority is implied and future reuse remains deny-safe until marker state is trustworthy | `pass_validation_recovery_marker_persist_failed` | warn | P1 | required-now |
| restart marker write blocked but restart succeeds | FS | fallback | restart success warninggal, reuse deny repo/fallback marker szerint | `pass_validation_recovery_marker_persist_failed` | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing required-command-set derivation helpers, canonical artifact helpers, restart/reconcile dependency seams | P2 | required-now |
| must-use | existing PASS validation reason-code vocabulary (`pass_validation_evidence_mismatch`, `pass_validation_evidence_recovery_uncertain`, `pass_validation_recovery_marker_persist_failed`) | P1 | required-now |
| must-not-use | trust by stored marker only, worktree path blind recreation, silent recovery-marker corruption ignore | P2 | required-now |
| must-not-use | missing marker es malformed marker osszemosasa ugyanabba a deny/skip pathba | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | semantically corrupted artifact | matching `required_command_set_id` but partial/empty `commands[]` | reuse evaluate | deny as mismatch | P1 | required-now | automated test |
| T2 | reused command failed previously | artifact trusted flag but a command has non-zero exit | reuse evaluate | deny as mismatch | P1 | required-now | automated test |
| T3 | log path escapes or missing | artifact log path invalid | reuse evaluate | deny as mismatch | P1 | required-now | automated test |
| T4 | corrupt recovery marker JSON | marker file truncated / invalid JSON | reuse evaluate | deny as recovery uncertain, not as silent absence | P1 | required-now | automated test |
| T5 | invalid recovery timestamp | parsed marker but invalid `occurred_at` | reuse evaluate | deny as recovery uncertain | P1 | required-now | automated test |
| T6 | reconcile removes missing bubble | removed runtime session with no worktree present | reconcile flow | warning maybe, but no new worktree subtree created and no phantom marker path appears | P1 | required-now | automated test |
| T7 | restart success + marker write failure | restart otherwise succeeds | restart flow | success result with warning, no misleading terminal failure | P1 | required-now | automated test |
| T8 | canonical artifact overrides stale trusted marker | stored metadata indicates prior trusted reuse, but canonical artifact is incomplete | reuse evaluate | deny as mismatch; stored marker never authorizes reuse alone | P1 | required-now | automated test |
| T9 | reconcile writes only safe marker targets | repo-level marker path is available, worktree path is absent or stale | reconcile flow | repo-level path handling remains bounded, worktree path is not created | P1 | required-now | automated test |
| T10 | restart partial marker persistence remains auditable | restart can write one marker target but not another | restart flow | restart result stays successful, warning metadata identifies persist failure, future reuse remains deny-safe | P2 | required-now | automated test |
| T11 | required command set mismatch | artifact `commands[]` is otherwise well-formed, but `required_command_set_id` differs from the current required set | reuse evaluate | deny as mismatch | P1 | required-now | automated test |
| T12 | missing recovery marker positive path | no recovery marker exists, but canonical artifact is otherwise eligible | reuse evaluate | normal artifact-based reuse evaluation continues; absence is not treated as recovery uncertainty | P2 | required-now | automated test |
| T13 | repo-level marker write failure remains bounded | restart or reconcile otherwise succeeds, de authoritative repo-level marker write fails | flow completes | warning surfaces, no alternate authority is implied, and future reuse remains deny-safe | P2 | required-now | automated test |
| T14 | reconcile existing-path marker write failure | worktree path exists, de marker write az existing targeton blockolt | reconcile flow | removal/report success megmarad, warning surfaces, blocked-existing-path subcase metadata egyertelmu, es nincs alternate authority | P2 | required-now | automated test |
| T15 | shared persist-failure reason code carries audit metadata | restart/reconcile marker persist failure a kozos reason code-dal surface-olodik | flow completes warninggal | metadata minimummezoi (`flow`, `marker_scope`, `target_path_kind`, `target_path_exists`, `failed_targets`, `persisted_targets`) alapjan a subcase auditálhato | P2 | required-now | automated test |

## Acceptance Criteria

1. AC1: Trusted reuse authority a canonical artifact `commands[]` coverage-e es success-trust contractja, nem a tarolt marker vagy korabbi trusted flag.
2. AC2: Malformed, szemantikailag nem teljes, vagy `required_command_set_id`-ben eltéro PASS validation artifact soha nem eredményez trusted reuse-t.
3. AC3: Letezo, de malformed recovery marker explicit `recovery_uncertain` deny pathot ad; missing marker tovabbra is normal artifact-based evaluationbe esik, nem keveredik ezzel ossze.
4. AC4: Restart es reconcile recovery marker side effectek nem hoznak letre fantom worktree pathokat vagy arva markerallapotot.
5. AC5: Reuse deny tovabbra is fallback-kompatibilis, nem terminal hiba, es a shared persist-failure reason code eseten is kotelezo metadata alapjan auditálhato marad.
6. AC6: A tesztmatrix lefedi a canonical artifact authority-t, recovery uncertainty-t es a restart/reconcile persistence edge-case-eket.

### 7) Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS1, CS2 | T1, T2, T3, T8 |
| AC2 | CS1 | T1, T2, T3, T8, T11 |
| AC3 | CS1, CS2 | T4, T5, T12 |
| AC4 | CS3, CS4 | T6, T7, T9, T10, T13 |
| AC5 | CS1, CS2, CS3, CS4 | T4, T5, T7, T10, T13, T14, T15 |
| AC6 | CS1, CS2, CS3, CS4 | T1-T15 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Kesoibb lehet kulon artifact checksum vagy signed metadata, ha a local tamper-resistance kesobb fontos lesz.
2. [later-hardening] Marker multi-write durabilityrol lehet kulon follow-up observability.
3. [later-hardening] Ha a repo/worktree marker szerepkorok tovabb bovulnek, erdemes lehet explicit helperrel elvalasztani az authoritative repo-level write-ot es az opportunistic worktree mirror write-ot.

## Assumptions

1. A Phase 1A core gate mar letezik vagy e taskkal parhuzamosan keszul, de itt a fokusz a reuse/recovery fail-closed hardening.
2. A reuse deny tovabbra is fallback-trigger, nem onallo terminal hiba, ha a fallback run sikeres.
3. A canonical artifact command-level tartalma megbizhatobb authority, mint barmely kulon tarolt trusted/recovery marker.

## Resolved Decisions

1. A canonical artifact `commands[]` tartalma az egyetlen reuse-authority; marker metadata csak tamogato input lehet.
2. A missing recovery marker es a malformed existing marker kulon contractot kap; csak az utobbi okoz recovery uncertainty-t.
3. A worktree-level marker write opportunistic lehet, de sosem igazolhat uj worktree path letrehozasat.

## Open Questions

1. No blocking open questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Stronger artifact tamper resistance | L2 | P2 | later-hardening | review discussion 2026-03-28 | kulon task, ha local corruption modellnel erosebb vedelmet akarunk |
| H2 | Explicit repo-vs-worktree marker write helper | L2 | P2 | later-hardening | maintainability | kulon helper/task, ha a persistence agak tovabb bovulnek |

## Review Control

1. A task nem vihet be meta-review vagy approval parity javitasokat.
2. Uj `required-now` csak reuse/recovery fail-closed semantikahoz kapcsolodo bizonyitott resekbol johet.
3. Nem elfogadhato olyan implementacio, amely a stored marker vagy korabbi trusted flag alapjan enged reuse-t a canonical artifact teljes command-level bizonyiteka nelkul.
4. Nem elfogadhato olyan implementacio, amely a malformed existing recovery markert silently missing markerkent kezeli.
5. Nem elfogadhato olyan implementacio, amely reconcile kozben uj worktree pathot hoz letre pusztan marker persistence miatt.
6. Nem elfogadhato olyan implementacio, amely repo-level marker write failure eseten worktree-level vagy mas alternat authorityt implikal a deny-safe fallback helyett.
7. Nem elfogadhato olyan implementacio, amely a shared `pass_validation_recovery_marker_persist_failed` reason code-ot a subcase-et azonosito minimum metadata nelkul surface-olja.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. AC1-AC6 traceability sorai lefedik a CS1-CS4 es T1-T15 contractokat.
2. A `required_command_set_id` mismatch es a missing-marker positive path kulon teszttel es traceability-vel fedett.
3. A canonical artifact authority es a recovery uncertainty kulon fail-closed dontesi utkent van rogzitve, es a recovery marker reader tri-state contractja implementacio-kotelező.
4. Restart/reconcile marker persistence edge-case-ek, beleertve a repo-level write failure-t, nem lazitjak a reuse deny vagy filesystem safety alapelvet.
5. A shared persist-failure reason code minden erintett subcase-ben minimum audit metadata mellett szerepel.
