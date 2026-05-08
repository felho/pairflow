import type {
  ResolveBubbleByIdPort,
  ResolvedBubbleById
} from "../../ports/bubbleLookup.js";
import type { ReadStateSnapshotPort } from "../../ports/stateSnapshots.js";
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

export interface ActorEmitContextResolutionDependencies {
  resolveBubbleFromWorkspaceCwd: ResolveBubbleFromWorkspaceCwd;
  resolveBubbleById: ResolveBubbleByIdPort;
  readStateSnapshot: ReadStateSnapshotPort;
}

async function loadActorEmitContextFromResolvedBubble(
  resolved: ResolvedBubbleById,
  reasonCode: ActorEmitContextErrorReasonCode,
  dependencies: Pick<ActorEmitContextResolutionDependencies, "readStateSnapshot">
): Promise<ActorEmitContextSnapshot> {
  const loadedState = await dependencies.readStateSnapshot(
    resolved.bubblePaths.statePath
  );
  return buildActorEmitContextSnapshot({
    resolved,
    loadedState,
    reasonCode
  });
}

export async function resolveCompatActorEmitContextFromWorkspace(
  cwd: string = process.cwd(),
  dependencies: ActorEmitContextResolutionDependencies
): Promise<ActorEmitContextSnapshot> {
  const workspace = await dependencies.resolveBubbleFromWorkspaceCwd(cwd);
  const resolved = await dependencies.resolveBubbleById({
    bubbleId: workspace.bubbleId,
    repoPath: workspace.repoPath
  });

  return loadActorEmitContextFromResolvedBubble(
    resolved,
    "ACTOR_EMIT_COMPAT_ADAPTER_INVALID",
    dependencies
  );
}

export async function resolveActorEmitContextByBubbleId(input: {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
}, dependencies: ActorEmitContextResolutionDependencies): Promise<ActorEmitContextSnapshot> {
  const resolved = await dependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  return loadActorEmitContextFromResolvedBubble(
    resolved,
    "ACTOR_EMIT_CONTEXT_INVALID",
    dependencies
  );
}
