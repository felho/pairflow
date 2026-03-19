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
    command: "reconcile",
    state: "legacy",
    owner: "TBD",
    notes: "M4 extension scope."
  }
];

export function getCommandMigrationState(
  command: string
): CommandMigrationState | undefined {
  const entry = commandMigrationMap.find((item) => item.command === command);
  return entry?.state;
}
