import {
  type BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";
import {
  isRecord,
  type ValidationError
} from "../validation/primitives.js";
import {
  validateMetaReviewAutonomousSnapshot
} from "./stateSchemaMetaReviewAutonomous.js";
import {
  validateMetaReviewExecutionContext,
  validateMetaReviewRuntimeDelivery
} from "./stateSchemaMetaReviewRuntime.js";

export function validateMetaReviewSnapshot(
  input: unknown,
  errors: ValidationError[]
): BubbleMetaReviewSnapshotState | undefined {
  const pathPrefix = "meta_review";
  const errorCountAtStart = errors.length;
  if (!isRecord(input)) {
    errors.push({
      path: pathPrefix,
      message: "Must be an object"
    });
    return undefined;
  }

  const executionContextRaw =
    input.execution_context === undefined ? null : input.execution_context;
  const executionContext = validateMetaReviewExecutionContext(
    executionContextRaw,
    `${pathPrefix}.execution_context`,
    errors
  );

  const runtimeDeliveryRaw =
    input.runtime_delivery === undefined ? null : input.runtime_delivery;
  const runtimeDelivery = validateMetaReviewRuntimeDelivery(
    runtimeDeliveryRaw,
    `${pathPrefix}.runtime_delivery`,
    errors
  );
  const autonomousSnapshot = validateMetaReviewAutonomousSnapshot(
    input,
    pathPrefix,
    errors
  );

  if (errors.length > errorCountAtStart) {
    return undefined;
  }

  return {
    execution_context: executionContext,
    runtime_delivery: runtimeDelivery,
    ...autonomousSnapshot!
  };
}
