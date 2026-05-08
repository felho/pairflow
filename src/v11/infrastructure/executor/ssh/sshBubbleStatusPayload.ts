import {
  isBubbleLifecycleState,
  isMetaReviewRuntimeDeliveryStatus,
  type BubbleFailingGate,
  type BubbleLifecycleState,
  type BubbleRoundGateState,
  type BubbleSpecLockState
} from "../../../../types/bubble.js";
import {
  isFindingLayer,
  isFindingPriority,
  isFindingTiming
} from "../../../../types/findings.js";
import type { StateValidationDiagnostics } from "../../../ports/stateSnapshots.js";
import {
  normalizeMetaReviewRuntimeDeliveryCorrelation
} from "../../../shared/metaReview/metaReviewSnapshot.js";
import {
  type ReviewVerificationState,
  reviewVerificationStates
} from "../../../shared/reviewer/reviewVerification.js";
import type {
  RemoteBubbleStatusSnapshot
} from "../../../shared/status/remoteBubbleStatusContract.js";
import type {
  StatusMetaReviewView,
  StatusPaneActivityView
} from "../../../shared/status/statusCommandViewProjection.js";
import type { WatchdogStatus } from "../../../shared/watchdog/watchdogStatus.js";
import {
  asBoolean,
  asNonNegativeInteger,
  asNullablePositiveInteger,
  asNullableString,
  asRecordOrThrow,
  asRequiredString,
  failRemotePayload,
  failRemotePayloadMessage,
  normalizeExecutionContext,
  normalizePaneActivity,
  normalizePendingInboxItems,
  normalizeTranscript,
  normalizeWatchdog
} from "./sshBubbleStatusPayloadSupport.js";

