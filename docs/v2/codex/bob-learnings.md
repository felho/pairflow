# Bob Workflow-Engine Learnings -> Pairflow v2

Dátum: 2026-03-07  
Forrás: `/Users/felho/dev/bob/docs-orig/master.md`

## Fókusz
Ebből a jegyzetből a workflow engine jellegű tanulságokat emeljük át, session-store részletek mély implementációja nélkül.

## Fő tanulságok (workflow engine)

1. Process és gate szétválasztása alapelv legyen (`WHEN` vs `WHAT`).
2. A stage típusok legyenek first-class primitívek:
   - `sequential`
   - `loop`
   - `parallel-human-queue`
   - `parallel-step-loop`
3. A kernel legyen determinisztikus state machine, audit event kimenettel.
4. Aszinkron, párhuzamos human decision queue jelentős throughput nyereséget ad.
5. Nagy dokumentumoknál item-szintű, just-in-time context extraction (CHECK loop) működőképesebb, mint globális konvergencia.
6. Trust/auto-resolve küszöbök stage-specifikusak legyenek, ne globálisan egységesek.
7. Provenance mezők kötelezőek már az első event sémában (`run_id`, `step_id`, `agent_config`, `model_id`, `gate_result`).

## Pairflow v2-re fordítva

1. `WorkflowTemplate` + explicit stage type registry.
2. Pluggable gate/policy registry (`PolicyModule` irány).
3. Kötelező audit/event schema provenance mezőkkel.
4. `parallel-human-queue` mint első új stage primitive.
5. `parallel-step-loop` későbbre, amikor dependency- és shared-file scheduling már stabil.

## Session tárolás: most nem cél, de legyen nyitott

1. Event schema támogassa opcionálisan a `session_id` mezőt.
2. Storage réteg adapteres legyen (runtime state vs history/index külön).
3. Retention/indexing policy konfigurálható legyen, ne hardcode.

## Mit ne vegyünk át változtatás nélkül

1. Túl széles scope-ú „full SDLC in one workflow” indulásként.
2. Túl korai, komplex intelligence réteg (kalibráció/feedback) core stabilitás előtt.
3. Olyan session-boundary logika, ami még nincs esemény- és állapotmodellhez illesztve.

## Minimál következő lépés

1. Definiáljunk `workflow-template-v0` szerkezetet a négy stage típussal.
2. Definiáljunk `gate-registry-v0` interfészt (`hard | human | llm-judge | composite`).
3. Definiáljunk `event-schema-v0` kötelező provenance mezőkkel.
