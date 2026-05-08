import { isBubbleLifecycleState } from "../../../../contracts/kernel/lifecycle.js";
import type { BubbleRemoteStateCache } from "../../../shared/remote/remoteStateCacheTypes.js";
import { RemoteBubbleStartError } from "./sshBubbleStartShared.js";

function resolveConfirmedRound(input: {
  bubbleId: string;
  round: unknown;
}): number {
  if (
    typeof input.round === "number"
    && Number.isInteger(input.round)
    && input.round >= 0
  ) {
    return input.round;
  }

  throw new RemoteBubbleStartError({
    code: "REMOTE_STATE_SNAPSHOT_INVALID",
    message:
      `Remote start returned invalid state snapshot for bubble ${input.bubbleId}: missing valid round.`,
    context: {
      bubble_id: input.bubbleId,
      received_round: input.round ?? null
    }
  });
}

function resolveConfirmedActiveRole(input: {
  bubbleId: string;
  activeRole: unknown;
}): "implementer" | "reviewer" | null {
  if (input.activeRole === undefined || input.activeRole === null) {
    return null;
  }
  if (input.activeRole === "implementer" || input.activeRole === "reviewer") {
    return input.activeRole;
  }

  throw new RemoteBubbleStartError({
    code: "REMOTE_STATE_SNAPSHOT_INVALID",
    message:
      `Remote start returned invalid state snapshot for bubble ${input.bubbleId}: invalid active role.`,
    context: {
      bubble_id: input.bubbleId,
      active_role: input.activeRole
    }
  });
}

function resolveConfirmedMaxRounds(input: {
  rawMaxRounds: unknown;
  fallbackMaxRounds: number;
}): number {
  if (
    typeof input.rawMaxRounds === "number"
    && Number.isInteger(input.rawMaxRounds)
    && input.rawMaxRounds > 0
  ) {
    return input.rawMaxRounds;
  }

  return input.fallbackMaxRounds;
}

export function normalizeRemoteStateSnapshotForCache(input: {
  bubbleId: string;
  snapshot: Record<string, unknown>;
  fallbackMaxRounds: number;
  checkedAt: string;
}): BubbleRemoteStateCache {
  const state = input.snapshot.state;
  if (!isBubbleLifecycleState(state)) {
    throw new RemoteBubbleStartError({
      code: "REMOTE_STATE_SNAPSHOT_INVALID",
      message:
        `Remote start returned invalid state snapshot for bubble ${input.bubbleId}: missing valid lifecycle state.`,
      context: {
        bubble_id: input.bubbleId,
        received_state: state ?? null
      }
    });
  }
  if (state !== "RUNNING") {
    throw new RemoteBubbleStartError({
      code: "REMOTE_CONFIRMATION_INVALID",
      message:
        `Remote start confirmation for bubble ${input.bubbleId} expected RUNNING but received ${state}.`,
      details: {
        receivedState: state,
        receivedRound:
          typeof input.snapshot.round === "number"
          && Number.isInteger(input.snapshot.round)
            ? input.snapshot.round
            : null
      },
      context: {
        bubble_id: input.bubbleId,
        received_state: state,
        received_round:
          typeof input.snapshot.round === "number"
          && Number.isInteger(input.snapshot.round)
            ? input.snapshot.round
            : null
      }
    });
  }

  const round = resolveConfirmedRound({
    bubbleId: input.bubbleId,
    round: input.snapshot.round
  });
  const activeRole = resolveConfirmedActiveRole({
    bubbleId: input.bubbleId,
    activeRole: input.snapshot.active_role
  });
  const maxRounds = resolveConfirmedMaxRounds({
    rawMaxRounds: input.snapshot.max_rounds,
    fallbackMaxRounds: input.fallbackMaxRounds
  });

  return {
    lastCheckedAt: input.checkedAt,
    state,
    round,
    maxRounds,
    implementerStatus: activeRole === "implementer" ? "running" : "idle",
    reviewerStatus: activeRole === "reviewer" ? "running" : "idle"
  };
}
