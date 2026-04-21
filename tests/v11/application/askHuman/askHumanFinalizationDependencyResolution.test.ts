import { describe, expect, it } from "vitest";

import { emitBubbleLifecycleEventBestEffort } from "../../../../src/v11/shared/metrics/bubbleEvents.js";
import {
  resolveDeliveryMessageRef
} from "../../../../src/v11/infrastructure/channel/tmux/tmuxDelivery.js";
import { resolveAskHumanFinalizationDependencies } from "../../../../src/v11/application/askHuman/askHumanFinalizationDependencyResolution.js";

describe("askHumanFinalizationDependencyResolution", () => {
  it("uses finalization defaults when overrides are omitted", () => {
    const resolved = resolveAskHumanFinalizationDependencies({});

    expect(resolved.emitDeliveryNotificationAck).toEqual(expect.any(Function));
    expect(resolved.emitBubbleNotification).toEqual(expect.any(Function));
    expect(resolved.resolveDeliveryMessageRef).toEqual(expect.any(Function));
    expect(
      resolved.resolveDeliveryMessageRef({
        bubbleId: "b_ask_human_01",
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        envelope: {
          id: "env_01",
          refs: []
        } as never
      })
    ).toBe(
      resolveDeliveryMessageRef({
        bubbleId: "b_ask_human_01",
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        envelope: {
          id: "env_01",
          refs: []
        } as never
      })
    );
    expect(resolved.emitBubbleLifecycleEventBestEffort).toBe(
      emitBubbleLifecycleEventBestEffort
    );
  });

  it("prefers direct delivery-ack override over the legacy alias", () => {
    const emitDeliveryNotificationAckOverride = async () =>
      ({
        delivered: true,
        message: "direct"
      }) as never;
    const emitTmuxDeliveryNotificationOverride = async () =>
      ({
        delivered: true,
        message: "legacy"
      }) as never;
    const emitBubbleNotificationOverride = async () =>
      ({
        delivered: true
      }) as never;
    const resolveDeliveryMessageRefOverride = () => "message-ref";
    const emitBubbleLifecycleEventBestEffortOverride = async () => undefined;

    const resolved = resolveAskHumanFinalizationDependencies({
      emitDeliveryNotificationAck: emitDeliveryNotificationAckOverride,
      emitTmuxDeliveryNotification: emitTmuxDeliveryNotificationOverride,
      emitBubbleNotification: emitBubbleNotificationOverride,
      resolveDeliveryMessageRef: resolveDeliveryMessageRefOverride,
      emitBubbleLifecycleEventBestEffort:
        emitBubbleLifecycleEventBestEffortOverride
    });

    expect(resolved.emitDeliveryNotificationAck).toBe(
      emitDeliveryNotificationAckOverride
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

    expect(resolved.emitDeliveryNotificationAck).toBe(
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
