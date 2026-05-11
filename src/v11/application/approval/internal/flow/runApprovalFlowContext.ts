import type {
  BubbleRemotePointer,
  BubbleRemotePointerStarted
} from "../../../../shared/remote/remoteExecutionTypes.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshotTypes.js";
import type { ApprovalRemoteBubbleStatusTarget } from "../remote/remoteApprovalCommandPort.js";
import type { ResolvedApprovalCommandDependencies } from "../command/approvalCommandDependencies.js";
import type {
  RequestReworkRemoteFallbackDiagnostic
} from "../remote/requestReworkRemoteCloneSupport.js";
import {
  canonicalizeApprovalExecutionPath,
  resolveRemoteApprovalExecutionContextFromEnv
} from "../remote/remoteApprovalExecutionContext.js";
import {
  isWorkspaceResolutionReason,
  resolveCloneRootFallbackDiagnostic,
  resolveRequestReworkExecutionPathIdentities as resolveRequestReworkExecutionPathIdentitiesSupport,
  workspaceRepoMatchesResolvedRepo
} from "../remote/requestReworkRemoteCloneSupport.js";

export interface LocalApprovalFlowExecutionContext {
  route: "local";
  resolved: Awaited<ReturnType<ResolvedApprovalCommandDependencies["resolveBubbleById"]>>;
  loadedState: Awaited<ReturnType<ResolvedApprovalCommandDependencies["readStateSnapshot"]>>;
  state: BubbleStateSnapshot;
  nowIso: string;
  lockPath: string;
}
export interface RemoteApprovalFlowExecutionContext {
  route: "remote";
  resolved: Awaited<ReturnType<ResolvedApprovalCommandDependencies["resolveBubbleById"]>>;
  remotePointer: BubbleRemotePointerStarted;
  remoteTarget: ApprovalRemoteBubbleStatusTarget;
  requestReworkRemoteFallbackDiagnostic?: RequestReworkRemoteFallbackDiagnostic;
  nowIso: string;
  lockPath: string;
}

export type ApprovalFlowExecutionContext =
  | LocalApprovalFlowExecutionContext
  | RemoteApprovalFlowExecutionContext;
interface ApprovalFlowBaseResolution {
  resolved: Awaited<ReturnType<ResolvedApprovalCommandDependencies["resolveBubbleById"]>>;
  nowIso: string;
  lockPath: string;
}

type ResolvedWorkspaceFromCwd =
  Awaited<
    ReturnType<ResolvedApprovalCommandDependencies["resolveBubbleFromWorkspaceCwd"]>
  >;
