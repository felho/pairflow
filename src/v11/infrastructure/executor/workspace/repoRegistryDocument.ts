import { isIsoTimestamp } from "../../../shared/validation/primitives.js";
import type { RepoRegistryEntry } from "../../../shared/ports/repoRegistry.js";
import { toRepoRegistryError } from "./repoRegistryErrors.js";

export const registryVersion = 1;

interface RepoRegistryDocument {
  version: number;
  repos: RepoRegistryEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw toRepoRegistryError({
      message: `${fieldName} must be a string.`,
      context: {
        fieldName,
        reason: "field_not_string"
      }
    });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw toRepoRegistryError({
      message: `${fieldName} cannot be empty.`,
      context: {
        fieldName,
        reason: "field_empty"
      }
    });
  }
  return trimmed;
}

function parseRegistryEntry(value: unknown, index: number): RepoRegistryEntry {
  if (!isRecord(value)) {
    throw toRepoRegistryError({
      message: `Repo registry entry at index ${index} must be an object.`,
      context: {
        entryIndex: index,
        reason: "entry_not_object"
      }
    });
  }

  const repoPath = requireNonEmptyString(
    value.repoPath,
    `repo registry entry ${index} repoPath`
  );
  const addedAt = requireNonEmptyString(
    value.addedAt,
    `repo registry entry ${index} addedAt`
  );
  if (!isIsoTimestamp(addedAt)) {
    throw toRepoRegistryError({
      message: `repo registry entry ${index} addedAt must be an ISO-8601 UTC timestamp.`,
      context: {
        entryIndex: index,
        fieldName: "addedAt",
        reason: "invalid_timestamp"
      }
    });
  }
  const labelRaw = value.label;
  if (labelRaw !== undefined && typeof labelRaw !== "string") {
    throw toRepoRegistryError({
      message: `repo registry entry ${index} label must be a string when provided.`,
      context: {
        entryIndex: index,
        fieldName: "label",
        reason: "invalid_label_type"
      }
    });
  }
  const label = labelRaw?.trim();
  if (labelRaw !== undefined && label !== undefined && label.length === 0) {
    throw toRepoRegistryError({
      message: `repo registry entry ${index} label cannot be empty when provided.`,
      context: {
        entryIndex: index,
        fieldName: "label",
        reason: "empty_label"
      }
    });
  }
  return {
    repoPath,
    addedAt,
    ...(label !== undefined ? { label } : {})
  };
}

export function parseRegistryDocument(raw: string): RepoRegistryDocument {
  if (raw.trim().length === 0) {
    return {
      version: registryVersion,
      repos: []
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw toRepoRegistryError({
      message: `Invalid repo registry JSON: ${message}`,
      context: {
        reason: "invalid_json"
      },
      cause: error
    });
  }

  if (!isRecord(parsed)) {
    throw toRepoRegistryError({
      message: "Repo registry must be a JSON object.",
      context: {
        reason: "not_a_json_object"
      }
    });
  }

  const versionRaw = parsed.version;
  if (typeof versionRaw !== "number" || !Number.isInteger(versionRaw)) {
    throw toRepoRegistryError({
      message: "Repo registry `version` must be an integer.",
      context: {
        fieldName: "version",
        reason: "invalid_version_type"
      }
    });
  }
  if (versionRaw !== registryVersion) {
    throw toRepoRegistryError({
      message: `Unsupported repo registry version: ${versionRaw}.`,
      context: {
        fieldName: "version",
        reason: "unsupported_version",
        version: versionRaw
      }
    });
  }

  const reposRaw = parsed.repos;
  if (!Array.isArray(reposRaw)) {
    throw toRepoRegistryError({
      message: "Repo registry `repos` must be an array.",
      context: {
        fieldName: "repos",
        reason: "repos_not_array"
      }
    });
  }

  const repos: RepoRegistryEntry[] = reposRaw.map((value, index) =>
    parseRegistryEntry(value, index)
  );

  return {
    version: versionRaw,
    repos
  };
}

export function serializeRegistry(entries: RepoRegistryEntry[]): string {
  const sorted = [...entries].sort((left, right) =>
    left.repoPath.localeCompare(right.repoPath)
  );
  return `${JSON.stringify(
    {
      version: registryVersion,
      repos: sorted
    },
    null,
    2
  )}\n`;
}

export function normalizeLabel(
  label: string | undefined
): string | undefined {
  if (label === undefined) {
    return undefined;
  }
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    throw toRepoRegistryError({
      message: "label cannot be empty.",
      context: {
        fieldName: "label",
        reason: "empty_label"
      }
    });
  }
  return trimmed;
}
