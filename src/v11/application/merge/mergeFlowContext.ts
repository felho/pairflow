import { resolve } from "node:path";

import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import {
  assertCleanRepoWorkingTree,
  assertMergeBranchEligibility,
  assertMergeStateEligibility
} from "../../shared/merge/mergeRoutingEligibility.js";
import type { ResolvedMergeCommandDependencies } from "../../shared/merge/mergeCommandDependencyResolution.js";
import type { RunMergeFlowInput } from "./mergeFlowTypes.js";

export interface MergeFlowExecutionContext {
  resolved: Awaited<ReturnType<ResolvedMergeCommandDependencies["resolveBubbleById"]>>;
  bubbleIdentity: Awaited<
    ReturnType<ResolvedMergeCommandDependencies["ensureBubbleInstanceIdForMutation"]>
  >;
  loaded: LoadedStateSnapshot;
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
}

export async function initializeMergeFlowExecutionContext(input: {
  params: RunMergeFlowInput;
  dependencies: ResolvedMergeCommandDependencies;
}): Promise<MergeFlowExecutionContext> {
  const resolved = await input.dependencies.resolveBubbleById({
    bubbleId: input.params.bubbleId,
    ...(input.params.repoPath !== undefined ? { repoPath: input.params.repoPath } : {}),
    ...(input.params.cwd !== undefined ? { cwd: input.params.cwd } : {})
  });
  const bubbleIdentity = await input.dependencies.ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.params.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loaded = await input.dependencies.readStateSnapshot(resolved.bubblePaths.statePath);
  assertMergeStateEligibility(loaded.state, input.params.createError);

  const repoPath = resolve(resolved.repoPath);
  const baseBranch = resolved.bubbleConfig.base_branch;
  const bubbleBranch = resolved.bubbleConfig.bubble_branch;

  await assertCleanRepoWorkingTree(repoPath, input.dependencies.runGit, input.params.createError);

  const baseBranchExists = await input.dependencies.branchExists(repoPath, baseBranch);
  const bubbleBranchExists = await input.dependencies.branchExists(repoPath, bubbleBranch);
  assertMergeBranchEligibility({
    baseBranch,
    bubbleBranch,
    baseBranchExists,
    bubbleBranchExists,
    createError: input.params.createError
  });

  return {
    resolved,
    bubbleIdentity,
    loaded,
    repoPath,
    baseBranch,
    bubbleBranch
  };
}
