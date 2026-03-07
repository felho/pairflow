import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function writeEvidenceLog(
  worktreePath: string,
  fileName: string,
  content: string
): Promise<string> {
  const evidenceDir = join(worktreePath, ".pairflow", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, fileName);
  await writeFile(path, content, "utf8");
  return path;
}
