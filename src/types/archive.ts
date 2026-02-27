export const archiveSchemaVersion = 1 as const;

export const archiveStatuses = ["active", "deleted", "purged"] as const;

export type ArchiveStatus = (typeof archiveStatuses)[number];

export interface ArchiveManifest {
  schema_version: typeof archiveSchemaVersion;
  archived_at: string;
  repo_path: string;
  repo_key: string;
  bubble_instance_id: string;
  bubble_id: string;
  source_bubble_dir: string;
  archived_files: string[];
}

export interface ArchiveIndexEntry {
  bubble_instance_id: string;
  bubble_id: string;
  repo_path: string;
  repo_key: string;
  archive_path: string;
  status: ArchiveStatus;
  created_at: string | null;
  deleted_at: string | null;
  purged_at: string | null;
  updated_at: string;
}

export interface ArchiveIndexDocument {
  schema_version: typeof archiveSchemaVersion;
  entries: ArchiveIndexEntry[];
}
