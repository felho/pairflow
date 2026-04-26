import type { AgentRole } from "../../../types/bubble.js";
import {
  getSharedTopologySlotPaneIndexForRole
} from "../topology/topologySlotPaneProjection.js";
import { createBubbleWatchdogError } from "./watchdogCommandError.js";

const watchdogActiveRoleInvalidReasonCode = "WATCHDOG_ACTIVE_ROLE_INVALID";

function assertUnreachableActiveRole(value: never): never {
  throw createBubbleWatchdogError({
    reasonCode: watchdogActiveRoleInvalidReasonCode,
    message: `Unhandled watchdog agent role: ${String(value)}.`,
    context: {
      subsystem: "watchdog_pane_targeting",
      function_name: "resolveWatchdogTargetPaneIndex",
      active_role: String(value)
    }
  });
}

export function resolveWatchdogTargetPaneIndex(activeRole: AgentRole): number {
  switch (activeRole) {
    case "implementer":
    case "reviewer":
    case "meta_reviewer":
      return getSharedTopologySlotPaneIndexForRole(activeRole);
    default:
      return assertUnreachableActiveRole(activeRole);
  }
}
