import { describe, expect, it } from "vitest";

import { forwardAskHumanRuntimeNotificationDependencies } from "../../../../src/v11/shared/askHuman/askHumanRuntimeDependencyForwarding.js";

describe("askHumanRuntimeDependencyForwarding", () => {
  it("forwards only explicitly provided runtime notification dependencies", () => {
    const emitDeliveryNotificationAck = (() => Promise.resolve({})) as never;

    const dependencies = forwardAskHumanRuntimeNotificationDependencies({
      emitDeliveryNotificationAck,
      emitBubbleNotification: undefined
    });

    expect(dependencies.emitDeliveryNotificationAck).toBe(
      emitDeliveryNotificationAck
    );
    expect("emitBubbleNotification" in dependencies).toBe(false);
  });

  it("returns empty forwarding object when no runtime notifications are provided", () => {
    const dependencies = forwardAskHumanRuntimeNotificationDependencies({});

    expect(Object.keys(dependencies)).toEqual([]);
  });
});
