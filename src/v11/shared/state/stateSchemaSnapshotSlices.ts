import {
  isAgentName,
  isAgentRole
} from "../../domain/agentIdentity/agentIdentity.js";
import type {
  BubbleStateSnapshot,
  RoundRoleHistoryEntry
} from "../../../types/bubble.js";
import type {
  BubbleReworkIntentRecord
} from "./reworkIntentTypes.js";
import type {
  BubbleExecutionContext
} from "./executionContextTypes.js";
import {
  bubbleLifecycleStates,
  isBubbleLifecycleState
} from "../../../types/bubble.js";
import {
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  type ValidationError
} from "../validation/primitives.js";
import { validateExecutionContext } from "./stateSchemaExecution.js";
import { validateReworkIntentRecord } from "./stateSchemaRework.js";

const legacyLifecycleStateReasonCodeByState = new Map<string, string>([
  ["READY_FOR_APPROVAL", "LEGACY_APPROVAL_STATE_UNSUPPORTED"],
  ["META_REVIEW_RUNNING", "LEGACY_META_REVIEW_STATE_UNSUPPORTED"],
  ["META_REVIEW_FAILED", "LEGACY_META_REVIEW_STATE_UNSUPPORTED"]
]);

export interface ValidatedBubbleStateCoreFields {
  bubbleId: string;
  state: BubbleStateSnapshot["state"];
  round: number;
  validatedRound: number | null;
}

export interface ValidatedBubbleStateActivityFields {
  activeAgent: BubbleStateSnapshot["active_agent"];
  activeRole: BubbleStateSnapshot["active_role"];
  activeSince: BubbleStateSnapshot["active_since"];
  lastCommandAt: BubbleStateSnapshot["last_command_at"];
  executionContext: BubbleExecutionContext | null;
}

export interface ValidatedBubbleStateReworkFields {
  pendingReworkIntent: BubbleReworkIntentRecord | null;
  reworkIntentHistory: BubbleReworkIntentRecord[];
}

