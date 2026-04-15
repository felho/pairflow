import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createBubble,
  extractReviewerFocus
} from "../../../src/v11/application/create/createBubble.js";
import { persistCreatedBubbleArtifacts } from "../../../src/v11/application/create/createBubblePersistence.js";
import { buildBubbleConfig } from "../../../src/v11/application/create/createCommandRuntime.js";
import { getBubblePaths } from "../../../src/v11/infrastructure/artifact/bubble/paths.js";
import {
  INVALID_REVIEW_ARTIFACT_TYPE_OPTION,
  MISSING_REVIEW_ARTIFACT_TYPE_OPTION,
  REVIEW_ARTIFACT_TYPE_AUTO_REMOVED,
  parseBubbleConfigToml
} from "../../../src/config/bubbleConfig.js";
import { SchemaValidationError } from "../../../src/v11/shared/validation/primitives.js";
import { resolveDocContractGateArtifactPath } from "../../../src/v11/defaults/gates/docContractGateArtifactDefaults.js";
import { createInitialBubbleState } from "../../../src/v11/domain/state/initialState.js";
import { readRemotePointer } from "../../../src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { readTranscriptEnvelopes } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { validateBubbleStateSnapshot } from "../../../src/v11/shared/state/stateSchema.js";
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

async function readMetricsEvents(at: Date): Promise<Record<string, unknown>[]> {
  const metricsRoot = process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
  if (metricsRoot === undefined) {
    throw new Error("PAIRFLOW_METRICS_EVENTS_ROOT is not configured.");
  }
  const iso = at.toISOString();
  const year = iso.slice(0, 4);
  const month = iso.slice(5, 7);
  const shardPath = join(metricsRoot, year, month, `events-${year}-${month}.ndjson`);
  const raw = await readFile(shardPath, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("createBubble", () => {
  it("creates expected bubble scaffold and default files", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Implement feature X",
      cwd: repoPath
    });

    expect(result.paths.repoPath).toBe(repoPath);
    expect(result.state.state).toBe("CREATED");
    expect(result.config.watchdog_timeout_minutes).toBe(30);
    expect(result.config.quality_mode).toBe("strict");
    expect(result.config.review_artifact_type).toBe("code");
    expect(result.config.severity_gate_round).toBe(4);
    expect(result.config.doc_contract_gates.round_gate_applies_after).toBe(2);
    expect(result.config.bubble_instance_id).toMatch(
      /^bi_[A-Za-z0-9_-]{10,}$/u
    );

    const bubbleToml = await readFile(result.paths.bubbleTomlPath, "utf8");
    const reparsedConfig = parseBubbleConfigToml(bubbleToml);
    expect(reparsedConfig.id).toBe("b_create_01");
    expect(reparsedConfig.notifications.enabled).toBe(true);
    expect(reparsedConfig.review_artifact_type).toBe("code");
    expect(reparsedConfig.severity_gate_round).toBe(4);
    expect(reparsedConfig.doc_contract_gates.round_gate_applies_after).toBe(2);
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
    await stat(result.paths.reviewerFocusArtifactPath);
    await expect(stat(result.paths.remotePointerPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(result.paths.remoteStateCachePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(result.paths.reviewerBriefArtifactPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    expect(result.reviewerFocusArtifactPersist).toEqual({
      status: "written",
      artifactPath: result.paths.reviewerFocusArtifactPath
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

  it("creates ideation bubble scaffold without initial TASK envelope", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_ideation_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });

    const taskArtifact = await readFile(result.paths.taskArtifactPath, "utf8");
    expect(taskArtifact).toContain("Source: ideation placeholder");
    expect(taskArtifact).toContain("pairflow bubble kickoff --id b_create_ideation_01");
    expect(taskArtifact).toContain("metadata_source: ideation_placeholder");

    const transcript = await readTranscriptEnvelopes(result.paths.transcriptPath);
    expect(transcript).toHaveLength(0);

    expect(result.config.ideation?.mode).toBe(true);
    expect(result.config.ideation?.task_pending).toBe(true);
    expect(result.config.ideation?.started_at).toEqual(expect.any(String));
  });

  it("persists executor metadata and created remote pointer for remote create", async () => {
    const repoPath = await createTempRepo();
    const now = new Date("2026-02-27T10:02:00.000Z");

    const result = await createBubble(
      {
        id: "b_create_remote_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        remote: "homelab",
        task: "Remote bubble create path",
        cwd: repoPath,
        now
      },
      {
        loadPairflowGlobalConfig: async () => ({
          remotes: {
            homelab: {
              host: "remote.example",
              repo_base: "/srv/repos",
              default_port_forwards: [3000, 9229]
            }
          }
        })
      }
    );

    expect(result.state.state).toBe("CREATED");
    expect(result.config.executor).toEqual({
      type: "ssh",
      remote: "homelab"
    });

    const bubbleToml = await readFile(result.paths.bubbleTomlPath, "utf8");
    expect(bubbleToml).toContain("[executor]");
    expect(bubbleToml).toContain('type = "ssh"');
    expect(bubbleToml).toContain('remote = "homelab"');

    const remotePointer = await readRemotePointer(result.paths.remotePointerPath);
    expect(remotePointer).toEqual({
      kind: "created",
      host: "remote.example",
      portForwards: [3000, 9229]
    });
    const events = await readMetricsEvents(now);
    const bubbleCreated = events.find(
      (event) =>
        event.event_type === "bubble_created"
        && event.bubble_id === "b_create_remote_01"
    );
    expect(bubbleCreated?.metadata).toMatchObject({
      remote_create: true,
      remote_alias: "homelab",
      remote_executor_type: "ssh"
    });
    await expect(stat(result.paths.remoteStateCachePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("fails closed when remote alias is missing from global config", async () => {
    const repoPath = await createTempRepo();

    await expect(
      createBubble(
        {
          id: "b_create_remote_missing_01",
          repoPath,
          baseBranch: "main",
          reviewArtifactType: "code",
          remote: "homelab",
          task: "Remote bubble create path",
          cwd: repoPath
        },
        {
          loadPairflowGlobalConfig: async () => ({})
        }
      )
    ).rejects.toThrow(
      /BUBBLE_EXECUTOR_INVALID: Remote "homelab" is not defined in the global \[remotes\.<name>\] config/u
    );
  });

  it("fails closed without clobbering an existing remote pointer on remote create", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_create_remote_existing_pointer_01";
    const writeRemotePointerFile = vi.fn(async () => {
      const error = new Error("already exists") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      throw error;
    });

    await expect(
      createBubble(
        {
          id: bubbleId,
          repoPath,
          baseBranch: "main",
          reviewArtifactType: "code",
          remote: "homelab",
          task: "Remote bubble create path",
          cwd: repoPath
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "remote.example",
                repo_base: "/srv/repos"
              }
            }
          }),
          writeRemotePointerFile
        }
      )
    ).rejects.toThrow(/Remote pointer already exists:/u);

    expect(writeRemotePointerFile).toHaveBeenCalledTimes(1);
    const paths = getBubblePaths(repoPath, bubbleId);
    expect(writeRemotePointerFile).toHaveBeenCalledWith(
      paths.remotePointerPath,
      `${JSON.stringify({ kind: "created", host: "remote.example" }, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx"
      }
    );
    await expect(stat(paths.bubbleTomlPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("does not persist remote executor config when remote pointer write fails", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_create_remote_write_failure_01";
    const writeFailure = new Error("disk full");
    const writeRemotePointerFile = vi.fn(async () => {
      throw writeFailure;
    });

    const error = await createBubble(
      {
        id: bubbleId,
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        remote: "homelab",
        task: "Remote bubble create path",
        cwd: repoPath
      },
      {
        loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "remote.example",
                repo_base: "/srv/repos"
              }
            }
          }),
        writeRemotePointerFile
      }
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) {
      throw new Error("Expected createBubble to reject with an Error instance.");
    }
    expect(error.message).toMatch(/Failed to write remote pointer/u);
    expect(error.cause).toBe(writeFailure);

    const paths = getBubblePaths(repoPath, bubbleId);
    await expect(stat(paths.bubbleTomlPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.remotePointerPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("rolls back remote create artifacts when a later mandatory write fails", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_create_remote_append_failure_01";

    await expect(
      createBubble(
        {
          id: bubbleId,
          repoPath,
          baseBranch: "main",
          reviewArtifactType: "code",
          remote: "homelab",
          task: "Remote bubble create path",
          cwd: repoPath
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "remote.example",
                repo_base: "/srv/repos"
              }
            }
          }),
          appendProtocolEnvelope: async () => {
            throw new Error("append failed");
          }
        }
      )
    ).rejects.toThrow(/append failed/u);

    const paths = getBubblePaths(repoPath, bubbleId);
    await expect(stat(paths.remotePointerPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.bubbleTomlPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.statePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.transcriptPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.taskArtifactPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.sessionsPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("preserves a pre-existing sessions registry when late rollback runs", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_create_remote_preserve_sessions_01";
    const paths = getBubblePaths(repoPath, bubbleId);
    const task = {
      content: "Remote bubble create path",
      source: "inline" as const
    };
    const reviewerBrief = {
      content: "Focus on rollback ownership boundaries.",
      source: "inline" as const
    };

    await mkdir(paths.runtimeDir, { recursive: true });
    await writeFile(paths.sessionsPath, '{"shared":true}\n', "utf8");

    await expect(
      persistCreatedBubbleArtifacts({
        bubbleId,
        createdAt: new Date("2026-02-27T10:02:00.000Z"),
        paths,
        config: buildBubbleConfig({
          id: bubbleId,
          bubbleInstanceId: "bi_preserve_sessions_01",
          repoPath,
          baseBranch: "main",
          bubbleBranch: `bubble/${bubbleId}`,
          accuracyCritical: false,
          reviewArtifactType: "code",
          executorRemote: "homelab"
        }),
        state: createInitialBubbleState(bubbleId),
        task,
        reviewerFocus: extractReviewerFocus(task.content),
        reviewerBrief,
        remotePointer: {
          kind: "created",
          host: "remote.example"
        },
        ideationMode: false,
        dependencies: {
          appendProtocolEnvelope: async () => {
            throw new Error("append failed");
          }
        }
      })
    ).rejects.toThrow(/append failed/u);

    const preservedSessions = await readFile(paths.sessionsPath, "utf8");
    expect(preservedSessions).toBe('{"shared":true}\n');
    await expect(stat(paths.remotePointerPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.bubbleTomlPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.statePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.transcriptPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.inboxPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.taskArtifactPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.reviewerFocusArtifactPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.reviewerBriefArtifactPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.bubbleDir)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("allows retry with the same bubble id after late rollback while preserving shared sessions", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_create_remote_retry_after_rollback_01";
    const paths = getBubblePaths(repoPath, bubbleId);

    await mkdir(paths.runtimeDir, { recursive: true });
    await writeFile(paths.sessionsPath, '{"shared":true}\n', "utf8");

    await expect(
      createBubble(
        {
          id: bubbleId,
          repoPath,
          baseBranch: "main",
          reviewArtifactType: "code",
          remote: "homelab",
          task: "Remote bubble create path",
          cwd: repoPath
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "remote.example",
                repo_base: "/srv/repos"
              }
            }
          }),
          appendProtocolEnvelope: async () => {
            throw new Error("append failed");
          }
        }
      )
    ).rejects.toThrow(/append failed/u);

    expect(await readFile(paths.sessionsPath, "utf8")).toBe('{"shared":true}\n');
    await expect(stat(paths.bubbleDir)).rejects.toMatchObject({
      code: "ENOENT"
    });

    const retried = await createBubble(
      {
        id: bubbleId,
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        remote: "homelab",
        task: "Remote bubble create path",
        cwd: repoPath
      },
      {
        loadPairflowGlobalConfig: async () => ({
          remotes: {
            homelab: {
              host: "remote.example",
              repo_base: "/srv/repos"
            }
          }
        })
      }
    );

    expect(retried.bubbleId).toBe(bubbleId);
    expect(await readFile(paths.sessionsPath, "utf8")).toBe('{"shared":true}\n');
    const remotePointer = await readRemotePointer(paths.remotePointerPath);
    expect(remotePointer).toEqual({
      kind: "created",
      host: "remote.example"
    });
  });

  it("rolls back mkdir-stage bubble namespace and allows retry with the same id", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_remote_mkdir_retry_01";
    const paths = getBubblePaths(repoPath, bubbleId);

    await mkdir(paths.pairflowRoot, { recursive: true });
    await writeFile(paths.runtimeDir, "not-a-directory\n", "utf8");

    await expect(
      createBubble(
        {
          id: bubbleId,
          repoPath,
          baseBranch: "main",
          reviewArtifactType: "code",
          remote: "homelab",
          task: "Remote bubble create path",
          cwd: repoPath
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "remote.example",
                repo_base: "/srv/repos"
              }
            }
          })
        }
      )
    ).rejects.toThrow(/EEXIST/u);

    await expect(stat(paths.bubbleDir)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.artifactsDir)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.messageArtifactsDir)).rejects.toMatchObject({
      code: "ENOENT"
    });

    await rm(paths.runtimeDir, { force: true });

    const retried = await createBubble(
      {
        id: bubbleId,
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        remote: "homelab",
        task: "Remote bubble create path",
        cwd: repoPath
      },
      {
        loadPairflowGlobalConfig: async () => ({
          remotes: {
            homelab: {
              host: "remote.example",
              repo_base: "/srv/repos"
            }
          }
        })
      }
    );

    expect(retried.bubbleId).toBe(bubbleId);
    expect(await readRemotePointer(paths.remotePointerPath)).toEqual({
      kind: "created",
      host: "remote.example"
    });
  });

  it("wraps global config schema errors as bubble create errors for remote create", async () => {
    const repoPath = await createTempRepo();

    await expect(
      createBubble(
        {
          id: "b_create_remote_schema_error_01",
          repoPath,
          baseBranch: "main",
          reviewArtifactType: "code",
          remote: "homelab",
          task: "Remote bubble create path",
          cwd: repoPath
        },
        {
          loadPairflowGlobalConfig: async () => {
            throw new SchemaValidationError("Invalid Pairflow global config", [
              {
                path: "$",
                message: "bad global config"
              }
            ]);
          }
        }
      )
    ).rejects.toThrow(/Invalid Pairflow global config/u);
  });

  it("fails closed when global config loading throws a non-schema error for remote create", async () => {
    const repoPath = await createTempRepo();

    await expect(
      createBubble(
        {
          id: "b_create_remote_load_error_01",
          repoPath,
          baseBranch: "main",
          reviewArtifactType: "code",
          remote: "homelab",
          task: "Remote bubble create path",
          cwd: repoPath
        },
        {
          loadPairflowGlobalConfig: async () => {
            throw new Error("global config unavailable");
          }
        }
      )
    ).rejects.toThrow(/global config unavailable/u);
  });

  it("normalizes remote alias whitespace for domain callers before persistence and lookup", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble(
      {
        id: "b_create_remote_trimmed_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        remote: "  homelab  ",
        task: "Remote bubble create path",
        cwd: repoPath
      },
      {
        loadPairflowGlobalConfig: async () => ({
          remotes: {
            homelab: {
              host: "remote.example",
              repo_base: "/srv/repos"
            }
          }
        })
      }
    );

    expect(result.config.executor).toEqual({
      type: "ssh",
      remote: "homelab"
    });
    const bubbleToml = await readFile(result.paths.bubbleTomlPath, "utf8");
    expect(bubbleToml).toContain('remote = "homelab"');
    const remotePointer = await readRemotePointer(result.paths.remotePointerPath);
    expect(remotePointer).toEqual({
      kind: "created",
      host: "remote.example"
    });
  });

  it("fails closed before injected remote pointer file writes when the pointer payload is invalid", async () => {
    const repoPath = await createTempRepo();
    const writeRemotePointerFile = vi.fn(async () => undefined);

    await expect(
      createBubble(
        {
          id: "b_create_remote_invalid_pointer_01",
          repoPath,
          baseBranch: "main",
          reviewArtifactType: "code",
          remote: "homelab",
          task: "Remote bubble create path",
          cwd: repoPath
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "",
                repo_base: "/srv/repos"
              }
            }
          }),
          writeRemotePointerFile
        }
      )
    ).rejects.toThrow(/Invalid remote pointer/u);

    expect(writeRemotePointerFile).not.toHaveBeenCalled();
  });

  it("serializes concurrent create attempts for the same bubble id without deleting the winner", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_create_remote_concurrent_01";
    let releaseFirstCreate: (() => void) | undefined;
    const firstCreatePaused = new Promise<void>((resolve) => {
      releaseFirstCreate = resolve;
    });
    let firstWriterEntered = false;

    const firstCreate = createBubble(
      {
        id: bubbleId,
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        remote: "homelab",
        task: "Remote bubble create path",
        cwd: repoPath
      },
      {
        loadPairflowGlobalConfig: async () => ({
          remotes: {
            homelab: {
              host: "remote.example",
              repo_base: "/srv/repos"
            }
          }
        }),
        writeReviewerFocusArtifact: async (...args) => {
          await writeFile(...args);
          firstWriterEntered = true;
          await firstCreatePaused;
        }
      }
    );

    while (!firstWriterEntered) {
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }

    const secondCreate = createBubble(
      {
        id: bubbleId,
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        remote: "homelab",
        task: "Remote bubble create path",
        cwd: repoPath
      },
      {
        loadPairflowGlobalConfig: async () => ({
          remotes: {
            homelab: {
              host: "remote.example",
              repo_base: "/srv/repos"
            }
          }
        })
      }
    );

    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    releaseFirstCreate?.();

    const firstResult = await firstCreate;
    await expect(secondCreate).rejects.toThrow(/Bubble already exists:/u);

    const paths = getBubblePaths(repoPath, bubbleId);
    expect(firstResult.bubbleId).toBe(bubbleId);
    await expect(stat(paths.bubbleDir)).resolves.toBeDefined();
    await expect(stat(paths.bubbleTomlPath)).resolves.toBeDefined();
    await expect(stat(paths.remotePointerPath)).resolves.toBeDefined();
  });

  it("ignores legacy repository pairflow.toml enforcement settings", async () => {
    const repoPath = await createTempRepo();
    await writeFile(
      join(repoPath, "pairflow.toml"),
      '[enforcement_mode]\nall_gate = "advisory"\ndocs_gate = "required"\n',
      "utf8"
    );

    const result = await createBubble({
      id: "b_create_repo_all_gate_required_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "document",
      task: "Document task with repo all-gate requirement",
      cwd: repoPath
    });

    const bubbleToml = await readFile(result.paths.bubbleTomlPath, "utf8");
    const reparsedConfig = parseBubbleConfigToml(bubbleToml);
    expect(bubbleToml).not.toContain("[enforcement_mode]");
    expect(reparsedConfig).not.toHaveProperty("enforcement_mode");
  });

  it("does not persist open_command by default when create input omits it", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_no_open_default",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
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
      reviewArtifactType: "code",
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

  it("persists commands.bootstrap when explicitly provided in create input", async () => {
    const repoPath = await createTempRepo();
    const bootstrapCommand = "pnpm install --frozen-lockfile && pnpm build";

    const result = await createBubble({
      id: "b_create_with_bootstrap_command",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Explicit bootstrap command",
      cwd: repoPath,
      bootstrapCommand
    });

    expect(result.config.commands.bootstrap).toBe(bootstrapCommand);
    const bubbleToml = await readFile(result.paths.bubbleTomlPath, "utf8");
    expect(bubbleToml).toContain(
      'bootstrap = "pnpm install --frozen-lockfile && pnpm build"'
    );
    const reparsedConfig = parseBubbleConfigToml(bubbleToml);
    expect(reparsedConfig.commands.bootstrap).toBe(bootstrapCommand);
  });

  it("supports injectable creation timestamp", async () => {
    const repoPath = await createTempRepo();
    const now = new Date("2026-02-26T22:00:00.000Z");

    const result = await createBubble({
      id: "b_create_01_now",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Timestamp deterministic test",
      cwd: repoPath,
      now
    });

    expect(result.state.state).toBe("CREATED");
    const transcript = await readTranscriptEnvelopes(result.paths.transcriptPath);
    expect(transcript[0]?.ts).toBe(now.toISOString());
  });

  it("emits reviewer-focus diagnostics in bubble_created metrics for present extraction", async () => {
    const repoPath = await createTempRepo();
    const now = new Date("2026-02-27T10:00:00.000Z");

    await createBubble({
      id: "b_create_metrics_focus_present_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "# Task\n## Reviewer Focus\n- Keep diagnostics explicit",
      cwd: repoPath,
      now
    });

    const events = await readMetricsEvents(now);
    const bubbleCreated = events.find(
      (event) =>
        event.event_type === "bubble_created"
        && event.bubble_id === "b_create_metrics_focus_present_01"
    );
    expect(bubbleCreated).toBeDefined();
    expect(bubbleCreated?.metadata).toMatchObject({
      reviewer_focus_status: "present",
      reviewer_focus_artifact_write: "written"
    });
  });

  it("emits reviewer-focus diagnostics in bubble_created metrics for absent extraction", async () => {
    const repoPath = await createTempRepo();
    const now = new Date("2026-02-27T10:05:00.000Z");

    await createBubble({
      id: "b_create_metrics_focus_absent_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "# Task\n## Scope\nNo reviewer focus section.",
      cwd: repoPath,
      now
    });

    const events = await readMetricsEvents(now);
    const bubbleCreated = events.find(
      (event) =>
        event.event_type === "bubble_created"
        && event.bubble_id === "b_create_metrics_focus_absent_01"
    );
    expect(bubbleCreated).toBeDefined();
    expect(bubbleCreated?.metadata).toMatchObject({
      reviewer_focus_status: "absent",
      reviewer_focus_artifact_write: "written"
    });
  });

  it("keeps bubble creation fail-open when reviewer-focus artifact write fails", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_create_reviewer_focus_write_fail_01";
    const focusArtifactPath = getBubblePaths(repoPath, bubbleId).reviewerFocusArtifactPath;
    const now = new Date("2026-02-27T10:10:00.000Z");
    const result = await createBubble(
      {
        id: bubbleId,
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "# Task\n## Reviewer Focus\n- Keep fail-open semantics",
        cwd: repoPath,
        now
      },
      {
        writeReviewerFocusArtifact: async (path, data, options) => {
          const pathValue =
            typeof path === "string"
              ? path
              : path instanceof URL
              ? path.pathname
              : Buffer.isBuffer(path)
              ? path.toString("utf8")
              : undefined;
          if (pathValue === focusArtifactPath) {
            const error = new Error("permission denied") as NodeJS.ErrnoException;
            error.code = "EACCES";
            throw error;
          }
          await writeFile(path, data, options);
        }
      }
    );

    expect(result.state.state).toBe("CREATED");
    expect(result.reviewerFocusArtifactPersist).toEqual({
      status: "write_failed",
      artifactPath: focusArtifactPath,
      errorCode: "EACCES"
    });
    await expect(stat(result.paths.reviewerFocusArtifactPath)).rejects.toMatchObject({
      code: "ENOENT"
    });

    const events = await readMetricsEvents(now);
    const bubbleCreated = events.find(
      (event) =>
        event.event_type === "bubble_created"
        && event.bubble_id === bubbleId
    );
    expect(bubbleCreated).toBeDefined();
    expect(bubbleCreated?.metadata).toMatchObject({
      reviewer_focus_status: "present",
      reviewer_focus_artifact_write: "write_failed",
      reviewer_focus_artifact_write_error_code: "EACCES"
    });
  });

  it("uses task file content when taskFile input is provided", async () => {
    const repoPath = await createTempRepo();
    const taskFilePath = join(repoPath, "task.md");
    await writeFile(taskFilePath, "Task from file\n", "utf8");

    const result = await createBubble({
      id: "b_create_02",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
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
      reviewArtifactType: "code",
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
      reviewArtifactType: "code",
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
        reviewArtifactType: "code",
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
        reviewArtifactType: "code",
        task: "Task",
        reviewerBrief: "Inline",
        reviewerBriefFile: reviewerBriefFilePath,
        accuracyCritical: false,
        cwd: repoPath
      })
    ).rejects.toThrow(/either reviewer brief text or reviewer brief file path, not both/u);
  });

  it("extracts reviewer focus with frontmatter precedence over section", () => {
    const result = extractReviewerFocus(
      [
        "---",
        "reviewer_focus:",
        "  - Validate rollback safety",
        "  - Confirm deterministic state transitions",
        "---",
        "## Reviewer Focus",
        "- This should be ignored because frontmatter wins."
      ].join("\n")
    );

    expect(result).toEqual({
      status: "present",
      source: "frontmatter",
      focus_text:
        "- Validate rollback safety\n- Confirm deterministic state transitions",
      focus_items: [
        "Validate rollback safety",
        "Confirm deterministic state transitions"
      ],
      reason_code: "REVIEWER_FOCUS_FRONTMATTER_PRECEDENCE"
    });
  });

  it("preserves quoted commas in inline frontmatter reviewer_focus list", () => {
    const result = extractReviewerFocus(
      [
        "---",
        "reviewer_focus: [\"alpha, beta\", \"gamma\"]",
        "---",
        "# Task"
      ].join("\n")
    );

    expect(result).toEqual({
      status: "present",
      source: "frontmatter",
      focus_text: "- alpha, beta\n- gamma",
      focus_items: ["alpha, beta", "gamma"]
    });
  });

  it("unescapes quoted inline frontmatter list values without preserving escape backslashes", () => {
    const result = extractReviewerFocus(
      [
        "---",
        "reviewer_focus: [\"alpha\\, beta\", \"quote: \\\"x\\\"\"]",
        "---",
        "# Task"
      ].join("\n")
    );

    expect(result).toEqual({
      status: "present",
      source: "frontmatter",
      focus_text: "- alpha, beta\n- quote: \"x\"",
      focus_items: ["alpha, beta", "quote: \"x\""]
    });
  });

  it("extracts reviewer focus from frontmatter literal block scalar (`|`)", () => {
    const result = extractReviewerFocus(
      [
        "---",
        "reviewer_focus: |",
        "  Validate rollback safety.",
        "  Keep protocol transitions deterministic.",
        "---",
        "# Task"
      ].join("\n")
    );

    expect(result).toEqual({
      status: "present",
      source: "frontmatter",
      focus_text: "Validate rollback safety.\nKeep protocol transitions deterministic."
    });
  });

  it("extracts reviewer focus from frontmatter block scalar with inline indicator comment", () => {
    const result = extractReviewerFocus(
      [
        "---",
        "reviewer_focus: | # keep literal style",
        "  Keep parse warning source precise.",
        "  Keep diagnostics explicit.",
        "---",
        "# Task"
      ].join("\n")
    );

    expect(result).toEqual({
      status: "present",
      source: "frontmatter",
      focus_text: "Keep parse warning source precise.\nKeep diagnostics explicit."
    });
  });

  it("extracts reviewer focus from frontmatter folded block scalar (`>`)", () => {
    const result = extractReviewerFocus(
      [
        "---",
        "reviewer_focus: >",
        "  Confirm reviewer startup parity.",
        "  Keep delivery bridge contract aligned.",
        "---",
        "# Task"
      ].join("\n")
    );

    expect(result).toEqual({
      status: "present",
      source: "frontmatter",
      focus_text: "Confirm reviewer startup parity.\nKeep delivery bridge contract aligned."
    });
  });

  it("matches section heading with deterministic case and whitespace normalization", () => {
    const result = extractReviewerFocus(
      [
        "# Task",
        "##   ReViEwEr      FoCuS   ",
        "- Keep command ordering deterministic"
      ].join("\n")
    );

    expect(result).toEqual({
      status: "present",
      source: "section",
      focus_text: "- Keep command ordering deterministic",
      focus_items: ["Keep command ordering deterministic"]
    });
  });

  it("extracts reviewer focus from section when frontmatter key is missing", () => {
    const result = extractReviewerFocus(
      [
        "# Task",
        "## Reviewer Focus",
        "Use explicit reason codes for fallbacks."
      ].join("\n")
    );

    expect(result).toEqual({
      status: "present",
      source: "section",
      focus_text: "Use explicit reason codes for fallbacks."
    });
  });

  it("keeps mixed reviewer focus section body as text without deriving focus_items", () => {
    const result = extractReviewerFocus(
      [
        "# Task",
        "## Reviewer Focus",
        "- Keep protocol deterministic",
        "Include one plain-text rationale line."
      ].join("\n")
    );

    expect(result).toEqual({
      status: "present",
      source: "section",
      focus_text:
        "- Keep protocol deterministic\nInclude one plain-text rationale line."
    });
  });

  it("keeps reviewer focus subheadings inside section body without truncation", () => {
    const result = extractReviewerFocus(
      [
        "# Task",
        "## Reviewer Focus",
        "Keep context contiguous.",
        "### Details",
        "Subheading content must stay in extracted body.",
        "## Scope",
        "Stop here."
      ].join("\n")
    );

    expect(result).toEqual({
      status: "present",
      source: "section",
      focus_text:
        "Keep context contiguous.\n### Details\nSubheading content must stay in extracted body."
    });
  });

  it("returns absent status when neither frontmatter nor section provides reviewer focus", () => {
    const result = extractReviewerFocus(
      [
        "# Task",
        "## Scope",
        "No reviewer focus section is present."
      ].join("\n")
    );

    expect(result).toEqual({
      status: "absent",
      source: "none",
      reason_code: "REVIEWER_FOCUS_ABSENT"
    });
  });

  it("returns invalid for unsupported frontmatter reviewer_focus type", () => {
    const result = extractReviewerFocus(
      "# Task\n## Reviewer Focus\nFallback section should not be used.",
      {
        reviewer_focus: 42
      }
    );

    expect(result).toEqual({
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_INVALID_FRONTMATTER_TYPE"
    });
  });

  it("returns frontmatter parse warning when opening frontmatter fence is not closed", () => {
    const result = extractReviewerFocus(
      [
        "---",
        "reviewer_focus: focus from malformed frontmatter",
        "## Reviewer Focus",
        "Section should not be consumed when parser fails."
      ].join("\n")
    );

    expect(result).toEqual({
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING"
    });
  });

  it("returns frontmatter parse warning for malformed inline reviewer_focus list", () => {
    const result = extractReviewerFocus(
      [
        "---",
        "reviewer_focus: [\"alpha, beta\", \"gamma\"",
        "---",
        "# Task"
      ].join("\n")
    );

    expect(result).toEqual({
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING"
    });
  });

  it("returns invalid for empty frontmatter reviewer_focus string or list", () => {
    const emptyStringResult = extractReviewerFocus(
      "# Task",
      {
        reviewer_focus: "   "
      }
    );
    const emptyListResult = extractReviewerFocus(
      "# Task",
      {
        reviewer_focus: ["  ", ""]
      }
    );

    expect(emptyStringResult).toEqual({
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_EMPTY_FRONTMATTER"
    });
    expect(emptyListResult).toEqual({
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_EMPTY_FRONTMATTER"
    });
  });

  it("returns invalid when frontmatter reviewer_focus list contains whitespace-only items", () => {
    const result = extractReviewerFocus(
      "# Task",
      {
        reviewer_focus: ["Keep deterministic flow", "   "]
      }
    );

    expect(result).toEqual({
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_WHITESPACE_FRONTMATTER_ITEM"
    });
  });

  it("returns invalid for empty reviewer focus section body", () => {
    const result = extractReviewerFocus(
      [
        "# Task",
        "## Reviewer Focus",
        "   ",
        "## L1 - Change Contract",
        "Body."
      ].join("\n")
    );

    expect(result).toEqual({
      status: "invalid",
      source: "section",
      reason_code: "REVIEWER_FOCUS_EMPTY_SECTION"
    });
  });

  it("uses first reviewer focus section and records multiple-sections warning", () => {
    const result = extractReviewerFocus(
      [
        "# Task",
        "## Reviewer Focus",
        "- First section wins",
        "",
        "### Reviewer Focus",
        "- Second section exists"
      ].join("\n")
    );

    expect(result).toEqual({
      status: "present",
      source: "section",
      focus_text: "- First section wins",
      focus_items: ["First section wins"],
      reason_code: "REVIEWER_FOCUS_MULTIPLE_SECTIONS"
    });
  });

  it("falls back with parse warning when unexpected extraction error occurs", () => {
    const frontmatter = {} as Record<string, unknown>;
    Object.defineProperty(frontmatter, "reviewer_focus", {
      enumerable: true,
      get() {
        throw new Error("unexpected getter error");
      }
    });

    const result = extractReviewerFocus(
      "# Task\n## Reviewer Focus\nShould not crash extraction.",
      frontmatter
    );

    expect(result).toEqual({
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_PARSE_WARNING"
    });
  });

  it("uses section source for parse warning when extraction fails in section path", () => {
    const result = extractReviewerFocus(42 as unknown as string, {});

    expect(result).toEqual({
      status: "invalid",
      source: "section",
      reason_code: "REVIEWER_FOCUS_PARSE_WARNING"
    });
  });

  it("persists extracted reviewer focus artifact during bubble creation", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_reviewer_focus_artifact_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: [
        "# Task",
        "## Reviewer Focus",
        "- Keep reviewer guidance deterministic"
      ].join("\n"),
      cwd: repoPath
    });

    const artifactPath = result.paths.reviewerFocusArtifactPath;
    const artifactRaw = await readFile(artifactPath, "utf8");
    const artifactParsed = JSON.parse(artifactRaw) as unknown;

    expect(artifactParsed).toEqual(result.reviewerFocus);
    expect(result.reviewerFocus).toEqual({
      status: "present",
      source: "section",
      focus_text: "- Keep reviewer guidance deterministic",
      focus_items: ["Keep reviewer guidance deterministic"]
    });
  });

  it("continues bubble creation with malformed inline reviewer_focus list via fail-open parse warning", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_focus_malformed_inline_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: [
        "---",
        "reviewer_focus: [\"alpha, beta\", \"gamma\"",
        "---",
        "# Task",
        "## L1 - Change Contract",
        "No-op"
      ].join("\n"),
      cwd: repoPath
    });

    expect(result.reviewerFocus).toEqual({
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING"
    });
  });

  it("persists explicit document review artifact type", async () => {
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
      reviewArtifactType: "document",
      taskFile: taskFilePath,
      cwd: repoPath
    });

    expect(result.config.review_artifact_type).toBe("document");
    const bubbleToml = await readFile(result.paths.bubbleTomlPath, "utf8");
    expect(parseBubbleConfigToml(bubbleToml).review_artifact_type).toBe(
      "document"
    );
    await expect(
      stat(resolveDocContractGateArtifactPath(result.paths.artifactsDir))
    ).resolves.toBeDefined();
  });

  it("persists explicit code review artifact type", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_code_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Implement TypeScript changes in src/ and tests/ for API bug fix.",
      cwd: repoPath
    });

    expect(result.config.review_artifact_type).toBe("code");
  });

  it("rejects missing reviewArtifactType in core contract", async () => {
    const repoPath = await createTempRepo();

    await expect(
      createBubble({
        id: "b_create_missing_review_type_01",
        repoPath,
        baseBranch: "main",
        task: "Review document consistency and API naming.",
        cwd: repoPath
      } as unknown as Parameters<typeof createBubble>[0])
    ).rejects.toThrow(new RegExp(`^${MISSING_REVIEW_ARTIFACT_TYPE_OPTION}:`, "u"));
  });

  it("rejects auto reviewArtifactType in core contract", async () => {
    const repoPath = await createTempRepo();

    await expect(
      createBubble({
        id: "b_create_auto_review_type_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "auto",
        task: "Review document consistency and API naming.",
        cwd: repoPath
      } as unknown as Parameters<typeof createBubble>[0])
    ).rejects.toThrow(new RegExp(`^${REVIEW_ARTIFACT_TYPE_AUTO_REMOVED}:`, "u"));
  });

  it("rejects invalid reviewArtifactType in core contract", async () => {
    const repoPath = await createTempRepo();

    await expect(
      createBubble({
        id: "b_create_invalid_review_type_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "slides",
        task: "Review document consistency and API naming.",
        cwd: repoPath
      } as unknown as Parameters<typeof createBubble>[0])
    ).rejects.toThrow(new RegExp(`^${INVALID_REVIEW_ARTIFACT_TYPE_OPTION}:`, "u"));
  });

  it("does not write doc-gate artifact for non-document bubbles", async () => {
    const repoPath = await createTempRepo();

    const result = await createBubble({
      id: "b_create_non_doc_no_gate_artifact_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Implement TypeScript changes in src/ and tests/ for API bug fix.",
      cwd: repoPath
    });

    expect(result.config.review_artifact_type).toBe("code");
    await expect(
      stat(resolveDocContractGateArtifactPath(result.paths.artifactsDir))
    ).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("treats --task input as inline text even when same-named file exists", async () => {
    const repoPath = await createTempRepo();
    const fileNamedLikeTask = join(repoPath, "fix the login bug");
    await writeFile(fileNamedLikeTask, "This should not be auto-read\n", "utf8");

    const result = await createBubble({
      id: "b_create_021",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
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
        reviewArtifactType: "code",
        task: "Task",
        cwd: repoPath
      })
    ).rejects.toThrow(/Invalid bubble id/u);
  });

  it("rejects invalid bubble ids before create-lock path setup can create external directories", async () => {
    const repoPath = await createTempRepo();
    const externalDir = await createTempDir();
    await rm(externalDir, { recursive: true, force: true });

    const locksDir = join(repoPath, ".pairflow", "locks");
    const invalidId = relative(
      locksDir,
      join(externalDir, "evil.create.lock")
    ).replace(/\.create\.lock$/u, "");

    await expect(
      createBubble({
        id: invalidId,
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Task",
        cwd: repoPath
      })
    ).rejects.toThrow(/Invalid bubble id/u);

    await expect(stat(externalDir)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("rejects bubble ids longer than 40 characters with explicit limit message", async () => {
    const repoPath = await createTempRepo();

    await expect(
      createBubble({
        id: `b${"a".repeat(40)}`,
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Task",
        cwd: repoPath
      })
    ).rejects.toThrow(/Maximum length is 40 characters/u);
  });

  it("rejects duplicate bubble ids in same repo", async () => {
    const repoPath = await createTempRepo();

    await createBubble({
      id: "b_create_03",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Task",
      cwd: repoPath
    });

    await expect(
      createBubble({
        id: "b_create_03",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
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
        reviewArtifactType: "code",
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
        reviewArtifactType: "code",
        task: "Task",
        cwd: nonRepoPath
      })
    ).rejects.toThrow(/does not look like a git repository/u);
  });
});
