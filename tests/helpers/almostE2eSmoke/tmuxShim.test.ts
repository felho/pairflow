import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

import { checkTmuxPaneMarkerStatus } from "../../../src/v11/infrastructure/channel/tmux/tmuxInput.js";
import {
  createAlmostE2eSmokeFixtureRepo,
  installCompiledCliShimEnvironment
} from "./index.js";

const execFileAsync = promisify(execFile);

describe("almost e2e smoke tmux shim", () => {
  it("reports a sent marker as stuck until Enter submits the pane input", async () => {
    const fixture = await createAlmostE2eSmokeFixtureRepo({
      prefix: "tmux-shim-marker"
    });
    try {
      const shims = await installCompiledCliShimEnvironment(fixture);
      const runTmux = async (args: string[]) => {
        const result = await execFileAsync("tmux", args, {
          cwd: fixture.root,
          env: shims.env
        });
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: 0
        };
      };

      await runTmux(["new-session", "-d", "-s", "pairflow-smoke-shim"]);
      const split = await runTmux(["split-window", "-t", "pairflow-smoke-shim:0"]);
      const paneId = split.stdout.trim();
      const marker = "msg=marker_tmux_shim";

      await runTmux(["send-keys", "-t", paneId, "-l", `[pairflow] ${marker}`]);
      await expect(
        checkTmuxPaneMarkerStatus(runTmux, paneId, marker)
      ).resolves.toBe("stuck_in_input");

      await runTmux(["send-keys", "-t", paneId, "Enter"]);
      await expect(
        checkTmuxPaneMarkerStatus(runTmux, paneId, marker)
      ).resolves.toBe("submitted");
    } finally {
      await fixture.cleanup();
    }
  });
});
