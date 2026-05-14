import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { ProtocolEnvelope } from "../../../../../src/v11/shared/protocol/protocolEnvelopeContract.js";
import {
  presentTimeline,
  presentTimelineEntries,
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
  } as ProtocolEnvelope;
}

describe("timelinePresenter display DTO", () => {
  it("emits summary fallback, sender role, badge, and nullable defaults for normal rows", () => {
    const entries = presentTimelineEntries([
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
      { kind: "finding", label: "P1", tone: "danger" }
    ]);
    expect(entries[1]?.display.summarySource).toBe("decision");
    expect(entries[1]?.display.summaryText).toBe("decision=approve");
  });

  it("maps malformed explicit role metadata to unknown without affecting sender fallback cases", () => {
    const [entry] = presentTimelineEntries([
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

  it("sanitizes UI timeline payloads after deriving display from protocol metadata", () => {
    const [entry] = presentTimelineEntries([
      envelope({
        type: "APPROVAL_REQUEST",
        sender: "orchestrator",
        recipient: "human",
        payload: {
          summary: "Clean metadata source.",
          findings_claim_state: "clean",
          findings_claim_source: "payload_flags",
          findings: [
            {
              title: "Declared finding.",
              severity: "P2",
              detail: "Retained UI detail.",
              code: 123,
              unexpected: "stripped"
            } as never
          ],
          metadata: {
            actor: "meta-reviewer",
            latest_recommendation: "approve",
            actor_agent: "reviewer-1"
          }
        } as never
      })
    ]);

    expect(entry?.display.senderLabel).toBe("reviewer-1");
    expect(entry?.display.badges).toContainEqual({
      kind: "recommendation",
      label: "approve",
      tone: "success"
    });
    expect(entry?.payload).toStrictEqual({
      summary: "Clean metadata source.",
      findings: [
        {
          title: "Declared finding.",
          severity: "P2",
          detail: "Retained UI detail."
        }
      ]
    });
  });

  it("drops invalid findings claims instead of surfacing incomplete UI claim payloads", () => {
    const entries = presentTimelineEntries([
      envelope({
        id: "missing-claim-source",
        type: "PASS",
        payload: {
          summary: "Missing source.",
          findings_claim_state: "open_findings"
        } as never
      }),
      envelope({
        id: "malformed-findings",
        type: "PASS",
        payload: {
          summary: "Malformed findings.",
          findings_claim_state: "open_findings",
          findings_claim_source: "payload_findings_count",
          findings: [
            {
              title: "Missing priority."
            }
          ]
        } as never
      }),
      envelope({
        id: "non-array-findings",
        type: "PASS",
        payload: {
          summary: "Non-array findings.",
          findings_claim_state: "open_findings",
          findings_claim_source: "payload_findings_count",
          findings: "not an array"
        } as never
      }),
      envelope({
        id: "empty-open-findings",
        type: "PASS",
        payload: {
          summary: "Empty open findings.",
          findings_claim_state: "open_findings",
          findings_claim_source: "payload_findings_count",
          findings: []
        } as never
      })
    ]);

    expect(entries[0]?.payload).toStrictEqual({
      summary: "Missing source."
    });
    expect(entries[1]?.payload).toStrictEqual({
      summary: "Malformed findings."
    });
    expect(entries[1]?.display.badges).toEqual([]);
    expect(entries[2]?.payload).toStrictEqual({
      summary: "Non-array findings."
    });
    expect(entries[3]?.payload).toStrictEqual({
      summary: "Empty open findings."
    });
    expect(entries[3]?.display.badges).toEqual([]);
  });

  it("does not render unknown findings claims with empty findings as clean", () => {
    const [entry] = presentTimelineEntries([
      envelope({
        id: "unknown-empty-findings",
        type: "PASS",
        payload: {
          summary: "Unknown findings state.",
          findings_claim_state: "unknown",
          findings_claim_source: "payload_findings_count",
          findings: []
        }
      })
    ]);

    expect(entry?.payload).toStrictEqual({
      summary: "Unknown findings state.",
      findings_claim_state: "unknown",
      findings_claim_source: "payload_findings_count",
      findings: []
    });
    expect(entry?.display.badges).toEqual([]);
  });

  it("emits blocked row kind and warning tone for human-question rows", () => {
    const [entry] = presentTimelineEntries([
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
    const entries = presentTimelineEntries([
      envelope({
        id: "clean-pass",
        type: "PASS",
        payload: {
          summary: "Clean review.",
          findings: []
        }
      }),
      envelope({
        id: "finding-tones",
        payload: {
          summary: "Findings.",
          findings: [
            { title: "Critical", severity: "P0" },
            { title: "Duplicate critical", severity: "P0" },
            { title: "Blocking", priority: "P1" },
            { title: "Warning", severity: "P2" },
            { title: "Effective blocker", priority: "P3", effective_priority: "P1" }
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
      { kind: "status", label: "clean", tone: "success" }
    ]);
    expect(entries[1]?.display.badges).toEqual([
      { kind: "finding", label: "P0", tone: "danger" },
      { kind: "finding", label: "P1", tone: "danger" },
      { kind: "finding", label: "P2", tone: "warning" }
    ]);
    expect(entries[2]?.display.badges).toEqual([
      { kind: "decision", label: "approve", tone: "success" }
    ]);
    expect(entries[3]?.display.badges).toEqual([
      { kind: "recommendation", label: "inconclusive", tone: "warning" }
    ]);
    expect(entries[4]?.display.badges).toEqual([
      { kind: "decision", label: "rework", tone: "danger" }
    ]);
  });

  it("emits handoff and clean-run progress while nullable non-applicable families stay present", () => {
    const entries = presentTimelineEntries([
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

    expect(entries[0]?.display.progress).toBeNull();
    expect(entries[0]?.display.rowKind).toBe("handoff");
    expect(entries[0]?.display.tone).toBe("info");
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

  it("preserves distinct meta-review handoff attempts so clean-rerun progress remains visible", () => {
    const entries = presentTimelineEntries([
      envelope({
        id: "converged-before-rerun",
        type: "CONVERGENCE",
        sender: "codex",
        recipient: "orchestrator",
        round: 4,
        payload: {
          summary: "Reviewer converged.",
          advisory_findings_open_total: 0
        }
      }),
      envelope({
        id: "handoff-attempt-2",
        type: "TASK",
        sender: "orchestrator",
        round: 4,
        payload: {
          summary: "Meta-review gate opened again.",
          metadata: {
            delivery_target_role: "meta_reviewer",
            meta_review_handoff_id: "meta_review:b-display:round:4:attempt:2"
          }
        }
      }),
      envelope({
        id: "handoff-attempt-3",
        type: "TASK",
        sender: "orchestrator",
        round: 4,
        payload: {
          summary: "Meta-review gate opened a third time.",
          metadata: {
            delivery_target_role: "meta_reviewer",
            meta_review_handoff_id: "meta_review:b-display:round:4:attempt:3"
          }
        }
      })
    ]);

    expect(entries[1]?.display.progress).toEqual({
      kind: "meta_review_handoff",
      label: "handoff 2",
      handoffAttempt: 2
    });
    expect(entries[2]?.display.progress).toEqual({
      kind: "meta_review_handoff",
      label: "handoff 3",
      handoffAttempt: 3
    });
  });

  it("returns separate display items for clean-rerun handoff and final meta-review approval", () => {
    const items = presentTimeline([
      envelope({
        id: "converged-before-meta-review",
        type: "CONVERGENCE",
        sender: "codex",
        recipient: "orchestrator",
        round: 2,
        payload: {
          summary: "Reviewer converged.",
          advisory_findings_open_total: 0
        }
      }),
      envelope({
        id: "meta-handoff-attempt-1",
        type: "TASK",
        sender: "orchestrator",
        round: 2,
        payload: {
          summary: "Meta-review gate opened.",
          metadata: {
            delivery_target_role: "meta_reviewer",
            meta_review_handoff_id: "meta_review:b-display:round:2:attempt:1"
          }
        }
      }),
      envelope({
        id: "meta-handoff-attempt-2",
        type: "TASK",
        sender: "orchestrator",
        round: 2,
        payload: {
          summary: "Meta-review gate opened again.",
          metadata: {
            delivery_target_role: "meta_reviewer",
            meta_review_handoff_id: "meta_review:b-display:round:2:attempt:2"
          }
        }
      }),
      envelope({
        id: "meta-approval",
        type: "APPROVAL_REQUEST",
        sender: "orchestrator",
        recipient: "human",
        round: 2,
        payload: {
          summary: "Meta-review approves.",
          metadata: {
            actor: "meta-reviewer",
            actor_agent: "codex",
            latest_recommendation: "approve",
            consecutive_clean_runs: 2
          }
        }
      })
    ], {
      cleanRunsRequired: 2
    });

    expect(items.map((item) => item.id)).toEqual([
      "converged-before-meta-review",
      "meta-handoff-attempt-2",
      "meta-approval"
    ]);
    expect(items[1]).toMatchObject({
      id: "meta-handoff-attempt-2",
      role: "meta_reviewer",
      senderLabel: "codex",
      cleanRunTag: {
        label: "clean 1",
        tone: "success"
      }
    });
    expect(items[1]?.badges).toEqual([]);
    expect(items[2]).toMatchObject({
      id: "meta-approval",
      role: "meta_reviewer",
      senderLabel: "codex",
      cleanRunTag: null
    });
    expect(items[2]?.badges).toEqual([
      { kind: "recommendation", label: "approve", tone: "success" }
    ]);
  });

  it("does not classify malformed meta-review handoff ids as handoff rows", () => {
    const entries = presentTimelineEntries([
      envelope({
        id: "malformed-handoff",
        type: "TASK",
        sender: "orchestrator",
        payload: {
          summary: "Malformed handoff id should remain visible.",
          metadata: {
            delivery_target_role: "meta_reviewer",
            meta_review_handoff_id: "meta_review:b-display:round:4"
          }
        }
      })
    ]);

    expect(entries[0]?.display.progress).toBeNull();
    expect(entries[0]?.display.rowKind).toBe("normal");
    expect(entries[0]?.display.summaryText).toBe("Malformed handoff id should remain visible.");
  });

  it("emits gate-failure validation and synthetic approval descriptors with duplicate collapse", () => {
    const entries = presentTimelineEntries([
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
            approval_gate_failure: true,
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
            recommendation: "approve",
            approval_gate_failure: true,
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
            approval_gate_failure: true,
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
    expect(entries[1]?.display.syntheticApproval).toEqual({
      kind: "meta_review_approval",
      sourceEntryId: "gate-duplicate-new",
      syntheticEntryId: "gate-duplicate-new:meta-review-approve",
      label: "Meta-review approved the current change.",
      tone: "success"
    });
    expect(entries[1]?.display.senderLabel).toBe("meta-reviewer");
    expect(entries[1]?.display.badges).toEqual([
      { kind: "decision", label: "rework", tone: "danger" }
    ]);
    expect(entries[1]?.display.progress).toBeNull();
    expect(entries[2]?.display.syntheticApproval?.sourceEntryId).toBe("gate-separate");
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

  it("does not classify approve-validation text as gate failure without the explicit marker", () => {
    const entries = presentTimelineEntries([
      envelope({
        id: "legacy-gate-text",
        type: "APPROVAL_DECISION",
        sender: "orchestrator",
        payload: {
          decision: "rework",
          message:
            "Meta-review approved the current change, but the required approve-gate validation failed.",
          metadata: {
            actor: "meta-reviewer",
            recommendation: "approve"
          }
        }
      })
    ]);

    expect(entries[0]?.display.rowKind).toBe("approval");
    expect(entries[0]?.display.validationFailure).toBeNull();
    expect(entries[0]?.display.syntheticApproval).toBeNull();
  });

  it("does not let duplicate clean-run source rows advance the streak", () => {
    const entries = presentTimelineEntries([
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

  it("returns backend-owned display items for synthetic gate failures and clean-run replacement", () => {
    const items = presentTimeline([
      envelope({
        id: "clean-1",
        type: "APPROVAL_REQUEST",
        sender: "orchestrator",
        recipient: "human",
        payload: {
          summary: "First clean meta-review.",
          metadata: {
            actor: "meta-reviewer",
            latest_recommendation: "approve",
            consecutive_clean_runs: 1
          }
        }
      }),
      envelope({
        id: "gate-failed",
        type: "APPROVAL_DECISION",
        sender: "orchestrator",
        payload: {
          decision: "rework",
          message:
            "Meta-review approved the current change, but the required approve-gate validation failed.",
          metadata: {
            actor: "meta-reviewer",
            recommendation: "approve",
            approval_gate_failure: true
          }
        }
      })
    ], {
      cleanRunsRequired: 2
    });

    expect(items[0]).toMatchObject({
      id: "clean-1",
      sourceEntryId: "clean-1",
      senderLabel: "meta-reviewer",
      role: "meta_reviewer",
      summaryText: "First clean meta-review.",
      cleanRunTag: {
        label: "clean 1",
        tone: "success"
      },
      gateFailed: false
    });
    expect(items[0]?.badges).toEqual([]);
    expect(items[1]).toMatchObject({
      id: "gate-failed:meta-review-approve",
      sourceEntryId: "gate-failed",
      role: "meta_reviewer",
      senderLabel: "meta-reviewer",
      summaryText: "Meta-review approved the current change.",
      gateFailed: false
    });
    expect(items[2]).toMatchObject({
      id: "gate-failed",
      sourceEntryId: "gate-failed",
      role: "system",
      senderLabel: "orchestrator",
      summaryText:
        "Meta-review approved the current change, but the required approve-gate validation failed.",
      gateFailed: true
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
        question: "Can you proceed?",
        metadata: {
          actor_agent: "legacy-agent"
        },
        legacy_payload: true
      },
      refs: []
    })}\n`);

    expect(entry).toMatchObject({
      summaryText: "Can you proceed?",
      role: "human",
      cleanRunTag: null,
      gateFailed: false,
      blocked: true
    });
  });

  it("derives lenient fallback display from metadata before sanitizing UI payload", () => {
    const [entry] = readBubbleTimelineFromTranscriptText(`${JSON.stringify({
      id: "lenient-meta",
      ts: "2026-05-05T10:00:00.000Z",
      round: 1,
      type: "APPROVAL_REQUEST",
      sender: "orchestrator",
      recipient: "human",
      payload: {
        summary: "Clean fallback row.",
        metadata: {
          actor: "meta-reviewer",
          latest_recommendation: "approve",
          actor_agent: "reviewer-1"
        }
      },
      refs: []
    })}\n`);

    expect(entry?.senderLabel).toBe("reviewer-1");
    expect(entry?.badges).toContainEqual({
      kind: "recommendation",
      label: "approve",
      tone: "success"
    });
    expect(entry?.summaryText).toBe("Clean fallback row.");
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

    expect(entries[0]).toMatchObject({
      summaryText: "Remote row.",
      cleanRunTag: null,
      gateFailed: false
    });
  });

  it("uses normalized review-policy defaults when reading a bubble timeline", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pairflow-timeline-"));
    const transcriptPath = join(dir, "transcript.ndjson");
    try {
      await writeFile(
        transcriptPath,
        [
          envelope({
            id: "converged-before-meta-review",
            type: "CONVERGENCE",
            sender: "codex",
            recipient: "orchestrator",
            round: 2,
            payload: {
              summary: "Reviewer converged.",
              advisory_findings_open_total: 0
            }
          }),
          envelope({
            id: "meta-handoff-attempt-1",
            type: "TASK",
            sender: "orchestrator",
            round: 2,
            payload: {
              summary: "Meta-review gate opened.",
              metadata: {
                delivery_target_role: "meta_reviewer",
                meta_review_handoff_id: "meta_review:b-display:round:2:attempt:1"
              }
            }
          }),
          envelope({
            id: "meta-handoff-attempt-2",
            type: "TASK",
            sender: "orchestrator",
            round: 2,
            payload: {
              summary: "Meta-review gate opened again.",
              metadata: {
                delivery_target_role: "meta_reviewer",
                meta_review_handoff_id: "meta_review:b-display:round:2:attempt:2"
              }
            }
          }),
          envelope({
            id: "meta-approval",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            round: 2,
            payload: {
              summary: "Meta-review approves.",
              metadata: {
                actor: "meta-reviewer",
                actor_agent: "codex",
                latest_recommendation: "approve",
                consecutive_clean_runs: 2
              }
            }
          })
        ].map((entry) => JSON.stringify(entry)).join("\n") + "\n",
        "utf8"
      );

      const entries = await readBubbleTimeline(
        {
          bubbleId: "b-default-clean-runs",
          repoPath: "/repo"
        },
        {
          resolveBubbleById: vi.fn(async () => ({
            bubblePaths: {
              remotePointerPath: join(dir, "remote.json"),
              transcriptPath
            },
            bubbleConfig: {
              review_policy: {
                review_loop_mode: "full",
                reviewer_blocking_min_severity: "P3",
                meta_review_auto_rework_min_severity: "P3"
              }
            }
          })) as never,
          readRemotePointer: vi.fn(async () => null) as never
        }
      );

      expect(entries.map((entry) => entry.id)).toEqual([
        "converged-before-meta-review",
        "meta-handoff-attempt-2",
        "meta-approval"
      ]);
      expect(entries[1]?.cleanRunTag).toEqual({
        label: "clean 1",
        tone: "success"
      });
      expect(entries[2]?.badges).toEqual([
        { kind: "recommendation", label: "approve", tone: "success" }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
