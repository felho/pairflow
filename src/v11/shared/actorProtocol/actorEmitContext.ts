import type { ResolvedBubbleById } from "../ports/bubbleLookup.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import { resolveBubbleFromWorkspaceCwd } from "../../defaults/workspace/workspaceResolutionDefaults.js";
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
