import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  KickoffTaskInputValidationError,
  renderKickoffTaskArtifact,
  resolveKickoffTaskInput
} from "../../../../src/v11/shared/kickoff/kickoffTaskInputResolution.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-kickoff-v11-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("resolveKickoffTaskInput", () => {
  it("resolves trimmed inline task input", async () => {
    const cwd = await createTempDir();
    const resolved = await resolveKickoffTaskInput({
      task: "  Implement kickoff seam  ",
      cwd,
      readFile,
      statFile: stat
    });

    expect(resolved).toEqual({
      content: "Implement kickoff seam",
      source: "inline"
    });
  });

  it("resolves task-file input and trims trailing whitespace", async () => {
    const cwd = await createTempDir();
    const taskPath = join(cwd, "task.md");
    await writeFile(taskPath, "Line 1\nLine 2\n\n", "utf8");

    const resolved = await resolveKickoffTaskInput({
      taskFile: "task.md",
      cwd,
      readFile,
      statFile: stat
    });

    expect(resolved).toEqual({
      content: "Line 1\nLine 2",
      source: "file",
      sourcePath: taskPath
    });
  });

  it("rejects invalid kickoff task inputs", async () => {
    const cwd = await createTempDir();
    const emptyTaskPath = join(cwd, "empty.md");
    await writeFile(emptyTaskPath, "   \n", "utf8");
    const placeholderTaskPath = join(cwd, "placeholder.md");
    await writeFile(
      placeholderTaskPath,
      "# Bubble Task\n\nmetadata_source: ideation_placeholder\n",
      "utf8"
    );

    await expect(
      resolveKickoffTaskInput({
        task: "inline",
        taskFile: "task.md",
        cwd,
        readFile,
        statFile: stat
      })
    ).rejects.toBeInstanceOf(KickoffTaskInputValidationError);

    await expect(
      resolveKickoffTaskInput({
        cwd,
        readFile,
        statFile: stat
      })
    ).rejects.toBeInstanceOf(KickoffTaskInputValidationError);

    await expect(
      resolveKickoffTaskInput({
        taskFile: "missing.md",
        cwd,
        readFile,
        statFile: stat
      })
    ).rejects.toBeInstanceOf(KickoffTaskInputValidationError);

    await expect(
      resolveKickoffTaskInput({
        taskFile: "empty.md",
        cwd,
        readFile,
        statFile: stat
      })
    ).rejects.toBeInstanceOf(KickoffTaskInputValidationError);

    await expect(
      resolveKickoffTaskInput({
        taskFile: "placeholder.md",
        cwd,
        readFile,
        statFile: stat
      })
    ).rejects.toBeInstanceOf(KickoffTaskInputValidationError);

    await expect(
      resolveKickoffTaskInput({
        task: "metadata_source: ideation_placeholder",
        cwd,
        readFile,
        statFile: stat
      })
    ).rejects.toBeInstanceOf(KickoffTaskInputValidationError);
  });
});

describe("renderKickoffTaskArtifact", () => {
  it("renders task artifact source lines", () => {
    expect(
      renderKickoffTaskArtifact({
        content: "Inline summary",
        source: "inline"
      })
    ).toContain("Source: inline text");

    expect(
      renderKickoffTaskArtifact({
        content: "File summary",
        source: "file",
        sourcePath: "/tmp/task.md"
      })
    ).toContain("Source: file (/tmp/task.md)");
  });
});
