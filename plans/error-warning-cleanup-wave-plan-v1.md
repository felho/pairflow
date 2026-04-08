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
   - státusz: completed

2. `archive` warning klaszter
   - cél: `ArchiveIndexError` / `ArchiveSnapshotError` hívások kapjanak explicit context payloadot
   - státusz: completed

3. `registry` warning klaszter
   - cél: `RepoRegistryError` / `RuntimeSessionsRegistryError` hívások kapjanak explicit context payloadot
   - státusz: completed

4. `open` warning klaszter
   - cél: `OpenBubbleError` throw site-ok kontextusosítása
   - státusz: completed

5. `metrics` warning klaszter
   - cél: report/select-shards artifact warningok context payloadjai
   - státusz: completed

6. `transcript` warning klaszter
   - cél: transcript artifact/runtime warningok context payloadjai
   - státusz: completed

7. maradék singletonok
    - `attach`
    - `list`
    - `actorProtocol`
    - `converged`
   - `workspace-resolution`
   - `ui-repo-scope`
   - `worktree-manager`
    - `pass-validation-runner`
    - `file-lock`
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

# Előrehaladás

- Wave 1 commit: `11f1ec1f` `refactor(error): add context to create and archive warnings`
- Wave 2 commit: `b952b576` `refactor(error): add registry error context`
- Wave 3 commit: `72a13e34` `refactor(error): add open and metrics error context`
- Wave 4 singleton: `workspaceResolution.ts` warning cleanup ready for commit
- Wave 5 singleton: `repoScope.ts` warning cleanup ready for commit
- Wave 6 singleton: `worktreeManager.ts` warning cleanup ready for commit
- Wave 7 singleton: `passValidationCommandRunner.ts` warning cleanup ready for commit
- Wave 8 singleton: `fileLock.ts` warning cleanup ready for commit
- Wave 9 singleton: `attach` warning cleanup ready for commit
- Wave 10 singleton: `reviewVerificationArtifacts.ts` warning cleanup ready for commit
- Wave 11 singleton: `metaReviewerPaneBinding.ts` warning cleanup ready for commit
- Wave 12 singleton: `inboxCommandApi.ts` warning cleanup ready for commit
- Wave 13 bounded batch: `routerHttp.ts` + `routerRequest.ts` warning cleanup ready for commit
- Wave 14 singleton: `repoResolution.ts` warning cleanup ready for commit
- Wave 15 bounded batch: `docContractGateArtifacts.ts` + `docContractGateArtifactNormalization.ts` warning cleanup ready for commit
- Wave 16 singleton: `listCommandApi.ts` warning cleanup ready for commit
- Wave 17 singleton: `emitActorProtocolV11.ts` warning cleanup ready for commit
- Wave 18 singleton: `convergedPolicyPreparation.ts` warning cleanup ready for commit
- Wave 19 singleton: `metrics/events.ts` warning cleanup ready for commit
- Wave 20 singleton: `sequenceAllocator.ts` warning cleanup ready for commit
- Wave 21 singleton: `validation/primitives.ts` warning cleanup ready for commit
- Wave 22 bounded batch: `metaReviewCommandReadArtifacts.ts` warning cleanup ready for commit
- Wave 23 bounded batch: `metaReviewCommandSubmitAuthority.ts` warning cleanup ready for commit
- Wave 24 bounded batch: `metaReviewCommandSubmitLink.ts` warning cleanup ready for commit
- Wave 25 bounded batch: `metaReviewGateRecoveryContextHelpers.ts` warning cleanup ready for commit
- Aktuális warning baseline: `error` check `126 -> 106 -> 97 -> 92 -> 87 -> 82 -> 77 -> 73 -> 69 -> 65 -> 63 -> 61 -> 59 -> 55 -> 54 -> 52 -> 51 -> 50 -> 49 -> 47 -> 41 -> 40 -> 38 -> 36 -> 33 -> 30`
