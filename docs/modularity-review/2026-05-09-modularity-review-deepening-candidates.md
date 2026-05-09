# Modularity Review Deepening Candidates

**Scope**: Pairflow architecture deepening candidates (`src/v11/**`, `src/types/**`, `tools/fitness/**`)
**Date**: 2026-05-09

This note captures five current deepening opportunities identified after the
2026-05-08 modularity review follow-up. It intentionally stays at candidate
level: it does not propose detailed interfaces yet.

## 1. Shared vocabulary clusters need public surfaces and `internal/` boundaries

**Files**: `src/v11/shared/metaReview/**`, `src/v11/shared/reviewer/**`,
`src/v11/shared/gates/**`, and parts of `src/v11/shared/state/**`.

**Problem**: These are real shared modules, but several still use flat sibling
layouts. `metaReview`, `reviewer`, and `gates` each expose many files directly
to callers, with high import fan-out. The current interface is nearly as wide
as the implementation: callers can reach submit, verification, artifact,
evaluation, guidance, and schema details directly.

**Solution**: Keep the shared ownership, but narrow each module's public
surface. Move implementation clusters under `internal/` directories such as
submit, verification, artifact, evaluation, warnings, guidance, or schema as
appropriate. Export only the stable shared vocabulary and intentionally public
operations.

**Benefits**: Meta-review submit changes, reviewer verification changes, and
doc-contract gate changes would gain locality. Tests can cross the same public
interface that production callers use instead of binding to implementation
helpers.

## 2. `application/metaReviewGate` needs second-level cohesion inside `internal/`

**Files**: `src/v11/application/metaReviewGate/**`, especially
`src/v11/application/metaReviewGate/internal/**`.

**Problem**: `metaReviewGate` already has an `internal/` boundary, which is the
right first step. However, the internal implementation now contains many
distinct concerns in one private module: apply, current-run routing, human gate,
auto-rework, clean rerun, findings validation, state staging, and delivery
support. The outside seam is protected, but inside the implementation the module
is still broad enough that unrelated internal helpers can become coupled.

**Solution**: Split the existing private implementation into named internal
submodules, for example `apply`, `currentRun`, `humanGate`, `autoRework`,
`cleanRerun`, and `findingsValidation`. Keep the command API and gate APIs as
the public surface, and expose only narrow internal entry points between those
submodules.

**Benefits**: Auto-rework and human-gate routing changes become easier to
localize and verify. The deletion test suggests these would be deep modules:
removing the submodules would scatter routing, persistence, and validation
complexity back across the gate flow.

## 3. `src/types/**` needs an explicit owner or a shrinking transitional role

**Files**: `src/types/protocol.ts`, `src/types/findings.ts`,
`src/types/metrics.ts`, `src/types/archive.ts`, `src/types/ui.ts`,
`src/types/uiRemoteExecution.ts`, and related `src/contracts/kernel/**` files.

**Problem**: `src/types/**` remains a heavily used vocabulary cluster outside
`src/v11/**` and outside the newer `src/contracts/kernel/**` ownership model.
`src/types/protocol.ts` in particular combines kernel vocabulary, shared
meta-review meaning, findings metadata, actor emit input, delivery target
metadata, and protocol envelope shapes. That makes it unclear which module owns
each piece of canonical meaning.

**Solution**: Choose one coherent role. Either make `src/types/**` an explicit
transitional shim with a removal condition, or split its vocabulary into the
real owners: browser-safe literals and protocol vocabulary in
`src/contracts/kernel/**`, pure policy in `src/v11/domain/**`, and shared
runtime meaning in `src/v11/shared/**`. The protocol envelope and actor emit
authority types are good first slices.

**Benefits**: Lifecycle, protocol, and execution-authority changes would have a
clear source of truth. The codebase would become easier to navigate because
domain terms would live where their policy and invariants live.

## 4. Medium-sized application commands should be split before they hit the threshold

**Files**: `src/v11/application/converged/**`,
`src/v11/application/planWatch/**`, `src/v11/application/approval/**`, and
`src/v11/application/create/**`.

**Problem**: These command modules sit below the current flat application
directory threshold, but they already have the same shape that previously
caused problems in larger command directories: many sibling files, visible
naming clusters, and no declared `internal/` sub-boundary. They are tolerated
today, but future lifecycle or remote-execution work can push them past the
threshold during unrelated feature work.

**Solution**: Front-run the threshold with planned internal splits. Candidate
shapes include `converged/internal/{flow, validation, finalization, gate}`,
`planWatch/internal/{runner, linkedTriggerIndex, loop}`,
`approval/internal/{flow, remote, rework, result}`, and
`create/internal/{preparation, persistence, finalization, runtime}`.

**Benefits**: Command orchestration gains locality before the modules become
urgent refactors. Future tests can stay oriented around the command public
interface while narrower internal flow tests cover validation and finalization
behavior.

## 5. Fitness checks should extend directory-cohesion pressure to shared modules

**Files**: `tools/fitness/checks/internal-module-boundary.ts`,
`tools/fitness/policy.json`, and tests for the internal module boundary check.

**Problem**: The fitness system already enforces `internal/` privacy and blocks
oversized flat `src/v11/application/<command>` directories. The same directory
cohesion pressure does not yet apply to `src/v11/shared/<topic>/**`, even though
shared modules often have higher fan-out and a larger coordination cost when
their interface becomes too broad.

**Solution**: Add a shared-topic flat directory threshold, initially in
report-only mode. A threshold around 12 direct `.ts` files is a reasonable
starting point because shared modules have higher-distance consumers than
command-local modules. After the first shared cluster migration lands, consider
promoting the rule to hard-fail.

**Benefits**: Shared module depth becomes enforceable instead of relying only on
reviewer judgment. The check would catch shallow shared modules early, before
they become high-fanout vocabulary clusters with ambiguous public interfaces.
