import {
  startUiServer as startUiServerInfrastructure,
  type StartUiServerInput,
  type UiServerHandle
} from "../../infrastructure/ui/server.js";
import { defaultUiRouterDependencies } from "./routerDependencyDefaults.js";

export type { StartUiServerInput, UiServerHandle };

export async function startUiServer(
  input: StartUiServerInput = {}
): Promise<UiServerHandle> {
  return startUiServerInfrastructure({
    ...input,
    routerDependencyDefaults:
      input.routerDependencyDefaults ?? defaultUiRouterDependencies
  });
}
