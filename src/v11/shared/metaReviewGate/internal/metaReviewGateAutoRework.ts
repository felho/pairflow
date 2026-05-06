import type { MetaReviewResult } from "../../metaReview/metaReviewTypes.js";
import type {
  AppendProtocolEnvelopePort
} from "../../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import { isNamedError } from "../../errors/namedError.js";
import type {
  AgentName,
  BubbleStateSnapshot
} from "../../../../types/bubble.js";
import type { Finding } from "../../../../types/findings.js";
import {
  type FindingsParityMetadata
} from "../../../../types/protocol.js";
import { appendAutoReworkDecision } from "./metaReviewGateAutoReworkEnvelope.js";
import {
  buildAutoReworkResumedState,
  buildRestoredReadyState
} from "./metaReviewGateAutoReworkState.js";
import { MetaReviewGateError } from "../metaReviewGateRouteContract.js";
import type { MetaReviewGateResult } from "../metaReviewGateResultContract.js";

interface AutoReworkFinalizeInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: {
      watchdog_timeout_minutes: number;
      agents: {
        implementer: AgentName;
        reviewer: AgentName;
        meta_reviewer: AgentName;
      };
    };
    bubblePaths: {
      inboxPath: string;
      locksDir: string;
      statePath: string;
      transcriptPath: string;
    };
  };
  loaded: LoadedStateSnapshot;
  now: Date;
  refs: string[];
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
}

interface PersistDispatchFailedHumanRouteInput {
  loaded: LoadedStateSnapshot;
  expectedState: BubbleStateSnapshot["state"];
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  fallbackReason: string;
  rollbackStateOnAppendFailure?: BubbleStateSnapshot;
}

interface DispatchAutoReworkInput {
  finalizeInput: AutoReworkFinalizeInput;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  findingsForPayload: Finding[] | undefined;
  reworkTargetMessage?: string;
  persistDispatchFailedHumanRoute: (
    input: PersistDispatchFailedHumanRouteInput
  ) => Promise<MetaReviewGateResult>;
}

function toGateConflictError(error: unknown): MetaReviewGateError {
  const message = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_STATE_CONFLICT",
    `META_REVIEW_GATE_STATE_CONFLICT: ${message}`,
    {
      stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    }
  );
}

function toGateTransitionError(error: unknown): MetaReviewGateError {
  const message = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${message}`,
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}

async function writeAutoReworkResumedState(input: {
  finalizeInput: AutoReworkFinalizeInput;
  resumed: BubbleStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  try {
    return await input.finalizeInput.writeState(
      input.finalizeInput.resolved.bubblePaths.statePath,
      input.resumed,
      {
        expectedFingerprint: input.finalizeInput.loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (isNamedError(error, "StateStoreConflictError")) {
      throw toGateConflictError(error);
    }
    throw toGateTransitionError(error);
  }
}

async function restoreReadyStateAfterAppendFailure(input: {
  finalizeInput: AutoReworkFinalizeInput;
  resumedWritten: LoadedStateSnapshot;
  nowIso: string;
}): Promise<LoadedStateSnapshot> {
  const restoredState = buildRestoredReadyState({
    resumedState: input.resumedWritten.state,
    loadedState: input.finalizeInput.loaded.state,
    nowIso: input.nowIso
  });

  try {
    return await input.finalizeInput.writeState(
      input.finalizeInput.resolved.bubblePaths.statePath,
      restoredState,
      {
        expectedFingerprint: input.resumedWritten.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (restoreError) {
    if (isNamedError(restoreError, "StateStoreConflictError")) {
      throw toGateConflictError(restoreError);
    }
    throw toGateTransitionError(restoreError);
  }
}

export async function dispatchAutoRework(
  input: DispatchAutoReworkInput
): Promise<MetaReviewGateResult> {
  const reworkMessage =
    input.reworkTargetMessage ?? input.runResultForRouting.rework_target_message;
  if (reworkMessage === null || reworkMessage.trim().length === 0) {
    return input.persistDispatchFailedHumanRoute({
      loaded: input.finalizeInput.loaded,
      expectedState: "RUNNING",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      fallbackReason:
        "META_REVIEW_GATE_REWORK_DISPATCH_FAILED: missing rework target message for autonomous dispatch",
      rollbackStateOnAppendFailure: input.finalizeInput.loaded.state
    });
  }

  const { resumed, nowIso } = buildAutoReworkResumedState(input.finalizeInput);
  const resumedWritten = await writeAutoReworkResumedState({
    finalizeInput: input.finalizeInput,
    resumed
  });

  try {
    const dispatched = await appendAutoReworkDecision({
      finalizeInput: input.finalizeInput,
      resumedWritten,
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      findingsForPayload: input.findingsForPayload,
      reworkMessage
    });

    return {
      bubbleId: input.finalizeInput.resolved.bubbleId,
      route: "auto_rework",
      gateSequence: dispatched.sequence,
      gateEnvelope: dispatched.envelope,
      state: resumedWritten.state,
      metaReviewRun: input.runResultForRouting
    };
  } catch (error) {
    const appendReason = error instanceof Error ? error.message : String(error);
    const readyLoaded = await restoreReadyStateAfterAppendFailure({
      finalizeInput: input.finalizeInput,
      resumedWritten,
      nowIso
    });
    return input.persistDispatchFailedHumanRoute({
      loaded: readyLoaded,
      expectedState: "READY_FOR_HUMAN_APPROVAL",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: append_error=${appendReason}`,
      rollbackStateOnAppendFailure: readyLoaded.state
    });
  }
}
