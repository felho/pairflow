import type {
  UiActionAgentName,
  UiActionAgentRole,
  UiActionBubbleState,
  UiActionEvent,
  UiActionExecutionContextRef,
  UiActionProtocolMessageType,
  UiActionProtocolParticipant,
  UiCommitBubbleResult,
  UiDeleteBubbleResult,
  UiMergeBubbleResult
} from "../../../contracts/ui/uiActions.js";
import { bubbleLifecycleStates } from "../../../contracts/kernel/lifecycle.js";
import { internalError, throwApiError } from "./routerHttp.js";

type UiActionResponseName = "commit" | "delete" | "merge";

const lifecycleStates = new Set<string>(bubbleLifecycleStates);

const actionAgentNames = new Set<UiActionAgentName>(["codex", "claude"]);
const actionAgentRoles = new Set<UiActionAgentRole>([
  "implementer",
  "reviewer",
  "meta_reviewer"
]);
const protocolParticipants = new Set<UiActionProtocolParticipant>([
  "codex",
  "claude",
  "orchestrator",
  "human"
]);
const protocolMessageTypes = new Set<UiActionProtocolMessageType>([
  "TASK",
  "PASS",
  "HUMAN_QUESTION",
  "HUMAN_REPLY",
  "CONVERGENCE",
  "APPROVAL_REQUEST",
  "APPROVAL_DECISION",
  "COMMIT_RESULT"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = []
): boolean {
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    // Unknown keys are rejected so response validation cannot become a permissive pass-through for drifted DTOs.
    Object.keys(value).every((key) => allowed.has(key))
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasOptionalString(
  value: Record<string, unknown>,
  key: string
): boolean {
  return value[key] === undefined || typeof value[key] === "string";
}

function hasOptionalStringUnion(
  value: Record<string, unknown>,
  key: string,
  allowed: readonly string[]
): boolean {
  const candidate = value[key];
  return candidate === undefined || allowed.includes(candidate as string);
}

function isExecutionContextRef(
  value: unknown
): value is UiActionExecutionContextRef | null {
  if (value === null) {
    return true;
  }
  return (
    isRecord(value) &&
    hasExactKeys(value, ["handoffId", "executionId"]) &&
    typeof value.handoffId === "string" &&
    typeof value.executionId === "string"
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableActionAgent(value: unknown): value is UiActionAgentName | null {
  return value === null || actionAgentNames.has(value as UiActionAgentName);
}

function isNullableActionRole(value: unknown): value is UiActionAgentRole | null {
  return value === null || actionAgentRoles.has(value as UiActionAgentRole);
}

function isUiActionBubbleState(value: unknown): value is UiActionBubbleState {
  if (!isRecord(value)) {
    return false;
  }
  return (
    hasExactKeys(value, [
      "bubbleId",
      "lifecycleState",
      "round",
      "activeAgent",
      "activeRole",
      "activeSince",
      "lastCommandAt",
      "executionContext"
    ]) &&
    typeof value.bubbleId === "string" &&
    lifecycleStates.has(value.lifecycleState as string) &&
    typeof value.round === "number" &&
    isNullableActionAgent(value.activeAgent) &&
    isNullableActionRole(value.activeRole) &&
    isNullableString(value.activeSince) &&
    isNullableString(value.lastCommandAt) &&
    isExecutionContextRef(value.executionContext)
  );
}

function isUiActionEvent(value: unknown): value is UiActionEvent {
  if (!isRecord(value)) {
    return false;
  }
  const required = [
    "id",
    "timestamp",
    "bubbleId",
    "sender",
    "recipient",
    "type",
    "round",
    "refs"
  ];
  const optional = [
    "summary",
    "question",
    "message",
    "decision",
    "passIntent",
    "findingsClaimState",
    "findingsClaimSource"
  ];
  return (
    hasExactKeys(value, required, optional) &&
    typeof value.id === "string" &&
    typeof value.timestamp === "string" &&
    typeof value.bubbleId === "string" &&
    protocolParticipants.has(value.sender as UiActionProtocolParticipant) &&
    protocolParticipants.has(value.recipient as UiActionProtocolParticipant) &&
    protocolMessageTypes.has(value.type as UiActionProtocolMessageType) &&
    typeof value.round === "number" &&
    isStringArray(value.refs) &&
    hasOptionalString(value, "summary") &&
    hasOptionalString(value, "question") &&
    hasOptionalString(value, "message") &&
    hasOptionalStringUnion(value, "decision", ["approve", "rework"]) &&
    hasOptionalStringUnion(value, "passIntent", [
      "task",
      "review",
      "fix_request"
    ]) &&
    hasOptionalStringUnion(value, "findingsClaimState", [
      "clean",
      "open_findings",
      "unknown"
    ]) &&
    hasOptionalStringUnion(value, "findingsClaimSource", [
      "payload_flags",
      "payload_findings_count",
      "legacy_summary_parser",
      "meta_review_artifact"
    ])
  );
}

function isCommitBubbleResult(value: unknown): value is UiCommitBubbleResult {
  if (!isRecord(value)) {
    return false;
  }
  return (
    hasExactKeys(value, [
      "bubbleId",
      "sequence",
      "event",
      "actionState",
      "commitSha",
      "commitMessage",
      "stagedFiles"
    ]) &&
    typeof value.bubbleId === "string" &&
    typeof value.sequence === "number" &&
    isUiActionEvent(value.event) &&
    isUiActionBubbleState(value.actionState) &&
    typeof value.commitSha === "string" &&
    typeof value.commitMessage === "string" &&
    isStringArray(value.stagedFiles)
  );
}

function isMergeBubbleResult(value: unknown): value is UiMergeBubbleResult {
  if (!isRecord(value)) {
    return false;
  }
  return (
    hasExactKeys(value, [
      "bubbleId",
      "baseBranch",
      "bubbleBranch",
      "mergeCommitSha",
      "presentationRoute",
      "pushedBaseBranch",
      "deletedRemoteBranch",
      "tmuxSessionName",
      "tmuxSessionExisted",
      "runtimeSessionRemoved",
      "removedWorktree",
      "removedBubbleBranch"
    ]) &&
    typeof value.bubbleId === "string" &&
    typeof value.baseBranch === "string" &&
    typeof value.bubbleBranch === "string" &&
    typeof value.mergeCommitSha === "string" &&
    (value.presentationRoute === "local" ||
      value.presentationRoute === "started_remote") &&
    typeof value.pushedBaseBranch === "boolean" &&
    typeof value.deletedRemoteBranch === "boolean" &&
    typeof value.tmuxSessionName === "string" &&
    typeof value.tmuxSessionExisted === "boolean" &&
    typeof value.runtimeSessionRemoved === "boolean" &&
    typeof value.removedWorktree === "boolean" &&
    typeof value.removedBubbleBranch === "boolean"
  );
}

function isDeleteArtifacts(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const worktree = value.worktree;
  const tmux = value.tmux;
  const runtimeSession = value.runtimeSession;
  const branch = value.branch;
  return (
    hasExactKeys(value, ["worktree", "tmux", "runtimeSession", "branch"]) &&
    isRecord(worktree) &&
    hasExactKeys(worktree, ["exists", "path"]) &&
    typeof worktree.exists === "boolean" &&
    typeof worktree.path === "string" &&
    isRecord(tmux) &&
    hasExactKeys(tmux, ["exists", "sessionName"]) &&
    typeof tmux.exists === "boolean" &&
    typeof tmux.sessionName === "string" &&
    isRecord(runtimeSession) &&
    hasExactKeys(runtimeSession, ["exists", "sessionName"]) &&
    typeof runtimeSession.exists === "boolean" &&
    isNullableString(runtimeSession.sessionName) &&
    isRecord(branch) &&
    hasExactKeys(branch, ["exists", "name"]) &&
    typeof branch.exists === "boolean" &&
    typeof branch.name === "string"
  );
}

function isDeleteBubbleResult(value: unknown): value is UiDeleteBubbleResult {
  if (!isRecord(value)) {
    return false;
  }
  return (
    hasExactKeys(value, [
      "bubbleId",
      "deleted",
      "requiresConfirmation",
      "artifacts",
      "tmuxSessionTerminated",
      "runtimeSessionRemoved",
      "removedWorktree",
      "removedBubbleBranch"
    ]) &&
    typeof value.bubbleId === "string" &&
    typeof value.deleted === "boolean" &&
    typeof value.requiresConfirmation === "boolean" &&
    isDeleteArtifacts(value.artifacts) &&
    typeof value.tmuxSessionTerminated === "boolean" &&
    typeof value.runtimeSessionRemoved === "boolean" &&
    typeof value.removedWorktree === "boolean" &&
    typeof value.removedBubbleBranch === "boolean"
  );
}

function invalidActionResponse(action: UiActionResponseName): never {
  throwApiError(
    internalError("Selected UI action response failed validation.", {
      reasonCode: "UI_ACTION_RESPONSE_INVALID",
      action
    })
  );
}

export function validateUiCommitBubbleResult(
  value: unknown
): UiCommitBubbleResult {
  if (!isCommitBubbleResult(value)) {
    invalidActionResponse("commit");
  }
  return value;
}

export function validateUiMergeBubbleResult(
  value: unknown
): UiMergeBubbleResult {
  if (!isMergeBubbleResult(value)) {
    invalidActionResponse("merge");
  }
  return value;
}

export function validateUiDeleteBubbleResult(
  value: unknown
): UiDeleteBubbleResult {
  if (!isDeleteBubbleResult(value)) {
    invalidActionResponse("delete");
  }
  return value;
}
