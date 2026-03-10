import { readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { readStateSnapshot } from "../state/stateStore.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import type { BubbleLifecycleState } from "../../types/bubble.js";
import { resolveCanonicalPendingApprovalSignal } from "./pendingApprovalSignal.js";

export type PendingInboxItemType = "HUMAN_QUESTION" | "APPROVAL_REQUEST";

export interface PendingInboxItem {
  envelopeId: string;
  type: PendingInboxItemType;
  ts: string;
  round: number;
  sender: string;
  summary: string;
  refs: string[];
}

export interface BubbleInboxInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface BubbleInboxView {
  bubbleId: string;
  repoPath: string;
  state: BubbleLifecycleState;
  pending: {
    humanQuestions: number;
    approvalRequests: number;
    total: number;
  };
  items: PendingInboxItem[];
}

export class BubbleInboxError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleInboxError";
  }
}

function deriveQuestionSummary(payload: Record<string, unknown>): string {
  const value = payload.question;
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : "(missing question payload)";
}

export async function getBubbleInbox(
  input: BubbleInboxInput
): Promise<BubbleInboxView> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const [{ state }, inbox] = await Promise.all([
    readStateSnapshot(resolved.bubblePaths.statePath),
    readTranscriptEnvelopes(resolved.bubblePaths.inboxPath, {
      allowMissing: true
    })
  ]);

  const pendingQuestions: PendingInboxItem[] = [];
  for (const envelope of inbox) {
    if (envelope.type === "HUMAN_QUESTION") {
      pendingQuestions.push({
        envelopeId: envelope.id,
        type: "HUMAN_QUESTION",
        ts: envelope.ts,
        round: envelope.round,
        sender: envelope.sender,
        summary: deriveQuestionSummary(
          envelope.payload as unknown as Record<string, unknown>
        ),
        refs: envelope.refs
      });
      continue;
    }

    if (envelope.type === "HUMAN_REPLY") {
      if (pendingQuestions.length > 0) {
        pendingQuestions.shift();
      }
      continue;
    }

    if (envelope.type === "APPROVAL_REQUEST") {
      continue;
    }
  }

  const canonicalPendingApprovalSignal = resolveCanonicalPendingApprovalSignal({
    bubbleId: resolved.bubbleId,
    state: state.state,
    round: state.round,
    metaReview: state.meta_review,
    envelopes: inbox
  });
  const canonicalPendingApproval = canonicalPendingApprovalSignal === undefined
    ? undefined
    : {
      ...canonicalPendingApprovalSignal,
      type: "APPROVAL_REQUEST" as const
    };

  const items = [
    ...pendingQuestions,
    ...(canonicalPendingApproval !== undefined ? [canonicalPendingApproval] : [])
  ].sort((left, right) =>
    left.ts.localeCompare(right.ts)
  );

  return {
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    state: state.state,
    pending: {
      humanQuestions: pendingQuestions.length,
      approvalRequests: canonicalPendingApproval === undefined ? 0 : 1,
      total: items.length
    },
    items
  };
}

export function asBubbleInboxError(error: unknown): never {
  if (error instanceof BubbleInboxError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new BubbleInboxError(error.message);
  }
  if (error instanceof Error) {
    throw new BubbleInboxError(error.message);
  }
  throw error;
}
