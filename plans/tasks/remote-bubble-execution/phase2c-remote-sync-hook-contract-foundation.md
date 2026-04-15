---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase2c_sync_hook_contract_foundation_v1
title: "Remote Bubble Execution Remote Sync Hook Contract Foundation (Phase 2C)"
status: implementable
phase: phase2c-remote-sync-hook-contract-foundation
target_files:
  - src/types/bubble.ts
  - src/config/pairflowConfig.ts
  - tests/config/pairflowConfig.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Sync Hook Contract Foundation (Phase 2C)

## Current Codebase Check (2026-04-15)

1. A `docs/remote-bubble-execution.md` mar tartalmazza a `pairflow_sync_command` design-szintu fogalmat a global `[remotes.<name>]` configban, mint optional pre-start best-effort hookot.
2. A tenyleges implementalt global config contract ezt meg nem hordozza:
   - `src/types/bubble.ts` `PairflowRemoteHostConfig` shape-je jelenleg csak `host`, `repo_base`, `user`, `pairflow_command`, `default_port_forwards` mezoket tartalmaz,
   - `src/config/pairflowConfig.ts` parser/validator key-listaja nem fogad `pairflow_sync_command` mezot.
3. Emiatt a field jelenleg nem retained baseline:
   - TOML parse/validate oldalon unknown-field vagy invalid-key hibara futna,
   - a kesobbi remote start activation nem olvashat meg explicit leszallitott config-contractrol.
4. A `Phase 2B` mar lezarta a remote create write-pathot:
   - a remote bubble local configkent letrehozhato,
   - az executor metadata es a `remote.json(kind="created")` pointer persistence mar baseline,
   - de a remote runtime start tovabbra sem aktivalodott.
5. A `Phase 2C` feladata ezert szuk, contract-foundation closure:
   - a global remote config optional `pairflow_sync_command` mezot kap,
   - parser/validator/test szinten,
   - consume/execute ownership tovabbra is successor-only `Phase 2D`.

## Parent Plan Fit / Stable Sequencing

1. A task a parent plan `Phase 2B -> Phase 2C -> Phase 2D` sorrendjet valtozatlanul orokli:
   - `Phase 2B` ownershipa a remote create write-path exposure es a created-pointer persistence lezárása,
   - `Phase 2C` ownershipa kizarolag a sync-hook config-contract closure,
   - `Phase 2D` ownershipa tovabbra is kulon a remote SSH start activationnel es a hook consume/invoke szemantikaval.
2. Ez a task nem nyit uj sequencinget a parent planhoz kepest:
   - nem mozditja elore a remote start activationt,
   - nem hoz be uj operator read-model vagy cleanup routing scope-ot,
   - nem materializalja elore a `Phase 2D+` utodtaskok barmelyiket.
3. Remaining-task viability explicit:
   - a `Phase 2D` tovabbra is szuk activation task marad, mert a hook itt csak validalt config-contractkent jelenik meg,
   - a `Phase 2E`/`2F` read-model consume, illetve a `Phase 3A`/`3B`/`3C` mutation/cleanup/recovery scope erintetlen marad.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis kizarlag a global remote config contractot zarja le:
   - optional `pairflow_sync_command` field a `PairflowRemoteHostConfig` shape-ben,
   - TOML parser acceptance a `[remotes.<name>]` section alatt,
   - validator normalization es fail-closed invalid-input behavior,
   - explicit regression coverage.
3. A task nem vallalja:
   - a hook tenyleges futtatasat,
   - SSH invoke vagy remote shell orchestrationt,
   - start-flow, status/list, attach vagy cleanup consume alignmentot,
   - bubble-local override vagy per-bubble hook contractot.
4. A `pairflow_sync_command` ebben a fazisban opaque string contract:
   - Pairflow nem ertelmezi package managerre, repo layoutra vagy exit-code policyre bontva,
   - csak azt zarjuk le, hogy a global configban optional, non-empty stringkent letezhet.
5. Design-doc fit:
   - a `docs/remote-bubble-execution.md` a sync-hook config-surface es az opaque target-specific string jelleg design baseline-ja,
   - ez a task ebbol csak a config-contract inheritance-et orokli,
   - a hook consume/invoke/warn/continue szemantika tovabbra is successor-only `Phase 2D`.

## L0 - Policy

### Goal

