import type { IncomingMessage, ServerResponse } from "node:http";

import type { BubbleLifecycleState } from "../../../types/bubble.js";
import { AttachBubbleError } from "../../../core/bubble/attachBubble.js";
import type { UiApiError } from "./routerContracts.js";

const jsonContentType = "application/json; charset=utf-8";
export const sseContentType = "text/event-stream; charset=utf-8";
const maxJsonBodyBytes = 1_000_000;

export class UiApiHttpError extends Error {
  public readonly apiError: UiApiError;
  public readonly context: UiApiHttpErrorContext | undefined;

  public constructor(input: UiApiError | UiApiHttpErrorInput) {
    const normalized =
      "apiError" in input
        ? input
        : {
          apiError: input,
          context: undefined
        };
    super(normalized.apiError.body.error.message);
    this.name = "UiApiHttpError";
    this.apiError = normalized.apiError;
    this.context = normalized.context;
  }
}

export interface UiApiHttpErrorContext {
  source: "router_http" | "router_request";
  reason:
    | "http_error"
    | "empty_bubble_id"
    | "unsupported_collection_method"
    | "unknown_api_route"
    | "unsupported_bubble_route_method";
  errorCode: string;
  method?: string | undefined;
  pathname?: string | undefined;
}

export interface UiApiHttpErrorInput {
  apiError: UiApiError;
  context?: UiApiHttpErrorContext | undefined;
}

export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): void {
  const payload = `${JSON.stringify(body)}\n`;
  res.writeHead(status, {
    "content-type": jsonContentType,
    "content-length": String(Buffer.byteLength(payload)),
    ...extraHeaders
  });
  res.end(payload);
}

export function sendApiError(res: ServerResponse, error: UiApiError): void {
  sendJson(res, error.status, error.body);
}

export function badRequest(
  message: string,
  details?: Record<string, unknown>
): UiApiError {
  return {
    status: 400,
    body: {
      error: {
        code: "bad_request",
        message,
        ...(details !== undefined ? { details } : {})
      }
    }
  };
}

export function notFound(
  message: string,
  details?: Record<string, unknown>
): UiApiError {
  return {
    status: 404,
    body: {
      error: {
        code: "not_found",
        message,
        ...(details !== undefined ? { details } : {})
      }
    }
  };
}

export function conflict(
  message: string,
  details?: Record<string, unknown>
): UiApiError {
  return {
    status: 409,
    body: {
      error: {
        code: "conflict",
        message,
        ...(details !== undefined ? { details } : {})
      }
    }
  };
}

export function internalError(
  message: string,
  details?: Record<string, unknown>
): UiApiError {
  return {
    status: 500,
    body: {
      error: {
        code: "internal_error",
        message,
        ...(details !== undefined ? { details } : {})
      }
    }
  };
}

export function throwApiError(
  error: UiApiError,
  context: UiApiHttpErrorContext = {
    source: "router_http",
    reason: "http_error",
    errorCode: error.body.error.code
  }
): never {
  throw new UiApiHttpError({
    apiError: error,
    context
  });
}

export function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function asArrayHeaderValue(
  value: string | string[] | undefined
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

export function parseStateFromErrorMessage(
  message: string
): BubbleLifecycleState | undefined {
  const match = /current:\s*([A-Z_]+)/u.exec(message);
  const candidate = match?.[1];
  if (candidate === undefined) {
    return undefined;
  }
  const allowed = new Set<string>([
    "CREATED",
    "PREPARING_WORKSPACE",
    "RUNNING",
    "WAITING_HUMAN",
    "READY_FOR_HUMAN_APPROVAL",
    "APPROVED_FOR_COMMIT",
    "COMMITTED",
    "DONE",
    "FAILED",
    "CANCELLED"
  ]);
  return allowed.has(candidate)
    ? (candidate as BubbleLifecycleState)
    : undefined;
}

export function isNotFoundErrorMessage(message: string): boolean {
  return (
    message.includes("does not exist in repository") ||
    message.includes("Could not locate bubble") ||
    message.includes("Repository is out of UI scope")
  );
}

export function isConflictErrorMessage(message: string): boolean {
  const patterns = [
    "can only be used while",
    "requires state",
    "requires non-final state",
    "State fingerprint mismatch",
    "Expected current state",
    "Bubble worktree does not exist yet",
    "Repository has uncommitted changes",
    "Base branch not found locally",
    "Bubble branch not found locally",
    "cannot be identical",
    "Merge failed for",
    "does not exist. Start the bubble runtime first."
  ];
  return patterns.some((pattern) => message.includes(pattern));
}

export function isAttachRuntimeMissingError(error: unknown): boolean {
  return (
    error instanceof AttachBubbleError &&
    error.reasonCode === "TMUX_SESSION_MISSING"
  );
}

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
