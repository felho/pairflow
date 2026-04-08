import { spawn } from "node:child_process"
import { mkdir, open, type FileHandle } from "node:fs/promises"
import { join } from "node:path"

import type { PassValidationCommandId } from "../../artifact/validation/passValidationEvidence.js"

interface PassValidationRunnerErrorContext {
  command?: string
  reason?: string
  worktreePath?: string
}

export class PassValidationRunnerExecutionError extends Error {
  public readonly kind: PassValidationCommandId
  public readonly stage: "pre_header" | "spawn" | "settle" | "stdout" | "stderr"
  public readonly logPath: string
  public readonly context: PassValidationRunnerErrorContext | undefined

  public constructor(input: {
    kind: PassValidationCommandId
    stage: "pre_header" | "spawn" | "settle" | "stdout" | "stderr"
    logPath: string
    cause: unknown
    context?: PassValidationRunnerErrorContext
  }) {
    const causeMessage =
      input.cause instanceof Error && input.cause.message.trim().length > 0
        ? input.cause.message
        : String(input.cause)
    super(
      `PASS validation runner ${input.stage} failed for ${input.kind}. log=${input.logPath}. cause=${causeMessage}`,
      { cause: input.cause }
    )
    this.name = "PassValidationRunnerExecutionError"
    this.kind = input.kind
    this.stage = input.stage
    this.logPath = input.logPath
    this.context = input.context
  }
}

export interface RunPassValidationCommandInput {
  kind: PassValidationCommandId
  command: string
  worktreePath: string
}

export interface RunPassValidationCommandDependencies {
  mkdir?: typeof mkdir
  open?: typeof open
  spawn?: typeof spawn
  now?: () => number
}

function buildLogPath(kind: PassValidationCommandId): string {
  return `.pairflow/evidence/pass-validation-${kind}.log`
}

function createSerializedAppender(fileHandle: FileHandle): (
  chunk: string | Buffer
) => Promise<void> {
  let writeChain = Promise.resolve()

  return async (chunk) => {
    writeChain = writeChain.then(() => fileHandle.writeFile(chunk))
    await writeChain
  }
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value
  }
  return new Error(String(value))
}

function toPassValidationStageError(input: {
  kind: PassValidationCommandId
  stage: "settle" | "stdout" | "stderr"
  logPath: string
  cause: unknown
  context: PassValidationRunnerErrorContext
}): PassValidationRunnerExecutionError {
  return new PassValidationRunnerExecutionError(input)
}

async function appendStreamToHandle(
  stream: NodeJS.ReadableStream,
  appendChunk: (chunk: string | Buffer) => Promise<void>
): Promise<void> {
  for await (const chunk of stream) {
    await appendChunk(chunk)
  }
}

async function preparePassValidationLogFile(input: {
  kind: PassValidationCommandId
  command: string
  worktreePath: string
  mkdirFn: typeof mkdir
  openFn: typeof open
  relativeLogPath: string
}): Promise<FileHandle> {
  const absoluteLogPath = join(input.worktreePath, input.relativeLogPath)
  await input.mkdirFn(join(input.worktreePath, ".pairflow", "evidence"), {
    recursive: true
  })
  const fileHandle = await input.openFn(absoluteLogPath, "w")
  await fileHandle.writeFile(
    [
      `# pairflow pass validation`,
      `kind=${input.kind}`,
      `command=${input.command}`,
      `cwd=${input.worktreePath}`,
      ""
    ].join("\n")
  )
  return fileHandle
}

function createPassValidationSettlement(
  input: RunPassValidationCommandInput,
  child: ReturnType<typeof spawn>,
  relativeLogPath: string
): Promise<{ exitCode: number } | { error: PassValidationRunnerExecutionError }> {
  return new Promise<
    { exitCode: number } | { error: PassValidationRunnerExecutionError }
  >((resolvePromise) => {
    let settled = false
    const resolveOnce = (
      result:
        | { exitCode: number }
        | { error: PassValidationRunnerExecutionError }
    ): void => {
      if (settled) {
        return
      }
      settled = true
      resolvePromise(result)
    }
    child.on("error", (error) => {
      child.stdout?.destroy()
      child.stderr?.destroy()
      resolveOnce({
        error: new PassValidationRunnerExecutionError({
          kind: input.kind,
          stage: "spawn",
          logPath: relativeLogPath,
          cause: error,
          context: {
            command: input.command,
            reason: "spawn_event_error",
            worktreePath: input.worktreePath
          }
        })
      })
    })
    child.on("close", (exitCode) => {
      resolveOnce({
        exitCode: exitCode ?? 1
      })
    })
  })
}

