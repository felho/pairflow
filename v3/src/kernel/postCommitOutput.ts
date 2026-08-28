import type {
  DecisionRequestBody,
  DispatchIntent,
  HumanDecisionRequest,
  StepId,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import type { ProviderRegistry } from "../ports/runtimeContextProvider.js";

import { deriveDispatchIntent } from "./dispatchIntent.js";
import { humanDecisionRequest } from "../domain/index.js";

/**
 * l3/post_commit_output (packet ch14-p2a, K5) — the outbound effect a
 * committed arrival owes, selected from the status the arrival JUST
 * set.
 *
 * A PURE derivation: no mutation and NO I/O. The no-I/O half matters
 * beyond tidiness — the transcript scan a looser reading would admit is
 * foreclosed by resolving the pending request from the ARRIVAL RESULT
 * instead (K20), so this function never reads the store.
 *
 * FOUR CELLS, not three, because the two `none` answers reach one value
 * from DIFFERENT CAUSES and each needs its own branch:
 *   TERMINAL                  ⇒ none (the run is over)
 *   WAITING(human_decision)   ⇒ the Ask
 *   WAITING(any other kind)   ⇒ none (a bare wait awaits an inbound event)
 *   ACTIVE                    ⇒ the DispatchIntent
 *
 * Every input is already in the caller's hand at the return point;
 * nothing is fetched.
 */
export function postCommitOutput(
  instance: WorkflowInstance,
  template: WorkflowTemplate,
  providerRegistry: ProviderRegistry,
  handoff: unknown,
  decisionRequest: DecisionRequestBody | undefined,
): DispatchIntent | HumanDecisionRequest | null {
  switch (instance.kernelStatus) {
    case "TERMINAL":
      return null;
    case "WAITING": {
      if (instance.wait?.kind !== "human_decision") {
        // The selection's branch set grows with later wait kinds in
        // their realizing chapters, so an UNRECOGNIZED kind takes this
        // arm by the same reasoning: the arm is "no directive is owed",
        // never "we do not know". This is deliberately unlike the
        // arrival's integrity-drift treatment of an unknown TARGET TYPE
        // — that would mean the arrival wrote a state it cannot
        // describe, while an unknown WAIT KIND is an authored value the
        // kernel is contractually incurious about.
        return null;
      }
      if (decisionRequest === undefined) {
        throw new Error(
          `kernel integrity: instance '${instance.instanceId}' is WAITING(human_decision) ` +
            `without the decision request its own arrival committed`,
        );
      }
      return humanDecisionRequest(instance, template, decisionRequest);
    }
    case "ACTIVE": {
      const position: StepId | null = instance.currentStep;
      if (position === null) {
        throw new Error(
          `kernel integrity: ACTIVE instance '${instance.instanceId}' with a NULL current_step`,
        );
      }
      return deriveDispatchIntent(instance, template, position, providerRegistry, handoff);
    }
    case "CREATED":
      // No arrival can leave a run CREATED — activation is not an
      // arrival (K18), so reaching here means a state nothing wrote.
      throw new Error(
        `kernel integrity: post-commit output for CREATED instance '${instance.instanceId}'`,
      );
  }
}
