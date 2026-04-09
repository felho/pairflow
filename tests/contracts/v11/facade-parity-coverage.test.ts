import { access } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { commandMigrationMap } from "./migration-map.js";

const commandsWithoutFacadeParitySentinel = [
  "approval",
  "askHuman",
  "reply"
] as const;

const facadeParityTestsByCommand: Record<string, readonly string[]> = {
  create: ["tests/v11/application/create/createFacadeParity.test.ts"],
  pass: ["tests/v11/application/pass/passFacadeParity.test.ts"],
  kickoff: ["tests/v11/application/kickoff/kickoffFacadeParity.test.ts"],
  converged: ["tests/v11/application/converged/convergedFacadeParity.test.ts"],
  delete: ["tests/v11/application/delete/deleteFacadeParity.test.ts"],
  inbox: ["tests/v11/application/inbox/inboxFacadeParity.test.ts"],
  open: ["tests/v11/application/open/openFacadeParity.test.ts"],
  list: ["tests/v11/application/list/listFacadeParity.test.ts"],
  metaReviewGate: [
    "tests/v11/application/metaReviewGate/metaReviewGateFacadeParity.test.ts"
  ],
  gate: ["tests/v11/application/metaReviewGate/metaReviewGateFacadeParity.test.ts"],
  reconcile: ["tests/v11/application/reconcile/reconcileFacadeParity.test.ts"],
  start: ["tests/v11/application/start/startFacadeParity.test.ts"],
  stop: ["tests/v11/application/stop/stopFacadeParity.test.ts"],
  restart: ["tests/v11/application/restart/restartFacadeParity.test.ts"],
  resume: ["tests/v11/application/resume/resumeFacadeParity.test.ts"],
  watchdog: ["tests/v11/application/watchdog/watchdogFacadeParity.test.ts"],
  commit: ["tests/v11/application/commit/commitFacadeParity.test.ts"],
  merge: ["tests/v11/application/merge/mergeFacadeParity.test.ts"],
  status: ["tests/v11/application/status/statusFacadeParity.test.ts"]
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
