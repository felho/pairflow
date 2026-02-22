import { readRuntimeSessionsRegistry } from "./sessionsRegistry.js";
import { runTmux, type TmuxRunner } from "./tmuxManager.js";
import type { BubbleConfig } from "../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolParticipant } from "../../types/protocol.js";

export interface EmitTmuxDeliveryNotificationInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef?: string;
  runner?: TmuxRunner;
  readSessionsRegistry?: typeof readRuntimeSessionsRegistry;
}

export type TmuxDeliveryFailureReason =
  | "no_runtime_session"
  | "unsupported_recipient"
  | "registry_read_failed"
  | "tmux_send_failed";

export interface EmitTmuxDeliveryNotificationResult {
  delivered: boolean;
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  reason?: TmuxDeliveryFailureReason;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/gu, "'\\''")}'`;
}

function resolveTargetPaneIndex(
  recipient: ProtocolParticipant,
  bubbleConfig: BubbleConfig
): number | undefined {
  if (recipient === bubbleConfig.agents.implementer) {
    return 1;
  }
  if (recipient === bubbleConfig.agents.reviewer) {
    return 2;
  }
  if (recipient === "human" || recipient === "orchestrator") {
    return 0;
  }
  return undefined;
}

function buildDeliveryMessage(
  envelope: ProtocolEnvelope,
  messageRef: string
): string {
  return `[pairflow] r${envelope.round} ${envelope.type} ${envelope.sender}->${envelope.recipient} ${messageRef}`;
}

export async function emitTmuxDeliveryNotification(
  input: EmitTmuxDeliveryNotificationInput
): Promise<EmitTmuxDeliveryNotificationResult> {
  const messageRef =
    input.messageRef ?? input.envelope.refs[0] ?? `transcript.ndjson#${input.envelope.id}`;
  const message = buildDeliveryMessage(input.envelope, messageRef);
  const readSessions = input.readSessionsRegistry ?? readRuntimeSessionsRegistry;

  let sessionName: string | undefined;
  try {
    const sessions = await readSessions(input.sessionsPath, {
      allowMissing: true
    });
    sessionName = sessions[input.bubbleId]?.tmuxSessionName;
  } catch {
    return {
      delivered: false,
      message,
      reason: "registry_read_failed"
    };
  }

  if (sessionName === undefined) {
    return {
      delivered: false,
      message,
      reason: "no_runtime_session"
    };
  }

  const targetPaneIndex = resolveTargetPaneIndex(
    input.envelope.recipient,
    input.bubbleConfig
  );
  if (targetPaneIndex === undefined) {
    return {
      delivered: false,
      sessionName,
      message,
      reason: "unsupported_recipient"
    };
  }

  const targetPane = `${sessionName}:0.${targetPaneIndex}`;
  const command = `printf '%s\\n' ${shellQuote(message)}`;
  const runner = input.runner ?? runTmux;

  try {
    await runner(["send-keys", "-t", targetPane, "-l", command]);
    await runner(["send-keys", "-t", targetPane, "Enter"]);
  } catch {
    return {
      delivered: false,
      sessionName,
      targetPaneIndex,
      message,
      reason: "tmux_send_failed"
    };
  }

  return {
    delivered: true,
    sessionName,
    targetPaneIndex,
    message
  };
}
