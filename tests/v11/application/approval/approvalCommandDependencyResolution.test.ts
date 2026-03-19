import { describe, expect, it } from "vitest";

import { resolveApprovalCommandDependencies } from "../../../../src/v11/shared/approval/approvalCommandDependencyResolution.js";

describe("approvalCommandDependencyResolution", () => {
  it("preserves explicit dependency overrides", () => {
    const customEmit = (() =>
      Promise.resolve({
        delivered: true,
        message: "custom"
      })) as never;
    const customResolveMessageRef = (() => "custom-ref") as never;

    const resolved = resolveApprovalCommandDependencies({
      emitTmuxDeliveryNotification: customEmit,
      resolveDeliveryMessageRef: customResolveMessageRef
    });

    expect(resolved.emitTmuxDeliveryNotification).toBe(customEmit);
    expect(resolved.resolveDeliveryMessageRef).toBe(customResolveMessageRef);
  });
});
