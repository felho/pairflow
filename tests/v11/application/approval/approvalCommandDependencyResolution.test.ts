import { describe, expect, it } from "vitest";

import { resolveApprovalCommandDependencies } from "../../../../src/v11/application/approval/approvalCommandDependencyResolution.js";

describe("approvalCommandDependencyResolution", () => {
  it("preserves explicit dependency overrides and falls back to supplied defaults", () => {
    const defaultAppend = (() =>
      Promise.resolve({
        envelope: {} as never,
        sequence: 1,
        mirrorWriteFailures: []
      })) as never;
    const defaultResolveBubble = (async () =>
      ({
        bubbleId: "default",
        bubbleConfig: {} as never,
        bubblePaths: {} as never,
        repoPath: "/repo"
      })) as never;
    const defaultEmitTmux = (async () =>
      ({
        delivered: true,
        message: "default"
      })) as never;
    const defaultEnsureBubble = (async () =>
      ({
        bubbleId: "default",
        bubbleInstanceId: "bubble-instance",
        bubbleConfig: {} as never
      })) as never;
    const defaultReadState = (async () =>
      ({
        state: {} as never,
        fingerprint: "default"
      })) as never;
    const defaultReadTranscript = (async () => []) as never;
    const defaultResolveDeliveryMessageRef = (() => "default-ref") as never;
    const defaultWriteState = (async () =>
      ({
        state: {} as never,
        fingerprint: "default"
      })) as never;

    const customEmit = (() =>
      Promise.resolve({
        delivered: true,
        message: "custom"
      })) as never;
    const customResolveMessageRef = (() => "custom-ref") as never;

    const resolved = resolveApprovalCommandDependencies({
      emitTmuxDeliveryNotification: customEmit,
      resolveDeliveryMessageRef: customResolveMessageRef
    }, {
      appendProtocolEnvelope: defaultAppend,
      emitTmuxDeliveryNotification: defaultEmitTmux,
      ensureBubbleInstanceIdForMutation: defaultEnsureBubble,
      readStateSnapshot: defaultReadState,
      readTranscriptEnvelopes: defaultReadTranscript,
      resolveBubbleById: defaultResolveBubble,
      resolveDeliveryMessageRef: defaultResolveDeliveryMessageRef,
      writeStateSnapshot: defaultWriteState
    });

    expect(resolved.appendProtocolEnvelope).toBe(defaultAppend);
    expect(resolved.resolveBubbleById).toBe(defaultResolveBubble);
    expect(resolved.emitTmuxDeliveryNotification).toBe(customEmit);
    expect(resolved.resolveDeliveryMessageRef).toBe(customResolveMessageRef);
    expect(resolved.ensureBubbleInstanceIdForMutation).toBe(defaultEnsureBubble);
    expect(resolved.readStateSnapshot).toBe(defaultReadState);
    expect(resolved.readTranscriptEnvelopes).toBe(defaultReadTranscript);
    expect(resolved.writeStateSnapshot).toBe(defaultWriteState);
  });
});
