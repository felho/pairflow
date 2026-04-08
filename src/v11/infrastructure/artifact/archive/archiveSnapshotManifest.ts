import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ArchiveManifest } from "../../../../types/archive.js";
import { archiveSchemaVersion } from "../../../../types/archive.js";
import {
  isIsoTimestamp,
  isNonEmptyString,
  isRecord
} from "../../../shared/validation/primitives.js";
import {
  ArchivePathCollisionError,
  ArchiveSnapshotError
} from "./archiveSnapshotErrors.js";

const archiveManifestFileName = "archive-manifest.json";

export function getArchiveManifestFileName(): string {
  return archiveManifestFileName;
}

export function parseArchiveManifest(raw: string): ArchiveManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ArchiveSnapshotError(`Invalid archive manifest JSON: ${reason}`, {
      context: {
        reason: "invalid_json"
      }
    });
  }

  if (!isRecord(parsed)) {
    throw new ArchiveSnapshotError("Archive manifest must be a JSON object.", {
      context: {
        reason: "not_a_json_object"
      }
    });
  }

  if (parsed.schema_version !== archiveSchemaVersion) {
    throw new ArchiveSnapshotError(
      `Archive manifest schema_version must be ${archiveSchemaVersion}.`,
      {
        context: {
          field: "schema_version",
          reason: "unsupported_schema_version"
        }
      }
    );
  }

  const fields: Array<keyof ArchiveManifest> = [
    "archived_at",
    "repo_path",
    "repo_key",
    "bubble_instance_id",
    "bubble_id",
    "source_bubble_dir"
  ];
  for (const field of fields) {
    if (!isNonEmptyString(parsed[field])) {
      throw new ArchiveSnapshotError(
        `Archive manifest ${field} must be a non-empty string.`,
        {
          context: {
            field,
            reason: "missing_non_empty_string"
          }
        }
      );
    }
  }

  if (!isIsoTimestamp(parsed.archived_at)) {
    throw new ArchiveSnapshotError(
      "Archive manifest archived_at must be an ISO-8601 UTC timestamp.",
      {
        context: {
          field: "archived_at",
          reason: "invalid_timestamp"
        }
      }
    );
  }

  if (!Array.isArray(parsed.archived_files)) {
    throw new ArchiveSnapshotError("Archive manifest archived_files must be an array.", {
      context: {
        field: "archived_files",
        reason: "not_an_array"
      }
    });
  }
  for (const [index, value] of parsed.archived_files.entries()) {
    if (!isNonEmptyString(value)) {
      throw new ArchiveSnapshotError(
        `Archive manifest archived_files[${index}] must be a non-empty string.`,
        {
          context: {
            field: "archived_files",
            reason: "missing_non_empty_string",
            archiveRelativePath: String(index)
          }
        }
      );
    }
  }

  return {
    schema_version: archiveSchemaVersion,
    archived_at: parsed.archived_at,
    repo_path: parsed.repo_path as string,
    repo_key: parsed.repo_key as string,
    bubble_instance_id: parsed.bubble_instance_id as string,
    bubble_id: parsed.bubble_id as string,
    source_bubble_dir: parsed.source_bubble_dir as string,
    archived_files: parsed.archived_files as string[]
  };
}

export async function loadAndValidateExistingManifest(input: {
  archivePath: string;
  bubbleInstanceId: string;
  normalizedRepoPath: string;
}): Promise<ArchiveManifest> {
  const manifestPath = join(input.archivePath, archiveManifestFileName);
  const raw = await readFile(manifestPath, "utf8");
  const manifest = parseArchiveManifest(raw);

  if (
    manifest.bubble_instance_id !== input.bubbleInstanceId ||
    manifest.repo_path !== input.normalizedRepoPath
  ) {
    throw new ArchivePathCollisionError(
      `ARCHIVE_PATH_COLLISION: context archivePath=${input.archivePath}; archive instance path belongs to bubble_instance_id=${manifest.bubble_instance_id}, repo_path=${manifest.repo_path}; expected bubble_instance_id=${input.bubbleInstanceId}, repo_path=${input.normalizedRepoPath}`,
      {
        context: {
          archivePath: input.archivePath,
          bubbleInstanceId: input.bubbleInstanceId,
          reason: "archive_path_collision"
        }
      }
    );
  }

  return manifest;
}

export async function readArchiveManifest(path: string): Promise<ArchiveManifest> {
  const raw = await readFile(path, "utf8");
  return parseArchiveManifest(raw);
}
