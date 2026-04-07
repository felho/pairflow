# Dependency Cleanup Wave Plan V1

Last updated from `main` at `d8650a35`.

## Goal

Reduce the remaining `dependency` fitness failures by removing real forbidden
`application -> infrastructure` and selected `shared -> infrastructure` edges
without gaming the checker. Use `shared/ports/**` only for real capability
contracts, not thin wrappers.

## Strategy

1. Keep common port-surface seed work serial.
2. Parallelize only bounded consumer rewiring batches with disjoint write sets.
3. Validate every batch before merge:
   - relevant `vitest` suite
   - targeted `eslint`
   - `pnpm typecheck`
4. Re-run the fitness report after each merged wave.

## Baseline

- Dependency report at this checkpoint: `1 fail / 39 warn`
- Recent completed batches:
  - `f996d399` shared bubble path/id helpers
  - `250b3cf6` start + merge port contracts
  - `5cd500f8` restart + reconcile port contracts
  - `026ff66f` converged port contracts
  - `cf45b9b5` create capability port batch
  - `2fcbc566` delete preflight contract batch
  - `9adad19e` converged finalization default-wiring extract
  - `7a00ba30` pass shared-port routing batch
  - `76af3276` delete archive + mutation shim-through cleanup
  - `99a82383` converged execution + gate-delivery cleanup
  - `c92e040b` pass read capability ports
  - `638ce0cf` pass consumer rewiring batch
  - `e7478bcd` converged policy transcript port wiring
  - `14c043e4` converged policy stable dependency error
  - `bb32bfe7` converged transcript import collapse
  - `66fd4394` list compat-bridge cleanup
  - `7b161389` start registry lookup compat bridges
  - `715c6e9e` delete cleanup error compat bridge
  - `735dbe9f` delete support compat bridges
  - `403a3735` kickoff bubble lookup compat bridge
  - `9f883bc5` delete runtime error compat bridges
  - `7eca98e4` converged routing compat bridges
  - `e7478bcd` converged policy transcript reads through ports
  - `ac4b16fd` merge state snapshot type via shared ports
  - `e645db13` open lookup and shell compat bridges
  - `0852e587` stop contract ports
  - `5896a634` kickoff explicit delivery evidence
  - `7bc07718` approval dependency compat boundaries
  - `b06a7d30` approval mutation port contracts
  - `65d75ff1` approval shared runtime kept off shared ports
  - `51a23c70` approval orchestration relocation
  - `ec15f86f` askHuman notification/flow compat cleanup
  - `333507c4` watchdog contract ports cleanup
  - `1f0a593e` askHuman routing/workspace compat cleanup
  - `64b389ac` watchdog shared runtime compat cleanup
  - `c2dfe90d` askHuman command shell moved into application
  - `3a8c1099` watchdog pane sampling through ports
  - `a988a045` watchdog runtime defaults threaded through application
  - `ac7c2aa6` watchdog default wiring moved out of layers
  - `bef38d5e` obsolete watchdog infrastructure wrapper removed
  - `f4c51857` reply runtime compat dependency resolution
  - `827b111c` askHuman routing prep relocation
  - `6841b5ec` reply mutation execution extract
  - `febcfec8` reply mutation execution moved into shared
  - `50220080` create initial task append extract
  - `991cdd40` converged orchestration moved into application
  - `74dc8448` commit runtime routed through core compat bridges
  - `004e40a3` kickoff dependency defaults moved into application
  - `35b52a75` attach lookup routed through core compat
  - `e3e52348` actor and inbox reads routed through core compat
  - `4207ba75` converged defaults routed through core compat
  - `93aa2ce4` merge dependencies routed through core compat
  - `e0a27f12` UI compat bridge routing batch
  - `6a294194` shared converged/merge/kickoff/delivery helper compat batch
  - `529e52ad` merge shell relocation + metaReview contract compat batch
  - `205a94a3` metaReviewGate apply-context compat batch
  - `533a3113` metaReview command-runtime compat batch
  - `4a03fa06` metaReviewGate recovery-context compat batch
  - `48f1b195` metaReview live-run compat batch
  - `3fe74ce8` metaReviewGate residual compat batch
  - `4a3cd1ea` metaReviewGate types + mutation compat batch
  - `9e8747ba` pass orchestration shell relocation
  - `f2d05a0b` pass workspace context relocation
  - `6723f79a` pass routing + resume shell relocation
  - `051af87e` start shell relocation
  - `5547d1d9` status core-compat cleanup
  - `validated (local)` metrics compat cleanup
  - `validated (local)` watchdog shell relocation
  - `validated (local)` reply dependency cleanup
  - `validated (local)` resume summary + reviewer evidence compat cleanup
  - `validated (local)` forbidden dependency frontier cleanup
  - `validated (local)` tmux cycle cleanup
  - `validated (local)` metaReviewGate state/transcript compat cleanup
  - `validated (local)` stop shell relocation
  - `validated (local)` reconcile dependency-resolution shell relocation
  - `validated (local)` restart orchestration shell relocation

