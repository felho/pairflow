import { describe, expect, it, vi } from "vitest";

import { buildResumeTranscriptSummary } from "../../../../src/v11/application/start/internal/prompts/startCommandResumeSummary.js";
import {
  launchBubbleSessionAck as launchBubbleSessionAckDefault,
  startBubbleDependencyDefaults
} from "../../../../src/v11/defaults/start/startBubbleDefaults.js";
import {
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace
} from "../../../../src/v11/infrastructure/workspace/worktreeManager.js";
import {
  launchBubbleSessionAck,
  terminateBubbleTmuxSession
} from "../../../../src/v11/infrastructure/channel/tmux/tmuxManager.js";
import {
  readRuntimeSessionsRegistry,
  claimRuntimeSession,
  upsertRuntimeSession,
  removeRuntimeSession
} from "../../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  readRemotePointer,
  removeRemoteStateCache,
  writeRemotePointer,
  writeRemoteStateCache
} from "../../../../src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { executeRemoteBubbleStart } from "../../../../src/v11/infrastructure/executor/ssh/sshBubbleStart.js";
import {
  prepareRemoteStartActivationPackage
} from "../../../../src/v11/infrastructure/artifact/bubble/remoteStartActivationPackage.js";
import { loadPairflowGlobalConfig } from "../../../../src/config/pairflowConfig.js";
import { StartBubbleError } from "../../../../src/v11/application/start/internal/runtime/startCommandRuntime.js";
import {
  mapStartBubbleResult,
  resolveStartBubbleDependencies,
  resolveStartBubbleMode
} from "../../../../src/v11/application/start/startCommandOrchestration.js";
import { buildWorktreeBootstrapResult } from "../../../helpers/worktreeBootstrapResult.js";

