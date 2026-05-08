import {
  agentRoles,
  type AgentName,
  type AgentRole,
  type BubbleAgentsConfig
} from "../../../contracts/kernel/agentIdentity.js";

export function resolveConfiguredAgentForRole(input: {
  agents: BubbleAgentsConfig;
  role: AgentRole;
}): AgentName {
  switch (input.role) {
    case "implementer":
      return input.agents.implementer;
    case "reviewer":
      return input.agents.reviewer;
    case "meta_reviewer":
      return input.agents.meta_reviewer;
  }
}

export function resolveUniquelyConfiguredRoleForAgent(input: {
  agents: BubbleAgentsConfig;
  agent: AgentName;
  roles?: readonly AgentRole[];
}): AgentRole | undefined {
  const roles = input.roles ?? agentRoles;
  let matchedRole: AgentRole | undefined;
  for (const role of roles) {
    if (
      resolveConfiguredAgentForRole({
        agents: input.agents,
        role
      }) !== input.agent
    ) {
      continue;
    }
    if (matchedRole !== undefined) {
      return undefined;
    }
    matchedRole = role;
  }
  return matchedRole;
}
