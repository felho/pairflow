import type { RunAskHumanFlowFn } from "./askHumanFlowContract.js";
import type { PrepareAskHumanRoutingFn } from "./askHumanRoutingContract.js";

export interface AskHumanCommandFlowDefaults {
  prepareAskHumanRouting: PrepareAskHumanRoutingFn;
  runAskHumanFlow: RunAskHumanFlowFn;
}
