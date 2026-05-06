import { describe, expect, it } from "vitest";

import {
  resolveLatestSameRoundReviewerSnapshot,
  resolveSameRoundReviewerSnapshotFromEnvelope
} from "../../../../src/v11/domain/metaReviewGate/reviewerSnapshot.js";

describe("reviewer same-round snapshot domain policy", () => {
  it("prefers metadata advisory open total over explicit empty findings list", () => {
    const snapshot = resolveSameRoundReviewerSnapshotFromEnvelope({
      id: "msg_conv_latest_01",
      ts: "2026-03-28T10:00:00.000Z",
      bubble_id: "b_meta_snapshot_01",
      sender: "claude",
      recipient: "orchestrator",
      type: "CONVERGENCE",
      round: 4,
      payload: {
        summary: "Converged.",
        findings: [],
        metadata: {
          advisory_findings_open_total: 2
        }
      },
      refs: []
    });

    expect(snapshot).toMatchObject({
      envelopeId: "msg_conv_latest_01",
      round: 4,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_open_total: 2,
      advisoryFindings: []
    });
  });

  it("returns the latest same-round reviewer snapshot and ignores older or cross-round entries", () => {
    const snapshot = resolveLatestSameRoundReviewerSnapshot(
      [
        {
          id: "msg_conv_round3_old",
          ts: "2026-03-28T09:55:00.000Z",
          bubble_id: "b_meta_snapshot_02",
          sender: "claude",
          recipient: "orchestrator",
          type: "CONVERGENCE",
          round: 3,
          payload: {
            summary: "Older round.",
            metadata: {
              advisory_findings_open_total: 3
            }
          },
          refs: []
        },
        {
          id: "msg_conv_round4_old",
          ts: "2026-03-28T09:56:00.000Z",
          bubble_id: "b_meta_snapshot_02",
          sender: "claude",
          recipient: "orchestrator",
          type: "CONVERGENCE",
          round: 4,
          payload: {
            summary: "Older same round.",
            metadata: {
              advisory_findings_open_total: 2
            }
          },
          refs: []
        },
        {
          id: "msg_conv_round4_latest",
          ts: "2026-03-28T09:57:00.000Z",
          bubble_id: "b_meta_snapshot_02",
          sender: "claude",
          recipient: "orchestrator",
          type: "CONVERGENCE",
          round: 4,
          payload: {
            summary: "Latest same round.",
            findings: []
          },
          refs: []
        }
      ],
      4
    );

    expect(snapshot).toMatchObject({
      envelopeId: "msg_conv_round4_latest",
      findings_open_total: 0
    });
  });
});
