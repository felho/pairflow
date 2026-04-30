import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const directBubbleCliShimCommands = [
  "attach",
  "commit",
  "create",
  "delete",
  "inbox",
  "kickoff",
  "list",
  "open",
  "reconcile",
  "restart",
  "start",
  "status"
] as const;

const intentionalNonShimBubbleCliWrappers = [
  "approve",
  "merge",
  "reply",
  "requestRework",
  "resume",
  "stop",
  "watchdog"
] as const;

const allowedBubbleCliModulePrefixes = [
  "node:",
  "../../../v11/application/"
] as const;

async function listTypeScriptFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, {
    withFileTypes: true,
    recursive: true
  });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => resolve(entry.parentPath, entry.name))
    .sort();
}

function toRelativeModuleId(root: string, filePath: string): string {
  return relative(root, filePath).replace(/\\/gu, "/").replace(/\.ts$/u, "");
}

async function listV11CliCommands(): Promise<string[]> {
  const applicationRoot = resolve(process.cwd(), "src/v11/application");
  const entries = await readdir(applicationRoot, {
    withFileTypes: true,
    recursive: true
  });

  const commandRoots = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith("CliCommand.ts"))
    .map((entry) => {
      const relativeParent = relative(applicationRoot, entry.parentPath);
      if (relativeParent === "") {
        return `__root__/${entry.name}`;
      }

      return relativeParent.split(/[\\/]/)[0];
    })
    .filter(
      (command): command is string =>
        command !== undefined && command.length > 0
    );

  return Array.from(new Set(commandRoots)).sort();
}

async function listDirectBubbleCliShimCommands(): Promise<string[]> {
  const bubbleCliRoot = resolve(process.cwd(), "src/cli/commands/bubble");
  const files = await listTypeScriptFiles(bubbleCliRoot);

  const shims: string[] = [];
  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const trimmed = content.trim();
    if (
      /^export \* from ["']\.\.\/\.\.\/\.\.\/v11\/application\/[^"']+\/[^"']+CliCommand\.js["'];$/u.test(
        trimmed
      )
    ) {
      shims.push(toRelativeModuleId(bubbleCliRoot, filePath));
    }
  }

  return shims.sort();
}

async function listBubbleCliWrapperCommands(): Promise<string[]> {
  const bubbleCliRoot = resolve(process.cwd(), "src/cli/commands/bubble");
  const files = await listTypeScriptFiles(bubbleCliRoot);

  return files.map((filePath) => toRelativeModuleId(bubbleCliRoot, filePath));
}

async function collectBubbleCliModuleSpecifiers(): Promise<
  Array<{ command: string; specifier: string }>
> {
  const bubbleCliRoot = resolve(process.cwd(), "src/cli/commands/bubble");
  const files = await listTypeScriptFiles(bubbleCliRoot);

  const specifiers: Array<{ command: string; specifier: string }> = [];
  const importExportPattern =
    /(?:^|\n)\s*(?:import|export)\b[\s\S]*?\bfrom\s+["']([^"']+)["']/gu;

  for (const filePath of files) {
    const command = toRelativeModuleId(bubbleCliRoot, filePath);
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

describe("bubble CLI entrypoint boundary guard", () => {
  it("keeps the direct shim inventory aligned with v11 CLI command entrypoints", async () => {
    const v11CliCommands = await listV11CliCommands();
    expect([...directBubbleCliShimCommands].sort()).toEqual(v11CliCommands);
  });

  it("keeps the direct bubble CLI shim inventory explicit", async () => {
    const actualShimCommands = await listDirectBubbleCliShimCommands();
    expect(actualShimCommands).toEqual([...directBubbleCliShimCommands].sort());
  });

  it("keeps every bubble CLI wrapper explicitly classified", async () => {
    const actualWrapperCommands = await listBubbleCliWrapperCommands();
    const classifiedCommands = [
      ...directBubbleCliShimCommands,
      ...intentionalNonShimBubbleCliWrappers
    ].sort();

    expect(classifiedCommands).toEqual(actualWrapperCommands);
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
