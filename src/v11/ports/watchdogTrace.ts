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

export type AppendWatchdogTracePort = (
  input: {
    runtimeDir: string;
    bubbleId: string;
    entry: WatchdogTraceEntry;
  }
) => Promise<string>;
