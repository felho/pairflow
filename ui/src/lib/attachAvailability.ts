import type {
  BubbleLifecycleState,
  UiRuntimeHealth
} from "./types";

const runtimeCapableStates = new Set<BubbleLifecycleState>([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

interface AttachAvailabilityInput {
  bubbleId: string;
  state: BubbleLifecycleState;
  hasRuntimeSession: boolean;
  runtime: UiRuntimeHealth;
}

export interface AttachAvailability {
  visible: boolean;
  enabled: boolean;
  command: string;
  hint: string | null;
}

export function getAttachAvailability(
  input: AttachAvailabilityInput
): AttachAvailability {
  const command = `tmux attach -t pf-${input.bubbleId}`;

  if (!runtimeCapableStates.has(input.state)) {
    return {
      visible: false,
      enabled: false,
      command,
      hint: null
    };
  }

  const sessionReady =
    input.hasRuntimeSession && input.runtime.present && !input.runtime.stale;

  if (sessionReady) {
    return {
      visible: true,
      enabled: true,
      command,
      hint: null
    };
  }

  return {
    visible: true,
    enabled: false,
    command,
    hint: "Runtime session unavailable. Reconcile or restart runtime, then retry attach."
  };
}
