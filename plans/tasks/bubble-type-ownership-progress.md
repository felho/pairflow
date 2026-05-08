# Bubble Type Ownership Progress Note

**Status**: working note  
**Source issue**: [`2026-05-07-modularity-review-followup.md`](../../docs/modularity-review/2026-05-07-modularity-review-followup.md), Issue 2  
**Scope**: `src/types/bubble.ts` type ownership and progressive extraction

This is not a formal Pairflow task document. It is a lightweight progress note for capturing the goal, working assumptions, decisions, and new learnings while addressing the `src/types/bubble.ts` god type module issue.

## Goal

Reduce the central model coupling around `src/types/bubble.ts` by moving bubble-related vocabulary to the subdomain that owns the meaning.

The target outcome is that a developer can answer "where does this type live?" from the business capability it belongs to:

- agent identity and role policy live with agent identity;
- lifecycle and snapshot vocabulary live with state/lifecycle ownership;
- review policy vocabulary lives with review policy;
- meta-review vocabulary lives with meta-review;
- remote executor vocabulary lives with remote/executor ownership;
- config aggregate vocabulary lives with config ownership.

The problem is not the line count by itself. The problem is that multiple Pairflow capabilities currently share one central source of truth even when they do not share the same business meaning.

## Current Understanding

`src/types/bubble.ts` currently combines:

- lifecycle states and `BubbleStateSnapshot`;
- agent names, roles, agent config, and role resolution policy;
- work mode, quality mode, command profile, attach launcher, and config types;
- review policy config and runtime view;
- meta-review run, recommendation, execution context, runtime delivery, and snapshot state;
- remote executor config and remote pointer/cache types;
- gate, ideation, spec lock, rework intent, and round-role history types;
- type guards for many of the above;
- policy functions such as `resolveConfiguredAgentForRole`.

This creates broad model coupling from `src/v11/**` back to a file outside the v11 ownership structure.

As of the initial check, direct `types/bubble` references were approximately:

- `src/v11/**`: 300 files;
- `src/v11/application/**`: 161 files;
- `src/v11/shared/**`: 64 files;
- `src/v11/infrastructure/**`: 30 files;
- `src/v11/domain/**`: 30 files;
- `src/v11/defaults/**`: 6 files.

The exact counts may drift as unrelated work lands. The important signal is the fan-out, not the precise number.

## Decision: Progressive Direct Extraction

We will proceed slice by slice rather than splitting the whole file in one large move.

However, the default should not be "keep a re-export bridge because many files must change." Since the migration is agent-assisted, mechanical import churn is not the main constraint. Git, typecheck, tests, and review give us enough safety to do broad direct updates when the ownership decision is clear.

The default strategy for each slice is:

1. Create the new owner module under the narrowest correct v11/config location.
2. Move the slice's exported values, types, guards, and policy functions there.
3. Rewrite all imports for that slice to the new owner.
4. Remove the moved exports from `src/types/bubble.ts`.
5. Run the narrowest useful verification, then broader checks as needed.

A temporary re-export bridge is allowed only when it has a concrete compatibility or boundary-validation purpose. It should not exist merely to avoid updating many import sites.

## First Candidate Slice

Initial preferred slice: agent identity and role ownership.

Candidate exports:

- `agentNames`
- `AgentName`
- `agentRoles`
- `AgentRole`
- `BubbleAgentsConfig`
- `resolveConfiguredAgentForRole`
- `resolveUniquelyConfiguredRoleForAgent`
- `isAgentName`
- `isAgentRole`

Candidate owner: `src/v11/domain/agentIdentity/`.

Reasoning:

- This slice contains real domain policy, not only data shape.
- Agent role ownership is conceptually independent from lifecycle state, review policy, remote execution, and config aggregation.
- The current comment above `agentRoles` already says role changes are not local enum-only changes, which supports giving this vocabulary an explicit domain home.

Open question before implementation:

- Whether browser-facing UI contract surfaces should import the new domain owner directly, continue using a contract-local mirror, or depend on a separate published contract. This should be checked against `docs/architecture/ui-contract-governance.md` before changing UI contract parity surfaces.

## Non-Goals

- Do not split the whole `src/types/bubble.ts` file in one uncontrolled sweep.
- Do not introduce a generic `shared/bubble` dumping ground as the new central type bucket.
- Do not move lifecycle/snapshot types before the lifecycle/state mutation ownership direction is clear.
- Do not keep compatibility re-exports indefinitely.
- Do not change runtime behavior as part of a pure ownership extraction unless the slice's policy logic must move with the type.

## Verification Expectations

For each implemented slice:

- `pnpm typecheck`;
- `pnpm lint`;
- targeted tests for affected ownership and contract parity;
- broader affected test suite when import movement crosses contracts, UI, or runtime serialization boundaries;
- `pnpm fitness:check:ci` if the move changes layer/import topology in a way architecture fitness should care about.

If direct non-docs source edits are made in the current checkout, follow the repository local verification order before declaring the work complete.

## Progress Log

### Agent identity slice

- Created `src/v11/domain/agentIdentity/agentIdentity.ts` as the owner for agent names, agent roles, agent config, role resolution policy, and related guards.
- Moved direct consumers of `AgentName`, `AgentRole`, `BubbleAgentsConfig`, `agentNames`, `agentRoles`, `isAgentName`, `isAgentRole`, `resolveConfiguredAgentForRole`, and `resolveUniquelyConfiguredRoleForAgent` to import from the new owner.
- Removed those exports from `src/types/bubble.ts`; the old file now only imports the agent identity types it needs to describe remaining aggregate types.
- Preserved UI contract governance: browser-facing UI action DTOs continue to own their contract-local `UiActionAgentName` and `UiActionAgentRole` mirrors instead of importing internal `src/v11/**` runtime paths.
- Verification completed: `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, targeted Vitest slice, `pnpm test`, and `pnpm build` all passed.

### Initial note

- Captured the working decision: progressive extraction, but direct import migration by default.
- Rejected "300 files is too much" as a standalone reason for a re-export bridge.
- Kept temporary re-export bridges available only for concrete compatibility or boundary-validation needs.
- Identified agent identity / role ownership as the likely first slice.

## Learnings

- The first slice did not need a compatibility re-export bridge. The mixed imports could be split mechanically, and typecheck/lint caught the only split-quality issues.
- The UI contract question mattered in practice: UI contract files should keep browser-safe contract-local mirrors rather than importing the new v11 domain owner.
- Import count is a risk signal, not a sufficient argument for a bridge. The real risk is whether the target owner is semantically correct and whether mixed imports can be split without creating worse architecture edges.
- Agent-assisted migration changes the cost model: mechanical churn is cheap, but ownership mistakes and review noise remain expensive.
