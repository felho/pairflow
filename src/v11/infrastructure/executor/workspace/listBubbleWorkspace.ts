import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function listBubbleIds(repoPath: string): Promise<string[]> {
  const root = join(repoPath, ".pairflow", "bubbles");
  const entries = await readdir(root, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  );

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export async function readBubbleTomlArtifact(path: string): Promise<string> {
  return readFile(path, "utf8");
}