async function executePassValidationChild(input: {
  child: ReturnType<typeof spawn>
  fileHandle: FileHandle
  runInput: RunPassValidationCommandInput
  relativeLogPath: string
  startedAt: number
  now: () => number
  settle: Promise<
    { exitCode: number } | { error: PassValidationRunnerExecutionError }
  >
}): Promise<{
  command: string
  exitCode: number
  logPath: string
  durationMs: number
}> {
  const stdout = input.child.stdout
  const stderr = input.child.stderr
  if (stdout === null || stderr === null) {
    throw new PassValidationRunnerExecutionError({
      kind: input.runInput.kind,
      stage: "spawn",
      logPath: input.relativeLogPath,
      cause: new Error("spawned process did not expose pipe streams"),
      context: {
        command: input.runInput.command,
        reason: "missing_pipe_streams",
        worktreePath: input.runInput.worktreePath
      }
    })
  }
  const appendChunk = createSerializedAppender(input.fileHandle)
  const [stdoutResult, stderrResult, settleResult] = await Promise.all([
    appendStreamToHandle(stdout, appendChunk).then(
      () => ({ ok: true as const }),
      (error) => ({ ok: false as const, error: toError(error) })
    ),
    appendStreamToHandle(stderr, appendChunk).then(
      () => ({ ok: true as const }),
      (error) => ({ ok: false as const, error: toError(error) })
    ),
    input.settle
  ])
  if ("error" in settleResult) {
    throw new PassValidationRunnerExecutionError({
      kind: input.runInput.kind,
      stage:
        settleResult.error instanceof PassValidationRunnerExecutionError
          ? settleResult.error.stage
          : "settle",
      logPath: input.relativeLogPath,
      cause: settleResult.error,
      context: {
        command: input.runInput.command,
        reason: "settlement_failed",
        worktreePath: input.runInput.worktreePath
      }
    })
  }
  if (!stdoutResult.ok) {
    throw toPassValidationStageError({
      kind: input.runInput.kind,
      stage: "stdout",
      logPath: input.relativeLogPath,
      cause: stdoutResult.error,
      context: {
        command: input.runInput.command,
        reason: "stdout_capture_failed",
        worktreePath: input.runInput.worktreePath
      }
    })
  }
  if (!stderrResult.ok) {
    throw toPassValidationStageError({
      kind: input.runInput.kind,
      stage: "stderr",
      logPath: input.relativeLogPath,
      cause: stderrResult.error,
      context: {
        command: input.runInput.command,
        reason: "stderr_capture_failed",
        worktreePath: input.runInput.worktreePath
      }
    })
  }
  const exitCode = settleResult.exitCode
  const durationMs = Math.max(0, input.now() - input.startedAt)
  await input.fileHandle.writeFile(`\nexit_code=${exitCode}\nduration_ms=${durationMs}\n`)
  await input.fileHandle.close()
  return {
    command: input.runInput.command,
    exitCode,
    logPath: input.relativeLogPath,
    durationMs
  }
}

export async function runPassValidationCommand(
  input: RunPassValidationCommandInput,
  dependencies: RunPassValidationCommandDependencies = {}
): Promise<{
  command: string
  exitCode: number
  logPath: string
  durationMs: number
}> {
  const mkdirFn = dependencies.mkdir ?? mkdir
  const openFn = dependencies.open ?? open
  const spawnFn = dependencies.spawn ?? spawn
  const now = dependencies.now ?? (() => Date.now())

  const relativeLogPath = buildLogPath(input.kind)

  let fileHandle: FileHandle | undefined
  try {
    fileHandle = await preparePassValidationLogFile({
      kind: input.kind,
      command: input.command,
      worktreePath: input.worktreePath,
      mkdirFn,
      openFn,
      relativeLogPath
    })
  } catch (error) {
    await fileHandle?.close().catch(() => undefined)
    throw new PassValidationRunnerExecutionError({
      kind: input.kind,
      stage: "pre_header",
      logPath: relativeLogPath,
      cause: error,
      context: {
        command: input.command,
        reason: "prepare_log_file_failed",
        worktreePath: input.worktreePath
      }
    })
  }

  const startedAt = now()

  let child: ReturnType<typeof spawnFn>
  try {
    child = spawnFn("bash", ["-lc", input.command], {
      cwd: input.worktreePath,
      stdio: ["ignore", "pipe", "pipe"]
    })
  } catch (error) {
    await fileHandle.close().catch(() => undefined)
    throw new PassValidationRunnerExecutionError({
      kind: input.kind,
      stage: "spawn",
      logPath: relativeLogPath,
      cause: error,
      context: {
        command: input.command,
        reason: "spawn_call_failed",
        worktreePath: input.worktreePath
      }
    })
  }

  const settle = createPassValidationSettlement(
    input,
    child,
    relativeLogPath
  )

  try {
    return await executePassValidationChild({
      child,
      fileHandle,
      runInput: input,
      relativeLogPath,
      startedAt,
      now,
      settle
    })
  } catch (error) {
    child.kill("SIGTERM")
    await fileHandle.close().catch(() => undefined)
    throw error
  }
}
