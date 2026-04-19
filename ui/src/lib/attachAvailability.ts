import type {
  BubbleLifecycleState,
  UiBubbleSummary,
  UiRuntimeHealth
} from "./types";

const runtimeCapableStates = new Set<BubbleLifecycleState>([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

interface AttachAvailabilityInput {
  bubbleId: string;
  state: BubbleLifecycleState;
  hasRuntimeSession: boolean;
  runtime: UiRuntimeHealth;
  remoteExecution?: UiBubbleSummary["remoteExecution"];
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
  const localCommand = `tmux attach -t pf-${input.bubbleId}`;
  const remoteCommand = `pairflow bubble attach --id ${input.bubbleId}`;

  if (!runtimeCapableStates.has(input.state)) {
    return {
      visible: false,
      enabled: false,
      command:
        input.remoteExecution !== undefined ? remoteCommand : localCommand,
      hint: null
    };
  }

  if (input.remoteExecution !== undefined) {
    if (
      input.remoteExecution.pointerKind === "created" ||
      (
        input.remoteExecution.viewKind === "list" &&
        input.remoteExecution.stateSource === "created_not_started"
      ) ||
      (
        input.remoteExecution.viewKind === "status" &&
        input.remoteExecution.runtimeAvailability === "not_started"
      )
    ) {
      return {
        visible: true,
        enabled: false,
        command: remoteCommand,
        hint: "Remote bubble is not started yet. Start it first, then attach."
      };
    }

    if (
      (
        input.remoteExecution.viewKind === "list" &&
        (
          input.remoteExecution.stateSource === "unavailable_started" ||
          (
            input.remoteExecution.pointerKind === "started" &&
            (
              input.remoteExecution.runtimeAvailability === undefined ||
              input.remoteExecution.runtimeAvailability !== "active"
            )
          )
        )
      ) ||
      (
        input.remoteExecution.viewKind === "status" &&
        input.remoteExecution.runtimeAvailability !== "active"
      )
    ) {
      return {
        visible: true,
        enabled: false,
        command: remoteCommand,
        hint: "Remote runtime is unavailable. Attach stays fail-closed and will not restart it automatically."
      };
    }

    return {
      visible: true,
      enabled: true,
      command: remoteCommand,
      hint: null
    };
  }

  const sessionReady =
    input.hasRuntimeSession && input.runtime.present && !input.runtime.stale;

  if (sessionReady) {
    return {
      visible: true,
      enabled: true,
      command: localCommand,
      hint: null
    };
  }

  return {
    visible: true,
    enabled: true,
    command: localCommand,
    hint: "Runtime session unavailable. Attach will restart runtime automatically before retrying."
  };
}
