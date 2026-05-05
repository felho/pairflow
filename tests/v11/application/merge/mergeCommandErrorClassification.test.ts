import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import { RemoteBubbleMergeCommandError } from "../../../../src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.js";
import { BubbleMergeError } from "../../../../src/v11/application/merge/mergeCommandErrorRuntime.js";
import { asBubbleMergeErrorV11 } from "../../../../src/v11/application/merge/emitMergeV11.js";

describe("mergeCommandErrorClassification", () => {
  it("maps known dependency errors to bubble merge error", () => {
    expect(() => {
      asBubbleMergeErrorV11(new BubbleLookupError("bubble missing"));
    }).toThrowError(BubbleMergeError);
  });

  it("preserves remote merge reason codes through classification", () => {
    try {
      asBubbleMergeErrorV11(
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
