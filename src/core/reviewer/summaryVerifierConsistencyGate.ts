// Temporary bridge: canonical summary-verifier consistency-gate ownership moved
// to `src/v11/shared/reviewer/summaryVerifierConsistencyGate.ts`. Remove this
// shim once legacy core imports are migrated.
export * from "../../v11/shared/reviewer/summaryVerifierConsistencyGate.js";
export {
  writeSummaryVerifierConsistencyGateArtifact
} from "../../v11/infrastructure/artifact/reviewer/summaryVerifierConsistencyGateArtifacts.js";
