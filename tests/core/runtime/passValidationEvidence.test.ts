import { mkdir, mkdtemp, rm, stat, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  buildPassValidationEvidenceArtifact,
  evaluatePassValidationEvidenceReuse,
  persistPassValidationRecoveryMarker,
  readPassValidationRecoveryMarker,
  resolvePassValidationRecoveryRepoMarkerPath,
  resolvePassValidationRecoveryWorktreeMarkerPath,
  type PassValidationEvidenceArtifact
} from "../../../src/core/runtime/passValidationEvidence.js"
import { initGitRepository } from "../../helpers/git.js"

async function createRepoFixture() {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-evidence-"))
  await initGitRepository(repoPath)
  await mkdir(join(repoPath, ".pairflow", "runtime"), { recursive: true })
  await mkdir(join(repoPath, ".pairflow", "evidence"), { recursive: true })
  await writeFile(join(repoPath, ".pairflow", "evidence", "typecheck.log"), "ok\n", "utf8")
  await writeFile(join(repoPath, ".pairflow", "evidence", "test.log"), "ok\n", "utf8")

  const artifact = await buildPassValidationEvidenceArtifact({
    bubbleId: "b_pass_validation_reuse_01",
    round: 2,
    generatedAt: "2026-03-28T10:00:00.000Z",
    worktreePath: repoPath,
    policyState: "policy_configured",
    requiredCommandSetId: "typecheck__test",
    trustLevel: "trusted",
    trustReasonCode: "no_trigger",
    commands: [
      {
        kind: "typecheck",
        command: "pnpm typecheck",
        exitCode: 0,
        logPath: ".pairflow/evidence/typecheck.log",
        durationMs: 5
      },
      {
        kind: "test",
        command: "pnpm test",
        exitCode: 0,
        logPath: ".pairflow/evidence/test.log",
        durationMs: 7
      }
    ]
  })

  return {
    repoPath,
    artifact
  }
}

function cloneArtifact(
  artifact: PassValidationEvidenceArtifact,
  overrides: Partial<PassValidationEvidenceArtifact>
): PassValidationEvidenceArtifact {
  return {
    ...artifact,
    commands: artifact.commands.map((command) => ({ ...command })),
    ...overrides
  }
}

const tempDirs: string[] = []

afterEach(async () => {
  while (tempDirs.length > 0) {
    const next = tempDirs.pop()
    if (next !== undefined) {
      await rm(next, { recursive: true, force: true })
    }
  }
})

