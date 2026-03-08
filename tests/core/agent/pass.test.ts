import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import {
  emitPassFromWorkspace,
  PassCommandError,
  resolveMostRecentPreviousReviewerPassIsCleanFromMetadata
} from "../../../src/core/agent/pass.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/core/workspace/worktreeManager.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../src/core/protocol/transcriptStore.js";
import {
  repeatCleanAutoconvergeTriggeredReasonCode,
  repeatCleanAutoconvergePolicyRejectedReasonCode,
  repeatCleanPreviousMissingReasonCode,
  repeatCleanPreviousNotCleanReasonCode,
  repeatCleanRound1DisabledReasonCode,
  repeatCleanTriggerNotMetReasonCode
} from "../../../src/core/convergence/repeatCleanAutoconverge.js";
import {
  createDocContractGateArtifact,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../../../src/core/gates/docContractGates.js";
import { resolveReviewerTestEvidenceArtifactPath } from "../../../src/core/reviewer/testEvidence.js";
import type { EmitTmuxDeliveryNotificationInput } from "../../../src/core/runtime/tmuxDelivery.js";
import { initGitRepository } from "../../helpers/git.js";
import {
  setupRunningBubbleFixture,
  setupRunningLegacyAutoBubbleFixture
} from "../../helpers/bubble.js";
import { writeEvidenceLog } from "../../helpers/evidence.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-pass-command-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
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

async function advanceToReviewerRoundTwoWithCleanHistory(worktreePath: string): Promise<void> {
  await emitPassFromWorkspace({
    summary: "Implementer handoff round 1",
    cwd: worktreePath,
    now: new Date("2026-03-01T10:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Reviewer clean handoff round 1",
    noFindings: true,
    cwd: worktreePath,
    now: new Date("2026-03-01T10:02:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementer handoff round 2",
    cwd: worktreePath,
    now: new Date("2026-03-01T10:03:00.000Z")
  });
}

async function advanceToReviewerRoundTwoWithCleanHistoryAccuracyCritical(input: {
  worktreePath: string;
  reviewerVerificationInputPath: string;
}): Promise<void> {
  await emitPassFromWorkspace({
    summary: "Implementer handoff round 1",
    cwd: input.worktreePath,
    now: new Date("2026-03-01T10:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Reviewer clean handoff round 1",
    noFindings: true,
    refs: [input.reviewerVerificationInputPath],
    cwd: input.worktreePath,
    now: new Date("2026-03-01T10:02:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementer handoff round 2",
    cwd: input.worktreePath,
    now: new Date("2026-03-01T10:03:00.000Z")
  });
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

describe("emitPassFromWorkspace", () => {
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
    expect(result.envelope.payload.pass_intent).toBe("review");
    expect(result.transitionDecision).toBe("normal_pass");
    expect(result.repeatCleanReasonCode).toBe(repeatCleanTriggerNotMetReasonCode);
    expect(result.repeatCleanReasonDetail).toBe("base_precondition_not_met");
    expect(result.repeatCleanTrigger).toBe(false);
    expect(result.mostRecentPreviousReviewerCleanPassEnvelope).toBe(false);

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

  it("uses explicit intent override", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_02",
      task: "Implement pass flow"
    });

    const result = await emitPassFromWorkspace({
      summary: "Please continue",
      intent: "task",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:00.000Z")
    });

    expect(result.inferredIntent).toBe(false);
    expect(result.envelope.payload.pass_intent).toBe("task");
  });

  it("emits absolute transcript fallback messageRef for PASS delivery", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_27",
      task: "Verify pass fallback messageRef"
    });

    const deliveryRefs: string[] = [];
    const result = await emitPassFromWorkspace(
      {
        summary: "Implementation complete",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          if (input.messageRef !== undefined) {
            deliveryRefs.push(input.messageRef);
          }
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(deliveryRefs).toEqual([
      `${bubble.paths.transcriptPath}#${result.envelope.id}`
    ]);
    expect(deliveryRefs[0]?.startsWith("transcript.ndjson#")).toBe(false);
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
    expect(result.envelope.payload.pass_intent).toBe("fix_request");

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
    expect(result.envelope.payload.pass_intent).toBe("fix_request");
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(4);
  });

  it("requires explicit findings declaration for reviewer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_06",
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

    await expect(
      emitPassFromWorkspace({
        summary: "Review done",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/FINDINGS_PAYLOAD_INVALID/u);
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

  it("writes empty findings array when reviewer declares no findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_07",
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
      summary: "Review clean",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.inferredIntent).toBe(true);
    expect(result.transitionDecision).toBe("normal_pass");
    expect(result.repeatCleanReasonCode).toBe(repeatCleanRound1DisabledReasonCode);
    expect(result.repeatCleanReasonDetail).toBe("round_gate_disabled");
    expect(result.repeatCleanTrigger).toBe(false);
    expect(result.envelope.payload.pass_intent).toBe("review");
    expect(result.envelope.payload.findings).toEqual([]);
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

  it("rejects reviewer non-blocking-only pass at round>=severity_gate_round with no side effects", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_post_gate_non_blocking_01",
      task: "Post-gate non-blocking pass reject"
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
            severity: "P2",
            title: "Non-blocking gap"
          },
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

  it("rejects document-scope reviewer --no-findings at gate round with no side effects", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_post_gate_doc_no_findings_01",
      task: "Doc scope post-gate no-findings reject",
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
        active_since: "2026-03-01T12:06:00.000Z",
        last_command_at: "2026-03-01T12:06:00.000Z",
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
        summary: "Document review clean at gate round",
        noFindings: true,
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/REVIEWER_PASS_NO_FINDINGS_POST_GATE/u);

    const transcriptAfter = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcriptAfter).toEqual(transcriptBefore);
    const stateAfter = await readStateSnapshot(bubble.paths.statePath);
    expect(stateAfter.state).toEqual(stateBefore.state);
    expect(stateAfter.fingerprint).toBe(stateBefore.fingerprint);
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
    expect(result.envelope.payload.pass_intent).toBe("fix_request");
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(5);
  });

  it("rejects document-scope post-gate CLI-style P1 finding as non-blocking with no side effects", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_post_gate_doc_cli_blocker_01",
      task: "Doc scope post-gate CLI blocker downgrade",
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
        active_since: "2026-03-01T12:11:00.000Z",
        last_command_at: "2026-03-01T12:11:00.000Z",
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

    let rejection: unknown;
    try {
      await emitPassFromWorkspace({
        summary: "Doc scope CLI-style blocker finding",
        findings: [
          {
            severity: "P1",
            title: "Declared blocker without strict qualifiers"
          }
        ],
        cwd: bubble.paths.worktreePath
      });
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toBeInstanceOf(PassCommandError);
    expect((rejection as Error).message).toMatch(
      /REVIEWER_PASS_NON_BLOCKING_POST_GATE/u
    );
    expect((rejection as Error).message).toMatch(/Document scope qualifier/u);

    const transcriptAfter = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcriptAfter).toEqual(transcriptBefore);
    const stateAfter = await readStateSnapshot(bubble.paths.statePath);
    expect(stateAfter.state).toEqual(stateBefore.state);
    expect(stateAfter.fingerprint).toEqual(stateBefore.fingerprint);
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
    expect(result.envelope.payload.pass_intent).toBe("fix_request");
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(5);
  });

  it("classifies round>=2 reviewer clean PASS without previous reviewer PASS as missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_missing_01",
      task: "Repeat-clean reason classification"
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
        active_since: "2026-03-01T11:00:00.000Z",
        last_command_at: "2026-03-01T11:00:00.000Z",
        round_role_history: [
          {
            round: 1,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-03-01T10:00:00.000Z"
          },
          {
            round: 2,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-03-01T10:30:00.000Z"
          }
        ]
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Reviewer clean without previous reviewer pass",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-03-01T11:01:00.000Z")
    });

    expect(result.transitionDecision).toBe("normal_pass");
    expect(result.repeatCleanTrigger).toBe(false);
    expect(result.repeatCleanReasonCode).toBe(repeatCleanPreviousMissingReasonCode);
    expect(result.repeatCleanReasonDetail).toBe("previous_reviewer_pass_absent");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.active_role).toBe("implementer");
    expect(result.envelope.payload.metadata).toEqual({
      transition_decision: "normal_pass",
      reason_code: repeatCleanPreviousMissingReasonCode,
      reason_detail: "previous_reviewer_pass_absent",
      trigger: false,
      most_recent_previous_reviewer_pass_is_clean: false,
      most_recent_previous_reviewer_clean_pass_envelope: false
    });
  });

  it("classifies round>=2 reviewer clean PASS with previous non-clean reviewer PASS using distinct reason code", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_not_clean_01",
      task: "Repeat-clean not-clean classification"
    });

    await emitPassFromWorkspace({
      summary: "Implementer handoff round 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-03-01T10:01:00.000Z")
    });
    await emitPassFromWorkspace({
      summary: "Reviewer found issues",
      findings: [
        {
          severity: "P2",
          title: "Needs changes"
        }
      ],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-03-01T10:02:00.000Z")
    });
    await emitPassFromWorkspace({
      summary: "Implementer handoff round 2",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-03-01T10:03:00.000Z")
    });

    const result = await emitPassFromWorkspace({
      summary: "Reviewer clean after prior non-clean pass",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-03-01T10:04:00.000Z")
    });

    expect(result.transitionDecision).toBe("normal_pass");
    expect(result.repeatCleanTrigger).toBe(false);
    expect(result.repeatCleanReasonCode).toBe(repeatCleanPreviousNotCleanReasonCode);
    expect(result.repeatCleanReasonDetail).toBe("previous_reviewer_pass_not_clean");
    expect(result.envelope.payload.metadata).toEqual({
      transition_decision: "normal_pass",
      reason_code: repeatCleanPreviousNotCleanReasonCode,
      reason_detail: "previous_reviewer_pass_not_clean",
      trigger: false,
      most_recent_previous_reviewer_pass_is_clean: false,
      most_recent_previous_reviewer_clean_pass_envelope: false
    });
  });

  it("auto-converges deterministic repeat-clean reviewer PASS in round>=2", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_autoconverge_01",
      task: "Repeat-clean deterministic auto-converge"
    });
    await advanceToReviewerRoundTwoWithCleanHistory(bubble.paths.worktreePath);

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
    expect(result.autoConverged?.gateRoute).toBe("human_gate_inconclusive");
    expect(result.autoConverged?.convergenceEnvelope.type).toBe("CONVERGENCE");
    expect(result.autoConverged?.approvalRequestEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS",
      "PASS",
      "PASS",
      "CONVERGENCE",
      "APPROVAL_REQUEST"
    ]);
  });

  it("emits bubble_passed lifecycle metric for auto-converge PASS with explicit transition metadata", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_autoconverge_metrics_01",
      task: "Repeat-clean auto-converge pass lifecycle metrics"
    });
    await advanceToReviewerRoundTwoWithCleanHistory(bubble.paths.worktreePath);

    const metricsRoot = await mkdtemp(join(tmpdir(), "pairflow-pass-metrics-"));
    tempDirs.push(metricsRoot);
    const previousMetricsRoot = process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
    process.env.PAIRFLOW_METRICS_EVENTS_ROOT = metricsRoot;

    try {
      await emitPassFromWorkspace({
        summary: "Reviewer clean handoff round 2",
        noFindings: true,
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-03-01T10:04:00.000Z")
      });

      const shardRaw = await readFile(
        join(metricsRoot, "2026", "03", "events-2026-03.ndjson"),
        "utf8"
      );
      const events = shardRaw
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as {
          event_type: string;
          metadata: {
            transition_decision?: string;
            repeat_clean_trigger?: boolean;
            repeat_clean_reason_code?: string;
            most_recent_previous_reviewer_pass_is_clean?: boolean;
            most_recent_previous_reviewer_clean_pass_envelope?: boolean;
          };
        });
      const passEvent = [...events]
        .reverse()
        .find((event) => event.event_type === "bubble_passed");
      expect(passEvent).toBeDefined();
      expect(passEvent?.metadata.transition_decision).toBe("auto_converge");
      expect(passEvent?.metadata.repeat_clean_trigger).toBe(true);
      expect(passEvent?.metadata.repeat_clean_reason_code).toBe(
        repeatCleanAutoconvergeTriggeredReasonCode
      );
      expect(passEvent?.metadata.most_recent_previous_reviewer_pass_is_clean).toBe(
        true
      );
      expect(
        passEvent?.metadata.most_recent_previous_reviewer_clean_pass_envelope
      ).toBe(true);

      const convergedEvent = [...events]
        .reverse()
        .find((event) => event.event_type === "bubble_converged");
      expect(convergedEvent).toBeDefined();
    } finally {
      if (previousMetricsRoot === undefined) {
        delete process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
      } else {
        process.env.PAIRFLOW_METRICS_EVENTS_ROOT = previousMetricsRoot;
      }
    }
  });

  it("updates document-scope reviewer doc-gate artifact in the same round during auto-converge", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_autoconverge_doc_gate_01",
      task: "Repeat-clean deterministic auto-converge (doc scope)",
      reviewArtifactType: "document"
    });
    await advanceToReviewerRoundTwoWithCleanHistory(bubble.paths.worktreePath);

    const gateArtifactPath = resolveDocContractGateArtifactPath(bubble.paths.artifactsDir);
    const staleArtifact = createDocContractGateArtifact({
      now: new Date("2026-03-01T10:03:30.000Z"),
      bubbleConfig: bubble.config,
      taskContent: "stale"
    });
    staleArtifact.review_warnings = [
      {
        gate_id: "review_round.policy",
        reason_code: "ROUND_GATE_WARNING",
        message: "stale warning",
        priority: "P2",
        timing: "later-hardening",
        layer: "L1",
        signal_level: "warning"
      }
    ];
    staleArtifact.finding_evaluations = [
      {
        finding_key: "r1:f1",
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
      round: 1,
      reason_code: "ROUND_GATE_WARNING"
    };
    staleArtifact.spec_lock_state = {
      state: "LOCKED",
      open_blocker_count: 1,
      open_required_now_count: 1
    };
    await writeDocContractGateArtifact(gateArtifactPath, staleArtifact);

    const now = new Date("2026-03-01T10:04:00.000Z");
    const result = await emitPassFromWorkspace({
      summary: "Doc-only clean round 2",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.transitionDecision).toBe("auto_converge");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");

    const artifact = await readDocContractGateArtifact(gateArtifactPath);
    expect(artifact?.updated_at).toBe(now.toISOString());
    expect(artifact?.review_warnings).toEqual([]);
    expect(artifact?.finding_evaluations).toEqual([]);
    expect(artifact?.round_gate_state).toEqual({
      applies: false,
      violated: false,
      round: 2
    });
    expect(artifact?.spec_lock_state).toEqual({
      state: "IMPLEMENTABLE",
      open_blocker_count: 0,
      open_required_now_count: 0
    });
  });

  it("propagates auto-converge delivery status when approval notifications are unconfirmed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_delivery_01",
      task: "Repeat-clean delivery propagation"
    });
    await advanceToReviewerRoundTwoWithCleanHistory(bubble.paths.worktreePath);

    const deliveryRecipients: string[] = [];
    const result = await emitPassFromWorkspace(
      {
        summary: "Reviewer clean handoff round 2",
        noFindings: true,
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-03-01T10:04:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: async (input) => {
          deliveryRecipients.push(String(input.envelope.recipient));
          if (input.envelope.recipient === "human") {
            return {
              delivered: false,
              message: "not confirmed",
              reason: "delivery_unconfirmed"
            };
          }
          return {
            delivered: true,
            message: "ok"
          };
        }
      }
    );

    expect(result.transitionDecision).toBe("auto_converge");
    expect(result.delivery).toEqual({
      delivered: false,
      reason: "delivery_unconfirmed",
      retried: false
    });
    expect(deliveryRecipients).toEqual([
      "human",
      bubble.config.agents.implementer,
      bubble.config.agents.reviewer
    ]);
  });

  it("surfaces auto-converge doc-gate artifact write failure reason in result metadata", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_doc_gate_write_warning_01",
      task: "Repeat-clean doc gate write warning",
      reviewArtifactType: "document"
    });
    await advanceToReviewerRoundTwoWithCleanHistory(bubble.paths.worktreePath);

    const gateArtifactPath = resolveDocContractGateArtifactPath(bubble.paths.artifactsDir);
    await rm(gateArtifactPath, { recursive: true, force: true });
    await mkdir(gateArtifactPath, { recursive: true });

    const result = await emitPassFromWorkspace({
      summary: "Reviewer clean handoff round 2",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-03-01T10:04:00.000Z")
    });

    expect(result.transitionDecision).toBe("auto_converge");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.docGateArtifactWriteFailureReason).toContain("EISDIR");
  });

  it("fail-closes with explicit reason when repeat-clean trigger is true but convergence policy rejects", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_policy_reject_01",
      task: "Repeat-clean policy reject"
    });
    await advanceToReviewerRoundTwoWithCleanHistory(bubble.paths.worktreePath);

    const lockPath = join(
      bubble.paths.locksDir,
      `${bubble.bubbleId}.lock`
    );
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-03-01T10:03:30.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.reviewer,
        recipient: "human",
        type: "HUMAN_QUESTION",
        round: 2,
        payload: {
          question: "Need clarification before approval?"
        },
        refs: []
      }
    });

    await expect(
      emitPassFromWorkspace({
        summary: "Reviewer clean handoff round 2",
        noFindings: true,
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-03-01T10:04:00.000Z")
      })
    ).rejects.toThrow(
      new RegExp(
        `${repeatCleanAutoconvergePolicyRejectedReasonCode}: subtype=policy_gate_rejected;`,
        "u"
      )
    );

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS",
      "PASS",
      "PASS",
      "HUMAN_QUESTION"
    ]);

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("RUNNING");
    expect(state.state.round).toBe(2);
    expect(state.state.active_role).toBe("reviewer");
  });

  it("wraps auto-converge downstream rejection with explicit fail-closed reason code", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_policy_reject_02",
      task: "Repeat-clean downstream rejection",
      reviewArtifactType: "document"
    });
    await advanceToReviewerRoundTwoWithCleanHistory(bubble.paths.worktreePath);
    await rm(resolveReviewerTestEvidenceArtifactPath(bubble.paths.artifactsDir), {
      force: true
    });

    await expect(
      emitPassFromWorkspace({
        summary: "tests pass, typecheck clean, lint clean.",
        noFindings: true,
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-03-01T10:04:00.000Z")
      })
    ).rejects.toThrow(
      new RegExp(
        `^${repeatCleanAutoconvergePolicyRejectedReasonCode}: subtype=downstream_converged_rejected; Convergence validation failed`,
        "u"
      )
    );

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS",
      "PASS",
      "PASS"
    ]);
    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("RUNNING");
    expect(state.state.round).toBe(2);
    expect(state.state.active_role).toBe("reviewer");
  });

  it("uses explicit review_verification_write_failed subtype when auto-converge verification artifact write fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_policy_reject_03",
      task: "Repeat-clean verification write failure",
      accuracyCritical: true,
      reviewerBrief: "Accuracy-critical verification input required."
    });

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/a.ts:1"]
          }
        ]
      }),
      "utf8"
    );

    await advanceToReviewerRoundTwoWithCleanHistoryAccuracyCritical({
      worktreePath: bubble.paths.worktreePath,
      reviewerVerificationInputPath: verificationInput
    });

    await rm(bubble.paths.artifactsDir, { recursive: true, force: true });
    await writeFile(bubble.paths.artifactsDir, "blocked", "utf8");

    await expect(
      emitPassFromWorkspace({
        summary: "Reviewer clean handoff round 2",
        noFindings: true,
        refs: [verificationInput],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-03-01T10:04:00.000Z")
      })
    ).rejects.toThrow(
      new RegExp(
        `${repeatCleanAutoconvergePolicyRejectedReasonCode}: subtype=review_verification_write_failed;`,
        "u"
      )
    );

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS",
      "PASS",
      "PASS"
    ]);
    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("RUNNING");
    expect(state.state.round).toBe(2);
    expect(state.state.active_role).toBe("reviewer");
  });

  it("auto-converges in accuracy-critical mode when verification input is valid/pass", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_repeat_clean_acc_happy_01",
      task: "Repeat-clean accuracy-critical auto-converge",
      accuracyCritical: true,
      reviewerBrief: "Accuracy-critical verification input required."
    });

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/a.ts:18"]
          }
        ]
      }),
      "utf8"
    );

    await advanceToReviewerRoundTwoWithCleanHistoryAccuracyCritical({
      worktreePath: bubble.paths.worktreePath,
      reviewerVerificationInputPath: verificationInput
    });

    const result = await emitPassFromWorkspace({
      summary: "Reviewer clean handoff round 2",
      noFindings: true,
      refs: [verificationInput],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-03-01T10:04:00.000Z")
    });

    expect(result.transitionDecision).toBe("auto_converge");
    expect(result.repeatCleanTrigger).toBe(true);
    expect(result.repeatCleanReasonCode).toBe(
      repeatCleanAutoconvergeTriggeredReasonCode
    );
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS",
      "PASS",
      "PASS",
      "CONVERGENCE",
      "APPROVAL_REQUEST"
    ]);

    const verificationArtifactRaw = await readFile(
      bubble.paths.reviewVerificationArtifactPath,
      "utf8"
    );
    const verificationArtifact = JSON.parse(verificationArtifactRaw) as {
      schema: string;
      overall: string;
      input_ref: string;
      meta: {
        round: number;
      };
      validation: {
        status: string;
        errors: unknown[];
      };
    };
    expect(verificationArtifact.schema).toBe("review_verification_v1");
    expect(verificationArtifact.overall).toBe("pass");
    expect(verificationArtifact.input_ref).toBe("review-verification-input.json");
    expect(verificationArtifact.meta.round).toBe(2);
    expect(verificationArtifact.validation).toEqual({
      status: "valid",
      errors: []
    });
  });

  it("accepts reviewer P1 findings without finding-level evidence refs in advisory mode", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_19",
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
      summary: "Blocking issue found",
      findings: [
        {
          severity: "P1",
          title: "Race condition"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(result.envelope.payload.findings).toEqual([
      {
        priority: "P1",
        severity: "P1",
        title: "Race condition"
      }
    ]);
  });

  it("accepts reviewer P0 findings without finding-level evidence refs in advisory mode", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_22",
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
      summary: "Critical blocker found",
      findings: [
        {
          severity: "P0",
          title: "Data loss risk"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(result.envelope.payload.findings).toEqual([
      {
        priority: "P0",
        severity: "P0",
        title: "Data loss risk"
      }
    ]);
  });

  it("accepts reviewer P1 findings with explicit finding-level refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_20",
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
      summary: "Blocking issue found",
      findings: [
        {
          severity: "P1",
          title: "Race condition",
          refs: ["artifact://review/p1-proof.md"]
        }
      ],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.inferredIntent).toBe(true);
    expect(result.envelope.payload.pass_intent).toBe("fix_request");
    expect(result.envelope.payload.findings).toEqual([
      {
        priority: "P1",
        severity: "P1",
        title: "Race condition",
        refs: ["artifact://review/p1-proof.md"]
      }
    ]);
  });

  it("accepts blocker findings when only envelope refs are provided (advisory downgrade)", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_23",
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
      summary: "Blocking findings with envelope refs only",
      findings: [
        {
          severity: "P1",
          title: "Race condition"
        },
        {
          severity: "P0",
          title: "Data loss risk"
        }
      ],
      refs: ["artifact://review/blocker-proof.md"],
      cwd: bubble.paths.worktreePath
    });

    expect(result.envelope.payload.findings).toEqual([
      {
        priority: "P1",
        severity: "P1",
        title: "Race condition"
      },
      {
        priority: "P0",
        severity: "P0",
        title: "Data loss risk"
      }
    ]);
  });

  it("accepts mixed blocker findings when one finding is missing refs and marks downgrade", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_24",
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
      summary: "Mixed blocker evidence",
      findings: [
        {
          severity: "P1",
          title: "Race condition",
          refs: ["artifact://review/p1-proof.md"]
        },
        {
          severity: "P0",
          title: "Data loss risk"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(result.envelope.payload.findings).toEqual([
      {
        priority: "P1",
        severity: "P1",
        title: "Race condition",
        refs: ["artifact://review/p1-proof.md"]
      },
      {
        priority: "P0",
        severity: "P0",
        title: "Data loss risk"
      }
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
    expect(result.envelope.payload.pass_intent).toBe("fix_request");
    expect(result.envelope.payload.findings).toEqual([
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
    const bubble = await setupRunningLegacyAutoBubbleFixture({
      repoPath,
      bubbleId: "b_pass_scope_non_doc_01",
      task: "Compatibility scope test"
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

    expect(result.envelope.payload.findings).toEqual([
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

    expect(result.envelope.payload.findings).toEqual([
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

    expect(result.envelope.payload.findings).toEqual([]);
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

  it("persists spec-lock asymmetry when required-now findings are non-blocking", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_scope_doc_spec_lock_asymmetry_01",
      task: "Document scope spec lock asymmetry test",
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
        active_since: "2026-02-21T12:18:30.000Z",
        last_command_at: "2026-02-21T12:18:30.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await emitPassFromWorkspace({
      summary: "Document scope non-blocking required-now finding",
      findings: [
        {
          priority: "P2",
          timing: "required-now",
          layer: "L1",
          evidence: "docs/spec.md:40",
          title: "Required-now advisory follow-up"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    const artifact = await readDocContractGateArtifact(
      resolveDocContractGateArtifactPath(bubble.paths.artifactsDir)
    );
    expect(artifact?.spec_lock_state).toEqual({
      state: "IMPLEMENTABLE",
      open_blocker_count: 0,
      open_required_now_count: 1
    });
  });

  it("persists LOCKED spec-lock state in document scope when blocker criteria are satisfied", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_scope_doc_spec_lock_locked_01",
      task: "Document scope strict blocker lock test",
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
        active_since: "2026-02-21T12:18:40.000Z",
        last_command_at: "2026-02-21T12:18:40.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Document scope blocker finding should keep lock",
      findings: [
        {
          priority: "P1",
          timing: "required-now",
          layer: "L1",
          evidence: "docs/spec.md:90",
          title: "Strict blocker with evidence"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(result.envelope.payload.findings).toEqual([
      {
        priority: "P1",
        timing: "required-now",
        layer: "L1",
        evidence: "docs/spec.md:90",
        title: "Strict blocker with evidence"
      }
    ]);

    const artifact = await readDocContractGateArtifact(
      resolveDocContractGateArtifactPath(bubble.paths.artifactsDir)
    );
    expect(artifact?.spec_lock_state).toEqual({
      state: "LOCKED",
      open_blocker_count: 1,
      open_required_now_count: 1
    });
  });

  it("downgrades document-scope required-now P1 without L1 layer to auditable non-blocker state", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_scope_doc_missing_layer_blocker_01",
      task: "Document scope missing layer blocker downgrade",
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
        active_since: "2026-02-21T12:18:45.000Z",
        last_command_at: "2026-02-21T12:18:45.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Document scope missing layer blocker",
      findings: [
        {
          priority: "P1",
          timing: "required-now",
          evidence: "docs/spec.md:55",
          title: "Declared blocker without explicit L1 layer"
        }
      ],
      cwd: bubble.paths.worktreePath
    });

    expect(result.envelope.payload.findings).toEqual([
      {
        priority: "P1",
        timing: "required-now",
        evidence: "docs/spec.md:55",
        title: "Declared blocker without explicit L1 layer",
        effective_priority: "P2"
      }
    ]);

    const artifact = await readDocContractGateArtifact(
      resolveDocContractGateArtifactPath(bubble.paths.artifactsDir)
    );
    expect(artifact?.spec_lock_state).toEqual({
      state: "IMPLEMENTABLE",
      open_blocker_count: 0,
      open_required_now_count: 1
    });
    expect(artifact?.finding_evaluations[0]).toMatchObject({
      priority: "P1",
      effective_priority: "P2",
      timing: "required-now",
      effective_timing: "required-now"
    });
    expect(
      artifact?.review_warnings.some(
        (entry) =>
          entry.reason_code === "REVIEW_SCHEMA_WARNING"
          && entry.effective_priority === "P2"
      )
    ).toBe(true);
  });

  it("uses effective priority from normalized reviewer payload for bubble_passed finding-count metrics", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_scope_doc_metrics_01",
      task: "Document scope metrics consistency",
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
          active_since: "2026-02-21T12:19:00.000Z",
          last_command_at: "2026-02-21T12:19:00.000Z"
        },
        {
          expectedFingerprint: loaded.fingerprint,
          expectedState: "RUNNING"
        }
      );

      const result = await emitPassFromWorkspace({
        summary: "Document scope metrics consistency",
        findings: [
          {
            title: "Declared blocker without evidence should be counted by effective priority",
            priority: "P1",
            timing: "required-now",
            layer: "L1",
            detail: "No finding-level evidence attached."
          }
        ],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:20:00.000Z")
      });

      expect(result.envelope.payload.findings).toEqual([
        {
          title: "Declared blocker without evidence should be counted by effective priority",
          priority: "P1",
          timing: "later-hardening",
          layer: "L1",
          detail: "No finding-level evidence attached.",
          effective_priority: "P2"
        }
      ]);

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
            p0?: number;
            p1?: number;
            p2?: number;
            p3?: number;
          };
        });
      const passEvent = [...events]
        .reverse()
        .find((event) => event.event_type === "bubble_passed");
      expect(passEvent?.metadata.p0).toBe(0);
      expect(passEvent?.metadata.p1).toBe(0);
      expect(passEvent?.metadata.p2).toBe(1);
      expect(passEvent?.metadata.p3).toBe(0);
    } finally {
      if (previousMetricsRoot === undefined) {
        delete process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
      } else {
        process.env.PAIRFLOW_METRICS_EVENTS_ROOT = previousMetricsRoot;
      }
    }
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

  it("rejects reviewer fix_request intent when --no-findings is declared", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_10",
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

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        intent: "fix_request",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/--no-findings cannot use intent=fix_request/u);
  });

  it("rejects reviewer review intent when findings are declared", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_11",
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

    await expect(
      emitPassFromWorkspace({
        summary: "Review has findings",
        findings: [
          {
            severity: "P1",
            title: "Blocking issue",
            refs: ["artifact://review/p1-proof.md"]
          }
        ],
        intent: "review",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/findings cannot use intent=review/u);
  });

  it("accepts reviewer explicit review intent with --no-findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_12",
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
      summary: "Review clean explicit intent",
      noFindings: true,
      intent: "review",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.inferredIntent).toBe(false);
    expect(result.envelope.payload.pass_intent).toBe("review");
    expect(result.envelope.payload.findings).toEqual([]);
  });

  it("does not attach reviewer test directive metadata on reviewer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_18",
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

    let capturedDirective:
      | {
          skip_full_rerun: boolean;
          reason_code: string;
        }
      | undefined;
    await emitPassFromWorkspace(
      {
        summary: "Review complete",
        noFindings: true,
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:07:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          capturedDirective = input.reviewerTestDirective;
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(capturedDirective).toBeUndefined();
  });

  it("accepts reviewer explicit fix_request intent with findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_13",
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

    const findings = [
      {
        severity: "P2" as const,
        title: "Needs follow-up"
      }
    ];
    const result = await emitPassFromWorkspace({
      summary: "Review findings explicit intent",
      findings,
      intent: "fix_request",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.inferredIntent).toBe(false);
    expect(result.envelope.payload.pass_intent).toBe("fix_request");
    expect(result.envelope.payload.findings).toEqual([
      {
        priority: "P2",
        severity: "P2",
        title: "Needs follow-up"
      }
    ]);
  });

  it("rejects reviewer task intent with --no-findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_14",
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

    await expect(
      emitPassFromWorkspace({
        summary: "Reviewer should not use task intent",
        noFindings: true,
        intent: "task",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/Reviewer PASS cannot use intent=task/u);
  });

  it("rejects reviewer task intent with explicit findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_15",
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

    await expect(
      emitPassFromWorkspace({
        summary: "Reviewer should not use task intent",
        findings: [
          {
            severity: "P2",
            title: "Needs follow-up"
          }
        ],
        intent: "task",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/Reviewer PASS cannot use intent=task/u);
  });

  it("rejects findings flags on implementer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_08",
      task: "Implement pass flow"
    });

    await expect(
      emitPassFromWorkspace({
        summary: "Implementation done",
        noFindings: true,
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/Implementer PASS does not accept findings flags/u);
  });

  it("refreshes reviewer pane on implementer PASS when reviewer context mode is fresh", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_09",
      task: [
        "# Task",
        "## Reviewer Focus",
        "- Keep reviewer policy deterministic"
      ].join("\n"),
      reviewerBrief: "Respawn must rehydrate reviewer brief."
    });

    const refreshCalls: Array<{ bubbleId: string; reviewerStartupPrompt?: string }> = [];
    await emitPassFromWorkspace(
      {
        summary: "Implementation complete",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        refreshReviewerContext: ({ bubbleId, reviewerStartupPrompt }) => {
          refreshCalls.push({
            bubbleId,
            ...(reviewerStartupPrompt !== undefined
              ? { reviewerStartupPrompt }
              : {})
          });
          return Promise.resolve({
            refreshed: true
          });
        }
      }
    );

    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0]?.bubbleId).toBe("b_pass_09");
    expect(refreshCalls[0]?.reviewerStartupPrompt).toContain(
      "Reviewer brief (persisted artifact `reviewer-brief.md`):\nRespawn must rehydrate reviewer brief."
    );
    expect(refreshCalls[0]?.reviewerStartupPrompt).toContain(
      "Reviewer Focus (bridged from task artifact `reviewer-focus.json`):\n- Keep reviewer policy deterministic"
    );
  });

  it("omits reviewer focus block from refresh prompt when reviewer-focus artifact is schema-invalid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_refresh_focus_invalid_artifact_01",
      task: [
        "# Task",
        "## Reviewer Focus",
        "- Original focus should be ignored when artifact is invalid"
      ].join("\n"),
      reviewerBrief: "Brief should still appear in refresh prompt."
    });
    await writeFile(
      bubble.paths.reviewerFocusArtifactPath,
      JSON.stringify({
        status: "present",
        source: "none",
        focus_text: "invalid payload"
      }),
      "utf8"
    );

    const refreshCalls: Array<{ bubbleId: string; reviewerStartupPrompt?: string }> = [];
    await emitPassFromWorkspace(
      {
        summary: "Implementation complete",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:30.000Z")
      },
      {
        refreshReviewerContext: ({ bubbleId, reviewerStartupPrompt }) => {
          refreshCalls.push({
            bubbleId,
            ...(reviewerStartupPrompt !== undefined
              ? { reviewerStartupPrompt }
              : {})
          });
          return Promise.resolve({
            refreshed: true
          });
        }
      }
    );

    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0]?.bubbleId).toBe("b_pass_refresh_focus_invalid_artifact_01");
    expect(refreshCalls[0]?.reviewerStartupPrompt).toContain(
      "Reviewer brief (persisted artifact `reviewer-brief.md`):\nBrief should still appear in refresh prompt."
    );
    expect(refreshCalls[0]?.reviewerStartupPrompt).not.toContain(
      "Reviewer Focus (bridged from task artifact `reviewer-focus.json`):"
    );
  });

  it("forwards bridged reviewer focus payload to delivery on implementer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_focus_delivery_01",
      task: [
        "# Task",
        "## Reviewer Focus",
        "- Ensure startup and handoff semantics stay aligned"
      ].join("\n")
    });

    let deliveryReviewerFocus: EmitTmuxDeliveryNotificationInput["reviewerFocus"];
    await emitPassFromWorkspace(
      {
        summary: "Implementation complete",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input: EmitTmuxDeliveryNotificationInput) => {
          deliveryReviewerFocus = input.reviewerFocus;
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(deliveryReviewerFocus).toMatchObject({
      status: "present",
      source: "section",
      focus_text: "- Ensure startup and handoff semantics stay aligned"
    });
  });

  it("does not forward reviewer focus payload to delivery when focus is non-present", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_focus_delivery_absent_01",
      task: "# Task\n## Scope\nNo reviewer focus section."
    });

    let deliveryReviewerFocus: EmitTmuxDeliveryNotificationInput["reviewerFocus"];
    let deliveryCallCount = 0;
    let hasReviewerFocusField = false;
    await emitPassFromWorkspace(
      {
        summary: "Implementation complete",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input: EmitTmuxDeliveryNotificationInput) => {
          deliveryCallCount += 1;
          hasReviewerFocusField = Object.prototype.hasOwnProperty.call(
            input,
            "reviewerFocus"
          );
          deliveryReviewerFocus = input.reviewerFocus;
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(deliveryCallCount).toBe(1);
    expect(hasReviewerFocusField).toBe(false);
    expect(deliveryReviewerFocus).toBeUndefined();
  });

  it("does not forward reviewer focus payload on reviewer-origin PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_focus_delivery_reviewer_sender_01",
      task: "# Task\n## Reviewer Focus\n- Focus from task"
    });
    await setReviewerActive(
      bubble.paths.statePath,
      bubble.config.agents.reviewer
    );

    let hasReviewerFocusField = false;
    await emitPassFromWorkspace(
      {
        summary: "Reviewer fix request",
        findings: [
          {
            severity: "P2",
            title: "Issue"
          }
        ],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:06:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input: EmitTmuxDeliveryNotificationInput) => {
          hasReviewerFocusField = Object.prototype.hasOwnProperty.call(
            input,
            "reviewerFocus"
          );
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(hasReviewerFocusField).toBe(false);
  });

  it("keeps PASS fail-open when optional reviewer artifacts are unreadable after state update", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_unreadable_optional_artifacts_01",
      task: "# Task\n## Reviewer Focus\n- Focus block",
      reviewerBrief: "Require deterministic checks."
    });
    await chmod(bubble.paths.reviewerBriefArtifactPath, 0o000);
    await chmod(bubble.paths.reviewerFocusArtifactPath, 0o000);

    const result = await emitPassFromWorkspace({
      summary: "Implementation complete with unreadable optional artifacts",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:00.000Z")
    });

    expect(result.envelope.type).toBe("PASS");
    expect(result.state.active_role).toBe("reviewer");
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
      emitTmuxDeliveryNotification: (input: {
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
          delivered: true,
          message: "ok"
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

  it("retries reviewer delivery once with longer warm-up when first delivery is unconfirmed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_26",
      task: "Implement pass flow"
    });

    const deliveryCalls: Array<{
      round: number;
      initialDelayMs?: number;
      deliveryAttempts?: number;
    }> = [];

    let callCount = 0;
    const result = await emitPassFromWorkspace(
      {
        summary: "Implementer handoff with retry",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        refreshReviewerContext: () =>
          Promise.resolve({
            refreshed: true
          }),
        emitTmuxDeliveryNotification: (input: {
          envelope: { round: number };
          initialDelayMs?: number;
          deliveryAttempts?: number;
        }) => {
          deliveryCalls.push({
            round: input.envelope.round,
            ...(input.initialDelayMs !== undefined
              ? { initialDelayMs: input.initialDelayMs }
              : {}),
            ...(input.deliveryAttempts !== undefined
              ? { deliveryAttempts: input.deliveryAttempts }
              : {})
          });
          callCount += 1;
          if (callCount === 1) {
            return Promise.resolve({
              delivered: false,
              message: "unconfirmed",
              reason: "delivery_unconfirmed"
            });
          }
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(deliveryCalls).toEqual([
      {
        round: 1,
        initialDelayMs: 1500
      },
      {
        round: 1,
        initialDelayMs: 5000,
        deliveryAttempts: 6
      }
    ]);
    expect(result.delivery).toEqual({
      delivered: true,
      retried: true
    });
  });

  it("writes reviewer test-evidence verification artifact for implementer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_16",
      task: "Implement pass flow"
    });

    const evidenceLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "evidence.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
    );

    await emitPassFromWorkspace({
      summary: "Validation complete",
      refs: [evidenceLogPath],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:00.000Z")
    });

    const rawArtifact = await readFile(
      join(bubble.paths.artifactsDir, "reviewer-test-verification.json"),
      "utf8"
    );
    const artifact = JSON.parse(rawArtifact) as {
      status: string;
      decision: string;
      reason_code: string;
    };

    expect(artifact.status).toBe("trusted");
    expect(artifact.decision).toBe("skip_full_rerun");
    expect(artifact.reason_code).toBe("no_trigger");
  });

  it("writes trusted docs-only reviewer artifact and skip directive for document PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_16_docs",
      task: "Document-only pass flow",
      reviewArtifactType: "document"
    });

    let capturedDirective:
      | {
          skip_full_rerun: boolean;
          reason_code: string;
          reason_detail: string;
          verification_status: string;
        }
      | undefined;
    await emitPassFromWorkspace(
      {
        summary: "Docs-only scope update",
        refs: [],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          capturedDirective = input.reviewerTestDirective;
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    const rawArtifact = await readFile(
      join(bubble.paths.artifactsDir, "reviewer-test-verification.json"),
      "utf8"
    );
    const artifact = JSON.parse(rawArtifact) as {
      status: string;
      decision: string;
      reason_code: string;
      reason_detail: string;
      required_commands: string[];
      command_evidence: unknown[];
      git: {
        commit_sha: string | null;
        status_hash: string | null;
        dirty: boolean | null;
      };
    };

    expect(artifact.status).toBe("trusted");
    expect(artifact.decision).toBe("skip_full_rerun");
    expect(artifact.reason_code).toBe("no_trigger");
    expect(artifact.reason_detail).toContain("docs-only scope, runtime checks not required");
    expect(artifact.required_commands).toEqual([]);
    expect(artifact.command_evidence).toEqual([]);
    expect(artifact.git).toEqual({
      commit_sha: null,
      status_hash: null,
      dirty: null
    });
    expect(capturedDirective?.skip_full_rerun).toBe(true);
    expect(capturedDirective?.reason_code).toBe("no_trigger");
    expect(capturedDirective?.verification_status).toBe("trusted");
    expect(capturedDirective?.reason_detail).toContain(
      "docs-only scope, runtime checks not required"
    );
  });

  it("rejects docs-only implementer PASS when skip claim is combined with runtime log refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_ref_conflict_01",
      task: "Docs-only pass conflict guard",
      reviewArtifactType: "document"
    });
    const beforeTranscript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);

    await expect(
      emitPassFromWorkspace({
        summary: "Runtime checks intentionally not executed in this docs-only round.",
        refs: [
          ".pairflow/evidence/lint.log",
          ".pairflow/evidence/typecheck.log"
        ],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      })
    ).rejects.toThrow(/^DOCS_ONLY_SKIP_LOG_REF_CONFLICT:/u);

    const afterTranscript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(afterTranscript).toHaveLength(beforeTranscript.length);
    expect(afterTranscript.map((entry) => entry.type)).toEqual(["TASK"]);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.active_role).toBe("implementer");
    expect(loaded.state.active_agent).toBe(bubble.config.agents.implementer);
    expect(loaded.state.round).toBe(1);
  });

  it("surfaces stable docs-only conflict reason diagnostics with deterministic marker+regex classification", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_ref_conflict_02",
      task: "Docs-only reason code lock",
      reviewArtifactType: "document"
    });

    try {
      await emitPassFromWorkspace({
        summary: "Runtime   checks   WERE intentionally   not executed in docs-only scope.",
        refs: [
          "artifact://handoff.md",
          ".pairflow/evidence/lint.log",
          ".pairflow/evidence/test.log.bak",
          ".pairflow/evidence/with space.log"
        ],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:30.000Z")
      });
      throw new Error("expected docs-only conflict to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PassCommandError);
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("reason_code=DOCS_ONLY_SKIP_LOG_REF_CONFLICT");
      expect(message).toContain("conflicting_ref_count=1");
      expect(message).toContain("ref_class=runtime_log_ref");
      expect(message).toContain("ref_pattern=^\\.pairflow/evidence/[^\\s]+\\.log$");
    }
  });

  it("treats subdirectory .log refs as runtime logs and excludes double-extension refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_regex_boundary_02",
      task: "Docs-only regex boundary for subdirectory and double-extension refs",
      reviewArtifactType: "document"
    });

    try {
      await emitPassFromWorkspace({
        summary: "Runtime checks intentionally not executed for docs-only scope.",
        refs: [
          ".pairflow/evidence/subdir/lint.log",
          ".pairflow/evidence/lint.log.bak"
        ],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:35.000Z")
      });
      throw new Error("expected docs-only conflict to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("reason_code=DOCS_ONLY_SKIP_LOG_REF_CONFLICT");
      expect(message).toContain("conflicting_ref_count=1");
      expect(message).toContain("example_refs=.pairflow/evidence/subdir/lint.log");
      expect(message).not.toContain(".pairflow/evidence/lint.log.bak");
    }
  });

  it("allows docs-only implementer skip-claim PASS when refs are omitted (empty baseline path)", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_no_refs_omitted_01",
      task: "Docs-only skip-claim baseline with omitted refs",
      reviewArtifactType: "document"
    });

    const result = await emitPassFromWorkspace({
      summary: "Runtime checks intentionally not executed in this docs-only round.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:45.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.envelope.refs).toEqual([]);
  });

  it("caps docs-only conflict example_refs diagnostics to the first three runtime refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_example_refs_cap_01",
      task: "Docs-only conflict example_refs slice cap",
      reviewArtifactType: "document"
    });

    const refs = [
      ".pairflow/evidence/lint.log",
      ".pairflow/evidence/typecheck.log",
      ".pairflow/evidence/test.log",
      ".pairflow/evidence/extra.log"
    ];
    try {
      await emitPassFromWorkspace({
        summary: "Runtime checks intentionally not executed in this docs-only round.",
        refs,
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:55.000Z")
      });
      throw new Error("expected docs-only conflict to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("conflicting_ref_count=4");
      expect(message).toContain(
        "example_refs=.pairflow/evidence/lint.log,.pairflow/evidence/typecheck.log,.pairflow/evidence/test.log"
      );
      expect(message).not.toContain(".pairflow/evidence/extra.log");
    }
  });

  it("treats space-containing .log refs as non-runtime-log boundary under docs-only guard regex", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_space_boundary_01",
      task: "Docs-only regex boundary for space-containing log refs",
      reviewArtifactType: "document"
    });

    const result = await emitPassFromWorkspace({
      summary: "Runtime checks intentionally not executed for docs-only scope.",
      refs: [".pairflow/evidence/with space.log"],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:40.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.envelope.refs).toEqual([".pairflow/evidence/with space.log"]);
  });

  it("does not apply docs-only skip/log conflict guard to reviewer PASS (implementer-only guard bypass)", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_reviewer_bypass_01",
      task: "Reviewer-role bypass regression for docs-only skip/log guard",
      reviewArtifactType: "document"
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const result = await emitPassFromWorkspace({
      summary: "Runtime checks intentionally not executed in this docs-only review pass.",
      refs: [".pairflow/evidence/lint.log"],
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:50.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.envelope.sender).toBe(bubble.config.agents.reviewer);
    expect(result.envelope.payload.pass_intent).toBe("review");
    expect(result.envelope.refs).toEqual([".pairflow/evidence/lint.log"]);
  });

  it("allows docs-only implementer PASS when skip claim has no runtime log refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_no_logs_01",
      task: "Docs-only pass without runtime log refs",
      reviewArtifactType: "document"
    });

    const result = await emitPassFromWorkspace({
      summary: "Runtime checks were intentionally not executed due to docs-only scope.",
      refs: ["artifact://handoff.md"],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:06:00.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.envelope.payload.pass_intent).toBe("review");
    expect(result.envelope.refs).toEqual(["artifact://handoff.md"]);
  });

  it("does not block docs-only implementer PASS when skip marker is absent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_negative_01",
      task: "Docs-only pass marker negative",
      reviewArtifactType: "document"
    });

    const result = await emitPassFromWorkspace({
      summary: "Validation status captured for docs update.",
      refs: [".pairflow/evidence/lint.log"],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:06:30.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.envelope.refs).toEqual([".pairflow/evidence/lint.log"]);
  });

  it("does not apply docs-only skip/log conflict guard to non-document bubbles", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_negative_02",
      task: "Code bubble should ignore docs-only skip/log guard",
      reviewArtifactType: "code"
    });

    const result = await emitPassFromWorkspace({
      summary: "Runtime checks intentionally not executed in this round.",
      refs: [".pairflow/evidence/lint.log"],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.envelope.refs).toEqual([".pairflow/evidence/lint.log"]);
  });

  it("falls back to run_checks reviewer directive when artifact write fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningLegacyAutoBubbleFixture({
      repoPath,
      bubbleId: "b_pass_17",
      task: "Implement pass flow"
    });

    await rm(bubble.paths.artifactsDir, { recursive: true, force: true });
    await writeFile(bubble.paths.artifactsDir, "blocked", "utf8");

    const evidenceLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "evidence.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
    );

    let capturedDirective:
      | {
          skip_full_rerun: boolean;
          reason_code: string;
          reason_detail: string;
          verification_status: string;
        }
      | undefined;
    await emitPassFromWorkspace(
      {
        summary: "Validation complete",
        refs: [evidenceLogPath],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          capturedDirective = input.reviewerTestDirective;
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(capturedDirective?.skip_full_rerun).toBe(false);
    expect(capturedDirective?.reason_code).toBe("evidence_unverifiable");
    expect(capturedDirective?.reason_detail).toContain(
      "Failed to resolve reviewer test directive due to verification runtime error."
    );
    expect(capturedDirective?.verification_status).toBe("untrusted");
  });

  it("falls back to docs-only skip directive when artifact write fails in document scope", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_17_docs",
      task: "Docs-only pass flow",
      reviewArtifactType: "document"
    });

    await rm(bubble.paths.artifactsDir, { recursive: true, force: true });
    await writeFile(bubble.paths.artifactsDir, "blocked", "utf8");

    let capturedDirective:
      | {
          skip_full_rerun: boolean;
          reason_code: string;
          reason_detail: string;
          verification_status: string;
        }
      | undefined;
    await emitPassFromWorkspace(
      {
        summary: "Docs-only change complete",
        refs: [],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          capturedDirective = input.reviewerTestDirective;
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(capturedDirective?.skip_full_rerun).toBe(true);
    expect(capturedDirective?.reason_code).toBe("no_trigger");
    expect(capturedDirective?.verification_status).toBe("trusted");
    expect(capturedDirective?.reason_detail).toContain(
      "docs-only scope, runtime checks not required"
    );
  });

  it("rejects accuracy-critical reviewer PASS when verification ref is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_01",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/requires a --ref to review-verification-input.json/u);
  });

  it("rejects accuracy-critical reviewer PASS when verification basename does not match", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_02",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const wrongFile = join(bubble.paths.worktreePath, "verification.json");
    await writeFile(wrongFile, "{\"schema\":\"review_verification_v1\"}", "utf8");

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        refs: [wrongFile],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/requires a --ref to review-verification-input.json/u);
  });

  it("rejects accuracy-critical reviewer PASS on invalid verification payload JSON", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_03",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );
    await writeFile(verificationInput, "{ not-json", "utf8");

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        refs: [verificationInput],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/Invalid JSON in review-verification-input.json/u);
  });

  it("rejects accuracy-critical reviewer PASS on schema mismatch and invalid overall-intent mapping", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_04",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "wrong_schema",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/x.ts:1"]
          }
        ]
      }),
      "utf8"
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        refs: [verificationInput],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/Invalid review_verification_v1 payload/u);

    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "fail",
        claims: [
          {
            claim_id: "C1",
            status: "mismatch",
            evidence_refs: ["src/x.ts:1"]
          }
        ]
      }),
      "utf8"
    );
    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        refs: [verificationInput],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/overall=fail requires intent=fix_request and open findings/u);

    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/x.ts:1"]
          }
        ]
      }),
      "utf8"
    );
    await expect(
      emitPassFromWorkspace({
        summary: "Review found issue",
        findings: [
          {
            severity: "P2",
            title: "Needs changes"
          }
        ],
        refs: [verificationInput],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/overall=pass requires clean handoff/u);
  });

  it("writes deterministic review-verification artifact and overwrites on later successful reviewer pass", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_05",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "fail",
        claims: [
          {
            claim_id: "C1",
            status: "mismatch",
            evidence_refs: ["src/a.ts:10"]
          }
        ]
      }),
      "utf8"
    );

    await emitPassFromWorkspace({
      summary: "Need fixes",
      findings: [
        {
          severity: "P2",
          title: "Incorrect claim"
        }
      ],
      refs: [verificationInput],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:10:00.000Z")
    });

    const firstArtifactRaw = await readFile(
      bubble.paths.reviewVerificationArtifactPath,
      "utf8"
    );
    const firstArtifact = JSON.parse(firstArtifactRaw) as {
      schema: string;
      overall: string;
      input_ref: string;
      meta: {
        round: number;
      };
      validation: {
        status: string;
        errors: unknown[];
      };
    };
    expect(firstArtifact.schema).toBe("review_verification_v1");
    expect(firstArtifact.overall).toBe("fail");
    expect(firstArtifact.input_ref).toBe("review-verification-input.json");
    expect(firstArtifact.meta.round).toBe(2);
    expect(firstArtifact.validation).toEqual({
      status: "valid",
      errors: []
    });

    await emitPassFromWorkspace({
      summary: "Implemented fixes",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:11:00.000Z")
    });

    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/a.ts:18"]
          }
        ]
      }),
      "utf8"
    );
    await emitPassFromWorkspace({
      summary: "Review clean",
      noFindings: true,
      refs: [verificationInput],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:12:00.000Z")
    });

    const secondArtifactRaw = await readFile(
      bubble.paths.reviewVerificationArtifactPath,
      "utf8"
    );
    const secondArtifact = JSON.parse(secondArtifactRaw) as {
      overall: string;
      claims: Array<{ evidence_refs?: string[] }>;
      meta: {
        round: number;
      };
    };
    expect(secondArtifact.overall).toBe("pass");
    expect(secondArtifact.meta.round).toBe(3);
    expect(secondArtifact.claims[0]?.evidence_refs).toEqual(["src/a.ts:18"]);
  });

  it("keeps state unchanged when appended accuracy-critical reviewer PASS cannot write verification artifact", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_06",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/a.ts:42"]
          }
        ]
      }),
      "utf8"
    );

    await rm(bubble.paths.artifactsDir, { recursive: true, force: true });
    await writeFile(bubble.paths.artifactsDir, "blocked", "utf8");

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        refs: [verificationInput],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/review-verification artifact write failed before state transition/u);

    const stateAfter = await readStateSnapshot(bubble.paths.statePath);
    expect(stateAfter.state.active_role).toBe("reviewer");
    expect(stateAfter.state.active_agent).toBe(bubble.config.agents.reviewer);
    expect(stateAfter.state.round).toBe(1);

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript[transcript.length - 1]?.type).toBe("PASS");
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
      worktreePath: bubble.paths.worktreePath
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
