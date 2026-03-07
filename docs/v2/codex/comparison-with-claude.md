# Claude vs Codex v2 nézet — összehasonlítás és beemelési döntések

Dátum: 2026-03-07

## Források

- `docs/v2/claude/first-idea.md`
- `docs/v2/claude/hivemind-learnings.md`
- `docs/v2/claude/bob-learnings.md`
- `docs/v2/codex/first-idea.md`
- `docs/v2/codex/hivemind-learnings.md`
- `docs/v2/codex/bob-learnings.md`

## Hol egyezik a vélemény

1. V2 alapja deklaratív workflow modell legyen, ne hardcoded csővezeték.
2. Kernel + channel adapterek / headless-first irány helyes.
3. Help/delegation jellegű alfolyamat first-class entitás legyen.
4. Role/permission boundary explicit modellként kell (step/state alapú jogosultság).
5. Policy/gate logika legyen moduláris és bővíthető.
6. Session/store témát most nem kell teljesen megoldani, de az architektúra maradjon rá nyitott.

## Hol nem egyezik a vélemény

1. Enforcement fókusz:
   - Claude: hook-based enforcement legyen elsődleges.
   - Codex: kernel/capability enforcement legyen elsődleges, hook inkább adapter-specifikus kiegészítés.
2. V2 komplexitási indulópont:
   - Claude: erősebb graph + részletesebb workflow primitívek már korán.
   - Codex: minimál indulás (`workflow-template-v0`, `capability-matrix-v0`, core policy modulok), majd fokozatos bővítés.
3. Trust/automation ütem:
   - Claude: `llm-judge` és gradual trust gyorsabban beemelhető.
   - Codex: ezt érdemes későbbi fázisba tenni, miután a state/policy alap stabil.

## Mit vennék át a Claude nézetből a Codex baseline-ba

1. **Workflow mint graph szemlélet**:
   - A Codex `WorkflowTemplate` modellbe kerüljön be explicit `step graph / transition` nyelv.
2. **Role Scope részletezettség**:
   - `allowed_actions` és `denied_actions` mezők bevezetése step szinten.
3. **Executor interfész formalizálása**:
   - `Local/SSH/Container/Cloud` célpont mint egységes runtime adapter szerződés.
4. **Stage type és gate type konkretizálás**:
   - Bob/Claude alapján explicit készlet:
     - stage: `sequential | loop | parallel-human-queue | action`
     - gate: `hard | human | llm-judge | composite`
5. **Findings mint first-class artifact**:
   - validate -> fix ciklus szabványos artifact típussal.
6. **Provenance mezők minimum csomagja**:
   - `run_id`, `step_id`, `agent_config_snapshot`, `model_id`, `gate_result`.

## Mit nem emelnék be most a Claude nézetből

1. Hook-only enforcement mint általános stratégia.
2. Korai, széles `full SDLC` scope a v2 kezdeti fázisában.
3. Teljes gradual trust/kalibrációs intelligencia réteg első körben.

## Javasolt közös (merged) v2 baseline

1. `WorkflowTemplate` deklaratív, graph-alapú átmenetekkel.
2. `CapabilityProfile` + step-szintű `RoleScope` (allow/deny akciólista).
3. Pluggable `PolicyModule` + explicit gate típusok.
4. `HelpRequest` subflow + channel-agnostic routing.
5. `RuntimeTarget` adapteres executor réteg.
6. `EventEnvelope` audit schema minimum provenance mezőkkel.

## Rövid következő lépés

1. Készítsünk egy `workflow-template-v0.1` draftot a fenti merged baseline szerint.
2. Készítsünk egy `capability-matrix-v0.1` táblát (Role x Step x Action).
3. Készítsünk egy `event-schema-v0.1` draftot provenance mezőkkel.
