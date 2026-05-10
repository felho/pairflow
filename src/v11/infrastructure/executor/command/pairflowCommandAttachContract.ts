import type { PairflowGlobalConfig } from "../../../../config/pairflowConfig.js";
import type {
  BubbleRemotePointer
} from "../../../shared/remote/remoteExecutionTypes.js";
import type {
  AttachLauncher
} from "../../../shared/bubbleAttachment/attachLauncherTypes.js";
import type { ResolveBubbleByIdPort } from "../../../ports/bubbleLookup.js";

export type ExplicitAttachLauncher = Exclude<AttachLauncher, "auto">;
export type GuiAttachLauncher = Exclude<ExplicitAttachLauncher, "copy">;

export interface AttachBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  portForwards?: number[] | undefined;
}

export interface AttachBubbleResult {
  bubbleId: string;
  tmuxSessionName: string;
  launcherRequested: AttachLauncher;
  launcherUsed: ExplicitAttachLauncher;
  attachCommand?: string;
  diagnostics?: AttachBubbleResultDiagnostic[];
}

export interface AttachBubbleResultDiagnostic {
  code: "REMOTE_ATTACH_CONFIG_SUPPLEMENT_UNAVAILABLE";
  message: string;
  context: AttachBubbleErrorContext;
}

export interface AttachCommandExecutionInput {
  command: string;
  cwd: string;
}

export interface AttachCommandExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type AttachCommandExecutor = (
  input: AttachCommandExecutionInput
) => Promise<AttachCommandExecutionResult>;

export type TmuxSessionChecker = (sessionName: string) => Promise<boolean>;

export interface LauncherAvailabilityInput {
  launcher: GuiAttachLauncher;
  cwd: string;
}

export type LauncherAvailabilityChecker = (
  input: LauncherAvailabilityInput
) => Promise<boolean>;

export type AttachLauncherFailureClass =
  | "launcher_unavailable"
  | "launcher_launch_failed";

export type AttachBubbleReasonCode =
  | "TMUX_SESSION_MISSING"
  | "REMOTE_ATTACH_START_REQUIRED"
  | "REMOTE_ATTACH_POINTER_INVALID"
  | "REMOTE_ATTACH_CONFIG_INVALID"
  | "ATTACH_LAUNCHER_UNAVAILABLE"
  | "ATTACH_LAUNCHER_LAUNCH_FAILED"
  | "ATTACH_LAUNCHER_PREPARE_FAILED";

export interface AttachBubbleDependencies {
  executeAttachCommand?: AttachCommandExecutor;
  resolveBubbleById?: ResolveBubbleByIdPort;
  checkTmuxSessionExists?: TmuxSessionChecker;
  writeYamlFile?: (path: string, content: string) => Promise<void>;
  checkLauncherAvailability?: LauncherAvailabilityChecker;
  loadPairflowGlobalConfig?: () => Promise<PairflowGlobalConfig>;
  readRemotePointer?: (path: string) => Promise<BubbleRemotePointer | null>;
}

export interface AttachBubbleErrorContext {
  bubbleId?: string;
  cwd?: string;
  reason?: string;
  repoPath?: string;
  tmuxSessionName?: string;
  remoteAlias?: string;
  remoteHost?: string;
  remoteClonePath?: string;
}

interface AttachBubbleErrorOptions {
  context?: AttachBubbleErrorContext;
  launcher?: ExplicitAttachLauncher;
  failureClass?: AttachLauncherFailureClass;
  reasonCode?: AttachBubbleReasonCode;
  stdoutExcerpt?: string;
  stderrExcerpt?: string;
}

export class AttachBubbleError extends Error {
  public readonly launcher?: ExplicitAttachLauncher;
  public readonly failureClass?: AttachLauncherFailureClass;
  public readonly reasonCode?: AttachBubbleReasonCode;
  public readonly stdoutExcerpt?: string;
  public readonly stderrExcerpt?: string;
  public readonly context?: AttachBubbleErrorContext;

  public constructor(message: string, options: AttachBubbleErrorOptions = {}) {
    super(message);
    this.name = "AttachBubbleError";
    if (options.context !== undefined) {
      this.context = options.context;
    }
    if (options.launcher !== undefined) {
      this.launcher = options.launcher;
    }
    if (options.failureClass !== undefined) {
      this.failureClass = options.failureClass;
    }
    if (options.reasonCode !== undefined) {
      this.reasonCode = options.reasonCode;
    }
    if (options.stdoutExcerpt !== undefined) {
      this.stdoutExcerpt = options.stdoutExcerpt;
    }
    if (options.stderrExcerpt !== undefined) {
      this.stderrExcerpt = options.stderrExcerpt;
    }
  }
}
