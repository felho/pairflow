import { describe, expect, it } from "vitest";

import { emitBubbleLifecycleEventBestEffort } from "../../../../src/v11/shared/metrics/bubbleEvents.js";
import { emitBubbleNotification } from "../../../../src/v11/infrastructure/channel/notifications.js";
import {
  resolveDeliveryMessageRef
} from "../../../../src/v11/infrastructure/channel/tmux/tmuxDelivery.js";
import {
  buildAskHumanFinalizationDependencies
} from "../../../../src/v11/application/askHuman/askHumanFinalizationDependencyBuilder.js";

describe("askHumanFinalizationDependencyBuilder", () => {
  it("injects default finalization dependencies when overrides are omitted", () => {
    const dependencies = buildAskHumanFinalizationDependencies({});
    const deliveryMessageRef = dependencies.resolveDeliveryMessageRef({
      bubbleId: "b_ask_human_01",
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: {
        id: "env_01",
        refs: []
      } as never
    });

    expect(typeof dependencies.emitDeliveryNotificationAck).toBe("function");
    expect(dependencies.emitBubbleNotification).toBe(emitBubbleNotification);
    expect(deliveryMessageRef).toBe(
      resolveDeliveryMessageRef({
        bubbleId: "b_ask_human_01",
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        envelope: {
          id: "env_01",
          refs: []
        } as never
      })
    );
    expect(dependencies.emitBubbleLifecycleEventBestEffort).toBe(
      emitBubbleLifecycleEventBestEffort
    );
  });

  it("prefers direct delivery-ack override over the legacy alias", () => {
    const emitDeliveryNotificationAckOverride = (() =>
      Promise.resolve({ delivered: true, message: "direct" })) as never;
    const emitTmuxDeliveryNotificationOverride = (() =>
      Promise.resolve({ delivered: true, message: "legacy" })) as never;
    const emitBubbleNotificationOverride = (() =>
      Promise.resolve({
        kind: "waiting-human",
        attempted: false,
        delivered: false,
        soundPath: null,
        reason: "disabled"
      })) as never;
    const emitBubbleLifecycleEventBestEffortOverride = (() =>
      Promise.resolve(undefined)) as never;

    const dependencies = buildAskHumanFinalizationDependencies({
      emitDeliveryNotificationAck: emitDeliveryNotificationAckOverride,
      emitTmuxDeliveryNotification: emitTmuxDeliveryNotificationOverride,
      emitBubbleNotification: emitBubbleNotificationOverride,
      emitBubbleLifecycleEventBestEffort:
        emitBubbleLifecycleEventBestEffortOverride
    });

    expect(dependencies.emitDeliveryNotificationAck).toBe(
      emitDeliveryNotificationAckOverride
    );
    expect(dependencies.emitBubbleNotification).toBe(
      emitBubbleNotificationOverride
    );
    expect(
      dependencies.resolveDeliveryMessageRef({
        bubbleId: "b_ask_human_02",
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        envelope: {
          id: "env_02",
          refs: []
        } as never
      })
    ).toBe(
      resolveDeliveryMessageRef({
        bubbleId: "b_ask_human_02",
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        envelope: {
          id: "env_02",
          refs: []
        } as never
      })
    );
    expect(dependencies.emitBubbleLifecycleEventBestEffort).toBe(
      emitBubbleLifecycleEventBestEffortOverride
    );
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

    expect(dependencies.emitDeliveryNotificationAck).toBe(
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
