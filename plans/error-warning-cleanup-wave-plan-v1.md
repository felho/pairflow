---
title: Error warning cleanup wave plan v1
status: in_progress
updated_at: 2026-04-08
owner: codex
---

# Cél

Az `error` fitness check jelenleg hard-fail helyett `warn` módban fut, de a backlogot klaszterenként szeretnénk learatni úgy, hogy a warningokból később szigorítható, megbízható szabály legyen.

# Aktuális baseline

- hard-fail fitness checkek: pass
- `error` check: warn
- fő backlog-források:
  - `src/v11/application/create/createCommandRuntime.ts`
  - `src/v11/infrastructure/artifact/archive/archiveIndex.ts`
  - `src/v11/infrastructure/artifact/archive/archiveSnapshot.ts`
  - `src/v11/application/open/emitOpenV11.ts`
  - `src/v11/infrastructure/artifact/metrics/report/*`
  - `src/v11/infrastructure/artifact/transcript/transcriptStore.ts`

# Wave-ek

1. `create` warning klaszter
   - cél: `BubbleCreateError` hívások kapjanak explicit context payloadot
   - státusz: in_progress

2. `archive` warning klaszter
   - cél: `ArchiveIndexError` / `ArchiveSnapshotError` hívások kapjanak explicit context payloadot
   - státusz: in_progress

3. `open` warning klaszter
   - cél: `OpenBubbleError` throw site-ok kontextusosítása
   - státusz: pending

4. `metrics + transcript` warning klaszter
   - cél: artifact/runtime warningok context payloadjai
   - státusz: pending

5. maradék singletonok
   - `attach`
   - `list`
   - `actorProtocol`
   - `converged`
   - `reviewer-artifact`
   - `docContractGateArtifacts`
   - státusz: pending

# Guardrail

- Nem cél a checker “kijátszása”; a context legyen szemantikailag valós.
- A worker batch-ek write setje diszjunkt legyen.
- Minden batch után:
  - célzott vitest
  - célzott eslint
  - `pnpm typecheck`
