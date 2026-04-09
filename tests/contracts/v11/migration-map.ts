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
    notes: "Direct library exports already route to the v11 pass entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "kickoff",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 kickoff entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "converged",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 converged entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "approval",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 approval entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "delete",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 delete entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "create",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 create entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
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
    notes: "Direct library exports already route to the v11 reconcile entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "askHuman",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 askHuman entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "reply",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 reply entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "start",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 start entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "stop",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 stop entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "restart",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 restart entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "resume",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 resume entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
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
    notes: "Direct library exports already route to the v11 commit entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "merge",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 merge entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "inbox",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 inbox entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "open",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 open entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "list",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 list entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  },
  {
    command: "status",
    state: "v11",
    owner: "runtime",
    notes: "Direct library exports already route to the v11 status entrypoint; remaining core compatibility is tracked separately from facade-parity sentinels."
  }
];

export function getCommandMigrationState(
  command: string
): CommandMigrationState | undefined {
  const entry = commandMigrationMap.find((item) => item.command === command);
  return entry?.state;
}
