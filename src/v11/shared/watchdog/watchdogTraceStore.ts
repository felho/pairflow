import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface WatchdogTraceEntry {
  ts: string;
  bubble_id: string;
  state: string;
  active_agent: string | null;
  active_role: string | null;
  watchdog?: {
    monitored: boolean;
    expired: boolean;
    timeout_minutes: number;
    reference_timestamp: string | null;
    deadline_timestamp: string | null;
  };
  pane_activity?: {
    read_status: "ok" | "missing" | "invalid" | null;
    sample_status:
      | "sampled"
      | "no_session"
      | "pane_unreadable"
      | "skipped"
      | "not_monitored";
    changed?: boolean;
    sampled_at?: string;
    pane_hash?: string;
    session_name?: string;
    target_pane?: string;
    sample_error?: string;
    current_sampled_at?: string;
    current_last_changed_at?: string;
    current_last_sample_status?: "sampled" | "no_session" | "pane_unreadable";
  };
  result: {
    escalated: boolean;
    reason: string;
    state: string;
    sequence?: number;
  };
}

export function getWatchdogTracePath(
  runtimeDir: string,
  bubbleId: string
): string {
  return join(runtimeDir, "watchdog-history", `${bubbleId}.ndjson`);
}

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
