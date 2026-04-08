import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { ArchiveIndexDocument, ArchiveIndexEntry } from "../../../../types/archive.js";
import { archiveSchemaVersion } from "../../../../types/archive.js";
import { parseArchiveIndex, serializeArchiveIndex } from "./archiveIndexDocument.js";

export async function readArchiveIndex(
  archiveIndexPath: string
): Promise<ArchiveIndexDocument> {
  const raw = await readFile(archiveIndexPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  );
  if (raw === null) {
    return {
      schema_version: archiveSchemaVersion,
      entries: []
    };
  }
  return parseArchiveIndex(raw);
}

export async function atomicWriteArchiveIndex(
  archiveIndexPath: string,
  entries: ArchiveIndexEntry[]
): Promise<void> {
  const parent = dirname(archiveIndexPath);
  await mkdir(parent, { recursive: true });

  const tempPath = join(parent, `.archive-index-${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, serializeArchiveIndex(entries), {
      encoding: "utf8"
    });
    await rename(tempPath, archiveIndexPath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}
