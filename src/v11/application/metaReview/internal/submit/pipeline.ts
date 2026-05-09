import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../start/startCommandDependencyDefaults.js";
import {
  assertSubmitReworkFindingsArtifactContract,
  buildCanonicalSubmitRunResult,
  writeCanonicalSubmitState
} from "./persistence.js";
import {
  finalizeMetaReviewSubmitResult,
  recoverMetaReviewSubmitRoute
} from "./routing.js";
import { prepareAcceptedMetaReviewSubmit } from "./preparation.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "../../../../shared/metaReview/metaReviewCommandContract.js";

export async function runMetaReviewSubmitPipeline(
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
  const prepared = await prepareAcceptedMetaReviewSubmit({
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

  const canonicalRunResult = buildCanonicalSubmitRunResult({
    bubbleId: prepared.resolved.bubbleId,
    runId: prepared.runId,
    status: prepared.status,
    recommendation: prepared.recommendation,
    summary: prepared.summary,
    reworkTargetMessage: prepared.reworkTargetMessage,
    updatedAt: prepared.now.toISOString(),
    warnings: [],
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
    canonicalRunResult,
    canonicalReportJson: prepared.canonicalReportJson
  });
}
