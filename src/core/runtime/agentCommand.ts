// Temporary bridge: canonical agent-command bootstrap ownership currently
// lives under `src/v11/infrastructure/executor/command/agentCommand.ts`.
// Remove this shim once shared/runtime consumers are migrated.
export * from "../../v11/infrastructure/executor/command/agentCommand.js";
