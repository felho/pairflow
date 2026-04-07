// Temporary bridge: doc-contract gate artifact IO moved to the v11
// infrastructure owner. Keep this shim until legacy consumers are migrated.
export {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../../v11/infrastructure/artifact/gates/docContractGateArtifacts.js";