describe("startCommandOrchestration", () => {
  it("wires only the neutral launch ack through the start defaults seam", async () => {
    expect(startBubbleDependencyDefaults.launchBubbleSessionAck).toBe(
      launchBubbleSessionAckDefault
    );
    expect(startBubbleDependencyDefaults.launchBubbleSessionAck).toBe(
      launchBubbleSessionAck
    );

    const input = {
      bubbleId: "bubble",
      workspacePath: "   ",
      statusCommand: "status",
      implementerCommand: "implementer",
      reviewerCommand: "reviewer"
    };

    const canonicalAck =
      await startBubbleDependencyDefaults.launchBubbleSessionAck(input);

    expect(canonicalAck).toEqual({
      status: "failed_to_start",
      reason_code: "LAUNCH_ACK_WORKSPACE_REQUIRED",
      failure_kind: "workspace_required",
      error_message:
        "LAUNCH_WORKSPACE_REQUIRED: context operation_id=launch_bubble_session bubble_id=bubble."
    });
  });

  it("resolves default dependencies when no override is provided", async () => {
    const runWorktreeBootstrapCommandDefault = vi.fn(async () => undefined);
    const isTmuxSessionAliveDefault = vi.fn(async () => false);

    const resolved = resolveStartBubbleDependencies({
      dependencies: {},
      runWorktreeBootstrapCommandDefault,
      isTmuxSessionAliveDefault
    });

    expect(resolved.bootstrap).toBe(bootstrapWorktreeWorkspace);
    expect(resolved.cleanup).toBe(cleanupWorktreeWorkspace);
    expect(resolved.runWorktreeBootstrapCommand).toBe(runWorktreeBootstrapCommandDefault);
    expect(resolved.launchSessionAck).toBe(launchBubbleSessionAck);
    expect(resolved.terminateTmux).toBe(terminateBubbleTmuxSession);
    expect(resolved.isTmuxSessionAlive).toBe(isTmuxSessionAliveDefault);
    expect(resolved.readSessions).toBe(readRuntimeSessionsRegistry);
    expect(resolved.claimSession).toBe(claimRuntimeSession);
    expect(resolved.upsertSession).toBe(upsertRuntimeSession);
    expect(resolved.removeSession).toBe(removeRuntimeSession);
    expect(resolved.loadPairflowGlobalConfig).toBe(loadPairflowGlobalConfig);
    expect(resolved.readRemotePointer).toBe(readRemotePointer);
    expect(resolved.writeRemotePointer).toBe(writeRemotePointer);
    expect(resolved.writeRemoteStateCache).toBe(writeRemoteStateCache);
    expect(resolved.removeRemoteStateCache).toBe(removeRemoteStateCache);
    expect(resolved.executeRemoteBubbleStart).toBe(executeRemoteBubbleStart);
    expect(resolved.prepareRemoteStartActivationPackage).toBe(
      prepareRemoteStartActivationPackage
    );
    expect(resolved.buildResumeSummary).toBe(buildResumeTranscriptSummary);
  });

  it("prefers explicit dependency overrides", async () => {
    const overrides = {
      bootstrapWorktreeWorkspace: vi.fn(async () =>
        buildWorktreeBootstrapResult({
          repoPath: "repo",
          bubbleBranch: "bubble",
          worktreePath: "worktree"
        })
      ),
      cleanupWorktreeWorkspace: vi.fn(async () => ({
        repoPath: "repo",
        bubbleBranch: "bubble",
        worktreePath: "worktree",
        removedWorktree: false,
        removedBranch: false
      })),
      runWorktreeBootstrapCommand: vi.fn(async () => undefined),
      launchBubbleSessionAck: vi.fn(async () => ({
        status: "running" as const,
        sessionName: "pf-bubble"
      })),
      terminateBubbleTmuxSession: vi.fn(async () => ({
        sessionName: "pf-bubble",
        existed: true
      })),
      isTmuxSessionAlive: vi.fn(async () => true),
      readRuntimeSessionsRegistry: vi.fn(async () => ({})),
      claimRuntimeSession: vi.fn(async () => ({
        claimed: true,
        record: {
          bubbleId: "bubble",
          repoPath: "repo",
          worktreePath: "worktree",
          tmuxSessionName: "pf-bubble",
          updatedAt: "2026-03-19T00:00:00.000Z"
        }
      })),
      upsertRuntimeSession: vi.fn(async () => ({
        bubbleId: "bubble",
        repoPath: "repo",
        worktreePath: "worktree",
        workspacePath: "workspace",
        workspaceKind: "worktree" as const,
        tmuxSessionName: "pf-bubble",
        updatedAt: "2026-03-19T00:00:00.000Z"
      })),
      removeRuntimeSession: vi.fn(async () => true),
      buildResumeTranscriptSummary: vi.fn(async () => "summary"),
      loadPairflowGlobalConfig: vi.fn(async () => ({})),
      readRemotePointer: vi.fn(async () => null),
      writeRemotePointer: vi.fn(async () => undefined),
      writeRemoteStateCache: vi.fn(async () => undefined),
      removeRemoteStateCache: vi.fn(async () => undefined),
      executeRemoteBubbleStart: vi.fn(async () => ({
        remoteClonePath: "/remote/repo",
        tmuxSessionName: "pf-bubble",
        startedAt: "2026-03-19T00:00:00.000Z",
        instanceId: "inst_01",
          remoteState: {
            lastCheckedAt: "2026-03-19T00:00:00.000Z",
            state: "RUNNING" as const,
            round: 1,
            maxRounds: 8
          }
        })),
      prepareRemoteStartActivationPackage: vi.fn(async () => ({
        ok: true as const,
        package: {
          controlFiles: []
        }
      }))
    };

    const fallbackRunWorktreeBootstrapCommand = vi.fn(async () => undefined);
    const fallbackIsTmuxSessionAlive = vi.fn(async () => false);

    const resolved = resolveStartBubbleDependencies({
      dependencies: overrides,
      runWorktreeBootstrapCommandDefault: fallbackRunWorktreeBootstrapCommand,
      isTmuxSessionAliveDefault: fallbackIsTmuxSessionAlive
    });

    expect(resolved.bootstrap).toBe(overrides.bootstrapWorktreeWorkspace);
    expect(resolved.cleanup).toBe(overrides.cleanupWorktreeWorkspace);
    expect(resolved.runWorktreeBootstrapCommand).toBe(overrides.runWorktreeBootstrapCommand);
    const ack = await resolved.launchSessionAck({
      bubbleId: "bubble",
      workspacePath: "worktree",
      statusCommand: "status",
      implementerCommand: "implementer",
      reviewerCommand: "reviewer"
    });
    expect(ack).toEqual({
      status: "running",
      sessionName: "pf-bubble"
    });
    expect(overrides.launchBubbleSessionAck).toHaveBeenCalledTimes(1);
    expect(resolved.terminateTmux).toBe(overrides.terminateBubbleTmuxSession);
    expect(resolved.isTmuxSessionAlive).toBe(overrides.isTmuxSessionAlive);
    expect(resolved.readSessions).toBe(overrides.readRuntimeSessionsRegistry);
    expect(resolved.claimSession).toBe(overrides.claimRuntimeSession);
    expect(resolved.upsertSession).toBe(overrides.upsertRuntimeSession);
    expect(resolved.removeSession).toBe(overrides.removeRuntimeSession);
    expect(resolved.loadPairflowGlobalConfig).toBe(overrides.loadPairflowGlobalConfig);
    expect(resolved.readRemotePointer).toBe(overrides.readRemotePointer);
    expect(resolved.writeRemotePointer).toBe(overrides.writeRemotePointer);
    expect(resolved.writeRemoteStateCache).toBe(overrides.writeRemoteStateCache);
    expect(resolved.removeRemoteStateCache).toBe(overrides.removeRemoteStateCache);
    expect(resolved.executeRemoteBubbleStart).toBe(overrides.executeRemoteBubbleStart);
    expect(resolved.prepareRemoteStartActivationPackage).toBe(
      overrides.prepareRemoteStartActivationPackage
    );
    expect(resolved.buildResumeSummary).toBe(overrides.buildResumeTranscriptSummary);
  });

  it("prefers the neutral override when provided", async () => {
    const launchBubbleSessionAckOverride = vi.fn(async () => ({
      status: "running" as const,
      sessionName: "pf-bubble-neutral"
    }));

    const resolved = resolveStartBubbleDependencies({
      dependencies: {
        launchBubbleSessionAck: launchBubbleSessionAckOverride
      },
      runWorktreeBootstrapCommandDefault: vi.fn(async () => undefined),
      isTmuxSessionAliveDefault: vi.fn(async () => false)
    });

    const ack = await resolved.launchSessionAck({
      bubbleId: "bubble",
      workspacePath: "worktree",
      statusCommand: "status",
      implementerCommand: "implementer",
      reviewerCommand: "reviewer"
    });

    expect(ack).toEqual({
      status: "running",
      sessionName: "pf-bubble-neutral"
    });
    expect(launchBubbleSessionAckOverride).toHaveBeenCalledTimes(1);
  });

  it("routes CREATED to fresh and runtime states to resume", () => {
    expect(resolveStartBubbleMode("CREATED")).toBe("fresh");
    expect(resolveStartBubbleMode("RUNNING")).toBe("resume");
    expect(resolveStartBubbleMode("COMMITTED")).toBe("resume");
  });

  it("rejects PREPARING_WORKSPACE as incomplete non-resumable startup", () => {
    expect(() => resolveStartBubbleMode("PREPARING_WORKSPACE")).toThrow(
      StartBubbleError
    );
    expect(() => resolveStartBubbleMode("PREPARING_WORKSPACE")).toThrow(
      "bubble start rejected: state PREPARING_WORKSPACE indicates an incomplete startup. This bubble is not resumable with `pairflow bubble start` and must not be treated as running. Delete this incomplete bubble with `pairflow bubble delete --id <id> --force`, then create a new bubble."
    );
  });

  it("throws StartBubbleError for unsupported states", () => {
    expect(() => resolveStartBubbleMode("FAILED")).toThrow(StartBubbleError);
    expect(() => resolveStartBubbleMode("FAILED")).toThrow(
      "bubble start requires state CREATED or resumable runtime state (current: FAILED)."
    );
  });

  it("maps final start result shape", () => {
    const state = {
      state: "RUNNING",
      round: 1
    } as never;

    const result = mapStartBubbleResult({
      bubbleId: "b_start_01",
      state,
      tmuxSessionName: "pf-b_start_01",
      worktreePath: "/tmp/worktree",
      executionTarget: "local",
      runtimeWorkspacePath: "/tmp/worktree"
    });

    expect(result).toEqual({
      bubbleId: "b_start_01",
      state,
      tmuxSessionName: "pf-b_start_01",
      worktreePath: "/tmp/worktree",
      executionTarget: "local",
      runtimeWorkspacePath: "/tmp/worktree"
    });
  });
});