Lezarni a remote pre-start sync hook minimal config-contractjat ugy, hogy a kesobbi remote start activation explicit, validalt global config fieldrol olvashassa a hookot, mikozben:
1. a hook tovabbra is optional marad,
2. hianya explicit "nincs hook konfigurálva" szemantikaval bír,
3. invalid shape eseten a global config fail-closed marad,
4. semmilyen consume/execute side effect nem nyilik meg ebben a fazisban.

### Domain / Control Model Summary

1. Business invariant: a `pairflow_sync_command` csak optional config-contract ebben a fazisban; jelenlete nem jelent meg futtatast, hianya pedig nem jelent fallbacken eloallitott implicit hookot.
2. Control model: a hook jelenleterol vagy hianyarol kizarolag a global `~/.pairflow/config.toml` `[remotes.<alias>].pairflow_sync_command` mezője dönthet.
3. Read-path rule: a kesobbi consumer kizarlag a validalt global `remotes` mapbol olvashatja a hookot; docs, `pairflow_command`, `repo_base`, bubble-local config vagy runtime artifact nem lehet hook-truth source.
4. Forbidden fallback:
   - `pairflow_command` vagy `repo_base` alapjan implicit hook szintetizalasa,
   - docs example string visszamasolasa runtime defaultkent,
   - bubble-local vagy start-command inline stringgel valo contract-potlás a global config helyett.
5. Allowed resolution path: `[remotes.<alias>].pairflow_sync_command` quoted TOML string -> parser -> validator -> trimelt optional config field -> successor `Phase 2D` consume.
6. Missing-data rule: ha a mező hianyzik, az explicit "no sync hook configured" allapot; nincs default string, nincs warning-only synthetic fallback, es a start activation majd csak skip-elheti.
7. Phase boundary:
   - owned here: global config contract closure, parser, validator, type shape, tests,
   - explicit successor `Phase 2D`: optional hook consume/invoke/skip/fail-soft operational semantics,
   - explicit out-of-scope successors: status/list/attach/read-model es lifecycle routing.
8. Design-doc containment rule: a `docs/remote-bubble-execution.md` ebben a fazisban csak a hook config-surface letezesenek es target-specific opaque-string jellegenek baseline-ja; a remote start-flowban szereplo invoke/warn/continue narrative tovabbra sem proof surface ehhez a taskhoz.

### Authority Boundary Map

1. Authority producer: a global config parser/validator, amely a canonical `remotes.<alias>.pairflow_sync_command` mezot eloallitja.
2. Stored authority: `~/.pairflow/config.toml` validated `remotes` mapja.
3. In-scope consumers: parser, validator, type contract, config tests.
4. Explicit out-of-scope consumers: remote `start`, SSH adapter, diagnostics/read-model, attach, cleanup/recovery.
5. Export surface closed in this phase: `yes`, de csak config-contract szinten; nincs runtime behavior activation.

### Bounded Task Shape

1. `primary_task_shape`: `contract_or_persisted_authority_foundation`
2. `secondary_adjacent_shape`: `none`
3. Shape rationale:
   - ez a task shared config contractot zar le,
   - nincs producer-side runtime mutation,
   - nincs consume-family alignment vagy activation ugyanebben a szeletben.

### Shared Contract Compatibility

1. Current consumers inventory:
   - `src/config/pairflowConfig.ts` parser/validator/load path,
   - `src/v11/application/create/createCommandRuntime.ts` es a `Phase 2B` create path a remote config `host` / `default_port_forwards` mezeit mar fogyasztja, de a sync hookot meg nem,
   - a kesobbi remote start consumer family meg nincs aktiválva.
2. Change type: `additive`
3. Compatibility rule:
   - az uj mező optional,
   - a meglevo consumer code-val kompatibilis marad,
   - consumer alignment nem ebben a taskban tortenik.

### Baseline Preservation

1. Must-preserve behaviors:
   - a jelenlegi global top-level config parse/validate contract valtozatlan marad,
   - a meglevo remote mezok (`host`, `repo_base`, `user`, `pairflow_command`, `default_port_forwards`) retained shape-ben maradnak,
   - unknown remote config mezok tovabbra is explicit rejectet kapnak.
2. Allowed new contract:
   - optional `pairflow_sync_command` non-empty string a `[remotes.<name>]` sectionben.
