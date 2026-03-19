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
    state: "legacy",
    owner: "TBD",
    notes: "M1 first command slice target."
  },
  {
    command: "kickoff",
    state: "legacy",
    owner: "TBD",
    notes: "M2 core handoff slice."
  },
  {
    command: "converged",
    state: "legacy",
    owner: "TBD",
    notes: "M2 core handoff slice."
  },
  {
    command: "approval",
    state: "legacy",
    owner: "TBD",
    notes: "M3 human decision slice."
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
    state: "legacy",
    owner: "TBD",
    notes: "M5 interaction command wave."
  },
  {
    command: "reply",
    state: "legacy",
    owner: "TBD",
    notes: "M5 interaction command wave."
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
    state: "legacy",
    owner: "TBD",
    notes: "M5 runtime/operator command wave."
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
