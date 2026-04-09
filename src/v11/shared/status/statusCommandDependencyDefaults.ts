import {
  BubbleLookupError,
  statusInboxDependencyDefaults
} from "../../../core/bubble/statusInboxDefaults.js";
import { statusGateDefaults } from "../../../core/bubble/statusGateDefaults.js";

export const statusCommandDependencyDefaults = {
  ...statusInboxDependencyDefaults,
  ...statusGateDefaults
} as const;

export { BubbleLookupError };
