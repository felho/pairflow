import type { AgentRole } from "../../../types/bubble.js";
import type { PassIntent } from "../../../types/protocol.js";

export interface InferPassIntentFromActiveRoleInput {
  activeRole: AgentRole;
  createError: (message: string) => Error;
}

const PASS_INTENT_ACTIVE_ROLE_UNSUPPORTED =
  "PASS_INTENT_ACTIVE_ROLE_UNSUPPORTED";

export function inferPassIntentFromActiveRole(
  input: InferPassIntentFromActiveRoleInput
): PassIntent {
  if (input.activeRole === "implementer") {
    return "review";
  }
  if (input.activeRole === "reviewer") {
    return "fix_request";
  }

  throw input.createError(
    `${PASS_INTENT_ACTIVE_ROLE_UNSUPPORTED}: Unsupported active role for pass intent inference: ${input.activeRole}. context: command_name=pass; active_role=${input.activeRole}.`
  );
}
