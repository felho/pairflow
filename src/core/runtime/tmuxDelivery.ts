import { readRuntimeSessionsRegistry } from "./sessionsRegistry.js";
import { runTmux, type TmuxRunner } from "./tmuxManager.js";
import { maybeAcceptClaudeTrustPrompt, sendAndSubmitTmuxPaneMessage, submitTmuxPaneInput } from "./tmuxInput.js";
import type { BubbleConfig } from "../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolParticipant } from "../../types/protocol.js";

export interface EmitTmuxDeliveryNotificationInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef?: string;
  initialDelayMs?: number;
  deliveryAttempts?: number;
  runner?: TmuxRunner;
  readSessionsRegistry?: typeof readRuntimeSessionsRegistry;
}

export type TmuxDeliveryFailureReason =
  | "no_runtime_session"
  | "unsupported_recipient"
  | "registry_read_failed"
  | "delivery_unconfirmed"
  | "tmux_send_failed";

export interface EmitTmuxDeliveryNotificationResult {
  delivered: boolean;
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  reason?: TmuxDeliveryFailureReason;
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
  messageRef: string,
  bubbleConfig: BubbleConfig,
  worktreePath?: string
): string {
  const recipientRole =
    envelope.recipient === bubbleConfig.agents.implementer
      ? "implementer"
      : envelope.recipient === bubbleConfig.agents.reviewer
      ? "reviewer"
      : envelope.recipient;
  const worktreeHint =
    worktreePath === undefined
      ? "Run pairflow commands from the bubble worktree root."
      : `Run pairflow commands from worktree: ${worktreePath}.`;

  let action = "Continue protocol from this event.";
  if (recipientRole === "implementer") {
    if (envelope.type === "PASS") {
      action =
        "Reviewer feedback received. Implement fixes, then hand off with `pairflow pass --summary` directly (no confirmation prompt).";
    } else if (envelope.type === "HUMAN_REPLY") {
      action =
        "Human response received. Continue implementation using this input, then hand off with `pairflow pass --summary` directly.";
    } else if (envelope.type === "APPROVAL_REQUEST") {
      action =
        "Bubble is READY_FOR_APPROVAL. Stop coding and wait for human decision (`bubble approve` or `bubble request-rework`). Do not run `pairflow pass` now.";
    }
  } else if (recipientRole === "reviewer") {
    if (envelope.type === "PASS") {
      action =
        "Implementer handoff received. Run a fresh review now. IMPORTANT: Use the `feature-dev:code-reviewer` agent (via Task tool) for the review — it provides higher-quality, structured analysis than manual inspection. Fall back to `/review` only if the agent is unavailable. Then run `pairflow pass --summary ... --finding P1:...` (repeatable) or `pairflow pass --summary ... --no-findings`; run `pairflow converged --summary` only when clean. Execute pairflow commands directly (no confirmation prompt).";
    } else if (envelope.type === "HUMAN_REPLY") {
      action =
        "Human response received. Continue review workflow from this update.";
    } else if (envelope.type === "APPROVAL_REQUEST") {
      action =
        "Bubble is READY_FOR_APPROVAL. Review is complete; wait for human decision (`bubble approve` or `bubble request-rework`). Do not run `pairflow pass` now.";
    }
  } else if (recipientRole === "human" || recipientRole === "orchestrator") {
    action = "Check inbox/status and continue human orchestration flow.";
  }

  // Prefix as shell comment so if a pane is in plain bash fallback, this line remains harmless.
  return `# [pairflow] r${envelope.round} ${envelope.type} ${envelope.sender}->${envelope.recipient} msg=${envelope.id} ref=${messageRef}. Action: ${action} ${worktreeHint}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

type MarkerStatus = "submitted" | "stuck_in_input" | "not_found";

/**
 * Check whether a delivery marker appears in a tmux pane's visible content.
 *
 * `capture-pane -p` returns both the output area AND the current input buffer.
 * If the marker only appears after the last `>` prompt indicator, the message
 * is still sitting in the input buffer (Enter didn't submit).  We distinguish:
 *
 * - "submitted":       marker found in the output area (before the prompt)
 * - "stuck_in_input":  marker found only after the last `>` prompt line
 * - "not_found":       marker not present at all
 */
async function checkMarkerStatus(
  runner: TmuxRunner,
  targetPane: string,
  marker: string
): Promise<MarkerStatus> {
  const capture = await runner(["capture-pane", "-pt", targetPane], {
    allowFailure: true
  });
  if (capture.exitCode !== 0) {
    return "not_found";
  }
  const output = capture.stdout;
  if (!output.includes(marker)) {
    return "not_found";
  }

  // Find the last prompt line.  Claude Code renders `>` (or `❯`) at the start
  // of its input area.  Everything after that line is the current input buffer.
  const lines = output.split("\n");
  const lastPromptIdx = findLastIndex(
    lines,
    (l) => /^\s*[>❯]/.test(l)
  );
  if (lastPromptIdx < 0) {
    // No prompt visible — marker is in output area.
    return "submitted";
  }

  const beforePrompt = lines.slice(0, lastPromptIdx).join("\n");
  if (beforePrompt.includes(marker)) {
    return "submitted";
  }

  // Marker only appears in/after the prompt line → stuck in input buffer.
  return "stuck_in_input";
}

function findLastIndex(arr: string[], predicate: (item: string) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i]!)) {
      return i;
    }
  }
  return -1;
}

export async function emitTmuxDeliveryNotification(
  input: EmitTmuxDeliveryNotificationInput
): Promise<EmitTmuxDeliveryNotificationResult> {
  const messageRef =
    input.messageRef ?? input.envelope.refs[0] ?? `transcript.ndjson#${input.envelope.id}`;
  const readSessions = input.readSessionsRegistry ?? readRuntimeSessionsRegistry;

  let sessionName: string | undefined;
  let worktreePath: string | undefined;
  try {
    const sessions = await readSessions(input.sessionsPath, {
      allowMissing: true
    });
    const record = sessions[input.bubbleId];
    sessionName = record?.tmuxSessionName;
    worktreePath = record?.worktreePath;
  } catch {
    const message = buildDeliveryMessage(
      input.envelope,
      messageRef,
      input.bubbleConfig
    );
    return {
      delivered: false,
      message,
      reason: "registry_read_failed"
    };
  }

  if (sessionName === undefined) {
    const message = buildDeliveryMessage(
      input.envelope,
      messageRef,
      input.bubbleConfig
    );
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
    const message = buildDeliveryMessage(
      input.envelope,
      messageRef,
      input.bubbleConfig,
      worktreePath
    );
    return {
      delivered: false,
      sessionName,
      message,
      reason: "unsupported_recipient"
    };
  }

  const targetPane = `${sessionName}:0.${targetPaneIndex}`;
  const message = buildDeliveryMessage(
    input.envelope,
    messageRef,
    input.bubbleConfig,
    worktreePath
  );
  const runner = input.runner ?? runTmux;

  try {
    if ((input.initialDelayMs ?? 0) > 0) {
      await sleep(input.initialDelayMs as number);
    }
    const attempts = Math.max(1, input.deliveryAttempts ?? 3);
    let confirmed = false;
    await maybeAcceptClaudeTrustPrompt(runner, targetPane).catch(() => undefined);
    // Send message + trailing newline in a single literal send-keys call.
    // This eliminates the timing gap between text entry and Enter that caused
    // messages to get stuck in the Claude Code input buffer without submitting.
    await sendAndSubmitTmuxPaneMessage(runner, targetPane, message);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      // Allow UI flush then check where the marker appears.
      await sleep(800);
      const status = await checkMarkerStatus(runner, targetPane, input.envelope.id);
      if (status === "submitted") {
        confirmed = true;
        break;
      }
      if (attempt < attempts - 1) {
        // "stuck_in_input" or "not_found" — retry with a bare Enter.
        await sleep(900);
        await submitTmuxPaneInput(runner, targetPane);
      }
    }
    if (!confirmed) {
      return {
        delivered: false,
        sessionName,
        targetPaneIndex,
        message,
        reason: "delivery_unconfirmed"
      };
    }
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
