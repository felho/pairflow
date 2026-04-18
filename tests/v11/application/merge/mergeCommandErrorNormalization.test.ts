import { describe, expect, it } from "vitest";

import { RemoteBubbleMergeCommandError } from "../../../../src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.js";
import { RemoteBubbleStatusError } from "../../../../src/v11/infrastructure/executor/ssh/sshBubbleStatus.js";
import {
  BubbleMergeError,
  createBubbleMergeError
} from "../../../../src/v11/shared/merge/mergeCommandErrorRuntime.js";
import { normalizeBubbleMergeError } from "../../../../src/v11/shared/merge/mergeCommandErrorNormalization.js";

describe("mergeCommandErrorNormalization", () => {
  it("preserves bubble merge errors", () => {
    const original = new BubbleMergeError("already normalized");
    const normalized = normalizeBubbleMergeError({
      error: original,
      isBubbleMergeError: (candidate) => candidate instanceof BubbleMergeError,
      createBubbleMergeError
    });

    expect(normalized).toBe(original);
  });

  it("maps generic errors to bubble merge error", () => {
    const normalized = normalizeBubbleMergeError({
      error: new Error("bubble missing"),
      isBubbleMergeError: (candidate) => candidate instanceof BubbleMergeError,
      createBubbleMergeError
    });

    expect(normalized).toBeInstanceOf(BubbleMergeError);
    expect((normalized as Error).message).toBe("bubble missing");
  });

  it("preserves remote status reason codes on normalized merge errors", () => {
    const normalized = normalizeBubbleMergeError({
      error: new RemoteBubbleStatusError({
        code: "REMOTE_STATUS_CONFIG_INVALID",
        message: "host mismatch"
      }),
      isBubbleMergeError: (candidate) => candidate instanceof BubbleMergeError,
      createBubbleMergeError,
      isRemoteBubbleStatusError: (candidate) =>
        candidate instanceof RemoteBubbleStatusError
    });

    expect(normalized).toBeInstanceOf(BubbleMergeError);
    expect((normalized as BubbleMergeError).reasonCode).toBe(
      "REMOTE_STATUS_CONFIG_INVALID"
    );
  });

  it("preserves remote merge command reason codes on normalized merge errors", () => {
    const normalized = normalizeBubbleMergeError({
      error: new RemoteBubbleMergeCommandError({
        code: "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION",
        message: "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION: resolve manually"
      }),
      isBubbleMergeError: (candidate) => candidate instanceof BubbleMergeError,
      createBubbleMergeError,
      isRemoteBubbleMergeCommandError: (candidate) =>
        candidate instanceof RemoteBubbleMergeCommandError
    });

    expect(normalized).toBeInstanceOf(BubbleMergeError);
    expect((normalized as BubbleMergeError).reasonCode).toBe(
      "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION"
    );
  });
});
