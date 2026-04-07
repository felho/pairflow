// Temporary bridge: canonical review-verification artifact IO ownership moved to
// the v11 infrastructure artifact owner. Remove this shim once legacy core
// imports are migrated.
export {
  readReviewVerificationArtifactStatus,
  resolveReviewVerificationInputFromRefs,
  writeReviewVerificationArtifactAtomic
} from "../../v11/infrastructure/artifact/reviewer/reviewVerificationArtifacts.js";
