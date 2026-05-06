import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../shared/ports/reviewerArtifacts.js";

interface ReviewerArtifactDefaultsModule {
  readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
}

let reviewerArtifactDefaultsModulePromise:
  | Promise<ReviewerArtifactDefaultsModule>
  | undefined;

function getReviewerArtifactDefaultsModulePath(): string {
  return "../../defaults/reviewer/reviewerArtifactDefaults.js";
}

async function loadReviewerArtifactDefaultsModule():
  Promise<ReviewerArtifactDefaultsModule> {
  reviewerArtifactDefaultsModulePromise ??= import(
    getReviewerArtifactDefaultsModulePath()
  ) as Promise<ReviewerArtifactDefaultsModule>;
  return reviewerArtifactDefaultsModulePromise;
}

export const readReviewerBriefArtifact:
  ReadReviewerBriefArtifactPort = async (...args) => {
    const { readReviewerBriefArtifact: readReviewerBriefArtifactDefault } =
      await loadReviewerArtifactDefaultsModule();
    return readReviewerBriefArtifactDefault(...args);
  };

export const readReviewerFocusArtifact:
  ReadReviewerFocusArtifactPort = async (...args) => {
    const { readReviewerFocusArtifact: readReviewerFocusArtifactDefault } =
      await loadReviewerArtifactDefaultsModule();
    return readReviewerFocusArtifactDefault(...args);
  };
