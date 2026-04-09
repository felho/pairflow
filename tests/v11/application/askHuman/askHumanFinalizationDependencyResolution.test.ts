import { describe, expect, it } from "vitest";

import { emitBubbleLifecycleEventBestEffort } from "../../../../src/v11/shared/metrics/bubbleEvents.js";
import {
  resolveDeliveryMessageRef
} from "../../../../src/v11/infrastructure/channel/tmux/tmuxDelivery.js";
import { resolveAskHumanFinalizationDependencies } from "../../../../src/v11/application/askHuman/askHumanFinalizationDependencyResolution.js";

describe("askHumanFinalizationDependencyResolution", () => {
  it("uses finalization defaults when overrides are omitted", () => {
    const resolved = resolveAskHumanFinalizationDependencies({});

    expect(resolved.emitTmuxDeliveryNotification).toEqual(expect.any(Function));
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
