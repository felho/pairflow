import type {
  BubbleRemotePointerStarted,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { LoadedStateSnapshot } from "../../shared/ports/stateSnapshots.js";
import {
  assertCleanRepoWorkingTree,
  assertMergeBranchEligibility,
  assertMergeStateEligibility
} from "../../shared/merge/mergeRoutingEligibility.js";
import {
  buildMergeImportRef,
  type RemoteMergeStatusTarget
} from "./mergeCommandContract.js";
import type { ResolvedMergeCommandDependencies } from "./mergeCommandDependencyResolution.js";
import type { RunMergeFlowInput } from "./mergeFlowTypes.js";
import {
  canonicalizeMergeExecutionPath,
  resolveRemoteMergeExecutionContextFromEnv
} from "./remoteMergeExecutionContext.js";

interface MergeFlowExecutionContextBase {
  resolved: Awaited<ReturnType<ResolvedMergeCommandDependencies["resolveBubbleById"]>>;
  bubbleIdentity: Awaited<
    ReturnType<ResolvedMergeCommandDependencies["ensureBubbleInstanceIdForMutation"]>
  >;
  loaded: LoadedStateSnapshot;
  state: BubbleStateSnapshot;
  nowIso: string;
  repoPath: string;
}

export interface LocalMergeFlowExecutionContext
  extends MergeFlowExecutionContextBase {
  route: "local";
  baseBranch: string;
  bubbleBranch: string;
}

export interface RemoteMergeFlowExecutionContext
  extends MergeFlowExecutionContextBase {
  route: "remote";
  remotePointer: BubbleRemotePointerStarted;
  remoteTarget: RemoteMergeStatusTarget;
  baseBranch: string;
  bubbleBranch: string;
  localImportRef: string;
}

async function assertRemoteMergeLocalPrerequisites(input: {
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  dependencies: ResolvedMergeCommandDependencies;
  createError: RunMergeFlowInput["createError"];
}): Promise<void> {
  await assertCleanRepoWorkingTree(
    input.repoPath,
    input.dependencies.runGit,
    input.createError
  );

  const baseBranchExists = await input.dependencies.branchExists(
    input.repoPath,
    input.baseBranch
  );
  const bubbleBranchExists = await input.dependencies.branchExists(
    input.repoPath,
    input.bubbleBranch
  );
  assertMergeBranchEligibility({
    baseBranch: input.baseBranch,
    bubbleBranch: input.bubbleBranch,
    baseBranchExists,
    bubbleBranchExists,
    createError: input.createError
  });
}

export type MergeFlowExecutionContext =
  | LocalMergeFlowExecutionContext
  | RemoteMergeFlowExecutionContext;

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
  const state = loaded.state;
  assertMergeStateEligibility(state, input.params.createError);

  const baseBranch = resolved.bubbleConfig.base_branch;
  const bubbleBranch = resolved.bubbleConfig.bubble_branch;
  const nowIso = input.params.nowIso;
  const resolvedRepoPath = canonicalizeMergeExecutionPath(resolved.repoPath);

  if (resolved.bubbleConfig.executor?.type === "ssh") {
    const remoteMergeExecutionContext = resolveRemoteMergeExecutionContextFromEnv();
    const remotePointer = await input.dependencies.readRemotePointer(
      resolved.bubblePaths.remotePointerPath
    );

    if (
      remoteMergeExecutionContext?.kind === "remote_clone"
      && remoteMergeExecutionContext.workspaceRoot === resolvedRepoPath
    ) {
      if (remotePointer !== null) {
        throw input.params.createError({
          reasonCode: "MERGE_REMOTE_START_REQUIRED",
          message:
            `Remote inner merge for '${resolved.bubbleId}' refused to continue because source-repo remote artifacts are still present.`,
          context: {
            command_name: "merge",
            bubble_id: resolved.bubbleId,
            remote_pointer_kind: remotePointer.kind,
            remote_workspace_root: remoteMergeExecutionContext.workspaceRoot
          }
        });
      }
    } else {
      if (remotePointer?.kind !== "started") {
        throw input.params.createError({
          reasonCode: "MERGE_REMOTE_START_REQUIRED",
          message:
            `Remote merge for '${resolved.bubbleId}' requires a started remote pointer. Run \`pairflow bubble start --id ${resolved.bubbleId}\` first.`,
          context: {
            command_name: "merge",
            bubble_id: resolved.bubbleId,
            remote_pointer_kind: remotePointer?.kind ?? "missing"
          }
        });
      }

      const remoteTarget = await input.dependencies.resolveRemoteBubbleStatusTarget({
        bubbleId: resolved.bubbleId,
        remoteAlias: resolved.bubbleConfig.executor.remote,
        expectedHost: remotePointer.host
      });
      await assertRemoteMergeLocalPrerequisites({
        repoPath: resolvedRepoPath,
        baseBranch,
        bubbleBranch,
        dependencies: input.dependencies,
        createError: input.params.createError
      });

      return {
        route: "remote",
        resolved,
        bubbleIdentity,
        loaded,
        state,
        nowIso,
        repoPath: resolvedRepoPath,
        remotePointer,
        remoteTarget,
        baseBranch,
        bubbleBranch,
        localImportRef: buildMergeImportRef(resolved.bubbleId)
      };
    }
  }

  await assertCleanRepoWorkingTree(
    resolvedRepoPath,
    input.dependencies.runGit,
    input.params.createError
  );

  const baseBranchExists = await input.dependencies.branchExists(resolvedRepoPath, baseBranch);
  const bubbleBranchExists = await input.dependencies.branchExists(
    resolvedRepoPath,
    bubbleBranch
  );
  assertMergeBranchEligibility({
    baseBranch,
    bubbleBranch,
    baseBranchExists,
    bubbleBranchExists,
    createError: input.params.createError
  });

  return {
    route: "local",
    resolved,
    bubbleIdentity,
    loaded,
    state,
    nowIso,
    repoPath: resolvedRepoPath,
    baseBranch,
    bubbleBranch
  };
}
