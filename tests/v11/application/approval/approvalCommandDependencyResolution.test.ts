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
        status: "accepted" as const,
        message: "default",
        sessionName: "pf_default_approval",
        targetPaneIndex: 1
      })) as never;
    const defaultExecuteRemoteApproval = (async () =>
      ({
        kind: "decision",
        bubbleId: "default",
        sequence: 1,
        envelope: {} as never,
        state: {} as never
      })) as never;
    const defaultEnsureBubble = (async () =>
      ({
        bubbleId: "default",
        bubbleInstanceId: "bubble-instance",
        bubbleConfig: {} as never
      })) as never;
    const defaultReadRemotePointer = (async () => null) as never;
    const defaultReadState = (async () =>
      ({
        state: {} as never,
        fingerprint: "default"
      })) as never;
    const defaultReadTranscript = (async () => []) as never;
    const defaultResolveRemoteTarget = (async () =>
      ({
        alias: "remote",
        host: "ssh.example.com",
        pairflowCommand: "pairflow"
      })) as never;
    const defaultResolveDeliveryMessageRef = (() => "default-ref") as never;
    const defaultWriteState = (async () =>
      ({
        state: {} as never,
        fingerprint: "default"
      })) as never;

    const customEmit = (() =>
      Promise.resolve({
        status: "accepted" as const,
        message: "custom",
        sessionName: "pf_custom_approval",
        targetPaneIndex: 2
      })) as never;
    const customResolveMessageRef = (() => "custom-ref") as never;

    const resolved = resolveApprovalCommandDependencies({
      emitTmuxDeliveryNotification: customEmit,
      resolveDeliveryMessageRef: customResolveMessageRef
    }, {
      appendProtocolEnvelope: defaultAppend,
      emitTmuxDeliveryNotification: defaultEmitTmux,
      executeRemoteBubbleApprovalCommand: defaultExecuteRemoteApproval,
      ensureBubbleInstanceIdForMutation: defaultEnsureBubble,
      readRemotePointer: defaultReadRemotePointer,
      readStateSnapshot: defaultReadState,
      readTranscriptEnvelopes: defaultReadTranscript,
      resolveRemoteBubbleStatusTarget: defaultResolveRemoteTarget,
      resolveBubbleById: defaultResolveBubble,
      resolveDeliveryMessageRef: defaultResolveDeliveryMessageRef,
      writeStateSnapshot: defaultWriteState
    });

    expect(resolved.appendProtocolEnvelope).toBe(defaultAppend);
    expect(resolved.resolveBubbleById).toBe(defaultResolveBubble);
    expect(resolved.emitTmuxDeliveryNotification).toBe(customEmit);
    expect(resolved.executeRemoteBubbleApprovalCommand).toBe(
      defaultExecuteRemoteApproval
    );
    expect(resolved.resolveDeliveryMessageRef).toBe(customResolveMessageRef);
    expect(resolved.ensureBubbleInstanceIdForMutation).toBe(defaultEnsureBubble);
    expect(resolved.readRemotePointer).toBe(defaultReadRemotePointer);
    expect(resolved.readStateSnapshot).toBe(defaultReadState);
    expect(resolved.readTranscriptEnvelopes).toBe(defaultReadTranscript);
    expect(resolved.resolveRemoteBubbleStatusTarget).toBe(
      defaultResolveRemoteTarget
    );
    expect(resolved.writeStateSnapshot).toBe(defaultWriteState);
  });
});
