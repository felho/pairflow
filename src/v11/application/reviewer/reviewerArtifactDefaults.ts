import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../shared/ports/reviewerArtifacts.js";

let reviewerBriefModulePromise:
  | Promise<{
      readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
      readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
    }>
  | undefined;

async function loadReviewerBriefModule(): Promise<{
  readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
}> {
  reviewerBriefModulePromise ??= import(
    "../../../core/reviewer/reviewerBrief.js"
  );
  return reviewerBriefModulePromise;
}

export async function readReviewerBriefArtifact(
  ...args: Parameters<ReadReviewerBriefArtifactPort>
): Promise<Awaited<ReturnType<ReadReviewerBriefArtifactPort>>> {
  const { readReviewerBriefArtifact } = await loadReviewerBriefModule();
  return readReviewerBriefArtifact(...args);
}

export async function readReviewerFocusArtifact(
  ...args: Parameters<ReadReviewerFocusArtifactPort>
): Promise<Awaited<ReturnType<ReadReviewerFocusArtifactPort>>> {
  const { readReviewerFocusArtifact } = await loadReviewerBriefModule();
  return readReviewerFocusArtifact(...args);
}
