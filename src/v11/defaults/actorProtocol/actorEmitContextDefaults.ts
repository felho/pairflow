import {
  resolveActorEmitContextByBubbleId as resolveActorEmitContextByBubbleIdWithDependencies,
  resolveCompatActorEmitContextFromWorkspace as resolveCompatActorEmitContextFromWorkspaceWithDependencies,
  type ActorEmitContextResolutionDependencies
} from "../../shared/actorProtocol/actorEmitContext.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import {
  resolveBubbleFromWorkspaceCwd
} from "../../infrastructure/executor/workspace/workspaceResolution.js";

export const actorEmitContextResolutionDefaults = {
  readStateSnapshot,
  resolveBubbleById,
  resolveBubbleFromWorkspaceCwd
} as const satisfies ActorEmitContextResolutionDependencies;

export async function resolveCompatActorEmitContextFromWorkspace(
  cwd: string = process.cwd()
) {
  return resolveCompatActorEmitContextFromWorkspaceWithDependencies(
    cwd,
    actorEmitContextResolutionDefaults
  );
}

export async function resolveActorEmitContextByBubbleId(input: {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
}) {
  return resolveActorEmitContextByBubbleIdWithDependencies(
    input,
    actorEmitContextResolutionDefaults
  );
}