const runtimeExpectedStates = new Set<BubbleLifecycleState>([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

function asBubbleLifecycleStateValue(
  value: unknown,
  path: string
): BubbleLifecycleState {
  if (!isBubbleLifecycleState(value)) {
    failRemotePayload(path, "bubble lifecycle state");
  }
  return value;
}

function normalizeRuntimeDelivery(
  value: unknown
): StatusMetaReviewView["runtimeDelivery"] {
  if (value === null || value === undefined) {
    return null;
  }

  const runtimeDelivery = asRecordOrThrow(value, "metaReview.runtimeDelivery");
  if (!isMetaReviewRuntimeDeliveryStatus(runtimeDelivery.status)) {
    failRemotePayloadMessage(
      "metaReview.runtimeDelivery.status",
      "Remote bubble status payload has invalid metaReview.runtimeDelivery.status."
    );
  }

  const observedForHandoffId = asNullableString(
    runtimeDelivery.observedForHandoffId,
    "metaReview.runtimeDelivery.observedForHandoffId"
  );
  const observedForRound = asNullablePositiveInteger(
    runtimeDelivery.observedForRound,
    "metaReview.runtimeDelivery.observedForRound"
  );
  const correlation = normalizeMetaReviewRuntimeDeliveryCorrelation({
    observedForHandoffId,
    observedForRound
  });
  if (
    correlation.observedForHandoffId !== observedForHandoffId
    || correlation.observedForRound !== observedForRound
  ) {
    failRemotePayloadMessage(
      "metaReview.runtimeDelivery",
      "Remote bubble status payload has inconsistent metaReview.runtimeDelivery correlation fields."
    );
  }

  return {
    status: runtimeDelivery.status,
    reasonCode: asNullableString(
      runtimeDelivery.reasonCode,
      "metaReview.runtimeDelivery.reasonCode"
    ),
    message: asRequiredString(
      runtimeDelivery.message,
      "metaReview.runtimeDelivery.message"
    ),
    observedAt: asRequiredString(
      runtimeDelivery.observedAt,
      "metaReview.runtimeDelivery.observedAt"
    ),
    observedForHandoffId: correlation.observedForHandoffId,
    observedForRound: correlation.observedForRound
  };
}

function normalizeMetaReview(value: unknown): StatusMetaReviewView {
  const metaReview = asRecordOrThrow(value, "metaReview");
  const actor = asNullableString(metaReview.actor, "metaReview.actor");
  if (actor === null) {
    failRemotePayloadMessage(
      "metaReview.actor",
      "Remote bubble status payload is missing metaReview.actor; expected \"meta-reviewer\"."
    );
  }
  if (actor !== "meta-reviewer") {
    failRemotePayloadMessage(
      "metaReview.actor",
      "Remote bubble status payload has invalid metaReview.actor; expected \"meta-reviewer\"."
    );
  }

  return {
    actor: "meta-reviewer",
    authorityActive: asBoolean(
      metaReview.authorityActive,
      "metaReview.authorityActive"
    ),
    consecutiveCleanRuns:
      metaReview.consecutiveCleanRuns === undefined
        ? 0
        : asNonNegativeInteger(
            metaReview.consecutiveCleanRuns,
            "metaReview.consecutiveCleanRuns"
          ),
    runtimeDelivery: normalizeRuntimeDelivery(metaReview.runtimeDelivery)
  };
}

function normalizeSpecLockState(value: unknown): BubbleSpecLockState {
  const specLockState = asRecordOrThrow(value, "spec_lock_state");
  const state = asNullableString(specLockState.state, "spec_lock_state.state");
  if (state !== "LOCKED" && state !== "IMPLEMENTABLE") {
    failRemotePayloadMessage(
      "spec_lock_state.state",
      "Remote bubble status payload has invalid spec_lock_state.state."
    );
  }

  return {
    state,
    open_blocker_count: asNonNegativeInteger(
      specLockState.open_blocker_count,
      "spec_lock_state.open_blocker_count"
    ),
    open_required_now_count: asNonNegativeInteger(
      specLockState.open_required_now_count,
      "spec_lock_state.open_required_now_count"
    )
  };
}

function normalizeRoundGateState(value: unknown): BubbleRoundGateState {
  const roundGateState = asRecordOrThrow(value, "round_gate_state");
  const reasonCode = asNullableString(
    roundGateState.reason_code,
    "round_gate_state.reason_code"
  );

  return {
    applies: asBoolean(roundGateState.applies, "round_gate_state.applies"),
    violated: asBoolean(roundGateState.violated, "round_gate_state.violated"),
    round: asNonNegativeInteger(roundGateState.round, "round_gate_state.round"),
    ...(reasonCode !== null ? { reason_code: reasonCode } : {})
  };
}

function normalizeStringArray(
  value: unknown,
  path: string
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    failRemotePayload(path, "string array");
  }
  return value.map((entry, index) => {
    return asRequiredString(entry, `${path}[${index}]`);
  });
}

function normalizeFailingGates(value: unknown): BubbleFailingGate[] {
  if (!Array.isArray(value)) {
    failRemotePayload("failing_gates", "array");
  }

  return value.map((entry, index) => {
    const gate = asRecordOrThrow(entry, `failing_gates[${index}]`);
    const priority = gate.priority;
    if (!isFindingPriority(priority)) {
      failRemotePayloadMessage(
        `failing_gates[${index}].priority`,
        `Remote bubble status payload has invalid failing_gates[${index}].priority.`
      );
    }

    const timing = gate.timing;
    if (!isFindingTiming(timing)) {
      failRemotePayloadMessage(
        `failing_gates[${index}].timing`,
        `Remote bubble status payload has invalid failing_gates[${index}].timing.`
      );
    }

    const layer = gate.layer;
    if (layer !== undefined && !isFindingLayer(layer)) {
      failRemotePayloadMessage(
        `failing_gates[${index}].layer`,
        `Remote bubble status payload has invalid failing_gates[${index}].layer.`
      );
    }

    const signalLevel = gate.signal_level;
    if (
      signalLevel !== undefined
      && signalLevel !== "warning"
      && signalLevel !== "info"
    ) {
      failRemotePayloadMessage(
        `failing_gates[${index}].signal_level`,
        `Remote bubble status payload has invalid failing_gates[${index}].signal_level.`
      );
    }

    const effectivePriority = gate.effective_priority;
    if (
      effectivePriority !== undefined
      && !isFindingPriority(effectivePriority)
    ) {
      failRemotePayloadMessage(
        `failing_gates[${index}].effective_priority`,
        `Remote bubble status payload has invalid failing_gates[${index}].effective_priority.`
      );
    }

    const evidenceRefs = normalizeStringArray(
      gate.evidence_refs,
      `failing_gates[${index}].evidence_refs`
    );

    return {
      gate_id: asRequiredString(gate.gate_id, `failing_gates[${index}].gate_id`),
      reason_code: asRequiredString(
        gate.reason_code,
        `failing_gates[${index}].reason_code`
      ),
      message: asRequiredString(gate.message, `failing_gates[${index}].message`),
      priority,
      timing,
      ...(layer !== undefined ? { layer } : {}),
      ...(evidenceRefs !== undefined ? { evidence_refs: evidenceRefs } : {}),
      ...(signalLevel !== undefined ? { signal_level: signalLevel } : {}),
      ...(effectivePriority !== undefined
        ? { effective_priority: effectivePriority }
        : {})
    };
  });
}

function normalizeStateValidation(
  value: unknown
): StateValidationDiagnostics | null {
  if (value === null || value === undefined) {
    return null;
  }

  const stateValidation = asRecordOrThrow(value, "stateValidation");
  if (!Array.isArray(stateValidation.errors)) {
    failRemotePayloadMessage(
      "stateValidation.errors",
      "Remote bubble status payload has invalid stateValidation.errors."
    );
  }

  return {
    message: asRequiredString(stateValidation.message, "stateValidation.message"),
    errors: stateValidation.errors.map((entry, index) => {
      const error = asRecordOrThrow(entry, `stateValidation.errors[${index}]`);
      return {
        path: asRequiredString(
          error.path,
          `stateValidation.errors[${index}].path`
        ),
        message: asRequiredString(
          error.message,
          `stateValidation.errors[${index}].message`
        )
      };
    })
  };
}

function normalizeReviewVerificationState(
  value: unknown
): ReviewVerificationState {
  const normalized = asNullableString(value, "last_review_verification");
  if (normalized === null) {
    return "missing";
  }
  if (!isReviewVerificationState(normalized)) {
    failRemotePayloadMessage(
      "last_review_verification",
      "Remote bubble status payload has invalid last_review_verification."
    );
  }
  return normalized;
}

function isReviewVerificationState(value: string): value is ReviewVerificationState {
  return reviewVerificationStates.some((state) => state === value);
}

function inferRuntimeAvailability(input: {
  state: BubbleLifecycleState;
  paneActivity: StatusPaneActivityView;
  watchdog: WatchdogStatus;
}): RemoteBubbleStatusSnapshot["runtimeAvailability"] {
  if (!runtimeExpectedStates.has(input.state)) {
    return "inactive";
  }
  if (
    input.paneActivity.lastSampleStatus !== "sampled"
    || input.paneActivity.sessionName === null
    || input.paneActivity.targetPane === null
    || input.paneActivity.sampledAt === null
    || input.paneActivity.lastChangedAt === null
    || input.paneActivity.readStatus !== "ok"
  ) {
    return "missing";
  }
  return "active";
}

export function normalizeRemoteBubbleStatusSnapshot(input: {
  payload: unknown;
  lastCheckedAt: string;
}): RemoteBubbleStatusSnapshot {
  const payload = asRecordOrThrow(input.payload, "$");
  const state = asBubbleLifecycleStateValue(payload.state, "state");
  const paneActivity = normalizePaneActivity(payload.paneActivity);
  const watchdog = normalizeWatchdog(payload.watchdog);

  return {
    bubbleStartedAt: asNullableString(payload.bubbleStartedAt, "bubbleStartedAt"),
    state,
    round: asNonNegativeInteger(payload.round, "round"),
    activeAgent: asNullableString(payload.activeAgent, "activeAgent"),
    activeRole: asNullableString(payload.activeRole, "activeRole"),
    activeSince: asNullableString(payload.activeSince, "activeSince"),
    lastCommandAt: asNullableString(payload.lastCommandAt, "lastCommandAt"),
    paneActivity,
    executionContext: normalizeExecutionContext(payload.executionContext),
    watchdog,
    pendingInboxItems: normalizePendingInboxItems(payload.pendingInboxItems),
    transcript: normalizeTranscript(payload.transcript),
    metaReview: normalizeMetaReview(payload.metaReview),
    accuracyCritical: asBoolean(payload.accuracy_critical, "accuracy_critical"),
    lastReviewVerification: normalizeReviewVerificationState(
      payload.last_review_verification
    ),
    failingGates: normalizeFailingGates(payload.failing_gates),
    specLockState: normalizeSpecLockState(payload.spec_lock_state),
    roundGateState: normalizeRoundGateState(payload.round_gate_state),
    stateValidation: normalizeStateValidation(payload.stateValidation),
    runtimeAvailability: inferRuntimeAvailability({
      state,
      paneActivity,
      watchdog
    }),
    lastCheckedAt: input.lastCheckedAt
  };
}
