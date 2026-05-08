import type {
  RuntimeMetaReviewerPaneBinding,
  RuntimeSessionRecord,
  RuntimeSessionsRegistry
} from "../../../ports/runtimeSessions.js";
import { workModes } from "../../../../types/bubble.js";
import type { WorkspaceKind } from "../../../ports/worktreeWorkspace.js";
import {
  toRuntimeSessionsRegistryError
} from "./runtimeSessionsRegistryErrors.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw toRuntimeSessionsRegistryError({
      message: `${fieldName} must be a string.`,
      context: {
        fieldName,
        reason: "field_not_string"
      }
    });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw toRuntimeSessionsRegistryError({
      message: `${fieldName} cannot be empty.`,
      context: {
        fieldName,
        reason: "field_empty"
      }
    });
  }
  return trimmed;
}

function parseOptionalNonEmptyString(
  value: unknown,
  fieldName: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requireNonEmptyString(value, fieldName);
}

function parseWorkspaceKind(
  value: unknown,
  bubbleId: string
): WorkspaceKind | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    throw toRuntimeSessionsRegistryError({
      message: "runtime session workspaceKind cannot be null.",
      context: {
        bubbleId,
        fieldName: "workspaceKind",
        reason: "workspace_kind_null"
      }
    });
  }
  const workspaceKind = requireNonEmptyString(
    value,
    "runtime session workspaceKind"
  );
  if (!(workModes as readonly string[]).includes(workspaceKind)) {
    throw toRuntimeSessionsRegistryError({
      message:
        `runtime session workspaceKind must be one of ${workModes.join(", ")} ` +
        `(found ${workspaceKind}).`,
      context: {
        bubbleId,
        fieldName: "workspaceKind",
        reason: "invalid_workspace_kind"
      }
    });
  }
  return workspaceKind as WorkspaceKind;
}

function parseMetaReviewerPaneBinding(
  value: unknown,
  bubbleId: string
): RuntimeMetaReviewerPaneBinding | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw toRuntimeSessionsRegistryError({
      message: `Invalid runtime meta-reviewer pane binding for bubble ${bubbleId}.`,
      context: {
        bubbleId,
        fieldName: "metaReviewerPane",
        reason: "binding_not_object"
      }
    });
  }
  const role = requireNonEmptyString(
    value.role,
    "runtime session metaReviewerPane.role"
  );
  if (role !== "meta-reviewer") {
    throw toRuntimeSessionsRegistryError({
      message: `runtime session metaReviewerPane.role must be "meta-reviewer" (found ${role}).`,
      context: {
        bubbleId,
        fieldName: "metaReviewerPane.role",
        reason: "invalid_role"
      }
    });
  }
  const paneIndexValue = value.paneIndex;
  if (
    typeof paneIndexValue !== "number" ||
    !Number.isInteger(paneIndexValue) ||
    paneIndexValue < 0
  ) {
    throw toRuntimeSessionsRegistryError({
      message: "runtime session metaReviewerPane.paneIndex must be a non-negative integer.",
      context: {
        bubbleId,
        fieldName: "metaReviewerPane.paneIndex",
        reason: "invalid_pane_index"
      }
    });
  }
  const activeValue = value.active;
  if (typeof activeValue !== "boolean") {
    throw toRuntimeSessionsRegistryError({
      message: "runtime session metaReviewerPane.active must be a boolean.",
      context: {
        bubbleId,
        fieldName: "metaReviewerPane.active",
        reason: "invalid_active_type"
      }
    });
  }
  const updatedAt = requireNonEmptyString(
    value.updatedAt,
    "runtime session metaReviewerPane.updatedAt"
  );
  return {
    role: "meta-reviewer",
    paneIndex: paneIndexValue,
    active: activeValue,
    updatedAt
  };
}

