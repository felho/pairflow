import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { AdmittedTemplate, TemplateRef } from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { GateCatalog } from "../ports/index.js";
import { TemplateLoadError } from "./errors.js";
import { loadTemplate } from "./load.js";

/**
 * Packet ch8-P1 (S1–S4/draft C26–C28): the directory-backed pinned
 * DefinitionStore. Identity is BYTE-EXACT against the directory
 * LISTING (`readdir` + string equality) — never OS path resolution,
 * which is case-insensitive on the default macOS filesystem (probe
 * P12). The only path ever opened is the directory joined with a
 * MATCHED listing entry: the REF never contributes a path segment to
 * an open. The listing is FRESH per load — no process-local cache is
 * authority (REV-B). Missing (no match) resolves null; present-but-
 * failing ANYTHING rejects TYPED — invalid or unreadable is never
 * conflated with absent (S3). An unlistable directory is the read
 * stage's OS half over the DIRECTORY path (S4), never null.
 */
function osCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error).code;
    if (typeof code === "string") {
      return code;
    }
  }
  return "UNKNOWN";
}

export function createFileDefinitionStore(
  templatesDir: string,
  catalog: GateCatalog,
): DefinitionStore {
  return {
    async load(ref: TemplateRef): Promise<AdmittedTemplate | null> {
      let entries: string[];
      try {
        entries = await readdir(templatesDir);
      } catch (error) {
        throw new TemplateLoadError({
          stage: "read",
          findings: [
            {
              stage: "read",
              path: templatesDir,
              code: osCode(error),
              message: "cannot list the templates directory",
            },
          ],
        });
      }
      // The requested ref is NOT prevalidated (S1): its rendered name
      // either byte-exact-matches a listing entry or the load misses.
      const filename = `${ref.id}@${String(ref.version)}.yaml`;
      if (!entries.includes(filename)) {
        return null;
      }
      const filePath = join(templatesDir, filename);
      let fileBytes: Uint8Array;
      try {
        fileBytes = await readFile(filePath);
      } catch (error) {
        throw new TemplateLoadError({
          stage: "read",
          findings: [
            {
              stage: "read",
              path: filePath,
              code: osCode(error),
              message: "cannot read the template file",
            },
          ],
        });
      }
      const result = loadTemplate(fileBytes, { path: filePath, catalog });
      if (!result.ok) {
        throw new TemplateLoadError(result.error);
      }
      // The store's OWN stage (S2/draft C27), running AFTER validate:
      // the declared ref block is the authority; a mismatch with the
      // matched filename is a load error — neither side silently trusted.
      const template = result.template;
      if (template.ref.id !== ref.id || template.ref.version !== ref.version) {
        throw new TemplateLoadError({
          stage: "store",
          findings: [
            {
              path: "ref",
              message: `declared ref "${template.ref.id}@${String(template.ref.version)}" does not match the filename "${filename}"`,
            },
          ],
        });
      }
      return template;
    },
  };
}
