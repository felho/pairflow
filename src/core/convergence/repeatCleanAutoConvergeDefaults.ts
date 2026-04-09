import { readStateSnapshot } from "../state/stateStore.js";
import { writeReviewVerificationArtifactAtomic } from "../reviewer/reviewVerificationArtifacts.js";

export const repeatCleanAutoConvergeDefaults = {
  readStateSnapshot,
  writeReviewVerificationArtifactAtomic
} as const;
