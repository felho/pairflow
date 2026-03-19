import { describe, expect, it } from "vitest";

import { commandMigrationMap } from "./migration-map.js";

describe("v11 migration map", () => {
  it("uses unique command identifiers", () => {
    const commands = commandMigrationMap.map((entry) => entry.command);
    const uniqueCommands = new Set(commands);
    expect(uniqueCommands.size).toBe(commands.length);
  });

  it("keeps all mapped commands on v11 state", () => {
    for (const entry of commandMigrationMap) {
      expect(entry.state).toBe("v11");
    }
  });

  it("keeps every mapped command owned by runtime", () => {
    for (const entry of commandMigrationMap) {
      expect(entry.owner).toBe("runtime");
    }
  });
});