3. Forbidden regression interpretations:
   - a `pairflow_sync_command` nem valik kotelezove,
   - a mező hianya nem parse error,
   - a field nem authoral semmilyen runtime invoke-ot ebben a fazisban.

### In Scope

1. `PairflowRemoteHostConfig` additive field bovitese.
2. `[remotes.<name>]` parser key-list es validator key-list bovitese.
3. `pairflow_sync_command` optional non-empty string validation + trim.
4. Parser/validator/load regresszio- es contract-tesztek.

### Out of Scope

1. Remote `start` path consume vagy invoke wiring.
2. Best-effort fail-soft policy implementacio.
3. Bubble-level hook override.
4. SSH transport, shell escaping, quoting strategy, exit-code mapping.
5. `status`, `list`, `attach`, approval, cleanup vagy recovery consume.
6. Az elozo pontban tiltott operator-visible surfaces barmelyiken olyan wording vagy start-result reporting, amely hook execution outcome-ot reportal, warningol vagy inferal.

### Safety Defaults

1. Ha a mező hianyzik, a validalt configban sincs `pairflow_sync_command`.
2. Ha a mező jelen van, csak non-empty stringkent fogadhato el.
3. Whitespace-only vagy invalid shape fail-closed config validation hiba.
4. A task nem vezet be implicit default hookot.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - global config contract (`~/.pairflow/config.toml` `[remotes.<name>]` shape)
3. Blast radius:
   - `src/types/bubble.ts`
   - `src/config/pairflowConfig.ts`
   - `tests/config/pairflowConfig.test.ts`
4. Deferred alignment:
   - runtime consume/execute tovabbra is `Phase 2D`.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `0`
7. `risk_score`: `4`
8. `single-task allowed`: `yes`
9. Split decision note:
   - a contract-closure itt szuk es bounded,
   - a consume/execute activation tudatosan kulon `Phase 2D`.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Optional hook contract | `pairflow_sync_command` optional remote field | hianya valid allapot, nincs implicit default | P1 | required-now |
| Canonical source | csak global `[remotes.<alias>]` map | a hook nem inferalhato mas mezobol vagy docsbol | P1 | required-now |
| Opaque string policy | Pairflow nem bontja alkotoelemekre a commandot | parser/validator csak non-empty string contractot zar le | P1 | required-now |
| Fail-closed invalid config | whitespace-only vagy nem-string ertek invalid | config validation hibat dob, nincs silent ignore | P1 | required-now |
| Successor-only consume | a mező jelenlete nem authoral invoke-ot | `start/**` es mas consumer surfaces erintetlen maradnak | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `PairflowRemoteHostConfig` | global config parse/load + create-time remote config consumers | additive | optional `pairflow_sync_command?: string` mező | runtime start consume Phase 2D |
| `[remotes.<name>]` TOML schema | `parsePairflowGlobalConfigToml`, `validatePairflowGlobalConfig`, config tests | additive | parser/validator key-list bovitese | hook invoke semantics Phase 2D |

### 0b) Target File Discipline

| Class | Files | Rule | Reason |
|---|---|---|---|
| primary | `src/types/bubble.ts`, `src/config/pairflowConfig.ts`, `tests/config/pairflowConfig.test.ts` | expected edit set | itt zarhato le a global sync-hook contract |
| frozen-by-default | `src/v11/application/start/**`, `src/v11/application/status/**`, `src/v11/application/attach/**` | semantic edit nem vart | consume/activation successor-owned |
| must-not-open | remote create/start/runtime/read-model/lifecycle consumers | ebben a taskban tiltott | ne csusszon at activation vagy operator surface scope-ba |

### 1) Call-site Matrix

| ID | File | Function / Entry | Exact Signature | Insertion Point | Expected Behavior | Priority | Timing | Evidence Target |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | `PairflowRemoteHostConfig` | type shape | remote host config contract | optional `pairflow_sync_command?: string` mező jelenik meg | P1 | required-now | T1 |
| CS2 | `src/config/pairflowConfig.ts` | parser key whitelist | internal parser | `[remotes.<name>]` parse branch | a `pairflow_sync_command` valid remote keykent elfogadott | P1 | required-now | T1 |
| CS3 | `src/config/pairflowConfig.ts` | `validatePairflowGlobalConfig(input)` | `unknown -> ValidationResult<PairflowGlobalConfig>` | remote config validate branch | optional non-empty stringet fogad, whitespace-only erteket rejectal, trimeli a success pathon | P1 | required-now | T2, T3 |
| CS4 | `src/config/pairflowConfig.ts` | `loadPairflowGlobalConfig(path?)` | `string? -> Promise<PairflowGlobalConfig>` | global config load boundary | a file-load path ugyanazt a validated optional `pairflow_sync_command` shape-et adja vissza, mint a parser/validator contract | P1 | required-now | T6 |
| CS5 | `tests/config/pairflowConfig.test.ts` | config contract tests | vitest cases | parse/validate/load surface | parser, validation, absence, load es regresszio coverage explicit | P1 | required-now | T1-T6 |

