import { describe, expect, it, vi } from "vitest";

import type { ProtocolEnvelope } from "../../../../../src/types/protocol.js";
import {
  presentTimeline,
  readBubbleTimeline,
  readBubbleTimelineFromTranscriptText
} from "../../../../../src/v11/infrastructure/ui/presenters/timelinePresenter.js";

function envelope(overrides: Partial<ProtocolEnvelope> = {}): ProtocolEnvelope {
  return {
    id: "env-1",
    ts: "2026-05-05T10:00:00.000Z",
    bubble_id: "b-display",
    sender: "codex",
    recipient: "codex",
    type: "PASS",
    round: 1,
    payload: {
      summary: "Ready for review."
    },
    refs: [],
    ...overrides
  };
}

describe("timelinePresenter display DTO", () => {
  it("emits summary fallback, sender role, badge, and nullable defaults for normal rows", () => {
    const entries = presentTimeline([
      envelope({
        id: "env-summary",
        sender: "mystery-agent" as never,
        payload: {
          summary: "Summary wins.",
          question: "Question loses.",
          message: "Message loses.",
          findings: [
            { title: "Blocking", severity: "P1" },
            { title: "Duplicate", severity: "P1" },
            { title: "Future", severity: "PX" as never }
          ]
        }
      }),
      envelope({
        id: "env-decision",
        type: "APPROVAL_DECISION",
        sender: "orchestrator",
        payload: {
          decision: "approve"
        }
      })
    ]);

    expect(entries[0]?.display).toMatchObject({
      title: "Summary wins.",
      summaryText: "Summary wins.",
      summarySource: "summary",
      senderLabel: "mystery-agent",
      role: "implementer",
      rowKind: "normal",
      tone: "neutral",
      progress: null,
      validationFailure: null,
      syntheticApproval: null
    });
    expect(entries[0]?.display.badges).toEqual([
      { kind: "finding", label: "P1", tone: "danger" },
      { kind: "finding", label: "PX", tone: "neutral" }
    ]);
    expect(entries[1]?.display.summarySource).toBe("decision");
    expect(entries[1]?.display.summaryText).toBe("decision=approve");
  });

  it("maps malformed explicit role metadata to unknown without affecting sender fallback cases", () => {
    const [entry] = presentTimeline([
      envelope({
        payload: {
          summary: "Bad role.",
          metadata: {
            delivery_target_role: "not-a-role"
          }
        }
      })
    ]);

    expect(entry?.display.role).toBe("unknown");
    expect(entry?.display.senderLabel).toBe("Unknown");
  });

  it("emits blocked row kind and warning tone for human-question rows", () => {
    const [entry] = presentTimeline([
      envelope({
        id: "env-human-question",
        type: "HUMAN_QUESTION",
        sender: "human",
        recipient: "codex",
        payload: {
          question: "Can you proceed?"
        }
      })
    ]);

    expect(entry?.display).toMatchObject({
      summaryText: "Can you proceed?",
      summarySource: "question",
      senderLabel: "human",
      role: "human",
      rowKind: "blocked",
      tone: "warning"
    });
  });

  it("emits badge tones and producer-owned decision recommendation dedupe", () => {
    const entries = presentTimeline([
      envelope({
        id: "finding-tones",
        payload: {
          summary: "Findings.",
          findings: [
            { title: "Critical", severity: "P0" },
            { title: "Duplicate critical", severity: "P0" },
            { title: "Blocking", severity: "P1" },
            { title: "Warning", severity: "P2" },
            { title: "Advisory", severity: "P3" }
          ]
        }
      }),
      envelope({
        id: "decision-approve",
        type: "APPROVAL_DECISION",
        payload: {
          decision: "approve"
        }
      }),
      envelope({
        id: "recommendation-variants",
        type: "APPROVAL_REQUEST",
        payload: {
          summary: "Meta review.",
          metadata: {
            latest_recommendation: "inconclusive"
          }
        }
      }),
      envelope({
        id: "decision-wins",
        type: "APPROVAL_DECISION",
        payload: {
          decision: "rework",
          metadata: {
            recommendation: "rework"
          }
        }
      })
    ]);

    expect(entries[0]?.display.badges).toEqual([
      { kind: "finding", label: "P0", tone: "danger" },
      { kind: "finding", label: "P1", tone: "danger" },
      { kind: "finding", label: "P2", tone: "warning" },
      { kind: "finding", label: "P3", tone: "neutral" }
    ]);
    expect(entries[1]?.display.badges).toEqual([
      { kind: "decision", label: "approve", tone: "success" }
    ]);
    expect(entries[2]?.display.badges).toEqual([
      { kind: "recommendation", label: "inconclusive", tone: "warning" }
    ]);
    expect(entries[3]?.display.badges).toEqual([
      { kind: "decision", label: "rework", tone: "danger" }
    ]);
  });

  it("keeps clean reviewer PASS rows within the existing badge contract", () => {
    const entries = presentTimeline([
      envelope({
        id: "clean-pass",
        type: "PASS",
        payload: {
          summary: "Reviewer clean.",
          findings: [],
          findings_claim_state: "clean",
          findings_claim_source: "payload_flags",
          metadata: { delivery_target_role: "implementer" }
        }
      }),
      envelope({
        id: "unknown-pass",
        type: "PASS",
        payload: {
          summary: "Reviewer claim unknown.",
          findings: [],
          findings_claim_state: "unknown",
          findings_claim_source: "payload_findings_count",
          metadata: { delivery_target_role: "implementer" }
        }
      }),
      envelope({
        id: "implementer-clean-claim-pass",
        type: "PASS",
        payload: {
          summary: "Implementer claim must not render as reviewer clean.",
          findings: [],
          findings_claim_state: "clean",
          findings_claim_source: "payload_flags",
          metadata: { delivery_target_role: "reviewer" }
        }
      })
    ]);

    expect(entries[0]?.display.badges).toEqual([]);
    expect(entries[1]?.display.badges).toEqual([]);
    expect(entries[2]?.display.badges).toEqual([]);
  });

  it("emits handoff and clean-run progress while nullable non-applicable families stay present", () => {
    const entries = presentTimeline([
      envelope({
        id: "handoff-1",
        type: "TASK",
        sender: "orchestrator",
        payload: {
          summary: "Meta-review gate opened.",
          metadata: {
            delivery_target_role: "meta_reviewer",
            meta_review_handoff_id: "meta_review:b-display:round:4:attempt:1"
          }
        }
      }),
      envelope({
        id: "handoff-2",
        type: "TASK",
        sender: "orchestrator",
        payload: {
          summary: "Meta-review gate opened again.",
          metadata: {
            delivery_target_role: "meta_reviewer",
            meta_review_handoff_id: "meta_review:b-display:round:4:attempt:2"
          }
        }
      }),
      envelope({
        id: "clean-2",
        type: "APPROVAL_REQUEST",
        sender: "orchestrator",
        recipient: "human",
        payload: {
          summary: "Second clean meta-review.",
          metadata: {
            actor: "meta-reviewer",
            latest_recommendation: "approve",
            consecutive_clean_runs: 2
          }
        }
      })
    ]);

    expect(entries[0]?.display.progress).toEqual({
      kind: "meta_review_handoff",
      label: "handoff 1",
      handoffAttempt: 1
    });
    expect(entries[1]?.display.progress).toEqual({
      kind: "meta_review_handoff",
      label: "handoff 2",
      handoffAttempt: 2
    });
    expect(entries[1]?.display.validationFailure).toBeNull();
    expect(entries[1]?.display.syntheticApproval).toBeNull();
    expect(entries[2]?.display.progress).toEqual({
      kind: "clean_run",
      label: "clean 2",
      cleanRunCount: 2,
      cleanRunsRequired: null
    });
    expect(entries[2]?.display.badges).toContainEqual({
      kind: "recommendation",
      label: "approve",
      tone: "success"
    });
  });

  it("emits gate-failure validation and synthetic approval descriptors with duplicate collapse", () => {
    const entries = presentTimeline([
      envelope({
        id: "gate-duplicate-old",
        type: "APPROVAL_DECISION",
        sender: "orchestrator",
        payload: {
          decision: "rework",
          message:
            "Meta-review approved the current change, but the required approve-gate validation failed.",
          metadata: {
            actor: "meta-reviewer",
            recommendation: "approve",
            validation_failure_id: "same-gate"
          }
        }
      }),
      envelope({
        id: "gate-duplicate-new",
        type: "APPROVAL_DECISION",
        sender: "orchestrator",
        payload: {
          decision: "rework",
          message:
            "Meta-review approved the current change, but the required approve-gate validation failed.",
          metadata: {
            actor: "meta-reviewer",
            actor_agent: "meta-review-codex",
            recommendation: "approve",
            validation_failure_id: "same-gate"
          }
        }
      }),
      envelope({
        id: "gate-separate",
        type: "APPROVAL_DECISION",
        sender: "orchestrator",
        payload: {
          decision: "rework",
          message:
            "Meta-review approved the current change, but the required approve-gate validation failed.",
          metadata: {
            actor: "meta-reviewer",
            recommendation: "approve",
            validation_failure_id: "other-gate"
          }
        }
      }),
      envelope({
        id: "clean-after-gate",
        type: "APPROVAL_REQUEST",
        sender: "orchestrator",
        recipient: "human",
        payload: {
          summary: "Clean after gate failure.",
          metadata: {
            actor: "meta-reviewer",
            latest_recommendation: "approve"
          }
        }
      })
    ]);

    expect(entries[0]?.display.syntheticApproval).toBeNull();
    expect(entries[1]?.display.validationFailure).toEqual({
      summaryText:
        "Meta-review approved the current change, but the required approve-gate validation failed.",
      tone: "danger"
    });
    expect(entries[1]?.display.senderLabel).toBe("meta-review-codex");
    expect(entries[1]?.display.syntheticApproval).toEqual({
      kind: "meta_review_approval",
      sourceEntryId: "gate-duplicate-new",
      syntheticEntryId: "gate-duplicate-new:meta-review-approve",
      label: "Meta-review approved the current change.",
      tone: "success"
    });
    expect(entries[1]?.display.badges).toEqual([
      { kind: "decision", label: "rework", tone: "danger" }
    ]);
    expect(entries[1]?.display.progress).toBeNull();
    expect(entries[2]?.display.syntheticApproval?.sourceEntryId).toBe("gate-separate");
    expect(entries[2]?.display.senderLabel).toBe("unknown");
    expect(entries[2]?.display.badges).toEqual([
      { kind: "decision", label: "rework", tone: "danger" }
    ]);
    expect(entries[3]?.display.progress).toEqual({
      kind: "clean_run",
      label: "clean 1",
      cleanRunCount: 1,
      cleanRunsRequired: null
    });
  });

  it("does not let duplicate clean-run source rows advance the streak", () => {
    const entries = presentTimeline([
      envelope({
        id: "clean-source-old",
        type: "APPROVAL_REQUEST",
        sender: "orchestrator",
        recipient: "human",
        payload: {
          summary: "Duplicate clean source old.",
          metadata: {
            actor: "meta-reviewer",
            latest_recommendation: "approve",
            clean_run_source_id: "same-clean"
          }
        }
      }),
      envelope({
        id: "clean-source-new",
        type: "APPROVAL_REQUEST",
        sender: "orchestrator",
        recipient: "human",
        payload: {
          summary: "Duplicate clean source new.",
          metadata: {
            actor: "meta-reviewer",
            latest_recommendation: "approve",
            clean_run_source_id: "same-clean"
          }
        }
      }),
      envelope({
        id: "clean-next",
        type: "APPROVAL_REQUEST",
        sender: "orchestrator",
        recipient: "human",
        payload: {
          summary: "Next clean source.",
          metadata: {
            actor: "meta-reviewer",
            latest_recommendation: "approve"
          }
        }
      })
    ]);

    expect(entries[0]?.display.progress).toBeNull();
    expect(entries[1]?.display.progress).toEqual({
      kind: "clean_run",
      label: "clean 1",
      cleanRunCount: 1,
      cleanRunsRequired: null
    });
    expect(entries[2]?.display.progress).toEqual({
      kind: "clean_run",
      label: "clean 2",
      cleanRunCount: 2,
      cleanRunsRequired: null
    });
  });

  it("adds display to lenient transcript fallback rows", () => {
    const [entry] = readBubbleTimelineFromTranscriptText(`${JSON.stringify({
      id: "lenient-1",
      ts: "2026-05-05T10:00:00.000Z",
      round: 1,
      type: "HUMAN_QUESTION",
      sender: "human",
      recipient: "codex",
      payload: {
        question: "Can you proceed?"
      },
      refs: []
    })}\n`);

    expect(entry?.display).toMatchObject({
      summaryText: "Can you proceed?",
      summarySource: "question",
      role: "human",
      progress: null,
      validationFailure: null,
      syntheticApproval: null
    });
  });

  it("adds display to remote transcript fallback rows", async () => {
    const entries = await readBubbleTimeline(
      {
        bubbleId: "b-remote",
        repoPath: "/repo"
      },
      {
        resolveBubbleById: vi.fn(async () => ({
          bubblePaths: {
            remotePointerPath: "/repo/.pairflow/bubbles/b-remote/remote.json",
            transcriptPath: "/repo/.pairflow/bubbles/b-remote/transcript.ndjson"
          },
          bubbleConfig: {
            executor: {
              type: "ssh",
              remote: "dev"
            }
          }
        })) as never,
        readRemotePointer: vi.fn(async () => ({
          kind: "started",
          remoteClonePath: "/remote/repo",
          host: "example.test"
        })) as never,
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          host: "example.test"
        })) as never,
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: `${JSON.stringify({
            id: "remote-1",
            ts: "2026-05-05T10:00:00.000Z",
            round: 2,
            type: "PASS",
            sender: "codex",
            recipient: "codex",
            payload: {
              message: "Remote row."
            },
            refs: []
          })}\n`,
          stderr: ""
        })) as never
      }
    );

    expect(entries[0]?.display).toMatchObject({
      summaryText: "Remote row.",
      summarySource: "message",
      progress: null,
      validationFailure: null,
      syntheticApproval: null
    });
  });

  it("injects configured clean-run requirement into live timeline display output", async () => {
    const entries = await readBubbleTimeline(
      {
        bubbleId: "b-remote",
        repoPath: "/repo"
      },
      {
        resolveBubbleById: vi.fn(async () => ({
          bubblePaths: {
            remotePointerPath: "/repo/.pairflow/bubbles/b-remote/remote.json",
            transcriptPath: "/repo/.pairflow/bubbles/b-remote/transcript.ndjson"
          },
          bubbleConfig: {
            review_policy: {
              meta_review_consecutive_clean_runs_required: 3
            },
            executor: {
              type: "ssh",
              remote: "dev"
            }
          }
        })) as never,
        readRemotePointer: vi.fn(async () => ({
          kind: "started",
          remoteClonePath: "/remote/repo",
          host: "example.test"
        })) as never,
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          host: "example.test"
        })) as never,
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: `${JSON.stringify({
            id: "remote-clean-1",
            ts: "2026-05-05T10:00:00.000Z",
            round: 2,
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "Remote clean run.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "approve"
              }
            },
            refs: []
          })}\n`,
          stderr: ""
        })) as never
      }
    );

    expect(entries[0]?.display.progress).toEqual({
      kind: "clean_run",
      label: "clean 1",
      cleanRunCount: 1,
      cleanRunsRequired: 3
    });
  });
});
