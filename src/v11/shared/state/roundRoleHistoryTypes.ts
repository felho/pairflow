import type {
  AgentName
} from "../../domain/agentIdentity/agentIdentity.js";

export interface RoundRoleHistoryEntry {
  round: number;
  implementer: AgentName;
  reviewer: AgentName;
  switched_at: string;
}
