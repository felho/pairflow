import type { TmuxRunner } from "../../../ports/tmuxSessions.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

export interface SendAndSubmitTmuxPaneMessageOptions {
  requireSuccess?: boolean;
}

export type TmuxPaneMarkerStatus = "submitted" | "stuck_in_input" | "not_found";

export interface ConfirmTmuxPaneMarkerSubmissionInput {
  runner: TmuxRunner;
  targetPane: string;
  marker: string;
  attempts?: number;
  settleDelayMs?: number;
  retryDelayMs?: number;
}

async function maybeExitTmuxCopyMode(input: {
  runner: TmuxRunner;
  targetPane: string;
  requireSuccess: boolean;
}): Promise<void> {
  const paneMode = await input.runner(
    ["display-message", "-p", "-t", input.targetPane, "#{pane_in_mode}"],
    { allowFailure: true }
  );
  if (paneMode.exitCode !== 0) {
    if (input.requireSuccess) {
      throw new Error(
        `TMUX_PANE_MODE_CHECK_FAILED: context operation_id=tmux_input_preflight target_pane=${input.targetPane}.`
      );
    }
    return;
  }

  const paneModeValue = Number.parseInt(paneMode.stdout.trim(), 10);
  if (!Number.isFinite(paneModeValue) || paneModeValue <= 0) {
    return;
  }

  const cancelMode = await input.runner(
    ["copy-mode", "-q", "-t", input.targetPane],
    { allowFailure: true }
  );
  if (cancelMode.exitCode !== 0) {
    if (input.requireSuccess) {
      throw new Error(
        `TMUX_COPY_MODE_CANCEL_FAILED: context operation_id=tmux_input_preflight target_pane=${input.targetPane}.`
      );
    }
    return;
  }

  // Let tmux settle after exiting copy mode before sending keys into the pane.
  await sleep(100);
}

/**
 * Send a message to a tmux pane and submit it via Enter.
 *
 * Verified against a real Claude Code instance: the Enter MUST arrive as a
 * separate tmux `send-keys` command with a brief gap after the text.  Embedding
 * CR/LF in the literal text (`-l "text\r"` or `"text\n"`) does NOT trigger
 * submit in ink-based TUIs — they treat in-band control chars as newlines
 * inside the text editor rather than as submit actions.
 *
 * The pattern matches the proven detect-clear-suffix hook:
 *   tmux send-keys -l "text" && sleep 0.3 && tmux send-keys Enter
 */
export async function sendAndSubmitTmuxPaneMessage(
  runner: TmuxRunner,
  targetPane: string,
  message: string,
  options: SendAndSubmitTmuxPaneMessageOptions = {}
): Promise<void> {
  await maybeExitTmuxCopyMode({
    runner,
    targetPane,
    requireSuccess: options.requireSuccess ?? false
  });
  const writeResult = await runner(
    ["send-keys", "-t", targetPane, "-l", message],
    { allowFailure: true }
  );
  if (writeResult.exitCode !== 0) {
    if (options.requireSuccess) {
      throw new Error(
        `TMUX_MESSAGE_WRITE_FAILED: context operation_id=tmux_input_send target_pane=${targetPane}.`
      );
    }
    return;
  }

  // Brief gap lets the TUI process and render the pasted text before receiving
  // the Enter key as a distinct input event.  500ms was verified against Claude
  // Code v2.1.50 with messages up to 550 chars.
  await sleep(500);
  const submitResult = await runner(["send-keys", "-t", targetPane, "Enter"], {
    allowFailure: true
  });
  if (submitResult.exitCode !== 0 && options.requireSuccess) {
    throw new Error(
      `TMUX_MESSAGE_SUBMIT_FAILED: context operation_id=tmux_input_submit target_pane=${targetPane}.`
    );
  }
}

/**
 * Send a bare Enter to a tmux pane (for retry attempts when the initial
 * send-and-submit didn't register).
 */
export async function submitTmuxPaneInput(
  runner: TmuxRunner,
  targetPane: string
): Promise<void> {
  await runner(["send-keys", "-t", targetPane, "Enter"], {
    allowFailure: true
  });
}

