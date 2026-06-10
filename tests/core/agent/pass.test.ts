import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import { parsePassCommandOptions } from "../../../src/cli/commands/agent/pass.js";
import {
  emitPassFromWorkspace
} from "../../../src/v11/application/pass/passCommandOrchestration.js";
import type { EmitPassResult } from "../../../src/v11/application/pass/passCommandContract.js";
import { PassCommandError } from "../../../src/v11/application/pass/internal/normalPass/passCommandError.js";
import {
  resolveMostRecentPreviousReviewerPassIsCleanFromMetadata
} from "../../../src/v11/domain/pass/repeatCleanMetadata.js";
import { IDEATION_PASS_BLOCKED } from "../../../src/v11/shared/ideation/ideationReasonCodes.js";
import {
  buildRunningExecutionContext,
  metaReviewExecutionContextToRunningContext
} from "../../../src/v11/domain/state/execution/executionContext.js";
import {
  readStateSnapshot,
  writeStateSnapshot as rawWriteStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../src/v11/domain/state/snapshot/bubbleStateSnapshot.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
import type { PersistedBubbleStateSnapshot } from "../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../src/v11/domain/state/snapshot/projection.js";
import { bootstrapWorktreeWorkspace } from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import {
  appendProtocolEnvelopes,
  readTranscriptEnvelopes
} from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/v11/shared/delivery/deliveryTargetMetadataContract.js";
import {
  repeatCleanAutoconvergeTriggeredReasonCode,
  repeatCleanTriggerNotMetReasonCode
} from "../../../src/v11/domain/convergence/repeatCleanAutoconverge.js";
import { createDocContractGateArtifact } from "../../../src/v11/shared/gates/docContractGates.js";
import {
  readDocContractGateArtifact,
  writeDocContractGateArtifact
} from "../../../src/v11/infrastructure/artifact/gates/docContractGateArtifacts.js";
import {
  resolveDocContractGateArtifactPath
} from "../../../src/v11/infrastructure/artifact/gates/docContractGateArtifacts.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import type {
  PassProtocolEnvelopePayload
} from "../../../src/v11/shared/protocol/protocolEnvelopeContract.js";

const tempDirs: string[] = [];
let sharedRepoPathPromise: Promise<string> | undefined;
const defaultWatchdogTimeoutMinutes = 60;

// Step 4b-γ/4: tests work with persisted-shape fixtures and cast at
// boundary via buildBubbleStateSnapshotVariant. Step 4b-γ/5 will replace
// with proper variant fixture builders.
type PassTestState = unknown;

