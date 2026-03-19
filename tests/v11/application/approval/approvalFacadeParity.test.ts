import { describe, expect, it } from "vitest";

import {
  asApprovalCommandError,
  ApprovalCommandError,
  emitApprovalDecision,
  emitApprove,
  emitRequestRework
} from "../../../../src/core/human/approval.js";
import {
  asApprovalCommandErrorV11,
  ApprovalCommandErrorV11,
  emitApprovalDecisionV11,
  emitApproveV11,
  emitRequestReworkV11
} from "../../../../src/v11/application/approval/emitApprovalV11.js";

describe("approval facade parity", () => {
  it("keeps core approval exports aligned with v11 source-of-truth exports", () => {
    expect(emitApprovalDecision).toBe(emitApprovalDecisionV11);
    expect(emitApprove).toBe(emitApproveV11);
    expect(emitRequestRework).toBe(emitRequestReworkV11);
    expect(asApprovalCommandError).toBe(asApprovalCommandErrorV11);
    expect(ApprovalCommandError).toBe(ApprovalCommandErrorV11);
  });
});
