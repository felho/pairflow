import type {
  GateEvaluator,
  GateEvaluatorResult,
  GatePipelineInput,
  GatePipelineOutcome,
  GatePipelineResult
} from "./gatePipelineContract.js";

const gateIdPattern = /^[a-z][a-z0-9_-]*$/u;
const gateOutcomeSeverity: Record<GatePipelineOutcome, number> = {
  pass: 0,
  warn: 1,
  block: 2
};

function createGatePipelineError(input: {
  reasonCode: "GATE_CONTEXT_INVALID" | "GATE_EVALUATOR_FAILED";
  message: string;
  context: PairflowCommandErrorContext;
  cause?: unknown;
}): Error {
  const error = new Error(input.message);
  return Object.assign(error, {
    reasonCode: input.reasonCode,
    context: input.context,
    ...(input.cause !== undefined
      ? { cause: input.cause }
      : {})
  });
}

function validateGateId(gateId: string): boolean {
  return gateIdPattern.test(gateId);
}

function assertPipelineInput<TContext, TProfile extends string, TMetadata>(
  input: GatePipelineInput<TContext, TProfile, TMetadata>
): void {
  if (typeof input.profile !== "string" || input.profile.trim().length === 0) {
    throw createGatePipelineError({
      reasonCode: "GATE_CONTEXT_INVALID",
      message: "Gate pipeline profile must be a non-empty string.",
      context: { profile: input.profile ?? null }
    });
  }
  if (input.context === undefined) {
    throw createGatePipelineError({
      reasonCode: "GATE_CONTEXT_INVALID",
      message: "Gate pipeline context is required.",
      context: { profile: input.profile }
    });
  }
  if (!Array.isArray(input.gates) || input.gates.length === 0) {
    throw createGatePipelineError({
      reasonCode: "GATE_CONTEXT_INVALID",
      message: "Gate pipeline requires at least one gate evaluator.",
      context: { profile: input.profile }
    });
  }
  if (
    input.skip_list !== undefined
    && (!Array.isArray(input.skip_list)
      || input.skip_list.some((gateId) => typeof gateId !== "string"))
  ) {
    throw createGatePipelineError({
      reasonCode: "GATE_CONTEXT_INVALID",
      message: "Gate pipeline skip_list must contain only gate ids.",
      context: { profile: input.profile }
    });
  }
  if (
    input.diagnostics_seed !== undefined
    && (!Array.isArray(input.diagnostics_seed)
      || input.diagnostics_seed.some((entry) => typeof entry !== "string"))
  ) {
    throw createGatePipelineError({
      reasonCode: "GATE_CONTEXT_INVALID",
      message: "Gate pipeline diagnostics_seed must contain only strings.",
      context: { profile: input.profile }
    });
  }

  const seenGateIds = new Set<string>();
  for (const gate of input.gates) {
    if (
      gate === null
      || typeof gate !== "object"
      || typeof gate.gate_id !== "string"
      || typeof gate.evaluate !== "function"
    ) {
      throw createGatePipelineError({
        reasonCode: "GATE_CONTEXT_INVALID",
        message: "Gate pipeline encountered an invalid gate evaluator.",
        context: { profile: input.profile }
      });
    }
    if (!validateGateId(gate.gate_id)) {
      throw createGatePipelineError({
        reasonCode: "GATE_CONTEXT_INVALID",
        message: `Gate evaluator id is invalid: ${gate.gate_id}`,
        context: {
          profile: input.profile,
          gate_id: gate.gate_id
        }
      });
    }
    if (seenGateIds.has(gate.gate_id)) {
      throw createGatePipelineError({
        reasonCode: "GATE_CONTEXT_INVALID",
        message: `Gate evaluator id must be unique: ${gate.gate_id}`,
        context: {
          profile: input.profile,
          gate_id: gate.gate_id
        }
      });
    }
    seenGateIds.add(gate.gate_id);
  }
}

