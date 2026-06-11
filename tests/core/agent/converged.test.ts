import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  emitConvergedFromWorkspaceCommandOrchestration as emitConvergedFromWorkspace
} from "../../../src/v11/application/converged/convergedCommandOrchestration.js";
import {
  resolveConvergedRolloutBlockingReasonCodes as resolveMetaReviewRolloutBlockingReasonCodes
} from "../../../src/v11/application/converged/internal/orchestration/convergedRolloutBlockingReasonResolver.js";
import { buildMetaReviewExecutionContext } from "../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import type { BubbleCreateResult } from "../../../src/v11/application/create/createBubble.js";
import { IDEATION_CONVERGED_BLOCKED } from "../../../src/v11/shared/ideation/ideationReasonCodes.js";
import { applyMetaReviewGateOnConvergence } from "../../../src/v11/defaults/metaReviewGate/metaReviewGateApi.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
import type { PersistedBubbleStateSnapshot } from "../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import type {
  PassProtocolEnvelopePayload
} from "../../../src/v11/shared/protocol/protocolEnvelopeContract.js";
import { upsertRuntimeSession } from "../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  buildRunningExecutionContext,
  metaReviewExecutionContextToRunningContext
} from "../../../src/v11/domain/state/execution/executionContext.js";
import {
  readStateSnapshot,
  writeStateSnapshot as rawWriteStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/v11/shared/delivery/deliveryTargetMetadataContract.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { toPersistedSnapshot } from "../../../src/v11/domain/state/snapshot/projection.js";

const tempDirs: string[] = [];
const defaultWatchdogTimeoutMinutes = 60;

function resolveWatchdogTimeoutMinutes(
  rawState: unknown
): number {
  const state = toPersistedSnapshot(buildBubbleStateSnapshotVariant(rawState as PersistedBubbleStateSnapshot));
  const executionContext =
    state.state === "RUNNING"
      ? metaReviewExecutionContextToRunningContext(
          state.meta_review?.execution_context ?? null
        )
      : state.execution_context;
  if (executionContext === null || executionContext === undefined) {
    return defaultWatchdogTimeoutMinutes;
  }
  const startedAtMs = Date.parse(executionContext.started_at);
  const deadlineAtMs = Date.parse(executionContext.deadline_at);
  const deltaMinutes = (deadlineAtMs - startedAtMs) / 60_000;
  return Number.isFinite(deltaMinutes) && deltaMinutes > 0
    ? deltaMinutes
    : defaultWatchdogTimeoutMinutes;
}

function normalizeTestStateForWrite(
  rawState: unknown
): Parameters<typeof rawWriteStateSnapshot>[1] {
  const state = toPersistedSnapshot(buildBubbleStateSnapshotVariant(rawState as PersistedBubbleStateSnapshot));
  if (state.state === "RUNNING" && state.active_role === "meta_reviewer") {
    return buildBubbleStateSnapshotVariant({
      ...state,
      execution_context: metaReviewExecutionContextToRunningContext(
        state.meta_review?.execution_context ?? null
      )
    });
  }

  if (state.state === "RUNNING") {
    if (state.round === 0) {
      return buildBubbleStateSnapshotVariant({
        ...state,
        execution_context: null
      });
    }
    if (state.active_role !== null && state.active_since !== null) {
      return buildBubbleStateSnapshotVariant({
        ...state,
        execution_context: buildRunningExecutionContext({
          bubbleId: state.bubble_id,
          round: state.round,
          activeRole: state.active_role,
          startedAt: state.active_since,
          watchdogTimeoutMinutes: resolveWatchdogTimeoutMinutes(buildBubbleStateSnapshotVariant(state)),
          attempt: state.execution_context?.attempt ?? 1
        })
      });
    }
  }

  return buildBubbleStateSnapshotVariant({
    ...state,
    execution_context: null
  });
}

async function writeStateSnapshot(
  statePath: Parameters<typeof rawWriteStateSnapshot>[0],
  state: unknown,
  options?: Parameters<typeof rawWriteStateSnapshot>[2]
): ReturnType<typeof rawWriteStateSnapshot> {
  return rawWriteStateSnapshot(
    statePath,
    normalizeTestStateForWrite(state),
    options
  );
}

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-converged-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function setupRunningBubbleWorkspaceLinkFixture(input: {
  repoPath: string;
  bubbleId: string;
  task: string;
  reviewArtifactType?: "code" | "document";
}): Promise<BubbleCreateResult> {
  const bubble = await createBubble({
    id: input.bubbleId,
    repoPath: input.repoPath,
    baseBranch: "main",
    reviewArtifactType: input.reviewArtifactType ?? "code",
    task: input.task,
    cwd: input.repoPath
  });
  await mkdir(join(bubble.paths.worktreePath, ".."), { recursive: true });
  await symlink(input.repoPath, bubble.paths.worktreePath);

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const startedAt = "2026-02-21T12:00:00.000Z";
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: 1,
      active_agent: bubble.config.agents.implementer,
      active_role: "implementer",
      execution_context: buildRunningExecutionContext({
        bubbleId: bubble.bubbleId,
        round: 1,
        activeRole: "implementer",
        startedAt,
        watchdogTimeoutMinutes: bubble.config.watchdog_timeout_minutes
      }),
      active_since: startedAt,
      last_command_at: startedAt,
      round_role_history: [
        {
          round: 1,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer,
          switched_at: startedAt
        }
      ]
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );

  return bubble;
}

