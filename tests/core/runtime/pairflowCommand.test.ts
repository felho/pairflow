import { chmod, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assessPairflowCommandPath,
  buildPairflowCommandBootstrap,
  buildPairflowCommandGuidance,
  buildPinnedPairflowCommand,
  resolveExternalPairflowCommand,
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
      buildPinnedPairflowCommand("/tmp/pairflow-worktree", "self_host")
    ).toBe("node '/tmp/pairflow-worktree/dist/cli/index.js'");
    expect(
      buildPinnedPairflowCommand("/tmp/pairflow-worktree")
    ).toBe("pairflow");
    expect(
      buildPinnedPairflowCommand("/tmp/pairflow-worktree", "external")
    ).toBe("pairflow");
  });

  it("fails closed with PAIRFLOW_COMMAND_PATH_STALE when self_host local entrypoint is unavailable", () => {
    const bootstrap = buildPairflowCommandBootstrap(
      "/tmp/pairflow-worktree",
      "self_host"
    );

    expect(bootstrap.join("\n")).toContain("PAIRFLOW_COMMAND_PATH_STALE");
    expect(bootstrap.join("\n")).toContain('exit 86');
    expect(bootstrap.join("\n")).toContain('PAIRFLOW_WRAPPER_DIR');
    expect(bootstrap.join("\n")).toContain('cat > "$PAIRFLOW_WRAPPER_DIR/pairflow"');
    expect(bootstrap.join("\n")).toContain('export PATH="$PAIRFLOW_WRAPPER_DIR:$PATH"');
  });

  it("builds external profile bootstrap wrapper", () => {
    const bootstrap = buildPairflowCommandBootstrap(
      "/tmp/pairflow-worktree",
      "external"
    );

    expect(bootstrap.join("\n")).toContain("PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE");
    expect(bootstrap.join("\n")).toContain("PAIRFLOW_EXTERNAL_COMMAND");
    expect(bootstrap.join("\n")).not.toContain("PAIRFLOW_LOCAL_ENTRYPOINT");
    expect(bootstrap.join("\n")).toContain("PAIRFLOW_WRAPPER_PATH");
    expect(bootstrap.join("\n")).toContain(
      'if [ "$PAIRFLOW_EXTERNAL_COMMAND" = "$PAIRFLOW_WRAPPER_PATH" ]; then'
    );
    expect(bootstrap.join("\n")).toContain(
      '[ "$PAIRFLOW_EXTERNAL_COMMAND" != "$PAIRFLOW_WRAPPER_PATH" ]'
    );
    expect(bootstrap.join("\n")).toContain('exec "$PAIRFLOW_EXTERNAL_COMMAND" "$@"');
    expect(bootstrap.join("\n")).not.toContain('exec node "$PAIRFLOW_LOCAL_ENTRYPOINT" "$@"');
    expect(bootstrap.join("\n")).toContain("exit 87");
    expect(bootstrap.join("\n")).toContain("PAIRFLOW_COMMAND_PATH_STATUS=external");
    expect(bootstrap.join("\n")).toContain('PAIRFLOW_WRAPPER_DIR');
    expect(bootstrap.join("\n")).toContain('cat > "$PAIRFLOW_WRAPPER_DIR/pairflow"');
    expect(bootstrap.join("\n")).toContain('export PATH="$PAIRFLOW_WRAPPER_DIR:$PATH"');
  });

  it("resolves external pairflow by ignoring the worktree wrapper directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "pairflow-command-external-"));
    tempDirs.push(root);
    const wrapperDir = join(root, ".pairflow", "bin");
    const externalDir = join(root, "external-bin");
    const wrapperCommand = join(wrapperDir, "pairflow");
    const externalCommand = join(externalDir, "pairflow");

    await mkdir(wrapperDir, { recursive: true });
    await mkdir(externalDir, { recursive: true });
    await writeFile(wrapperCommand, "#!/bin/sh\nexit 87\n", "utf8");
    await writeFile(externalCommand, "#!/bin/sh\nexit 0\n", "utf8");
    await Promise.all([
      chmod(wrapperCommand, 0o755),
      chmod(externalCommand, 0o755)
    ]);

    const originalPath = process.env.PATH;
    process.env.PATH = `${wrapperDir}:${externalDir}${originalPath ? `:${originalPath}` : ""}`;
    try {
      expect(resolveExternalPairflowCommand(root)).toBe(externalCommand);
    } finally {
      process.env.PATH = originalPath;
    }
  });

  it("reports stale when active entrypoint does not match the worktree-local build", () => {
    const assessment = assessPairflowCommandPath({
      worktreePath: "/tmp/pairflow-worktree",
      profile: "self_host",
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
      profile: "self_host",
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
      profile: "self_host",
      activeEntrypoint: linkedEntrypoint
    });

    expect(assessment.status).toBe("worktree_local");
    expect(assessment.reasonCode).toBeUndefined();
  });

  it("keeps external status when external profile has no local worktree entrypoint", () => {
    const assessment = assessPairflowCommandPath({
      worktreePath: "/tmp/pairflow-worktree",
      profile: "external",
      activeEntrypoint: "/usr/local/lib/node_modules/pairflow/dist/cli/index.js",
      localEntrypointExists: false,
      externalPairflowAvailable: true
    });

    expect(assessment.status).toBe("external");
    expect(assessment.reasonCode).toBeUndefined();
    expect(assessment.entrypointConsistency).toBe("unknown");
  });

  it("keeps external status for external profile when active Pairflow dist entrypoint drifts from worktree-local build", () => {
    const assessment = assessPairflowCommandPath({
      worktreePath: "/tmp/pairflow-worktree",
      profile: "external",
      activeEntrypoint: "/usr/local/lib/node_modules/pairflow/dist/cli/index.js",
      localEntrypointExists: true,
      externalPairflowAvailable: true
    });

    expect(assessment.status).toBe("external");
    expect(assessment.reasonCode).toBeUndefined();
    expect(assessment.entrypointConsistency).toBe("inconsistent");
    expect(assessment.message).toContain("external profile authority remains the PATH-resolved `pairflow` tool");
  });

  it("marks external profile entrypoint consistency as inconsistent when a wrapped active path canonically resolves to a different Pairflow dist entrypoint", async () => {
    const root = await mkdtemp(join(tmpdir(), "pairflow-command-path-external-mismatch-"));
    tempDirs.push(root);
    const localDistDir = join(root, "dist", "cli");
    const externalDistDir = join(root, "external", "dist", "cli");
    await mkdir(localDistDir, { recursive: true });
    await mkdir(externalDistDir, { recursive: true });
    const localEntrypoint = join(localDistDir, "index.js");
    const externalEntrypoint = join(externalDistDir, "index.js");
    const wrappedActiveEntrypoint = join(root, "wrapped-active.js");
    await writeFile(localEntrypoint, "console.log('pairflow-local');\n", "utf8");
    await writeFile(externalEntrypoint, "console.log('pairflow-external');\n", "utf8");
    await symlink(externalEntrypoint, wrappedActiveEntrypoint);

    const assessment = assessPairflowCommandPath({
      worktreePath: root,
      profile: "external",
      activeEntrypoint: wrappedActiveEntrypoint,
      externalPairflowAvailable: true
    });

    expect(assessment.status).toBe("external");
    expect(assessment.reasonCode).toBeUndefined();
    expect(assessment.entrypointConsistency).toBe("inconsistent");
    expect(assessment.message).toContain("external profile authority remains the PATH-resolved `pairflow` tool");
  });

  it("marks external profile entrypoint consistency as consistent when active and local dist entrypoints resolve to the same canonical file", async () => {
    const root = await mkdtemp(join(tmpdir(), "pairflow-command-path-external-"));
    tempDirs.push(root);
    const distDir = join(root, "dist", "cli");
    await mkdir(distDir, { recursive: true });
    const localEntrypoint = join(distDir, "index.js");
    const activeEntrypoint = join(root, "active-dist-index.js");
    await writeFile(localEntrypoint, "console.log('pairflow-external');\n", "utf8");
    await symlink(localEntrypoint, activeEntrypoint);

    const assessment = assessPairflowCommandPath({
      worktreePath: root,
      profile: "external",
      activeEntrypoint,
      externalPairflowAvailable: true
    });

    expect(assessment.status).toBe("external");
    expect(assessment.reasonCode).toBeUndefined();
    expect(assessment.entrypointConsistency).toBe("consistent");
  });

  it("reports missing when external profile cannot resolve pairflow from PATH", () => {
    const assessment = assessPairflowCommandPath({
      worktreePath: "/tmp/pairflow-worktree",
      profile: "external",
      externalPairflowAvailable: false
    });

    expect(assessment.status).toBe("missing");
    expect(assessment.reasonCode).toBe("PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE");
    expect(assessment.entrypointConsistency).toBe("unknown");
  });

  it("reports missing even when active entrypoint is already resolved if PATH pairflow is unavailable", () => {
    const assessment = assessPairflowCommandPath({
      worktreePath: "/tmp/pairflow-worktree",
      profile: "external",
      activeEntrypoint: "/usr/local/lib/node_modules/pairflow/dist/cli/index.js",
      externalPairflowAvailable: false
    });

    expect(assessment.status).toBe("missing");
    expect(assessment.reasonCode).toBe("PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE");
    expect(assessment.message).toContain("Active entrypoint was resolved");
  });

  it("reports unresolved status when self_host active entrypoint cannot be resolved", () => {
    const assessment = assessPairflowCommandPath({
      worktreePath: "/tmp/pairflow-worktree",
      profile: "self_host",
      activeEntrypoint: undefined,
      localEntrypointExists: true
    });

    expect(assessment.status).toBe("unknown");
    expect(assessment.reasonCode).toBe("PAIRFLOW_COMMAND_PATH_UNRESOLVED");
  });

  it("builds operator guidance with the stale-path fail-closed contract", () => {
    const guidance = buildPairflowCommandGuidance(
      "/tmp/pairflow-worktree",
      "self_host"
    );
    expect(guidance).toContain("/tmp/pairflow-worktree/dist/cli/index.js");
    expect(guidance).toContain("wrapper to `PATH`");
    expect(guidance).toContain("PAIRFLOW_COMMAND_PATH_STALE");
  });

  it("builds operator guidance for external profile", () => {
    const guidance = buildPairflowCommandGuidance(
      "/tmp/pairflow-worktree",
      "external"
    );

    expect(guidance).toContain("Default command profile is `external`");
    expect(guidance).toContain("wrapper delegates to the PATH-resolved external `pairflow`");
    expect(guidance).toContain("--pairflow-command-profile self_host");
  });
});