### 2) Test Matrix

| ID | Scenario | Input | Action | Expected Result | Priority | Timing | Surface |
|---|---|---|---|---|---|---|---|
| T1 | parser accepts remote sync hook field | `[remotes.homelab]` with quoted `pairflow_sync_command` | parse global TOML | parsed remote object hordozza a mezőt | P1 | required-now | `tests/config/pairflowConfig.test.ts` |
| T2 | validator rejects whitespace-only sync hook | programmatic config object with `"   "` | validate global config | `PAIRFLOW_REMOTE_CONFIG_INVALID` jellegu hiba a `remotes.<alias>.pairflow_sync_command` pathon | P1 | required-now | `tests/config/pairflowConfig.test.ts` |
| T3 | validator normalizes opaque hook string | programmatic config object with leading/trailing whitespace | validate global config | csak a leading/trailing whitespace trimelt string jelenik meg a validated configban; a belso opaque command content valtozatlan marad | P1 | required-now | `tests/config/pairflowConfig.test.ts` |
| T4 | missing hook remains explicit absence | remote definition without field | parse/validate config | nincs `pairflow_sync_command`, es ez valid allapot | P1 | required-now | `tests/config/pairflowConfig.test.ts` |
| T5 | unknown remote fields still reject despite new allowlist entry | remote definition with unrelated future field | validate config | tovabbra is unknown-field hiba, a task csak a sync-hook fieldet authorizalja | P1 | required-now | `tests/config/pairflowConfig.test.ts` |
| T6 | load path preserves optional sync hook contract | temp `config.toml` with `[remotes.homelab].pairflow_sync_command` | `loadPairflowGlobalConfig(path)` | a loaded config trimelt optional `pairflow_sync_command` mezot ad vissza a validated remote objectben | P1 | required-now | `tests/config/pairflowConfig.test.ts` |

### 3) Required Implementation Notes

1. A `pairflow_sync_command` ugyanabba az allowlist/parse/validate/normalize mintaba keruljon, mint a meglevo optional remote string mezok, de ne vezessen be shell-level ertelmezest.
2. A field csak remote sectionben legyen legalis; ne nyisson uj top-level global key contractot.
3. A success pathon csak leading/trailing whitespace-trimelt string keruljon a validated configba; a belso opaque command content nem normalizalhato tovabb.
4. A field absence semantics maradjon explicit optional, ne sentinel stringgel legyen kodolva.

### 4) Must-Use / Must-Not-Use

| Type | Reference / Surface | Priority | Timing |
|---|---|---|---|
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md` | P1 | required-now |
| must-use | `docs/remote-bubble-execution.md` mint a sync-hook config-surface es opaque target-specific wording baseline-ja | P2 | required-now |
| must-not-use | `start/**` consume/invoke behavior | P1 | required-now |
| must-not-use | `pairflow_command` alapju implicit hook fallback | P1 | required-now |
| must-not-use | bubble-local vagy runtime-derived sync hook source | P1 | required-now |

## L2 - Hardening Backlog

1. [later-hardening] A `Phase 2D` activation taskban erdemes explicit shell-safe invoke seamet lezarni a remote SSH execution boundaryn, de ez itt meg nem required-now.
2. [later-hardening] Ha a jovo beli consume telemetry vagy diagnostics kulon hook-status mezot igenyel, azt ne ebben a config-foundation taskban nyissuk meg.
3. [later-hardening] Kesesbbi docs alignmentben a `docs/remote-bubble-execution.md` `config.json` wordinget erdemes a kodbase `bubble.toml` baseline-javal tovabb tisztitani, de ez nem blokkolja a 2C config-contract closure-t.
