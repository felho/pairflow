import type { CommandMigrationState } from "./schema.js";

export interface CommandMigrationEntry {
  command: string;
  state: CommandMigrationState;
  owner: string;
  notes?: string;
}

export const commandMigrationMap: readonly CommandMigrationEntry[] = [
  {
    command: "pass",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 orchestration seams; v11 is the source of truth."
  },
  {
    command: "kickoff",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 kickoff orchestration seams; v11 is the source of truth."
  },
  {
    command: "converged",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 converged orchestration seams; v11 is the source of truth."
  },
  {
    command: "approval",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 approval orchestration seams; v11 is the source of truth."
  },
  {
    command: "metaReviewGate",
    state: "legacy",
    owner: "TBD",
    notes: "M3 meta-review gate slice."
  },
  {
    command: "gate",
    state: "legacy",
    owner: "TBD",
    notes: "W3 matrix compatibility alias for metaReviewGate naming."
  },
  {
    command: "reconcile",
    state: "legacy",
    owner: "TBD",
    notes: "M4 extension scope."
  },
  {
    command: "askHuman",
    state: "parity",
    owner: "runtime",
    notes: "M1 parity runner wired (legacy-v11 shadow parity active)."
  },
  {
    command: "reply",
    state: "parity",
    owner: "runtime",
    notes: "M1 parity runner wired (legacy-v11 shadow parity active)."
  },
  {
    command: "start",
    state: "legacy",
    owner: "TBD",
    notes: "M5 runtime/operator command wave."
  },
  {
    command: "stop",
    state: "legacy",
    owner: "TBD",
    notes: "M5 runtime/operator command wave."
  },
  {
    command: "restart",
    state: "legacy",
    owner: "TBD",
    notes: "M5 runtime/operator command wave."
  },
  {
    command: "resume",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 resume orchestration seams; v11 is the source of truth."
  },
  {
    command: "watchdog",
    state: "legacy",
    owner: "TBD",
    notes: "M5 runtime/operator command wave."
  },
  {
    command: "commit",
    state: "legacy",
    owner: "TBD",
    notes: "M6 close-out command wave."
  },
  {
    command: "merge",
    state: "legacy",
    owner: "TBD",
    notes: "M6 close-out command wave."
  }
];

export function getCommandMigrationState(
  command: string
): CommandMigrationState | undefined {
  const entry = commandMigrationMap.find((item) => item.command === command);
  return entry?.state;
}
