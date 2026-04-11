import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import {
  assertSubmitReworkFindingsArtifactContract,
  buildCanonicalSubmitRunResult,
  writeCanonicalSubmitReportArtifact,
  writeCanonicalSubmitState
} from "./metaReviewCommandSubmitPersistence.js";
import {
  finalizeMetaReviewSubmitResult,
  recoverMetaReviewSubmitRoute
} from "./metaReviewCommandSubmitRouting.js";
import {
  prepareMetaReviewSubmitContext
} from "./metaReviewCommandSubmitPreparation.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "./metaReviewCommandContract.js";

export async function submitMetaReviewResult(
  input: MetaReviewSubmitInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewSubmitResult> {
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const resolvedDependencies: MetaReviewCommandDependencies = {
    ...dependencies,
    readStateSnapshot: readState,
    writeStateSnapshot: writeState
  };
  const prepared = await prepareMetaReviewSubmitContext({
    submitInput: input,
    dependencies: resolvedDependencies,
    now: dependencies.now ?? new Date()
  });

  await writeCanonicalSubmitState({
    resolved: prepared.resolved,
    loadedState: prepared.loadedState,
    submitInput: input,
    recommendation: prepared.recommendation,
    status: prepared.status,
    summary: prepared.summary,
    reworkTargetMessage: prepared.reworkTargetMessage,
    runId: prepared.runId,
    updatedAt: prepared.now.toISOString(),
    readState,
    writeState,
    executionContext: prepared.executionContext
  });

  const warnings = await writeCanonicalSubmitReportArtifact({
    resolved: prepared.resolved,
    submitInput: input,
    runId: prepared.runId,
    updatedAt: prepared.now.toISOString(),
    status: prepared.status,
    recommendation: prepared.recommendation,
    summary: prepared.summary,
    reworkTargetMessage: prepared.reworkTargetMessage,
    canonicalReportJson: prepared.canonicalReportJson,
    writeFileFn: prepared.writeFileFn
  });

  const canonicalRunResult = buildCanonicalSubmitRunResult({
    bubbleId: prepared.resolved.bubbleId,
    runId: prepared.runId,
    status: prepared.status,
    recommendation: prepared.recommendation,
    summary: prepared.summary,
    reworkTargetMessage: prepared.reworkTargetMessage,
    updatedAt: prepared.now.toISOString(),
    warnings,
    reportJson: prepared.canonicalReportJson
  });

  await assertSubmitReworkFindingsArtifactContract({
    bubbleDir: prepared.resolved.bubblePaths.bubbleDir,
    artifactsDir: prepared.resolved.bubblePaths.artifactsDir,
    runResult: canonicalRunResult,
    reportJson: prepared.canonicalReportJson,
    readFileFn: prepared.readFileFn
  });

  const routed = await recoverMetaReviewSubmitRoute({
    resolved: prepared.resolved,
    repoPath: prepared.resolved.repoPath,
    now: prepared.now,
    refs: input.refs ?? [],
    canonicalRunResult,
    dependencies: resolvedDependencies
  });

  return finalizeMetaReviewSubmitResult({
    resolved: prepared.resolved,
    routed,
    dependencies: resolvedDependencies,
    reportRound: input.round,
    canonicalRunResult,
    canonicalReportJson: prepared.canonicalReportJson
  });
}
