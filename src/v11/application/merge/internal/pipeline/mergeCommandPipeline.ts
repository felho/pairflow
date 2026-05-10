import {
  type MergeBubbleResult,
  type RunMergeCommandPipelineInput
} from "../../mergeCommandContract.js";
import type { ResolvedMergeCommandDependencies } from "../../mergeCommandDependencyResolution.js";
import { initializeMergeFlowExecutionContext } from "../flow/mergeFlowContext.js";
import { finalizeMergeFlow } from "../flow/mergeFlowFinalization.js";
import { buildMergeBubbleResult } from "../flow/mergeResultMapping.js";
import { mergeRevisionIntoLocalBase } from "./localMergeStep.js";
import { publishLocalMergeResult } from "./localPublicationStep.js";
import { importStartedRemoteMergeHandoff } from "./remoteMergeHandoffImport.js";

const MERGE_REMOTE_POST_CLEANUP_FLAGS_UNSUPPORTED =
  "MERGE_REMOTE_POST_CLEANUP_FLAGS_UNSUPPORTED";

export async function runMergeCommandPipeline(
  input: RunMergeCommandPipelineInput,
  dependencies: ResolvedMergeCommandDependencies
): Promise<MergeBubbleResult> {
  const context = await initializeMergeFlowExecutionContext({
    params: input,
    dependencies
  });

  if (context.route === "remote") {
    if (input.push || input.deleteRemote) {
      throw input.createError({
        reasonCode: MERGE_REMOTE_POST_CLEANUP_FLAGS_UNSUPPORTED,
        message:
          `Started-remote merge for '${context.resolved.bubbleId}' does not support --push or --delete-remote in pre-cleanup handoff mode.`,
        context: {
          command_name: "merge",
          bubble_id: context.resolved.bubbleId,
          push_requested: input.push,
          delete_remote_requested: input.deleteRemote
        }
      });
    }

    const remoteResult = await dependencies.executeRemoteBubbleMergeCommand({
      bubbleId: context.resolved.bubbleId,
      remoteClonePath: context.remotePointer.remoteClonePath,
      remoteTarget: context.remoteTarget,
      baseBranch: context.baseBranch,
      bubbleBranch: context.bubbleBranch,
      tmuxSessionName: context.remotePointer.tmuxSession
    });
    const importedRevision = await importStartedRemoteMergeHandoff({
      context,
      remoteResult,
      runGit: dependencies.runGit,
      createError: input.createError
    });
    const mergeCommitSha = await mergeRevisionIntoLocalBase({
      repoPath: context.repoPath,
      baseBranch: context.baseBranch,
      mergeRevision: importedRevision,
      bubbleBranch: context.bubbleBranch,
      runGit: dependencies.runGit,
      createError: input.createError
    });

    const finalization = await finalizeMergeFlow({
      params: input,
      context,
      dependencies,
      mergeCommitSha,
      pushedBaseBranch: false,
      deletedRemoteBranch: false
    });

    return buildMergeBubbleResult({
      bubbleId: context.resolved.bubbleId,
      baseBranch: context.baseBranch,
      bubbleBranch: context.bubbleBranch,
      mergeCommitSha,
      presentationRoute: "started_remote",
      pushedBaseBranch: false,
      deletedRemoteBranch: false,
      cleanupOutcome: finalization.cleanupOutcome
    });
  }

  const mergeCommitSha = await mergeRevisionIntoLocalBase({
    repoPath: context.repoPath,
    baseBranch: context.baseBranch,
    mergeRevision: context.bubbleBranch,
    bubbleBranch: context.bubbleBranch,
    runGit: dependencies.runGit,
    createError: input.createError
  });

  const { pushedBaseBranch, deletedRemoteBranch } =
    await publishLocalMergeResult({
      push: input.push,
      deleteRemote: input.deleteRemote,
      repoPath: context.repoPath,
      baseBranch: context.baseBranch,
      bubbleBranch: context.bubbleBranch,
      runGit: dependencies.runGit,
      createError: input.createError
    });

  const finalization = await finalizeMergeFlow({
    params: input,
    context,
    dependencies,
    mergeCommitSha,
    pushedBaseBranch,
    deletedRemoteBranch
  });

  return buildMergeBubbleResult({
    bubbleId: context.resolved.bubbleId,
    baseBranch: context.baseBranch,
    bubbleBranch: context.bubbleBranch,
    mergeCommitSha,
    presentationRoute: "local",
    pushedBaseBranch,
    deletedRemoteBranch,
    cleanupOutcome: finalization.cleanupOutcome
  });
}