function assertEvaluatorResult<TMetadata>(
  gate: GateEvaluator<unknown, string, TMetadata>,
  result: GateEvaluatorResult<TMetadata>,
  profile: string
): void {
  if (
    result === null
    || typeof result !== "object"
    || result.gate_id !== gate.gate_id
    || !["pass", "warn", "block"].includes(result.outcome)
  ) {
    throw createGatePipelineError({
      reasonCode: "GATE_CONTEXT_INVALID",
      message: `Gate evaluator returned an invalid result for ${gate.gate_id}.`,
      context: {
        profile,
        gate_id: gate.gate_id
      }
    });
  }
  if (
    result.diagnostics !== undefined
    && (!Array.isArray(result.diagnostics)
      || result.diagnostics.some((entry) => typeof entry !== "string"))
  ) {
    throw createGatePipelineError({
      reasonCode: "GATE_CONTEXT_INVALID",
      message: `Gate evaluator diagnostics must be strings for ${gate.gate_id}.`,
      context: {
        profile,
        gate_id: gate.gate_id
      }
    });
  }
}

function computeFinalOutcome(
  current: GatePipelineOutcome,
  next: GatePipelineOutcome
): GatePipelineOutcome {
  return gateOutcomeSeverity[next] > gateOutcomeSeverity[current] ? next : current;
}

export async function runGatePipeline<TContext, TProfile extends string, TMetadata = unknown>(
  input: GatePipelineInput<TContext, TProfile, TMetadata>
): Promise<GatePipelineResult<TMetadata>> {
  assertPipelineInput(input);

  const diagnostics = [...(input.diagnostics_seed ?? [])];
  const gateOutcomes: GatePipelineResult<TMetadata>["gate_outcomes"] = [];
  const knownGateIds = new Set(input.gates.map((gate) => gate.gate_id));
  const skippedGateIds = Array.from(
    new Set((input.skip_list ?? []).filter((gateId) => knownGateIds.has(gateId)))
  );
  const unknownSkippedGateIds = Array.from(
    new Set((input.skip_list ?? []).filter((gateId) => !knownGateIds.has(gateId)))
  );

  for (const gateId of unknownSkippedGateIds) {
    diagnostics.push(`Ignored unknown skip_list gate id: ${gateId}`);
  }

  let finalOutcome: GatePipelineOutcome = "pass";
  for (const gate of input.gates) {
    if (skippedGateIds.includes(gate.gate_id)) {
      continue;
    }

    let result: GateEvaluatorResult<TMetadata>;
    try {
      result = await gate.evaluate({
        context: input.context,
        profile: input.profile
      });
    } catch (error) {
      throw createGatePipelineError({
        reasonCode: "GATE_EVALUATOR_FAILED",
        message: `Gate evaluator failed: ${gate.gate_id}`,
        context: {
          profile: input.profile,
          gate_id: gate.gate_id
        },
        cause: error
      });
    }

    assertEvaluatorResult(
      gate as GateEvaluator<unknown, string, TMetadata>,
      result,
      input.profile
    );
    gateOutcomes.push({
      gate_id: result.gate_id,
      outcome: result.outcome,
      ...(result.diagnostics !== undefined
        ? { diagnostics: result.diagnostics }
        : {}),
      ...(result.metadata !== undefined
        ? { metadata: result.metadata }
        : {})
    });
    diagnostics.push(...(result.diagnostics ?? []));
    finalOutcome = computeFinalOutcome(finalOutcome, result.outcome);

    if (result.outcome === "block") {
      return {
        final_outcome: finalOutcome,
        gate_outcomes: gateOutcomes,
        diagnostics,
        stopped_at_gate_id: gate.gate_id,
        ...(skippedGateIds.length > 0
          ? { skipped_gate_ids: skippedGateIds }
          : {})
      };
    }
  }

  return {
    final_outcome: finalOutcome,
    gate_outcomes: gateOutcomes,
    diagnostics,
    ...(skippedGateIds.length > 0
      ? { skipped_gate_ids: skippedGateIds }
      : {})
  };
}
