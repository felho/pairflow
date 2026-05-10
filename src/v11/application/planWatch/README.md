# planWatch Application Boundary

The lane has three visibility levels:

- Root-public: `planWatchLoop.ts` and `planWatchLoopContract.ts`, re-exported by `src/index.ts`.
- Lane-internal named modules: `runner/`, `ledger/`, and `linkedTriggerIndex/`, used by in-repo composition such as CLI and defaults.
- Loop-private modules: `internal/loop/`, used only by the plan watch loop implementation.

Keep Codex-specific runner implementation in `runner/` while it is the only runner. Split provider-specific code under defaults, for example `defaults/planWatch/codex/runner/`, when a second runner implementation arrives.
