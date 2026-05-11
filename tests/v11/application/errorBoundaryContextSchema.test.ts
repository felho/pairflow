import { describe, expect, it } from "vitest";

import { BubbleCommitError } from "../../../src/v11/application/commit/internal/error/commitCommandError.js";
import { BubbleMergeError } from "../../../src/v11/application/merge/internal/error/mergeCommandErrorRuntime.js";
import { StartupReconcilerError } from "../../../src/v11/application/reconcile/reconcileCommandRuntime.js";
import { RestartBubbleError } from "../../../src/v11/application/restart/internal/error/restartCommandRuntime.js";
import { StartBubbleError } from "../../../src/v11/application/start/internal/runtime/startCommandRuntime.js";
import { StopBubbleError } from "../../../src/v11/application/stop/stopCommandRuntime.js";

describe("errorBoundaryContextSchema", () => {
  it("injects minimum command_name context for top operational error families", () => {
    expect(new StartBubbleError("start failed").context).toEqual({
      command_name: "start"
    });
    expect(new RestartBubbleError("restart failed").context).toEqual({
      command_name: "restart"
    });
    expect(new StopBubbleError("stop failed").context).toEqual({
      command_name: "stop"
    });
    expect(new StartupReconcilerError("reconcile failed").context).toEqual({
      command_name: "reconcile"
    });
    expect(new BubbleMergeError("merge failed").context).toEqual({
      command_name: "merge"
    });
    expect(new BubbleCommitError("commit failed").context).toEqual({
      command_name: "commit"
    });
  });

  it("preserves parsed text context while adding required command_name", () => {
    const restartError = new RestartBubbleError(
      "RESTART_FAILED: missing bubble context: bubble_id=b_restart_01 repo_path=/tmp/repo."
    );

    expect(restartError.reasonCode).toBe("RESTART_FAILED");
    expect(restartError.context).toEqual({
      command_name: "restart",
      bubble_id: "b_restart_01",
      repo_path: "/tmp/repo"
    });
    expect(restartError.message).toBe(
      "RESTART_FAILED: missing bubble context: bubble_id=b_restart_01 repo_path=/tmp/repo."
    );
  });

  it("preserves explicit object context and keeps message format stable", () => {
    const error = new BubbleMergeError({
      reasonCode: "MERGE_FAILED",
      message: "merge cleanup failed",
      context: {
        bubble_id: "b_merge_01",
        branch: "pf/b_merge_01"
      }
    });

    expect(error.message).toBe(
      'MERGE_FAILED: merge cleanup failed context={"bubble_id":"b_merge_01","branch":"pf/b_merge_01"}'
    );
    expect(error.context).toEqual({
      command_name: "merge",
      bubble_id: "b_merge_01",
      branch: "pf/b_merge_01"
    });
  });
});
