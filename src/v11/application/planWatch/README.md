# planWatch Application Boundary

The lane has three visibility levels:

- Root-public: `planWatchLoop.ts` and `planWatchLoopContract.ts`, re-exported by `src/index.ts`.
- Lane-internal named modules: `runner/`, `ledger/`, and `linkedTriggerIndex/`, used by in-repo composition such as CLI and defaults.
- Strictly-internal modules: `internal/loop/` and `linkedTriggerIndex/internal/`, used only by their owning PlanWatch implementation.

CLI-facing runner timeline rendering should depend on the neutral infrastructure facade at `src/v11/infrastructure/executor/planWatch/agentRunnerTimeline.ts`, not provider-specific timeline files.

Keep application `runner/` limited to orchestration contracts, command invocation policy, and provider-neutral result classification. Provider-specific process arguments, artifact files, JSONL parsing, and timeline normalization belong under infrastructure, such as `src/v11/infrastructure/executor/planWatch/codex/**`.
