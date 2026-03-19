import type { AgentRole } from "../../../types/bubble.js";
import type { PassIntent } from "../../../types/protocol.js";

export interface InferPassIntentFromActiveRoleInput {
  activeRole: AgentRole;
  createError: (message: string) => Error;
}

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
    `Unsupported active role for pass intent inference: ${input.activeRole}.`
  );
}
