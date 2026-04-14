import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import { applyStateTransition } from "../../../src/v11/domain/state/machine.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import { startBubbleV11 } from "../../../src/v11/application/start/emitStartV11.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { buildWorktreeBootstrapResult } from "../../helpers/worktreeBootstrapResult.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

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
  | "clone_not_activated"
  | "clone_not_activated_resume"
  | "clone_state_not_startable"
  | "stale_session_reclaim";

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
      scenarioRaw !== "clone_not_activated" &&
      scenarioRaw !== "clone_not_activated_resume" &&
      scenarioRaw !== "clone_state_not_startable" &&
      scenarioRaw !== "stale_session_reclaim"
    ) {
      throw new Error(
        "start contract input.fixture.scenario must be one of: basic, state_not_startable, bootstrap_fails_cleanup, clone_not_activated, clone_not_activated_resume, clone_state_not_startable, stale_session_reclaim."
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
          : "unknown";
    throw new Error(
      `Failed to read state snapshot while handling start contract result for bubble ${input.bubbleId}. Original error: ${originalMessage}`,
      { cause: readError }
    );
  }
}

function assertCloneRejectInvariants(input: {
  scenario: StartContractExtendedScenario;
  claimCalls: number;
  launchCalls: number;
  resumeSummaryCalls: number;
}): void {
  if (
    input.scenario !== "clone_not_activated"
    && input.scenario !== "clone_not_activated_resume"
    && input.scenario !== "clone_state_not_startable"
  ) {
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

  if (
    input.scenario === "clone_not_activated_resume"
    && input.resumeSummaryCalls !== 0
  ) {
    throw new Error(
      "start contract clone_not_activated_resume scenario expected rejection before resume summary preparation."
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

  let nextState = loaded.state;
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

  await writeStateSnapshot(input.statePath, nextState, {
    expectedFingerprint: loaded.fingerprint,
    expectedState: loaded.state.state
  });
}

function normalizeStartResult(result: Awaited<ReturnType<typeof startBubbleV11>>): StartContractSuccessOutput {
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
  executor: typeof startBubbleV11;
}): Promise<StartContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-start-contract-"));
  try {
    await initGitRepository(repoPath);
    const parsedInput = parseStartCaseInput(input.caseDef.input);
    const bubble =
      parsedInput.scenario === "clone_not_activated_resume"
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

    if (parsedInput.scenario === "clone_not_activated_resume") {
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
      parsedInput.scenario === "clone_not_activated"
      || parsedInput.scenario === "clone_not_activated_resume"
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

    let claimCalls = 0;
    let launchCalls = 0;
    let resumeSummaryCalls = 0;
    let staleSessionRemoved = false;
    let cleanupSessionRemoved = false;

    try {
      const result = await input.executor(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-03-20T12:00:00.000Z")
        },
        {
          bootstrapWorktreeWorkspace: () =>
            parsedInput.scenario === "bootstrap_fails_cleanup"
              ? Promise.reject(new Error("BOOTSTRAP_FAIL_TEST"))
              : Promise.resolve(
                  buildWorktreeBootstrapResult({
                    repoPath,
                    bubbleBranch: bubble.config.bubble_branch,
                    worktreePath: bubble.paths.worktreePath
                  })
                ),
          launchBubbleTmuxSession: () => {
            launchCalls += 1;
            return Promise.resolve({
              sessionName: `pf-${bubble.bubbleId}`
            });
          },
          buildResumeTranscriptSummary: () => {
            resumeSummaryCalls += 1;
            return Promise.resolve("resume-summary: contract");
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
                tmuxSessionName: `pf-${bubble.bubbleId}`,
                updatedAt: "2026-03-20T12:00:00.000Z"
              }
            });
          },
          isTmuxSessionAlive: () =>
            Promise.resolve(parsedInput.scenario !== "stale_session_reclaim"),
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

      if (
        parsedInput.scenario === "clone_not_activated"
        || parsedInput.scenario === "clone_not_activated_resume"
        || parsedInput.scenario === "clone_state_not_startable"
      ) {
        throw new Error(
          `start contract ${parsedInput.scenario} scenario expected rejection, but start succeeded.`
        );
      }

      return normalizeStartResult(result);
    } catch (error) {
      if (parsedInput.scenario === "bootstrap_fails_cleanup") {
        if (!cleanupSessionRemoved) {
          throw new Error(
            "start contract bootstrap_fails_cleanup scenario expected runtime session cleanup."
          );
        }
      }
      assertCloneRejectInvariants({
        scenario: parsedInput.scenario,
        claimCalls,
        launchCalls,
        resumeSummaryCalls
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
    executor: startBubbleV11
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
