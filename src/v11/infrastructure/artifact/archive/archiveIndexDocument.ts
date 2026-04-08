import type {
  ArchiveIndexDocument,
  ArchiveIndexEntry,
  ArchiveStatus
} from "../../../../types/archive.js";
import { archiveSchemaVersion, archiveStatuses } from "../../../../types/archive.js";
import {
  isIsoTimestamp,
  isNonEmptyString,
  isRecord
} from "../../../shared/validation/primitives.js";
import { ArchiveIndexError } from "./archiveIndexErrors.js";

function isArchiveStatus(value: unknown): value is ArchiveStatus {
  return (
    typeof value === "string" &&
    (archiveStatuses as readonly string[]).includes(value)
  );
}

function requireEntryString(
  value: Record<string, unknown>,
  field: keyof ArchiveIndexEntry,
  index: number
): string {
  const candidate = value[field];
  if (!isNonEmptyString(candidate)) {
    throw new ArchiveIndexError(
      `archive index entry ${index} ${field} must be a non-empty string.`,
      {
        context: {
          entryIndex: index,
          field,
          reason: "missing_non_empty_string"
        }
      }
    );
  }
  return candidate;
}

function assertTimestampOrNull(
  value: unknown,
  field: string,
  index: number
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isNonEmptyString(value) || !isIsoTimestamp(value)) {
    throw new ArchiveIndexError(
      `archive index entry ${index} ${field} must be null or an ISO-8601 UTC timestamp.`,
      {
        context: {
          entryIndex: index,
          field,
          reason: "invalid_timestamp"
        }
      }
    );
  }
  return value;
}

export function parseArchiveIndex(raw: string): ArchiveIndexDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ArchiveIndexError(`Invalid archive index JSON: ${reason}`, {
      context: {
        reason: "invalid_json"
      }
    });
  }

  if (!isRecord(parsed)) {
    throw new ArchiveIndexError("Archive index must be a JSON object.", {
      context: {
        reason: "not_a_json_object"
      }
    });
  }

  if (parsed.schema_version !== archiveSchemaVersion) {
    throw new ArchiveIndexError(
      `Unsupported archive index schema_version: ${String(parsed.schema_version)}.`,
      {
        context: {
          reason: "unsupported_schema_version",
          archiveIndexPath: "archive-index.json"
        }
      }
    );
  }

  if (!Array.isArray(parsed.entries)) {
    throw new ArchiveIndexError("Archive index entries must be an array.", {
      context: {
        reason: "entries_not_array"
      }
    });
  }

  const entries = parsed.entries.map((value, index): ArchiveIndexEntry => {
    if (!isRecord(value)) {
      throw new ArchiveIndexError(
        `archive index entry ${index} must be an object.`,
        {
          context: {
            entryIndex: index,
            reason: "entry_not_object"
          }
        }
      );
    }

    const bubbleInstanceId = requireEntryString(value, "bubble_instance_id", index);
    const bubbleId = requireEntryString(value, "bubble_id", index);
    const repoPath = requireEntryString(value, "repo_path", index);
    const repoKey = requireEntryString(value, "repo_key", index);
    const archivePath = requireEntryString(value, "archive_path", index);
    const updatedAt = requireEntryString(value, "updated_at", index);

    if (!isArchiveStatus(value.status)) {
      throw new ArchiveIndexError(
        `archive index entry ${index} status must be one of: ${archiveStatuses.join("|")}.`,
        {
          context: {
            entryIndex: index,
            field: "status",
            reason: "invalid_status"
          }
        }
      );
    }

    if (!isIsoTimestamp(updatedAt)) {
      throw new ArchiveIndexError(
        `archive index entry ${index} updated_at must be an ISO-8601 UTC timestamp.`,
        {
          context: {
            entryIndex: index,
            field: "updated_at",
            reason: "invalid_timestamp"
          }
        }
      );
    }

    return {
      bubble_instance_id: bubbleInstanceId,
      bubble_id: bubbleId,
      repo_path: repoPath,
      repo_key: repoKey,
      archive_path: archivePath,
      status: value.status,
      created_at: assertTimestampOrNull(value.created_at, "created_at", index),
      deleted_at: assertTimestampOrNull(value.deleted_at, "deleted_at", index),
      purged_at: assertTimestampOrNull(value.purged_at, "purged_at", index),
      updated_at: updatedAt
    };
  });

  return {
    schema_version: archiveSchemaVersion,
    entries
  };
}

function compareDeletedDesc(left: string | null, right: string | null): number {
  if (left === right) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return right.localeCompare(left);
}

function sortEntries(entries: ArchiveIndexEntry[]): ArchiveIndexEntry[] {
  return [...entries].sort((left, right) => {
    const byDeleted = compareDeletedDesc(left.deleted_at, right.deleted_at);
    if (byDeleted !== 0) {
      return byDeleted;
    }
    return left.bubble_instance_id.localeCompare(right.bubble_instance_id);
  });
}

export function serializeArchiveIndex(entries: ArchiveIndexEntry[]): string {
  return `${JSON.stringify(
    {
      schema_version: archiveSchemaVersion,
      entries: sortEntries(entries)
    },
    null,
    2
  )}\n`;
}

export function normalizeCreatedAt(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isIsoTimestamp(value)) {
    throw new ArchiveIndexError("createdAt must be an ISO-8601 UTC timestamp.", {
      context: {
        field: "createdAt",
        reason: "invalid_timestamp"
      }
    });
  }
  return value;
}
