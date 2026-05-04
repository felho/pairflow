import type {
  UiEvent,
  UiEventsConnectedPayload,
  UiSnapshotEvent
} from "../../../contracts/ui/uiEvents.js";
import type {
  UiBubbleSummary,
  UiRepoSummary
} from "../../../contracts/ui/uiReadModel.js";
import {
  hasExactKeys,
  isRecord,
  isStringArray,
  isUiBubbleSummary,
  isUiRepoSummary
} from "./uiContractShapeValidation.js";

export type UiEventPayloadFamily =
  | "connected"
  | "snapshot"
  | "bubble.updated"
  | "bubble.removed"
  | "repo.updated"
  | "repo.removed"
  | "unknown";

export class UiEventPayloadValidationError extends Error {
  public readonly reasonCode = "UI_EVENT_PAYLOAD_INVALID";
  public readonly eventFamily: UiEventPayloadFamily;

  public constructor(eventFamily: UiEventPayloadFamily) {
    super(`UI event payload failed contract validation: ${eventFamily}.`);
    this.name = "UiEventPayloadValidationError";
    this.eventFamily = eventFamily;
  }
}

function hasEventBase(
  value: Record<string, unknown>,
  type: UiEventPayloadFamily
): boolean {
  return (
    typeof value.id === "number" &&
    typeof value.ts === "string" &&
    value.type === type &&
    typeof value.repoPath === "string"
  );
}

export function isUiEventsConnectedPayload(
  value: unknown
): value is UiEventsConnectedPayload {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["now", "repos"]) &&
    typeof value.now === "string" &&
    isStringArray(value.repos)
  );
}

export function isUiSnapshotEvent(value: unknown): value is UiSnapshotEvent {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["id", "ts", "type", "repos", "bubbles"]) &&
    typeof value.id === "number" &&
    typeof value.ts === "string" &&
    value.type === "snapshot" &&
    Array.isArray(value.repos) &&
    value.repos.every((repo): repo is UiRepoSummary => isUiRepoSummary(repo)) &&
    Array.isArray(value.bubbles) &&
    value.bubbles.every((bubble): bubble is UiBubbleSummary =>
      isUiBubbleSummary(bubble)
    )
  );
}

export function isUiEvent(value: unknown): value is UiEvent {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }
  switch (value.type) {
    case "snapshot":
      return isUiSnapshotEvent(value);
    case "bubble.updated":
      return (
        hasExactKeys(value, [
          "id",
          "ts",
          "type",
          "repoPath",
          "bubbleId",
          "bubble"
        ]) &&
        hasEventBase(value, "bubble.updated") &&
        typeof value.bubbleId === "string" &&
        isUiBubbleSummary(value.bubble)
      );
    case "bubble.removed":
      return (
        hasExactKeys(value, ["id", "ts", "type", "repoPath", "bubbleId"]) &&
        hasEventBase(value, "bubble.removed") &&
        typeof value.bubbleId === "string"
      );
    case "repo.updated":
      return (
        hasExactKeys(value, ["id", "ts", "type", "repoPath", "repo"]) &&
        hasEventBase(value, "repo.updated") &&
        isUiRepoSummary(value.repo)
      );
    case "repo.removed":
      return (
        hasExactKeys(value, ["id", "ts", "type", "repoPath"]) &&
        hasEventBase(value, "repo.removed")
      );
    default:
      return false;
  }
}

export function isReplayableUiEvent(
  value: unknown
): value is Exclude<UiEvent, UiSnapshotEvent> {
  return isUiEvent(value) && value.type !== "snapshot";
}

function raiseUiEventPayloadValidationError(
  eventFamily: UiEventPayloadFamily
): never {
  const error = new UiEventPayloadValidationError(eventFamily);
  throw error;
}

export function validateUiEventsConnectedPayload(
  value: unknown
): UiEventsConnectedPayload {
  if (isUiEventsConnectedPayload(value)) {
    return value;
  }
  raiseUiEventPayloadValidationError("connected");
}

export function validateUiSnapshotEvent(value: unknown): UiSnapshotEvent {
  if (isUiSnapshotEvent(value)) {
    return value;
  }
  raiseUiEventPayloadValidationError("snapshot");
}

export function validateUiEvent(value: unknown): UiEvent {
  if (isUiEvent(value)) {
    return value;
  }
  const eventFamily =
    isRecord(value) && typeof value.type === "string" ? value.type : "unknown";
  raiseUiEventPayloadValidationError(
    eventFamily === "bubble.updated" ||
      eventFamily === "bubble.removed" ||
      eventFamily === "repo.updated" ||
      eventFamily === "repo.removed" ||
      eventFamily === "snapshot"
      ? eventFamily
      : "unknown"
  );
}

export function validateReplayableUiEvent(
  value: unknown
): Exclude<UiEvent, UiSnapshotEvent> {
  if (isReplayableUiEvent(value)) {
    return value;
  }
  const eventFamily =
    isRecord(value) && typeof value.type === "string" ? value.type : "unknown";
  raiseUiEventPayloadValidationError(
    eventFamily === "bubble.updated" ||
      eventFamily === "bubble.removed" ||
      eventFamily === "repo.updated" ||
      eventFamily === "repo.removed" ||
      eventFamily === "snapshot"
      ? eventFamily
      : "unknown"
  );
}

export function logInvalidUiEventPayload(error: UiEventPayloadValidationError): void {
  console.warn("UI_EVENT_PAYLOAD_INVALID", {
    reasonCode: error.reasonCode,
    eventFamily: error.eventFamily
  });
}

export function logUiEventPayloadDropLimitReached(input: {
  source: "event_log" | "sse_subscriber";
  invalidDropCount: number;
}): void {
  console.warn("UI_EVENT_PAYLOAD_DROP_LIMIT_REACHED", {
    reasonCode: "UI_EVENT_PAYLOAD_DROP_LIMIT_REACHED",
    source: input.source,
    invalidDropCount: input.invalidDropCount
  });
}
