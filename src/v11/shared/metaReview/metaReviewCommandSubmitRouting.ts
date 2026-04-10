import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";
import {
  executeImplementerHandoffDelivery
} from "../delivery/implementerHandoffDelivery.js";
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
  RecoverMetaReviewGateFromSnapshotDependencies
} from "../metaReviewGate/metaReviewGateCommandApi.js";
import type {
  recoverMetaReviewGateFromSnapshot
} from "../metaReviewGate/metaReviewGateRecovery.js";

type RecoverMetaReviewGateFromSnapshotFn = typeof recoverMetaReviewGateFromSnapshot;
type ResolvedBubble = Awaited<ReturnType<ResolveBubbleByIdPort>>;

async function resolveMetaReviewGateRecoveryExecutor(
  dependencies: MetaReviewCommandDependencies
): Promise<RecoverMetaReviewGateFromSnapshotFn> {
  if (dependencies.recoverMetaReviewGateFromSnapshot !== undefined) {
    return dependencies.recoverMetaReviewGateFromSnapshot;
  }
  const module = await import("../metaReviewGate/metaReviewGateRecovery.js");
  return module.recoverMetaReviewGateFromSnapshot;
}

function buildMetaReviewGateRecoveryDependencies(
  dependencies: MetaReviewCommandDependencies
): RecoverMetaReviewGateFromSnapshotDependencies {
  const resolved: RecoverMetaReviewGateFromSnapshotDependencies = {};
  if (dependencies.resolveBubbleById !== undefined) {
    resolved.resolveBubbleById = dependencies.resolveBubbleById;
  }
  if (dependencies.readStateSnapshot !== undefined) {
    resolved.readStateSnapshot = dependencies.readStateSnapshot;
  }
  if (dependencies.writeStateSnapshot !== undefined) {
    resolved.writeStateSnapshot = dependencies.writeStateSnapshot;
  }
  if (dependencies.appendProtocolEnvelope !== undefined) {
    resolved.appendProtocolEnvelope = dependencies.appendProtocolEnvelope;
  }
  if (dependencies.readFile !== undefined) {
    resolved.readFile = dependencies.readFile;
  }
  if (dependencies.writeFile !== undefined) {
    resolved.writeFile = dependencies.writeFile;
  }
  return resolved;
}

async function emitSubmitAutoReworkDelivery(input: {
  resolved: ResolvedBubble;
  routed: Awaited<ReturnType<RecoverMetaReviewGateFromSnapshotFn>>;
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
  canonicalRunResult: MetaReviewResult;
  dependencies: MetaReviewCommandDependencies;
}): Promise<Awaited<ReturnType<RecoverMetaReviewGateFromSnapshotFn>>> {
  try {
    const recoverMetaReviewRoute =
      await resolveMetaReviewGateRecoveryExecutor(input.dependencies);
    return await recoverMetaReviewRoute(
      {
        bubbleId: input.resolved.bubbleId,
        repoPath: input.repoPath,
        cwd: input.resolved.bubblePaths.worktreePath,
        now: input.now,
        summary:
          "Meta-review submit completed; applying gate route from canonical snapshot.",
        runResult: input.canonicalRunResult
      },
      buildMetaReviewGateRecoveryDependencies(input.dependencies)
    );
  } catch (error) {
    throw toMetaReviewError(error);
  }
}

export async function finalizeMetaReviewSubmitResult(input: {
  resolved: ResolvedBubble;
  routed: Awaited<ReturnType<RecoverMetaReviewGateFromSnapshotFn>>;
  dependencies: MetaReviewCommandDependencies;
  canonicalRunResult: MetaReviewResult;
  canonicalReportJson: Record<string, unknown>;
}): Promise<MetaReviewSubmitResult> {
  await emitSubmitAutoReworkDelivery({
    resolved: input.resolved,
    routed: input.routed,
    dependencies: input.dependencies
  });

  const finalizedRunResult = input.routed.metaReviewRun ?? input.canonicalRunResult;
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
    report_json: finalizedRunResult.report_json ?? input.canonicalReportJson,
    gate_route: input.routed.route,
    gate_sequence: input.routed.gateSequence,
    gate_envelope_type: input.routed.gateEnvelope.type,
    ...(finalizedRunResult.run_id !== undefined
      ? { run_id: finalizedRunResult.run_id }
      : {})
  };
}
