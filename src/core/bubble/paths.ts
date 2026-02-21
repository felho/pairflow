import { basename, dirname, join, resolve } from "node:path";

export interface BubblePaths {
  repoPath: string;
  pairflowRoot: string;
  bubblesRoot: string;
  bubbleDir: string;
  bubbleTomlPath: string;
  statePath: string;
  transcriptPath: string;
  inboxPath: string;
  artifactsDir: string;
  messageArtifactsDir: string;
  taskArtifactPath: string;
  locksDir: string;
  runtimeDir: string;
  sessionsPath: string;
  worktreePath: string;
}

export function getBubblePaths(repoPathInput: string, bubbleId: string): BubblePaths {
  const repoPath = resolve(repoPathInput);
  const pairflowRoot = join(repoPath, ".pairflow");
  const bubblesRoot = join(pairflowRoot, "bubbles");
  const bubbleDir = join(bubblesRoot, bubbleId);
  const artifactsDir = join(bubbleDir, "artifacts");
  const messageArtifactsDir = join(artifactsDir, "messages");
  const locksDir = join(pairflowRoot, "locks");
  const runtimeDir = join(pairflowRoot, "runtime");

  const repoParentPath = dirname(repoPath);
  const repoName = basename(repoPath);
  const worktreePath = join(
    repoParentPath,
    ".pairflow-worktrees",
    repoName,
    bubbleId
  );

  return {
    repoPath,
    pairflowRoot,
    bubblesRoot,
    bubbleDir,
    bubbleTomlPath: join(bubbleDir, "bubble.toml"),
    statePath: join(bubbleDir, "state.json"),
    transcriptPath: join(bubbleDir, "transcript.ndjson"),
    inboxPath: join(bubbleDir, "inbox.ndjson"),
    artifactsDir,
    messageArtifactsDir,
    taskArtifactPath: join(artifactsDir, "task.md"),
    locksDir,
    runtimeDir,
    sessionsPath: join(runtimeDir, "sessions.json"),
    worktreePath
  };
}
