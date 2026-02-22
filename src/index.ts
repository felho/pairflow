export const projectName = "pairflow";

export function healthcheck(): string {
  return `${projectName}:ok`;
}

export {
  asAskHumanCommandError,
  emitAskHumanFromWorkspace,
  AskHumanCommandError
} from "./core/agent/askHuman.js";
export {
  asConvergedCommandError,
  emitConvergedFromWorkspace,
  ConvergedCommandError
} from "./core/agent/converged.js";
export {
  asPassCommandError,
  emitPassFromWorkspace,
  inferPassIntent,
  PassCommandError
} from "./core/agent/pass.js";
export {
  BubbleLookupError,
  resolveBubbleById
} from "./core/bubble/bubbleLookup.js";
export {
  asBubbleInboxError,
  BubbleInboxError,
  getBubbleInbox
} from "./core/bubble/inboxBubble.js";
export {
  asBubbleCommitError,
  BubbleCommitError,
  commitBubble
} from "./core/bubble/commitBubble.js";
export {
  asOpenBubbleError,
  executeOpenCommand,
  openBubble,
  OpenBubbleError
} from "./core/bubble/openBubble.js";
export {
  asResumeBubbleError,
  DEFAULT_RESUME_MESSAGE,
  ResumeBubbleError,
  resumeBubble
} from "./core/bubble/resumeBubble.js";
export {
  BubbleCreateError,
  createBubble
} from "./core/bubble/createBubble.js";
export {
  asStartBubbleError,
  StartBubbleError,
  startBubble
} from "./core/bubble/startBubble.js";
export {
  asBubbleListError,
  BubbleListError,
  listBubbles
} from "./core/bubble/listBubbles.js";
export {
  asStartupReconcilerError,
  reconcileRuntimeSessions,
  StartupReconcilerError
} from "./core/runtime/startupReconciler.js";
export {
  asStopBubbleError,
  StopBubbleError,
  stopBubble
} from "./core/bubble/stopBubble.js";
export {
  asBubbleStatusError,
  BubbleStatusError,
  getBubbleStatus
} from "./core/bubble/statusBubble.js";
export {
  resolveBubbleFromWorkspaceCwd,
  WorkspaceResolutionError
} from "./core/bubble/workspaceResolution.js";
export { getBubblePaths } from "./core/bubble/paths.js";
export { createInitialBubbleState } from "./core/state/initialState.js";
export { runCli } from "./cli/index.js";
export {
  DEFAULT_COMMIT_REQUIRES_APPROVAL,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_QUALITY_MODE,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "./config/defaults.js";
export {
  asApprovalCommandError,
  ApprovalCommandError,
  emitApprovalDecision,
  emitApprove,
  emitRequestRework
} from "./core/human/approval.js";
export {
  asHumanReplyCommandError,
  emitHumanReply,
  HumanReplyCommandError
} from "./core/human/reply.js";
export {
  getAskHumanHelpText,
  parseAskHumanCommandOptions,
  runAskHumanCommand
} from "./cli/commands/agent/askHuman.js";
export {
  getConvergedHelpText,
  parseConvergedCommandOptions,
  runConvergedCommand
} from "./cli/commands/agent/converged.js";
export {
  getBubbleApproveHelpText,
  parseBubbleApproveCommandOptions,
  runBubbleApproveCommand
} from "./cli/commands/bubble/approve.js";
export {
  getBubbleCommitHelpText,
  parseBubbleCommitCommandOptions,
  runBubbleCommitCommand
} from "./cli/commands/bubble/commit.js";
export {
  getBubbleInboxHelpText,
  parseBubbleInboxCommandOptions,
  renderBubbleInboxText,
  runBubbleInboxCommand
} from "./cli/commands/bubble/inbox.js";
export {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions,
  runBubbleCreateCommand
} from "./cli/commands/bubble/create.js";
export {
  getBubbleOpenHelpText,
  parseBubbleOpenCommandOptions,
  runBubbleOpenCommand
} from "./cli/commands/bubble/open.js";
export {
  getBubbleResumeHelpText,
  parseBubbleResumeCommandOptions,
  runBubbleResumeCommand
} from "./cli/commands/bubble/resume.js";
export {
  getBubbleReplyHelpText,
  parseBubbleReplyCommandOptions,
  runBubbleReplyCommand
} from "./cli/commands/bubble/reply.js";
export {
  getBubbleStartHelpText,
  parseBubbleStartCommandOptions,
  runBubbleStartCommand
} from "./cli/commands/bubble/start.js";
export {
  getBubbleListHelpText,
  parseBubbleListCommandOptions,
  renderBubbleListText,
  runBubbleListCommand
} from "./cli/commands/bubble/list.js";
export {
  getBubbleReconcileHelpText,
  parseBubbleReconcileCommandOptions,
  renderBubbleReconcileText,
  runBubbleReconcileCommand
} from "./cli/commands/bubble/reconcile.js";
export {
  getBubbleStopHelpText,
  parseBubbleStopCommandOptions,
  runBubbleStopCommand
} from "./cli/commands/bubble/stop.js";
export {
  getBubbleStatusHelpText,
  parseBubbleStatusCommandOptions,
  renderBubbleStatusText,
  runBubbleStatusCommand
} from "./cli/commands/bubble/status.js";
export {
  getBubbleRequestReworkHelpText,
  parseBubbleRequestReworkCommandOptions,
  runBubbleRequestReworkCommand
} from "./cli/commands/bubble/requestRework.js";
export {
  getPassHelpText,
  parsePassCommandOptions,
  runPassCommand
} from "./cli/commands/agent/pass.js";
export {
  TOML_PARSER_LIMITATIONS,
  renderBubbleConfigToml,
  assertValidBubbleConfig,
  parseBubbleConfigToml,
  parseToml,
  parseWatchdogTimeoutMinutes,
  validateBubbleConfig
} from "./config/bubbleConfig.js";
export {
  SchemaValidationError,
  assertValidation,
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  validationFail,
  validationOk
} from "./core/validation.js";
export {
  assertValidBubbleStateSnapshot,
  validateBubbleStateSnapshot
} from "./core/state/stateSchema.js";
export {
  StateStoreConflictError,
  createStateSnapshot,
  readStateSnapshot,
  writeStateSnapshot
} from "./core/state/stateStore.js";
export { applyStateTransition } from "./core/state/machine.js";
export {
  assertTransitionAllowed,
  canTransition,
  getAllowedTransitions,
  isActiveState,
  isFinalState
} from "./core/state/transitions.js";
export {
  GitCommandError,
  WorkspaceCleanupError,
  WorkspaceBootstrapError,
  WorkspaceError,
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace
} from "./core/workspace/worktreeManager.js";
export {
  allocateNextProtocolSequence,
  formatProtocolEnvelopeId,
  TranscriptSequenceError
} from "./core/protocol/sequenceAllocator.js";
export {
  appendProtocolEnvelopes,
  appendProtocolEnvelope,
  ProtocolTranscriptError,
  ProtocolTranscriptLockError,
  ProtocolTranscriptValidationError,
  readTranscriptEnvelopesOrThrow,
  readTranscriptEnvelopes
} from "./core/protocol/transcriptStore.js";
export {
  validateConvergencePolicy
} from "./core/convergence/policy.js";
export {
  buildBubbleTmuxSessionName,
  launchBubbleTmuxSession,
  runTmux,
  terminateBubbleTmuxSession,
  TmuxCommandError,
  TmuxSessionExistsError
} from "./core/runtime/tmuxManager.js";
export {
  readRuntimeSessionsRegistry,
  removeRuntimeSession,
  removeRuntimeSessions,
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError,
  upsertRuntimeSession
} from "./core/runtime/sessionsRegistry.js";
export {
  computeWatchdogStatus
} from "./core/runtime/watchdog.js";
export {
  assertValidProtocolEnvelope,
  validateProtocolEnvelope
} from "./core/protocol/validators.js";
export { parseEnvelopeLine, serializeEnvelopeLine } from "./core/protocol/envelope.js";
export {
  agentNames,
  agentRoles,
  bubbleLifecycleStates,
  isAgentName,
  isAgentRole,
  isBubbleLifecycleState,
  isQualityMode,
  isWorkMode,
  qualityModes,
  workModes
} from "./types/bubble.js";
export { findingSeverities, isFindingSeverity } from "./types/findings.js";
export {
  approvalDecisions,
  isApprovalDecision,
  isPassIntent,
  isProtocolMessageType,
  isProtocolParticipant,
  passIntents,
  protocolMessageTypes,
  protocolParticipants
} from "./types/protocol.js";
export type {
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./core/agent/askHuman.js";
export type {
  EmitConvergedInput,
  EmitConvergedResult
} from "./core/agent/converged.js";
export type {
  EmitPassInput,
  EmitPassResult
} from "./core/agent/pass.js";
export type {
  BubbleInboxInput,
  BubbleInboxView,
  PendingInboxItem,
  PendingInboxItemType
} from "./core/bubble/inboxBubble.js";
export type {
  CommitBubbleInput,
  CommitBubbleResult
} from "./core/bubble/commitBubble.js";
export type {
  ResolvedBubbleById
} from "./core/bubble/bubbleLookup.js";
export type {
  OpenBubbleDependencies,
  OpenBubbleInput,
  OpenBubbleResult,
  OpenCommandExecutionInput,
  OpenCommandExecutionResult,
  OpenCommandExecutor
} from "./core/bubble/openBubble.js";
export type {
  ResumeBubbleDependencies,
  ResumeBubbleInput,
  ResumeBubbleResult
} from "./core/bubble/resumeBubble.js";
export type {
  StartBubbleDependencies,
  StartBubbleInput,
  StartBubbleResult
} from "./core/bubble/startBubble.js";
export type {
  StopBubbleDependencies,
  StopBubbleInput,
  StopBubbleResult
} from "./core/bubble/stopBubble.js";
export type {
  BubbleListInput,
  BubbleListEntry,
  BubbleListStateCounts,
  BubbleListView
} from "./core/bubble/listBubbles.js";
export type {
  ReconcileRuntimeSessionsAction,
  ReconcileRuntimeSessionsInput,
  ReconcileRuntimeSessionsReport,
  RuntimeSessionStaleReason
} from "./core/runtime/startupReconciler.js";
export type {
  BubbleStatusInput,
  BubbleStatusView
} from "./core/bubble/statusBubble.js";
export type {
  ResolvedBubbleWorkspace
} from "./core/bubble/workspaceResolution.js";
export type {
  BubbleCreateInput,
  BubbleCreateResult,
  ResolvedTaskInput
} from "./core/bubble/createBubble.js";
export type { BubblePaths } from "./core/bubble/paths.js";
export type {
  AskHumanCommandOptions,
  AskHumanHelpCommandOptions,
  ParsedAskHumanCommandOptions
} from "./cli/commands/agent/askHuman.js";
export type {
  ConvergedCommandOptions,
  ConvergedHelpCommandOptions,
  ParsedConvergedCommandOptions
} from "./cli/commands/agent/converged.js";
export type {
  ParsedPassCommandOptions,
  PassHelpCommandOptions,
  PassCommandOptions
} from "./cli/commands/agent/pass.js";
export type {
  BubbleApproveCommandOptions,
  BubbleApproveHelpCommandOptions,
  ParsedBubbleApproveCommandOptions
} from "./cli/commands/bubble/approve.js";
export type {
  BubbleCommitCommandOptions,
  BubbleCommitHelpCommandOptions,
  ParsedBubbleCommitCommandOptions
} from "./cli/commands/bubble/commit.js";
export type {
  BubbleOpenCommandOptions,
  BubbleOpenHelpCommandOptions,
  ParsedBubbleOpenCommandOptions
} from "./cli/commands/bubble/open.js";
export type {
  BubbleResumeCommandOptions,
  BubbleResumeHelpCommandOptions,
  ParsedBubbleResumeCommandOptions
} from "./cli/commands/bubble/resume.js";
export type {
  BubbleInboxCommandOptions,
  BubbleInboxHelpCommandOptions,
  ParsedBubbleInboxCommandOptions
} from "./cli/commands/bubble/inbox.js";
export type {
  BubbleReplyCommandOptions,
  BubbleReplyHelpCommandOptions,
  ParsedBubbleReplyCommandOptions
} from "./cli/commands/bubble/reply.js";
export type {
  BubbleStartCommandOptions,
  BubbleStartHelpCommandOptions,
  ParsedBubbleStartCommandOptions
} from "./cli/commands/bubble/start.js";
export type {
  BubbleStopCommandOptions,
  BubbleStopHelpCommandOptions,
  ParsedBubbleStopCommandOptions
} from "./cli/commands/bubble/stop.js";
export type {
  BubbleListCommandOptions,
  BubbleListHelpCommandOptions,
  ParsedBubbleListCommandOptions
} from "./cli/commands/bubble/list.js";
export type {
  BubbleReconcileCommandOptions,
  BubbleReconcileHelpCommandOptions,
  ParsedBubbleReconcileCommandOptions
} from "./cli/commands/bubble/reconcile.js";
export type {
  BubbleStatusCommandOptions,
  BubbleStatusHelpCommandOptions,
  ParsedBubbleStatusCommandOptions
} from "./cli/commands/bubble/status.js";
export type {
  BubbleRequestReworkCommandOptions,
  BubbleRequestReworkHelpCommandOptions,
  ParsedBubbleRequestReworkCommandOptions
} from "./cli/commands/bubble/requestRework.js";
export type {
  BubbleCreateCommandOptions
} from "./cli/commands/bubble/create.js";
export type {
  BubbleAgentsConfig,
  BubbleCommandsConfig,
  BubbleConfig,
  BubbleLifecycleState,
  BubbleNotificationsConfig,
  BubbleStateSnapshot,
  AgentName,
  AgentRole,
  QualityMode,
  RoundRoleHistoryEntry,
  WorkMode
} from "./types/bubble.js";
export type { StateTransitionInput } from "./core/state/machine.js";
export type {
  LoadedStateSnapshot,
  WriteStateSnapshotOptions
} from "./core/state/stateStore.js";
export type {
  WorktreeCleanupInput,
  WorktreeCleanupResult,
  WorktreeBootstrapInput,
  WorktreeBootstrapResult
} from "./core/workspace/worktreeManager.js";
export type { Finding, FindingSeverity } from "./types/findings.js";
export type {
  ProtocolSequenceAllocationOptions,
  ProtocolSequenceAllocation
} from "./core/protocol/sequenceAllocator.js";
export type {
  LaunchBubbleTmuxSessionInput,
  LaunchBubbleTmuxSessionResult,
  TerminateBubbleTmuxSessionInput,
  TerminateBubbleTmuxSessionResult,
  TmuxRunOptions,
  TmuxRunResult,
  TmuxRunner
} from "./core/runtime/tmuxManager.js";
export type {
  ReadRuntimeSessionsOptions,
  RemoveRuntimeSessionsInput,
  RemoveRuntimeSessionsResult,
  RemoveRuntimeSessionInput,
  RuntimeSessionRecord,
  RuntimeSessionsRegistry,
  UpsertRuntimeSessionInput
} from "./core/runtime/sessionsRegistry.js";
export type {
  WatchdogStatus
} from "./core/runtime/watchdog.js";
export type {
  ConvergencePolicyInput,
  ConvergencePolicyResult
} from "./core/convergence/policy.js";
export type {
  AppendProtocolEnvelopeBatchEntry,
  AppendProtocolEnvelopeInput,
  AppendProtocolEnvelopeResult,
  AppendProtocolEnvelopesInput,
  AppendProtocolEnvelopesResult,
  ProtocolMirrorWriteFailure,
  ReadTranscriptOptions,
  ProtocolEnvelopeDraft
} from "./core/protocol/transcriptStore.js";
export type {
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkInput
} from "./core/human/approval.js";
export type {
  EmitHumanReplyInput,
  EmitHumanReplyResult
} from "./core/human/reply.js";
export type {
  ApprovalDecision,
  PassIntent,
  ProtocolEnvelope,
  ProtocolEnvelopePayload,
  ProtocolMessageType,
  ProtocolParticipant
} from "./types/protocol.js";
export type {
  ValidationError,
  ValidationFail,
  ValidationOk,
  ValidationResult
} from "./core/validation.js";
