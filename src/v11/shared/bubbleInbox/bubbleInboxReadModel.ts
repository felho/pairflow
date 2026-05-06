import { statusCommandDependencyDefaults } from "../status/statusCommandDependencyDefaults.js";
import type {
  BubbleLifecycleState,
  MetaReviewRecommendation
} from "../../../types/bubble.js";
import type { MetaReviewGateRoute } from "../metaReviewGate/index.js";
import { resolveCanonicalPendingApprovalSignal } from "../approval/pendingApprovalSignal.js";
import { isNamedError } from "../errors/namedError.js";

export type PendingInboxItemType = "HUMAN_QUESTION" | "APPROVAL_REQUEST";

export interface PendingInboxItem {
  envelopeId: string;
  type: PendingInboxItemType;
  ts: string;
  round: number;
  sender: string;
  summary: string;
  refs: string[];
  latestRecommendation?: MetaReviewRecommendation;
  gateRoute?: MetaReviewGateRoute;
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

export interface BubbleInboxErrorContext {
  source: "bubble_lookup" | "unexpected_error";
  bubbleId?: string | undefined;
  repoPathProvided: boolean;
  cwdProvided: boolean;
  causeName?: string | undefined;
}

export interface BubbleInboxErrorInput {
  message: string;
  cause?: unknown;
  context?: BubbleInboxErrorContext | undefined;
}

export interface BubbleInboxErrorNormalizationContext {
  bubbleId: string;
  repoPathProvided: boolean;
  cwdProvided: boolean;
}

export class BubbleInboxError extends Error {
  public readonly context: BubbleInboxErrorContext | undefined;

  public constructor(input: string | BubbleInboxErrorInput) {
    const normalized =
      typeof input === "string"
        ? { message: input, cause: undefined, context: undefined }
        : input;
    super(normalized.message, { cause: normalized.cause });
    this.name = "BubbleInboxError";
    this.context = normalized.context;
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
  const resolved = await statusCommandDependencyDefaults.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const [{ state }, inbox] = await Promise.all([
    statusCommandDependencyDefaults.readStateSnapshot(resolved.bubblePaths.statePath),
    statusCommandDependencyDefaults.readTranscriptEnvelopes(resolved.bubblePaths.inboxPath, {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
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
    round: state.round,
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

export function asBubbleInboxError(
  error: unknown,
  context: BubbleInboxErrorNormalizationContext
): never {
  if (error instanceof BubbleInboxError) {
    throw error;
  }
  if (isNamedError(error, "BubbleLookupError")) {
    throw new BubbleInboxError({
      message: error.message,
      cause: error,
      context: {
        source: "bubble_lookup",
        bubbleId: context.bubbleId,
        repoPathProvided: context.repoPathProvided,
        cwdProvided: context.cwdProvided,
        causeName: error.name
      }
    });
  }
  if (error instanceof Error) {
    throw new BubbleInboxError({
      message: error.message,
      cause: error,
      context: {
        source: "unexpected_error",
        bubbleId: context.bubbleId,
        repoPathProvided: context.repoPathProvided,
        cwdProvided: context.cwdProvided,
        causeName: error.name
      }
    });
  }
  throw error;
}
