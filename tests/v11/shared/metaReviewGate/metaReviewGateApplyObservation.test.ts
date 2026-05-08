import { describe, expect, it } from "vitest";

import { reconcileObservedGateResult } from "../../../../src/v11/application/metaReviewGate/internal/metaReviewGateApplyObservation.js";
import type { ApplyMetaReviewGateExecutionContext } from "../../../../src/v11/application/metaReviewGate/internal/metaReviewGateApplyContext.js";
import { getBubblePaths } from "../../../../src/v11/shared/bubble/bubblePaths.js";
import type { MetaReviewRuntimeDeliveryObservation } from "../../../../src/v11/shared/metaReviewGate/index.js";
import type { LoadedStateSnapshot } from "../../../../src/v11/ports/stateSnapshots.js";
import type { ProtocolEnvelope } from "../../../../src/types/protocol.js";

function createObservedReadyState(round: number): LoadedStateSnapshot {
  return {
    fingerprint: `fp-${round}`,
    state: {
      bubble_id: "b_meta_gate_apply_observation_01",
      state: "READY_FOR_HUMAN_APPROVAL",
      round,
      active_agent: null,
      active_role: null,
      active_since: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-22T10:00:00.000Z",
      meta_review: {
        execution_context: null,
        runtime_delivery: null,
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: true,
        consecutive_clean_runs: 0,
      }
    }
  };
}

function createApprovalRequestEnvelope(input: {
  route: "human_gate_threshold_not_met" | "human_gate_threshold_unresolved";
  round: number;
}): ProtocolEnvelope {
  const thresholdMetadata =
    input.route === "human_gate_threshold_not_met"
      ? {
          meta_review_gate_reason_code: "REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET",
          meta_review_gate_threshold_status: "not_met",
          meta_review_gate_threshold_min_severity: "P2",
          meta_review_gate_threshold_highest_open_severity: "P3"
        }
      : {
          meta_review_gate_reason_code: "REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE",
          meta_review_gate_threshold_status: "incomplete"
        };
  return {
    id: `env-${input.route}`,
    ts: "2026-04-22T10:05:00.000Z",
    bubble_id: "b_meta_gate_apply_observation_01",
    sender: "orchestrator",
    recipient: "human",
    type: "APPROVAL_REQUEST",
    round: input.round,
    payload: {
      summary: `Summary for ${input.route}`,
      metadata: {
        latest_recommendation: "rework",
        meta_review_gate_route: input.route,
        ...thresholdMetadata
      }
    },
    refs: []
  };
}

function createApplyObservationContext(
  transcript: ProtocolEnvelope[]
): ApplyMetaReviewGateExecutionContext {
  const bubbleId = "b_meta_gate_apply_observation_01";
  const repoPath = "/tmp/pairflow-meta-gate-apply-observation";
  const deliveryObservation: MetaReviewRuntimeDeliveryObservation = {
    status: "confirmed",
    reasonCode: null,
    message: "test fixture"
  };
  return {
    appendEnvelope: async () => {
      throw new Error("appendEnvelope should not be called in this test");
    },
    readTranscript: async () => transcript,
    readState: async () => {
      throw new Error("readState should not be called in this test");
    },
    writeState: async () => {
      throw new Error("writeState should not be called in this test");
    },
    setMetaReviewerPane: async () => ({
      updated: false,
      reason: "no_runtime_session"
    }),
    notifySubmissionRequest: async () => deliveryObservation,
    resolvePaneWarning: async () => ({
      delivery: deliveryObservation,
      shouldDeactivate: false
    }),
    runtime: undefined,
    readFileFn: async () => {
      throw new Error("readFileFn should not be called in this test");
    },
    now: new Date("2026-04-22T10:05:00.000Z"),
    nowIso: "2026-04-22T10:05:00.000Z",
    refs: [],
    resolved: {
      bubbleId,
      bubbleConfig: {
        id: bubbleId,
        repo_path: repoPath,
        base_branch: "main",
        bubble_branch: "bubble/meta-gate-apply-observation",
        work_mode: "worktree",
        quality_mode: "strict",
        review_artifact_type: "code",
        pairflow_command_profile: "external",
        reviewer_context_mode: "fresh",
        watchdog_timeout_minutes: 30,
        max_rounds: 5,
        severity_gate_round: 2,
        commit_requires_approval: true,
        agents: {
          implementer: "claude",
          reviewer: "codex",
          meta_reviewer: "codex"
        },
        commands: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        },
        notifications: {
          enabled: false
        },
        doc_contract_gates: {
          round_gate_applies_after: 2
        }
      },
      bubblePaths: getBubblePaths(repoPath, bubbleId),
      repoPath
    },
    lockPath: "/tmp/pairflow-meta-gate-apply-observation.lock",
    deactivateMetaReviewerPane: async () => undefined,
    loadedRunning: createObservedReadyState(1)
  };
}

describe("reconcileObservedGateResult", () => {
  it.each([
    "human_gate_threshold_not_met",
    "human_gate_threshold_unresolved"
  ] as const)(
    "replays %s from transcript when the observed state already reached human approval",
    async (route) => {
      const round = 3;
      const result = await reconcileObservedGateResult({
        context: createApplyObservationContext([
          createApprovalRequestEnvelope({
            route,
            round
          })
        ]),
        kickoffResult: {
          bubbleId: "b_meta_gate_apply_observation_01",
          route: "meta_review_running",
          gateSequence: 1,
          gateEnvelope: {
            id: "env-kickoff",
            ts: "2026-04-22T10:00:00.000Z",
            bubble_id: "b_meta_gate_apply_observation_01",
            sender: "orchestrator",
            recipient: "codex",
            type: "TASK",
            round,
            payload: {
              summary: "Kickoff"
            },
            refs: []
          },
          state: createObservedReadyState(round).state
        },
        observedState: createObservedReadyState(round)
      });

      expect(result.route).toBe(route);
      expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
      expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
      expect(result.gateEnvelope.payload.metadata).toMatchObject(
        route === "human_gate_threshold_not_met"
          ? {
              latest_recommendation: "rework",
              meta_review_gate_route: "human_gate_threshold_not_met",
              meta_review_gate_reason_code:
                "REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET",
              meta_review_gate_threshold_status: "not_met",
              meta_review_gate_threshold_min_severity: "P2",
              meta_review_gate_threshold_highest_open_severity: "P3"
            }
          : {
              latest_recommendation: "rework",
              meta_review_gate_route: "human_gate_threshold_unresolved",
              meta_review_gate_reason_code:
                "REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE",
              meta_review_gate_threshold_status: "incomplete"
            }
      );
    }
  );
});
