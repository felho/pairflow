import type { AgentRole } from "../../../types/bubble.js";
import type {
  ActorEmitInput,
  ActorOutputKind
} from "../../../types/protocol.js";
import {
  ActorEmitContextError,
  assertActorEmitContextMatches,
  assertActorEmitContextSnapshotIntegrity
} from "../../shared/actorProtocol/actorEmitContext.js";
import {
  getPrimaryRoutePolicyCheckIdsForRole,
  resolveRoleConfiguredAgent
} from "./roleDescriptorRegistry.js";
import type {
  ActorEmitContextSnapshot
} from "../../shared/actorProtocol/actorEmitContext.js";

export type ActorRuntimePolicyCheckId =
  | "context_snapshot_integrity"
  | "input_context_match"
  | "implementer_authority"
  | "reviewer_authority"
  | "reviewer_human_question_retained_fallback"
  | "meta_reviewer_authority"
  | "meta_reviewer_active_agent_matches_config_when_present";

export type ActorRuntimePolicyOwner =
  | "canonical_authority_context"
  | "runtime_route_policy";

export interface ActorRuntimePolicyCheck {
  id: ActorRuntimePolicyCheckId;
  owner: ActorRuntimePolicyOwner;
  description: string;
}

type ActorRuntimeDispatchHandler =
  | "implementer_route"
  | "reviewer_route"
  | "meta_reviewer_route"
  | "reviewer_human_question_fallback";

export type ActorRuntimeAdapterId =
  | "pass_adapter"
  | "human_question_adapter"
  | "convergence_adapter"
  | "meta_review_result_adapter";

export interface ActorRuntimeRoute {
  id:
    | "implementer_pass"
    | "implementer_human_question"
    | "reviewer_pass"
    | "reviewer_convergence"
    | "reviewer_human_question_fallback"
    | "meta_reviewer_meta_review_result";
  authorityRole: AgentRole;
  inputKind: ActorOutputKind;
  handler: ActorRuntimeDispatchHandler;
  adapter: ActorRuntimeAdapterId;
  routePolicy: "primary_route" | "retained_fallback";
  policyCheckIds: readonly ActorRuntimePolicyCheckId[];
}

export interface ActorRuntimeDispatchPlan {
  route: ActorRuntimeRoute;
  policyChecks: readonly ActorRuntimePolicyCheck[];
}

interface ActorRuntimeDispatchPlanAssertionInput
  extends ActorRuntimePolicyAssertionInput {
  plan: ActorRuntimeDispatchPlan;
}

interface ActorRuntimePolicyAssertionInput {
  actorInput: ActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}

interface ActorRuntimePolicyCheckDefinition {
  metadata: ActorRuntimePolicyCheck;
  assert(input: ActorRuntimePolicyAssertionInput): void;
}

function assertImplementerAuthority(
  context: ActorEmitContextSnapshot
): void {
  if (context.expected_role !== "implementer") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: implementer route requires implementer authority."
    );
  }
}

function assertReviewerAuthority(
  context: ActorEmitContextSnapshot
): void {
  if (context.expected_role !== "reviewer") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: reviewer route requires reviewer authority."
    );
  }
  if (context.loaded_state.state.active_agent === null) {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: canonical reviewer authority requires an active reviewer agent."
    );
  }
}

function assertReviewerHumanQuestionRetainedFallback(input: {
  actorInput: ActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}): void {
  if (
    input.authoritativeContext.expected_role !== "reviewer"
    || input.actorInput.kind !== "human_question"
  ) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        "ACTOR_EMIT_CONTEXT_INVALID: reviewer human_question retained fallback requires reviewer authority and human_question input.",
      context: {
        route: "assert_actor_runtime_dispatch_policy_checks",
        expectedAuthority: "reviewer human_question baseline",
        receivedKind: input.actorInput.kind
      }
    });
  }
}

function assertMetaReviewerAuthority(
  context: ActorEmitContextSnapshot
): void {
  if (context.expected_role !== "meta_reviewer") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: meta-review route requires meta_reviewer authority."
    );
  }
}

function assertMetaReviewerActiveAgentMatchesConfigWhenPresent(
  context: ActorEmitContextSnapshot
): void {
  const activeAgent = context.loaded_state.state.active_agent;
  if (activeAgent === null) {
    // Recovery may keep canonical execution authority while clearing live ownership.
    return;
  }
  const configuredMetaReviewer = resolveRoleConfiguredAgent({
    role: "meta_reviewer",
    agents: context.resolved.bubbleConfig.agents
  });
  if (activeAgent !== configuredMetaReviewer) {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      `ACTOR_EMIT_CONTEXT_INVALID: canonical meta-reviewer authority requires the configured meta-reviewer agent when active_agent is present (active_agent=${activeAgent}, configured=${configuredMetaReviewer}).`
    );
  }
}

