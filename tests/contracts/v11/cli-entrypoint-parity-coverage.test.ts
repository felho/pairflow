import { access, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const cliEntrypointParityTestsByCommand: Record<string, readonly string[]> = {
  create: ["tests/v11/application/create/createCliEntrypointParity.test.ts"],
  delete: ["tests/v11/application/delete/deleteCliEntrypointParity.test.ts"],
  inbox: ["tests/v11/application/inbox/inboxCliEntrypointParity.test.ts"],
  kickoff: ["tests/v11/application/kickoff/kickoffCliEntrypointParity.test.ts"],
  list: ["tests/v11/application/list/listCliEntrypointParity.test.ts"],
  metaReview: [
    "tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts"
  ],
  open: ["tests/v11/application/open/openCliEntrypointParity.test.ts"],
  reconcile: [
    "tests/v11/application/reconcile/reconcileCliEntrypointParity.test.ts"
  ],
  restart: ["tests/v11/application/restart/restartCliEntrypointParity.test.ts"],
  start: ["tests/v11/application/start/startCliEntrypointParity.test.ts"],
  status: ["tests/v11/application/status/statusCliEntrypointParity.test.ts"]
};

async function listV11CliCommands(): Promise<string[]> {
  const applicationRoot = resolve(process.cwd(), "src/v11/application");
  const entries = await readdir(applicationRoot, {
    withFileTypes: true,
    recursive: true
  });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith("CliCommand.ts"))
    .map((entry) => basename(entry.parentPath))
    .sort();
}

describe("v11 CLI entrypoint parity coverage", () => {
  it("keeps explicit CLI parity mapping aligned with v11 CLI command entrypoints", async () => {
    const v11CliCommands = await listV11CliCommands();
    const mappedCommands = Object.keys(cliEntrypointParityTestsByCommand).sort();
    expect(mappedCommands).toEqual(v11CliCommands);
  });

  it("keeps mapped CLI entrypoint parity test files present", async () => {
    for (const mappedPaths of Object.values(cliEntrypointParityTestsByCommand)) {
      expect(mappedPaths.length).toBeGreaterThan(0);
      for (const mappedPath of mappedPaths) {
        await expect(
          access(resolve(process.cwd(), mappedPath))
        ).resolves.toBeUndefined();
      }
    }
  });
});
