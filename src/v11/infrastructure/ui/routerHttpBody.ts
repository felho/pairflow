import type { IncomingMessage } from "node:http";
import {
  isBubbleReviewAutoReworkSeverity,
  isBubbleReviewLoopMode,
  type BubbleReviewAutoReworkSeverity,
  type BubbleReviewLoopMode
} from "../../../types/bubble.js";
import { badRequest, throwApiError } from "./routerHttpErrors.js";

const maxJsonBodyBytes = 1_000_000;

export function ensureStringArray(
  value: unknown,
  fieldName: string
): string[] {
  if (!Array.isArray(value)) {
    throwApiError(
      badRequest(`Field \`${fieldName}\` must be an array of strings.`)
    );
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      throwApiError(
        badRequest(`Field \`${fieldName}\` must contain only strings.`)
      );
    }
    result.push(item);
  }
  return result;
}

export function requireMessage(
  body: unknown,
  fieldName: string = "message"
): string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throwApiError(badRequest("Request body must be a JSON object."));
  }
  const typedBody = body as Record<string, unknown>;
  const message = typedBody[fieldName];
  if (typeof message !== "string" || message.trim().length === 0) {
    throwApiError(
      badRequest(`Field \`${fieldName}\` is required and must be non-empty.`)
    );
  }
  return message.trim();
}

export function parseOptionalRefs(body: unknown): string[] {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return [];
  }
  const refs = (body as { refs?: unknown }).refs;
  if (refs === undefined) {
    return [];
  }
  return ensureStringArray(refs, "refs");
}

export function parseApproveBody(body: unknown): {
  refs: string[];
  overrideNonApprove: boolean;
  overrideReason?: string | undefined;
} {
  const refs = parseOptionalRefs(body);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      refs,
      overrideNonApprove: false
    };
  }
  const typedBody = body as Record<string, unknown>;
  const overrideNonApproveValue = typedBody.overrideNonApprove;
  const overrideReasonValue = typedBody.overrideReason;
  if (
    overrideNonApproveValue !== undefined &&
    typeof overrideNonApproveValue !== "boolean"
  ) {
    throwApiError(
      badRequest("Field `overrideNonApprove` must be a boolean when provided.")
    );
  }
  if (
    overrideReasonValue !== undefined &&
    typeof overrideReasonValue !== "string"
  ) {
    throwApiError(
      badRequest("Field `overrideReason` must be a string when provided.")
    );
  }
  return {
    refs,
    overrideNonApprove: overrideNonApproveValue ?? false,
    ...(overrideReasonValue !== undefined
      ? { overrideReason: overrideReasonValue }
      : {})
  };
}

export function parseCommitBody(body: unknown): {
  auto: boolean;
  message?: string | undefined;
  refs?: string[] | undefined;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throwApiError(badRequest("Commit request body must be a JSON object."));
  }
  const autoValue = (body as { auto?: unknown }).auto;
  if (typeof autoValue !== "boolean") {
    throwApiError(badRequest("Commit request requires boolean field `auto`."));
  }
  const messageValue = (body as { message?: unknown }).message;
  const refsValue = (body as { refs?: unknown }).refs;
  if (messageValue !== undefined && typeof messageValue !== "string") {
    throwApiError(
      badRequest("Commit field `message` must be a string when provided.")
    );
  }
  const refs =
    refsValue === undefined ? undefined : ensureStringArray(refsValue, "refs");
  return {
    auto: autoValue,
    ...(messageValue !== undefined ? { message: messageValue } : {}),
    ...(refs !== undefined ? { refs } : {})
  };
}

export function parseMergeBody(body: unknown): {
  push?: boolean | undefined;
  deleteRemote?: boolean | undefined;
} {
  if (body === undefined) {
    return {};
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throwApiError(
      badRequest("Merge request body must be a JSON object when provided.")
    );
  }
  const pushValue = (body as { push?: unknown }).push;
  const deleteRemoteValue = (body as { deleteRemote?: unknown }).deleteRemote;
  if (pushValue !== undefined && typeof pushValue !== "boolean") {
    throwApiError(
      badRequest("Merge field `push` must be a boolean when provided.")
    );
  }
  if (deleteRemoteValue !== undefined && typeof deleteRemoteValue !== "boolean") {
    throwApiError(
      badRequest("Merge field `deleteRemote` must be a boolean when provided.")
    );
  }
  return {
    ...(pushValue !== undefined ? { push: pushValue } : {}),
    ...(deleteRemoteValue !== undefined
      ? { deleteRemote: deleteRemoteValue }
      : {})
  };
}

export function parseDeleteBody(body: unknown): {
  force?: boolean | undefined;
} {
  if (body === undefined) {
    return {};
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throwApiError(
      badRequest("Delete request body must be a JSON object when provided.")
    );
  }
  const forceValue = (body as { force?: unknown }).force;
  if (forceValue !== undefined && typeof forceValue !== "boolean") {
    throwApiError(
      badRequest("Delete field `force` must be a boolean when provided.")
    );
  }
  return {
    ...(forceValue !== undefined ? { force: forceValue } : {})
  };
}

export function parseReviewPolicyBody(body: unknown): {
  reviewLoopMode: BubbleReviewLoopMode;
  metaReviewAutoReworkMinSeverity?: BubbleReviewAutoReworkSeverity | undefined;
  expectedBubbleToml?: string | undefined;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throwApiError(
      badRequest("Review policy request body must be a JSON object.")
    );
  }

  const reviewLoopMode = (body as { reviewLoopMode?: unknown }).reviewLoopMode;
  if (!isBubbleReviewLoopMode(reviewLoopMode)) {
    throwApiError(
      badRequest("Field `reviewLoopMode` must be one of: full, meta_only.")
    );
  }

  const expectedBubbleToml =
    (body as { expectedBubbleToml?: unknown }).expectedBubbleToml;
  if (
    expectedBubbleToml !== undefined
    && typeof expectedBubbleToml !== "string"
  ) {
    throwApiError(
      badRequest("Field `expectedBubbleToml` must be a string when provided.")
    );
  }

  const metaReviewAutoReworkMinSeverity =
    (body as { metaReviewAutoReworkMinSeverity?: unknown })
      .metaReviewAutoReworkMinSeverity;
  if (
    metaReviewAutoReworkMinSeverity !== undefined
    && !isBubbleReviewAutoReworkSeverity(metaReviewAutoReworkMinSeverity)
  ) {
    throwApiError(
      badRequest(
        "Field `metaReviewAutoReworkMinSeverity` must be one of: P1, P2, P3."
      )
    );
  }

  return {
    reviewLoopMode,
    ...(metaReviewAutoReworkMinSeverity !== undefined
      ? { metaReviewAutoReworkMinSeverity }
      : {}),
    ...(expectedBubbleToml !== undefined ? { expectedBubbleToml } : {})
  };
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as string);
    total += buffer.length;
    if (total > maxJsonBodyBytes) {
      throwApiError(badRequest("Request body is too large."));
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.trim().length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throwApiError(badRequest("Request body must be valid JSON."));
  }
}