async function resolveWorkspaceAuthorityForRequestRework(input: {
  base: ApprovalFlowBaseResolution;
  createError: PairflowCreateCommandError;
  dependencies: ResolvedApprovalCommandDependencies;
  cwd?: string | undefined;
}): Promise<ResolvedWorkspaceFromCwd | undefined> {
  try {
    return await input.dependencies.resolveBubbleFromWorkspaceCwd(input.cwd);
  } catch (error) {
    if (isWorkspaceResolutionReason(error, "ambiguous_bubble_config_match")) {
      throw input.createError({
        reasonCode: "APPROVAL_REMOTE_CLONE_CONTEXT_INVALID",
        message:
          `Bubble ${input.base.resolved.bubbleId} could not disambiguate the active workspace authority for local request-rework.`,
        context: {
          command_name: "approval",
          bubble_id: input.base.resolved.bubbleId
        },
        cause: error
      });
    }
    // Any other workspace-resolution failure means we could not prove
    // verified remote-clone authority, so keep the retained remote route.
    return undefined;
  }
}
function assertWorkspaceMatchesBubbleForRequestRework(input: {
  base: ApprovalFlowBaseResolution;
  createError: PairflowCreateCommandError;
  resolvedWorkspace: ResolvedWorkspaceFromCwd;
}): void {
  if (input.resolvedWorkspace.bubbleId === input.base.resolved.bubbleId) {
    return;
  }

  throw input.createError({
    reasonCode: "APPROVAL_REMOTE_CLONE_CONTEXT_INVALID",
    message:
      `Bubble ${input.base.resolved.bubbleId} refused local request-rework because the active workspace resolves to bubble ${input.resolvedWorkspace.bubbleId} instead.`,
    context: {
      command_name: "approval",
      bubble_id: input.base.resolved.bubbleId,
      workspace_bubble_id: input.resolvedWorkspace.bubbleId
    }
  });
}
async function resolveRequestReworkExecutionPathIdentities(input: {
  base: ApprovalFlowBaseResolution;
  resolvedWorkspace: ResolvedWorkspaceFromCwd;
}) {
  return resolveRequestReworkExecutionPathIdentitiesSupport({
    resolvedRepoPath: input.base.resolved.repoPath,
    workspaceRepoPath: input.resolvedWorkspace.repoPath,
    workspaceRootPath: input.resolvedWorkspace.worktreePath
  });
}
function assertWorkspaceRepoAuthorityForRequestRework(input: {
  base: ApprovalFlowBaseResolution;
  createError: PairflowCreateCommandError;
  resolvedRepoPathIdentity: Awaited<
    ReturnType<typeof resolveRequestReworkExecutionPathIdentities>
  >["resolvedRepoPathIdentity"];
  workspaceRepoPathIdentity: Awaited<
    ReturnType<typeof resolveRequestReworkExecutionPathIdentities>
  >["workspaceRepoPathIdentity"];
}): void {
  if (workspaceRepoMatchesResolvedRepo(input)) {
    return;
  }

  throw input.createError({
    reasonCode: "APPROVAL_REMOTE_CLONE_CONTEXT_INVALID",
    message:
      `Bubble ${input.base.resolved.bubbleId} refused local request-rework because the active workspace does not match the canonical bubble repository authority.`,
    context: {
      command_name: "approval",
      bubble_id: input.base.resolved.bubbleId,
      workspace_repo_path: input.workspaceRepoPathIdentity.absolutePath,
      resolved_repo_path: input.resolvedRepoPathIdentity.absolutePath
    }
  });
}
async function hasNoRetainedRemotePointerArtifactsForRequestRework(input: {
  base: ApprovalFlowBaseResolution;
  createError: PairflowCreateCommandError;
  dependencies: ResolvedApprovalCommandDependencies;
}): Promise<boolean> {
  let remotePointer: BubbleRemotePointer | null;
  try {
    remotePointer = await input.dependencies.readRemotePointer(
      input.base.resolved.bubblePaths.remotePointerPath
    );
  } catch (error) {
    throw input.createError({
      reasonCode: "APPROVAL_REMOTE_CLONE_CONTEXT_INVALID",
      message:
        `Bubble ${input.base.resolved.bubbleId} could not verify remote clone control-plane boundaries for local request-rework.`,
      context: {
        command_name: "approval",
        bubble_id: input.base.resolved.bubbleId,
        remote_pointer_path: input.base.resolved.bubblePaths.remotePointerPath
      },
      cause: error
    });
  }

  if (remotePointer === null) {
    return true;
  }

  return false;
}

async function resolveApprovalFlowBaseResolution(input: {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now: Date;
  dependencies: ResolvedApprovalCommandDependencies;
}): Promise<ApprovalFlowBaseResolution> {
  const resolved = await input.dependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const nowIso = input.now.toISOString();
  const lockPath = `${resolved.bubblePaths.locksDir}/${resolved.bubbleId}.lock`;

  return {
    resolved,
    nowIso,
    lockPath
  };
}

async function initializeLocalApprovalFlowExecutionContext(input: {
  base: ApprovalFlowBaseResolution;
  dependencies: ResolvedApprovalCommandDependencies;
}): Promise<LocalApprovalFlowExecutionContext> {
  const loadedState = await input.dependencies.readStateSnapshot(
    input.base.resolved.bubblePaths.statePath
  );

  return {
    route: "local",
    resolved: input.base.resolved,
    loadedState,
    state: loadedState.state,
    nowIso: input.base.nowIso,
    lockPath: input.base.lockPath
  };
}

