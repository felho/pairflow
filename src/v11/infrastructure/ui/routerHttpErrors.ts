import type { ServerResponse } from "node:http";
import type { BubbleLifecycleState } from "../../domain/state/lifecycleTypes.js";
import { AttachBubbleError } from "../executor/command/pairflowCommandAttachContract.js";
import type { UiApiError } from "./routerContracts.js";

const jsonContentType = "application/json; charset=utf-8";
export const sseContentType = "text/event-stream; charset=utf-8";

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

export function sendApiError(
  res: ServerResponse,
  error: UiApiError
): void {
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
    "does not exist. Start the bubble runtime first.",
    "requires a started remote pointer. Run `pairflow bubble start"
  ];
  return patterns.some((pattern) => message.includes(pattern));
}

export interface AttachBubbleErrorLike {
  name: string;
  reasonCode?: string | undefined;
  launcher?: string | undefined;
  failureClass?: string | undefined;
  stdoutExcerpt?: string | undefined;
  stderrExcerpt?: string | undefined;
  context?: {
    reason?: string | undefined;
  } | undefined;
}

export interface BubbleCommitErrorLike {
  name: string;
  reasonCode?: string | undefined;
}

export interface RemoteBubbleApprovalCommandErrorLike {
  name: string;
  code?: string | undefined;
}

export interface RemoteBubbleStatusErrorLike {
  name: string;
  code?: string | undefined;
}

export interface RemoteBubbleCommitCommandErrorLike {
  name: string;
  code?: string | undefined;
}

export interface BubbleMergeErrorLike extends Error {
  reasonCode?: string | undefined;
}

export function isAttachBubbleErrorLike(
  error: unknown
): error is AttachBubbleErrorLike {
  if (error instanceof AttachBubbleError) {
    return true;
  }
  if (!(error instanceof Error) || error.name !== "AttachBubbleError") {
    return false;
  }
  return true;
}

export function isBubbleCommitErrorLike(
  error: unknown
): error is BubbleCommitErrorLike {
  const candidate = error as (Error & { reasonCode?: string }) | undefined;
  return (
    candidate instanceof Error &&
    candidate.name === "BubbleCommitError"
  );
}

export function isBubbleMergeErrorLike(
  error: unknown
): error is BubbleMergeErrorLike {
  const candidate = error as (Error & { reasonCode?: string }) | undefined;
  return (
    candidate instanceof Error &&
    candidate.name === "BubbleMergeError"
  );
}

export function isRemoteBubbleApprovalCommandErrorLike(
  error: unknown
): error is RemoteBubbleApprovalCommandErrorLike {
  const candidate = error as (Error & { code?: string }) | undefined;
  return (
    candidate instanceof Error &&
    candidate.name === "RemoteBubbleApprovalCommandError" &&
    (
      candidate.code === "REMOTE_APPROVAL_TRANSPORT_FAILED" ||
      candidate.code === "REMOTE_APPROVAL_PAYLOAD_INVALID"
    )
  );
}

export function isRemoteBubbleStatusErrorLike(
  error: unknown
): error is RemoteBubbleStatusErrorLike {
  const candidate = error as (Error & { code?: string }) | undefined;
  return (
    candidate instanceof Error &&
    candidate.name === "RemoteBubbleStatusError" &&
    (
      candidate.code === "REMOTE_STATUS_CONFIG_INVALID" ||
      candidate.code === "REMOTE_STATUS_CONFIG_UNAVAILABLE" ||
      candidate.code === "REMOTE_STATUS_TRANSPORT_FAILED" ||
      candidate.code === "REMOTE_STATUS_PAYLOAD_INVALID"
    )
  );
}

export function isRemoteBubbleCommitCommandErrorLike(
  error: unknown
): error is RemoteBubbleCommitCommandErrorLike {
  const candidate = error as (Error & { code?: string }) | undefined;
  return (
    candidate instanceof Error &&
    candidate.name === "RemoteBubbleCommitCommandError" &&
    (
      candidate.code === "REMOTE_COMMIT_TRANSPORT_FAILED" ||
      candidate.code === "REMOTE_COMMIT_PAYLOAD_INVALID"
    )
  );
}