function validateRoundRoleEntry(
  input: unknown,
  index: number,
  errors: ValidationError[]
): RoundRoleHistoryEntry | undefined {
  const pathPrefix = `round_role_history[${index}]`;
  if (!isRecord(input)) {
    errors.push({
      path: pathPrefix,
      message: "Must be an object"
    });
    return undefined;
  }

  const round = input.round;
  if (!isInteger(round) || round <= 0) {
    errors.push({
      path: `${pathPrefix}.round`,
      message: "Must be a positive integer"
    });
  }

  const implementer = input.implementer;
  if (!isAgentName(implementer)) {
    errors.push({
      path: `${pathPrefix}.implementer`,
      message: "Must be one of: codex, claude"
    });
  }

  const reviewer = input.reviewer;
  if (!isAgentName(reviewer)) {
    errors.push({
      path: `${pathPrefix}.reviewer`,
      message: "Must be one of: codex, claude"
    });
  }

  const switchedAt = input.switched_at;
  if (!isIsoTimestamp(switchedAt)) {
    errors.push({
      path: `${pathPrefix}.switched_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  if (
    !isInteger(round) ||
    round <= 0 ||
    !isAgentName(implementer) ||
    !isAgentName(reviewer) ||
    !isIsoTimestamp(switchedAt)
  ) {
    return undefined;
  }

  return {
    round,
    implementer,
    reviewer,
    switched_at: switchedAt
  };
}

export function validateBubbleStateCoreFields(
  input: Record<string, unknown>,
  errors: ValidationError[]
): ValidatedBubbleStateCoreFields {
  const bubbleId = input.bubble_id;
  if (!isNonEmptyString(bubbleId)) {
    errors.push({
      path: "bubble_id",
      message: "Must be a non-empty string"
    });
  }

  const state = input.state;
  const legacyLifecycleReasonCode =
    typeof state === "string"
      ? legacyLifecycleStateReasonCodeByState.get(state) ?? null
      : null;
  if (legacyLifecycleReasonCode !== null) {
    errors.push({
      path: "state",
      message: `${legacyLifecycleReasonCode}: lifecycle state ${String(state)} is unsupported in the Phase 5 canonical model`
    });
  } else if (!isBubbleLifecycleState(state)) {
    errors.push({
      path: "state",
      message: `Must be one of: ${bubbleLifecycleStates.join(", ")}`
    });
  }

  const round = input.round;
  if (!isInteger(round) || round < 0) {
    errors.push({
      path: "round",
      message: "Must be a non-negative integer"
    });
  }

  return {
    bubbleId: isNonEmptyString(bubbleId) ? bubbleId : "",
    state: isBubbleLifecycleState(state) ? state : "CREATED",
    round: isInteger(round) && round >= 0 ? round : 0,
    validatedRound: isInteger(round) && round >= 0 ? round : null
  };
}

export function validateBubbleStateActivityFields(
  input: Record<string, unknown>,
  errors: ValidationError[]
): ValidatedBubbleStateActivityFields {
  const activeAgent = input.active_agent;
  if (!(activeAgent === null || isAgentName(activeAgent))) {
    errors.push({
      path: "active_agent",
      message: "Must be null or one of: codex, claude"
    });
  }

  const activeRole = input.active_role;
  if (!(activeRole === null || isAgentRole(activeRole))) {
    errors.push({
      path: "active_role",
      message: "Must be null or one of: implementer, reviewer, meta_reviewer"
    });
  }

  const activeSince = input.active_since;
  if (!(activeSince === null || isIsoTimestamp(activeSince))) {
    errors.push({
      path: "active_since",
      message: "Must be null or a valid ISO timestamp"
    });
  }

  const lastCommandAt = input.last_command_at;
  if (!(lastCommandAt === null || isIsoTimestamp(lastCommandAt))) {
    errors.push({
      path: "last_command_at",
      message: "Must be null or a valid ISO timestamp"
    });
  }

  return {
    activeAgent:
      activeAgent === null || isAgentName(activeAgent) ? activeAgent : null,
    activeRole:
      activeRole === null || isAgentRole(activeRole) ? activeRole : null,
    activeSince:
      activeSince === null || isIsoTimestamp(activeSince) ? activeSince : null,
    lastCommandAt:
      lastCommandAt === null || isIsoTimestamp(lastCommandAt)
        ? lastCommandAt
        : null,
    executionContext: validateExecutionContext(
      input.execution_context,
      "execution_context",
      errors
    )
  };
}

export function validateRoundRoleHistory(
  input: unknown,
  errors: ValidationError[]
): RoundRoleHistoryEntry[] {
  const roundRoleHistory: RoundRoleHistoryEntry[] = [];
  if (!Array.isArray(input)) {
    errors.push({
      path: "round_role_history",
      message: "Must be an array"
    });
    return roundRoleHistory;
  }

  input.forEach((entry, index) => {
    const validated = validateRoundRoleEntry(entry, index, errors);
    if (validated !== undefined) {
      roundRoleHistory.push(validated);
    }
  });

  return roundRoleHistory;
}

export function validateReworkIntentState(
  input: Record<string, unknown>,
  errors: ValidationError[]
): ValidatedBubbleStateReworkFields {
  const pendingReworkIntentRaw = input.pending_rework_intent;
  let pendingReworkIntent: BubbleReworkIntentRecord | null = null;
  if (!(pendingReworkIntentRaw === undefined || pendingReworkIntentRaw === null)) {
    const validated = validateReworkIntentRecord(
      pendingReworkIntentRaw,
      "pending_rework_intent",
      errors
    );
    if (validated !== undefined) {
      pendingReworkIntent = validated;
    }
  }

  if (
    pendingReworkIntent !== null &&
    pendingReworkIntent.status !== "pending"
  ) {
    errors.push({
      path: "pending_rework_intent.status",
      message: "pending_rework_intent must have status=pending"
    });
  }

  const reworkIntentHistory: BubbleReworkIntentRecord[] = [];
  const reworkIntentHistoryRaw = input.rework_intent_history;
  if (reworkIntentHistoryRaw === undefined) {
    return {
      pendingReworkIntent,
      reworkIntentHistory
    };
  }

  if (!Array.isArray(reworkIntentHistoryRaw)) {
    errors.push({
      path: "rework_intent_history",
      message: "Must be an array"
    });
    return {
      pendingReworkIntent,
      reworkIntentHistory
    };
  }

  reworkIntentHistoryRaw.forEach((entry, index) => {
    const path = `rework_intent_history[${index}]`;
    const validated = validateReworkIntentRecord(entry, path, errors);
    if (validated === undefined) {
      return;
    }
    if (validated.status === "pending") {
      errors.push({
        path: `${path}.status`,
        message: "History intents cannot use status=pending"
      });
      return;
    }
    reworkIntentHistory.push(validated);
  });

  return {
    pendingReworkIntent,
    reworkIntentHistory
  };
}