describe("evaluatePassValidationEvidenceReuse", () => {
  it("allows reuse when canonical artifact coverage, fingerprint, and recovery state are valid", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: fixture.artifact,
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(true)
    expect(result.reason_code).toBeUndefined()
  })

  it("denies reuse when canonical artifact coverage is incomplete even if the artifact says trusted", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: cloneArtifact(fixture.artifact, {
        commands: [fixture.artifact.commands[0]!]
      }),
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("missing command 'test'")
  })

  it("denies reuse when a required command previously failed", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const commands = fixture.artifact.commands.map((command) => ({ ...command }))
    commands[1] = {
      ...commands[1]!,
      exit_code: 1
    }

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: cloneArtifact(fixture.artifact, { commands }),
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("non-zero exit")
  })

  it("denies reuse when a required command exit code is missing or invalid", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const commands = fixture.artifact.commands.map((command) => ({ ...command }))
    commands[1] = {
      ...commands[1]!,
      exit_code: undefined as unknown as number
    }

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: cloneArtifact(fixture.artifact, { commands }),
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("invalid exit code")
  })

  it("denies reuse when a required log path is missing or escapes the trusted evidence root", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const commands = fixture.artifact.commands.map((command) => ({ ...command }))
    commands[0] = {
      ...commands[0]!,
      log_path: "../typecheck.log"
    }

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: cloneArtifact(fixture.artifact, { commands }),
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("untrusted log path")
  })

  it("denies reuse when a required log path traverses out of the canonical evidence root", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const commands = fixture.artifact.commands.map((command) => ({ ...command }))
    commands[0] = {
      ...commands[0]!,
      log_path: ".pairflow/evidence/../typecheck.log"
    }

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: cloneArtifact(fixture.artifact, { commands }),
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("untrusted log path")
  })

  it("denies reuse when a required log path points at a missing evidence file", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const commands = fixture.artifact.commands.map((command) => ({ ...command }))
    commands[0] = {
      ...commands[0]!,
      log_path: ".pairflow/evidence/missing.log"
    }

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: cloneArtifact(fixture.artifact, { commands }),
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("untrusted log path")
  })

  it("denies reuse when a required log path contains a null byte", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const commands = fixture.artifact.commands.map((command) => ({ ...command }))
    commands[0] = {
      ...commands[0]!,
      log_path: ".pairflow/evidence/typecheck.log\u0000x"
    }

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: cloneArtifact(fixture.artifact, { commands }),
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("untrusted log path")
  })

  it("denies reuse when a required log path resolves through a symlink outside the evidence root", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const outsideDir = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-evidence-outside-"))
    tempDirs.push(outsideDir)
    const outsideLogPath = join(outsideDir, "typecheck.log")
    await writeFile(outsideLogPath, "ok\n", "utf8")
    await rm(join(fixture.repoPath, ".pairflow", "evidence", "typecheck.log"))
    await symlink(outsideLogPath, join(fixture.repoPath, ".pairflow", "evidence", "typecheck.log"))

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: fixture.artifact,
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("untrusted log path")
  })

  it("denies reuse when the artifact points at the evidence directory instead of a file", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const commands = fixture.artifact.commands.map((command) => ({ ...command }))
    commands[0] = {
      ...commands[0]!,
      log_path: ".pairflow/evidence"
    }

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: cloneArtifact(fixture.artifact, { commands }),
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("untrusted log path")
  })

  it("denies reuse when the artifact points at an evidence directory with a trailing slash", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const commands = fixture.artifact.commands.map((command) => ({ ...command }))
    commands[0] = {
      ...commands[0]!,
      log_path: ".pairflow/evidence/"
    }

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: cloneArtifact(fixture.artifact, { commands }),
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("untrusted log path")
  })

  it("denies reuse as recovery uncertain when an existing recovery marker is corrupt", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    await writeFile(
      resolvePassValidationRecoveryRepoMarkerPath(
        fixture.repoPath,
        "b_pass_validation_reuse_01"
      ),
      "{ invalid json",
      "utf8"
    )

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: fixture.artifact,
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_recovery_uncertain")
    expect(result.detail).toContain("JSON parse failed")
  })

  it("denies reuse as recovery uncertain when the recovery marker timestamp is invalid", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    await writeFile(
      resolvePassValidationRecoveryRepoMarkerPath(
        fixture.repoPath,
        "b_pass_validation_reuse_01"
      ),
      JSON.stringify({
        schema_version: 1,
        bubble_id: "b_pass_validation_reuse_01",
        flow: "restart",
        occurred_at: "not-a-timestamp",
        repo_path: fixture.repoPath
      }),
      "utf8"
    )

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: fixture.artifact,
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_recovery_uncertain")
    expect(result.detail).toContain("invalid occurred_at")
  })

  it("denies reuse when a valid recovery marker exists", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    await writeFile(
      resolvePassValidationRecoveryRepoMarkerPath(
        fixture.repoPath,
        "b_pass_validation_reuse_01"
      ),
      JSON.stringify({
        schema_version: 1,
        bubble_id: "b_pass_validation_reuse_01",
        flow: "restart",
        occurred_at: "2026-03-28T10:05:00.000Z",
        repo_path: fixture.repoPath
      }),
      "utf8"
    )

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: fixture.artifact,
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("recovery marker exists")
    expect(result.metadata.recovery_marker_state).toBe("valid")
  })

  it("keeps a corrupt repo-level marker on the recovery-uncertain path even when the worktree marker is valid", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    await writeFile(
      resolvePassValidationRecoveryRepoMarkerPath(
        fixture.repoPath,
        "b_pass_validation_reuse_01"
      ),
      "{ invalid json",
      "utf8"
    )
    await writeFile(
      resolvePassValidationRecoveryWorktreeMarkerPath(fixture.repoPath),
      JSON.stringify({
        schema_version: 1,
        bubble_id: "b_pass_validation_reuse_01",
        flow: "restart",
        occurred_at: "2026-03-28T10:05:00.000Z",
        repo_path: fixture.repoPath,
        worktree_path: fixture.repoPath
      }),
      "utf8"
    )

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: fixture.artifact,
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_recovery_uncertain")
    expect(result.detail).toContain("JSON parse failed")
  })

  it("surfaces all uncertain recovery marker candidates when no valid marker exists", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    await writeFile(
      resolvePassValidationRecoveryRepoMarkerPath(
        fixture.repoPath,
        "b_pass_validation_reuse_01"
      ),
      "{ invalid repo json",
      "utf8"
    )
    await writeFile(
      resolvePassValidationRecoveryWorktreeMarkerPath(fixture.repoPath),
      "{ invalid worktree json",
      "utf8"
    )

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: fixture.artifact,
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_recovery_uncertain")
    expect(result.detail).toContain("[repo]")
    expect(result.detail).toContain("[worktree]")
  })

  it("surfaces repo-level recovery uncertainty even when there is no usable worktree marker candidate", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    await writeFile(
      resolvePassValidationRecoveryRepoMarkerPath(
        fixture.repoPath,
        "b_pass_validation_reuse_01"
      ),
      "{ invalid repo json",
      "utf8"
    )

    const result = await readPassValidationRecoveryMarker(
      fixture.repoPath,
      "b_pass_validation_reuse_01"
    )

    expect(result.state).toBe("recovery_uncertain")
    if (result.state !== "recovery_uncertain") {
      throw new Error(`Expected recovery_uncertain, received ${result.state}`)
    }
    expect(result.reason_code).toBe("pass_validation_evidence_recovery_uncertain")
    expect(result.marker_scope).toBe("repo")
    expect(result.detail).toContain("JSON parse failed")
  })

  it("denies reuse when the required command set id no longer matches", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: fixture.artifact,
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "lint__typecheck__test",
      requiredCommands: [
        { kind: "lint", command: "pnpm lint" },
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("required command set mismatch")
  })

  it("denies reuse when schema_version is only coercibly equal to the expected version", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const artifact = {
      ...cloneArtifact(fixture.artifact, {}),
      schema_version: "1"
    } as unknown as PassValidationEvidenceArtifact

    const result = await evaluatePassValidationEvidenceReuse({
      artifact,
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("schema mismatch")
    expect(result.detail).toContain("found 1")
  })

  it("allows explicit-null policy reuse when fingerprints match and no recovery marker exists", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const artifact = await buildPassValidationEvidenceArtifact({
      bubbleId: "b_pass_validation_reuse_01",
      round: 2,
      generatedAt: "2026-03-28T10:00:00.000Z",
      worktreePath: fixture.repoPath,
      policyState: "policy_explicit_null",
      requiredCommandSetId: "explicit-null",
      trustLevel: "trusted",
      trustReasonCode: "no_trigger",
      commands: []
    })

    const result = await evaluatePassValidationEvidenceReuse({
      artifact,
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "explicit-null",
      requiredCommands: []
    })

    expect(result.reusable).toBe(true)
    expect(result.reason_code).toBeUndefined()
  })

  it("denies reuse when the canonical artifact is marked untrusted", async () => {
    const fixture = await createRepoFixture()
    tempDirs.push(fixture.repoPath)

    const result = await evaluatePassValidationEvidenceReuse({
      artifact: cloneArtifact(fixture.artifact, {
        trust_level: "untrusted",
        trust_reason_code: "pass_validation_policy_missing"
      }),
      bubbleId: "b_pass_validation_reuse_01",
      repoPath: fixture.repoPath,
      worktreePath: fixture.repoPath,
      requiredCommandSetId: "typecheck__test",
      requiredCommands: [
        { kind: "typecheck", command: "pnpm typecheck" },
        { kind: "test", command: "pnpm test" }
      ]
    })

    expect(result.reusable).toBe(false)
    expect(result.reason_code).toBe("pass_validation_evidence_mismatch")
    expect(result.detail).toContain("not trusted")
  })
})

