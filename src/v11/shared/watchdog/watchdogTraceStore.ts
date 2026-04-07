import { join } from "node:path";

export function getWatchdogTracePath(
  runtimeDir: string,
  bubbleId: string
): string {
  return join(runtimeDir, "watchdog-history", `${bubbleId}.ndjson`);
}
