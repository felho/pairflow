import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import { applyStateTransition } from "../../../src/v11/domain/state/machine.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../src/v11/domain/state/snapshot/projection.js";
import { readStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { startBubble } from "../../../src/v11/application/start/startCommandApi.js";
import { runBubbleStartCommand } from "../../../src/cli/commands/bubble/start.js";
import { writeRemotePointer } from "../../../src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import type {
  ExecuteRemoteBubbleStartInput,
  StartBubbleDependencies
} from "../../../src/v11/application/start/startCommandContract.js";
import { RemoteBubbleStartError } from "../../../src/v11/infrastructure/executor/ssh/sshBubbleStart.js";
import { initGitRepository, runGit } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { buildWorktreeBootstrapResult } from "../../helpers/worktreeBootstrapResult.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";
import { writeStateSnapshotFixture as writeStateSnapshot } from "../../helpers/stateSnapshot.js";
export interface StartContractSuccessOutput {
  status: "ok";
  reasonCode: "STARTED";
  stateSubset: {
    state: string;
  };
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  tmuxSessionNamePrefix: boolean;
  hasWorktreePath: boolean;
}

export interface StartContractErrorOutput {
  status: "error";
  reasonCode: string | null;
  stateSubset: {
    state: string;
  };
}

export type StartContractOutput =
  | StartContractSuccessOutput
  | StartContractErrorOutput;

export interface StartContractRunResult {
  mode: ContractCase["mode"];
  v11?: StartContractOutput;
}

type StartContractScenario = "basic" | "state_not_startable";
type StartContractExtendedScenario =
  | StartContractScenario
  | "bootstrap_fails_cleanup"
  | "clone_activated"
  | "clone_activated_resume"
  | "clone_state_not_startable"
  | "launch_ack_failed"
  | "stale_session_reclaim"
  | "remote_created"
  | "remote_execution_failed"
  | "remote_confirmation_invalid"
  | "remote_reconciliation_failed"
  | "remote_sync_hook_warning"
  | "remote_preflight_missing_origin"
  | "remote_config_invalid"
  | "remote_attach_rejected"
  | "remote_control_files_unavailable";

type ResumableStartState =
  | "RUNNING"
  | "WAITING_HUMAN"
  | "READY_FOR_HUMAN_APPROVAL"
  | "APPROVED_FOR_COMMIT"
  | "COMMITTED";

interface ParsedStartCaseInput {
  scenario: StartContractExtendedScenario;
  resumeState: ResumableStartState;
}

const defaultResumeState: ResumableStartState = "RUNNING";
const resumableStartStates = [
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
] as const satisfies readonly ResumableStartState[];

function parseResumableStartState(
  value: unknown
): ResumableStartState {
  if (value === undefined) {
    return defaultResumeState;
  }
  if (
    value !== "RUNNING" &&
    value !== "WAITING_HUMAN" &&
    value !== "READY_FOR_HUMAN_APPROVAL" &&
    value !== "APPROVED_FOR_COMMIT" &&
    value !== "COMMITTED"
  ) {
    throw new Error(
      `start contract input.fixture.resumeState must be one of: ${resumableStartStates.join(", ")}.`
    );
  }
  return value;
}

function buildStartContractBubbleId(caseId: string): string {
  const suffix = createHash("sha1").update(caseId).digest("hex").slice(0, 12);
  return `b_contract_${suffix}`;
}