async function setupConvergedCandidateBubble(
  repoPath: string,
  bubbleId: string,
  options?: {
    reviewArtifactType?: "code" | "document";
  }
) {
  const bubble = await setupRunningBubbleWorkspaceLinkFixture({
    repoPath,
    bubbleId,
    task: "Implement + review",
    ...(options?.reviewArtifactType !== undefined
      ? { reviewArtifactType: options.reviewArtifactType }
      : {})
  });

  const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);
  const passEvents: Array<{
    now: string;
    sender: "codex" | "claude";
    recipient: "codex" | "claude";
    round: number;
    payload: PassProtocolEnvelopePayload;
  }> = [
    {
      now: "2026-02-22T09:01:00.000Z",
      sender: bubble.config.agents.implementer,
      recipient: bubble.config.agents.reviewer,
      round: 1,
      payload: {
        summary: "Implementation pass 1",
        pass_intent: "task"
      }
    },
    {
      now: "2026-02-22T09:02:00.000Z",
      sender: bubble.config.agents.reviewer,
      recipient: bubble.config.agents.implementer,
      round: 1,
      payload: {
        summary: "Review pass 1 clean",
        pass_intent: "review",
        findings_claim_state: "clean",
        findings_claim_source: "payload_flags",
        findings: []
      }
    },
    {
      now: "2026-02-22T09:03:00.000Z",
      sender: bubble.config.agents.implementer,
      recipient: bubble.config.agents.reviewer,
      round: 2,
      payload: {
        summary: "Implementation pass 2",
        pass_intent: "task"
      }
    },
    {
      now: "2026-02-22T09:03:10.000Z",
      sender: bubble.config.agents.reviewer,
      recipient: bubble.config.agents.implementer,
      round: 2,
      payload: {
        summary: "Review pass 2 findings",
        pass_intent: "fix_request",
        findings_claim_state: "open_findings",
        findings_claim_source: "payload_flags",
        findings: [
          {
            severity: "P2",
            title: "Round-2 non-blocking follow-up"
          }
        ]
      }
    },
    {
      now: "2026-02-22T09:03:20.000Z",
      sender: bubble.config.agents.implementer,
      recipient: bubble.config.agents.reviewer,
      round: 3,
      payload: {
        summary: "Implementation pass 3",
        pass_intent: "task"
      }
    },
    {
      now: "2026-02-22T09:03:30.000Z",
      sender: bubble.config.agents.reviewer,
      recipient: bubble.config.agents.implementer,
      round: 3,
      payload: {
        summary: "Review pass 3 clean",
        pass_intent: "review",
        findings_claim_state: "clean",
        findings_claim_source: "payload_flags",
        findings: []
      }
    },
    {
      now: "2026-02-22T09:03:40.000Z",
      sender: bubble.config.agents.implementer,
      recipient: bubble.config.agents.reviewer,
      round: 4,
      payload: {
        summary: "Implementation pass 4",
        pass_intent: "task"
      }
    }
  ];

  for (const event of passEvents) {
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date(event.now),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: event.sender,
        recipient: event.recipient,
        type: "PASS",
        round: event.round,
        payload: event.payload,
        refs: []
      }
    });
  }

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: 4,
      active_agent: bubble.config.agents.reviewer,
      active_role: "reviewer",
      active_since: "2026-02-22T09:03:40.000Z",
      last_command_at: "2026-02-22T09:03:40.000Z",
      round_role_history: [
        {
          round: 1,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer,
          switched_at: "2026-02-22T09:01:00.000Z"
        },
        {
          round: 2,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer,
          switched_at: "2026-02-22T09:03:00.000Z"
        },
        {
          round: 3,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer,
          switched_at: "2026-02-22T09:03:20.000Z"
        },
        {
          round: 4,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer,
          switched_at: "2026-02-22T09:03:40.000Z"
        }
      ]
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );

  return bubble;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("emitConvergedFromWorkspace", () => {
  it("blocks CONVERGED while ideation kickoff is pending", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_converged_ideation_block_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: bubble.paths.worktreePath,
      workspaceKind: "worktree"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 0,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-15T12:20:00.000Z",
        last_command_at: "2026-03-15T12:20:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "CREATED"
      }
    );

    await expect(
      emitConvergedFromWorkspace({
        summary: "Attempted converged before kickoff",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(new RegExp(IDEATION_CONVERGED_BLOCKED, "u"));
  });

  it("blocks CONVERGED while ideation kickoff is pending even with parse warning metadata", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_converged_ideation_block_02",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: bubble.paths.worktreePath,
      workspaceKind: "worktree"
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        ideation: {
          mode: true,
          task_pending: true,
          parse_warning: "IDEATION_METADATA_PARSE_WARNING: synthetic test fixture"
        }
      }),
      "utf8"
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 0,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-15T12:20:00.000Z",
        last_command_at: "2026-03-15T12:20:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "CREATED"
      }
    );

    await expect(
      emitConvergedFromWorkspace({
        summary: "Attempted converged before kickoff with parse warning",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(new RegExp(IDEATION_CONVERGED_BLOCKED, "u"));
  });

  it("adds PAIRFLOW_COMMAND_PATH_STALE blocking reason only for self_host stale command-path status", () => {
    const externalCodes = resolveMetaReviewRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      commandPathStatus: {
        status: "external",
        profile: "external",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: "/usr/local/bin/pairflow",
        localEntrypointExists: false,
        externalPairflowAvailable: true,
        pinnedCommand: "pairflow",
        message: "external profile active"
      }
    });
    expect(externalCodes).not.toContain("PAIRFLOW_COMMAND_PATH_STALE");

    const selfHostCodes = resolveMetaReviewRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      commandPathStatus: {
        status: "stale",
        reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
        profile: "self_host",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: "/usr/local/bin/pairflow",
        localEntrypointExists: true,
        externalPairflowAvailable: true,
        pinnedCommand: "node '/tmp/w/dist/cli/index.js'",
        message: "stale"
      }
    });
    expect(selfHostCodes).toContain("PAIRFLOW_COMMAND_PATH_STALE");

    const externalMismatchCodes = resolveMetaReviewRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      commandPathStatus: {
        status: "external",
        profile: "external",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: "/usr/local/lib/node_modules/pairflow/dist/cli/index.js",
        localEntrypointExists: true,
        externalPairflowAvailable: true,
        pinnedCommand: "pairflow",
        entrypointConsistency: "inconsistent",
        message: "external mismatch diagnostic"
      }
    });
    expect(externalMismatchCodes).not.toContain("PAIRFLOW_COMMAND_PATH_STALE");

    const externalUnavailableCodes = resolveMetaReviewRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      commandPathStatus: {
        status: "missing",
        reasonCode: "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE",
        profile: "external",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: null,
        localEntrypointExists: true,
        externalPairflowAvailable: false,
        pinnedCommand: "pairflow",
        message: "external unavailable"
      }
    });
    expect(externalUnavailableCodes).toContain(
      "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
    );

    const guardedExternalUnavailableCodes = resolveMetaReviewRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      commandPathStatus: {
        status: "missing",
        reasonCode: "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE",
        profile: "self_host",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: null,
        localEntrypointExists: true,
        externalPairflowAvailable: false,
        pinnedCommand: "node '/tmp/w/dist/cli/index.js'",
        message: "synthetic invalid combo"
      }
    });
    expect(guardedExternalUnavailableCodes).not.toContain(
      "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
    );

    const selfHostUnresolvedCodes = resolveMetaReviewRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      commandPathStatus: {
        status: "unknown",
        reasonCode: "PAIRFLOW_COMMAND_PATH_UNRESOLVED",
        profile: "self_host",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: null,
        localEntrypointExists: true,
        externalPairflowAvailable: true,
        pinnedCommand: "node '/tmp/w/dist/cli/index.js'",
        message: "self_host unresolved"
      }
    });
    expect(selfHostUnresolvedCodes).toContain("PAIRFLOW_COMMAND_PATH_UNRESOLVED");
  });

  it(
    "emits approval wait notifications to human + implementer + reviewer panes",
    { timeout: 15_000 },
    async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_notify_01");
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const deliveries: Array<{
      recipient: string;
      messageRef?: string;
      deliveryTargetRole?: unknown;
    }> = [];

    const result = await emitConvergedFromWorkspace(
      {
        summary: "Ready for approval.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:04:00.000Z")
      },
      {
        emitDeliveryNotificationAck: (input) => {
          deliveries.push({
            recipient: input.envelope.recipient,
            deliveryTargetRole:
              input.envelope.payload.metadata?.[deliveryTargetRoleMetadataKey],
            ...(input.messageRef !== undefined
              ? { messageRef: input.messageRef }
              : {})
          });
          return Promise.resolve({
            status: "accepted",
            sessionName: "pf-b_converged_notify_01",
            targetPaneIndex: 1,
            message: "ok"
          });
        },
        emitBubbleNotification: () =>
          Promise.resolve({
            kind: "converged",
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          }),
        applyMetaReviewGateOnConvergence: async () => ({
          bubbleId: bubble.bubbleId,
          route: "human_gate_approve",
          gateSequence: 42,
          gateEnvelope: {
            id: "msg_converged_notify_approval_01",
            ts: "2026-02-22T09:04:00.000Z",
            bubble_id: bubble.bubbleId,
            sender: "orchestrator",
            recipient: "human",
            type: "APPROVAL_REQUEST",
            round: loaded.state.round,
            payload: {
              summary: "Ready for approval.",
              metadata: {
                [deliveryTargetRoleMetadataKey]: "status"
              }
            },
            refs: []
          },
          state: buildBubbleStateSnapshotVariant({
            ...loaded.state,
            state: "READY_FOR_HUMAN_APPROVAL",
            active_agent: null,
            active_role: null,
            active_since: null,
            last_command_at: "2026-02-22T09:04:00.000Z"
          })
        }),
      }
    );

    expect(deliveries.map((delivery) => delivery.recipient)).toEqual([
      "human",
      "codex",
      "claude"
    ]);
    expect(deliveries.map((delivery) => delivery.deliveryTargetRole)).toEqual([
      "status",
      "implementer",
      "reviewer"
    ]);
    const expectedRef = `${bubble.paths.transcriptPath}#${result.approvalRequestEnvelope.id}`;
    expect(deliveries.map((delivery) => delivery.messageRef)).toEqual([
      expectedRef,
      expectedRef,
      expectedRef
    ]);
    expect(deliveries[0]?.messageRef?.startsWith("transcript.ndjson#")).toBe(false);
    expect(result.delivery).toMatchObject({
      status: "accepted",
      retried: false
    });
    }
  );

  it(
    "emits auto-rework delivery only to implementer pane",
    { timeout: 15_000 },
    async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_notify_03");
    const deliveries: string[] = [];
    const loaded = await readStateSnapshot(bubble.paths.statePath);

    const result = await emitConvergedFromWorkspace(
      {
        summary: "Auto rework route.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:04:30.000Z")
      },
      {
        applyMetaReviewGateOnConvergence: async () => ({
          bubbleId: bubble.bubbleId,
          route: "auto_rework",
          gateSequence: 999,
          gateEnvelope: {
            id: "msg_auto_rework_01",
            ts: "2026-02-22T09:04:30.000Z",
            bubble_id: bubble.bubbleId,
            sender: "orchestrator",
            recipient: bubble.config.agents.implementer,
            type: "APPROVAL_DECISION",
            round: loaded.state.round,
            payload: {
              decision: "rework",
              message: "Implement auto-rework patch.",
              metadata: {
                actor: "meta-review-gate"
              }
            },
            refs: []
          },
          state: buildBubbleStateSnapshotVariant({
            ...loaded.state,
            state: "RUNNING",
            round: loaded.state.round + 1,
            active_agent: bubble.config.agents.implementer,
            active_role: "implementer",
            active_since: "2026-02-22T09:04:30.000Z",
            last_command_at: "2026-02-22T09:04:30.000Z"
          })
        }),
        emitDeliveryNotificationAck: (input) => {
          deliveries.push(input.envelope.recipient);
          return Promise.resolve({
            status: "accepted",
            sessionName: "pf-b_converged_notify_03",
            targetPaneIndex: 1,
            message: "ok"
          });
        }
      }
    );

    expect(deliveries).toEqual([bubble.config.agents.implementer]);
    expect(result.gateRoute).toBe("auto_rework");
    expect(result.delivery).toMatchObject({
      status: "accepted",
      retried: false
    });
    }
  );

  it("persists convergence-policy diagnostics into CONVERGENCE payload metadata", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_policy_diag_01",
      task: "Convergence diagnostics metadata"
    });

    const initial = await readStateSnapshot(bubble.paths.statePath);
    const lockPath = join(
      bubble.paths.locksDir,
      `${bubble.bubbleId}.lock`
    );
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T09:10:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.reviewer,
        recipient: bubble.config.agents.implementer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "P2 findings remain open in parser phrasing.",
          pass_intent: "review",
          findings_claim_state: "clean",
          findings_claim_source: "payload_flags",
          findings: []
        },
        refs: []
      }
    });

    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...initial.state,
        round: 2,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-22T09:10:10.000Z",
        last_command_at: "2026-02-22T09:10:10.000Z",
        round_role_history: [
          ...initial.state.round_role_history,
          {
            round: 2,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T09:10:10.000Z"
          }
        ]
      },
      {
        expectedFingerprint: initial.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const result = await emitConvergedFromWorkspace(
      {
        summary: "Converge with parser divergence diagnostics.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:10:20.000Z")
      },
      {
        applyMetaReviewGateOnConvergence: async () => ({
          bubbleId: bubble.bubbleId,
          route: "human_gate_approve",
          gateSequence: 501,
          gateEnvelope: {
            id: "msg_converged_policy_diag_gate_01",
            ts: "2026-02-22T09:10:20.000Z",
            bubble_id: bubble.bubbleId,
            sender: "orchestrator",
            recipient: "human",
            type: "APPROVAL_REQUEST",
            round: loaded.state.round,
            payload: {
              summary: "Ready for approval.",
              metadata: {
                [deliveryTargetRoleMetadataKey]: "status"
              }
            },
            refs: []
          },
          state: buildBubbleStateSnapshotVariant({
            ...loaded.state,
            state: "READY_FOR_HUMAN_APPROVAL",
            active_agent: null,
            active_role: null,
            active_since: null,
            last_command_at: "2026-02-22T09:10:20.000Z"
          })
        }),
        emitDeliveryNotificationAck: async () => ({
          status: "accepted",
          sessionName: "pf-b_converged_policy_diag_01",
          targetPaneIndex: 1,
          message: "ok"
        }),
        emitBubbleNotification: async () => ({
          kind: "converged",
          attempted: false,
          delivered: false,
          soundPath: null,
          reason: "disabled"
        })
      }
    );

    const diagnostics =
      result.convergenceEnvelope.payload.metadata?.convergence_policy_diagnostics;
    expect(Array.isArray(diagnostics)).toBe(true);
    expect(
      (diagnostics as unknown[]).some(
        (entry) =>
          typeof entry === "string" &&
          entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
      )
    ).toBe(true);
  });

  it("retries auto-rework delivery once with warm-up when first delivery is unconfirmed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_notify_retry_01");
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const calls: Array<{
      recipient: string;
      initialDelayMs?: number;
      deliveryAttempts?: number;
    }> = [];

    const result = await emitConvergedFromWorkspace(
      {
        summary: "Auto rework route with retry.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:04:31.000Z")
      },
      {
        applyMetaReviewGateOnConvergence: async () => ({
          bubbleId: bubble.bubbleId,
          route: "auto_rework",
          gateSequence: 1001,
          gateEnvelope: {
            id: "msg_auto_rework_retry_01",
            ts: "2026-02-22T09:04:31.000Z",
            bubble_id: bubble.bubbleId,
            sender: "orchestrator",
            recipient: bubble.config.agents.implementer,
            type: "APPROVAL_DECISION",
            round: loaded.state.round,
            payload: {
              decision: "rework",
              message: "Implement retry-safe auto rework patch.",
              metadata: {
                actor: "meta-review-gate"
              }
            },
            refs: []
          },
          state: buildBubbleStateSnapshotVariant({
            ...loaded.state,
            state: "RUNNING",
            round: loaded.state.round + 1,
            active_agent: bubble.config.agents.implementer,
            active_role: "implementer",
            active_since: "2026-02-22T09:04:31.000Z",
            last_command_at: "2026-02-22T09:04:31.000Z"
          })
        }),
        emitDeliveryNotificationAck: (input) => {
          calls.push({
            recipient: input.envelope.recipient,
            ...(input.initialDelayMs !== undefined
              ? { initialDelayMs: input.initialDelayMs }
              : {}),
            ...(input.deliveryAttempts !== undefined
              ? { deliveryAttempts: input.deliveryAttempts }
              : {})
          });
          if (calls.length === 1) {
            return Promise.resolve({
              status: "rejected",
              sessionName: "pf-b_converged_notify_retry_01",
              message: "not confirmed",
              reason: "delivery_unconfirmed"
            });
          }
          return Promise.resolve({
            status: "accepted",
            sessionName: "pf-b_converged_notify_retry_01",
            targetPaneIndex: 1,
            message: "ok"
          });
        }
      }
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      recipient: bubble.config.agents.implementer
    });
    expect(calls[0]?.initialDelayMs).toBeUndefined();
    expect(calls[0]?.deliveryAttempts).toBeUndefined();
    expect(calls[1]).toMatchObject({
      recipient: bubble.config.agents.implementer,
      initialDelayMs: 5000,
      deliveryAttempts: 6
    });
    expect(result.gateRoute).toBe("auto_rework");
    expect(result.delivery).toMatchObject({
      status: "accepted",
      retried: true
    });
  });

  it(
    "enters RUNNING meta-review authority without synchronous gate-timeout ownership when structured channel is available",
    { timeout: 10_000 },
    async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_meta_async_01");

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_converged_meta_async_01",
      now: new Date("2026-02-22T09:03:55.000Z")
    });

    const result = await emitConvergedFromWorkspace(
      {
        summary: "Ready for meta-review submit handoff.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:04:00.000Z")
      },
      {
        applyMetaReviewGateOnConvergence: (gateInput) =>
          applyMetaReviewGateOnConvergence(gateInput, {
            notifyMetaReviewerSubmissionRequest: async () => ({
              status: "confirmed",
              reasonCode: null,
              message: "ok"
            })
          })
      }
    );

    expect(result.gateRoute).toBe("meta_review_running");
    expect(result.approvalRequestEnvelope.type).toBe("TASK");
      expect(result.state.state).toBe("RUNNING");
    }
  );

  it("returns deterministic delivery status when any approval notification is unconfirmed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_notify_02");

    const result = await emitConvergedFromWorkspace(
      {
        summary: "Ready for approval.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:04:00.000Z")
      },
      {
        emitDeliveryNotificationAck: (input) => {
          if (input.envelope.recipient === bubble.config.agents.implementer) {
            return Promise.resolve({
              status: "rejected",
              sessionName: "pf-b_converged_notify_02",
              message: "not confirmed",
              reason: "delivery_unconfirmed"
            });
          }
          return Promise.resolve({
            status: "accepted",
            sessionName: "pf-b_converged_notify_02",
            targetPaneIndex: 1,
            message: "ok"
          });
        },
      }
    );

    expect(result.gateRoute).toBe("meta_review_running");
    expect(result.state.state).toBe("RUNNING");
    expect(result.delivery).toMatchObject({
      status: "rejected",
      reason: "delivery_unconfirmed",
      retried: false
    });
  });

  it("fails closed when gate routing crashes after partial state write", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_recover_01");

    await expect(
      emitConvergedFromWorkspace(
        {
          summary: "Recover from partial gate failure.",
          cwd: bubble.paths.worktreePath,
          now: new Date("2026-02-22T09:04:45.000Z")
        },
        {
          applyMetaReviewGateOnConvergence: async () => {
            const loaded = await readStateSnapshot(bubble.paths.statePath);
            const executionContext = buildMetaReviewExecutionContext({
              bubbleId: bubble.bubbleId,
              round: loaded.state.round,
              startedAt: "2026-02-22T09:04:40.000Z",
              watchdogTimeoutMinutes: 60,
              attempt: 1
            });
            await writeStateSnapshot(
              bubble.paths.statePath,
              {
                ...loaded.state,
                state: "RUNNING",
                active_agent: "codex",
                active_role: "meta_reviewer",
                active_since: "2026-02-22T09:04:40.000Z",
                execution_context:
                  metaReviewExecutionContextToRunningContext(executionContext),
                meta_review: {
                  execution_context: executionContext,
                  auto_rework_count: 0,
                  auto_rework_limit: 5,
                  sticky_human_gate: false,
                  consecutive_clean_runs: 0,
                }
              },
              {
                expectedFingerprint: loaded.fingerprint,
                expectedState: "RUNNING"
              }
            );
            throw new Error("simulated gate crash after snapshot write");
          }
        }
      )
    ).rejects.toThrow(/simulated gate crash after snapshot write/u);

    const finalState = await readStateSnapshot(bubble.paths.statePath);
    expect(finalState.state.state).toBe("RUNNING");
  });

  it("writes CONVERGENCE + APPROVAL_REQUEST and moves RUNNING -> READY_FOR_HUMAN_APPROVAL when meta-review run fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_01");
    const now = new Date("2026-02-22T09:05:00.000Z");

    const result = await emitConvergedFromWorkspace({
      summary: "Two clean review passes, ready for approval.",
      refs: ["artifact://done-package.md"],
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.bubbleId).toBe("b_converged_01");
    expect(result.convergenceEnvelope.type).toBe("CONVERGENCE");
    expect(result.gateRoute).toBe("meta_review_running");
    expect(result.approvalRequestEnvelope.type).toBe("TASK");
    expect(result.approvalRequestEnvelope.recipient).toBe("codex");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.last_command_at).toBe(now.toISOString());

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS",
      "PASS",
      "PASS",
      "PASS",
      "PASS",
      "PASS",
      "PASS",
      "CONVERGENCE",
      "TASK"
    ]);

    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox.map((entry) => entry.type)).toEqual(["TASK"]);
  });

});
