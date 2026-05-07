import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import {
  ApprovalCommandError,
  createApprovalCommandError,
  isApprovalCommandError
} from "../../../../src/v11/application/approval/approvalCommandError.js";
import { normalizeApprovalCommandError } from "../../../../src/v11/application/approval/approvalCommandErrorNormalization.js";

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

  it("preserves remote status taxonomy on approval command normalization", () => {
    const remoteStatusError = Object.assign(
      new Error("remote host mismatch"),
      {
        name: "RemoteBubbleStatusError",
        code: "REMOTE_STATUS_CONFIG_INVALID"
      }
    );
    const normalized = normalizeApprovalCommandError({
      error: remoteStatusError,
      isApprovalCommandError,
      createApprovalCommandError,
      isRemoteBubbleStatusError: (candidate) =>
        candidate instanceof Error
        && candidate.name === "RemoteBubbleStatusError"
    });

    expect(normalized).toBeInstanceOf(ApprovalCommandError);
    expect((normalized as ApprovalCommandError).reasonCode).toBe(
      "REMOTE_STATUS_CONFIG_INVALID"
    );
    expect((normalized as Error).message).toContain("remote host mismatch");
  });

  it("preserves remote approval command taxonomy on approval command normalization", () => {
    const remoteApprovalError = Object.assign(
      new Error("ssh transport failed"),
      {
        name: "RemoteBubbleApprovalCommandError",
        code: "REMOTE_APPROVAL_TRANSPORT_FAILED"
      }
    );
    const normalized = normalizeApprovalCommandError({
      error: remoteApprovalError,
      isApprovalCommandError,
      createApprovalCommandError,
      isRemoteBubbleApprovalCommandError: (candidate) =>
        candidate instanceof Error
        && candidate.name === "RemoteBubbleApprovalCommandError"
    });

    expect(normalized).toBeInstanceOf(ApprovalCommandError);
    expect((normalized as ApprovalCommandError).reasonCode).toBe(
      "REMOTE_APPROVAL_TRANSPORT_FAILED"
    );
    expect((normalized as Error).message).toContain("ssh transport failed");
  });
});
