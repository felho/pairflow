import { describe, expect, it, vi } from "vitest";

import {
  IDEATION_KICKOFF_NOT_ALLOWED,
  IDEATION_KICKOFF_TASK_INVALID,
  IDEATION_METADATA_PARSE_WARNING,
  IDEATION_REVIEW_ARTIFACT_TYPE_IMMUTABLE,
  IDEATION_TASK_INPUT_CONFLICT
} from "../../src/core/bubble/ideation.js";
import {
  type BubbleKickoffCommandDependencies,
  getBubbleKickoffHelpText,
  parseBubbleKickoffCommandOptions,
  runBubbleKickoffCommand
} from "../../src/cli/commands/bubble/kickoff.js";
import type { ResolvedBubbleById } from "../../src/core/bubble/bubbleLookup.js";

describe("parseBubbleKickoffCommandOptions", () => {
  it("parses required args with inline task", () => {
    const parsed = parseBubbleKickoffCommandOptions([
      "--id",
      "b_kickoff_01",
      "--task",
      "Implement feature"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated kickoff options");
    }
    expect(parsed.id).toBe("b_kickoff_01");
    expect(parsed.task).toBe("Implement feature");
    expect(parsed.taskFile).toBeUndefined();
  });

  it("parses task-file input", () => {
    const parsed = parseBubbleKickoffCommandOptions([
      "--id",
      "b_kickoff_02",
      "--task-file",
      "/tmp/task.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated kickoff options");
    }
    expect(parsed.task).toBeUndefined();
    expect(parsed.taskFile).toBe("/tmp/task.md");
  });

  it("supports help", () => {
    const parsed = parseBubbleKickoffCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleKickoffHelpText()).toContain("pairflow bubble kickoff");
  });

  it("rejects missing task input", () => {
    expect(() =>
      parseBubbleKickoffCommandOptions([
        "--id",
        "b_kickoff_03"
      ])
    ).toThrow(new RegExp(`^${IDEATION_KICKOFF_TASK_INVALID}:`, "u"));
  });

  it("rejects conflicting task input", () => {
    expect(() =>
      parseBubbleKickoffCommandOptions([
        "--id",
        "b_kickoff_03",
        "--task",
        "inline",
        "--task-file",
        "/tmp/task.md"
      ])
    ).toThrow(new RegExp(`^${IDEATION_TASK_INPUT_CONFLICT}:`, "u"));
  });

  it("rejects review-artifact-type override", () => {
    expect(() =>
      parseBubbleKickoffCommandOptions([
        "--id",
        "b_kickoff_04",
        "--task",
        "inline",
        "--review-artifact-type",
        "document"
      ])
    ).toThrow(new RegExp(`^${IDEATION_REVIEW_ARTIFACT_TYPE_IMMUTABLE}:`, "u"));
  });
});

describe("runBubbleKickoffCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleKickoffCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("terminates early on ideation parse-warning and does not call core kickoff", async () => {
    for (const parseWarning of [
      `${IDEATION_METADATA_PARSE_WARNING}: synthetic test fixture`,
      "synthetic warning without token prefix"
    ]) {
      const warnings: string[] = [];
      const resolveBubbleById: NonNullable<
        BubbleKickoffCommandDependencies["resolveBubbleById"]
      > = vi.fn(() =>
        Promise.resolve({
          bubbleId: "b_kickoff_warn_01",
          repoPath: "/tmp/repo",
          bubbleConfig: {
            id: "b_kickoff_warn_01",
            ideation: {
              mode: true,
              task_pending: true,
              parse_warning: parseWarning
            }
          }
        } as unknown as ResolvedBubbleById)
      );
      const kickoffBubbleMock: NonNullable<
        BubbleKickoffCommandDependencies["kickoffBubble"]
      > = vi.fn();

      await expect(
        runBubbleKickoffCommand(
          [
            "--id",
            "b_kickoff_warn_01",
            "--task",
            "Inline task"
          ],
          "/tmp/repo",
          {
            resolveBubbleById,
            kickoffBubble: kickoffBubbleMock,
            writeStderr: (message) => {
              warnings.push(message);
            }
          }
        )
      ).rejects.toThrow(new RegExp(`^${IDEATION_KICKOFF_NOT_ALLOWED}:`, "u"));

      expect(warnings.some((entry) => entry.includes(IDEATION_METADATA_PARSE_WARNING))).toBe(
        true
      );
      expect(kickoffBubbleMock).not.toHaveBeenCalled();
    }
  });
});