async function initializeRemoteApprovalFlowExecutionContext(input: {
  base: ApprovalFlowBaseResolution;
  createError: PairflowCreateCommandError;
  dependencies: ResolvedApprovalCommandDependencies;
  requestReworkRemoteFallbackDiagnostic?:
    | RequestReworkRemoteFallbackDiagnostic
    | undefined;
}): Promise<RemoteApprovalFlowExecutionContext> {
  const remoteExecutor = input.base.resolved.bubbleConfig.executor;
  if (remoteExecutor?.type !== "ssh") {
    throw input.createError({
      reasonCode: "APPROVAL_REMOTE_EXECUTOR_REQUIRED",
      message:
        `Remote approval for '${input.base.resolved.bubbleId}' requires an ssh executor configuration.`,
      context: {
        command_name: "approval",
        bubble_id: input.base.resolved.bubbleId,
        executor_type: remoteExecutor?.type ?? "missing"
      }
    });
  }

  const remotePointer = await input.dependencies.readRemotePointer(
    input.base.resolved.bubblePaths.remotePointerPath
  );

  if (remotePointer?.kind !== "started") {
    const fallbackDiagnostic = input.requestReworkRemoteFallbackDiagnostic;
    throw input.createError({
      reasonCode: "APPROVAL_REMOTE_START_REQUIRED",
      message:
        `Remote approval for '${input.base.resolved.bubbleId}' requires a started remote pointer. Run \`pairflow bubble start --id ${input.base.resolved.bubbleId}\` first.`
        + (
          fallbackDiagnostic === undefined
            ? ""
            : ` Local request-rework fallback was not opened because the active workspace '${fallbackDiagnostic.workspaceRootPath}' is inside the verified clone but not at its clone root '${fallbackDiagnostic.workspaceRepoPath}'.`
        ),
      context: {
        command_name: "approval",
        bubble_id: input.base.resolved.bubbleId,
        remote_pointer_kind: remotePointer?.kind ?? "missing",
        ...(fallbackDiagnostic === undefined
          ? {}
          : {
              request_rework_remote_fallback_reason:
                fallbackDiagnostic.reasonCode,
              workspace_repo_path: fallbackDiagnostic.workspaceRepoPath,
              workspace_root_path: fallbackDiagnostic.workspaceRootPath
            })
      }
    });
  }

  const remoteTarget = await input.dependencies.resolveRemoteBubbleStatusTarget({
    bubbleId: input.base.resolved.bubbleId,
    remoteAlias: remoteExecutor.remote,
    expectedHost: remotePointer.host
  });

  return {
    route: "remote",
    resolved: input.base.resolved,
    remotePointer,
    remoteTarget,
    ...(input.requestReworkRemoteFallbackDiagnostic === undefined
      ? {}
      : {
          requestReworkRemoteFallbackDiagnostic:
            input.requestReworkRemoteFallbackDiagnostic
        }),
    nowIso: input.base.nowIso,
    lockPath: input.base.lockPath
  };
}

type VerifiedRemoteCloneRequestReworkResolution =
  | {
      kind: "local";
      execution: LocalApprovalFlowExecutionContext;
    }
  | {
      kind: "fallback";
      diagnostic?: RequestReworkRemoteFallbackDiagnostic;
    };

