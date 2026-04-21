import { describe, expect, it } from "vitest";

import { buildAskHumanFlowRuntimeDependenciesFromCommandRuntime } from "../../../../src/v11/shared/askHuman/askHumanCommandFlowDependencyWiringInputBuilder.js";

describe("askHumanCommandFlowDependencyWiringInputBuilder", () => {
  it("forwards the canonical runtime delivery-ack dependency", () => {
    const emitDeliveryNotificationAck = (() => Promise.resolve({})) as never;
    const emitBubbleNotification = (() => Promise.resolve({})) as never;

    const runtimeDependencies =
      buildAskHumanFlowRuntimeDependenciesFromCommandRuntime({
        emitDeliveryNotificationAck,
        emitBubbleNotification
      });

    expect(runtimeDependencies).toEqual({
      emitDeliveryNotificationAck,
      emitBubbleNotification
    });
  });

  it("maps runtime notification dependencies for flow dependency wiring", () => {
    const emitDeliveryNotificationAck = (() => Promise.resolve({})) as never;
    const emitBubbleNotification = (() => Promise.resolve({})) as never;

    const runtimeDependencies =
      buildAskHumanFlowRuntimeDependenciesFromCommandRuntime({
        emitDeliveryNotificationAck,
        emitBubbleNotification
      });

    expect(runtimeDependencies).toEqual({
      emitDeliveryNotificationAck: emitDeliveryNotificationAck,
      emitBubbleNotification
    });
  });

  it("keeps omitted runtime notification dependencies undefined", () => {
    const runtimeDependencies =
      buildAskHumanFlowRuntimeDependenciesFromCommandRuntime({});

    expect(runtimeDependencies).toEqual({
      emitDeliveryNotificationAck: undefined,
      emitBubbleNotification: undefined
    });
  });
});
