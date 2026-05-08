export const agentNames = ["codex", "claude"] as const;

export type AgentName = (typeof agentNames)[number];

// Adding a new AgentRole is not a local enum-only change. Re-open the deferred
// Opportunity 3 successor slice first:
// - plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md (`O3-T5`)
// - docs/actor-runtime-interface/onboarding-extension-surface-contract-note-v1.md
export const agentRoles = ["implementer", "reviewer", "meta_reviewer"] as const;

export type AgentRole = (typeof agentRoles)[number];

export interface BubbleAgentsConfig {
  implementer: AgentName;
  reviewer: AgentName;
  meta_reviewer: AgentName;
}

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

export function isAgentName(value: unknown): value is AgentName {
  return (
    typeof value === "string" && (agentNames as readonly string[]).includes(value)
  );
}

export function isAgentRole(value: unknown): value is AgentRole {
  return (
    typeof value === "string" && (agentRoles as readonly string[]).includes(value)
  );
}
