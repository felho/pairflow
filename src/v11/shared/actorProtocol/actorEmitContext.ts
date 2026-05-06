import type { ResolvedBubbleById } from "../ports/bubbleLookup.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import {
  buildActorEmitContextSnapshot,
  type ActorEmitContextErrorReasonCode,
  type ActorEmitContextSnapshot
} from "./actorEmitContextSupport.js";

export {
  ActorEmitContextError,
  buildOptionalActorActivationProvenance
} from "./actorEmitContextSupport.js";
export type {
  ActorActivationProvenance,
  ActorEmitContextErrorContext,
  ActorEmitContextErrorInput,
  ActorEmitContextErrorReasonCode,
  ActorEmitContextSnapshot
} from "./actorEmitContextSupport.js";
export {
  assertActorEmitContextMatches,
  assertActorEmitContextSnapshotIntegrity
} from "./actorEmitContextAssertions.js";

type ResolveBubbleFromWorkspaceCwd = (cwd: string) => Promise<{
  bubbleId: string;
  repoPath: string;
}>;

interface WorkspaceResolutionDefaultsModule {
  resolveBubbleFromWorkspaceCwd: ResolveBubbleFromWorkspaceCwd;
}

let workspaceResolutionDefaultsModulePromise:
  | Promise<WorkspaceResolutionDefaultsModule>
  | undefined;

function getWorkspaceResolutionDefaultsModulePath(): string {
  return "../../defaults/workspace/workspaceResolutionDefaults.js";
}

async function loadWorkspaceResolutionDefaultsModule():
  Promise<WorkspaceResolutionDefaultsModule> {
  workspaceResolutionDefaultsModulePromise ??= import(
    getWorkspaceResolutionDefaultsModulePath()
  ) as Promise<WorkspaceResolutionDefaultsModule>;
  return workspaceResolutionDefaultsModulePromise;
}

const resolveBubbleFromWorkspaceCwd:
  ResolveBubbleFromWorkspaceCwd = async (...args) => {
    const {
      resolveBubbleFromWorkspaceCwd: resolveBubbleFromWorkspaceCwdDefault
    } = await loadWorkspaceResolutionDefaultsModule();
    return resolveBubbleFromWorkspaceCwdDefault(...args);
  };

async function loadActorEmitContextFromResolvedBubble(
  resolved: ResolvedBubbleById,
  reasonCode: ActorEmitContextErrorReasonCode
): Promise<ActorEmitContextSnapshot> {
  const loadedState = await readStateSnapshot(
    resolved.bubblePaths.statePath
  );
  return buildActorEmitContextSnapshot({
    resolved,
    loadedState,
    reasonCode
  });
}

export async function resolveCompatActorEmitContextFromWorkspace(
  cwd: string = process.cwd()
): Promise<ActorEmitContextSnapshot> {
  const workspace = await resolveBubbleFromWorkspaceCwd(cwd);
  const resolved = await resolveBubbleById({
    bubbleId: workspace.bubbleId,
    repoPath: workspace.repoPath
  });

  return loadActorEmitContextFromResolvedBubble(
    resolved,
    "ACTOR_EMIT_COMPAT_ADAPTER_INVALID"
  );
}

export async function resolveActorEmitContextByBubbleId(input: {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
}): Promise<ActorEmitContextSnapshot> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  return loadActorEmitContextFromResolvedBubble(
    resolved,
    "ACTOR_EMIT_CONTEXT_INVALID"
  );
}