function assertInputContextMatch(
  input: ActorRuntimePolicyAssertionInput
): void {
  assertActorEmitContextMatches({
    context: input.authoritativeContext,
    handoffId: input.actorInput.handoff_id,
    executionId: input.actorInput.execution_id,
    ...(input.actorInput.expected_role !== undefined
      ? { expectedRole: input.actorInput.expected_role }
      : {}),
    ...(input.actorInput.expected_round !== undefined
      ? { expectedRound: input.actorInput.expected_round }
      : {}),
    ...(input.actorInput.expected_state_fingerprint !== undefined
      ? {
          expectedStateFingerprint:
            input.actorInput.expected_state_fingerprint
        }
      : {})
  });
}

function assertDispatchPlanRouteMatchesInvocation(
  input: ActorRuntimeDispatchPlanAssertionInput
): void {
  if (
    input.plan.route.authorityRole !== input.authoritativeContext.expected_role
  ) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `ACTOR_EMIT_CONTEXT_INVALID: dispatch plan route ${input.plan.route.id} requires ${input.plan.route.authorityRole} authority, received ${input.authoritativeContext.expected_role}.`,
      context: {
        route: "assert_actor_runtime_dispatch_plan_route",
        expectedAuthority: input.plan.route.authorityRole,
        receivedKind: input.authoritativeContext.expected_role
      }
    });
  }

  if (input.plan.route.inputKind !== input.actorInput.kind) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `ACTOR_EMIT_CONTEXT_INVALID: dispatch plan route ${input.plan.route.id} only supports ${input.plan.route.inputKind}, received ${input.actorInput.kind}.`,
      context: {
        route: "assert_actor_runtime_dispatch_plan_route",
        expectedAuthority:
          `${input.plan.route.authorityRole} ${input.plan.route.inputKind} route`,
        receivedKind: input.actorInput.kind
      }
    });
  }
}

const actorRuntimePolicyCheckCatalog: Readonly<
  Record<ActorRuntimePolicyCheckId, ActorRuntimePolicyCheckDefinition>
> = {
  context_snapshot_integrity: {
    metadata: {
      id: "context_snapshot_integrity",
      owner: "canonical_authority_context",
      description: "Canonical actor emit context snapshot must remain coherent."
    },
    assert: ({ authoritativeContext }) => {
      assertActorEmitContextSnapshotIntegrity(authoritativeContext);
    }
  },
  input_context_match: {
    metadata: {
      id: "input_context_match",
      owner: "canonical_authority_context",
      description: "Actor emit input must match the canonical authority snapshot."
    },
    assert: assertInputContextMatch
  },
  implementer_authority: {
    metadata: {
      id: "implementer_authority",
      owner: "runtime_route_policy",
      description: "Implementer routes require implementer authority."
    },
    assert: ({ authoritativeContext }) => {
      assertImplementerAuthority(authoritativeContext);
    }
  },
  reviewer_authority: {
    metadata: {
      id: "reviewer_authority",
      owner: "runtime_route_policy",
      description: "Reviewer routes require an active reviewer authority."
    },
    assert: ({ authoritativeContext }) => {
      assertReviewerAuthority(authoritativeContext);
    }
  },
  reviewer_human_question_retained_fallback: {
    metadata: {
      id: "reviewer_human_question_retained_fallback",
      owner: "runtime_route_policy",
      description: "Reviewer human_question remains an explicit retained fallback."
    },
    assert: assertReviewerHumanQuestionRetainedFallback
  },
  meta_reviewer_authority: {
    metadata: {
      id: "meta_reviewer_authority",
      owner: "runtime_route_policy",
      description: "Meta-review routes require meta-reviewer authority."
    },
    assert: ({ authoritativeContext }) => {
      assertMetaReviewerAuthority(authoritativeContext);
    }
  },
  meta_reviewer_active_agent_matches_config_when_present: {
    metadata: {
      id: "meta_reviewer_active_agent_matches_config_when_present",
      owner: "runtime_route_policy",
      description:
        "Meta-reviewer authority requires the configured meta-reviewer agent when active_agent is present."
    },
    assert: ({ authoritativeContext }) => {
      assertMetaReviewerActiveAgentMatchesConfigWhenPresent(authoritativeContext);
    }
  }
};

