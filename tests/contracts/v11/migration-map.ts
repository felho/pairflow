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
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 shared meta-review gate runtime; v11 is the source of truth."
  },
  {
    command: "gate",
    state: "v11",
    owner: "runtime",
    notes: "W3 matrix compatibility alias follows v11 metaReviewGate source-of-truth runtime."
  },
  {
    command: "reconcile",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 reconcile orchestration seams; v11 is the source of truth."
  },
  {
    command: "askHuman",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 askHuman orchestration seams; v11 is the source of truth."
  },
  {
    command: "reply",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 reply orchestration seams; v11 is the source of truth."
  },
  {
    command: "start",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 start orchestration seams; v11 is the source of truth."
  },
  {
    command: "stop",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 stop orchestration seams; v11 is the source of truth."
  },
  {
    command: "restart",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 restart orchestration seams; v11 is the source of truth."
  },
  {
    command: "resume",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 resume orchestration seams; v11 is the source of truth."
  },
  {
    command: "watchdog",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 watchdog orchestration seams; v11 is the source of truth."
  },
  {
    command: "commit",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 commit orchestration seams; v11 is the source of truth."
  },
  {
    command: "merge",
    state: "v11",
    owner: "runtime",
    notes: "Core facade now delegates to v11 merge orchestration seams; v11 is the source of truth."
  }
];

export function getCommandMigrationState(
  command: string
): CommandMigrationState | undefined {
  const entry = commandMigrationMap.find((item) => item.command === command);
  return entry?.state;
}
