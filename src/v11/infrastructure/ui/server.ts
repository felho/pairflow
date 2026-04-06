// Legacy public bridge: the UI server implementation still lives under core,
// but public/CLI edges should depend on this v11 infrastructure surface.
export {
  startUiServer,
  type StartUiServerInput,
  type UiServerHandle
} from "../../../core/ui/server.js";