function parseStartCaseInput(input: ContractCase["input"]): ParsedStartCaseInput {
  const fixtureRaw = input.fixture;
  let scenario: StartContractExtendedScenario = "basic";
  let resumeState: ResumableStartState = defaultResumeState;
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("start contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "basic" &&
      scenarioRaw !== "state_not_startable" &&
      scenarioRaw !== "bootstrap_fails_cleanup" &&
      scenarioRaw !== "clone_activated" &&
      scenarioRaw !== "clone_activated_resume" &&
      scenarioRaw !== "clone_state_not_startable" &&
      scenarioRaw !== "launch_ack_failed" &&
      scenarioRaw !== "stale_session_reclaim" &&
      scenarioRaw !== "remote_created" &&
      scenarioRaw !== "remote_execution_failed" &&
      scenarioRaw !== "remote_confirmation_invalid" &&
      scenarioRaw !== "remote_reconciliation_failed" &&
      scenarioRaw !== "remote_sync_hook_warning" &&
      scenarioRaw !== "remote_preflight_missing_origin" &&
      scenarioRaw !== "remote_config_invalid" &&
      scenarioRaw !== "remote_attach_rejected" &&
      scenarioRaw !== "remote_control_files_unavailable"
    ) {
      throw new Error(
        "start contract input.fixture.scenario must be one of: basic, state_not_startable, bootstrap_fails_cleanup, clone_activated, clone_activated_resume, clone_state_not_startable, launch_ack_failed, stale_session_reclaim, remote_created, remote_execution_failed, remote_confirmation_invalid, remote_reconciliation_failed, remote_sync_hook_warning, remote_preflight_missing_origin, remote_config_invalid, remote_attach_rejected, remote_control_files_unavailable."
      );
    }
    scenario = scenarioRaw ?? "basic";
    resumeState = parseResumableStartState(
      (fixtureRaw as Record<string, unknown>).resumeState
    );
  }

  return {
    scenario,
    resumeState
  };
}

async function readStateSubsetOrThrow(input: {
  bubbleId: string;
  statePath: string;
  originalError?: unknown;
}): Promise<string> {
  try {
    const snapshot = await readStateSnapshot(input.statePath);
    return snapshot.state.state;
  } catch (readError) {
    const originalMessage =
      input.originalError instanceof Error
        ? input.originalError.message
        : typeof input.originalError === "string"
          ? input.originalError
          : input.originalError === undefined
            ? "unknown"
            : "non-error thrown";
    throw new Error(
      `Failed to read state snapshot while handling start contract result for bubble ${input.bubbleId}. Original error: ${originalMessage}`,
      { cause: readError }
    );
  }
}

function assertCloneRejectInvariants(input: {
  scenario: StartContractExtendedScenario;
  bootstrapCalls: number;
  claimCalls: number;
  launchCalls: number;
  resumeSummaryCalls: number;
}): void {
  if (input.scenario !== "clone_state_not_startable") {
    return;
  }

  if (input.claimCalls !== 0) {
    throw new Error(
      `start contract ${input.scenario} scenario expected rejection before runtime-session ownership claim.`
    );
  }

  if (input.launchCalls !== 0) {
    throw new Error(
      `start contract ${input.scenario} scenario expected rejection before tmux launch.`
    );
  }

  if (input.resumeSummaryCalls !== 0) {
    throw new Error(
      "start contract clone_state_not_startable scenario expected rejection before resume summary preparation."
    );
  }

  if (input.bootstrapCalls !== 0) {
    throw new Error(
      "start contract clone_state_not_startable scenario expected rejection before workspace bootstrap."
    );
  }
}

