// Temporary bridge: canonical reviewer brief ownership moved to
// `src/v11/shared/reviewer/reviewerBrief.ts`. Remove this shim once legacy core
// imports are migrated.
export * from "../../v11/shared/reviewer/reviewerBrief.js";
export {
  readReviewerBriefArtifact,
  readReviewerFocusArtifact
} from "../../v11/infrastructure/artifact/reviewer/reviewerBriefArtifacts.js";
