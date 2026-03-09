import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assessPairflowCommandPath,
  buildPairflowCommandBootstrap,
  buildPairflowCommandGuidance,
  buildPinnedPairflowCommand,
  resolveWorktreePairflowEntrypoint
} from "../../../src/core/runtime/pairflowCommand.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("pairflow command path helpers", () => {
  it("resolves the worktree-local entrypoint deterministically", () => {
    expect(
      resolveWorktreePairflowEntrypoint("/tmp/pairflow-worktree")
    ).toBe("/tmp/pairflow-worktree/dist/cli/index.js");
    expect(
      buildPinnedPairflowCommand("/tmp/pairflow-worktree")
    ).toBe("node '/tmp/pairflow-worktree/dist/cli/index.js'");
  });

  it("fails closed with PAIRFLOW_COMMAND_PATH_STALE when local entrypoint is unavailable", () => {
    const bootstrap = buildPairflowCommandBootstrap("/tmp/pairflow-worktree");

    expect(bootstrap.join("\n")).toContain("PAIRFLOW_COMMAND_PATH_STALE");
    expect(bootstrap.join("\n")).toContain('exit 86');
    expect(bootstrap.join("\n")).toContain('PAIRFLOW_WRAPPER_DIR');
    expect(bootstrap.join("\n")).toContain('cat > "$PAIRFLOW_WRAPPER_DIR/pairflow"');
    expect(bootstrap.join("\n")).toContain('export PATH="$PAIRFLOW_WRAPPER_DIR:$PATH"');
  });

  it("reports stale when active entrypoint does not match the worktree-local build", () => {
    const assessment = assessPairflowCommandPath({
      worktreePath: "/tmp/pairflow-worktree",
      activeEntrypoint: "/usr/local/lib/node_modules/pairflow/dist/cli/index.js",
      localEntrypointExists: true
    });

    expect(assessment.status).toBe("stale");
    expect(assessment.reasonCode).toBe("PAIRFLOW_COMMAND_PATH_STALE");
    expect(assessment.message).toContain("/usr/local/lib/node_modules/pairflow");
    expect(assessment.message).toContain("/tmp/pairflow-worktree/dist/cli/index.js");
  });

  it("reports worktree-local when the active entrypoint matches the current worktree", () => {
    const assessment = assessPairflowCommandPath({
      worktreePath: "/tmp/pairflow-worktree",
      activeEntrypoint: "/tmp/pairflow-worktree/dist/cli/index.js",
      localEntrypointExists: true
    });

    expect(assessment.status).toBe("worktree_local");
    expect(assessment.reasonCode).toBeUndefined();
    expect(assessment.message).toContain("worktree-local Pairflow entrypoint active");
  });

  it("treats symlinked active and local entrypoints as the same canonical file", async () => {
    const root = await mkdtemp(join(tmpdir(), "pairflow-command-path-"));
    tempDirs.push(root);
    const distDir = join(root, "dist", "cli");
    await mkdir(distDir, { recursive: true });
    const localEntrypoint = join(distDir, "index.js");
    const linkedEntrypoint = join(root, "linked-index.js");
    await writeFile(localEntrypoint, "console.log('pairflow');\n", "utf8");
    await symlink(localEntrypoint, linkedEntrypoint);

    const assessment = assessPairflowCommandPath({
      worktreePath: root,
      activeEntrypoint: linkedEntrypoint
    });

    expect(assessment.status).toBe("worktree_local");
    expect(assessment.reasonCode).toBeUndefined();
  });

  it("builds operator guidance with the stale-path fail-closed contract", () => {
    const guidance = buildPairflowCommandGuidance("/tmp/pairflow-worktree");
    expect(guidance).toContain("/tmp/pairflow-worktree/dist/cli/index.js");
    expect(guidance).toContain("wrapper to `PATH`");
    expect(guidance).toContain("PAIRFLOW_COMMAND_PATH_STALE");
  });
});
