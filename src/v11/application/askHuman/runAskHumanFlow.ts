import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type {
  appendProtocolEnvelope,
  AppendProtocolEnvelopeResult
} from "../../../core/protocol/transcriptStore.js";
import type {
  writeStateSnapshot,
  LoadedStateSnapshot
} from "../../../core/state/stateStore.js";
import type { applyStateTransition } from "../../../core/state/machine.js";
import type {
  emitTmuxDeliveryNotification
} from "../../../core/runtime/tmuxDelivery.js";
import type { resolveDeliveryMessageRef } from "../../../core/runtime/tmuxDelivery.js";
import type { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { AskHumanRoutingContext } from "../../shared/askHuman/askHumanRoutingContext.js";
import { buildAskHumanExecutionDependencies } from "../../shared/askHuman/askHumanExecutionDependencyBuilder.js";
import { buildAskHumanFinalizationDependencies } from "../../shared/askHuman/askHumanFinalizationDependencyBuilder.js";

export interface RunAskHumanFlowInput {
  now: Date;
  routing: AskHumanRoutingContext;
  createError: (message: string) => Error;
}

interface ExecuteAskHumanExecutionInput {
  now: Date;
  routing: AskHumanRoutingContext;
  createError: (message: string) => Error;
}

interface ExecuteAskHumanExecutionResult {
  appended: AppendProtocolEnvelopeResult;
  written: LoadedStateSnapshot;
}

interface ExecuteAskHumanExecutionDependencies {
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  writeStateSnapshot?: typeof writeStateSnapshot;
  applyStateTransition?: typeof applyStateTransition;
}

interface FinalizeAskHumanFlowInput {
  now: Date;
  routing: AskHumanRoutingContext;
  appended: AppendProtocolEnvelopeResult;
  written: LoadedStateSnapshot;
}

interface FinalizeAskHumanFlowDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  resolveDeliveryMessageRef?: typeof resolveDeliveryMessageRef;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
}

export interface RunAskHumanFlowResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredRecipient: "human";
}

export interface RunAskHumanFlowDependencies {
  executeAskHumanExecution: (
    input: ExecuteAskHumanExecutionInput,
    dependencies?: ExecuteAskHumanExecutionDependencies
  ) => Promise<ExecuteAskHumanExecutionResult>;
  finalizeAskHumanFlow: (
    input: FinalizeAskHumanFlowInput,
    dependencies?: FinalizeAskHumanFlowDependencies
  ) => Promise<RunAskHumanFlowResult>;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  writeStateSnapshot?: typeof writeStateSnapshot;
  applyStateTransition?: typeof applyStateTransition;
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  resolveDeliveryMessageRef?: FinalizeAskHumanFlowDependencies["resolveDeliveryMessageRef"];
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
}

export async function runAskHumanFlow(
  input: RunAskHumanFlowInput,
  dependencies: RunAskHumanFlowDependencies
): Promise<RunAskHumanFlowResult> {
  const execution = await dependencies.executeAskHumanExecution(
    {
      now: input.now,
      routing: input.routing,
      createError: input.createError
    },
    buildAskHumanExecutionDependencies(dependencies)
  );

  return dependencies.finalizeAskHumanFlow(
    {
      now: input.now,
      routing: input.routing,
      appended: execution.appended,
      written: execution.written
    },
    buildAskHumanFinalizationDependencies(dependencies)
  );
}
