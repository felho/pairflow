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
    const defaultEmitDelivery = (async () =>
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
    const defaultResolveBubbleFromWorkspaceCwd = (async () =>
      ({
        bubbleId: "default",
        bubbleConfig: {} as never,
        bubblePaths: {} as never,
        repoPath: "/repo",
        worktreePath: "/repo",
        cwd: "/repo"
      })) as never;
    const defaultResolveDeliveryMessageRef = (() => "default-ref") as never;
    const defaultWriteState = (async () =>
      ({
        state: {} as never,
        fingerprint: "default"
      })) as never;

    const customEmitDelivery = (() =>
      Promise.resolve({
        status: "accepted" as const,
        message: "custom",
        sessionName: "pf_custom_approval",
        targetPaneIndex: 2
      })) as never;
    const customResolveMessageRef = (() => "custom-ref") as never;

    const resolved = resolveApprovalCommandDependencies({
      emitDeliveryNotificationAck: customEmitDelivery,
      resolveDeliveryMessageRef: customResolveMessageRef
    }, {
      appendProtocolEnvelope: defaultAppend,
      emitDeliveryNotificationAck: defaultEmitDelivery,
      executeRemoteBubbleApprovalCommand: defaultExecuteRemoteApproval,
      ensureBubbleInstanceIdForMutation: defaultEnsureBubble,
      readRemotePointer: defaultReadRemotePointer,
      readStateSnapshot: defaultReadState,
      readTranscriptEnvelopes: defaultReadTranscript,
      resolveRemoteBubbleStatusTarget: defaultResolveRemoteTarget,
      resolveBubbleById: defaultResolveBubble,
      resolveBubbleFromWorkspaceCwd: defaultResolveBubbleFromWorkspaceCwd,
      resolveDeliveryMessageRef: defaultResolveDeliveryMessageRef,
      writeStateSnapshot: defaultWriteState
    });

    expect(resolved.appendProtocolEnvelope).toBe(defaultAppend);
    expect(resolved.resolveBubbleById).toBe(defaultResolveBubble);
    expect(resolved.emitDeliveryNotificationAck).toBe(customEmitDelivery);
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
    expect(resolved.resolveBubbleFromWorkspaceCwd).toBe(
      defaultResolveBubbleFromWorkspaceCwd
    );
    expect(resolved.writeStateSnapshot).toBe(defaultWriteState);
  });

  it("forwards a direct emitDeliveryNotificationAck override", () => {
    const directEmit = (() =>
      Promise.resolve({
        status: "accepted" as const,
        message: "direct",
        sessionName: "pf_direct_approval",
        targetPaneIndex: 3
      })) as never;

    const resolved = resolveApprovalCommandDependencies(
      {
        emitDeliveryNotificationAck: directEmit
      },
      {
        appendProtocolEnvelope: (() =>
          Promise.resolve({
            envelope: {} as never,
            sequence: 1,
            mirrorWriteFailures: []
          })) as never,
        emitDeliveryNotificationAck: (() =>
          Promise.resolve({
            status: "accepted" as const,
            message: "default",
            sessionName: "pf_default_approval",
            targetPaneIndex: 1
          })) as never,
        executeRemoteBubbleApprovalCommand: (async () =>
          ({
            kind: "decision",
            bubbleId: "default",
            sequence: 1,
            envelope: {} as never,
            state: {} as never
          })) as never,
        ensureBubbleInstanceIdForMutation: (async () =>
          ({
            bubbleId: "default",
            bubbleInstanceId: "bubble-instance",
            bubbleConfig: {} as never
          })) as never,
        readRemotePointer: (async () => null) as never,
        readStateSnapshot: (async () =>
          ({
            state: {} as never,
            fingerprint: "default"
          })) as never,
        readTranscriptEnvelopes: (async () => []) as never,
        resolveRemoteBubbleStatusTarget: (async () =>
          ({
            alias: "remote",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          })) as never,
        resolveBubbleById: (async () =>
          ({
            bubbleId: "default",
            bubbleConfig: {} as never,
            bubblePaths: {} as never,
            repoPath: "/repo"
          })) as never,
        resolveBubbleFromWorkspaceCwd: (async () =>
          ({
            bubbleId: "default",
            bubbleConfig: {} as never,
            bubblePaths: {} as never,
            repoPath: "/repo",
            worktreePath: "/repo",
            cwd: "/repo"
          })) as never,
        resolveDeliveryMessageRef: (() => "default-ref") as never,
        writeStateSnapshot: (async () =>
          ({
            state: {} as never,
            fingerprint: "default"
          })) as never
      }
    );

    expect(resolved.emitDeliveryNotificationAck).toBe(directEmit);
  });
});
