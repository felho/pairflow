import { describe, expect, it } from "vitest";

import { emitBubbleLifecycleEventBestEffort } from "../../../../src/v11/shared/metrics/bubbleEvents.js";
import { emitBubbleNotification } from "../../../../src/v11/infrastructure/channel/notifications.js";
import {
  emitTmuxDeliveryNotification
} from "../../../../src/v11/infrastructure/channel/tmux/tmuxDelivery.js";
import {
  buildAskHumanFinalizationDependencies
} from "../../../../src/v11/shared/askHuman/askHumanFinalizationDependencyBuilder.js";

describe("askHumanFinalizationDependencyBuilder", () => {
  it("injects default finalization dependencies when overrides are omitted", () => {
    const dependencies = buildAskHumanFinalizationDependencies({});

    expect(dependencies.emitTmuxDeliveryNotification).toBe(emitTmuxDeliveryNotification);
    expect(dependencies.emitBubbleNotification).toBe(emitBubbleNotification);
    expect(dependencies.emitBubbleLifecycleEventBestEffort).toBe(
      emitBubbleLifecycleEventBestEffort
    );
    expect("resolveDeliveryMessageRef" in dependencies).toBe(false);
  });

  it("forwards provided finalization dependency overrides", () => {
    const emitTmuxDeliveryNotificationOverride = (() =>
      Promise.resolve({ delivered: true, message: "ok" })) as never;
    const emitBubbleNotificationOverride = (() =>
      Promise.resolve({
        kind: "waiting-human",
        attempted: false,
        delivered: false,
        soundPath: null,
        reason: "disabled"
      })) as never;
    const resolveDeliveryMessageRefOverride = (() => "ref#msg") as never;
    const emitBubbleLifecycleEventBestEffortOverride = (() =>
      Promise.resolve(undefined)) as never;

    const dependencies = buildAskHumanFinalizationDependencies({
      emitTmuxDeliveryNotification: emitTmuxDeliveryNotificationOverride,
      emitBubbleNotification: emitBubbleNotificationOverride,
      resolveDeliveryMessageRef: resolveDeliveryMessageRefOverride,
      emitBubbleLifecycleEventBestEffort:
        emitBubbleLifecycleEventBestEffortOverride
    });

    expect(dependencies.emitTmuxDeliveryNotification).toBe(
      emitTmuxDeliveryNotificationOverride
    );
    expect(dependencies.emitBubbleNotification).toBe(
      emitBubbleNotificationOverride
    );
    expect(dependencies.resolveDeliveryMessageRef).toBe(
      resolveDeliveryMessageRefOverride
    );
    expect(dependencies.emitBubbleLifecycleEventBestEffort).toBe(
      emitBubbleLifecycleEventBestEffortOverride
    );
  });
});