function resolveWatchdogTimeoutMinutes(
  state: ReturnType<typeof toPersistedSnapshot>
): number {
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

function passPayload(result: EmitPassResult): PassProtocolEnvelopePayload {
  expect(result.resultEnvelopeKind).toBe("pass");
  expect(result.envelope.type).toBe("PASS");
  if (result.resultEnvelopeKind !== "pass" || result.envelope.type !== "PASS") {
    throw new Error("Expected pass result envelope.");
  }
  return result.envelope.payload;
}

function normalizeTestStateForWrite(
  state: PassTestState
): BubbleStateSnapshot {
  const persisted = toPersistedSnapshot(buildBubbleStateSnapshotVariant(state as PersistedBubbleStateSnapshot));
  if (persisted.state === "RUNNING" && persisted.active_role === "meta_reviewer") {
    return buildBubbleStateSnapshotVariant({
      ...persisted,
      execution_context: metaReviewExecutionContextToRunningContext(
        persisted.meta_review?.execution_context ?? null
      )
    });
  }

  if (persisted.state === "RUNNING") {
    if (persisted.round === 0) {
      return buildBubbleStateSnapshotVariant({
        ...persisted,
        execution_context: null
      });
    }
    if (persisted.active_role !== null && persisted.active_since !== null) {
      return buildBubbleStateSnapshotVariant({
        ...persisted,
        execution_context: buildRunningExecutionContext({
          bubbleId: persisted.bubble_id,
          round: persisted.round,
          activeRole: persisted.active_role,
          startedAt: persisted.active_since,
          watchdogTimeoutMinutes: resolveWatchdogTimeoutMinutes(persisted),
          attempt: persisted.execution_context?.attempt ?? 1
        })
      });
    }
  }

  return buildBubbleStateSnapshotVariant({
    ...persisted,
    execution_context: null
  });
}

async function writeStateSnapshot(
  statePath: Parameters<typeof rawWriteStateSnapshot>[0],
  state: PassTestState,
  options?: Parameters<typeof rawWriteStateSnapshot>[2]
): ReturnType<typeof rawWriteStateSnapshot> {
  return rawWriteStateSnapshot(
    statePath,
    normalizeTestStateForWrite(state),
    options
  );
}

async function createTempRepo(): Promise<string> {
  if (sharedRepoPathPromise === undefined) {
    sharedRepoPathPromise = (async () => {
      const root = await mkdtemp(join(tmpdir(), "pairflow-pass-command-"));
      await initGitRepository(root);
      return root;
    })();
  }
  return sharedRepoPathPromise;
}

async function setReviewerActive(worktreeStatePath: string, reviewerAgent: "codex" | "claude"): Promise<void> {
  const loaded = await readStateSnapshot(worktreeStatePath);
  await writeStateSnapshot(
    worktreeStatePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: 1,
      active_agent: reviewerAgent,
      active_role: "reviewer",
      active_since: "2026-02-21T12:06:00.000Z",
      last_command_at: "2026-02-21T12:06:00.000Z"
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );
}

async function advanceToReviewerRoundTwoWithCleanHistory(
  bubble: Awaited<ReturnType<typeof setupRunningBubbleFixture>>
): Promise<void> {
  await seedReviewerRoundTwoWithCleanHistory({ bubble });
}

async function seedReviewerRoundTwoWithCleanHistory(input: {
  bubble: Awaited<ReturnType<typeof setupRunningBubbleFixture>>;
  previousReviewerRefs?: string[];
}): Promise<void> {
  await seedReviewerRoundTwoWithHistory({
    ...input,
    previousReviewerPayload: {
      summary: "Reviewer clean handoff round 1",
      pass_intent: "review",
      findings_claim_state: "clean",
      findings_claim_source: "payload_flags",
      findings: [],
      metadata: {
        [deliveryTargetRoleMetadataKey]: "implementer"
      }
    }
  });
}

async function seedReviewerRoundTwoWithHistory(input: {
  bubble: Awaited<ReturnType<typeof setupRunningBubbleFixture>>;
  previousReviewerPayload: PassProtocolEnvelopePayload;
  previousReviewerRefs?: string[];
}): Promise<void> {
  const { bubble } = input;
  const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);
  await appendProtocolEnvelopes({
    transcriptPath: bubble.paths.transcriptPath,
    lockPath,
    now: new Date("2026-03-01T10:01:00.000Z"),
    entries: [
      {
        envelope: {
          bubble_id: bubble.bubbleId,
          sender: bubble.config.agents.implementer,
          recipient: bubble.config.agents.reviewer,
          type: "PASS",
          round: 1,
          payload: {
            summary: "Implementer handoff round 1",
            pass_intent: "task",
            metadata: {
              [deliveryTargetRoleMetadataKey]: "reviewer"
            }
          },
          refs: []
        }
      },
      {
        envelope: {
          bubble_id: bubble.bubbleId,
          sender: bubble.config.agents.reviewer,
          recipient: bubble.config.agents.implementer,
          type: "PASS",
          round: 1,
          payload: input.previousReviewerPayload,
          refs: input.previousReviewerRefs ?? []
        }
      },
      {
        envelope: {
          bubble_id: bubble.bubbleId,
          sender: bubble.config.agents.implementer,
          recipient: bubble.config.agents.reviewer,
          type: "PASS",
          round: 2,
          payload: {
            summary: "Implementer handoff round 2",
            pass_intent: "task",
            metadata: {
              [deliveryTargetRoleMetadataKey]: "reviewer"
            }
          },
          refs: []
        }
      }
    ]
  });

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: 2,
      active_agent: bubble.config.agents.reviewer,
      active_role: "reviewer",
      active_since: "2026-03-01T10:03:00.000Z",
      last_command_at: "2026-03-01T10:03:00.000Z",
      round_role_history: buildRoundRoleHistoryThroughRound({
        throughRound: 2,
        implementer: bubble.config.agents.implementer,
        reviewer: bubble.config.agents.reviewer
      })
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );
}