function parseSessionRecord(
  bubbleIdFromKey: string,
  value: unknown
): RuntimeSessionRecord {
  if (!isRecord(value)) {
    throw toRuntimeSessionsRegistryError({
      message: `Invalid runtime session record for bubble ${bubbleIdFromKey}.`,
      context: {
        bubbleId: bubbleIdFromKey,
        reason: "record_not_object"
      }
    });
  }

  const bubbleId = requireNonEmptyString(value.bubbleId, "runtime session bubbleId");
  const repoPath = requireNonEmptyString(value.repoPath, "runtime session repoPath");
  const worktreePath = requireNonEmptyString(
    value.worktreePath,
    "runtime session worktreePath"
  );
  const workspacePath = parseOptionalNonEmptyString(
    value.workspacePath,
    "runtime session workspacePath"
  );
  const workspaceKind = parseWorkspaceKind(value.workspaceKind, bubbleId);
  const tmuxSessionName = requireNonEmptyString(
    value.tmuxSessionName,
    "runtime session tmuxSessionName"
  );
  const updatedAt = requireNonEmptyString(value.updatedAt, "runtime session updatedAt");
  const metaReviewerPane = parseMetaReviewerPaneBinding(
    value.metaReviewerPane,
    bubbleId
  );

  if (bubbleId !== bubbleIdFromKey) {
    throw toRuntimeSessionsRegistryError({
      message: `Runtime session key mismatch: expected ${bubbleIdFromKey}, found ${bubbleId}.`,
      context: {
        bubbleId: bubbleIdFromKey,
        fieldName: "bubbleId",
        reason: "key_mismatch"
      }
    });
  }

  return {
    bubbleId,
    repoPath,
    worktreePath,
    ...(workspacePath !== undefined ? { workspacePath } : {}),
    ...(workspaceKind !== undefined ? { workspaceKind } : {}),
    tmuxSessionName,
    updatedAt,
    ...(metaReviewerPane !== undefined ? { metaReviewerPane } : {})
  };
}

export function parseRuntimeSessionsRegistry(raw: string): RuntimeSessionsRegistry {
  if (raw.trim().length === 0) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw toRuntimeSessionsRegistryError({
      message: `Invalid runtime sessions JSON: ${message}`,
      context: {
        reason: "invalid_json"
      },
      cause: error
    });
  }

  if (!isRecord(parsed)) {
    throw toRuntimeSessionsRegistryError({
      message: "Runtime sessions registry must be a JSON object.",
      context: {
        reason: "not_a_json_object"
      }
    });
  }

  const registry: RuntimeSessionsRegistry = {};
  for (const [key, value] of Object.entries(parsed)) {
    registry[key] = parseSessionRecord(key, value);
  }
  return registry;
}

export function serializeRuntimeSessionsRegistry(
  registry: RuntimeSessionsRegistry
): string {
  const orderedEntries = Object.entries(registry).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `${JSON.stringify(Object.fromEntries(orderedEntries), null, 2)}\n`;
}

export function buildSessionRecord(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  workspacePath?: string;
  workspaceKind?: WorkspaceKind;
  tmuxSessionName: string;
  metaReviewerPane?: RuntimeMetaReviewerPaneBinding;
  now?: Date | undefined;
}): RuntimeSessionRecord {
  const bubbleId = requireNonEmptyString(input.bubbleId, "bubbleId");
  const record: RuntimeSessionRecord = {
    bubbleId,
    repoPath: requireNonEmptyString(input.repoPath, "repoPath"),
    worktreePath: requireNonEmptyString(input.worktreePath, "worktreePath"),
    tmuxSessionName: requireNonEmptyString(input.tmuxSessionName, "tmuxSessionName"),
    updatedAt: (input.now ?? new Date()).toISOString(),
  };

  if (input.workspacePath !== undefined) {
    record.workspacePath = requireNonEmptyString(
      input.workspacePath,
      "workspacePath"
    );
  }

  if (input.workspaceKind !== undefined) {
    const workspaceKind = parseWorkspaceKind(input.workspaceKind, bubbleId);
    if (workspaceKind !== undefined) {
      record.workspaceKind = workspaceKind;
    }
  }

  if (input.metaReviewerPane !== undefined) {
    record.metaReviewerPane = input.metaReviewerPane;
  }

  return record;
}
