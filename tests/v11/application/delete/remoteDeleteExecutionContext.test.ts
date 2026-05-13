import { afterEach, describe, expect, it, vi } from "vitest";
import { realpathSync } from "node:fs";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  remoteDeleteModeEnvVar,
  remoteDeleteModeInnerRemoteExecution,
  remoteDeleteWorkspaceRootEnvVar,
  resolveRemoteDeleteExecutionContextFromEnv
} from "../../../../src/v11/application/delete/internal/remote/remoteDeleteExecutionContext.js";

const tempDirs: string[] = [];

afterEach(() => {
  vi.unstubAllEnvs();
  return Promise.all(tempDirs.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true
  })));
});

async function createTempPath(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(path);
  return path;
}

describe("remoteDeleteExecutionContext", () => {
  it("returns undefined when no remote delete env is set", () => {
    expect(resolveRemoteDeleteExecutionContextFromEnv()).toBeUndefined();
  });

  it("returns a canonicalized remote clone context on the happy path", async () => {
    const root = await createTempPath("pairflow-remote-delete-context-");
    const realWorkspace = await createTempPath("pairflow-remote-delete-workspace-");
    const symlinkPath = join(root, "workspace-link");
    await symlink(realWorkspace, symlinkPath);

    vi.stubEnv(remoteDeleteModeEnvVar, remoteDeleteModeInnerRemoteExecution);
    vi.stubEnv(remoteDeleteWorkspaceRootEnvVar, symlinkPath);

    expect(resolveRemoteDeleteExecutionContextFromEnv()).toEqual({
      kind: "remote_clone",
      workspaceRoot: realpathSync.native(realWorkspace)
    });
  });

  it("rejects unsupported remote delete mode values explicitly", () => {
    vi.stubEnv(remoteDeleteModeEnvVar, "unexpected_mode");
    vi.stubEnv(remoteDeleteWorkspaceRootEnvVar, "/srv/pairflow/repo");

    expect(() => resolveRemoteDeleteExecutionContextFromEnv()).toThrow(
      /unsupported execution mode: 'unexpected_mode'/u
    );
  });

  it("rejects workspace authority without a matching mode", () => {
    vi.stubEnv(remoteDeleteWorkspaceRootEnvVar, "/srv/pairflow/repo");

    expect(() => resolveRemoteDeleteExecutionContextFromEnv()).toThrow(
      /workspace authority was provided without the matching remote execution mode/u
    );
  });

  it("rejects missing workspace authority when the mode is enabled", () => {
    vi.stubEnv(remoteDeleteModeEnvVar, remoteDeleteModeInnerRemoteExecution);

    expect(() => resolveRemoteDeleteExecutionContextFromEnv()).toThrow(
      /requires explicit clone-root workspace authority/u
    );
  });
});
