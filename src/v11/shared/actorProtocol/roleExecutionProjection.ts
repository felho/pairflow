import type { AgentRole } from "../../../contracts/kernel/agentIdentity.js";
import type {
  BubbleExecutionContextAwaitedOutputType
} from "../state/executionContextTypes.js";

export type HandoffIdFormatId = "meta_review";

export interface RoleExecutionProjectionDescriptor {
  primary_awaited_output_type: BubbleExecutionContextAwaitedOutputType;
  handoff_id_format_id: HandoffIdFormatId | null;
}

const roleExecutionProjectionCatalog = Object.freeze({
  implementer: {
    primary_awaited_output_type: "pass_result",
    handoff_id_format_id: null
  },
  reviewer: {
    primary_awaited_output_type: "pass_result",
    handoff_id_format_id: null
  },
  meta_reviewer: {
    primary_awaited_output_type: "meta_review_result",
    handoff_id_format_id: "meta_review"
  }
} as const satisfies Readonly<Record<AgentRole, RoleExecutionProjectionDescriptor>>);

export function getRoleExecutionProjectionDescriptor(
  role: AgentRole
): RoleExecutionProjectionDescriptor {
  return roleExecutionProjectionCatalog[role];
}

export function buildExecutionContextHandoffIdForRole(input: {
  bubbleId: string;
  activeRole: AgentRole;
  round: number;
  attempt: number;
}): string {
  const descriptor = getRoleExecutionProjectionDescriptor(input.activeRole);
  if (descriptor.handoff_id_format_id === "meta_review") {
    return `meta_review:${input.bubbleId}:round:${input.round}:attempt:${input.attempt}`;
  }

  return `${input.activeRole}:${input.bubbleId}:round:${input.round}:attempt:${input.attempt}`;
}
