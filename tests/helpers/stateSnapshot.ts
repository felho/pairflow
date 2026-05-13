import { buildBubbleStateSnapshotVariant } from "../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
import type { BubbleStateSnapshot } from "../../src/v11/domain/state/snapshot/bubbleStateSnapshot.js";
import type { PersistedBubbleStateSnapshot } from "../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import {
  writeStateSnapshot as rawWriteStateSnapshot
} from "../../src/v11/infrastructure/state/stateStore.js";

export function toStateSnapshotFixture(state: unknown): BubbleStateSnapshot {
  if (
    typeof state === "object"
    && state !== null
    && "kind" in state
    && typeof state.kind === "string"
  ) {
    return state as BubbleStateSnapshot;
  }

  return buildBubbleStateSnapshotVariant(state as PersistedBubbleStateSnapshot);
}

export function writeStateSnapshotFixture(
  statePath: Parameters<typeof rawWriteStateSnapshot>[0],
  state: unknown,
  options?: Parameters<typeof rawWriteStateSnapshot>[2]
): ReturnType<typeof rawWriteStateSnapshot> {
  return rawWriteStateSnapshot(
    statePath,
    toStateSnapshotFixture(state),
    options
  );
}
