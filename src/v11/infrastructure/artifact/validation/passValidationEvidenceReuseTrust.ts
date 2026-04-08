import { createHash } from "node:crypto"
import { realpath, stat } from "node:fs/promises"
import { isAbsolute, resolve } from "node:path"

import { runGit } from "../../workspace/git.js"

export function normalizeCommand(command: string | undefined): string | undefined {
  if (command === undefined) {
    return undefined
  }
  const normalized = command.trim()
  return normalized.length > 0 ? normalized : undefined
}

export function isValidTimestamp(value: string | undefined): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

function pathStartsWith(path: string, prefix: string): boolean {
  return (
    path === prefix ||
    path.startsWith(`${prefix}/`) ||
    path.startsWith(`${prefix}\\`)
  )
}

export async function isTrustedPassValidationLogPath(
  logPath: string | undefined,
  worktreePath: string
): Promise<boolean> {
  const normalized = normalizeCommand(logPath)
  if (
    normalized === undefined ||
    normalized.includes("\u0000") ||
    isAbsolute(normalized)
  ) {
    return false
  }

  if (!normalized.startsWith(".pairflow/evidence/")) {
    return false
  }

  if (normalized.endsWith("/") || normalized.endsWith("\\")) {
    return false
  }

  const resolvedWorktreePath = resolve(worktreePath)
  const resolvedEvidenceRoot = resolve(worktreePath, ".pairflow", "evidence")
  const resolvedLogPath = resolve(worktreePath, normalized)
  if (
    !pathStartsWith(resolvedEvidenceRoot, resolvedWorktreePath) ||
    resolvedLogPath === resolvedEvidenceRoot ||
    !pathStartsWith(resolvedLogPath, resolvedEvidenceRoot)
  ) {
    return false
  }

  const [canonicalWorktreePath, canonicalEvidenceRoot, canonicalLogPath] =
    await Promise.all([
      realpath(resolvedWorktreePath).catch(() => undefined),
      realpath(resolvedEvidenceRoot).catch(() => undefined),
      realpath(resolvedLogPath).catch(() => undefined)
    ])

  if (
    canonicalWorktreePath === undefined ||
    canonicalEvidenceRoot === undefined ||
    canonicalLogPath === undefined
  ) {
    return false
  }

  if (
    !pathStartsWith(canonicalEvidenceRoot, canonicalWorktreePath) ||
    canonicalLogPath === canonicalEvidenceRoot ||
    !pathStartsWith(canonicalLogPath, canonicalEvidenceRoot)
  ) {
    return false
  }

  const logStats = await stat(canonicalLogPath).catch(() => undefined)
  return logStats?.isFile() === true
}

export function formatGitFingerprintFailureDetail(input: {
  worktreePath: string
  headError?: string
  statusError?: string
}): string {
  const failures = [
    ...(input.headError !== undefined ? [`HEAD: ${input.headError}`] : []),
    ...(input.statusError !== undefined ? [`status: ${input.statusError}`] : [])
  ]
  if (failures.length === 0) {
    return `Unable to read current git fingerprint for ${input.worktreePath}.`
  }
  return `Unable to read current git fingerprint for ${input.worktreePath}: ${failures.join("; ")}.`
}

export async function readGitFingerprint(worktreePath: string): Promise<{
  headSha: string | null
  gitStatusHash: string | null
  headError?: string
  statusError?: string
}> {
  const [head, status] = await Promise.all([
    runGit(["rev-parse", "HEAD"], {
      cwd: worktreePath,
      allowFailure: true
    }),
    runGit(["status", "--short"], {
      cwd: worktreePath,
      allowFailure: true
    })
  ])

  return {
    headSha: head.exitCode === 0 ? head.stdout.trim() || null : null,
    gitStatusHash:
      status.exitCode === 0
        ? createHash("sha256").update(status.stdout).digest("hex")
        : null,
    ...(head.exitCode !== 0 ? { headError: head.stderr.trim() || head.stdout.trim() || "git rev-parse HEAD failed" } : {}),
    ...(status.exitCode !== 0
      ? { statusError: status.stderr.trim() || status.stdout.trim() || "git status --short failed" }
      : {})
  }
}
