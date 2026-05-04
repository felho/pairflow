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
  timeoutMs?: number;
  stopSignal?: AbortSignal | undefined;
  onArtifactFiles?: ((files: CodexRunnerArtifactFiles) => void | Promise<void>) | undefined;
}

export interface AgentRunnerCommandConfig {
  backend?: string | undefined;
  command?: string | undefined;
  args?: readonly string[] | undefined;
  cwd?: string | undefined;
  env?: Readonly<Record<string, string | undefined>> | undefined;
  timeoutMs?: number | undefined;
  inputMode?: AgentRunnerBridgeInputMode | undefined;
  codexRunnerFiles?: CodexRunnerArtifactFiles | undefined;
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

export interface CodexRunnerArtifactFiles {
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
  timeoutMs: number;
  envKeys: readonly string[];
}

export interface AgentRunnerProcessInvocation {
  command: string;
  args: readonly string[];
  cwd: string;
  env?: Readonly<Record<string, string | undefined>> | undefined;
  stdin?: string | undefined;
  timeoutMs: number;
  signal?: AbortSignal | undefined;
  stdoutFilePath?: string | undefined;
}

export interface AgentRunnerProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut?: boolean | undefined;
  aborted?: boolean | undefined;
  stdoutFileWriteError?: string | undefined;
}

export type RunAgentRunnerCommandPort = (
  invocation: AgentRunnerProcessInvocation
) => Promise<AgentRunnerProcessResult>;

export interface AgentRunnerBridgeDependencies {
  pathExists: (path: string) => Promise<boolean>;
  runCommand: RunAgentRunnerCommandPort;
  prepareCodexRunnerFiles?:
    | ((
        payload: AgentRunnerContinuationPayload,
        startedAt?: string
      ) => Promise<CodexRunnerArtifactFiles>)
    | undefined;
  now?: (() => Date) | undefined;
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