## Wave Ledger

| Wave | Cluster | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| W1 | `converged` contract/type leakage audit | `completed` | orchestrator | Bounded type-first batch identified around workspace/bubble identity, pairflow command, transcript append, and notification delivery contracts |
| W1 | `delete` contract/runtime leakage audit | `completed` | subagent | First safe batch classified around `pathExists` + `branchExists` plus existing delete support ports |
| W1 | `create` post-helper residual audit | `completed` | orchestrator | Capability edges classified around repo registry, git-repository assertion, and transcript append |
| W2 | `converged` first bounded cleanup | `completed` | orchestrator | Converged contract files now use app-facing shared ports/contracts instead of direct infra types |
| W2 | `delete` first bounded cleanup | `completed` | orchestrator | Delete support now uses app-facing `PathExistsPort` and `BranchExistsPort` contracts instead of direct infra types |
| W2 | `create` capability port cleanup | `completed` | orchestrator | Create flow now uses app-facing git-repository, transcript, and repo-registry ports; legacy CLI parity preserved |
| W3 | `converged` finalization default-wiring cleanup | `completed` | orchestrator | `convergedFinalization.ts` no longer owns infra default wiring; dependency surface carries the port |
| W3 | `pass` first bounded cleanup | `completed` | orchestrator | Initial pass flow files now route through existing shared ports instead of direct infra imports |
| W4 | `delete` archive + mutation follow-up | `completed` | orchestrator | Archive snapshot/index and bubble identity edges routed through explicit legacy bridges |
| W4 | `converged` execution + gate-delivery cleanup | `completed` | orchestrator | Execution, gate delivery, and policy transcript wiring now avoid direct app->infra transcript reads |
| W4 | `pass` second bounded cleanup | `completed` | orchestrator | Delivery/routing read-side pass flow now routes through seeded shared ports |
| W5 | `list` compat-bridge cleanup | `completed` | orchestrator | `listCommandApi` and `listCommandContract` now use explicit core compat bridges / shared port types instead of direct infra imports |
| W5 | `delete` runtime cleanup consumer rewiring | `completed` | orchestrator | Delete runtime and support paths now route through explicit compat bridges instead of direct infra imports |
| W5 | `converged` routing preparation cleanup | `completed` | orchestrator | Remaining converged routing edges now use explicit compat bridges / ports |
| W6 | `start` / `open` / `stop` / `merge` bounded cleanups | `completed` | orchestrator | Small app-lane type/runtime leaks removed with compat bridges or shared port contracts |
| W6 | `approval` contract + dependency cleanup | `completed` | orchestrator | Approval cluster is gone from the dependency violation list after orchestration relocation |
| W7 | `askHuman` notification/flow compat cleanup | `completed` | orchestrator | Notification, flow-contract, and execution/finalization dependency contracts now route through explicit core compat bridges; remaining askHuman issues are routing/workspace seams plus small shared->application wrappers |
| W8 | `watchdog` contract ports cleanup | `completed` | orchestrator | Application contract now routes delivery/notification/state capability types through shared ports; shared watchdog runtime still needs a follow-up wave |
| W9 | `askHuman` routing/workspace compat cleanup | `completed` | orchestrator | AskHuman is reduced to two tiny shared->application wrapper files |
| W10 | `watchdog` shared runtime compat cleanup | `completed` | orchestrator | Shared watchdog runtime now routes through compat bridges; cluster no longer appears in the dependency findings |
| W11 | `askHuman` shared shell relocation | `completed` | orchestrator | Shared orchestration/default wiring shells moved into `application`; the remaining askHuman findings disappeared from the dependency report |
| W12 | `reply` runtime compat dependency resolution | `completed` | orchestrator | Reply runtime now resolves transcript/state/bubble lookup/delivery defaults through explicit compat dependency resolution instead of direct application -> infrastructure imports |
| W13 | `watchdog` pane sampling + default wiring cleanup | `completed` | orchestrator | Sampler now uses ports and default adapter wiring lives only in the core compat facade; no remaining watchdog dependency finding is reported |
| W14 | `askHuman` routing prep relocation | `completed` | orchestrator | Routing-prep defaults, dependency resolution, and workspace context prep now live in `application`; shared contracts use structural types instead of core or ports |
| W15 | residual shared runtime clusters (`reply`, remaining askHuman execution/finalization, others) | `completed` | orchestrator | Reply direct transcript/state mutation moved behind shared mutation execution; create initial TASK append no longer writes transcript directly from `application` |
| W16 | `converged` residual shared runtime cluster | `completed` | orchestrator | Converged orchestration/builder ownership moved into `application`; the old shared orchestration files are gone |
| W17 | `commit` application runtime compat cleanup | `completed` | orchestrator | Commit app lane now routes state/transcript/git/bubble lookup reads through explicit core compat bridges; remaining commit findings are direct write evidence, not dependency-layer imports |
| W34 | `restart` orchestration shell relocation | `validated` | orchestrator | Restart dependency resolution, error/runtime normalization, and orchestration now live in `application/restart`; batch is locally green and contributes to the `78 fail / 53 warn` baseline |
| W18 | `kickoff` dependency relocation | `completed` | orchestrator | Dependency defaults moved into `application`, shared kickoff now depends on a core-compat contract instead of direct infra or shared-port edges |
| W19 | `attach` lookup compat cleanup | `completed` | orchestrator | The remaining attach application -> infrastructure lookup edge now routes through the explicit core compat bridge |
| W20 | `actorProtocol` + `inbox` read compat cleanup | `completed` | orchestrator | Shared actor/inbox read paths now use core compat bridges instead of direct v11 infrastructure imports |
| W21 | `converged` default wiring follow-up | `completed` | orchestrator | Remaining converged application-owned default adapter imports now route through explicit core compat bridges |
| W22 | `merge` dependency/runtime compat cleanup | `completed` | orchestrator | Merge shared dependency resolution and error runtime now route through explicit core compat bridges; only orchestration/types residuals remain |
| W23 | `ui/router` residual infrastructure cluster | `completed` | orchestrator | Router/events/presenter application imports now route through explicit core compat bridges; remaining UI debt is complexity/file-budget, not dependency layering |
| W24 | small `shared` helper residuals (`converged`, `merge`, `kickoff`, `delivery`) | `completed` | orchestrator | Shared helper files now route through core compat or local structural input types; the batch dropped the baseline to `218 fail / 62 warn` without widening ownership |
| W25 | `merge` shared shell relocation + `metaReviewCommandContract` compat | `completed` | orchestrator + worker | Merge orchestration ownership moved into `application`, UI router now uses the core merge facade, and the shared meta-review command contract no longer imports `v11/infrastructure/**` directly |
| W26 | `metaReviewGate` apply-context compat batch | `completed` | orchestrator | Apply-context, apply-helper, and pane-binding shared files now depend on explicit core compat bridges instead of direct `v11/infrastructure/**` imports; baseline dropped to `200 fail / 61 warn` |
| W27 | `metaReview` command-runtime compat batch | `completed` | orchestrator | Submit/read runtime, error mapping, and submit routing now use explicit core compat bridges; baseline dropped to `191 fail / 60 warn` |
| W28 | `metaReviewGate` recovery-context compat batch | `completed` | orchestrator | Recovery context and helper files now use explicit core compat bridges for transcript/state/bubble lookup/pane bindings; baseline dropped to `184 fail / 60 warn` |
| W29 | `metaReview` live-run compat batch | `completed` | orchestrator | Live-run runtime, pane/runtime helpers, and approval refresh/persistence files now use explicit core compat bridges; baseline dropped to `174 fail / 59 warn` |
| W30 | `metaReviewGate` residual compat batch | `completed` | orchestrator | Apply observation/persistence, error conversion, human-gate persistence, and notify files now use explicit core compat bridges; baseline dropped to `162 fail / 58 warn` |
| W31 | `metaReviewGate` types + mutation compat batch | `completed` | orchestrator | Gate types, approval request envelope, gate apply shell, and mutation boundary IO now use explicit core compat bridges; baseline dropped to `153 fail / 58 warn` |
| W32 | `pass` orchestration shell relocation | `validated` | orchestrator | `passFlowDependencyWiring`, flow builders, dispatch, emit-context, and command orchestration now live in `application/pass`; batch is locally green and drops the dependency baseline to `109 fail / 58 warn` |
| W33 | `reconcile` dependency-resolution shell relocation | `validated` | orchestrator | Reconcile input normalization, dependency resolution, and orchestration now live in `application/reconcile`; batch is locally green and drops the dependency baseline to `78 fail / 53 warn` |
| W35 | `start` shell relocation | `validated` | orchestrator | `startCommand*` shell files now live in `application/start`, UI/meta-review consumers were retargeted, the old `shared/start` surface was removed, and the dependency baseline dropped to `49 fail / 45 warn` |
| W36 | `status` core-compat cleanup | `validated` | orchestrator | `shared/status` now routes bubble lookup, transcript/state reads, pairflow command path resolution, and status view types through explicit core compat boundaries; dependency baseline dropped to `29 fail / 42 warn` |
| W37 | `metaReviewGate` state/transcript compat cleanup | `validated` | orchestrator | `shared/metaReviewGate` state/transcript type-read edges now route through explicit core compat boundaries; the cluster dropped out of forbidden dependency findings and the baseline fell to `21 fail / 42 warn` |
| W38 | `watchdog` shell relocation | `validated` | orchestrator | Watchdog command API, flow, routing, pending rework intent, and sampler now live in `application/watchdog`; the pane-activity store uses a shared error helper instead of an application runtime import, and the dependency baseline dropped to `10 fail / 39 warn` |
| W39 | `metrics` compat cleanup | `validated` | orchestrator | Metrics event, archive-context, and report helpers now route repo/archive/lock support through explicit core compat bridges; baseline stays at `10 fail / 39 warn` but the uncommitted compat surface is retired |
| W40 | `reply` dependency cleanup | `validated` | orchestrator | Reply default dependency wiring now lives in `application/reply`, shared mutation code uses a narrow structural dependency shape, and reply error normalization now depends on the core bubble lookup compat bridge; dependency baseline dropped to `8 fail / 39 warn` |
| W41 | `resumeSummary` + `reviewer/testEvidence` compat cleanup | `validated` | orchestrator | Resume transcript reads and reviewer evidence git inspection now route through explicit core compat bridges; dependency baseline dropped to `6 fail / 39 warn` |
| W42 | forbidden dependency frontier cleanup | `validated` | orchestrator | Resume summary ownership moved into `application/start`, UI router now goes through core bubble facades for start/resume, meta-review submit persistence routes through core state compat, and bubble watchdog CLI now targets the v11 application surface; the dependency report no longer has forbidden layer-import findings and only import cycles + ownership warnings remain (`3 fail / 39 warn`) |
| W43 | `tmux` import-cycle cleanup | `validated` | orchestrator | `tmuxInput.ts` now consumes `TmuxRunner` from the shared port contract instead of `tmuxManager.ts`; the two-file tmux infrastructure cycle disappeared and the dependency checker is down to a single remaining cycle (`1 fail / 39 warn`) |

## Parallelization Rules

- Allowed in parallel:
  - different application lanes with file-disjoint write sets
  - consumer rewires against already-stable `shared/ports/**`
- Not allowed in parallel:
  - two workers writing the same `shared/ports/**` file
  - overlapping dependency-resolution files
  - simultaneous redesign of shared runtime wiring and the port surface it depends on

## Batch Checklist Template

- Scope:
- Exact files:
- Classification:
  - pure move:
  - port contract:
  - leave-for-later runtime wiring:
- Validation:
  - vitest:
  - eslint:
  - typecheck:
- Fitness delta:
- Commit:

## Current Next Decision

Current best next moves:

1. clear the final `converged` import cycle,
2. then decide whether the next dependency phase targets remaining ownership-signal warnings,
3. keep ownership-signal-only cleanup separate from the now-closed forbidden dependency frontier.
