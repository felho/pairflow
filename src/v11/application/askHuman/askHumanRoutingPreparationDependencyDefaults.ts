import {
  readStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";
import type {
  EnsureAskHumanBubbleInstanceIdentity,
  ResolveAskHumanBubbleFromWorkspaceCwd
} from "../../shared/askHuman/askHumanRoutingPreparationDependencyResolutionContract.js";

interface CoreAskHumanRoutingPreparationDefaults {
  resolveBubbleFromWorkspaceCwd: ResolveAskHumanBubbleFromWorkspaceCwd;
  ensureBubbleInstanceIdForMutation: EnsureAskHumanBubbleInstanceIdentity;
}

let coreAskHumanRoutingPreparationDefaultsPromise:
  | Promise<CoreAskHumanRoutingPreparationDefaults>
  | undefined;

async function loadCoreAskHumanRoutingPreparationDefaults(): Promise<CoreAskHumanRoutingPreparationDefaults> {
  coreAskHumanRoutingPreparationDefaultsPromise ??= import(
    "../../../core/agent/askHumanDefaults.js"
  ).then(({ askHumanDependencyDefaults }) => ({
    resolveBubbleFromWorkspaceCwd:
      askHumanDependencyDefaults.routingPreparation.resolveBubbleFromWorkspaceCwd,
    ensureBubbleInstanceIdForMutation:
      askHumanDependencyDefaults.routingPreparation.ensureBubbleInstanceIdForMutation
  }));
  return coreAskHumanRoutingPreparationDefaultsPromise;
}

async function resolveBubbleFromWorkspaceCwd(
  ...args: Parameters<CoreAskHumanRoutingPreparationDefaults["resolveBubbleFromWorkspaceCwd"]>
): Promise<
  Awaited<
    ReturnType<CoreAskHumanRoutingPreparationDefaults["resolveBubbleFromWorkspaceCwd"]>
  >
> {
  const defaults = await loadCoreAskHumanRoutingPreparationDefaults();
  return defaults.resolveBubbleFromWorkspaceCwd(...args);
}

async function ensureBubbleInstanceIdForMutation(
  ...args: Parameters<CoreAskHumanRoutingPreparationDefaults["ensureBubbleInstanceIdForMutation"]>
): Promise<
  Awaited<
    ReturnType<CoreAskHumanRoutingPreparationDefaults["ensureBubbleInstanceIdForMutation"]>
  >
> {
  const defaults = await loadCoreAskHumanRoutingPreparationDefaults();
  return defaults.ensureBubbleInstanceIdForMutation(...args);
}

export const askHumanRoutingPreparationDependencyDefaults = {
  resolveBubbleFromWorkspaceCwd,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot
} as const;
