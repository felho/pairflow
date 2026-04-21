import { describe, expect, it } from "vitest";

import { buildAskHumanFlowRuntimeDependenciesFromCommandRuntime } from "../../../../src/v11/shared/askHuman/askHumanCommandFlowDependencyWiringInputBuilder.js";

describe("askHumanCommandFlowDependencyWiringInputBuilder", () => {
  it("prefers direct delivery-ack override over the legacy alias", () => {
    const emitDeliveryNotificationAck = (() => Promise.resolve({})) as never;
    const emitTmuxDeliveryNotification = (() => Promise.resolve({})) as never;
    const emitBubbleNotification = (() => Promise.resolve({})) as never;

    const runtimeDependencies =
      buildAskHumanFlowRuntimeDependenciesFromCommandRuntime({
        emitDeliveryNotificationAck,
        emitTmuxDeliveryNotification,
        emitBubbleNotification
      });

    expect(runtimeDependencies).toEqual({
      emitDeliveryNotificationAck,
      emitBubbleNotification
    });
  });

  it("maps runtime notification dependencies for flow dependency wiring", () => {
    const emitTmuxDeliveryNotification = (() => Promise.resolve({})) as never;
    const emitBubbleNotification = (() => Promise.resolve({})) as never;

    const runtimeDependencies =
      buildAskHumanFlowRuntimeDependenciesFromCommandRuntime({
        emitTmuxDeliveryNotification,
        emitBubbleNotification
      });

    expect(runtimeDependencies).toEqual({
      emitDeliveryNotificationAck: emitTmuxDeliveryNotification,
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
