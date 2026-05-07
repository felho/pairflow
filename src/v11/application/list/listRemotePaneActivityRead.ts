import type { RemoteBubbleStatusSnapshot } from "../../shared/status/remoteBubbleStatusContract.js";
import type { ReadWatchdogPaneActivityResult } from "../../shared/watchdog/watchdogPaneActivityStore.js";

export function toRemotePaneActivityRead(input: {
  bubbleId: string;
  paneActivity: RemoteBubbleStatusSnapshot["paneActivity"];
}): ReadWatchdogPaneActivityResult {
  return input.paneActivity.readStatus === "ok"
    ? {
        status: "ok",
        record: {
          bubble_id: input.bubbleId,
          sampled_at: input.paneActivity.sampledAt ?? "",
          pane_hash: "remote-list-refresh",
          last_changed_at: input.paneActivity.lastChangedAt ?? "",
          ...(input.paneActivity.sessionName !== null
            ? { session_name: input.paneActivity.sessionName }
            : {}),
          ...(input.paneActivity.targetPane !== null
            ? { target_pane: input.paneActivity.targetPane }
            : {}),
          ...(input.paneActivity.lastSampleStatus !== null
            ? { last_sample_status: input.paneActivity.lastSampleStatus }
            : {}),
          ...(input.paneActivity.lastSampleError !== null
            ? { last_sample_error: input.paneActivity.lastSampleError }
            : {})
        }
      }
    : input.paneActivity.readStatus === "invalid"
      ? {
          status: "invalid",
          error: input.paneActivity.lastSampleError ?? "Invalid pane activity"
        }
      : {
          status: "missing"
        };
}
