import type {
  LoadedDomainStateSnapshot,
  ReadDomainStateSnapshotPort,
  WriteDomainStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import { isMetaReviewExecutionContextActiveState } from "../../../../shared/metaReview/metaReviewExecutionContext.js";
import { resolveActiveMetaReviewRuntimeDelivery } from "../../../../shared/metaReview/metaReviewSnapshot.js";
import type { BubbleMetaReviewRuntimeDeliveryState } from "../../../../shared/metaReview/metaReviewSnapshotTypes.js";
import { buildBubbleStateSnapshotVariant } from "../../../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../../domain/state/snapshot/projection.js";
import { isNamedError } from "../../../../shared/errors/namedError.js";

interface RuntimeDeliveryObservationPersistenceContext {
  readState: ReadDomainStateSnapshotPort;
  writeState: WriteDomainStateSnapshotPort;
  resolved: {
    bubblePaths: {
      statePath: string;
    };
  };
}

export async function persistRuntimeDeliveryObservation(input: {
  context: RuntimeDeliveryObservationPersistenceContext;
  loaded: LoadedDomainStateSnapshot;
  runtimeDelivery: BubbleMetaReviewRuntimeDeliveryState;
}): Promise<LoadedDomainStateSnapshot> {
  // The object-spread mutation below preserves all fields, but the variant
  // requires its kind discriminator to stay consistent with the state field.
  // Project to persisted shape, mutate, then rebuild the variant on the
  // way back into the Domain write port.
  const loadedPersisted = toPersistedSnapshot(input.loaded.state);
  const currentMetaReview = loadedPersisted.meta_review;
  if (currentMetaReview === undefined) {
    return input.loaded;
  }
  try {
    return await input.context.writeState(
      input.context.resolved.bubblePaths.statePath,
      buildBubbleStateSnapshotVariant({
        ...loadedPersisted,
        meta_review: {
          ...currentMetaReview,
          runtime_delivery: input.runtimeDelivery
        }
      }),
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
    const latestPersisted = toPersistedSnapshot(latest.state);
    if (!isMetaReviewExecutionContextActiveState(latestPersisted)) {
      return latest;
    }
    const latestMetaReview = latestPersisted.meta_review;
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
        buildBubbleStateSnapshotVariant({
          ...latestPersisted,
          meta_review: {
            ...latestMetaReview,
            runtime_delivery: input.runtimeDelivery
          }
        }),
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
