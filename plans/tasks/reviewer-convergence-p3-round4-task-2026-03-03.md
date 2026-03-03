# Task: Reviewer Convergence Decision Gate for Round 4+ Non-Blockers

## Goal

Megszüntetni azt a loophelyzetet, amikor `round >= 4` mellett csak nem-blokkoló reviewer findingok (`P2/P3`) maradnak, de a reviewer mégis `pairflow pass`-t küld, ami új fix kört nyit.

Elvárt eredmény:
1. A reviewer döntési logika determinisztikus legyen `pass` vs `converged` között.
2. A prompt és runtime gate ugyanazt a szabályt érvényesítse.
3. A már bevezetett `P2` round 4+-os konvergencia-engedés ténylegesen érvényesüljön a gyakorlatban is.

## Background

Érintett eset: `ai-chat-session-idempotency-refine-2026-03-03` bubble.

Megfigyelés:
1. Round 4-ben maradt 1 db `P3`.
2. A reviewer `PASS`-t küldött findinggal, ezért `pass_intent=fix_request` lett, és új kör nyílt.
3. Ez nem policy-szintű blokkolás volt, hanem parancsválasztási döntés.

Releváns jelenlegi viselkedés:
1. Reviewer `PASS` intent: findings -> `fix_request`, `--no-findings` -> `review`.
2. Konvergencia policy-ban `P2` csak round 2-3-ban blokkol; round 4+-ban már nem.
3. `pairflow converged` policy-ellenőrzés explicit hívásra fut, `PASS` ágon nem.

## Problem Statement

A rendszerben most külön életet él:
1. `converged` policy (mit szabadna lezárni).
2. reviewer `pass` döntési default (mit csinál ténylegesen az agent).

Következmény:
1. A reviewer könnyen marad a "van finding => pass" mintán.
2. Emiatt a round 4+-os non-blocker konvergencia lehetőség gyakran nem realizálódik.

## Scope

### In Scope

1. Reviewer command decision gate explicit beemelése startup/resume/handoff promptokba.
2. Runtime oldali reviewer PASS guard bevezetése `round >= severity_gate_round` és non-blocker-only finding esetére.
3. Konfigurálható küszöb bevezetése (`severity_gate_round`, alapérték: `4`).
4. Policy, prompt, és runtime hibaüzenetek összehangolása.
5. Tesztek frissítése a döntési kapu viselkedésére.

### Out of Scope

1. Új severity szintek vagy ontology átírás.
2. Teljes reviewer output contract redesign.
3. UI szintű interaktív döntéstámogatás.

## Proposed Behavior

`round < severity_gate_round`:
1. Marad a jelenlegi viselkedés (P0/P1 fix_request; P2/P3 esetén prompt ajánlás lehet, de nem kötelező force).

`round >= severity_gate_round`:
1. Ha van bármely `P0/P1` finding: reviewer `pass --finding ...` (fix_request) engedett.
2. Ha csak `P2/P3` findingok vannak: reviewer `pass --finding ...` tiltott, reviewernek `converged --summary ...` útvonalat kell használnia.
3. Clean eset: reviewer `converged --summary ...`.

## Implementation Touchpoints

1. `src/core/bubble/startBubble.ts`
2. `src/core/runtime/tmuxDelivery.ts`
3. `src/core/agent/pass.ts`
4. `src/core/convergence/policy.ts`
5. Kapcsolódó CLI/config típusok és tesztek

## Acceptance Criteria

1. A reviewer promptok tartalmaznak top-priority command decision gate blokkot.
2. `round >= severity_gate_round` és reviewer `PASS` + only `P2/P3` finding esetén a parancs explicit hibával elutasításra kerül.
3. A hibaüzenet egyértelműen `pairflow converged --summary` használatára irányít.
4. `round >= severity_gate_round` és `P0/P1` jelenlétnél a reviewer `PASS` továbbra is engedett.
5. `round < severity_gate_round` esetben nincs regresszió a jelenlegi PASS útvonalon.
6. A `severity_gate_round` alapértelmezetten `4`, és konfigurációból felülírható.
7. Unit/integration tesztek lefedik a `round 3` vs `round 4` és `P1` vs `P2/P3` elágazásokat.
8. E2E szinten igazolt, hogy `round >= 4` + only `P3` esetén nem nyílik új implementer fix kör reviewer `PASS` miatt.

## Notes

1. Ez a task az eddigi `P2` gate-et nem visszavonja, hanem végre összeköti a reviewer parancsválasztási logikával.
2. A cél nem "minden findinggal auto-converge", hanem az, hogy non-blocker findingok ne kényszerítsenek felesleges új fix kört round 4+ szakaszban.

## Date

2026-03-03
