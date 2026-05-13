export type AgentRunnerBridgeStatus =
  | "settled_checkpoint"
  | "human_checkpoint"
  | "blocked";

export type AgentRunnerBridgeFailureReasonCode =
  | "AGENT_RUNNER_CONFIG_MISSING"
  | "PLAN_PATH_UNAVAILABLE"
  | "PLAN_WATCH_RUNNER_CONFIG_MISSING"
  | "PLAN_WATCH_RUNNER_BACKEND_UNSUPPORTED"
  | "PLAN_WATCH_RUNNER_PAYLOAD_INVALID"
  | "PLAN_WATCH_RUNNER_WORKFLOW_UNSUPPORTED"
  | "PLAN_WATCH_RUNNER_FILE_IO_FAILED"
  | "PLAN_WATCH_PLAN_PATH_UNAVAILABLE"
  | "PLAN_WATCH_REPO_PATH_UNAVAILABLE"
  | "PLAN_WATCH_CODEX_UNAVAILABLE"
  | "AGENT_RUNNER_ABORTED"
  | "AGENT_RUNNER_SPAWN_FAILED"
  | "AGENT_RUNNER_TIMEOUT"
  | "AGENT_RUNNER_IDLE_TIMEOUT"
  | "AGENT_RUNNER_NON_ZERO_EXIT"
  | "AGENT_RUNNER_OUTPUT_INVALID";

export type AgentRunnerBridgeRunnerReasonCode = string & {
  readonly __agentRunnerBridgeRunnerReasonCode: unique symbol;
};

export type AgentRunnerBridgeReasonCode =
  | AgentRunnerBridgeFailureReasonCode
  | AgentRunnerBridgeRunnerReasonCode;

export function asAgentRunnerBridgeRunnerReasonCode(
  value: string
): AgentRunnerBridgeRunnerReasonCode {
  return value as AgentRunnerBridgeRunnerReasonCode;
}

export type AgentRunnerBridgeInputMode = "stdin_json" | "arg_json" | "none";

export interface AgentRunnerBridgeTriggerContext {
  source: string;
  reason?: string;
  observedAt?: string;
  refs?: readonly string[];
  metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredAgentRunnerOutput {
  status: AgentRunnerBridgeStatus;
  reasonCode: AgentRunnerBridgeReasonCode;
  summary?: string | undefined;
  changedArtifacts?: readonly string[] | undefined;
  routeLedgerSummary?: string | undefined;
}

export interface AgentRunnerBridgeInput {
  planPath: string;
  repoPath: string;
  invocationId: string;
  trigger: AgentRunnerBridgeTriggerContext;
  workflow?: string | undefined;
  now?: Date;
  idleTimeoutMs?: number;
  stopSignal?: AbortSignal | undefined;
  onArtifactFiles?: ((files: AgentRunnerArtifactFiles) => void | Promise<void>) | undefined;
}

export interface AgentRunnerCommandConfig {
  backend?: string | undefined;
  command?: string | undefined;
  args?: readonly string[] | undefined;
  cwd?: string | undefined;
  env?: Readonly<Record<string, string | undefined>> | undefined;
  idleTimeoutMs?: number | undefined;
  inputMode?: AgentRunnerBridgeInputMode | undefined;
  runnerArtifactFiles?: AgentRunnerArtifactFiles | undefined;
}

export interface RequiredAgentRunnerCommandConfig
  extends Omit<AgentRunnerCommandConfig, "command"> {
  command: string;
}

export interface AgentRunnerContinuationPayload {
  kind: string;
  workflow: string;
  invocation_id: string;
  plan_path: string;
  repo_path: string;
  triggered_at: string;
  trigger: AgentRunnerBridgeTriggerContext;
}

export interface AgentRunnerArtifactFiles {
  artifactDir: string;
  artifactDirRef: string;
  schemaFilePath: string;
  metadataFilePath: string;
  eventsFilePath: string;
  timelineFilePath: string;
}

export interface AgentRunnerCommandIdentity {
  command: string;
  args: readonly string[];
  cwd: string;
  inputMode: AgentRunnerBridgeInputMode;
  idleTimeoutMs: number;
  envKeys: readonly string[];
}

export interface AgentRunnerProcessInvocation {
  command: string;
  args: readonly string[];
  cwd: string;
  env?: Readonly<Record<string, string | undefined>> | undefined;
  stdin?: string | undefined;
  idleTimeoutMs: number;
  signal?: AbortSignal | undefined;
  stdoutFilePath?: string | undefined;
}

export interface AgentRunnerProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut?: boolean | undefined;
  timeoutKind?: "idle" | undefined;
  aborted?: boolean | undefined;
  stdoutFileWriteError?: string | undefined;
}

