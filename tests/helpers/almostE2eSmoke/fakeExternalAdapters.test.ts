import { describe, expect, it } from "vitest";
import { createFakeExternalAdapters } from "./fakeExternalAdapters.js";

describe("almost e2e smoke fake external adapters", () => {
  it("records process/editor/terminal/tmux side effects without real launches", async () => {
    const adapters = createFakeExternalAdapters({
      sessionName: "pairflow-smoke-test"
    });

    const child = adapters.processSpawn("pairflow", ["agent", "emit"], {
      cwd: "/tmp/repo"
    });
    await adapters.openEditor("/tmp/repo/task.md", "/tmp/repo");
    await adapters.openTerminal("pairflow", ["bubble", "status"], "/tmp/repo");
    const launchAck = await adapters.launchBubbleSessionAck({
      bubbleId: "bubble-1",
      workspacePath: "/tmp/worktree",
      statusCommand: "pairflow bubble status",
      implementerCommand: "codex",
      reviewerCommand: "codex"
    });
    const terminate = await adapters.terminateBubbleTmuxSession({
      bubbleId: "bubble-1"
    });

    expect(child.kill()).toBe(true);
    expect(launchAck).toEqual({
      status: "running",
      sessionName: "pairflow-smoke-test"
    });
    expect(terminate).toEqual({
      sessionName: "pairflow-smoke-test",
      existed: true
    });
    expect(adapters.snapshot()).toMatchObject({
      processSpawns: [
        {
          command: "pairflow",
          args: ["agent", "emit"],
          options: {
            cwd: "/tmp/repo"
          }
        }
      ],
      editorOpens: [
        {
          path: "/tmp/repo/task.md",
          cwd: "/tmp/repo"
        }
      ],
      terminalOpens: [
        {
          command: "pairflow",
          args: ["bubble", "status"],
          cwd: "/tmp/repo"
        }
      ],
      launchAcks: [
        {
          input: {
            bubbleId: "bubble-1"
          }
        }
      ],
      terminateTmux: [
        {
          input: {
            bubbleId: "bubble-1"
          }
        }
      ]
    });
  });

  it("emits process close once when killed before scheduled completion", async () => {
    const adapters = createFakeExternalAdapters();
    const child = adapters.processSpawn("pairflow", []);
    let closeCount = 0;
    child.on("close", () => {
      closeCount += 1;
    });

    child.kill();
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(closeCount).toBe(1);
  });

  it("returns side-effect snapshots that cannot mutate recorded state", async () => {
    const adapters = createFakeExternalAdapters();
    const launchInput = {
      bubbleId: "bubble-1",
      workspacePath: "/tmp/worktree",
      statusCommand: "pairflow bubble status",
      implementerCommand: "codex",
      reviewerCommand: "codex"
    };
    await adapters.launchBubbleSessionAck(launchInput);

    const snapshot = adapters.snapshot();
    snapshot.launchAcks[0]!.input.bubbleId = "changed";
    launchInput.bubbleId = "also-changed";

    expect(adapters.snapshot().launchAcks[0]!.input.bubbleId).toBe("bubble-1");
  });

  it("clones process spawn options in recorded snapshots", () => {
    const adapters = createFakeExternalAdapters();
    const options = {
      cwd: "/tmp/repo",
      env: {
        TOKEN: "original"
      },
      stdio: ["ignore", "pipe", "pipe"] as ["ignore", "pipe", "pipe"]
    };
    adapters.processSpawn("pairflow", ["status"], options);

    const snapshot = adapters.snapshot();
    snapshot.processSpawns[0]!.options!.env!.TOKEN = "changed";
    options.env.TOKEN = "also-changed";

    expect(adapters.snapshot().processSpawns[0]!.options!.env!.TOKEN).toBe(
      "original"
    );
  });
});
