import type { HumanDecisionRequest } from "./dispatch.js";
import type { RoleName } from "./ids.js";
import type { DecisionRecommendationSource, WorkflowInstance } from "./instance.js";
import type { DecisionPayloadFieldSpec, WorkflowTemplate } from "./template.js";

/**
 * The Ask's derivation and the park record it reads (packet ch14-p3a,
 * F4 — MOVED here from `kernel/`, body unchanged).
 *
 * THE HOME IS THE FUNCTION'S OWN ALTITUDE: it imports domain types
 * ONLY, so `floor/` and `kernel/` may both reach it and it opens no
 * module-graph edge of its own. The floor is its second caller and a
 * `floor → kernel` import would have been the floor's first kernel
 * edge (ch9-p4b's DT1 ground); `domain/` is the one home the tree
 * admits, because the kernel's ADR-001 lint entry is an ALLOWLIST that
 * already names it.
 *
 * The sibling imports above are LEAF modules on purpose — reaching
 * them through `./index.js` would buy a barrel cycle inside `domain/`.
 */

/**
 * The park's committed record (K2's closed field list). `recommendation`
 * and `recommendationSource` travel TOGETHER in both directions —
 * present together, absent together — because the audit question is
 * where a recommendation came from and not only what it was.
 *
 * DECLARED HERE rather than in `ports/store.ts` (F4): the derivation
 * reads it, so leaving it behind would make `domain/` import `ports/` —
 * a direction no domain file takes, and a type-only cycle against
 * `ports/store.ts`'s own domain import.
 */
export interface DecisionRequestBody {
  readonly requestRef: string;
  readonly recipient: RoleName;
  readonly decisions: readonly string[];
  readonly recommendation?: string;
  readonly recommendationSource?: DecisionRecommendationSource;
  /** Present IFF the arriving entry carried a payload — presence, not truth. */
  readonly contextRef?: unknown;
}

/**
 * The ONE function `decision_requirements` and p2b's submit guard both
 * read — minted here for exactly that reason, so the Ask stays
 * SELF-CONTAINED by construction rather than by two implementations
 * agreeing.
 *
 * The spec legislates REQUIRED-PRESENCE ONLY, and `required` is itself
 * optional with absent = not-required, so `{}` is a legal spec that
 * contributes nothing. The filter is on `=== true`, never truthiness.
 */
export function requiredFields(
  payload: Readonly<Record<string, DecisionPayloadFieldSpec>> | undefined,
): readonly string[] {
  if (payload === undefined) return [];
  return Object.keys(payload).filter((field) => {
    const spec = Object.prototype.hasOwnProperty.call(payload, field) ? payload[field] : undefined;
    return spec?.required === true;
  });
}

/**
 * Recompute the Ask from the post-commit instance and the request the
 * park just wrote. Every input is already in the caller's hand at the
 * return point; nothing is fetched.
 */
export function humanDecisionRequest(
  instance: WorkflowInstance,
  template: WorkflowTemplate,
  request: DecisionRequestBody,
): HumanDecisionRequest {
  const gateId = instance.currentStep;
  if (gateId === null) {
    throw new Error(
      `kernel integrity: instance '${instance.instanceId}' parked at a gate with a NULL current_step`,
    );
  }
  const gate = Object.prototype.hasOwnProperty.call(template.steps, gateId)
    ? template.steps[gateId]
    : undefined;
  if (gate === undefined) {
    throw new Error(`kernel integrity: parked gate '${gateId}' has no step definition`);
  }
  const role = gate.role;
  if (role === undefined) {
    throw new Error(`kernel integrity: parked gate '${gateId}' declares no role`);
  }
  const operator = Object.prototype.hasOwnProperty.call(instance.binding, role)
    ? instance.binding[role]
    : undefined;
  if (operator === undefined) {
    throw new Error(
      `kernel integrity: gate role '${role}' unbound — create-time binding coverage should have failed`,
    );
  }
  const question = gate.instruction;
  if (question === undefined) {
    throw new Error(`kernel integrity: parked gate '${gateId}' declares no instruction`);
  }
  // `task` is `string | null` on the instance and NON-NULL here by the
  // same readiness invariant the dispatch derivation relies on — a
  // parked gate is post-activation. Narrowed with the live fail-loud
  // integrity treatment rather than widening the Ask's own field.
  if (instance.task === null) {
    throw new Error(
      `kernel integrity: gate park for instance '${instance.instanceId}' with a NULL task`,
    );
  }
  const decisions = gate.decisions ?? {};
  const decisionRequirements: Record<string, readonly string[]> = {};
  for (const key of Object.keys(decisions)) {
    const entry = Object.prototype.hasOwnProperty.call(decisions, key)
      ? decisions[key]
      : undefined;
    decisionRequirements[key] = requiredFields(entry?.payload);
  }
  return {
    instanceId: instance.instanceId,
    expectedVersion: instance.version,
    requestRef: request.requestRef,
    operator,
    question,
    ...(request.recommendation !== undefined ? { recommendation: request.recommendation } : {}),
    context: {
      task: instance.task,
      // Presence, mirroring the record's own rule.
      ...("contextRef" in request ? { handoff: request.contextRef } : {}),
    },
    allowedDecisions: Object.keys(decisions),
    decisionRequirements,
  };
}
