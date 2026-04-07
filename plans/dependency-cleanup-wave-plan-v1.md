# Dependency Cleanup Wave Plan V1

Last updated from `main` at `35745032`.

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

- Dependency report at this checkpoint: `0 fail / 12 warn`
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
  - `validated (local)` small dependency cycle cleanup
  - `validated (local)` converged dependency cycle cleanup
  - `validated (local)` tmux ownership-signal tightening
  - `841c7b30` metrics report infra rehome
  - `0f1e450a` askHuman finalization notification slice
  - `validated (local)` metaReviewGate state/transcript compat cleanup
  - `validated (local)` stop shell relocation
  - `validated (local)` reconcile dependency-resolution shell relocation
  - `validated (local)` restart orchestration shell relocation
  - `validated (local)` merge dependency and error classification relocation
  - `validated (local)` watchdog store ownership inversion
  - `validated (local)` reviewVerification artifact boundary split
  - `9f567b68` doc contract gate artifact IO split
  - `941e731c` metaReviewGate findings read decoupling
  - `aaef4704` metaReview artifact capability decoupling
  - `44e82564` stale metaReview live-run import drop
  - `35745032` explicit metaReviewGate recovered artifact writer
  - `validated (local)` metaReview command-runtime capability cleanup
  - `validated (local)` metaReview live-run filesystem capability cleanup

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
| W43 | small dependency cycle cleanup | `validated` | orchestrator | The metaReviewGate approval parity cycle was broken by moving the shared advisory type to the state-side module, and the tmux infrastructure cycle is gone on the current head; the dependency checker is down to a single remaining cycle (`1 fail / 39 warn`) |
| W44 | `converged` dependency cycle cleanup | `validated` | orchestrator | Default adapter wiring moved out of the flow builder back-edge, `convergedExecution`/`convergedFinalization`/`convergedGateDelivery` now depend on `convergedDefaultDependencies`, and the dependency report is reduced to report-only ownership warnings (`0 fail / 39 warn`) |
| W45 | tmux ownership-signal checker tightening | `validated` | orchestrator | The dependency checker now treats concrete tmux runtime imports/calls as ownership signals instead of generic `tmux` wording; this raised the visible report-only backlog to `0 fail / 59 warn`, surfacing previously hidden shared-vs-runtime contracts |
| W46 | `metrics` report infra rehome | `completed` | worker + orchestrator validation | The fs-heavy metrics report pipeline moved from `shared/metrics/report/**` to `infrastructure/artifact/metrics/report/**`; core shims and CLI were retargeted, and the visible warning frontier dropped |
| W47 | `askHuman` finalization notification slice | `completed` | worker + orchestrator validation | Tmux-owned finalization/notification shells moved into `application/askHuman`, and the shared surface now keeps only boundary-neutral contracts via a local askHuman delivery port contract |
| W48 | reviewer summary-verifier artifact split | `aborted` | orchestrator | The attempted `summaryVerifierConsistencyGate` infra rehome removed a shared filesystem warning but introduced new `application -> infrastructure` fails in `converged`; the batch was intentionally rolled back to baseline rather than forcing a semantically wrong wrapper fix |
| W49 | `metrics/events` ownership split | `completed` | worker + orchestrator validation | Pure metrics event builder/validation stayed in `shared`; the fs-backed append/lock/store owner moved into infrastructure behind a core legacy bridge, and the dependency report no longer shows the metrics shared warning |
| W50 | `watchdog` persistence inversion prep | `in_progress` | explorer-complete + worker | Explorer mapped the smallest correct batch as `watchdog stores + list/status read rewiring + outer default wiring`; the implementation worker confirmed the bounded design but has not yet produced a full validatable batch, so no partial diff is accepted on `main` |
| W51 | `reviewer` warning frontier prep | `ready` | explorer-complete | Explorer ranked the next bounded reviewer batches: `reviewerBrief` first, then `summaryVerifier` only with ports + outer wiring, then `reviewVerification`, then `testEvidence` |
| W52 | `shared` delivery contract extraction | `validated` | orchestrator | Boundary-neutral tmux and bubble-notification contracts moved under `shared/delivery`, shared kickoff/converged/delivery helpers stopped importing core runtime delivery types, and the dependency report dropped from `0 fail / 39 warn` to `0 fail / 35 warn` |
| W53 | `summaryVerifier` artifact write split | `validated` | orchestrator | The file-backed summary-verifier gate writer moved under `infrastructure/artifact/reviewer`, the shared gate module dropped direct fs ownership, and converged validation now uses the explicit core compat boundary for the default writer; dependency baseline dropped to `0 fail / 33 warn` |
| W54 | `kickoff` task-file capability injection | `validated` | orchestrator | The remaining kickoff file-input read path now consumes explicit `readFileFn` + `statFileFn` capabilities through the existing kickoff dependency contract, removing direct fs ownership from `kickoffTaskFileInputResolution.ts` and dropping the dependency baseline to `0 fail / 32 warn` |
| W55 | `merge` dependency + error classification relocation | `validated` | orchestrator | Merge dependency resolution moved into `application/merge`, adapter-aware error classification left `shared`, and the dependency baseline dropped to `0 fail / 29 warn` |
| W56 | `watchdog` store ownership inversion | `validated` | worker + orchestrator validation | Pane-activity and trace stores moved under infrastructure ownership, shared status/watchdog retained only boundary-neutral types/path helpers, core compat bridges provide default read/write wiring, and the dependency baseline dropped to `0 fail / 26 warn` |
| W57 | `reviewVerification` artifact boundary split | `validated` | worker + orchestrator validation | Review-verification schema/validation stayed shared, artifact IO moved behind an explicit shared port + infrastructure owner with core compat defaults, and the visible reviewer warning frontier now excludes `reviewVerification` |
| W58 | `reviewer` testEvidence runtime/artifact split | `validated` | worker + orchestrator validation | Shared reviewer test-evidence schema/path helpers stayed pure, runtime and artifact IO moved behind an explicit shared port plus infrastructure owner, core keeps only the compat bridge, and the dependency baseline dropped to `0 fail / 25 warn` |
| W59 | `docContractGates` artifact IO split | `completed` | orchestrator | The shared doc-contract gate cluster no longer owns artifact IO; a dedicated shared port plus infrastructure/core compat owner replaced direct shared filesystem ownership, dropping the visible warning frontier to `0 fail / 24 warn` |
| W60 | `metaReviewGate` findings read decoupling | `completed` | orchestrator | Findings artifact read types now route through local shared capability contracts instead of direct `node:fs/promises` coupling, shrinking the metaReviewGate warning cluster and lowering the baseline to `0 fail / 19 warn` |
| W61 | `metaReview` artifact capability decoupling | `completed` | orchestrator | Shared metaReview command/live-run read-write capability types now route through a canonical shared artifact IO contract, removing direct fs type-coupling from the command and live-run surfaces and lowering the baseline to `0 fail / 16 warn` |
| W62 | `metaReviewGate` explicit artifact writer | `completed` | orchestrator | Recovered artifact writes no longer fall back to implicit `fs.writeFile`; the helper requires an explicit writer capability and the dependency baseline is now `0 fail / 12 warn` |
| W63 | `metaReview` command-runtime capability cleanup | `validated` | orchestrator | Shared metaReview command read/submit runtime no longer owns default fs/tmux wiring; local shared delivery capability types plus application/core edge defaults removed the command-runtime ownership warnings and lowered the baseline to `0 fail / 8 warn` |
| W64 | `metaReview` live-run filesystem capability cleanup | `validated` | orchestrator | Shared live-run runtime/rollback no longer owns default fs read/write/delete wiring; the `core` facade now supplies explicit artifact capabilities, removing the last `metaReview` ownership warnings and lowering the baseline to `0 fail / 6 warn` |
| W65 | `metaReviewGate` recovery artifact capability cleanup | `validated` | orchestrator | Shared recovery context helpers no longer own implicit fs read/write defaults; the `application/core` gate facades now supply recovery artifact IO defaults, removing the recovery-helper ownership warning and lowering the baseline to `0 fail / 5 warn` |
| W66 | `metaReviewGate` apply capability cleanup | `validated` | orchestrator | Shared apply context no longer owns implicit artifact-read/tmux/notify defaults; the `application/core` gate facades now inject those defaults, removing the apply-context and type-coupling warnings and lowering the baseline to `0 fail / 3 warn` |
| W67 | `metaReviewGate` notify owner move | `validated` | orchestrator | The tmux-backed notify runtime moved out of `shared/metaReviewGate` into the application edge, shared command runtime/api stopped exporting the runtime notify function, and the dependency baseline is now `0 fail / 2 warn` |
| W68 | `metaReviewGate` pane-binding owner move | `validated` | orchestrator | The tmux-backed pane-binding runtime moved out of `shared/metaReviewGate` into the application edge, shared apply now depends on an injected pane-binding resolver, and the dependency baseline is now `0 fail / 1 warn` |

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

