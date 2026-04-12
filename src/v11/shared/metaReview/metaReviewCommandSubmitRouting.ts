import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";
import {
  executeImplementerHandoffDelivery
} from "../delivery/implementerHandoffDelivery.js";
import { appendProtocolEnvelope } from "../transcript/transcriptDependencyDefaults.js";
import { MetaReviewError } from "./metaReviewError.js";
import {
  toMetaReviewError
} from "./metaReviewCommandErrorMapping.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewResult,
  MetaReviewSubmitResult
} from "./metaReviewCommandContract.js";
import type {
  MetaReviewGateResult
} from "../metaReviewGate/metaReviewGateCommandApi.js";
import { finalizeCurrentRunMetaReviewGate } from "../metaReviewGate/metaReviewGateCurrentRunFinalization.js";
type ResolvedBubble = Awaited<ReturnType<ResolveBubbleByIdPort>>;

async function syncFinalizedSubmitReportArtifact(input: {
  resolved: ResolvedBubble;
  dependencies: MetaReviewCommandDependencies;
  reportRound: number;
  finalizedRunResult: MetaReviewResult;
  reportJson: Record<string, unknown>;
}): Promise<void> {
  if (input.dependencies.writeFile === undefined) {
    return;
  }
  const payload = {
    bubble_id: input.resolved.bubbleId,
    ...(input.finalizedRunResult.run_id !== undefined
      ? { run_id: input.finalizedRunResult.run_id }
      : {}),
    round: input.reportRound,
    generated_at: input.finalizedRunResult.updated_at,
    status: input.finalizedRunResult.status,
    recommendation: input.finalizedRunResult.recommendation,
    summary: input.finalizedRunResult.summary,
    report_ref: input.finalizedRunResult.report_ref,
    report_json_ref: input.finalizedRunResult.report_ref,
    rework_target_message: input.finalizedRunResult.rework_target_message,
    warnings: input.finalizedRunResult.warnings,
    report_json: input.reportJson
  };
  try {
    await input.dependencies.writeFile(
      input.resolved.bubblePaths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8"
    );
  } catch {
    // Canonical artifact was already written earlier; keep routing outcome authoritative.
  }
}

async function emitSubmitAutoReworkDelivery(input: {
  resolved: ResolvedBubble;
  routed: MetaReviewGateResult;
  dependencies: MetaReviewCommandDependencies;
}): Promise<void> {
  if (input.routed.route !== "auto_rework") {
    return;
  }

  if (
    input.dependencies.emitDeliveryNotification === undefined
    || input.dependencies.buildDeliveryMessageRef === undefined
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_UNKNOWN_ERROR",
      message: "meta-review submit auto-rework delivery capabilities are unavailable.",
      context: {
        source: "meta_review_command_submit_routing",
        bubbleId: input.resolved.bubbleId,
        reason: "auto_rework_delivery_capabilities_unavailable"
      }
    });
  }

  const messageRef = input.dependencies.buildDeliveryMessageRef({
    bubbleId: input.resolved.bubbleId,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    envelope: input.routed.gateEnvelope
  });

  await executeImplementerHandoffDelivery({
    deliveryInput: {
      bubbleId: input.resolved.bubbleId,
      bubbleConfig: input.resolved.bubbleConfig,
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      envelope: input.routed.gateEnvelope,
      messageRef
    },
    emitDelivery: input.dependencies.emitDeliveryNotification
  });
}

export async function recoverMetaReviewSubmitRoute(input: {
  resolved: ResolvedBubble;
  repoPath: string;
  now: Date;
  refs: string[];
  canonicalRunResult: MetaReviewResult;
  dependencies: MetaReviewCommandDependencies;
}): Promise<MetaReviewGateResult> {
  try {
    if (input.dependencies.readStateSnapshot === undefined) {
      throw new MetaReviewError({
        reasonCode: "META_REVIEW_GATE_RUN_FAILED",
        message:
          "meta-review submit could not reload canonical state before gate finalization.",
        context: {
          source: "recoverMetaReviewSubmitRoute",
          bubbleId: input.resolved.bubbleId,
          statePath: input.resolved.bubblePaths.statePath,
          reason: "readStateSnapshot_unavailable"
        }
      });
    }
    if (input.dependencies.writeStateSnapshot === undefined) {
      throw new MetaReviewError({
        reasonCode: "META_REVIEW_GATE_RUN_FAILED",
        message: "meta-review submit could not persist gate finalization state.",
        context: {
          source: "recoverMetaReviewSubmitRoute",
          bubbleId: input.resolved.bubbleId,
          statePath: input.resolved.bubblePaths.statePath,
          reason: "writeStateSnapshot_unavailable"
        }
      });
    }
    if (input.dependencies.readFile === undefined) {
      throw new MetaReviewError({
        reasonCode: "META_REVIEW_GATE_RUN_FAILED",
        message:
          "meta-review submit artifact read capability is unavailable for gate finalization.",
        context: {
          source: "recoverMetaReviewSubmitRoute",
          bubbleId: input.resolved.bubbleId,
          statePath: input.resolved.bubblePaths.statePath,
          reason: "readFile_unavailable"
        }
      });
    }
    const loaded = await input.dependencies.readStateSnapshot(
      input.resolved.bubblePaths.statePath
    );
    return await finalizeCurrentRunMetaReviewGate({
      resolved: input.resolved,
      loaded,
      now: input.now,
      refs: input.refs,
      summary:
        "Meta-review submit completed; finalizing gate route from canonical current-run result.",
      runResult: input.canonicalRunResult,
      readFileFn: input.dependencies.readFile,
      appendEnvelope:
        input.dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope,
      writeState: input.dependencies.writeStateSnapshot
    });
  } catch (error) {
    throw toMetaReviewError(error);
  }
}

export async function finalizeMetaReviewSubmitResult(input: {
  resolved: ResolvedBubble;
  routed: MetaReviewGateResult;
  dependencies: MetaReviewCommandDependencies;
  reportRound: number;
  canonicalRunResult: MetaReviewResult;
  canonicalReportJson: Record<string, unknown>;
}): Promise<MetaReviewSubmitResult> {
  await emitSubmitAutoReworkDelivery({
    resolved: input.resolved,
    routed: input.routed,
    dependencies: input.dependencies
  });

  const finalizedRunResult = input.routed.metaReviewRun ?? input.canonicalRunResult;
  const finalizedReportJson = finalizedRunResult.report_json ?? input.canonicalReportJson;
  await syncFinalizedSubmitReportArtifact({
    resolved: input.resolved,
    dependencies: input.dependencies,
    reportRound: input.reportRound,
    finalizedRunResult,
    reportJson: finalizedReportJson
  });
  return {
    bubbleId: input.resolved.bubbleId,
    status: finalizedRunResult.status,
    recommendation: finalizedRunResult.recommendation,
    summary: finalizedRunResult.summary,
    report_ref: finalizedRunResult.report_ref,
    rework_target_message: finalizedRunResult.rework_target_message,
    updated_at: finalizedRunResult.updated_at,
    lifecycle_state: input.routed.state.state,
    warnings: finalizedRunResult.warnings,
    report_json: finalizedReportJson,
    gate_route: input.routed.route,
    gate_sequence: input.routed.gateSequence,
    gate_envelope_type: input.routed.gateEnvelope.type,
    ...(finalizedRunResult.run_id !== undefined
      ? { run_id: finalizedRunResult.run_id }
      : {})
  };
}
