import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import { RemoteBubbleMergeCommandError } from "../../../../src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.js";
import { BubbleMergeError } from "../../../../src/v11/application/merge/internal/error/mergeCommandErrorRuntime.js";
import { throwAsBubbleMergeError } from "../../../../src/v11/application/merge/mergeCommandOrchestration.js";

describe("mergeCommandErrorClassification", () => {
  it("maps known dependency errors to bubble merge error", () => {
    expect(() => {
      throwAsBubbleMergeError(new BubbleLookupError("bubble missing"));
    }).toThrowError(BubbleMergeError);
  });

  it("preserves remote merge reason codes through classification", () => {
    try {
      throwAsBubbleMergeError(
        new RemoteBubbleMergeCommandError({
          code: "MERGE_BASE_BRANCH_PUSH_FAILED",
          message: "MERGE_BASE_BRANCH_PUSH_FAILED: publish failed"
        })
      );
      throw new Error("Expected merge error classification to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(BubbleMergeError);
      expect((error as BubbleMergeError).reasonCode).toBe(
        "MERGE_BASE_BRANCH_PUSH_FAILED"
      );
    }
  });
});
