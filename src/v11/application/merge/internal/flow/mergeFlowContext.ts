import type {
  BubbleRemotePointerStarted
} from "../../../../shared/remote/remoteExecutionTypes.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import type { LoadedStateSnapshot } from "../../../../ports/stateSnapshots.js";
import {
  assertCleanRepoWorkingTree,
  assertMergeBranchEligibility,
  assertMergeStateEligibility
} from "./mergeRoutingEligibility.js";
import { syncRemoteCommitContinuityArtifacts } from "../../../commit/remoteCommitContinuitySync.js";
import {
  buildMergeImportRef,
  type RemoteMergeStatusTarget
} from "../../mergeCommandContract.js";
import type { RunMergeCommandPipelineInput } from "../preparation/mergeCommandInputNormalization.js";
import type { ResolvedMergeCommandDependencies } from "../preparation/mergeCommandDependencyResolution.js";
import {
  canonicalizeMergeExecutionPath,
  resolveRemoteMergeExecutionContextFromEnv
} from "../remote/remoteMergeExecutionContext.js";

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
  createError: RunMergeCommandPipelineInput["createError"];
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

  // Started-remote merge imports the authoritative handoff ref back into the
  // laptop repo, so it must not require a retained local bubble branch.
  assertMergeBranchEligibility({
    baseBranch: input.baseBranch,
    bubbleBranch: input.bubbleBranch,
    baseBranchExists,
    bubbleBranchExists: true,
    createError: input.createError
  });
}

export type MergeFlowExecutionContext =
  | LocalMergeFlowExecutionContext
  | RemoteMergeFlowExecutionContext;

interface MergeFlowInitializationInput {
  params: RunMergeCommandPipelineInput;
  dependencies: ResolvedMergeCommandDependencies;
}

interface MergeFlowInitializationBase {
  resolved: Awaited<ReturnType<ResolvedMergeCommandDependencies["resolveBubbleById"]>>;
  bubbleIdentity: Awaited<
    ReturnType<ResolvedMergeCommandDependencies["ensureBubbleInstanceIdForMutation"]>
  >;
  loaded: LoadedStateSnapshot;
  state: BubbleStateSnapshot;
  baseBranch: string;
  bubbleBranch: string;
  nowIso: string;
  resolvedRepoPath: string;
}

async function initializeMergeFlowBaseContext(
  input: MergeFlowInitializationInput
): Promise<MergeFlowInitializationBase> {
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

  const baseBranch = resolved.bubbleConfig.base_branch;
  const bubbleBranch = resolved.bubbleConfig.bubble_branch;
  const nowIso = input.params.nowIso;
  const resolvedRepoPath = canonicalizeMergeExecutionPath(resolved.repoPath);

  return {
    resolved,
    bubbleIdentity,
    loaded,
    state,
    baseBranch,
    bubbleBranch,
    nowIso,
    resolvedRepoPath
  };
}

function createLocalMergeFlowExecutionContext(
  base: MergeFlowInitializationBase
): LocalMergeFlowExecutionContext {
  return {
    route: "local",
    resolved: base.resolved,
    bubbleIdentity: base.bubbleIdentity,
    loaded: base.loaded,
    state: base.state,
    nowIso: base.nowIso,
    repoPath: base.resolvedRepoPath,
    baseBranch: base.baseBranch,
    bubbleBranch: base.bubbleBranch
  };
}

async function resolveRemoteMergeFlowExecutionContext(
  input: MergeFlowInitializationInput & {
    base: MergeFlowInitializationBase;
  }
): Promise<RemoteMergeFlowExecutionContext | "continue_local" | null> {
  const { base } = input;
  if (base.resolved.bubbleConfig.executor?.type !== "ssh") {
    return null;
  }

  const remoteMergeExecutionContext = resolveRemoteMergeExecutionContextFromEnv();
  const remotePointer = await input.dependencies.readRemotePointer(
    base.resolved.bubblePaths.remotePointerPath
  );

  if (
    remoteMergeExecutionContext?.kind === "remote_clone"
    && remoteMergeExecutionContext.workspaceRoot === base.resolvedRepoPath
  ) {
    if (remotePointer !== null) {
      throw input.params.createError({
        reasonCode: "MERGE_REMOTE_START_REQUIRED",
        message:
          `Remote inner merge for '${base.resolved.bubbleId}' refused to continue because source-repo remote artifacts are still present.`,
        context: {
          command_name: "merge",
          bubble_id: base.resolved.bubbleId,
          remote_pointer_kind: remotePointer.kind,
          remote_workspace_root: remoteMergeExecutionContext.workspaceRoot
        }
      });
    }
    return "continue_local";
  }

  if (remotePointer?.kind !== "started") {
    throw input.params.createError({
      reasonCode: "MERGE_REMOTE_START_REQUIRED",
      message:
        `Remote merge for '${base.resolved.bubbleId}' requires a started remote pointer. Run \`pairflow bubble start --id ${base.resolved.bubbleId}\` first.`,
      context: {
        command_name: "merge",
        bubble_id: base.resolved.bubbleId,
        remote_pointer_kind: remotePointer?.kind ?? "missing"
      }
    });
  }

  const remoteTarget = await input.dependencies.resolveRemoteBubbleStatusTarget({
    bubbleId: base.resolved.bubbleId,
    remoteAlias: base.resolved.bubbleConfig.executor.remote,
    expectedHost: remotePointer.host
  });

  await assertRemoteMergeLocalPrerequisites({
    repoPath: base.resolvedRepoPath,
    baseBranch: base.baseBranch,
    bubbleBranch: base.bubbleBranch,
    dependencies: input.dependencies,
    createError: input.params.createError
  });

  let loaded = base.loaded;
  let state = base.state;
  if (state.state !== "DONE") {
    const importResult = await importRemoteCommitContinuityForMerge({
      bubbleId: base.resolved.bubbleId,
      remoteClonePath: remotePointer.remoteClonePath,
      remoteTarget,
      statePath: base.resolved.bubblePaths.statePath,
      transcriptPath: base.resolved.bubblePaths.transcriptPath,
      dependencies: input.dependencies,
      createError: input.params.createError
    });
    if (importResult !== null) {
      loaded = importResult.loaded;
      state = importResult.state;
    }
  }

  assertMergeStateEligibility(state, input.params.createError);

  return {
    route: "remote",
    resolved: base.resolved,
    bubbleIdentity: base.bubbleIdentity,
    loaded,
    state,
    nowIso: base.nowIso,
    repoPath: base.resolvedRepoPath,
    remotePointer,
    remoteTarget,
    baseBranch: base.baseBranch,
    bubbleBranch: base.bubbleBranch,
    localImportRef: buildMergeImportRef(base.resolved.bubbleId)
  };
}

