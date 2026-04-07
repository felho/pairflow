import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import { BubbleMergeError } from "../../../../src/v11/shared/merge/mergeCommandErrorRuntime.js";
import { asBubbleMergeErrorV11 } from "../../../../src/v11/application/merge/emitMergeV11.js";

describe("mergeCommandErrorClassification", () => {
  it("maps known dependency errors to bubble merge error", () => {
    expect(() => {
      asBubbleMergeErrorV11(new BubbleLookupError("bubble missing"));
    }).toThrowError(BubbleMergeError);
  });
});
