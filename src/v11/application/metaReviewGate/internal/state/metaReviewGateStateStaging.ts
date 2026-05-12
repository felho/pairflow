import { buildMetaReviewExecutionContext } from "../../../../shared/metaReview/metaReviewExecutionContext.js";
import { clearLiveMetaReviewSnapshot } from "../../../../shared/metaReview/metaReviewSnapshot.js";
import { metaReviewExecutionContextToRunningContext } from "../../../../domain/state/execution/executionContext.js";
import {
  type LoadedStateSnapshot,
  type WriteStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import { buildBubbleStateSnapshotVariant } from "../../../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../../domain/state/snapshot/projection.js";
import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { toMetaReviewGateError } from "../../../../shared/metaReviewGate/metaReviewGateErrorConversion.js";
import { MetaReviewGateError } from "../../../../shared/metaReviewGate/metaReviewGateRouteContract.js";
import { normalizeMetaReviewSnapshot } from "../../../../domain/metaReviewGate/snapshotState.js";

export function throwMetaReviewRunningStageFailure(input: {
  rootError: unknown;
  stageReasonCode: string;
}): never {
  const rootGateError = toMetaReviewGateError(input.rootError);
  throw new MetaReviewGateError(
    rootGateError.reasonCode,
    `${rootGateError.reasonCode}: ${input.stageReasonCode}: failed before persisting RUNNING meta-review authority state. Root error: ${rootGateError.message}`,
    {
      ...rootGateError.diagnostics,
      stageReasonCode: input.stageReasonCode
    }
  );
}

export async function stageMetaReviewRunningState(input: {
  bubbleId: string;
  loadedRunning: LoadedStateSnapshot;
  metaReviewerAgent: AgentName;
  nowIso: string;
  watchdogTimeoutMinutes: number;
  statePath: string;
  writeState: WriteStateSnapshotPort;
}): Promise<LoadedStateSnapshot> {
  // Project the variant input to persisted shape for the existing object
  // spread / mutation helpers (later batch); rebuild the variant for the
  // Domain write port.
  const loadedRunningPersisted = toPersistedSnapshot(input.loadedRunning.state);
  const normalizedMetaReview = normalizeMetaReviewSnapshot(
    loadedRunningPersisted.meta_review
  );
  const previousMetaReview = clearLiveMetaReviewSnapshot(
    loadedRunningPersisted.meta_review
  );
  const attempt =
    (normalizedMetaReview.execution_context?.attempt
      ?? normalizedMetaReview.auto_rework_count) + 1;
  const metaReviewExecutionContext = buildMetaReviewExecutionContext({
    bubbleId: input.bubbleId,
    round: loadedRunningPersisted.round,
    startedAt: input.nowIso,
    watchdogTimeoutMinutes: input.watchdogTimeoutMinutes,
    attempt
  });
  const nextState: PersistedBubbleStateSnapshot = {
    ...loadedRunningPersisted,
    state: "RUNNING" as const,
    active_agent: input.metaReviewerAgent,
    active_role: "meta_reviewer" as const,
    active_since: input.nowIso,
    last_command_at: input.nowIso,
    meta_review: {
      ...previousMetaReview,
      execution_context: metaReviewExecutionContext
    }
  };
  nextState.execution_context =
    metaReviewExecutionContextToRunningContext(metaReviewExecutionContext);
  return input.writeState(
    input.statePath,
    buildBubbleStateSnapshotVariant(nextState),
    {
      expectedFingerprint: input.loadedRunning.fingerprint,
      expectedState: "RUNNING"
    }
  );
}
