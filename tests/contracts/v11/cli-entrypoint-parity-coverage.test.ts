import { access, readFile, readdir } from "node:fs/promises";
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

const directBubbleCliShimCommands = [
  "create",
  "delete",
  "inbox",
  "kickoff",
  "list",
  "metaReview",
  "open",
  "reconcile",
  "restart",
  "start",
  "status"
] as const;

const allowedBubbleCliModulePrefixes = [
  "node:",
  "../../../v11/application/"
] as const;

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

async function listDirectBubbleCliShimCommands(): Promise<string[]> {
  const bubbleCliRoot = resolve(process.cwd(), "src/cli/commands/bubble");
  const entries = await readdir(bubbleCliRoot, {
    withFileTypes: true
  });

  const shims: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }

    const filePath = resolve(bubbleCliRoot, entry.name);
    const content = await readFile(filePath, "utf8");
    const trimmed = content.trim();
    if (
      /^export \* from "\.\.\/\.\.\/\.\.\/v11\/application\/[^"]+\/[^"]+CliCommand\.js";$/u.test(
        trimmed
      )
    ) {
      shims.push(basename(entry.name, ".ts"));
    }
  }

  return shims.sort();
}

async function collectBubbleCliModuleSpecifiers(): Promise<
  Array<{ command: string; specifier: string }>
> {
  const bubbleCliRoot = resolve(process.cwd(), "src/cli/commands/bubble");
  const entries = await readdir(bubbleCliRoot, {
    withFileTypes: true
  });

  const specifiers: Array<{ command: string; specifier: string }> = [];
  const importExportPattern =
    /(?:^|\n)\s*(?:import|export)\b[\s\S]*?\bfrom\s+"([^"]+)"/gu;

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }

    const command = basename(entry.name, ".ts");
    const filePath = resolve(bubbleCliRoot, entry.name);
    const content = await readFile(filePath, "utf8");
    for (const match of content.matchAll(importExportPattern)) {
      const specifier = match[1];
      if (specifier !== undefined) {
        specifiers.push({ command, specifier });
      }
    }
  }

  return specifiers.sort((left, right) =>
    `${left.command}:${left.specifier}`.localeCompare(
      `${right.command}:${right.specifier}`
    )
  );
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

  it("keeps the direct legacy bubble CLI shim inventory explicit", async () => {
    const actualShimCommands = await listDirectBubbleCliShimCommands();
    expect(actualShimCommands).toEqual([...directBubbleCliShimCommands].sort());
  });

  it("keeps bubble CLI wrappers routed only to node or v11 application boundaries", async () => {
    const specifiers = await collectBubbleCliModuleSpecifiers();
    for (const { command, specifier } of specifiers) {
      expect(
        allowedBubbleCliModulePrefixes.some((prefix) =>
          specifier.startsWith(prefix)
        ),
        `Unexpected bubble CLI module boundary for ${command}: ${specifier}`
      ).toBe(true);
    }
  });
});
