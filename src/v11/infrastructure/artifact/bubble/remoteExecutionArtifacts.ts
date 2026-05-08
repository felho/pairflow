import { readFile, rm, writeFile } from "node:fs/promises";
import type {
  BubbleRemotePointer
} from "../../../shared/remote/remoteExecutionTypes.js";
import type {
  BubbleRemoteStateCache
} from "../../../../types/bubble.js";
import {
  SchemaValidationError,
  assertValidation,
  type SchemaValidationErrorContext,
  type ValidationError
} from "../../../shared/validation/primitives.js";
import {
  validateRemotePointer,
  validateRemoteStateCache
} from "./remoteExecutionArtifactValidation.js";
export {
  validateRemotePointer,
  validateRemoteStateCache
} from "./remoteExecutionArtifactValidation.js";

const REMOTE_POINTER_INVALID = "REMOTE_POINTER_INVALID";
const REMOTE_STATE_CACHE_INVALID = "REMOTE_STATE_CACHE_INVALID";
const REMOTE_ARTIFACT_PARENT_DIR_MISSING = "REMOTE_ARTIFACT_PARENT_DIR_MISSING";
const REMOTE_ARTIFACT_READ_FAILED = "REMOTE_ARTIFACT_READ_FAILED";
const REMOTE_ARTIFACT_WRITE_FAILED = "REMOTE_ARTIFACT_WRITE_FAILED";

type RemoteArtifactIoErrorCode =
  | typeof REMOTE_ARTIFACT_PARENT_DIR_MISSING
  | typeof REMOTE_ARTIFACT_READ_FAILED
  | typeof REMOTE_ARTIFACT_WRITE_FAILED;

interface RemoteArtifactIoErrorContext {
  source?: string;
  errno?: string | null;
}

type JsonArtifactReadResult =
  | {
      status: "missing";
    }
  | {
      status: "present";
      value: unknown;
    };

export class RemoteArtifactIoError extends Error {
  public readonly code: RemoteArtifactIoErrorCode;
  public readonly operation: "read" | "write";
  public readonly artifactPath: string;
  public readonly context: RemoteArtifactIoErrorContext | undefined;
  public readonly cause: unknown;

  public constructor(input: {
    code: RemoteArtifactIoErrorCode;
    operation: "read" | "write";
    artifactPath: string;
    context?: RemoteArtifactIoErrorContext;
    cause: unknown;
  }) {
    const reason =
      input.cause instanceof Error ? input.cause.message : String(input.cause);
    super(
      `${input.code}: Failed to ${input.operation} remote artifact at ${input.artifactPath}: ${reason}`
    );
    this.name = "RemoteArtifactIoError";
    this.code = input.code;
    this.operation = input.operation;
    this.artifactPath = input.artifactPath;
    this.context = input.context;
    this.cause = input.cause;
  }
}

function toSchemaValidationError(
  code: string,
  message: string,
  errors: ValidationError[],
  context?: SchemaValidationErrorContext
): SchemaValidationError {
  return new SchemaValidationError(`${code}: ${message}`, errors, context);
}

async function readJsonArtifact(path: string): Promise<JsonArtifactReadResult> {
  const raw = await readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    // Phase 1A intentionally collapses all ENOENT reads into a single "missing"
    // contract, whether the artifact never existed or disappeared before read completion.
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw new RemoteArtifactIoError({
      code: REMOTE_ARTIFACT_READ_FAILED,
      operation: "read",
      artifactPath: path,
      context: {
        source: "readJsonArtifact",
        errno: error.code ?? null
      },
      cause: error
    });
  });

  if (raw === undefined) {
    return { status: "missing" };
  }

  try {
    return {
      status: "present",
      value: JSON.parse(raw) as unknown
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SchemaValidationError(`Invalid JSON: ${reason}`, [
      {
        path: "$",
        message: reason
      }
    ]);
  }
}

async function writeJsonArtifact(path: string, value: unknown): Promise<void> {
  try {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } catch (error) {
    const code =
      (error as NodeJS.ErrnoException).code === "ENOENT"
        ? REMOTE_ARTIFACT_PARENT_DIR_MISSING
        : REMOTE_ARTIFACT_WRITE_FAILED;
    throw new RemoteArtifactIoError({
      code,
      operation: "write",
      artifactPath: path,
      context: {
        source: "writeJsonArtifact",
        errno: (error as NodeJS.ErrnoException).code ?? null
      },
      cause: error
    });
  }
}

export async function readRemotePointer(
  path: string
): Promise<BubbleRemotePointer | null> {
  try {
    const parsed = await readJsonArtifact(path);
    if (parsed.status === "missing") {
      return null;
    }

    return assertValidation(
      validateRemotePointer(parsed.value),
      "Invalid remote pointer"
    );
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      throw toSchemaValidationError(
        REMOTE_POINTER_INVALID,
        error.message,
        error.errors,
        error.context
      );
    }
    throw error;
  }
}

export async function writeRemotePointer(
  path: string,
  value: BubbleRemotePointer
): Promise<void> {
  await writeJsonArtifact(path, value);
}

export async function readRemoteStateCache(
  path: string
): Promise<BubbleRemoteStateCache | null> {
  try {
    const parsed = await readJsonArtifact(path);
    if (parsed.status === "missing") {
      return null;
    }

    return assertValidation(
      validateRemoteStateCache(parsed.value),
      "Invalid remote state cache"
    );
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      throw toSchemaValidationError(
        REMOTE_STATE_CACHE_INVALID,
        error.message,
        error.errors,
        error.context
      );
    }
    throw error;
  }
}

export async function writeRemoteStateCache(
  path: string,
  value: BubbleRemoteStateCache
): Promise<void> {
  await writeJsonArtifact(path, value);
}

export async function removeRemoteStateCache(path: string): Promise<void> {
  try {
    await rm(path, { force: true });
  } catch (error) {
    throw new RemoteArtifactIoError({
      code: REMOTE_ARTIFACT_WRITE_FAILED,
      operation: "write",
      artifactPath: path,
      context: {
        source: "removeRemoteStateCache",
        errno: (error as NodeJS.ErrnoException).code ?? null
      },
      cause: error
    });
  }
}
