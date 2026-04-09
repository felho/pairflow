import type { LoadedStateSnapshot } from "../ports/stateSnapshots.js";
import { isMetaReviewExecutionContextActiveState } from "../metaReview/metaReviewExecutionContext.js";
import { resolveActiveMetaReviewRuntimeDelivery } from "../metaReview/metaReviewSnapshot.js";
import type { BubbleMetaReviewRuntimeDeliveryState } from "../../../types/bubble.js";
import type { ApplyMetaReviewGateExecutionContext } from "./metaReviewGateApplyContext.js";
import { isNamedError } from "../errors/namedError.js";

export async function persistRuntimeDeliveryObservation(input: {
  context: ApplyMetaReviewGateExecutionContext;
  loaded: LoadedStateSnapshot;
  runtimeDelivery: BubbleMetaReviewRuntimeDeliveryState;
}): Promise<LoadedStateSnapshot> {
  const currentMetaReview = input.loaded.state.meta_review;
  if (currentMetaReview === undefined) {
    return input.loaded;
  }
  try {
    return await input.context.writeState(
      input.context.resolved.bubblePaths.statePath,
      {
        ...input.loaded.state,
        meta_review: {
          ...currentMetaReview,
          runtime_delivery: input.runtimeDelivery
        }
      },
      {
        expectedFingerprint: input.loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (!isNamedError(error, "StateStoreConflictError")) {
      throw error;
    }
    const latest = await input.context.readState(
      input.context.resolved.bubblePaths.statePath
    );
    if (!isMetaReviewExecutionContextActiveState(latest.state)) {
      return latest;
    }
    const latestMetaReview = latest.state.meta_review;
    if (
      latestMetaReview === undefined ||
      resolveActiveMetaReviewRuntimeDelivery({
        executionContext: latestMetaReview.execution_context,
        runtimeDelivery: input.runtimeDelivery
      }) === null
    ) {
      return latest;
    }
    try {
      return await input.context.writeState(
        input.context.resolved.bubblePaths.statePath,
        {
          ...latest.state,
          meta_review: {
            ...latestMetaReview,
            runtime_delivery: input.runtimeDelivery
          }
        },
        {
          expectedFingerprint: latest.fingerprint,
          expectedState: "RUNNING"
        }
      );
    } catch (retryError) {
      if (!isNamedError(retryError, "StateStoreConflictError")) {
        throw retryError;
      }
      return input.context.readState(input.context.resolved.bubblePaths.statePath);
    }
  }
}
