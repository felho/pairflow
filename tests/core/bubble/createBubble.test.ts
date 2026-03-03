import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { parseBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { validateBubbleStateSnapshot } from "../../../src/core/state/stateSchema.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];
const initialMetricsRoot = process.env.PAIRFLOW_METRICS_EVENTS_ROOT;

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-bubble-create-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-bubble-create-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  if (initialMetricsRoot === undefined) {
    delete process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
  } else {
    process.env.PAIRFLOW_METRICS_EVENTS_ROOT = initialMetricsRoot;
  }

  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

beforeEach(async () => {
  const metricsRoot = await createTempDir();
  process.env.PAIRFLOW_METRICS_EVENTS_ROOT = metricsRoot;
});

describe("createBubble", () => {
  it("creates expected bubble scaffold and default files", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_01",
      repoPath,
      baseBranch: "main",
      task: "Implement feature X",
      cwd: repoPath
    });

    expect(result.paths.repoPath).toBe(repoPath);
    expect(result.state.state).toBe("CREATED");
    expect(result.config.watchdog_timeout_minutes).toBe(20);
    expect(result.config.quality_mode).toBe("strict");
    expect(result.config.review_artifact_type).toBe("auto");
    expect(result.config.bubble_instance_id).toMatch(
      /^bi_[A-Za-z0-9_-]{10,}$/u
    );

    const bubbleToml = await readFile(result.paths.bubbleTomlPath, "utf8");
    const reparsedConfig = parseBubbleConfigToml(bubbleToml);
    expect(reparsedConfig.id).toBe("b_create_01");
    expect(reparsedConfig.notifications.enabled).toBe(true);
    expect(reparsedConfig.review_artifact_type).toBe("auto");
    expect(reparsedConfig.bubble_instance_id).toBe(
      result.config.bubble_instance_id
    );

    const stateRaw = JSON.parse(
      await readFile(result.paths.statePath, "utf8")
    ) as unknown;
    const validatedState = validateBubbleStateSnapshot(stateRaw);
    expect(validatedState.ok).toBe(true);

    await stat(result.paths.transcriptPath);
    await stat(result.paths.inboxPath);
    await stat(result.paths.taskArtifactPath);
    await stat(result.paths.sessionsPath);
    await expect(stat(result.paths.reviewerBriefArtifactPath)).rejects.toMatchObject({
      code: "ENOENT"
    });

    const transcript = await readTranscriptEnvelopes(result.paths.transcriptPath);
    expect(transcript).toHaveLength(1);
    expect(transcript[0]?.type).toBe("TASK");
    expect(transcript[0]?.sender).toBe("orchestrator");
    expect(transcript[0]?.recipient).toBe(result.config.agents.implementer);
    expect(transcript[0]?.payload.summary).toBe("Implement feature X");
    expect(transcript[0]?.refs).toEqual([result.paths.taskArtifactPath]);

    const inbox = await readTranscriptEnvelopes(result.paths.inboxPath);
    expect(inbox).toHaveLength(0);
  });

  it("does not persist open_command by default when create input omits it", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_no_open_default",
      repoPath,
      baseBranch: "main",
      task: "No explicit open command",
      cwd: repoPath
    });

    expect(result.config.open_command).toBeUndefined();
    const bubbleToml = await readFile(result.paths.bubbleTomlPath, "utf8");
    expect(bubbleToml).not.toContain("open_command =");
    const reparsedConfig = parseBubbleConfigToml(bubbleToml);
    expect(reparsedConfig.open_command).toBeUndefined();
  });

  it("persists open_command when explicitly provided in create input", async () => {
    const repoPath = await createTempRepo();
    const openCommand = "code --reuse-window {{worktree_path}}";

    const result = await createBubble({
      id: "b_create_with_open_command",
      repoPath,
      baseBranch: "main",
      task: "Explicit open command",
      cwd: repoPath,
      openCommand
    });

    expect(result.config.open_command).toBe(openCommand);
    const bubbleToml = await readFile(result.paths.bubbleTomlPath, "utf8");
    expect(bubbleToml).toContain(
      'open_command = "code --reuse-window {{worktree_path}}"'
    );
    const reparsedConfig = parseBubbleConfigToml(bubbleToml);
    expect(reparsedConfig.open_command).toBe(openCommand);
  });

  it("supports injectable creation timestamp", async () => {
    const repoPath = await createTempRepo();
    const now = new Date("2026-02-26T22:00:00.000Z");

    const result = await createBubble({
      id: "b_create_01_now",
      repoPath,
      baseBranch: "main",
      task: "Timestamp deterministic test",
      cwd: repoPath,
      now
    });

    expect(result.state.state).toBe("CREATED");
    const transcript = await readTranscriptEnvelopes(result.paths.transcriptPath);
    expect(transcript[0]?.ts).toBe(now.toISOString());
  });

  it("uses task file content when taskFile input is provided", async () => {
    const repoPath = await createTempRepo();
    const taskFilePath = join(repoPath, "task.md");
    await writeFile(taskFilePath, "Task from file\n", "utf8");

    const result = await createBubble({
      id: "b_create_02",
      repoPath,
      baseBranch: "main",
      taskFile: taskFilePath,
      cwd: repoPath
    });

    expect(result.task.source).toBe("file");
    const taskArtifact = await readFile(result.paths.taskArtifactPath, "utf8");
    expect(taskArtifact).toContain("Source: file");
    expect(taskArtifact).toContain("Task from file");
  });

  it("persists reviewer brief artifact from inline input", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_reviewer_brief_inline",
      repoPath,
      baseBranch: "main",
      task: "Task",
      reviewerBrief: "Validate all claims with evidence refs.",
      cwd: repoPath
    });

    const briefArtifact = await readFile(result.paths.reviewerBriefArtifactPath, "utf8");
    expect(briefArtifact).toContain("Validate all claims with evidence refs.");
  });

  it("persists reviewer brief artifact from file input", async () => {
    const repoPath = await createTempRepo();
    const reviewerBriefFilePath = join(repoPath, "reviewer-brief.md");
    await writeFile(
      reviewerBriefFilePath,
      "Use deterministic verification payload.",
      "utf8"
    );

    const result = await createBubble({
      id: "b_create_reviewer_brief_file",
      repoPath,
      baseBranch: "main",
      task: "Task",
      reviewerBriefFile: reviewerBriefFilePath,
      cwd: repoPath
    });

    const briefArtifact = await readFile(result.paths.reviewerBriefArtifactPath, "utf8");
    expect(briefArtifact).toContain("Use deterministic verification payload.");
  });

  it("rejects accuracy-critical bubble creation without reviewer brief input", async () => {
    const repoPath = await createTempRepo();

    await expect(
      createBubble({
        id: "b_create_accuracy_critical_missing_brief",
        repoPath,
        baseBranch: "main",
        task: "Task",
        accuracyCritical: true,
        cwd: repoPath
      })
    ).rejects.toThrow(/accuracy-critical bubbles require reviewer brief input/u);
  });

  it("rejects reviewer brief inline+file input together regardless of accuracy mode", async () => {
    const repoPath = await createTempRepo();
    const reviewerBriefFilePath = join(repoPath, "reviewer-brief.md");
    await writeFile(reviewerBriefFilePath, "Brief", "utf8");

    await expect(
      createBubble({
        id: "b_create_reviewer_brief_both",
        repoPath,
        baseBranch: "main",
        task: "Task",
        reviewerBrief: "Inline",
        reviewerBriefFile: reviewerBriefFilePath,
        accuracyCritical: false,
        cwd: repoPath
      })
    ).rejects.toThrow(/either reviewer brief text or reviewer brief file path, not both/u);
  });

  it("infers document review artifact type for doc-centric task files", async () => {
    const repoPath = await createTempRepo();
    const taskFilePath = join(repoPath, "task.md");
    await writeFile(
      taskFilePath,
      [
        "# Task: Update review-loop document",
        "",
        "This is a document-only task file iteration.",
        "Focus on docs/ and markdown quality."
      ].join("\n"),
      "utf8"
    );

    const result = await createBubble({
      id: "b_create_doc_01",
      repoPath,
      baseBranch: "main",
      taskFile: taskFilePath,
      cwd: repoPath
    });

    expect(result.config.review_artifact_type).toBe("document");
    const bubbleToml = await readFile(result.paths.bubbleTomlPath, "utf8");
    expect(parseBubbleConfigToml(bubbleToml).review_artifact_type).toBe(
      "document"
    );
  });

  it("infers code review artifact type for code-centric tasks", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_code_01",
      repoPath,
      baseBranch: "main",
      task: "Implement TypeScript changes in src/ and tests/ for API bug fix.",
      cwd: repoPath
    });

    expect(result.config.review_artifact_type).toBe("code");
  });

  it("returns auto when document/code inference scores are tied", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_auto_tie_01",
      repoPath,
      baseBranch: "main",
      task: "Review document consistency and API naming.",
      cwd: repoPath
    });

    // "document" contributes +1 and "api" contributes +1, so this is a
    // deliberately ambiguous/tied signal and should stay in auto mode.
    expect(result.config.review_artifact_type).toBe("auto");
  });

  it("treats --task input as inline text even when same-named file exists", async () => {
    const repoPath = await createTempRepo();
    const fileNamedLikeTask = join(repoPath, "fix the login bug");
    await writeFile(fileNamedLikeTask, "This should not be auto-read\n", "utf8");

    const result = await createBubble({
      id: "b_create_021",
      repoPath,
      baseBranch: "main",
      task: "fix the login bug",
      cwd: repoPath
    });

    expect(result.task.source).toBe("inline");
    const taskArtifact = await readFile(result.paths.taskArtifactPath, "utf8");
    expect(taskArtifact).toContain("Source: inline text");
    expect(taskArtifact).toContain("fix the login bug");
    expect(taskArtifact).not.toContain("This should not be auto-read");
  });

  it("rejects invalid bubble ids", async () => {
    const repoPath = await createTempRepo();

    await expect(
      createBubble({
        id: "BAD",
        repoPath,
        baseBranch: "main",
        task: "Task",
        cwd: repoPath
      })
    ).rejects.toThrow(/Invalid bubble id/u);
  });

  it("rejects duplicate bubble ids in same repo", async () => {
    const repoPath = await createTempRepo();

    await createBubble({
      id: "b_create_03",
      repoPath,
      baseBranch: "main",
      task: "Task",
      cwd: repoPath
    });

    await expect(
      createBubble({
        id: "b_create_03",
        repoPath,
        baseBranch: "main",
        task: "Task",
        cwd: repoPath
      })
    ).rejects.toThrow(/Bubble already exists/u);
  });

  it("rejects when both task input forms are provided", async () => {
    const repoPath = await createTempRepo();
    const taskFilePath = join(repoPath, "task.md");
    await writeFile(taskFilePath, "Task from file\n", "utf8");

    await expect(
      createBubble({
        id: "b_create_032",
        repoPath,
        baseBranch: "main",
        task: "Inline task",
        taskFile: taskFilePath,
        cwd: repoPath
      })
    ).rejects.toThrow(/either task text or task file path, not both/u);
  });

  it("rejects repository paths that are not git repositories", async () => {
    const nonRepoPath = await createTempDir();

    await expect(
      createBubble({
        id: "b_create_04",
        repoPath: nonRepoPath,
        baseBranch: "main",
        task: "Task",
        cwd: nonRepoPath
      })
    ).rejects.toThrow(/does not look like a git repository/u);
  });
});
