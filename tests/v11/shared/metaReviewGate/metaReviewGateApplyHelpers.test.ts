import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  persistHumanGateRouteMock: vi.fn()
}));

vi.mock("../../../../src/v11/shared/metaReviewGate/metaReviewGateShared.js", () => ({
  buildHumanGateSummary: () => "human gate summary",
  metaReviewGateRollbackAppliedReasonCode: "META_REVIEW_GATE_ROLLBACK_APPLIED",
  metaReviewerAgent: "meta-reviewer",
  persistHumanGateRoute: hoisted.persistHumanGateRouteMock
}));

import { routeStickyHumanGateBypass } from "../../../../src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.js";

describe("routeStickyHumanGateBypass", () => {
  beforeEach(() => {
    hoisted.persistHumanGateRouteMock.mockReset();
  });

  it("forwards advisory findings list and split parity metadata to human gate persistence", async () => {
    hoisted.persistHumanGateRouteMock.mockResolvedValue({
      bubbleId: "b_apply_helper_01",
      route: "human_gate_sticky_bypass",
      gateSequence: 33,
      gateEnvelope: {
        id: "msg_approval_001"
      },
      state: {
        state: "READY_FOR_HUMAN_APPROVAL"
      }
    });

    const now = new Date("2026-03-20T08:00:00.000Z");
    await routeStickyHumanGateBypass({
      appendEnvelope: async () => {
        throw new Error("appendEnvelope should not be called in this test");
      },
      writeState: async () => {
        throw new Error("writeState should not be called in this test");
      },
      readFileFn: (async () =>
        Buffer.from(
          JSON.stringify({
            findings_count: 2,
            findings_artifact_open_total: 2,
            findings_blocking_open_total: 0,
            findings_advisory_open_total: 2,
            findings_parity_status: "ok",
            findings: [
              {
                severity: "P2",
                title: "advisory finding a",
                refs: ["artifact://a"]
              },
              {
                severity: "P1",
                title: "blocking finding should be filtered out"
              }
            ]
          }),
          "utf8"
        )) as never,
      bubblePaths: {
        statePath: "/tmp/state.json",
        transcriptPath: "/tmp/transcript.ndjson",
        inboxPath: "/tmp/inbox.ndjson",
        metaReviewLastJsonArtifactPath: "/tmp/meta-review-last.json"
      } as never,
      lockPath: "/tmp/bubble.lock",
      now,
      nowIso: now.toISOString(),
      bubbleId: "b_apply_helper_01",
      summary: "Sticky gate bypass summary",
      refs: [],
      loadedRunning: {
        fingerprint: "fp_running",
        state: {
          state: "META_REVIEW_RUNNING",
          round: 3
        }
      } as never,
      readyForApproval: {
        fingerprint: "fp_ready",
        state: {
          state: "READY_FOR_APPROVAL",
          round: 3
        }
      } as never
    });

    expect(hoisted.persistHumanGateRouteMock).toHaveBeenCalledTimes(1);
    expect(hoisted.persistHumanGateRouteMock.mock.calls[0]?.[0]).toMatchObject({
      route: "human_gate_sticky_bypass",
      parityMetadata: {
        findings_claimed_open_total: 2,
        findings_artifact_open_total: 2,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 2,
        findings_parity_status: "ok"
      },
      findings: [
        {
          severity: "P2",
          title: "advisory finding a",
          refs: ["artifact://a"]
        }
      ]
    });
  });

  it("uses a coherent current-round findings parity snapshot without artifact counter leakage", async () => {
    hoisted.persistHumanGateRouteMock.mockResolvedValue({
      bubbleId: "b_apply_helper_02",
      route: "human_gate_sticky_bypass",
      gateSequence: 34,
      gateEnvelope: {
        id: "msg_approval_002"
      },
      state: {
        state: "READY_FOR_HUMAN_APPROVAL"
      }
    });

    const now = new Date("2026-03-22T13:00:00.000Z");
    await routeStickyHumanGateBypass({
      appendEnvelope: async () => {
        throw new Error("appendEnvelope should not be called in this test");
      },
      writeState: async () => {
        throw new Error("writeState should not be called in this test");
      },
      readFileFn: (async () =>
        Buffer.from(
          JSON.stringify({
            findings_count: 7,
            findings_claimed_open_total: 7,
            findings_artifact_open_total: 1,
            findings_blocking_open_total: 5,
            findings_advisory_open_total: 2,
            findings_parity_status: "guard_failed",
            findings: [
              {
                severity: "P2",
                title: "artifact advisory fallback"
              }
            ]
          }),
          "utf8"
        )) as never,
      bubblePaths: {
        statePath: "/tmp/state.json",
        transcriptPath: "/tmp/transcript.ndjson",
        inboxPath: "/tmp/inbox.ndjson",
        metaReviewLastJsonArtifactPath: "/tmp/meta-review-last.json"
      } as never,
      lockPath: "/tmp/bubble.lock",
      now,
      nowIso: now.toISOString(),
      bubbleId: "b_apply_helper_02",
      summary: "Sticky gate bypass summary",
      refs: [],
      findings: [
        {
          severity: "P2",
          title: "current-round advisory a",
          refs: ["artifact://current/a"]
        },
        {
          severity: "P3",
          title: "current-round advisory b"
        }
      ],
      loadedRunning: {
        fingerprint: "fp_running",
        state: {
          state: "META_REVIEW_RUNNING",
          round: 4
        }
      } as never,
      readyForApproval: {
        fingerprint: "fp_ready",
        state: {
          state: "READY_FOR_APPROVAL",
          round: 4
        }
      } as never
    });

    expect(hoisted.persistHumanGateRouteMock).toHaveBeenCalledTimes(1);
    expect(hoisted.persistHumanGateRouteMock.mock.calls[0]?.[0]).toMatchObject({
      route: "human_gate_sticky_bypass",
      parityMetadata: {
        findings_claimed_open_total: 2,
        findings_artifact_open_total: null,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 2,
        findings_parity_status: null
      },
      findings: [
        {
          severity: "P2",
          title: "current-round advisory a",
          refs: ["artifact://current/a"]
        },
        {
          severity: "P3",
          title: "current-round advisory b"
        }
      ]
    });
  });
});