async function resolveVerifiedRemoteCloneRequestReworkContext(input: {
  base: ApprovalFlowBaseResolution;
  createError: PairflowCreateCommandError;
  dependencies: ResolvedApprovalCommandDependencies;
  cwd?: string | undefined;
}): Promise<VerifiedRemoteCloneRequestReworkResolution> {
  const resolvedWorkspace = await resolveWorkspaceAuthorityForRequestRework({
    base: input.base,
    createError: input.createError,
    dependencies: input.dependencies,
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  if (resolvedWorkspace === undefined) {
    return {
      kind: "fallback"
    };
  }

  assertWorkspaceMatchesBubbleForRequestRework({
    base: input.base,
    createError: input.createError,
    resolvedWorkspace
  });

  const {
    resolvedRepoPathIdentity,
    workspaceRepoPathIdentity,
    workspaceRootIdentity
  } = await resolveRequestReworkExecutionPathIdentities({
    base: input.base,
    resolvedWorkspace
  });

  assertWorkspaceRepoAuthorityForRequestRework({
    base: input.base,
    createError: input.createError,
    resolvedRepoPathIdentity,
    workspaceRepoPathIdentity
  });

  const cloneRootFallbackDiagnostic = resolveCloneRootFallbackDiagnostic({
    workspaceRepoPathIdentity,
    workspaceRootIdentity
  });
  if (cloneRootFallbackDiagnostic !== undefined) {
    return {
      kind: "fallback",
      diagnostic: cloneRootFallbackDiagnostic
    };
  }

  const localFallbackAllowed =
    await hasNoRetainedRemotePointerArtifactsForRequestRework({
      base: input.base,
      createError: input.createError,
      dependencies: input.dependencies
    });
  if (!localFallbackAllowed) {
    return {
      kind: "fallback"
    };
  }

  return {
    kind: "local",
    execution: await initializeLocalApprovalFlowExecutionContext({
      base: input.base,
      dependencies: input.dependencies
    })
  };
}

export async function initializeApprovalFlowExecutionContext(input: {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now: Date;
  createError: PairflowCreateCommandError;
  dependencies: ResolvedApprovalCommandDependencies;
}): Promise<ApprovalFlowExecutionContext> {
  const base = await resolveApprovalFlowBaseResolution(input);
  if (base.resolved.bubbleConfig.executor?.type === "ssh") {
    const remoteApprovalExecutionContext =
      resolveRemoteApprovalExecutionContextFromEnv();
    const resolvedRepoPath = canonicalizeApprovalExecutionPath(
      base.resolved.repoPath
    );
    if (
      remoteApprovalExecutionContext?.kind === "remote_clone"
      && remoteApprovalExecutionContext.workspaceRoot === resolvedRepoPath
    ) {
      const remotePointer = await input.dependencies.readRemotePointer(
        base.resolved.bubblePaths.remotePointerPath
      );
      if (remotePointer !== null) {
        throw input.createError({
          reasonCode: "APPROVAL_REMOTE_CLONE_CONTEXT_INVALID",
          message:
            `Remote inner approval for '${base.resolved.bubbleId}' refused to continue because source-repo remote artifacts are still present.`,
          context: {
            command_name: "approval",
            bubble_id: base.resolved.bubbleId,
            remote_pointer_kind: remotePointer.kind,
            remote_workspace_root: remoteApprovalExecutionContext.workspaceRoot
          }
        });
      }

      return initializeLocalApprovalFlowExecutionContext({
        base,
        dependencies: input.dependencies
      });
    }

    return initializeRemoteApprovalFlowExecutionContext({
      base,
      createError: input.createError,
      dependencies: input.dependencies
    });
  }

  return initializeLocalApprovalFlowExecutionContext({
    base,
    dependencies: input.dependencies
  });
}

export async function initializeRequestReworkFlowExecutionContext(input: {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now: Date;
  createError: PairflowCreateCommandError;
  dependencies: ResolvedApprovalCommandDependencies;
}): Promise<ApprovalFlowExecutionContext> {
  const base = await resolveApprovalFlowBaseResolution(input);

  if (base.resolved.bubbleConfig.executor?.type !== "ssh") {
    return initializeLocalApprovalFlowExecutionContext({
      base,
      dependencies: input.dependencies
    });
  }

  const remoteApprovalExecutionContext =
    resolveRemoteApprovalExecutionContextFromEnv();
  const resolvedRepoPath = canonicalizeApprovalExecutionPath(
    base.resolved.repoPath
  );
  if (
    remoteApprovalExecutionContext?.kind === "remote_clone"
    && remoteApprovalExecutionContext.workspaceRoot === resolvedRepoPath
  ) {
    const remotePointer = await input.dependencies.readRemotePointer(
      base.resolved.bubblePaths.remotePointerPath
    );
    if (remotePointer !== null) {
      throw input.createError({
        reasonCode: "APPROVAL_REMOTE_CLONE_CONTEXT_INVALID",
        message:
          `Remote inner request-rework for '${base.resolved.bubbleId}' refused to continue because source-repo remote artifacts are still present.`,
        context: {
          command_name: "approval",
          bubble_id: base.resolved.bubbleId,
          remote_pointer_kind: remotePointer.kind,
          remote_workspace_root: remoteApprovalExecutionContext.workspaceRoot
        }
      });
    }

    return initializeLocalApprovalFlowExecutionContext({
      base,
      dependencies: input.dependencies
    });
  }

  const verifiedRemoteCloneExecution =
    await resolveVerifiedRemoteCloneRequestReworkContext({
      base,
      createError: input.createError,
      dependencies: input.dependencies,
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    });
  if (verifiedRemoteCloneExecution.kind === "local") {
    return verifiedRemoteCloneExecution.execution;
  }

  return initializeRemoteApprovalFlowExecutionContext({
    base,
    createError: input.createError,
    dependencies: input.dependencies,
    ...(verifiedRemoteCloneExecution.diagnostic === undefined
      ? {}
      : {
          requestReworkRemoteFallbackDiagnostic:
            verifiedRemoteCloneExecution.diagnostic
        })
  });
}
