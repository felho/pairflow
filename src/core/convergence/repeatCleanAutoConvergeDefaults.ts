import { readStateSnapshot } from "../state/stateStore.js";
import { writeReviewVerificationArtifactAtomic } from "../../v11/shared/reviewer/reviewVerificationArtifactReaders.js";

export const repeatCleanAutoConvergeDefaults = {
  readStateSnapshot,
  writeReviewVerificationArtifactAtomic
} as const;
