import { readFile } from "node:fs/promises";

export const REVIEWER_BRIEF_ARTIFACT_FILENAME = "reviewer-brief.md";

export function formatReviewerBriefPrompt(brief: string): string {
  return [
    "Reviewer brief (persisted artifact `reviewer-brief.md`):",
    brief,
    "Treat this reviewer brief as mandatory review context."
  ].join("\n");
}

export function formatReviewerBriefDeliveryReminder(brief: string): string {
  const condensed = brief.replaceAll(/\s+/gu, " ").trim();
  return `Reviewer brief reminder (from reviewer-brief.md): ${condensed}`;
}

export async function readReviewerBriefArtifact(
  artifactPath: string
): Promise<string | undefined> {
  const raw = await readFile(artifactPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (
        error.code === "ENOENT"
        || error.code === "EISDIR"
        || error.code === "ENOTDIR"
      ) {
        return undefined;
      }
      throw error;
    }
  );
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return raw.trimEnd();
}
