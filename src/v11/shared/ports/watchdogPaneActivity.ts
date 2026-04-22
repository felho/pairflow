export interface WatchdogPaneActivityRecord {
  bubble_id: string;
  sampled_at: string;
  pane_hash: string;
  last_changed_at: string;
  session_name?: string;
  target_pane?: string;
  last_sample_status?: "sampled" | "no_session" | "pane_unreadable";
  last_sample_error?: string;
}

export type ReadWatchdogPaneActivityResult =
  | {
      status: "ok";
      record: WatchdogPaneActivityRecord;
    }
  | {
      status: "missing";
    }
  | {
      status: "invalid";
      error: string;
    };

export type ReadWatchdogPaneActivityPort = (
  input: {
    runtimeDir: string;
    bubbleId: string;
  }
) => Promise<ReadWatchdogPaneActivityResult>;

export type WriteWatchdogPaneActivityPort = (
  input: {
    runtimeDir: string;
    bubbleId: string;
    record: WatchdogPaneActivityRecord;
  }
) => Promise<string>;

export type RemoveWatchdogPaneActivityPort = (
  input: {
    runtimeDir: string;
    bubbleId: string;
  }
) => Promise<void>;