function assertCloneActivationInvariants(input: {
  scenario: StartContractExtendedScenario;
  bootstrapCalls: number;
  bootstrapRequestedWorkspaceKind: string | undefined;
  claimCalls: number;
  launchCalls: number;
  upsertCalls: number;
  upsertWorkspaceKind: string | undefined;
  resumeSummaryCalls: number;
}): void {
  if (input.scenario === "clone_activated") {
    if (
      input.bootstrapCalls !== 1
      || input.claimCalls !== 1
      || input.launchCalls !== 1
      || input.upsertCalls !== 1
    ) {
      throw new Error(
        "start contract clone_activated scenario expected clone fresh-start through the shared bootstrapWorktreeWorkspace seam with exactly one bootstrap/claim/upsert/launch."
      );
    }
    if (input.bootstrapRequestedWorkspaceKind !== "clone") {
      throw new Error(
        "start contract clone_activated scenario expected bootstrapWorktreeWorkspace request with workspaceKind=clone."
      );
    }
    if (input.upsertWorkspaceKind !== "clone") {
      throw new Error(
        "start contract clone_activated scenario expected runtime session persist with workspaceKind=clone."
      );
    }
    if (input.resumeSummaryCalls !== 0) {
      throw new Error(
        "start contract clone_activated scenario expected no resume summary preparation."
      );
    }
  }

  if (input.scenario === "clone_activated_resume") {
    if (
      input.bootstrapCalls !== 0
      || input.claimCalls !== 2
      || input.launchCalls !== 1
      || input.upsertCalls !== 0
    ) {
      throw new Error(
        "start contract clone_activated_resume scenario expected resume without bootstrap/upsert, with stale-session reclaim and exactly one launch."
      );
    }
    if (input.resumeSummaryCalls !== 1) {
      throw new Error(
        "start contract clone_activated_resume scenario expected exactly one resume summary preparation."
      );
    }
  }
}

function assertLaunchOverrideFailureInvariants(input: {
  scenario: StartContractExtendedScenario;
  bootstrapCalls: number;
  claimCalls: number;
  launchCalls: number;
}): void {
  if (
    input.scenario !== "launch_ack_failed"
  ) {
    return;
  }

  if (input.bootstrapCalls !== 1 || input.claimCalls !== 1 || input.launchCalls !== 1) {
    throw new Error(
      `start contract ${input.scenario} scenario expected exactly one bootstrap, one claim, and one launch attempt before fail-closed rejection.`
    );
  }
}

async function setResumeFixtureState(input: {
  statePath: string;
  targetState: ResumableStartState;
}): Promise<void> {
  if (input.targetState === "RUNNING") {
    return;
  }

  const loaded = await readStateSnapshot(input.statePath);
  const lastCommandAt = "2026-03-20T12:00:00.000Z";

  let nextState = buildBubbleStateSnapshotVariant(loaded.state);
  if (input.targetState === "WAITING_HUMAN") {
    nextState = applyStateTransition(nextState, {
      to: "WAITING_HUMAN",
      lastCommandAt
    });
  } else {
    const approvalReady = applyStateTransition(nextState, {
      to: "READY_FOR_HUMAN_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt
    });

    if (input.targetState === "READY_FOR_HUMAN_APPROVAL") {
      nextState = approvalReady;
    } else {
      const approvedForCommit = applyStateTransition(approvalReady, {
        to: "APPROVED_FOR_COMMIT",
        lastCommandAt
      });

      nextState =
        input.targetState === "APPROVED_FOR_COMMIT"
          ? approvedForCommit
          : applyStateTransition(approvedForCommit, {
              to: "COMMITTED",
              lastCommandAt
            });
    }
  }

  await writeStateSnapshot(input.statePath, toPersistedSnapshot(nextState), {
    expectedFingerprint: loaded.fingerprint,
    expectedState: loaded.state.state
  });
}

async function configureRemoteBubbleFixture(input: {
  repoPath: string;
  bubble: Awaited<ReturnType<typeof createBubble>>;
  withOrigin: boolean;
}): Promise<string | undefined> {
  let remotePath: string | undefined;
  if (input.withOrigin) {
    remotePath = await mkdtemp(join(tmpdir(), "pairflow-start-contract-origin-"));
    await runGit(remotePath, ["init", "--bare"]);
    await runGit(input.repoPath, ["remote", "add", "origin", remotePath]);
  }

  await writeFile(
    input.bubble.paths.bubbleTomlPath,
    renderBubbleConfigToml({
      ...input.bubble.config,
      executor: {
        type: "ssh",
        remote: "homelab"
      }
    }),
    "utf8"
  );
  await writeRemotePointer(input.bubble.paths.remotePointerPath, {
    kind: "created",
    host: "homelab"
  });
  return remotePath;
}

