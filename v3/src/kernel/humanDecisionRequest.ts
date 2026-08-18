import type {
  DecisionPayloadFieldSpec,
  HumanDecisionRequest,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import type { DecisionRequestBody } from "../ports/store.js";

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