// Route-matrix widening for a new role/output pairing is the concrete code
// trigger for the deferred Opportunity 3 `O3-T5` slice. Do not treat edits
// here as isolated local cleanup; align them with the O3 successor plan/note.
const actorRuntimeRouteMatrix: readonly ActorRuntimeRoute[] = [
  {
    id: "implementer_pass",
    authorityRole: "implementer",
    inputKind: "pass",
    handler: "implementer_route",
    adapter: "pass_adapter",
    routePolicy: "primary_route",
    policyCheckIds: getPrimaryRoutePolicyCheckIdsForRole("implementer")
  },
  {
    id: "implementer_human_question",
    authorityRole: "implementer",
    inputKind: "human_question",
    handler: "implementer_route",
    adapter: "human_question_adapter",
    routePolicy: "primary_route",
    policyCheckIds: getPrimaryRoutePolicyCheckIdsForRole("implementer")
  },
  {
    id: "reviewer_pass",
    authorityRole: "reviewer",
    inputKind: "pass",
    handler: "reviewer_route",
    adapter: "pass_adapter",
    routePolicy: "primary_route",
    policyCheckIds: getPrimaryRoutePolicyCheckIdsForRole("reviewer")
  },
  {
    id: "reviewer_convergence",
    authorityRole: "reviewer",
    inputKind: "convergence",
    handler: "reviewer_route",
    adapter: "convergence_adapter",
    routePolicy: "primary_route",
    policyCheckIds: getPrimaryRoutePolicyCheckIdsForRole("reviewer")
  },
  {
    id: "reviewer_human_question_fallback",
    authorityRole: "reviewer",
    inputKind: "human_question",
    handler: "reviewer_human_question_fallback",
    adapter: "human_question_adapter",
    routePolicy: "retained_fallback",
    policyCheckIds: [
      "context_snapshot_integrity",
      "input_context_match",
      "reviewer_human_question_retained_fallback"
    ]
  },
  {
    id: "meta_reviewer_meta_review_result",
    authorityRole: "meta_reviewer",
    inputKind: "meta_review_result",
    handler: "meta_reviewer_route",
    adapter: "meta_review_result_adapter",
    routePolicy: "primary_route",
    policyCheckIds: getPrimaryRoutePolicyCheckIdsForRole("meta_reviewer")
  }
] as const;

function buildActorRuntimeDispatchPlan(
  route: ActorRuntimeRoute
): ActorRuntimeDispatchPlan {
  return {
    route,
    policyChecks: route.policyCheckIds.map(
      (policyCheckId) => actorRuntimePolicyCheckCatalog[policyCheckId].metadata
    )
  };
}

export function resolveActorRuntimeDispatchPlan(input: {
  expectedRole: AgentRole;
  inputKind: ActorOutputKind;
}): ActorRuntimeDispatchPlan {
  const route = actorRuntimeRouteMatrix.find(
    (candidate) =>
      candidate.authorityRole === input.expectedRole
      && candidate.inputKind === input.inputKind
  );
  if (route !== undefined) {
    return buildActorRuntimeDispatchPlan(route);
  }

  if (input.expectedRole === "meta_reviewer") {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        "ACTOR_EMIT_CONTEXT_INVALID: meta_reviewer authority only supports meta_review_result emits.",
      context: {
        route: "resolveActorRuntimeDispatchPlan",
        expectedAuthority: "meta_reviewer meta_review_result route",
        receivedKind: input.inputKind
      }
    });
  }

  throw new ActorEmitContextError({
    reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
    message:
      `ACTOR_EMIT_CONTEXT_INVALID: ${input.expectedRole} authority does not support ${input.inputKind} via outer dispatcher fallback.`,
    context: {
      route: "resolveActorRuntimeDispatchPlan",
      expectedAuthority:
        input.expectedRole === "reviewer"
          ? "reviewer human_question baseline"
          : `${input.expectedRole} authority route`,
      receivedKind: input.inputKind
    }
  });
}

export function assertActorRuntimeDispatchPlanPolicies(input: {
  plan: ActorRuntimeDispatchPlan;
  actorInput: ActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}): void {
  assertDispatchPlanRouteMatchesInvocation(input);
  for (const policyCheck of input.plan.policyChecks) {
    actorRuntimePolicyCheckCatalog[policyCheck.id].assert({
      actorInput: input.actorInput,
      authoritativeContext: input.authoritativeContext
    });
  }
}