export type RunAgentRunnerCommandPort = (
  invocation: AgentRunnerProcessInvocation
) => Promise<AgentRunnerProcessResult>;

export interface AgentRunnerBridgeDependencies {
  pathExists: (path: string) => Promise<boolean>;
  runCommand: RunAgentRunnerCommandPort;
  builtInBackends?: readonly AgentRunnerBuiltInBackendAdapter[] | undefined;
  now?: (() => Date) | undefined;
}

export interface AgentRunnerBuiltInBackendPreconditionInput {
  input: AgentRunnerBridgeInput;
  config: AgentRunnerCommandConfig;
  payload: AgentRunnerContinuationPayload;
  pathExists: (path: string) => Promise<boolean>;
  startedAt: string;
}

export type AgentRunnerBuiltInBackendPreconditionResult =
  | { ok: true; config: RequiredAgentRunnerCommandConfig }
  | {
      ok: false;
      reasonCode: AgentRunnerBridgeFailureReasonCode;
      stderr?: string | undefined;
      payload?: AgentRunnerContinuationPayload | undefined;
    };

export interface AgentRunnerBuiltInBackendProcessResultInput {
  input: AgentRunnerBridgeInput;
  processResult: AgentRunnerProcessResult;
  startedAt: string;
  completedAt: string;
  command: AgentRunnerCommandIdentity;
  payload: AgentRunnerContinuationPayload;
  config: RequiredAgentRunnerCommandConfig;
}

export interface AgentRunnerBuiltInBackendSpawnErrorInput {
  error: unknown;
  config: RequiredAgentRunnerCommandConfig;
}

export interface AgentRunnerBuiltInBackendAdapter {
  backend: string;
  prepareInvocationConfig: (
    input: AgentRunnerBuiltInBackendPreconditionInput
  ) => Promise<AgentRunnerBuiltInBackendPreconditionResult>;
  classifyProcessResult: (
    input: AgentRunnerBuiltInBackendProcessResultInput
  ) => Promise<AgentRunnerBridgeResult>;
  classifySpawnErrorReasonCode?: (
    input: AgentRunnerBuiltInBackendSpawnErrorInput
  ) => AgentRunnerBridgeFailureReasonCode | undefined;
}

export interface AgentRunnerBridgeResult {
  status: AgentRunnerBridgeStatus;
  invocationId: string;
  startedAt: string;
  completedAt: string;
  reasonCode: AgentRunnerBridgeReasonCode;
  command: AgentRunnerCommandIdentity | null;
  /**
   * Process exit code is absent before spawn/precondition failures, null for
   * timeout/abort/signal-style exits, and numeric when a child process exits.
   */
  exitCode?: number | null | undefined;
  failureStage?:
    | "precondition"
    | "abort"
    | "spawn"
    | "timeout"
    | "exit"
    | "output"
    | undefined;
  stdout?: string | undefined;
  stderr?: string | undefined;
  runnerSummary?: string | undefined;
  changedArtifacts?: readonly string[] | undefined;
  routeLedgerSummary?: string | undefined;
  artifactDir?: string | undefined;
  codexSessionId?: string | undefined;
  payload?: AgentRunnerContinuationPayload | undefined;
}
