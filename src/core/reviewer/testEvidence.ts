// Temporary bridge: canonical reviewer test-evidence ownership moved to the v11
// shared contract layer plus the infrastructure runtime owner. Remove this shim
// once legacy core imports are migrated.
export * from "../../v11/shared/reviewer/testEvidence.js";
export {
  readReviewerTestEvidenceArtifact,
  resolveReviewerTestExecutionDirective,
  resolveReviewerTestExecutionDirectiveFromArtifact,
  verifyImplementerTestEvidence,
  writeReviewerTestEvidenceArtifact
} from "../../v11/infrastructure/artifact/reviewer/testEvidenceRuntime.js";