describe("persistPassValidationRecoveryMarker", () => {
  it("persists repo and worktree markers when both parent paths already exist", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-persist-"))
    tempDirs.push(repoPath)
    await mkdir(join(repoPath, ".pairflow", "runtime"), { recursive: true })
    await mkdir(join(repoPath, ".pairflow"), { recursive: true })

    const result = await persistPassValidationRecoveryMarker({
      repoPath,
      bubbleId: "b_pass_validation_reuse_01",
      flow: "restart",
      worktreePath: repoPath
    })

    expect(result.warnings).toEqual([])
    await expect(
      stat(resolvePassValidationRecoveryRepoMarkerPath(repoPath, "b_pass_validation_reuse_01"))
    ).resolves.toBeTruthy()
    await expect(
      stat(resolvePassValidationRecoveryWorktreeMarkerPath(repoPath))
    ).resolves.toBeTruthy()
  })

  it("returns explicit repo and worktree warnings when marker parent directories are unavailable", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-persist-"))
    tempDirs.push(repoPath)

    const result = await persistPassValidationRecoveryMarker({
      repoPath,
      bubbleId: "b_pass_validation_reuse_01",
      flow: "reconcile",
      worktreePath: join(repoPath, "missing-worktree")
    })

    expect(result.persisted_targets).toEqual([])
    expect(result.warnings).toHaveLength(2)
    expect(result.warnings.map((warning) => warning.metadata.marker_scope).sort()).toEqual([
      "repo",
      "worktree"
    ])
  })
})