function normalizeStartResult(result: Awaited<ReturnType<typeof startBubble>>): StartContractSuccessOutput {
  return {
    status: "ok",
    reasonCode: "STARTED",
    stateSubset: {
      state: result.state.state
    },
    round: result.state.round,
    activeAgent: result.state.active_agent,
    activeRole: result.state.active_role,
    tmuxSessionNamePrefix: result.tmuxSessionName.startsWith("pf-"),
    hasWorktreePath: result.worktreePath.length > 0
  };
}

function normalizeStartErrorResult(input: {
  error: unknown;
  state: string;
}): StartContractErrorOutput {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const reasonMatch = /^([A-Z0-9_]+):/u.exec(message.trim());

  let reasonCode =
    (
      typeof input.error === "object" &&
      input.error !== null &&
      "reasonCode" in input.error &&
      typeof (input.error as { reasonCode?: unknown }).reasonCode === "string"
    )
      ? (input.error as { reasonCode: string }).reasonCode
      : reasonMatch?.[1] ?? null;
  if (
    reasonCode === null &&
    message.includes("bubble start requires state CREATED or resumable runtime state")
  ) {
    reasonCode = "START_STATE_NOT_STARTABLE";
  }
  if (
    reasonCode === null &&
    message.includes("BOOTSTRAP_FAIL_TEST")
  ) {
    reasonCode = "START_BOOTSTRAP_FAILED";
  }

  return {
    status: "error",
    reasonCode,
    stateSubset: {
      state: input.state
    }
  };
}

function assertContractExpectedSubset(input: {
  output: StartContractOutput;
  expected: ContractCaseExpected;
  label: string;
}): void {
  if (input.output.status !== input.expected.status) {
    throw new Error(
      `${input.label}: status mismatch (expected=${input.expected.status}, actual=${input.output.status})`
    );
  }
  if (
    input.expected.reasonCode !== undefined &&
    input.output.reasonCode !== input.expected.reasonCode
  ) {
    throw new Error(
      `${input.label}: reasonCode mismatch (expected=${input.expected.reasonCode}, actual=${input.output.reasonCode})`
    );
  }
  const expectedState = input.expected.stateSubset?.state;
  if (
    typeof expectedState === "string" &&
    input.output.stateSubset.state !== expectedState
  ) {
    throw new Error(
      `${input.label}: stateSubset.state mismatch (expected=${expectedState}, actual=${input.output.stateSubset.state})`
    );
  }
}