function buildRoundRoleHistoryThroughRound(input: {
  throughRound: number;
  implementer: "codex" | "claude";
  reviewer: "codex" | "claude";
}): Array<{
  round: number;
  implementer: "codex" | "claude";
  reviewer: "codex" | "claude";
  switched_at: string;
}> {
  return Array.from({ length: input.throughRound }, (_, index) => {
    const round = index + 1;
    const switchedMinute = (round - 1) * 30;
    const switchedHour = 10 + Math.floor(switchedMinute / 60);
    const minute = switchedMinute % 60;
    return {
      round,
      implementer: input.implementer,
      reviewer: input.reviewer,
      switched_at:
        `2026-03-01T${String(switchedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`
    };
  });
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

afterAll(async () => {
  if (sharedRepoPathPromise === undefined) {
    return;
  }
  await rm(await sharedRepoPathPromise, { recursive: true, force: true });
  sharedRepoPathPromise = undefined;
});

describe("emitPassFromWorkspace", { timeout: 20_000 }, () => {
  it("blocks PASS while ideation kickoff is pending", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_pass_ideation_block_01",
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
        active_agent: bubble.config.agents.implementer,
        active_role: "implementer",
        active_since: "2026-03-15T12:00:00.000Z",
        last_command_at: "2026-03-15T12:00:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "CREATED"
      }
    );

    const transcriptBefore = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    await expect(
      emitPassFromWorkspace({
        summary: "Attempted handoff before kickoff",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(new RegExp(IDEATION_PASS_BLOCKED, "u"));
    const transcriptAfter = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcriptAfter).toEqual(transcriptBefore);
  });

  it("resolves canonical repeat-clean metadata key and falls back to deprecated legacy key", () => {
    expect(
      resolveMostRecentPreviousReviewerPassIsCleanFromMetadata({
        most_recent_previous_reviewer_pass_is_clean: false,
        most_recent_previous_reviewer_clean_pass_envelope: true
      })
    ).toBe(false);
    expect(
      resolveMostRecentPreviousReviewerPassIsCleanFromMetadata({
        most_recent_previous_reviewer_clean_pass_envelope: true
      })
    ).toBe(true);
    expect(
      resolveMostRecentPreviousReviewerPassIsCleanFromMetadata(undefined)
    ).toBeUndefined();
  });

  it("writes PASS envelope and switches active role with inferred intent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_01",
      task: "Implement pass flow"
    });
    const authorityBeforeEmit = await readStateSnapshot(bubble.paths.statePath);
    const now = new Date("2026-02-21T12:05:00.000Z");

    const result = await emitPassFromWorkspace({
      summary: "Implementation complete",
      refs: ["artifact://diff/round-1.patch"],
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.bubbleId).toBe("b_pass_01");
    expect(result.sequence).toBe(2);
    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.inferredIntent).toBe(true);
    expect(result.envelope.type).toBe("PASS");
    expect(result.envelope.round).toBe(1);
    expect(result.envelope.sender).toBe("codex");
    expect(result.envelope.recipient).toBe("claude");
    expect(passPayload(result).pass_intent).toBe("review");
    expect(passPayload(result).metadata).toEqual(
      expect.objectContaining({
        [deliveryTargetRoleMetadataKey]: "reviewer"
      })
    );
    expect(result.transitionDecision).toBe("normal_pass");
    expect(result.repeatCleanReasonCode).toBe(repeatCleanTriggerNotMetReasonCode);
    expect(result.repeatCleanReasonDetail).toBe("base_precondition_not_met");
    expect(result.repeatCleanTrigger).toBe(false);
    expect(result.mostRecentPreviousReviewerCleanPassEnvelope).toBe(false);
    expect(result.activation).toEqual({
      handoff_id: authorityBeforeEmit.state.execution_context?.handoff_id,
      execution_id: authorityBeforeEmit.state.execution_context?.execution_id,
      expected_role: authorityBeforeEmit.state.execution_context?.active_role,
      expected_round: authorityBeforeEmit.state.execution_context?.round,
      expected_state_fingerprint: authorityBeforeEmit.fingerprint
    });

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS"
    ]);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.active_agent).toBe("claude");
    expect(loaded.state.active_role).toBe("reviewer");
    expect(loaded.state.round).toBe(1);
    expect(loaded.state.last_command_at).toBe(now.toISOString());
  });

  it("increments round when reviewer passes back to implementer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_03",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const now = new Date("2026-02-21T12:07:00.000Z");
    const result = await emitPassFromWorkspace({
      summary: "Found issues to fix",
      findings: [
        {
          severity: "P2",
          title: "Improve null checks"
        }
      ],
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.envelope.sender).toBe("claude");
    expect(result.envelope.recipient).toBe("codex");
    expect(result.envelope.round).toBe(1);
    expect(result.inferredIntent).toBe(true);
    expect(passPayload(result).pass_intent).toBe("fix_request");

    const updated = await readStateSnapshot(bubble.paths.statePath);
    expect(updated.state.round).toBe(2);
    expect(updated.state.active_agent).toBe("codex");
    expect(updated.state.active_role).toBe("implementer");
    expect(updated.state.round_role_history.some((entry) => entry.round === 2)).toBe(true);
  });

  it("keeps pre-gate compatibility at round 3 with P2-only findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_pre_gate_round3_p2_only_01",
      task: "Pre-gate round 3 P2 compatibility"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 3,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-03T10:00:00.000Z",
        last_command_at: "2026-03-03T10:00:00.000Z",
        round_role_history: [
          {
            round: 1,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-03-03T09:00:00.000Z"
          },
          {
            round: 2,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-03-03T09:20:00.000Z"
          },
          {
            round: 3,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-03-03T09:40:00.000Z"
          }
        ]
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Pre-gate P2 finding remains allowed",
      findings: [
        {
          severity: "P2",
          title: "Non-blocking but actionable item"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(result.envelope.type).toBe("PASS");
    expect(result.envelope.round).toBe(3);
    expect(passPayload(result).pass_intent).toBe("fix_request");
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(4);
  });

  it("rejects malformed reviewer findings payload with explicit reason code", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_invalid_findings_payload_01",
      task: "Invalid findings payload reject"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 2,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-01T12:12:00.000Z",
        last_command_at: "2026-03-01T12:12:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const transcriptBefore = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    const stateBefore = await readStateSnapshot(bubble.paths.statePath);

    await expect(
      emitPassFromWorkspace({
        summary: "Malformed findings payload",
        findings: [{ title: "Missing severity/priority" } as unknown as {
          severity: "P2";
          title: string;
        }],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/FINDINGS_PAYLOAD_INVALID/u);

    const transcriptAfter = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcriptAfter).toEqual(transcriptBefore);
    const stateAfter = await readStateSnapshot(bubble.paths.statePath);
    expect(stateAfter.state).toEqual(stateBefore.state);
    expect(stateAfter.fingerprint).toBe(stateBefore.fingerprint);
  });

  it("keeps structured findings-claim fields reviewer-only across role lifecycle", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_claim_lifecycle_roles_01",
      task: "Structured claim lifecycle across roles"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const reviewerPass = await emitPassFromWorkspace({
      summary: "Reviewer clean.",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });
    expect(passPayload(reviewerPass).findings_claim_state).toBe("clean");
    expect(passPayload(reviewerPass).findings_claim_source).toBe("payload_flags");

    const implementerPass = await emitPassFromWorkspace({
      summary: "Implemented requested follow-up.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:08:00.000Z")
    });
    expect(implementerPass.envelope.sender).toBe("codex");
    expect("findings" in implementerPass.envelope.payload).toBe(false);
    expect("findings_claim_state" in implementerPass.envelope.payload).toBe(false);
    expect("findings_claim_source" in implementerPass.envelope.payload).toBe(false);
  });

  it("rejects reviewer --no-findings via pass at round>=severity_gate_round with no side effects", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_post_gate_no_findings_01",
      task: "Post-gate no-findings reject"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 4,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-01T12:00:00.000Z",
        last_command_at: "2026-03-01T12:00:00.000Z",
        round_role_history: buildRoundRoleHistoryThroughRound({
          throughRound: 4,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer
        })
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const transcriptBefore = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    const stateBefore = await readStateSnapshot(bubble.paths.statePath);

    await expect(
      emitPassFromWorkspace({
        summary: "Reviewer clean at post gate",
        noFindings: true,
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/REVIEWER_PASS_NO_FINDINGS_POST_GATE/u);

    const transcriptAfter = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcriptAfter).toEqual(transcriptBefore);
    const stateAfter = await readStateSnapshot(bubble.paths.statePath);
    expect(stateAfter.state).toEqual(stateBefore.state);
  });

  it("keeps post-gate no-findings reason-code precedence over summary contradiction checks", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_post_gate_no_findings_precedence_01",
      task: "Post-gate no-findings reason precedence"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 4,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-01T12:00:00.000Z",
        last_command_at: "2026-03-01T12:00:00.000Z",
        round_role_history: buildRoundRoleHistoryThroughRound({
          throughRound: 4,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer
        })
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "No findings remain, but P2 findings are still open.",
        noFindings: true,
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/REVIEWER_PASS_NO_FINDINGS_POST_GATE/u);
  });

  it("rejects reviewer non-blocking-only pass at round>=severity_gate_round with no side effects", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_post_gate_non_blocking_01",
      task: "Post-gate non-blocking pass reject"
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        review_policy: {
          review_loop_mode:
            bubble.config.review_policy?.review_loop_mode ?? "full",
          reviewer_blocking_min_severity: "P2",
          meta_review_auto_rework_min_severity:
            bubble.config.review_policy?.meta_review_auto_rework_min_severity ?? "P3"
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
        round: 4,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-01T12:05:00.000Z",
        last_command_at: "2026-03-01T12:05:00.000Z",
        round_role_history: buildRoundRoleHistoryThroughRound({
          throughRound: 4,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer
        })
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const transcriptBefore = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    const stateBefore = await readStateSnapshot(bubble.paths.statePath);

    await expect(
      emitPassFromWorkspace({
        summary: "Only non-blocking findings remain",
        findings: [
          {
            severity: "P3",
            title: "Minor cleanup"
          }
        ],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/REVIEWER_PASS_NON_BLOCKING_POST_GATE/u);

    const transcriptAfter = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcriptAfter).toEqual(transcriptBefore);
    const stateAfter = await readStateSnapshot(bubble.paths.statePath);
    expect(stateAfter.state).toEqual(stateBefore.state);
  });

  it("allows reviewer pass at round>=severity_gate_round when configured reviewer threshold is P3 and only P3 findings remain", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_post_gate_p3_threshold_01",
      task: "Post-gate P3 threshold allows advisory-only pass"
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        review_policy: {
          review_loop_mode:
            bubble.config.review_policy?.review_loop_mode ?? "full",
          reviewer_blocking_min_severity: "P3",
          meta_review_auto_rework_min_severity:
            bubble.config.review_policy?.meta_review_auto_rework_min_severity ?? "P3"
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
        round: 4,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-01T12:07:00.000Z",
        last_command_at: "2026-03-01T12:07:00.000Z",
        round_role_history: buildRoundRoleHistoryThroughRound({
          throughRound: 4,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer
        })
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Only P3 follow-up notes remain",
      findings: [
        {
          severity: "P3",
          title: "Minor cleanup"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(result.envelope.type).toBe("PASS");
    expect(passPayload(result).pass_intent).toBe("fix_request");
    expect(passPayload(result).findings).toEqual([
      {
        priority: "P3",
        severity: "P3",
        title: "Minor cleanup"
      }
    ]);
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(5);
  });

  it("allows reviewer pass at round>=severity_gate_round when configured reviewer threshold is P2 and P2 findings remain", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_post_gate_p2_threshold_01",
      task: "Post-gate P2 threshold allows P2 findings pass"
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        review_policy: {
          review_loop_mode:
            bubble.config.review_policy?.review_loop_mode ?? "full",
          reviewer_blocking_min_severity: "P2",
          meta_review_auto_rework_min_severity:
            bubble.config.review_policy?.meta_review_auto_rework_min_severity ?? "P3"
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
        round: 4,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-01T12:08:00.000Z",
        last_command_at: "2026-03-01T12:08:00.000Z",
        round_role_history: buildRoundRoleHistoryThroughRound({
          throughRound: 4,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer
        })
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "P2 fix work remains",
      findings: [
        {
          severity: "P2",
          title: "Functional gap remains"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(result.envelope.type).toBe("PASS");
    expect(passPayload(result).pass_intent).toBe("fix_request");
    expect(passPayload(result).findings).toEqual([
      {
        priority: "P2",
        severity: "P2",
        title: "Functional gap remains"
      }
    ]);
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(5);
  });

  it("allows reviewer pass at round>=severity_gate_round when blocker is present", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_post_gate_blocker_01",
      task: "Post-gate blocker pass allow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 4,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-01T12:10:00.000Z",
        last_command_at: "2026-03-01T12:10:00.000Z",
        round_role_history: buildRoundRoleHistoryThroughRound({
          throughRound: 4,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer
        })
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Blocker remains",
      findings: [
        {
          severity: "P1",
          title: "Must fix before converge"
        },
        {
          severity: "P3",
          title: "Minor polish"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(result.envelope.type).toBe("PASS");
    expect(passPayload(result).pass_intent).toBe("fix_request");
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(5);
  });

  it("allows document-scope post-gate pass when strict blocker qualifiers are present", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_post_gate_doc_strict_blocker_01",
      task: "Doc scope post-gate strict blocker pass allow",
      reviewArtifactType: "document"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 4,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-01T12:12:00.000Z",
        last_command_at: "2026-03-01T12:12:00.000Z",
        round_role_history: buildRoundRoleHistoryThroughRound({
          throughRound: 4,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer
        })
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Doc scope strict blocker remains",
      findings: [
        {
          priority: "P1",
          timing: "required-now",
          layer: "L1",
          title: "Strict document-scope blocker"
        },
        {
          severity: "P3",
          title: "Minor doc cleanup"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(result.envelope.type).toBe("PASS");
    expect(passPayload(result).pass_intent).toBe("fix_request");
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(5);
  });

  it("preserves shorthand compatibility defaults through document-scope reviewer pass emission from CLI parsing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_doc_shorthand_defaults_01",
      task: "Document scope shorthand defaults",
      reviewArtifactType: "document"
    });

    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const options = parsePassCommandOptions([
      "--summary",
      "Document scope shorthand-compatible finding",
      "--finding",
      "P2:Compatibility defaults applied by CLI shorthand|docs/reviewer-severity-ontology.md#runtime-pass-evidence-binding"
    ]);
    if (options.help) {
      throw new Error("Expected parsed PASS options instead of help output");
    }
    const result = await emitPassFromWorkspace({
      ...options,
      cwd: bubble.paths.worktreePath
    });

    expect(passPayload(result).findings).toEqual([
      {
        priority: "P2",
        severity: "P2",
        timing: "later-hardening",
        layer: "L1",
        refs: ["docs/reviewer-severity-ontology.md#runtime-pass-evidence-binding"],
        title: "Compatibility defaults applied by CLI shorthand"
      }
    ]);

    const artifact = await readDocContractGateArtifact(
      resolveDocContractGateArtifactPath(bubble.paths.artifactsDir)
    );
    expect(artifact?.review_warnings).toEqual([]);
    expect(artifact?.finding_evaluations[0]).toMatchObject({
      priority: "P2",
      effective_priority: "P2",
      timing: "later-hardening",
      effective_timing: "later-hardening",
      layer: "L1"
    });
    expect(artifact?.spec_lock_state).toEqual({
      state: "IMPLEMENTABLE",
      open_blocker_count: 0,
      open_required_now_count: 0
    });
  });

  it("preserves explicit reviewer timing and layer values through normalization on blocker-eligible structured findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_doc_explicit_schema_values_01",
      task: "Document scope explicit schema values",
      reviewArtifactType: "document"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 2,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-03-01T12:14:00.000Z",
        last_command_at: "2026-03-01T12:14:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Document scope explicit structured qualifiers",
      findings: [
        {
          priority: "P1",
          severity: "P1",
          timing: "required-now",
          layer: "L1",
          refs: ["docs/pairflow-initial-design.md#review-contract"],
          title: "Explicit structured finding values"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(passPayload(result).findings).toEqual([
      {
        priority: "P1",
        severity: "P1",
        timing: "required-now",
        layer: "L1",
        refs: ["docs/pairflow-initial-design.md#review-contract"],
        title: "Explicit structured finding values"
      }
    ]);

    const artifact = await readDocContractGateArtifact(
      resolveDocContractGateArtifactPath(bubble.paths.artifactsDir)
    );
    expect(artifact?.review_warnings).toEqual([]);
    expect(artifact?.finding_evaluations[0]).toMatchObject({
      priority: "P1",
      effective_priority: "P1",
      timing: "required-now",
      effective_timing: "required-now",
      layer: "L1"
    });
    expect(artifact?.spec_lock_state).toEqual({
      state: "LOCKED",
      open_blocker_count: 1,
      open_required_now_count: 1
    });
  });

  it("auto-converges deterministic repeat-clean reviewer PASS in round>=2", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_autoconverge_01",
      task: "Repeat-clean deterministic auto-converge"
    });
    await advanceToReviewerRoundTwoWithCleanHistory(bubble);
    const result = await emitPassFromWorkspace({
      summary: "Reviewer clean handoff round 2",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-03-01T10:04:00.000Z")
    });

    expect(result.transitionDecision).toBe("auto_converge");
    expect(result.resultEnvelopeKind).toBe("convergence");
    expect(result.repeatCleanTrigger).toBe(true);
    expect(result.repeatCleanReasonCode).toBe(
      repeatCleanAutoconvergeTriggeredReasonCode
    );
    expect(result.repeatCleanReasonDetail).toBe("previous_reviewer_pass_clean");
    expect(result.autoConverged).toBeDefined();
    expect(result.autoConverged?.gateRoute).toBe("meta_review_running");
    expect(result.autoConverged?.convergenceEnvelope.type).toBe("CONVERGENCE");
    expect(result.autoConverged?.approvalRequestEnvelope.type).toBe("TASK");
    expect(result.state.state).toBe("RUNNING");
    expect(result.activation).toBeUndefined();

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS",
      "PASS",
      "PASS",
      "CONVERGENCE",
      "TASK"
    ]);
  });

  it("accepts reviewer P2/P3 findings without refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_21",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Non-blocking findings only",
      findings: [
        {
          severity: "P2",
          title: "Missing edge-case test"
        },
        {
          severity: "P3",
          title: "Naming cleanup"
        }
      ],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.inferredIntent).toBe(true);
    expect(passPayload(result).pass_intent).toBe("fix_request");
    expect(passPayload(result).findings).toEqual([
      {
        priority: "P2",
        severity: "P2",
        title: "Missing edge-case test"
      },
      {
        priority: "P3",
        severity: "P3",
        title: "Naming cleanup"
      }
    ]);
  });

  it("keeps non-document reviewer findings unchanged at round>2 without doc-gate rewrites", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_scope_non_doc_01",
      task: "Compatibility scope test",
      reviewArtifactType: "code"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 3,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:16:00.000Z",
        last_command_at: "2026-02-21T12:16:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Non-doc scope findings",
      findings: [
        {
          priority: "P2",
          timing: "required-now",
          layer: "L1",
          evidence: "src/example.ts:10",
          title: "Should remain required-now in non-doc scope"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(passPayload(result).findings).toEqual([
      {
        priority: "P2",
        timing: "required-now",
        layer: "L1",
        evidence: "src/example.ts:10",
        title: "Should remain required-now in non-doc scope"
      }
    ]);

    const artifact = await readDocContractGateArtifact(
      resolveDocContractGateArtifactPath(bubble.paths.artifactsDir)
    );
    expect(artifact).toBeUndefined();
  });

  it("keeps doc-gate auto-demote active for document scope at round>2", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_scope_doc_01",
      task: "Document scope gate test",
      reviewArtifactType: "document"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 3,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:17:00.000Z",
        last_command_at: "2026-02-21T12:17:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Doc scope findings",
      findings: [
        {
          priority: "P2",
          timing: "required-now",
          layer: "L1",
          evidence: "docs/spec.md:12",
          title: "Document finding that should auto-demote"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(passPayload(result).findings).toEqual([
      {
        priority: "P2",
        timing: "later-hardening",
        layer: "L1",
        evidence: "docs/spec.md:12",
        title: "Document finding that should auto-demote"
      }
    ]);

    const artifact = await readDocContractGateArtifact(
      resolveDocContractGateArtifactPath(bubble.paths.artifactsDir)
    );
    expect(artifact?.round_gate_state.violated).toBe(true);
    const reasonCodes = artifact?.review_warnings.map((entry) => entry.reason_code) ?? [];
    expect(reasonCodes).toContain("ROUND_GATE_AUTODEMOTE");
    expect(reasonCodes).toContain("ROUND_GATE_WARNING");

    const roundWarning = artifact?.review_warnings.find(
      (entry) => entry.reason_code === "ROUND_GATE_WARNING"
    );
    expect(roundWarning).toMatchObject({
      priority: "P2",
      timing: "later-hardening"
    });
  });

  it("persists document-scope gate artifact state for reviewer --no-findings PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_scope_doc_no_findings_01",
      task: "Document scope no-findings gate state test",
      reviewArtifactType: "document"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 3,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:18:00.000Z",
        last_command_at: "2026-02-21T12:18:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const gateArtifactPath = resolveDocContractGateArtifactPath(bubble.paths.artifactsDir);
    const staleArtifact = createDocContractGateArtifact({
      now: new Date("2026-02-21T12:17:00.000Z"),
      bubbleConfig: bubble.config,
      taskContent: "Document scope seeded warning state"
    });
    staleArtifact.review_warnings = [
      {
        gate_id: "review_round.policy",
        reason_code: "ROUND_GATE_WARNING",
        message: "stale round warning to be replaced",
        priority: "P2",
        timing: "later-hardening",
        layer: "L1",
        signal_level: "warning"
      }
    ];
    staleArtifact.finding_evaluations = [
      {
        finding_key: "r2:f0",
        priority: "P1",
        effective_priority: "P2",
        timing: "required-now",
        effective_timing: "later-hardening",
        layer: "L1"
      }
    ];
    staleArtifact.round_gate_state = {
      applies: true,
      violated: true,
      round: 2,
      reason_code: "ROUND_GATE_WARNING"
    };
    staleArtifact.spec_lock_state = {
      state: "LOCKED",
      open_blocker_count: 1,
      open_required_now_count: 1
    };
    await writeDocContractGateArtifact(gateArtifactPath, staleArtifact);

    const result = await emitPassFromWorkspace({
      summary: "Document scope no findings",
      noFindings: true,
      cwd: bubble.paths.worktreePath
    });

    expect(passPayload(result).findings).toEqual([]);
    const artifact = await readDocContractGateArtifact(gateArtifactPath);
    expect(artifact).toBeDefined();
    expect(artifact?.review_warnings).toEqual([]);
    expect(artifact?.finding_evaluations).toEqual([]);
    expect(artifact?.round_gate_state).toEqual({
      applies: true,
      violated: false,
      round: 3
    });
    expect(artifact?.spec_lock_state).toEqual({
      state: "IMPLEMENTABLE",
      open_blocker_count: 0,
      open_required_now_count: 0
    });
  });

  it("persists advisory parse warning marker when existing doc gate artifact is corrupt", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_scope_doc_corrupt_artifact_01",
      task: "Document scope corrupt artifact fallback",
      reviewArtifactType: "document"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 3,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:21:00.000Z",
        last_command_at: "2026-02-21T12:21:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const gateArtifactPath = resolveDocContractGateArtifactPath(
      bubble.paths.artifactsDir
    );
    await writeFile(gateArtifactPath, "{invalid-json", "utf8");

    await emitPassFromWorkspace({
      summary: "Document scope clean pass after corrupt gate artifact",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:22:00.000Z")
    });

    const artifact = await readDocContractGateArtifact(gateArtifactPath);
    expect(
      artifact?.config_warnings.some(
        (entry) =>
          entry.reason_code === "STATUS_GATE_SERIALIZATION_WARNING"
          && entry.gate_id === "review.serialization"
      )
    ).toBe(true);
  });

  it("preserves task warnings when doc gate artifact is missing before reviewer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_scope_doc_missing_artifact_01",
      task: `---
artifact_type: task
artifact_id: task_missing_phase1_fields
status: draft
phase: phase1
prd_ref: null
plan_ref: plans/tasks/example.md
system_context_ref: docs/pairflow-initial-design.md
---

## L0 - Policy

present

## L1 - Change Contract

present`,
      reviewArtifactType: "document"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 3,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:21:30.000Z",
        last_command_at: "2026-02-21T12:21:30.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const gateArtifactPath = resolveDocContractGateArtifactPath(
      bubble.paths.artifactsDir
    );
    await rm(gateArtifactPath, { force: true });

    await emitPassFromWorkspace({
      summary: "Document scope no findings after missing gate artifact",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:22:30.000Z")
    });

    const artifact = await readDocContractGateArtifact(gateArtifactPath);
    expect(
      artifact?.task_warnings.some(
        (entry) => entry.reason_code === "DOC_CONTRACT_PARSE_WARNING"
      )
    ).toBe(true);
  });

  it("records auditable metrics marker when doc gate artifact write fails in document scope", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_scope_doc_write_fail_01",
      task: "Document scope write failure audit trail",
      reviewArtifactType: "document"
    });
    const metricsRoot = await mkdtemp(join(tmpdir(), "pairflow-pass-metrics-"));
    tempDirs.push(metricsRoot);
    const previousMetricsRoot = process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
    process.env.PAIRFLOW_METRICS_EVENTS_ROOT = metricsRoot;

    try {
      const loaded = await readStateSnapshot(bubble.paths.statePath);
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...loaded.state,
          state: "RUNNING",
          round: 3,
          active_agent: bubble.config.agents.reviewer,
          active_role: "reviewer",
          active_since: "2026-02-21T12:23:00.000Z",
          last_command_at: "2026-02-21T12:23:00.000Z"
        },
        {
          expectedFingerprint: loaded.fingerprint,
          expectedState: "RUNNING"
        }
      );

      await rm(bubble.paths.artifactsDir, { recursive: true, force: true });
      await writeFile(bubble.paths.artifactsDir, "blocked", "utf8");

      await emitPassFromWorkspace({
        summary: "Document scope pass with forced gate artifact write failure",
        noFindings: true,
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:24:00.000Z")
      });

      const shardRaw = await readFile(
        join(metricsRoot, "2026", "02", "events-2026-02.ndjson"),
        "utf8"
      );
      const events = shardRaw
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as {
          event_type: string;
          metadata: {
            doc_gate_artifact_write_failed?: boolean;
            doc_gate_artifact_write_failure_reason?: string;
          };
        });
      const passEvent = [...events]
        .reverse()
        .find((event) => event.event_type === "bubble_passed");
      expect(passEvent?.metadata.doc_gate_artifact_write_failed).toBe(true);
      expect(passEvent?.metadata.doc_gate_artifact_write_failure_reason).toMatch(/\S/u);
    } finally {
      if (previousMetricsRoot === undefined) {
        delete process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
      } else {
        process.env.PAIRFLOW_METRICS_EVENTS_ROOT = previousMetricsRoot;
      }
    }
  });

  it("refreshes and re-delivers reviewer context on every implementer PASS round in fresh mode", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_25",
      task: "Implement pass flow"
    });

    const refreshCalls: Array<{ bubbleId: string }> = [];
    const deliveryCalls: Array<{
      sender: string;
      recipient: string;
      round: number;
      initialDelayMs?: number;
    }> = [];
    const dependencies = {
      refreshReviewerContext: ({ bubbleId }: { bubbleId: string }) => {
        refreshCalls.push({ bubbleId });
        return Promise.resolve({
          refreshed: true
        });
      },
      emitDeliveryNotificationAck: (input: {
        envelope: { sender: string; recipient: string; round: number };
        initialDelayMs?: number;
      }) => {
        deliveryCalls.push({
          sender: input.envelope.sender,
          recipient: input.envelope.recipient,
          round: input.envelope.round,
          ...(input.initialDelayMs !== undefined
            ? { initialDelayMs: input.initialDelayMs }
            : {})
        });
        return Promise.resolve({
          status: "accepted" as const,
          message: "ok",
          sessionName: "pf_bubble",
          targetPaneIndex: 1
        });
      }
    };

    await emitPassFromWorkspace(
      {
        summary: "Implementer handoff round 1",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      dependencies
    );

    await emitPassFromWorkspace(
      {
        summary: "Reviewer clean round 1",
        noFindings: true,
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:06:00.000Z")
      },
      dependencies
    );

    await emitPassFromWorkspace(
      {
        summary: "Implementer handoff round 2",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:07:00.000Z")
      },
      dependencies
    );

    expect(refreshCalls).toEqual([
      { bubbleId: "b_pass_25" },
      { bubbleId: "b_pass_25" }
    ]);

    const implementerToReviewerDeliveries = deliveryCalls.filter(
      (call) => call.sender === "codex" && call.recipient === "claude"
    );
    expect(implementerToReviewerDeliveries).toEqual([
      {
        sender: "codex",
        recipient: "claude",
        round: 1,
        initialDelayMs: 1500
      },
      {
        sender: "codex",
        recipient: "claude",
        round: 2,
        initialDelayMs: 1500
      }
    ]);
  });

  it("rejects pass when bubble is not running", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_pass_04",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Task",
      cwd: repoPath
    });

    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: bubble.paths.worktreePath,
      workspaceKind: "worktree"
    });

    await expect(
      emitPassFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(PassCommandError);
  });

  it("rejects RUNNING state when round is invalid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_05",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 0
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Invalid round",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/round >= 1/u);
  });
});
