import type { WriteSummaryVerifierConsistencyGateArtifactPort } from "../../shared/ports/summaryVerifierGateArtifacts.js";

interface SummaryVerifierConsistencyGateDefaultsModule {
  writeSummaryVerifierConsistencyGateArtifact:
    WriteSummaryVerifierConsistencyGateArtifactPort;
}

let summaryVerifierConsistencyGateDefaultsModulePromise:
  | Promise<SummaryVerifierConsistencyGateDefaultsModule>
  | undefined;

function getSummaryVerifierConsistencyGateDefaultsModulePath(): string {
  return "../../defaults/reviewer/summaryVerifierConsistencyGateDefaults.js";
}

async function loadSummaryVerifierConsistencyGateDefaultsModule():
  Promise<SummaryVerifierConsistencyGateDefaultsModule> {
  summaryVerifierConsistencyGateDefaultsModulePromise ??= import(
    getSummaryVerifierConsistencyGateDefaultsModulePath()
  ) as Promise<SummaryVerifierConsistencyGateDefaultsModule>;
  return summaryVerifierConsistencyGateDefaultsModulePromise;
}

export const writeSummaryVerifierConsistencyGateArtifact:
  WriteSummaryVerifierConsistencyGateArtifactPort = async (...args) => {
    const {
      writeSummaryVerifierConsistencyGateArtifact:
        writeSummaryVerifierConsistencyGateArtifactDefault
    } = await loadSummaryVerifierConsistencyGateDefaultsModule();
    return writeSummaryVerifierConsistencyGateArtifactDefault(...args);
  };
