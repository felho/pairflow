---
artifact_type: note
artifact_id: note_actor_runtime_interface_opportunity3_simulation_scenarios_v1
title: "Actor Runtime Interface Opportunity 3 Simulation Scenarios"
status: active
updated_at: 2026-04-22
owners:
  - "felho"
---

# Opportunity 3 Simulation Scenarios

## Purpose

1. Ez a dokumentum nem implementacios spec.
2. A celja az, hogy nehany hipotetikus workflow-szcenarion keresztul stress-testelje az `O3` discovery modelljet.
3. Kifejezetten arra keressuk a valaszt:
   - hol eleg egyszeru a modell,
   - hol kezd el tulbonyolodni,
   - es melyik absztrakcio tunik valoban hasznosnak.

## Working Assumptions

1. A workflow a sajat role-jait deklaralja.
2. Egy aktiv role a jelen `O3` korben dedikalt panelt kap.
3. A role workflow-beli konkretizaciojahoz tartozik:
   - agent
   - runner
   - primer expected output
   - orchestration contract
   - es current-tree-kozeli olvasatban egy compose-olt instruction surface
4. A gate nem a role helyett dont, hanem a node execution eredmenyet ertelmezi.
5. A `human_question` tipusu kimenet cross-cutting outcome, nem routing-dontes.

## Scenario 1

### Name

1. Minimal implementer -> reviewer workflow

### Intent

1. A legegyszerubb eset, ahol nincs extra branch, csak normal kor.

### Hypothetical Workflow

```yaml
workflow:
  id: simple_delivery
  roles:
    implementer:
      agent:
        base_runner_session: pure_codex
        instruction_surface:
          - task_context
          - workspace_scope
          - pairflow_command_guidance
          - canonical_emit_guidance
          - implementer_evidence_handoff_guidance
      runner: codex
      expected_output: pass
      orchestration_contract:
        required_evidence: ["changed_files", "verification_note"]
    reviewer:
      agent:
        base_runner_session: pure_codex
        instruction_surface:
          - task_context
          - workspace_scope
          - pairflow_command_guidance
          - canonical_emit_guidance
          - reviewer_findings_pass_guidance
          - reviewer_gate_policy_reminders
      runner: codex
      expected_output: pass
      orchestration_contract:
        required_evidence: ["review_findings"]
  nodes:
    - id: implement
      role: implementer
      next: review
    - id: review
      role: reviewer
      gate: review_gate
```

### What This Tests

1. A workflow-owned role declaration eleg-e ahhoz, hogy a bubble ne legyen truth owner.
2. Vilagos-e, hogy az implementer evidence-kovetelmenye nem hardcoded orchestrator logika, hanem orchestration contract.
3. A dedikalt paneles baseline egyszeru marad-e.
4. Nem vezet-e felre az, ha az `agent`-et tul egyszeruen `persona/mode/approach` configkent kepzeljuk el.

### Reading

1. Ez a szcenario jol tamasztja ala a mostani modellt.
2. Itt a `role`, `agent`, `runner`, `orchestration_contract` szetvalasztasa termeszetes.
3. A current-tree olvasat szempontjabol termeszetesebbnek tunik az instruction-surface compose, mint a tisztan `persona/mode/approach` nyelv.
4. Nem latszik szuksegesnek tovabbi absztrakcio.

## Scenario 2

### Name

1. Implementer with cross-cutting `human_question`

### Intent

1. Megnezzuk, hogy a `human_question` hogyan illeszkedik a modellbe ugy, hogy a gate maradjon a routing owner.

### Hypothetical Workflow

```yaml
workflow:
  id: implement_with_human_input
  roles:
    implementer:
      agent:
        base_runner_session: pure_codex
        instruction_surface:
          - task_context
          - workspace_scope
          - canonical_emit_guidance
          - implementer_evidence_handoff_guidance
          - blocker_escalation_guidance
      runner: codex
      expected_output: pass
      allowed_cross_cutting_outcomes: ["human_question"]
      orchestration_contract:
        required_evidence: ["changed_files", "verification_note"]
  nodes:
    - id: implement
      role: implementer
      gate: implement_gate
```

### Execution Possibilities

1. Normal case:
   - primer output: `pass`
   - gate tovabbengedi a workflow-t
2. Missing information case:
   - cross-cutting outcome: `human_question`
   - a gate/orchestrator emberi valaszra tereli a flow-t

### What This Tests