function findLastIndex(arr: string[], predicate: (item: string) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i]!)) {
      return i;
    }
  }
  return -1;
}

function isAgentPromptLine(line: string): boolean {
  // Some terminal layouts prefix prompt lines with pane border glyphs
  // (for example `│ ❯`). Treat those as prompt lines too.
  return /^\s*(?:[|│┃]\s*)*[>❯]/u.test(line);
}

export async function checkTmuxPaneMarkerStatus(
  runner: TmuxRunner,
  targetPane: string,
  marker: string
): Promise<TmuxPaneMarkerStatus> {
  const capture = await runner(["capture-pane", "-p", "-S", "-200", "-t", targetPane], {
    allowFailure: true
  });
  if (capture.exitCode !== 0) {
    return "not_found";
  }

  const output = capture.stdout;
  if (!output.includes(marker)) {
    return "not_found";
  }

  const lines = output.split("\n");
  const lastPromptIdx = findLastIndex(lines, isAgentPromptLine);
  if (lastPromptIdx < 0) {
    // A promptless marker can be a wrapped TUI input buffer with the prompt
    // scrolled off-capture. Treat it as unsubmitted so delivery fails closed
    // instead of accepting text that may still be waiting for Enter.
    return "stuck_in_input";
  }

  const promptAndAfter = lines.slice(lastPromptIdx).join("\n");
  if (promptAndAfter.includes(marker)) {
    return "stuck_in_input";
  }

  const beforePrompt = lines.slice(0, lastPromptIdx).join("\n");
  if (beforePrompt.includes(marker)) {
    return "submitted";
  }

  return "not_found";
}

export async function confirmTmuxPaneMarkerSubmission(
  input: ConfirmTmuxPaneMarkerSubmissionInput
): Promise<boolean> {
  const attempts = Math.max(1, input.attempts ?? 3);
  const settleDelayMs = input.settleDelayMs ?? 800;
  const retryDelayMs = input.retryDelayMs ?? 900;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await sleep(settleDelayMs);
    const status = await checkTmuxPaneMarkerStatus(
      input.runner,
      input.targetPane,
      input.marker
    );
    if (status === "submitted") {
      return true;
    }
    if (attempt < attempts - 1) {
      await sleep(retryDelayMs);
      await submitTmuxPaneInput(input.runner, input.targetPane);
    }
  }

  return false;
}

export async function maybeAcceptClaudeTrustPrompt(
  runner: TmuxRunner,
  targetPane: string
): Promise<boolean> {
  let accepted = false;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const capture = await runner(["capture-pane", "-pt", targetPane], {
      allowFailure: true
    });
    if (capture.exitCode !== 0) {
      return accepted;
    }

    const normalized = capture.stdout.toLowerCase();
    const looksLikeClaudeFolderTrustPrompt =
      normalized.includes("security guide") &&
      normalized.includes("yes, i trust this folder");
    const looksLikeClaudeBypassPermissionsPrompt =
      normalized.includes("bypass permissions mode") &&
      normalized.includes("yes, i accept");
    const looksLikeCodexTrustPrompt =
      normalized.includes("do you trust the contents of this directory") &&
      normalized.includes("1. yes, continue");

    if (looksLikeClaudeFolderTrustPrompt) {
      // Claude's folder-trust prompt already highlights the "Yes" option.
      // Confirming requires a bare Enter, not typing "1".
      await submitTmuxPaneInput(runner, targetPane);
      accepted = true;
      await sleep(250);
      continue;
    }

    if (looksLikeClaudeBypassPermissionsPrompt) {
      await sendAndSubmitTmuxPaneMessage(runner, targetPane, "2");
      accepted = true;
      await sleep(250);
      continue;
    }

    if (looksLikeCodexTrustPrompt) {
      await sendAndSubmitTmuxPaneMessage(runner, targetPane, "1");
      accepted = true;
      await sleep(250);
      continue;
    }

    return accepted;
  }

  return accepted;
}