## Warning Frontier Snapshot

Current ownership-warning frontier after W68 metaReviewGate pane-binding owner move:

- `metaReviewGate`: 0
- `askHuman`: 0 in the visible report after W47
- `metaReview`: 0
- `kickoff`: 0
- `merge`: 0
- `metrics`: the shared event builder is now clean; only the core legacy bridge plus the infrastructure store remain
- `reviewer`: 0
- `watchdog`: 0
- singleton residuals: `reply`

Current bounded next-wave decisions:

- `metrics`:
  - the shared metrics builder is clean; any follow-up is now about the remaining core bridge or a later review of the infra store owner
- `reviewer`:
  - `summaryVerifierConsistencyGate`, `reviewerBrief`, `reviewVerification`, and `testEvidence` ownership warnings are now closed on `main`
- `watchdog`:
  - the shared file-backed store warnings are now closed on `main`
- `kickoff`:
  - the task-file input warning is now closed; any follow-up would be architecture hardening only, not dependency warning cleanup
- `metaReview`:
  - no remaining dependency-warning backlog; any follow-up here would now be architecture hardening only
- `metaReviewGate`:
  - no remaining dependency-warning backlog
- `askHuman`:
  - next slice only if needed: remaining shared contracts around flow/runtime forwarding, but the high-signal tmux-owned warning cluster is closed

## Current Next Decision

- Run parallel explorer classification on the remaining `metaReviewGate` and `reply` warning clusters.
- Prefer the next bounded batch between:
  - `reply` state/transcript ownership split (`replyMutationExecution`)

Current best next moves:

1. take the next bounded real-owner batch from the current frontier (a metaReview split or the next reviewer/metaReviewGate follow-up),
2. run the next two disjoint warned-owner batches in parallel after prep: the next reviewer follow-up and the next metaReview follow-up,
3. keep checker-hardening and warning-cleanup as separate commits so baseline shifts stay auditable.
