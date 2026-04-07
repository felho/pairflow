import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import {
  executeImplementerHandoffDelivery
} from "../delivery/implementerHandoffDelivery.js";
import { MetaReviewError } from "./metaReviewError.js";
import {
  toMetaReviewError
} from "./metaReviewCommandErrorMapping.js";
import type {
  MetaReviewRecommendation
} from "../../../types/bubble.js";
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
type ResolvedBubble = Awaited<ReturnType<typeof resolveBubbleById>>;

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
    resolved.readFile =
      dependencies.readFile as NonNullable<
        RecoverMetaReviewGateFromSnapshotDependencies["readFile"]
      >;
  }
  if (dependencies.writeFile !== undefined) {
    resolved.writeFile =
      dependencies.writeFile as NonNullable<
        RecoverMetaReviewGateFromSnapshotDependencies["writeFile"]
      >;
  }
  return resolved;
}

export function assertSubmitRecommendationRouteable(
  recommendation: MetaReviewRecommendation
): void {
  if (recommendation !== "inconclusive") {
    return;
  }
  throw new MetaReviewError(
    "META_REVIEW_GATE_RUN_FAILED",
    "meta-review submit recorded a canonical snapshot but recommendation=inconclusive is not routeable in the normal submit handoff. Use recovery only as fallback."
  );
}

async function emitSubmitAutoReworkDelivery(input: {
  resolved: ResolvedBubble;
  routed: Awaited<ReturnType<RecoverMetaReviewGateFromSnapshotFn>>;
  dependencies: MetaReviewCommandDependencies;
}): Promise<void> {
  if (input.routed.route !== "auto_rework") {
    return;
  }

  const emitDelivery =
    input.dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const messageRef = resolveDeliveryMessageRef({
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
    emitDelivery
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
