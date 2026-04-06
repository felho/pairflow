import { describe, expect, it } from "vitest";

import {
  buildCanonicalPendingApprovalSignal as buildCanonicalPendingApprovalSignalCore,
  isHumanApprovalState as isHumanApprovalStateCore,
  resolveCanonicalPendingApprovalSignal as resolveCanonicalPendingApprovalSignalCore,
  resolveLatestPendingApprovalRequest as resolveLatestPendingApprovalRequestCore
} from "../../../../src/core/bubble/pendingApprovalSignal.js";
import {
  buildCanonicalPendingApprovalSignal,
  isHumanApprovalState,
  resolveCanonicalPendingApprovalSignal,
  resolveLatestPendingApprovalRequest
} from "../../../../src/v11/shared/approval/pendingApprovalSignal.js";

describe("pendingApprovalSignal facade parity", () => {
  it("keeps the core shim aligned with the v11 source-of-truth exports", () => {
    expect(isHumanApprovalStateCore).toBe(isHumanApprovalState);
    expect(resolveLatestPendingApprovalRequestCore).toBe(
      resolveLatestPendingApprovalRequest
    );
    expect(buildCanonicalPendingApprovalSignalCore).toBe(
      buildCanonicalPendingApprovalSignal
    );
    expect(resolveCanonicalPendingApprovalSignalCore).toBe(
      resolveCanonicalPendingApprovalSignal
    );
  });
});
