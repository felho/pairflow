import type {
  BubbleFailingGate,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "./gateStateTypes.js";
import {
  isFindingLayer,
  isFindingPriority,
  isFindingTiming
} from "../../../types/findings.js";
import { isNonEmptyString, isRecord } from "../validation/primitives.js";
import type {
  DocContractGateArtifact
} from "./docContractGateArtifactContract.js";
import {
  DocContractGateArtifactError,
  docContractGateArtifactSchemaVersion
} from "./docContractGateArtifactContract.js";
import type { GateFindingEvaluation } from "./docContractReviewerGateEvaluation.js";

function defaultSpecLockState(): BubbleSpecLockState {
  return {
    state: "IMPLEMENTABLE",
    open_blocker_count: 0,
    open_required_now_count: 0
  };
}

function defaultRoundGateState(round: number): BubbleRoundGateState {
  return {
    applies: false,
    violated: false,
    round
  };
}

function extractRoundFromFindingKey(findingKey: string): number | undefined {
  const match = /^r(?<round>\d+):f\d+$/u.exec(findingKey.trim());
  if (match === null) {
    return undefined;
  }
  const rawRound = match.groups?.["round"];
  if (rawRound === undefined) {
    return undefined;
  }
  const parsedRound = Number.parseInt(rawRound, 10);
  if (!Number.isFinite(parsedRound)) {
    return undefined;
  }
  return Math.max(0, Math.trunc(parsedRound));
}

function normalizeWarning(raw: unknown): BubbleFailingGate | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const gateId = raw.gate_id;
  const reasonCode = raw.reason_code;
  const message = raw.message;
  const priority = raw.priority;
  const timing = raw.timing;
  if (
    !isNonEmptyString(gateId)
    || !isNonEmptyString(reasonCode)
    || !isNonEmptyString(message)
    || !isFindingPriority(priority)
    || !isFindingTiming(timing)
  ) {
    return undefined;
  }

  const normalized: BubbleFailingGate = {
    gate_id: gateId.trim(),
    reason_code: reasonCode.trim(),
    message: message.trim(),
    priority,
    timing,
    signal_level: raw.signal_level === "info" ? "info" : "warning"
  };

  if (isFindingLayer(raw.layer)) {
    normalized.layer = raw.layer;
  }
  if (isFindingPriority(raw.effective_priority)) {
    normalized.effective_priority = raw.effective_priority;
  }
  if (Array.isArray(raw.evidence_refs)) {
    const refs = raw.evidence_refs
      .filter((entry) => isNonEmptyString(entry))
      .map((entry) => entry.trim());
    if (refs.length > 0) {
      normalized.evidence_refs = refs;
    }
  }

  return normalized;
}

function normalizeFindingEvaluation(raw: unknown): GateFindingEvaluation | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  if (
    !isNonEmptyString(raw.finding_key)
    || !isFindingPriority(raw.priority)
    || !isFindingPriority(raw.effective_priority)
    || !isFindingTiming(raw.timing)
    || !isFindingTiming(raw.effective_timing)
  ) {
    return undefined;
  }

  const normalized: GateFindingEvaluation = {
    finding_key: raw.finding_key.trim(),
    priority: raw.priority,
    effective_priority: raw.effective_priority,
    timing: raw.timing,
    effective_timing: raw.effective_timing
  };
  if (isFindingLayer(raw.layer)) {
    normalized.layer = raw.layer;
  }
  return normalized;
}

function normalizeRoundGateState(
  raw: unknown,
  fallbackRound: number
): BubbleRoundGateState {
  if (!isRecord(raw)) {
    return defaultRoundGateState(fallbackRound);
  }

  const round = typeof raw.round === "number" && Number.isFinite(raw.round)
    ? Math.max(0, Math.trunc(raw.round))
    : fallbackRound;
  const applies = raw.applies === true;
  const violated = raw.violated === true;
  const reasonCode = isNonEmptyString(raw.reason_code) ? raw.reason_code.trim() : undefined;
  return {
    applies,
    violated,
    round,
    ...(reasonCode !== undefined ? { reason_code: reasonCode } : {})
  };
}

function normalizeSpecLockState(raw: unknown): BubbleSpecLockState {
  if (!isRecord(raw)) {
    return defaultSpecLockState();
  }

  const openBlockerCount =
    typeof raw.open_blocker_count === "number" && Number.isFinite(raw.open_blocker_count)
      ? Math.max(0, Math.trunc(raw.open_blocker_count))
      : 0;
  const openRequiredNowCount =
    typeof raw.open_required_now_count === "number" && Number.isFinite(raw.open_required_now_count)
      ? Math.max(0, Math.trunc(raw.open_required_now_count))
      : 0;
  const state = openBlockerCount > 0 ? "LOCKED" : "IMPLEMENTABLE";
  return {
    state,
    open_blocker_count: openBlockerCount,
    open_required_now_count: openRequiredNowCount
  };
}

export function normalizeDocContractGateArtifact(raw: unknown): DocContractGateArtifact {
  if (!isRecord(raw)) {
    throw new DocContractGateArtifactError({
      message:
        "DOC_CONTRACT_GATE_ARTIFACT_INVALID: Doc contract gate artifact must be an object.",
      context: {
        source: "artifact_normalization",
        reason: "invalid_shape"
      }
    });
  }

  const taskWarnings = Array.isArray(raw.task_warnings)
    ? raw.task_warnings
        .map(normalizeWarning)
        .filter((entry): entry is BubbleFailingGate => entry !== undefined)
    : [];
  const configWarnings = Array.isArray(raw.config_warnings)
    ? raw.config_warnings
        .map(normalizeWarning)
        .filter((entry): entry is BubbleFailingGate => entry !== undefined)
    : [];
  const reviewWarnings = Array.isArray(raw.review_warnings)
    ? raw.review_warnings
        .map(normalizeWarning)
        .filter((entry): entry is BubbleFailingGate => entry !== undefined)
    : [];
  const findingEvaluations = Array.isArray(raw.finding_evaluations)
    ? raw.finding_evaluations
        .map(normalizeFindingEvaluation)
        .filter((entry): entry is GateFindingEvaluation => entry !== undefined)
    : [];
  const fallbackRound = findingEvaluations.reduce((maxRound, entry) => {
    const round = extractRoundFromFindingKey(entry.finding_key);
    if (round === undefined) {
      return maxRound;
    }
    return Math.max(maxRound, round);
  }, 1);

  return {
    schema_version: docContractGateArtifactSchemaVersion,
    updated_at: isNonEmptyString(raw.updated_at)
      ? raw.updated_at
      : new Date(0).toISOString(),
    task_warnings: taskWarnings,
    config_warnings: configWarnings,
    review_warnings: reviewWarnings,
    finding_evaluations: findingEvaluations,
    round_gate_state: normalizeRoundGateState(raw.round_gate_state, fallbackRound),
    spec_lock_state: normalizeSpecLockState(raw.spec_lock_state)
  };
}
