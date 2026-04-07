import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import {
  getWatchdogTracePath
} from "../../../shared/watchdog/watchdogTraceStore.js";
import type { WatchdogTraceEntry } from "../../../shared/ports/watchdogTrace.js";

export { getWatchdogTracePath } from "../../../shared/watchdog/watchdogTraceStore.js";

export async function appendWatchdogTrace(input: {
  runtimeDir: string;
  bubbleId: string;
  entry: WatchdogTraceEntry;
}): Promise<string> {
  const path = getWatchdogTracePath(input.runtimeDir, input.bubbleId);
  await mkdir(join(input.runtimeDir, "watchdog-history"), { recursive: true });
  await appendFile(path, `${JSON.stringify(input.entry)}\n`, "utf8");
  return path;
}
