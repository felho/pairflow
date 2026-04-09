import {
  readStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";

type CoreAskHumanRoutingPreparationDefaults =
  typeof import("../../../core/agent/askHumanDefaults.js").askHumanDependencyDefaults.routingPreparation;

let coreAskHumanRoutingPreparationDefaultsPromise:
  | Promise<CoreAskHumanRoutingPreparationDefaults>
  | undefined;

async function loadCoreAskHumanRoutingPreparationDefaults(): Promise<CoreAskHumanRoutingPreparationDefaults> {
  coreAskHumanRoutingPreparationDefaultsPromise ??= import(
    "../../../core/agent/askHumanDefaults.js"
  ).then(({ askHumanDependencyDefaults }) => askHumanDependencyDefaults.routingPreparation);
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