1. Tarthato-e a szetvalasztas a primer expected output es a cross-cutting outcome kozott.
2. Vilagos marad-e, hogy a role nem workflow-dontest hoz.
3. Szükség van-e az `allowed_cross_cutting_outcomes` szintu explicit deklaraciora.

### Reading

1. Ez a szcenario erosen tamogatja a `Q5` iranyt.
2. A `human_question` mint cross-cutting outcome elegansabb, mint ha a role-derived output lookupot probalnank toldozni.
3. Itt mar latszik, hogy a node/role konkretizacio valoszinuleg tenyleg canonical owner valamilyen output-igazsagra.

## Scenario 3

### Name

1. Optional meta-review branch

### Intent

1. Megnezzuk, hogy egy felteteles role hogyan fer bele a workflow-owned truth + dedikalt panel baseline modellbe.

### Hypothetical Workflow

```yaml
workflow:
  id: review_with_optional_meta
  roles:
    reviewer:
      agent:
        base_runner_session: pure_codex
        instruction_surface:
          - task_context
          - canonical_emit_guidance
          - reviewer_findings_pass_guidance
          - reviewer_gate_policy_reminders
      runner: codex
      expected_output: pass
      orchestration_contract:
        required_evidence: ["review_findings"]
    meta_reviewer:
      agent:
        base_runner_session: pure_codex
        instruction_surface:
          - task_context
          - canonical_emit_guidance
          - meta_review_submit_guidance
          - parity_requirements
      runner: codex
      expected_output: meta_review_result
      orchestration_contract:
        required_evidence: ["meta_review_report"]
  nodes:
    - id: review
      role: reviewer
      gate: maybe_meta_review
    - id: meta_review
      role: meta_reviewer
      gate: meta_review_gate
```

### What This Tests

1. Egy workflow altal deklaralt role lehet-e ugy first-class, hogy csak feltetelesen aktiv.
2. A dedikalt panel baseline elbirja-e azt, hogy a role nem mindig fut, de amikor fut, sajat helyet kap.
3. A `meta_reviewer` retained special case helyett el lehet-e mozdulni deklaralt workflow-owned role iranyba.

### Reading

1. Ez a szcenario tamogatja a mostani egyszerusitest:
   - nem kell slot reuse-t vagy overlayt modellezni
   - eleg azt mondani, hogy ha a branch aktiv, a role dedikalt panelt kap
2. Itt a topology-variacio elhagyasa segit, nem art.

## Scenario 4

### Name

1. Stress test for overengineering

### Intent

1. Tudatosan megnezzuk, mi lenne az a pont, ahol a modell mar tul sok reteget vinne be a jelen korhoz kepest.

### Bad Direction Signals

1. Kulon globalis role registry bevezetese pusztan azert, hogy a role kulon entitas legyen.
2. Kulon `agent_definition` es kulon runtime actor entity egyszerre.
3. Topology multiplexing, slot reuse, overlay mar az elso O3 foundation szeletekben.
4. Olyan orchestration contract rendszer, ami mar majdnem teljes workflow DSL-le no.
5. Tetszoleges, schema nelkuli runtime composition.
6. A current-tree prompt-compose ownership leegyszerusitese egy tul korai `persona/mode/approach` config shape-re.

### Reading

1. Ezek a jelek arra utalnak, hogy a modell mar tul messzire ment a mostani celhoz kepest.
2. A jelen discovery modell fo erenye pont az, ha ezek nelkul is eleg kifejezokepes.

## Current Takeaway

1. A mostani modell a fenti szcenariok alapjan mar eleg eros ahhoz, hogy tovabbvigyuk `O3-T1` iranyba.
2. A legerosebb, valoban hasznos retegek most:
   - workflow-owned role declaration
   - agent
   - runner
   - orchestration contract
   - primer expected output vs cross-cutting outcome
3. A legvaloszinubb tulbonyolitasi veszelyek:
   - topology-variacio korai megnyitasa
   - kulon ujrahasznalhato role-registry
   - tul sok entity bevezetese ugyanarra a problemara
   - es a code-owned instruction surface idotlen leegyszerusitese egy "buta" agent-configga

## Next Questions

1. Az `orchestration contract` jo nev-e, vagy kell jobb domain-szo.
2. A primer expected output canonical owner-e node, route vagy capability legyen.
3. Az `agent` definicio mennyire akar tenylegesen ujrafelhasznalhato minta lenni, es mennyire egyszeruen workflow-local konkretizacio.
4. A compose-olt instruction surface-bol mi keruljon kesobb deklaralt configba, es mi maradjon tovabbra is code-owned contract compose.
