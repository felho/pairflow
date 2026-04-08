import { readFile } from "node:fs/promises";

import {
  archiveSchemaVersion,
  archiveStatuses
} from "../../../../../types/archive.js";
import {
  isIsoTimestamp,
  isNonEmptyString,
  isRecord
} from "../../../../shared/validation/primitives.js";
import type {
  MetricsReportArchiveContext,
  MetricsReportWarningCounts
} from "../../../../shared/metrics/report/types.js";
import { incrementWarningCount } from "../../../../shared/metrics/report/warnings.js";

function createEmptyContext(indexPath: string): MetricsReportArchiveContext {
  return {
    available: false,
    index_path: indexPath,
    total_entries: 0,
    considered_entries: 0,
    status_counts: {
      active: 0,
      deleted: 0,
      purged: 0
    },
    missing_updated_at_count: 0
  };
}

function isArchiveStatus(value: unknown): value is "active" | "deleted" | "purged" {
  return (
    typeof value === "string" &&
    (archiveStatuses as readonly string[]).includes(value)
  );
}

function validateNullableTimestamp(
  value: unknown,
  warningCounts: MetricsReportWarningCounts,
  warningCode: string
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isNonEmptyString(value) || !isIsoTimestamp(value)) {
    incrementWarningCount(warningCounts, warningCode);
    return null;
  }
  return value;
}

async function readArchiveIndex(
  indexPath: string,
  warningCounts: MetricsReportWarningCounts
): Promise<string | null> {
  return readFile(indexPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      incrementWarningCount(warningCounts, "archive_index_missing");
      return null;
    }
    throw error;
  });
}

function parseArchiveIndexJson(
  raw: string,
  fallback: MetricsReportArchiveContext,
  warningCounts: MetricsReportWarningCounts,
  repoPath?: string
): { context: MetricsReportArchiveContext; available: boolean } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    incrementWarningCount(warningCounts, "archive_index_invalid_json");
    return { context: fallback, available: false };
  }

  if (!isRecord(parsed)) {
    incrementWarningCount(warningCounts, "archive_index_invalid_root");
    return { context: fallback, available: false };
  }

  if (parsed.schema_version !== archiveSchemaVersion) {
    incrementWarningCount(warningCounts, "archive_index_invalid_schema_version");
    return { context: fallback, available: false };
  }

  if (!Array.isArray(parsed.entries)) {
    incrementWarningCount(warningCounts, "archive_index_invalid_entries");
    return { context: fallback, available: false };
  }

  const context: MetricsReportArchiveContext = {
    ...fallback,
    available: true,
    total_entries: parsed.entries.length
  };
  const seenBubbleInstanceIds = new Set<string>();

  for (const entry of parsed.entries) {
    if (!isRecord(entry)) {
      incrementWarningCount(warningCounts, "archive_index_invalid_entry");
      continue;
    }

    if (!isNonEmptyString(entry.bubble_instance_id)) {
      incrementWarningCount(
        warningCounts,
        "archive_index_entry_missing_bubble_instance_id"
      );
      continue;
    }
    if (!isNonEmptyString(entry.repo_path)) {
      incrementWarningCount(warningCounts, "archive_index_entry_missing_repo_path");
      continue;
    }
    if (!isArchiveStatus(entry.status)) {
      incrementWarningCount(warningCounts, "archive_index_entry_invalid_status");
      continue;
    }

    if (repoPath !== undefined && entry.repo_path !== repoPath) {
      continue;
    }

    context.considered_entries += 1;
    if (seenBubbleInstanceIds.has(entry.bubble_instance_id)) {
      incrementWarningCount(
        warningCounts,
        "archive_index_duplicate_bubble_instance_id"
      );
    } else {
      seenBubbleInstanceIds.add(entry.bubble_instance_id);
    }

    context.status_counts[entry.status] += 1;

    const updatedAt = entry.updated_at;
    if (updatedAt === undefined || updatedAt === null) {
      context.missing_updated_at_count += 1;
      incrementWarningCount(warningCounts, "archive_index_entry_missing_updated_at");
    } else if (!isNonEmptyString(updatedAt) || !isIsoTimestamp(updatedAt)) {
      context.missing_updated_at_count += 1;
      incrementWarningCount(warningCounts, "archive_index_entry_invalid_updated_at");
    }

    validateNullableTimestamp(
      entry.created_at,
      warningCounts,
      "archive_index_entry_invalid_created_at"
    );
    validateNullableTimestamp(
      entry.deleted_at,
      warningCounts,
      "archive_index_entry_invalid_deleted_at"
    );
    validateNullableTimestamp(
      entry.purged_at,
      warningCounts,
      "archive_index_entry_invalid_purged_at"
    );
  }

  return { context, available: true };
}

export async function loadArchiveReportContext(input: {
  indexPath: string;
  warningCounts: MetricsReportWarningCounts;
  repoPath?: string;
}): Promise<MetricsReportArchiveContext> {
  const fallback = createEmptyContext(input.indexPath);
  const raw = await readArchiveIndex(input.indexPath, input.warningCounts);
  if (raw === null) {
    return fallback;
  }

  const parsed = parseArchiveIndexJson(
    raw,
    fallback,
    input.warningCounts,
    input.repoPath
  );
  return parsed.context;
}

export { createEmptyContext as createEmptyArchiveReportContext };
