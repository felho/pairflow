import { readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { readStateSnapshot } from "../state/stateStore.js";
import { computeWatchdogStatus, type WatchdogStatus } from "../runtime/watchdog.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import type { BubbleLifecycleState } from "../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolMessageType } from "../../types/protocol.js";

export interface BubbleStatusInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface BubbleStatusView {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  state: BubbleLifecycleState;
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  activeSince: string | null;
  lastCommandAt: string | null;
  watchdog: WatchdogStatus;
  pendingInboxItems: {
    humanQuestions: number;
    approvalRequests: number;
    total: number;
  };
  transcript: {
    totalMessages: number;
    lastMessageType: ProtocolMessageType | null;
    lastMessageTs: string | null;
    lastMessageId: string | null;
  };
}

export class BubbleStatusError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleStatusError";
  }
}

function countPendingHumanQuestions(envelopes: ProtocolEnvelope[]): number {
  let pending = 0;
  for (const envelope of envelopes) {
    if (envelope.type === "HUMAN_QUESTION") {
      pending += 1;
      continue;
    }
    if (envelope.type === "HUMAN_REPLY") {
      // Defensive clamp: inbox events are append-only in normal flow, but if logs
      // are edited/reordered manually we still keep pending count non-negative.
      pending = Math.max(0, pending - 1);
    }
  }
  return pending;
}

function countPendingApprovalRequests(envelopes: ProtocolEnvelope[]): number {
  let pending = 0;
  for (const envelope of envelopes) {
    if (envelope.type === "APPROVAL_REQUEST") {
      pending += 1;
      continue;
    }
    if (envelope.type === "APPROVAL_DECISION") {
      // Defensive clamp against malformed/out-of-order inbox edits.
      pending = Math.max(0, pending - 1);
    }
  }
  return pending;
}

export async function getBubbleStatus(input: BubbleStatusInput): Promise<BubbleStatusView> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const [{ state }, transcript, inbox] = await Promise.all([
    readStateSnapshot(resolved.bubblePaths.statePath),
    readTranscriptEnvelopes(resolved.bubblePaths.transcriptPath, {
      allowMissing: true
    }),
    readTranscriptEnvelopes(resolved.bubblePaths.inboxPath, {
      allowMissing: true
    })
  ]);

  const lastMessage = transcript[transcript.length - 1] ?? null;
  const pendingQuestions = countPendingHumanQuestions(inbox);
  const pendingApprovals = countPendingApprovalRequests(inbox);

  return {
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    worktreePath: resolved.bubblePaths.worktreePath,
    state: state.state,
    round: state.round,
    activeAgent: state.active_agent,
    activeRole: state.active_role,
    activeSince: state.active_since,
    lastCommandAt: state.last_command_at,
    watchdog: computeWatchdogStatus(
      state,
      resolved.bubbleConfig.watchdog_timeout_minutes,
      input.now ?? new Date()
    ),
    pendingInboxItems: {
      humanQuestions: pendingQuestions,
      approvalRequests: pendingApprovals,
      total: pendingQuestions + pendingApprovals
    },
    transcript: {
      totalMessages: transcript.length,
      lastMessageType: lastMessage?.type ?? null,
      lastMessageTs: lastMessage?.ts ?? null,
      lastMessageId: lastMessage?.id ?? null
    }
  };
}

export function asBubbleStatusError(error: unknown): never {
  if (error instanceof BubbleStatusError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new BubbleStatusError(error.message);
  }
  if (error instanceof Error) {
    throw new BubbleStatusError(error.message);
  }
  throw error;
}
