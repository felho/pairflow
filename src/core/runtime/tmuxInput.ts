import type { TmuxRunner } from "./tmuxManager.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
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
  message: string
): Promise<void> {
  const writeResult = await runner(
    ["send-keys", "-t", targetPane, "-l", message],
    { allowFailure: true }
  );
  if (writeResult.exitCode !== 0) {
    return;
  }

  // Brief gap lets the TUI process and render the pasted text before receiving
  // the Enter key as a distinct input event.  500ms was verified against Claude
  // Code v2.1.50 with messages up to 550 chars.
  await sleep(500);
  await runner(["send-keys", "-t", targetPane, "Enter"], {
    allowFailure: true
  });
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

export async function maybeAcceptClaudeTrustPrompt(
  runner: TmuxRunner,
  targetPane: string
): Promise<boolean> {
  const capture = await runner(["capture-pane", "-pt", targetPane], {
    allowFailure: true
  });
  if (capture.exitCode !== 0) {
    return false;
  }

  const normalized = capture.stdout.toLowerCase();
  const looksLikeTrustPrompt =
    normalized.includes("security guide") &&
    normalized.includes("yes, i trust this folder");
  if (!looksLikeTrustPrompt) {
    return false;
  }

  await sendAndSubmitTmuxPaneMessage(runner, targetPane, "1");
  await sleep(200);
  return true;
}
