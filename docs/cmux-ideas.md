# cmux-bol atveheto otletek Pairflow-hoz

Jo iranyvaltas. A `cmux` kodbazisbol tobb olyan minta van, amit Pairflow-ban erdemes atvenni, meg akkor is, ha magat a `cmux`-ot nem hasznaljatok runtime-kent.

## Legjobb atveheto mintak (Pairflow-ra forditva)

1. `identify + capabilities` parancspar a hibas kontextus ellen  
   cmux-ban ez first-class API (`system.identify`, `system.capabilities`) es a CLI is erre epit.  
   Pairflow-ban ez kulonosen passzol a "wrong thread/wrong context" celhoz.  
   Forras: [agent-browser-port-spec.md](/Users/felho/dev/repos-to-learn-from/cmux/docs/agent-browser-port-spec.md:36), [cmux.swift](/Users/felho/dev/repos-to-learn-from/cmux/CLI/cmux.swift:745), [TerminalController.swift](/Users/felho/dev/repos-to-learn-from/cmux/Sources/TerminalController.swift:1182)  
   Pairflow oldalon most nincs ilyen dedikalt "hol vagyok?" parancs: [README.md](/Users/felho/dev/pairflow/README.md:469)

2. Explicit "side-effect policy" + allowlist  
   cmux kulon policy-t vezet a nem kivant fokuszvaltozasokra, command-family lefedettseggel.  
   Pairflow analog: mely parancsok irhatnak state-et / kuldhetnek runtime inputot, es melyek garantaltan read-only-k.  
   Forras: [socket-focus-steal-audit.todo.md](/Users/felho/dev/repos-to-learn-from/cmux/docs/socket-focus-steal-audit.todo.md:6), [TerminalController.swift](/Users/felho/dev/repos-to-learn-from/cmux/Sources/TerminalController.swift:45)

3. Biztonsagi modok a vezerlo interfeszhez  
   cmux tobb socket access mode-ot ad (`cmuxOnly`, `password`, `allowAll`), plusz ancestry/UID ellenorzest.  
   Pairflow-nal ez foleg a UI/API vezerlesnel ertekes minta (lokalis auth hardening).  
   Forras: [SocketControlSettings.swift](/Users/felho/dev/repos-to-learn-from/cmux/Sources/SocketControlSettings.swift:6), [TerminalController.swift](/Users/felho/dev/repos-to-learn-from/cmux/Sources/TerminalController.swift:730), [cmux.swift](/Users/felho/dev/repos-to-learn-from/cmux/CLI/cmux.swift:475)

4. "Migration without freeze" strategia (regi + uj API parhuzamosan)  
   cmux peldasan vitte a v1->v2 atallast parity checklisttel es ket tesztsuite-tal.  
   Pairflow-nal ezt erdemes runtime backend absztrakciora alkalmazni (tmux most, mas backend kesobb).  
   Forras: [v2-api-migration.md](/Users/felho/dev/repos-to-learn-from/cmux/docs/v2-api-migration.md:7), [tests_v2/cmux.py](/Users/felho/dev/repos-to-learn-from/cmux/tests_v2/cmux.py:6)

5. Flake-turo integracios runner  
   cmux tesztrunnerben van determinisztikus bootstrap, readiness probe, retry, izolacios guard.  
   Pairflow end-to-end runtime tesztekhez ez nagyon hasznos minta.  
   Forras: [run-tests-v1.sh](/Users/felho/dev/repos-to-learn-from/cmux/scripts/run-tests-v1.sh:4)

6. CLI help drift elleni celzott regressziotesztek  
   cmux kulon tesztekkel vedi, hogy a dispatch es help szinkronban maradjon.  
   Pairflow-nal is ertekes, mert sok command es alias van.  
   Forras: [test_cli_subcommand_help_regressions.py](/Users/felho/dev/repos-to-learn-from/cmux/tests/test_cli_subcommand_help_regressions.py:70)

7. Rich diagnosztika hiba eseten (nem csak "failed")  
   cmux CLI telemetry konkret socket-diagnosztikat ad (path, owner, errno, root-cause hint).  
   Pairflow-ban ez emelne a `tmux_send_failed` / `delivery_unconfirmed` debugolhatosagat.  
   Forras: [cmux.swift](/Users/felho/dev/repos-to-learn-from/cmux/CLI/cmux.swift:98)  
   Pairflow jelenlegi alap jo: [tmuxDelivery.ts](/Users/felho/dev/pairflow/src/core/runtime/tmuxDelivery.ts:297)

8. Stabil handle + short-ref koncepcio  
   cmux UUID + rovid ref (`surface:1`) kettost ad.  
   Pairflow-ban hasznos lehet bubble/workspace addressinghez (kulonosen multi-repo UI/CLI muveleteknel).  
   Forras: [TerminalController.swift](/Users/felho/dev/repos-to-learn-from/cmux/Sources/TerminalController.swift:73), [cmux.swift](/Users/felho/dev/repos-to-learn-from/cmux/CLI/cmux.swift:639)

## Ami Pairflow-ban mar eros (es erdemes erre epiteni)

1. Delivery reliability retry + stuck input recovery: [tmuxDelivery.ts](/Users/felho/dev/pairflow/src/core/runtime/tmuxDelivery.ts:276)
2. Startup reconcile es stale runtime takaritas: [startupReconciler.ts](/Users/felho/dev/pairflow/src/core/runtime/startupReconciler.ts:55)
3. Lockolt, atomikus runtime sessions registry: [sessionsRegistry.ts](/Users/felho/dev/pairflow/src/core/runtime/sessionsRegistry.ts:180)

## Top 3, amit eloszor implementalnek Pairflow-ban

1. `pairflow identify` + `pairflow capabilities` (JSON outputtal).
2. Read-only vs mutating command policy + tesztelt allowlist.
3. CLI help/dispatch drift regresszioteszt.

Megjegyzes: a `cmux` AGPLv3-as, ezert inkabb koncepciot/mintat erdemes atvenni, nem kodreszleteket 1:1-ben: [LICENSE](/Users/felho/dev/repos-to-learn-from/cmux/LICENSE:1)
