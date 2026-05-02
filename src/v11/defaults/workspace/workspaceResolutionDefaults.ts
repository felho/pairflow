import { resolveBubbleFromWorkspaceCwd as resolveBubbleFromWorkspaceCwdCanonical } from "../../infrastructure/executor/workspace/workspaceResolution.js";
import type { ResolveAskHumanBubbleFromWorkspaceCwd } from "../../application/askHuman/askHumanRoutingPreparationDependencyResolutionContract.js";

export const resolveBubbleFromWorkspaceCwd: ResolveAskHumanBubbleFromWorkspaceCwd =
  async (...args) => resolveBubbleFromWorkspaceCwdCanonical(...args);
