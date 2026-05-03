import { mkdir, rm, writeFile } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";

import type {
  AgentRunnerContinuationPayload,
  CodexRunnerArtifactFiles
} from "./agentRunnerBridgeContract.js";

export const CODEX_RUNNER_ARTIFACT_SCHEMA_VERSION = 1;

export interface PrepareCodexRunnerArtifactsInput {
  payload: AgentRunnerContinuationPayload;
  startedAt: string;
  mode: string;
}

export async function prepareCodexRunnerArtifacts(
  input: PrepareCodexRunnerArtifactsInput
): Promise<CodexRunnerArtifactFiles> {
  const root = join(
    input.payload.repo_path,
    ".pairflow",
    "runtime",
    "plan-watch",
    "agent-runner"
  );
  await mkdir(root, { recursive: true });
  const artifactDir = await claimArtifactDir({
    root,
    baseName: buildArtifactDirBaseName({
      planPath: input.payload.plan_path,
      invocationId: input.payload.invocation_id,
      now: new Date(input.startedAt)
    })
  });
  const artifactDirRef = repoRelativeOrAbsolute(input.payload.repo_path, artifactDir);
  const schemaFilePath = join(artifactDir, "structured-output.schema.json");
  const schemaFilePathRef = repoRelativeOrAbsolute(
    input.payload.repo_path,
    schemaFilePath
  );
  const metadataFilePath = join(artifactDir, "metadata.json");
  const eventsFilePath = join(artifactDir, "events.ndjson");
  const timelineFilePath = join(artifactDir, "timeline.ndjson");

  try {
    await writeFile(
      schemaFilePath,
      `${JSON.stringify(STRUCTURED_OUTPUT_SCHEMA, null, 2)}\n`,
      "utf8"
    );
    await writeFile(
      metadataFilePath,
      `${JSON.stringify(
        {
          schemaVersion: CODEX_RUNNER_ARTIFACT_SCHEMA_VERSION,
          invocationId: input.payload.invocation_id,
          startedAt: input.startedAt,
          repoPath: input.payload.repo_path,
          planPath: input.payload.plan_path,
          planSlug: planSlugFromPath(input.payload.plan_path),
          mode: input.mode,
          artifactDir: artifactDirRef,
          schemaFilePath: schemaFilePathRef,
          ...(typeof input.payload.trigger.source === "string"
            ? { triggerKind: input.payload.trigger.source }
            : {})
        },
        null,
        2
      )}\n`,
      "utf8"
    );
    await writeFile(eventsFilePath, "", "utf8");
    await writeFile(timelineFilePath, "", "utf8");
  } catch (error) {
    await rm(artifactDir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }

  return {
    artifactDir,
    artifactDirRef,
    schemaFilePath,
    metadataFilePath,
    eventsFilePath,
    timelineFilePath
  };
}

export function buildArtifactDirBaseName(input: {
  planPath: string;
  invocationId: string;
  now: Date;
}): string {
  return `${localDateSegment(input.now)}_${localTimeSegment(input.now)}_${planSlugFromPath(input.planPath)}_${safeInvocationSegment(input.invocationId)}`;
}

export function planSlugFromPath(planPath: string): string {
  const stem = basename(planPath).replace(/\.[^.]*$/u, "");
  const withoutDate = stem.replace(/^\d{4}-\d{2}-\d{2}-/u, "");
  const slug = withoutDate
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80)
    .replace(/-+$/gu, "");
  return slug.length > 0 ? slug : "plan";
}

async function claimArtifactDir(input: {
  root: string;
  baseName: string;
}): Promise<string> {
  for (let index = 1; index < 10_000; index += 1) {
    const name = index === 1 ? input.baseName : `${input.baseName}-${index}`;
    const artifactDir = join(input.root, name);
    try {
      await mkdir(artifactDir);
      return artifactDir;
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        continue;
      }
      throw error;
    }
  }
  throw new CodexRunnerArtifactError(
    "PLAN_WATCH_RUNNER_FILE_IO_FAILED",
    `Could not claim Codex runner artifact directory; context root=${input.root}`
  );
}

function repoRelativeOrAbsolute(repoPath: string, path: string): string {
  const relativePath = relative(repoPath, path);
  if (
    relativePath.length > 0
    && relativePath !== ".."
    && !relativePath.startsWith(`..${sep}`)
  ) {
    return relativePath;
  }
  return path;
}

function localDateSegment(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localTimeSegment(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}-${minutes}-${seconds}`;
}

function safeInvocationSegment(invocationId: string): string {
  const normalized = invocationId
    .trim()
    .replace(/[^A-Za-z0-9._-]+/gu, "-")
    .replace(/^[.-]+/u, "")
    .replace(/[.-]+$/u, "")
    .slice(0, 80)
    .replace(/[.-]+$/u, "");
  return normalized.length > 0 ? normalized : "invocation";
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "EEXIST"
  );
}

export class CodexRunnerArtifactError extends Error {
  public constructor(
    public readonly reasonCode: "PLAN_WATCH_RUNNER_FILE_IO_FAILED",
    message: string
  ) {
    super(message);
    this.name = "CodexRunnerArtifactError";
  }
}

const STRUCTURED_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "reason_code",
    "summary",
    "changed_artifacts",
    "route_ledger_summary"
  ],
  properties: {
    status: {
      type: "string",
      enum: ["settled_checkpoint", "human_checkpoint", "blocked"]
    },
    reason_code: {
      type: "string",
      minLength: 1
    },
    summary: {
      type: ["string", "null"]
    },
    changed_artifacts: {
      anyOf: [
        {
          type: "array",
          items: {
            type: "string"
          }
        },
        {
          type: "null"
        }
      ]
    },
    route_ledger_summary: {
      type: ["string", "null"]
    }
  }
} as const;