async function executeStartCase(input: {
  caseDef: ContractCase;
  executor: typeof startBubble;
}): Promise<StartContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-start-contract-"));
  const cleanupPaths: string[] = [];
  try {
    await initGitRepository(repoPath);
    const parsedInput = parseStartCaseInput(input.caseDef.input);
    const bubble =
      parsedInput.scenario === "clone_activated_resume"
        ? await setupRunningBubbleFixture({
            repoPath,
            bubbleId: buildStartContractBubbleId(input.caseDef.id),
            task: input.caseDef.description
          })
        : await createBubble({
            id: buildStartContractBubbleId(input.caseDef.id),
            repoPath,
            baseBranch: "main",
            reviewArtifactType: "code",
            task: input.caseDef.description,
            cwd: repoPath
          });

    if (parsedInput.scenario === "clone_activated_resume") {
      await setResumeFixtureState({
        statePath: bubble.paths.statePath,
        targetState: parsedInput.resumeState
      });
    }

    if (
      parsedInput.scenario === "state_not_startable"
      || parsedInput.scenario === "clone_state_not_startable"
    ) {
      const loaded = await readStateSnapshot(bubble.paths.statePath);
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...loaded.state,
          state: "FAILED",
          active_agent: null,
          active_role: null,
          active_since: null,
          last_command_at: "2026-03-20T12:00:00.000Z"
        },
        {
          expectedFingerprint: loaded.fingerprint,
          expectedState: "CREATED"
        }
      );
    }

    if (
      parsedInput.scenario === "clone_activated"
      || parsedInput.scenario === "clone_activated_resume"
      || parsedInput.scenario === "clone_state_not_startable"
    ) {
      await writeFile(
        bubble.paths.bubbleTomlPath,
        renderBubbleConfigToml({
          ...bubble.config,
          work_mode: "clone"
        }),
        "utf8"
      );
    }

    if (
      parsedInput.scenario === "remote_created"
      || parsedInput.scenario === "remote_execution_failed"
      || parsedInput.scenario === "remote_confirmation_invalid"
      || parsedInput.scenario === "remote_reconciliation_failed"
      || parsedInput.scenario === "remote_sync_hook_warning"
      || parsedInput.scenario === "remote_preflight_missing_origin"
      || parsedInput.scenario === "remote_config_invalid"
      || parsedInput.scenario === "remote_attach_rejected"
      || parsedInput.scenario === "remote_control_files_unavailable"
    ) {
      const remoteOriginPath = await configureRemoteBubbleFixture({
        repoPath,
        bubble,
        withOrigin:
          parsedInput.scenario !== "remote_preflight_missing_origin"
      });
      if (remoteOriginPath !== undefined) {
        cleanupPaths.push(remoteOriginPath);
      }
    }

    if (parsedInput.scenario === "remote_control_files_unavailable") {
      await rm(bubble.paths.taskArtifactPath, { force: true });
    }

    let claimCalls = 0;
    let bootstrapCalls = 0;
    let bootstrapRequestedWorkspaceKind: string | undefined;
    let launchCalls = 0;
    let upsertCalls = 0;
    let upsertWorkspaceKind: string | undefined;
    let resumeSummaryCalls = 0;
    let staleSessionRemoved = false;
    let cleanupSessionRemoved = false;
    let remoteExecutionCalls = 0;
    let remoteAttachStartCalls = 0;
    let remoteAttachRegistryCalls = 0;

    try {
      const remoteWarnings: string[] = [];
      const startDependencies: Pick<
        StartBubbleDependencies,
        | "loadPairflowGlobalConfig"
        | "executeRemoteBubbleStart"
        | "writeStateSnapshot"
        | "resolveCodexMcpDisableArgs"
        | "reportWarning"
      > = {
        loadPairflowGlobalConfig: () => Promise.resolve({
          remotes:
            parsedInput.scenario === "remote_config_invalid"
              ? {
                  other: {
                    host: "other",
                    repo_base: "~/repos"
                  }
                }
              : {
                  homelab: {
                    host: "homelab",
                    repo_base: "~/repos",
                    ...(parsedInput.scenario === "remote_sync_hook_warning"
                      ? { pairflow_sync_command: "false" }
                      : {})
                  }
                }
        }),
        executeRemoteBubbleStart: (remoteInput: ExecuteRemoteBubbleStartInput) => {
          remoteExecutionCalls += 1;
          if (parsedInput.scenario === "remote_execution_failed") {
            return Promise.reject(new Error("contract remote execution failure"));
          }
          if (parsedInput.scenario === "remote_confirmation_invalid") {
            return Promise.reject(
              new RemoteBubbleStartError({
                code: "REMOTE_CONFIRMATION_INVALID",
                message:
                  `Remote start confirmation for bubble ${bubble.bubbleId} expected RUNNING but received FAILED.`,
                details: {
                  receivedState: "FAILED",
                  receivedRound: 1
                }
              })
            );
          }

          return Promise.resolve({
            remoteClonePath: remoteInput.remoteClonePath,
            tmuxSessionName: `pf-${bubble.bubbleId}`,
            startedAt: "2026-03-20T12:00:00.000Z",
            instanceId: "inst_contract_remote_01",
            remoteState: {
              lastCheckedAt: "2026-03-20T12:00:01.000Z",
              state: "RUNNING" as const,
              round: 1,
              maxRounds: bubble.config.max_rounds
            },
            ...(parsedInput.scenario === "remote_sync_hook_warning"
              ? {
                  warnings: [
                    "Pairflow warning: remote sync hook failed but start will continue"
                  ]
                }
              : {})
          });
        },
        writeStateSnapshot: async (...args) => {
          const [statePath, state, options] = args;
          if (
            parsedInput.scenario === "remote_reconciliation_failed"
            && state.state === "RUNNING"
          ) {
            throw new Error("contract remote reconciliation failure");
          }
          return writeStateSnapshot(statePath, state, options);
        },
        reportWarning: (message: string) => {
          remoteWarnings.push(message);
        },
        resolveCodexMcpDisableArgs: () => Promise.resolve([])
      };

      const result =
        parsedInput.scenario === "remote_attach_rejected"
          ? await runBubbleStartCommand(
              [
                "--id",
                bubble.bubbleId,
                "--repo",
                repoPath,
                "--attach"
              ],
              repoPath,
              {
                resolveBubbleById: () => Promise.resolve({
                  bubbleId: bubble.bubbleId,
                  repoPath,
                  bubbleConfig: {
                    ...bubble.config,
                    executor: {
                      type: "ssh" as const,
                      remote: "homelab"
                    }
                  },
                  bubblePaths: bubble.paths
                }),
                registerRepoInRegistry: () => {
                  remoteAttachRegistryCalls += 1;
                  return Promise.resolve({
                    added: false,
                    entry: {
                      repoPath,
                      addedAt: "2026-03-20T12:00:00.000Z"
                    },
                    registryPath: `${repoPath}/.pairflow/repos.json`
                  });
                },
                startBubble: async () => {
                  remoteAttachStartCalls += 1;
                  return input.executor({
                    bubbleId: bubble.bubbleId,
                    cwd: repoPath,
                    now: new Date("2026-03-20T12:00:00.000Z")
                  });
                }
              }
            ).then(() => {
              throw new Error(
                "start contract remote_attach_rejected scenario expected CLI rejection."
              );
            })
          : await input.executor(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-03-20T12:00:00.000Z")
        },
        {
          ...startDependencies,
          bootstrapWorktreeWorkspace: (bootstrapInput) => {
            bootstrapCalls += 1;
            bootstrapRequestedWorkspaceKind = bootstrapInput.workspaceKind;
            if (parsedInput.scenario === "bootstrap_fails_cleanup") {
              return Promise.reject(new Error("BOOTSTRAP_FAIL_TEST"));
            }
            if (parsedInput.scenario === "clone_activated") {
              return Promise.resolve({
                repoPath,
                baseRef: "refs/heads/main",
                bubbleBranch: bubble.config.bubble_branch,
                worktreePath: bubble.paths.worktreePath,
                workspacePath: bubble.paths.worktreePath,
                workspaceKind: "clone" as const,
                branchPrepared: true
              });
            }
            return Promise.resolve(
              buildWorktreeBootstrapResult({
                repoPath,
                bubbleBranch: bubble.config.bubble_branch,
                worktreePath: bubble.paths.worktreePath
              })
            );
          },
          ...(parsedInput.scenario === "launch_ack_failed"
            ? {
                launchBubbleSessionAck: () => {
                  launchCalls += 1;
                  return Promise.resolve({
                    status: "failed_to_start" as const,
                    reason_code: "LAUNCH_ACK_COMMAND_FAILED" as const,
                    failure_kind: "command_failed" as const,
                    error_message: "contract launch ack rejected",
                    sessionName: `pf-${bubble.bubbleId}`
                  });
                }
              }
            : {
                launchBubbleSessionAck: () => {
                  launchCalls += 1;
                  return Promise.resolve({
                    status: "running" as const,
                    sessionName: `pf-${bubble.bubbleId}`
                  });
                }
              }),
          buildResumeTranscriptSummary: () => {
            resumeSummaryCalls += 1;
            return Promise.resolve("resume-summary: contract");
          },
          readRuntimeSessionsRegistry: () => {
            if (parsedInput.scenario === "clone_activated_resume") {
              return Promise.resolve({
                [bubble.bubbleId]: {
                  bubbleId: bubble.bubbleId,
                  repoPath,
                  worktreePath: bubble.paths.worktreePath,
                  workspacePath: `${bubble.paths.worktreePath}/../clone-authority-contract`,
                  workspaceKind: "clone" as const,
                  tmuxSessionName: `pf-${bubble.bubbleId}`,
                  updatedAt: "2026-03-20T12:00:00.000Z"
                }
              });
            }
            return Promise.resolve({});
          },
          claimRuntimeSession: () => {
            claimCalls += 1;
            if (parsedInput.scenario === "stale_session_reclaim" && claimCalls === 1) {
              return Promise.resolve({
                claimed: false,
                record: {
                  bubbleId: bubble.bubbleId,
                  repoPath,
                  worktreePath: bubble.paths.worktreePath,
                  workspacePath: bubble.paths.worktreePath,
                  workspaceKind: "worktree" as const,
                  tmuxSessionName: `pf-${bubble.bubbleId}`,
                  updatedAt: "2026-03-20T12:00:00.000Z"
                }
              });
            }
            if (parsedInput.scenario === "clone_activated_resume" && claimCalls === 1) {
              return Promise.resolve({
                claimed: false,
                record: {
                  bubbleId: bubble.bubbleId,
                  repoPath,
                  worktreePath: bubble.paths.worktreePath,
                  workspacePath: `${bubble.paths.worktreePath}/../clone-authority-contract`,
                  workspaceKind: "clone" as const,
                  tmuxSessionName: `pf-${bubble.bubbleId}`,
                  updatedAt: "2026-03-20T12:00:00.000Z"
                }
              });
            }
            return Promise.resolve({
              claimed: true,
              record: {
                bubbleId: bubble.bubbleId,
                repoPath,
                worktreePath: bubble.paths.worktreePath,
                ...(
                  parsedInput.scenario === "clone_activated_resume"
                    ? {
                        workspacePath: `${bubble.paths.worktreePath}/../clone-authority-contract`,
                        workspaceKind: "clone" as const
                      }
                    : parsedInput.scenario === "stale_session_reclaim"
                      ? {
                          workspacePath: bubble.paths.worktreePath,
                          workspaceKind: "worktree" as const
                        }
                    : {}
                ),
                tmuxSessionName: `pf-${bubble.bubbleId}`,
                updatedAt: "2026-03-20T12:00:00.000Z"
              }
            });
          },
          upsertRuntimeSession: (input) => {
            upsertCalls += 1;
            upsertWorkspaceKind = input.workspaceKind;
            return Promise.resolve({
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              ...(input.workspacePath !== undefined
                ? { workspacePath: input.workspacePath }
                : {}),
              ...(input.workspaceKind !== undefined
                ? { workspaceKind: input.workspaceKind }
                : {}),
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-03-20T12:00:00.000Z"
            });
          },
          isTmuxSessionAlive: () =>
            Promise.resolve(
              parsedInput.scenario !== "stale_session_reclaim"
              && parsedInput.scenario !== "clone_activated_resume"
            ),
          removeRuntimeSession: () => {
            if (parsedInput.scenario === "stale_session_reclaim" && claimCalls === 1) {
              staleSessionRemoved = true;
            } else {
              cleanupSessionRemoved = true;
            }
            return Promise.resolve(true);
          }
        }
      );

      if (parsedInput.scenario === "stale_session_reclaim") {
        if (claimCalls < 2 || !staleSessionRemoved) {
          throw new Error(
            "start contract stale_session_reclaim scenario expected claim retry and stale session removal."
          );
        }
      }

      if (parsedInput.scenario === "remote_sync_hook_warning") {
        if (remoteWarnings.length !== 1) {
          throw new Error(
            "start contract remote_sync_hook_warning scenario expected exactly one warning."
          );
        }
      }
      if (
        parsedInput.scenario === "remote_control_files_unavailable"
        && remoteExecutionCalls !== 0
      ) {
        throw new Error(
          "start contract remote_control_files_unavailable scenario expected failure before remote execution."
        );
      }

      if (parsedInput.scenario === "clone_state_not_startable") {
        throw new Error(
          "start contract clone_state_not_startable scenario expected rejection, but start succeeded."
        );
      }

      assertCloneActivationInvariants({
        scenario: parsedInput.scenario,
        bootstrapCalls,
        bootstrapRequestedWorkspaceKind,
        claimCalls,
        launchCalls,
        upsertCalls,
        upsertWorkspaceKind,
        resumeSummaryCalls
      });

      return normalizeStartResult(result);
    } catch (error) {
      if (parsedInput.scenario === "bootstrap_fails_cleanup") {
        if (!cleanupSessionRemoved) {
          throw new Error(
            "start contract bootstrap_fails_cleanup scenario expected runtime session cleanup."
          );
        }
      }
      if (
        parsedInput.scenario === "remote_control_files_unavailable"
        && remoteExecutionCalls !== 0
      ) {
        throw new Error(
          "start contract remote_control_files_unavailable scenario expected no remote execution side effects."
        );
      }
      if (parsedInput.scenario === "remote_control_files_unavailable") {
        const errorContext =
          typeof error === "object"
          && error !== null
          && "context" in error
          && typeof (error as { context?: unknown }).context === "object"
          && (error as { context?: unknown }).context !== null
            ? (error as {
                context: Record<string, unknown>;
              }).context
            : null;
        if (
          errorContext?.artifact_relative_path
          !== `.pairflow/bubbles/${bubble.bubbleId}/artifacts/task.md`
          || errorContext.artifact_requirement !== "required"
          || errorContext.artifact_kind !== "task"
        ) {
          throw new Error(
            "start contract remote_control_files_unavailable scenario expected structured task artifact failure context."
          );
        }
      }
      if (parsedInput.scenario === "remote_attach_rejected") {
        if (remoteAttachStartCalls !== 0 || remoteAttachRegistryCalls !== 0) {
          throw new Error(
            "start contract remote_attach_rejected scenario expected CLI rejection before start execution and registry registration."
          );
        }
      }
      assertCloneRejectInvariants({
        scenario: parsedInput.scenario,
        bootstrapCalls,
        claimCalls,
        launchCalls,
        resumeSummaryCalls
      });
      assertLaunchOverrideFailureInvariants({
        scenario: parsedInput.scenario,
        bootstrapCalls,
        claimCalls,
        launchCalls
      });
      return normalizeStartErrorResult({
        error,
        state: await readStateSubsetOrThrow({
          bubbleId: bubble.bubbleId,
          statePath: bubble.paths.statePath,
          originalError: error
        })
      });
    }
  } finally {
    await Promise.all(cleanupPaths.map((path) => rm(path, {
      recursive: true,
      force: true
    })));
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runStartContractCase(
  caseDef: ContractCase
): Promise<StartContractRunResult> {
  if (caseDef.command !== "start") {
    throw new Error(`Unsupported command for start contract runner: ${caseDef.command}`);
  }

  if (caseDef.mode !== "v11") {
    throw new Error(
      `start contract runner only supports v11 cases; received mode=${caseDef.mode}`
    );
  }

  const v11 = await executeStartCase({
    caseDef,
    executor: startBubble
  });
  assertContractExpectedSubset({
    output: v11,
    expected: caseDef.expected,
    label: "v11"
  });
  return {
    mode: caseDef.mode,
    v11
  };
}
