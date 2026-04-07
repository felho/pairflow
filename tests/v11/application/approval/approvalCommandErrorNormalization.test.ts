import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import {
  ApprovalCommandError,
  createApprovalCommandError,
  isApprovalCommandError
} from "../../../../src/v11/shared/approval/approvalCommandError.js";
import { normalizeApprovalCommandError } from "../../../../src/v11/shared/approval/approvalCommandErrorNormalization.js";

describe("approvalCommandErrorNormalization", () => {
  it("preserves approval command errors", () => {
    const original = new ApprovalCommandError("already-normalized");
    const normalized = normalizeApprovalCommandError({
      error: original,
      isApprovalCommandError,
      createApprovalCommandError
    });

    expect(normalized).toBe(original);
  });

  it("maps bubble lookup errors to approval command errors", () => {
    const normalized = normalizeApprovalCommandError({
      error: new BubbleLookupError("bubble not found"),
      isApprovalCommandError,
      createApprovalCommandError,
      isBubbleLookupError: (candidate) => candidate instanceof BubbleLookupError
    });

    expect(normalized).toBeInstanceOf(ApprovalCommandError);
    expect((normalized as Error).message).toBe("bubble not found");
  });

  it("maps generic errors to approval command errors", () => {
    const normalized = normalizeApprovalCommandError({
      error: new Error("unexpected"),
      isApprovalCommandError,
      createApprovalCommandError
    });

    expect(normalized).toBeInstanceOf(ApprovalCommandError);
    expect((normalized as Error).message).toBe("unexpected");
  });
});