async function assertLocalMergePrerequisites(input: MergeFlowInitializationInput & {
  base: MergeFlowInitializationBase;
}): Promise<void> {
  assertMergeStateEligibility(input.base.state, input.params.createError);

  await assertCleanRepoWorkingTree(
    input.base.resolvedRepoPath,
    input.dependencies.runGit,
    input.params.createError
  );

  const baseBranchExists = await input.dependencies.branchExists(
    input.base.resolvedRepoPath,
    input.base.baseBranch
  );
  const bubbleBranchExists = await input.dependencies.branchExists(
    input.base.resolvedRepoPath,
    input.base.bubbleBranch
  );
  assertMergeBranchEligibility({
    baseBranch: input.base.baseBranch,
    bubbleBranch: input.base.bubbleBranch,
    baseBranchExists,
    bubbleBranchExists,
    createError: input.params.createError
  });
}

export async function initializeMergeFlowExecutionContext(
  input: MergeFlowInitializationInput
): Promise<MergeFlowExecutionContext> {
  const base = await initializeMergeFlowBaseContext(input);

  const remoteContext = await resolveRemoteMergeFlowExecutionContext({
    ...input,
    base
  });
  if (remoteContext !== null && remoteContext !== "continue_local") {
    return remoteContext;
  }

  await assertLocalMergePrerequisites({
    ...input,
    base
  });

  return createLocalMergeFlowExecutionContext(base);
}

async function importRemoteCommitContinuityForMerge(input: {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteMergeStatusTarget;
  statePath: string;
  transcriptPath: string;
  dependencies: ResolvedMergeCommandDependencies;
  createError: RunMergeCommandPipelineInput["createError"];
}): Promise<{ loaded: LoadedStateSnapshot; state: BubbleStateSnapshot } | null> {
  let result: Awaited<
    ReturnType<ResolvedMergeCommandDependencies["importRemoteBubbleCommitContinuity"]>
  >;
  try {
    result = await input.dependencies.importRemoteBubbleCommitContinuity({
      bubbleId: input.bubbleId,
      remoteClonePath: input.remoteClonePath,
      remoteTarget: input.remoteTarget
    });
  } catch (error) {
    const code = typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : undefined;
    const reasonCode = code === "REMOTE_COMMIT_TRANSPORT_FAILED"
      ? "MERGE_REMOTE_COMMIT_CONTINUITY_IMPORT_UNAVAILABLE"
      : "MERGE_REMOTE_COMMIT_CONTINUITY_IMPORT_INVALID";
    throw input.createError({
      reasonCode,
      message:
        `Remote commit continuity import failed for '${input.bubbleId}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      context: {
        command_name: "merge",
        bubble_id: input.bubbleId,
        remote_clone_path: input.remoteClonePath
      },
      cause: sanitizeRemoteCommitContinuityImportCauseForMerge(error)
    });
  }

  if (result.classification === "no_remote_completion_evidence") {
    return null;
  }

  try {
    await syncRemoteCommitContinuityArtifacts({
      statePath: input.statePath,
      transcriptPath: input.transcriptPath,
      stateContent: result.stateContent,
      transcriptContent: result.transcriptContent,
      renamePath: input.dependencies.renamePath,
      writeTextFile: input.dependencies.writeTextFile
    });
  } catch (error) {
    throw input.createError({
      reasonCode: "MERGE_REMOTE_COMMIT_CONTINUITY_SYNC_BACK_FAILED",
      message:
        `Remote commit continuity import succeeded for '${input.bubbleId}', but local sync-back failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      context: {
        command_name: "merge",
        bubble_id: input.bubbleId,
        remote_clone_path: input.remoteClonePath,
        state_path: input.statePath,
        transcript_path: input.transcriptPath
      },
      cause: error
    });
  }

  const loaded = await input.dependencies.readStateSnapshot(input.statePath);
  return { loaded, state: loaded.state };
}

function sanitizeRemoteCommitContinuityImportCauseForMerge(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  const context = (error as { context?: unknown }).context;
  if (
    context === undefined ||
    typeof context !== "object" ||
    context === null
  ) {
    return error;
  }

  const sanitized = new Error(error.message, {
    cause: (error as { cause?: unknown }).cause
  });
  sanitized.name = error.name;
  const code = (error as { code?: unknown }).code;
  Object.assign(sanitized, {
    ...(typeof code === "string" ? { code } : {}),
    context: {
      ...(context as Record<string, unknown>),
      command_name: "merge"
    }
  });
  return sanitized;
}
