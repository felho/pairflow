import { writeStateSnapshot } from "../../../start/startCommandDependencyDefaults.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../../domain/state/snapshot/projection.js";
import { assertParsedBubbleStateSnapshot } from "../../../../domain/state/stateSchema.js";
import { buildRunningExecutionContext } from "../../../../domain/state/execution/executionContext.js";
import type { ResolvedPassHandoff } from "../../../../domain/pass/handoff.js";
import { raisePostAppendStateWriteFailed } from "../../../../domain/pass/postAppendStateWriteFailure.js";

export interface WritePostAppendPassStateInput {
  statePath: string;
  state: BubbleStateSnapshot;
  handoff: Pick<
    ResolvedPassHandoff,
    "nextRound" | "recipientAgent" | "recipientRole" | "appendRoundRoleEntry"
  >;
  nowIso: string;
  watchdogTimeoutMinutes: number;
  expectedFingerprint: string;
  envelopeId: string;
  createError: PairflowCreateCommandError;
}

export interface WritePostAppendPassStateDependencies {
  writeStateSnapshot?: typeof writeStateSnapshot;
}

export async function writePostAppendPassState(
  input: WritePostAppendPassStateInput,
  dependencies: WritePostAppendPassStateDependencies = {}
): Promise<LoadedStateSnapshot> {
  const persistedWritePort = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const writeState: WriteStateSnapshotPort =
    persistedWritePort;

  const currentPersisted = toPersistedSnapshot(input.state);
  const nextState = assertParsedBubbleStateSnapshot({
    ...currentPersisted,
    round: input.handoff.nextRound,
    active_agent: input.handoff.recipientAgent,
    active_role: input.handoff.recipientRole,
    execution_context: buildRunningExecutionContext({
      bubbleId: currentPersisted.bubble_id,
      round: input.handoff.nextRound,
      activeRole: input.handoff.recipientRole,
      startedAt: input.nowIso,
      watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
    }),
    active_since: input.nowIso,
    last_command_at: input.nowIso,
    round_role_history:
      input.handoff.appendRoundRoleEntry === undefined
        ? currentPersisted.round_role_history
        : [...currentPersisted.round_role_history, input.handoff.appendRoundRoleEntry]
  });

  try {
    // Transcript is canonical source of truth. If state write fails after append,
    // recovery must reconcile from latest transcript entry.
    return await writeState(input.statePath, nextState, {
      expectedFingerprint: input.expectedFingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return raisePostAppendStateWriteFailed({
      envelopeId: input.envelopeId,
      reason,
      createError: input.createError
    });
  }
}
