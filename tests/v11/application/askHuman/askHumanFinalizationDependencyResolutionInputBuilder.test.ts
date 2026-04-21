import { describe, expect, it } from "vitest";

import { buildAskHumanFinalizationDependencyResolutionInput } from "../../../../src/v11/shared/askHuman/askHumanFinalizationDependencyResolutionInputBuilder.js";

describe("askHumanFinalizationDependencyResolutionInputBuilder", () => {
  it("forwards the canonical delivery-ack override", () => {
    const emitDeliveryNotificationAckOverride = (() =>
      Promise.resolve({ status: "accepted", message: "direct" })) as never;
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

    const resolvedInput = buildAskHumanFinalizationDependencyResolutionInput({
      emitDeliveryNotificationAck: emitDeliveryNotificationAckOverride,
      emitBubbleNotification: emitBubbleNotificationOverride,
      resolveDeliveryMessageRef: resolveDeliveryMessageRefOverride,
      emitBubbleLifecycleEventBestEffort:
        emitBubbleLifecycleEventBestEffortOverride
    });

    expect(resolvedInput).toEqual({
      emitDeliveryNotificationAck: emitDeliveryNotificationAckOverride,
      emitBubbleNotification: emitBubbleNotificationOverride,
      resolveDeliveryMessageRef: resolveDeliveryMessageRefOverride,
      emitBubbleLifecycleEventBestEffort:
        emitBubbleLifecycleEventBestEffortOverride
    });
  });

  it("forwards finalization dependency overrides to resolution input", () => {
    const emitDeliveryNotificationAckOverride = (() =>
      Promise.resolve({ status: "accepted", message: "ok" })) as never;
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

    const resolvedInput = buildAskHumanFinalizationDependencyResolutionInput({
      emitDeliveryNotificationAck: emitDeliveryNotificationAckOverride,
      emitBubbleNotification: emitBubbleNotificationOverride,
      resolveDeliveryMessageRef: resolveDeliveryMessageRefOverride,
      emitBubbleLifecycleEventBestEffort:
        emitBubbleLifecycleEventBestEffortOverride
    });

    expect(resolvedInput).toEqual({
      emitDeliveryNotificationAck: emitDeliveryNotificationAckOverride,
      emitBubbleNotification: emitBubbleNotificationOverride,
      resolveDeliveryMessageRef: resolveDeliveryMessageRefOverride,
      emitBubbleLifecycleEventBestEffort:
        emitBubbleLifecycleEventBestEffortOverride
    });
  });

  it("keeps omitted dependencies undefined", () => {
    const resolvedInput = buildAskHumanFinalizationDependencyResolutionInput({});

    expect(resolvedInput).toEqual({
      emitDeliveryNotificationAck: undefined,
      emitBubbleNotification: undefined,
      resolveDeliveryMessageRef: undefined,
      emitBubbleLifecycleEventBestEffort: undefined
    });
  });
});
