import type { TmuxRunner } from "./tmuxManager.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

export async function submitTmuxPaneInput(
  runner: TmuxRunner,
  targetPane: string
): Promise<void> {
  // Codex/Claude TUI reliably submit on literal carriage return in tmux.
  await runner(["send-keys", "-t", targetPane, "-l", "\r"], {
    allowFailure: true
  });
  // Keep legacy key-based submits as fallbacks for non-TUI pane processes.
  await runner(["send-keys", "-t", targetPane, "Enter"], {
    allowFailure: true
  });
  await runner(["send-keys", "-t", targetPane, "C-m"], {
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

  await runner(["send-keys", "-t", targetPane, "-l", "1"], {
    allowFailure: true
  });
  await submitTmuxPaneInput(runner, targetPane);
  await sleep(200);
  return true;
}
