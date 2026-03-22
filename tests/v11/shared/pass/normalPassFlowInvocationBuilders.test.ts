import { describe, expect, it } from "vitest";
import type {
  PersistNormalPassPostAppendDependencies
} from "../../../../src/v11/application/pass/normalPassPostAppendPersistence.js";
import type {
  ExecuteNormalPassDeliveryDependencies
} from "../../../../src/v11/application/pass/normalPassDeliveryExecution.js";
import type {
  FinalizeNormalPassDependencies
} from "../../../../src/v11/application/pass/normalPassFinalization.js";

import {
  buildNormalPassFlowDependencies,
  buildNormalPassFlowInput
} from "../../../../src/v11/shared/pass/normalPassFlowInvocationBuilders.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

describe("normalPassFlowInvocationBuilders", () => {
  it("buildNormalPassFlowInput maps shared flow input and repeat-clean metadata", () => {
    const created = buildNormalPassFlowInput({
      summary: "normal",
      refs: ["ref-a"],
      now: new Date("2026-03-19T12:00:00.000Z"),
      nowIso: "2026-03-19T12:00:00.000Z",
      findings: [],
      hasFindings: false,
      noFindings: true,
      resolved: {
        bubbleId: "b_1",
        repoPath: "/tmp/repo",
        bubbleConfig: {} as never,
        bubblePaths: {
          transcriptPath: "/tmp/transcript.ndjson",
          reviewVerificationArtifactPath: "/tmp/review-verification.json",
          statePath: "/tmp/state.json",
          artifactsDir: "/tmp/artifacts",
          taskArtifactPath: "/tmp/task.md",
          worktreePath: "/tmp/worktree",
          sessionsPath: "/tmp/sessions",
          reviewerBriefArtifactPath: "/tmp/reviewer-brief.md",
          reviewerFocusArtifactPath: "/tmp/reviewer-focus.md",
          locksDir: "/tmp/locks"
        } as never
      },
      bubbleIdentity: {
        bubbleInstanceId: "bi_1"
      },
      handoff: {} as never,
      reviewer: "claude",
      implementer: "codex",
      state: {} as never,
      loadedState: {
        fingerprint: "fp_1"
      },
      passRouting: {
        intent: "fix_request",
        inferredIntent: false,
        reviewerVerification: undefined,
        transcript: [],
        repeatCleanTrigger: {
          trigger: false,
          reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
          reasonDetail: "base_precondition_not_met",
          mostRecentPreviousReviewerCleanPassEnvelope: false
        }
      },
      createError: (input) => new Error(toErrorMessage(input))
    });

    expect(created.intent).toBe("fix_request");
    expect(created.expectedStateFingerprint).toBe("fp_1");
    expect(created.repeatClean.reasonCode).toBe("REPEAT_CLEAN_TRIGGER_NOT_MET");
    expect(created.paths.transcriptPath).toBe("/tmp/transcript.ndjson");
  });

  it("buildNormalPassFlowDependencies composes wrappers for persist/delivery/finalize dependencies", async () => {
    let persistDependencies:
      PersistNormalPassPostAppendDependencies
      | undefined;
    let deliveryDependencies:
      ExecuteNormalPassDeliveryDependencies
      | undefined;
    let finalizeDependencies:
      FinalizeNormalPassDependencies<{ ok: true }>
      | undefined;

    const built = buildNormalPassFlowDependencies<{ ok: true }>({
      prepareNormalPassAppend: () => ({}) as never,
      executeNormalPassAppend: async () => ({}) as never,
      persistNormalPassPostAppend: async (_input, dependencies) => {
        persistDependencies = dependencies;
        return {
          written: {} as never
        };
      },
      writePostAppendReviewVerificationArtifact: async () => undefined,
      writePostAppendPassState: async () => ({}) as never,
      updateReviewerDocGateArtifact: async () => undefined,
      executeNormalPassDelivery: async (_input, dependencies) => {
        deliveryDependencies = dependencies;
        return {
          deliveryResult: undefined,
          deliveryRetried: false
        };
      },
      resolveReviewerTestDirectiveForPass: async () => undefined,
      executePassDelivery: async () => ({ result: undefined, retried: false }),
      emitTmuxDeliveryNotification: async () => ({ delivered: true }) as never,
      refreshReviewerContext: async () => ({ refreshed: false }) as never,
      finalizeNormalPass: async (_input, dependencies) => {
        finalizeDependencies = dependencies;
        return { ok: true };
      },
      emitBubbleLifecycleEventBestEffort: async () => undefined,
      buildPassLifecycleMetricMetadata: () => ({}),
      resolveMostRecentPreviousReviewerPassIsCleanFromMetadata: () => undefined,
      mapPassResultDelivery: () => undefined,
      buildNormalPassResult: () => ({ ok: true })
    });

    await built.persistNormalPassPostAppend({} as never);
    await built.executeNormalPassDelivery({} as never);
    await built.finalizeNormalPass({} as never);

    expect(persistDependencies).toBeDefined();
    expect(typeof persistDependencies?.writePostAppendReviewVerificationArtifact).toBe("function");
    expect(typeof persistDependencies?.writePostAppendPassState).toBe("function");
    expect(typeof persistDependencies?.updateReviewerDocGateArtifact).toBe("function");
    expect(deliveryDependencies).toBeDefined();
    expect(typeof deliveryDependencies?.resolveReviewerTestDirectiveForPass).toBe("function");
    expect(typeof deliveryDependencies?.executePassDelivery).toBe("function");
    expect(typeof deliveryDependencies?.emitTmuxDeliveryNotification).toBe("function");
    expect(typeof deliveryDependencies?.refreshReviewerContext).toBe("function");
    expect(finalizeDependencies).toBeDefined();
    expect(typeof finalizeDependencies?.emitBubbleLifecycleEventBestEffort).toBe("function");
    expect(typeof finalizeDependencies?.buildPassLifecycleMetricMetadata).toBe("function");
    expect(
      typeof finalizeDependencies?.resolveMostRecentPreviousReviewerPassIsCleanFromMetadata
    ).toBe("function");
    expect(typeof finalizeDependencies?.mapPassResultDelivery).toBe("function");
    expect(typeof finalizeDependencies?.buildNormalPassResult).toBe("function");
  });
});
