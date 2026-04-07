import { describe, expect, it } from "vitest";

import { emitBubbleLifecycleEventBestEffort } from "../../../../src/v11/shared/metrics/bubbleEvents.js";
import { emitBubbleNotification } from "../../../../src/v11/infrastructure/channel/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../../src/v11/infrastructure/channel/tmux/tmuxDelivery.js";
import { resolveAskHumanFinalizationDependencies } from "../../../../src/v11/shared/askHuman/askHumanFinalizationDependencyResolution.js";

describe("askHumanFinalizationDependencyResolution", () => {
  it("uses finalization defaults when overrides are omitted", () => {
    const resolved = resolveAskHumanFinalizationDependencies({});

    expect(resolved.emitTmuxDeliveryNotification).toBe(
      emitTmuxDeliveryNotification
    );
    expect(resolved.emitBubbleNotification).toBe(emitBubbleNotification);
    expect(resolved.resolveDeliveryMessageRef).toBe(resolveDeliveryMessageRef);
    expect(resolved.emitBubbleLifecycleEventBestEffort).toBe(
      emitBubbleLifecycleEventBestEffort
    );
  });

  it("uses provided finalization overrides", () => {
    const emitTmuxDeliveryNotificationOverride = async () =>
      ({
        delivered: true
      }) as never;
    const emitBubbleNotificationOverride = async () =>
      ({
        delivered: true
      }) as never;
    const resolveDeliveryMessageRefOverride = () => "message-ref";
    const emitBubbleLifecycleEventBestEffortOverride = async () => undefined;

    const resolved = resolveAskHumanFinalizationDependencies({
      emitTmuxDeliveryNotification: emitTmuxDeliveryNotificationOverride,
      emitBubbleNotification: emitBubbleNotificationOverride,
      resolveDeliveryMessageRef: resolveDeliveryMessageRefOverride,
      emitBubbleLifecycleEventBestEffort:
        emitBubbleLifecycleEventBestEffortOverride
    });

    expect(resolved.emitTmuxDeliveryNotification).toBe(
      emitTmuxDeliveryNotificationOverride
    );
    expect(resolved.emitBubbleNotification).toBe(
      emitBubbleNotificationOverride
    );
    expect(resolved.resolveDeliveryMessageRef).toBe(
      resolveDeliveryMessageRefOverride
    );
    expect(resolved.emitBubbleLifecycleEventBestEffort).toBe(
      emitBubbleLifecycleEventBestEffortOverride
    );
  });
});
