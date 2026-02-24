import type { TmuxRunner } from "./tmuxManager.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

export interface SubmitTmuxPaneInputOptions {
  beforeSubmitMs?: number;
}

export async function submitTmuxPaneInput(
  runner: TmuxRunner,
  targetPane: string,
  options: SubmitTmuxPaneInputOptions = {}
): Promise<void> {
  const beforeSubmitMs = options.beforeSubmitMs ?? 300;
  if (beforeSubmitMs > 0) {
    await sleep(beforeSubmitMs);
  }

  // Primary strategy mirrors the known-good hook behavior:
  // send message text first, then submit with Enter after a short delay.
  const enterResult = await runner(["send-keys", "-t", targetPane, "Enter"], {
    allowFailure: true
  });

  if (enterResult.exitCode === 0) {
    return;
  }

  // Fallbacks only when Enter key dispatch itself fails at tmux level.
  const carriageResult = await runner(["send-keys", "-t", targetPane, "C-m"], {
    allowFailure: true
  });
  if (carriageResult.exitCode === 0) {
    return;
  }

  await runner(["send-keys", "-t", targetPane, "-l", "\r"], {
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
