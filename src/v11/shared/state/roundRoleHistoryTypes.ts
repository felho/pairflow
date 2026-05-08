import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";

export interface RoundRoleHistoryEntry {
  round: number;
  implementer: AgentName;
  reviewer: AgentName;
  switched_at: string;
}
