import { describe, expect, it } from "vitest";

import {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions
} from "../../src/cli/commands/bubble/create.js";

describe("parseBubbleCreateCommandOptions", () => {
  it("parses required flags", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--task",
      "Implement X"
    ]);

    expect(parsed.id).toBe("b_create_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.base).toBe("main");
    expect(parsed.task).toBe("Implement X");
    expect(parsed.help).toBe(false);
  });

  it("parses --flag=value form", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id=b_create_01",
      "--repo=/tmp/repo",
      "--base=main",
      "--task=Implement X"
    ]);

    expect(parsed.id).toBe("b_create_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.base).toBe("main");
    expect(parsed.task).toBe("Implement X");
  });

  it("parses explicit task file input", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--task-file",
      "/tmp/task.md"
    ]);

    expect(parsed.taskFile).toBe("/tmp/task.md");
  });

  it("supports help flag", () => {
    const parsed = parseBubbleCreateCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleCreateHelpText()).toContain("pairflow bubble create");
  });

  it("throws when a required flag is missing", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--task",
        "Implement X"
      ])
    ).toThrow(/--base/u);
  });

  it("throws when task input is missing", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main"
      ])
    ).toThrow(/--task or --task-file/u);
  });

  it("throws when both task input forms are provided", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--task",
        "Implement X",
        "--task-file",
        "/tmp/task.md"
      ])
    ).toThrow(/Use only one task input/u);
  });
});
