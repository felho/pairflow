import type {
  BubbleRemotePointerStarted
} from "../../../../shared/remote/remoteExecutionTypes.js";
import type {
  DeleteBubbleInput,
  DeleteRemoteBubbleStatusTarget
} from "../../deleteBubbleContract.js";
import type {
  ResolvedBubble,
  ResolvedDeleteDependencies
} from "../types/deleteTypes.js";
import {
  canonicalizeDeleteExecutionPath,
  resolveRemoteDeleteExecutionContextFromEnv
} from "../remote/remoteDeleteExecutionContext.js";

type RemoteDeleteExecutionContext = ReturnType<
  typeof resolveRemoteDeleteExecutionContextFromEnv
>;

export class DeleteRouteResolutionError extends Error {
  public readonly code: string;
  public readonly context: Readonly<Record<string, unknown>>;

  public constructor(input: {
    code: string;
    message: string;
    context: Readonly<Record<string, unknown>>;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "DeleteRouteResolutionError";
    this.code = input.code;
    this.context = input.context;
  }
}

export interface LocalDeleteRouteContext {
  route: "local" | "remote_clone";
  resolved: ResolvedBubble;
  worktreePath: string;
}

export interface RemoteDeleteRouteContext {
  route: "remote";
  resolved: ResolvedBubble;
  remotePointer: BubbleRemotePointerStarted;
  remoteTarget: DeleteRemoteBubbleStatusTarget;
}

export type DeleteRouteContext =
  | LocalDeleteRouteContext
  | RemoteDeleteRouteContext;

function toDeleteRouteResolutionError(input: {
  code: string;
  message: string;
  context: Readonly<Record<string, unknown>>;
  cause?: unknown;
}): DeleteRouteResolutionError {
  return new DeleteRouteResolutionError(input);
}

function getVerifiedRemoteCloneWorkspaceRoot(
  context: RemoteDeleteExecutionContext,
  resolvedRepoPath: string
): string | null {
  if (context?.kind !== "remote_clone") {
    return null;
  }
  if (context.workspaceRoot !== resolvedRepoPath) {
    return null;
  }
  return context.workspaceRoot;
}

function assertSourcePointerAbsentForRemoteClone(input: {
  resolved: ResolvedBubble;
  remotePointer: Awaited<ReturnType<ResolvedDeleteDependencies["readRemotePointer"]>>;
  workspaceRoot: string;
}): void {
  if (input.remotePointer === null) {
    return;
  }

  throw toDeleteRouteResolutionError({
    code: "REMOTE_DELETE_SOURCE_POINTER_PRESENT",
    message:
      `Remote inner delete for '${input.resolved.bubbleId}' refused to continue because source-repo remote artifacts are still present.`,
    context: {
      bubbleId: input.resolved.bubbleId,
      repoPath: input.resolved.repoPath,
      remotePointerKind: input.remotePointer.kind,
      workspaceRoot: input.workspaceRoot
    }
  });
}

function requireStartedRemotePointer(input: {
  resolved: ResolvedBubble;
  remotePointer: Awaited<ReturnType<ResolvedDeleteDependencies["readRemotePointer"]>>;
  workspaceRoot: string | null;
}): BubbleRemotePointerStarted {
  if (input.remotePointer?.kind === "started") {
    return input.remotePointer;
  }

  throw toDeleteRouteResolutionError({
    code: "REMOTE_DELETE_POINTER_NOT_STARTED",
    message:
      `Remote delete for '${input.resolved.bubbleId}' requires a started remote pointer. Run \`pairflow bubble start --id ${input.resolved.bubbleId}\` first.`,
    context: {
      bubbleId: input.resolved.bubbleId,
      repoPath: input.resolved.repoPath,
      remotePointerKind: input.remotePointer?.kind ?? null,
      workspaceRoot: input.workspaceRoot
    }
  });
}

async function resolveSshDeleteRouteContext(input: {
  resolved: ResolvedBubble;
  resolvedRepoPath: string;
  remoteAlias: string;
  dependencies: ResolvedDeleteDependencies;
}): Promise<DeleteRouteContext> {
  const remoteDeleteExecutionContext = resolveRemoteDeleteExecutionContextFromEnv();
  const remotePointer = await input.dependencies.readRemotePointer(
    input.resolved.bubblePaths.remotePointerPath
  );
  const verifiedRemoteCloneWorkspaceRoot = getVerifiedRemoteCloneWorkspaceRoot(
    remoteDeleteExecutionContext,
    input.resolvedRepoPath
  );

  if (verifiedRemoteCloneWorkspaceRoot !== null) {
    assertSourcePointerAbsentForRemoteClone({
      resolved: input.resolved,
      remotePointer,
      workspaceRoot: verifiedRemoteCloneWorkspaceRoot
    });
    return {
      route: "remote_clone",
      resolved: input.resolved,
      worktreePath: input.resolved.repoPath
    };
  }

  const startedPointer = requireStartedRemotePointer({
    resolved: input.resolved,
    remotePointer,
    workspaceRoot: remoteDeleteExecutionContext?.workspaceRoot ?? null
  });
  const remoteTarget = await input.dependencies.resolveRemoteBubbleStatusTarget({
    bubbleId: input.resolved.bubbleId,
    remoteAlias: input.remoteAlias,
    expectedHost: startedPointer.host
  });

  return {
    route: "remote",
    resolved: input.resolved,
    remotePointer: startedPointer,
    remoteTarget
  };
}

export async function resolveDeleteRouteContext(input: {
  deleteInput: DeleteBubbleInput;
  dependencies: ResolvedDeleteDependencies;
}): Promise<DeleteRouteContext> {
  const resolved = await input.dependencies.resolveBubbleById({
    bubbleId: input.deleteInput.bubbleId,
    ...(input.deleteInput.repoPath !== undefined
      ? { repoPath: input.deleteInput.repoPath }
      : {}),
    ...(input.deleteInput.cwd !== undefined ? { cwd: input.deleteInput.cwd } : {})
  });

  const resolvedRepoPath = canonicalizeDeleteExecutionPath(resolved.repoPath);
  const executor = resolved.bubbleConfig.executor;
  if (executor?.type !== "ssh") {
    return {
      route: "local",
      resolved,
      worktreePath: resolved.bubblePaths.worktreePath
    };
  }

  return resolveSshDeleteRouteContext({
    resolved,
    resolvedRepoPath,
    remoteAlias: executor.remote,
    dependencies: input.dependencies
  });
}
