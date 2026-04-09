import { access } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { commandMigrationMap } from "./migration-map.js";

const commandsWithoutFacadeParitySentinel = [
  "approval",
  "askHuman",
  "commit",
  "converged",
  "create",
  "delete",
  "inbox",
  "kickoff",
  "list",
  "merge",
  "open",
  "pass",
  "reconcile",
  "reply",
  "restart",
  "resume",
  "start",
  "stop",
  "status"
] as const;

const facadeParityTestsByCommand: Record<string, readonly string[]> = {
  metaReviewGate: [
    "tests/v11/application/metaReviewGate/metaReviewGateFacadeParity.test.ts"
  ],
  gate: ["tests/v11/application/metaReviewGate/metaReviewGateFacadeParity.test.ts"],
  watchdog: ["tests/v11/application/watchdog/watchdogFacadeParity.test.ts"]
};

describe("v11 facade parity coverage", () => {
  it("keeps explicit facade parity mapping aligned with v11 migration commands", () => {
    const v11Commands = commandMigrationMap
      .filter(
        (entry) =>
          entry.state === "v11"
          && !commandsWithoutFacadeParitySentinel.includes(
            entry.command as (typeof commandsWithoutFacadeParitySentinel)[number]
          )
      )
      .map((entry) => entry.command)
      .sort();
    const mappedCommands = Object.keys(facadeParityTestsByCommand).sort();
    expect(mappedCommands).toEqual(v11Commands);
  });

  it("keeps parity-sentinel exemptions explicit", () => {
    const exemptCommands = commandMigrationMap
      .filter((entry) =>
        commandsWithoutFacadeParitySentinel.includes(
          entry.command as (typeof commandsWithoutFacadeParitySentinel)[number]
        )
      )
      .map((entry) => entry.command)
      .sort();
    expect(exemptCommands).toEqual(
      [...commandsWithoutFacadeParitySentinel].sort()
    );
  });

  it("keeps mapped facade parity test files present", async () => {
    for (const mappedPaths of Object.values(facadeParityTestsByCommand)) {
      expect(mappedPaths.length).toBeGreaterThan(0);
      for (const mappedPath of mappedPaths) {
        await expect(
          access(resolve(process.cwd(), mappedPath))
        ).resolves.toBeUndefined();
      }
    }
  });
});
