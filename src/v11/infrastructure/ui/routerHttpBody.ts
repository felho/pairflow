import type { IncomingMessage } from "node:http";
import {
  isBubbleReviewAutoReworkSeverity,
  isBubbleReviewLoopMode,
  type BubbleReviewAutoReworkSeverity,
  type BubbleReviewLoopMode
} from "../../../types/bubble.js";
import {
  isMetaReviewQualityPreset,
  type MetaReviewQualityPreset
} from "../../shared/reviewPolicy/updateBubbleReviewPolicy.js";
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
  stageAll: boolean;
  message?: string | undefined;
  refs?: string[] | undefined;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throwApiError(badRequest("Commit request body must be a JSON object."));
  }
  const typedBody = body as Record<string, unknown>;
  if (Object.hasOwn(typedBody, "auto")) {
    const hasStageAll = Object.hasOwn(typedBody, "stageAll");
    throwApiError(
      badRequest(
        hasStageAll
          ? "Commit request cannot include both `stageAll` and legacy `auto`; remove `auto`."
          : "Commit request field `auto` is no longer supported; use boolean field `stageAll`."
      )
    );
  }
  const stageAllValue = typedBody.stageAll;
  if (typeof stageAllValue !== "boolean") {
    throwApiError(
      badRequest("Commit request requires boolean field `stageAll`.")
    );
  }
  const messageValue = typedBody.message;
  const refsValue = typedBody.refs;
  if (messageValue !== undefined && typeof messageValue !== "string") {
    throwApiError(
      badRequest("Commit field `message` must be a string when provided.")
    );
  }
  const refs =
    refsValue === undefined ? undefined : ensureStringArray(refsValue, "refs");
  return {
    stageAll: stageAllValue,
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
  reviewBlockingMinSeverity?: BubbleReviewAutoReworkSeverity | undefined;
  metaReviewQualityPreset?: MetaReviewQualityPreset | undefined;
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

  const legacyMetaReviewAutoReworkMinSeverity =
    (body as { metaReviewAutoReworkMinSeverity?: unknown })
      .metaReviewAutoReworkMinSeverity;
  if (legacyMetaReviewAutoReworkMinSeverity !== undefined) {
    throwApiError(
      badRequest(
        "Field `metaReviewAutoReworkMinSeverity` is no longer supported; use `reviewBlockingMinSeverity`."
      )
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

  const reviewBlockingMinSeverity =
    (body as { reviewBlockingMinSeverity?: unknown }).reviewBlockingMinSeverity;
  if (
    reviewBlockingMinSeverity !== undefined
    && !isBubbleReviewAutoReworkSeverity(reviewBlockingMinSeverity)
  ) {
    throwApiError(
      badRequest(
        "Field `reviewBlockingMinSeverity` must be one of: P1, P2, P3."
      )
    );
  }
  const metaReviewQualityPreset =
    (body as { metaReviewQualityPreset?: unknown }).metaReviewQualityPreset;
  if (
    metaReviewQualityPreset !== undefined
    && !isMetaReviewQualityPreset(metaReviewQualityPreset)
  ) {
    throwApiError(
      badRequest(
        "Field `metaReviewQualityPreset` must be one of: P1, P2, P3, P3+2."
      )
    );
  }
  const metaReviewQualityPresetSeverity =
    metaReviewQualityPreset === "P3+2" ? "P3" : metaReviewQualityPreset;
  if (
    reviewBlockingMinSeverity !== undefined
    && metaReviewQualityPresetSeverity !== undefined
    && reviewBlockingMinSeverity !== metaReviewQualityPresetSeverity
  ) {
    throwApiError(
      badRequest(
        "Field `reviewBlockingMinSeverity` must match `metaReviewQualityPreset` severity when both are provided."
      )
    );
  }

  return {
    reviewLoopMode,
    ...(reviewBlockingMinSeverity !== undefined
      ? { reviewBlockingMinSeverity }
      : {}),
    ...(metaReviewQualityPreset !== undefined
      ? { metaReviewQualityPreset }
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
