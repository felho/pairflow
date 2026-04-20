import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

import {
  loadPairflowGlobalConfig,
  type PairflowGlobalConfig
} from "../../../config/pairflowConfig.js";
import type {
  BubbleRemotePointer,
  BubbleRemotePointerStarted
} from "../../../types/bubble.js";
import { readRemotePointer } from "../../infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import type {
  OpenBubbleResult,
  OpenWorkspaceKind
} from "../../shared/ports/openBubble.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import { SchemaValidationError } from "../../shared/validation/primitives.js";
import { shellQuote } from "../../shared/foundation/shellQuote.js";

const worktreePathPlaceholder = "{{worktree_path}}";
const defaultOpenCommandTemplate = `cursor ${worktreePathPlaceholder}`;
const defaultRemoteFolderUriTemplate =
  "vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}";
const defaultOpenRemoteCommandTemplate =
  `code --folder-uri "${defaultRemoteFolderUriTemplate}"`;
const localOpenWorkspaceKind = "local_worktree";
const remoteOpenWorkspaceKind = "remote_clone";

type RemotePlaceholderName =
  | "remote_alias"
  | "remote_authority"
  | "remote_clone_path"
  | "remote_host"
  | "remote_user";

interface RemoteOpenContext {
  remoteAlias: string;
  remoteHost: string;
  remoteUser?: string | undefined;
  remoteAuthority: string;
  remoteClonePath: string;
}

interface RemoteOpenBaseContext {
  remoteAlias: string;
  remoteHost: string;
  remoteUser?: string | undefined;
  remoteClonePath: string;
}

export interface OpenBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface OpenCommandExecutionInput {
  command: string;
  cwd: string;
}

export interface OpenCommandExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type OpenCommandExecutor = (
  input: OpenCommandExecutionInput
) => Promise<OpenCommandExecutionResult>;

export interface OpenBubbleDependencies {
  executeOpenCommand?: OpenCommandExecutor;
  resolveBubbleById?: ResolveBubbleByIdPort;
  assertWorktreeExists?: (worktreePath: string) => Promise<void>;
  loadPairflowGlobalConfig?: () => ReturnType<typeof loadPairflowGlobalConfig>;
  readRemotePointer?: (
    path: string
  ) => Promise<BubbleRemotePointer | null>;
}

interface OpenBubbleErrorContext {
  bubbleId?: string | undefined;
  command?: string | undefined;
  commandTemplate?: string | undefined;
  cwd?: string | undefined;
  exitCode?: number | undefined;
  remoteAlias?: string | undefined;
  remoteAuthority?: string | undefined;
  remoteClonePath?: string | undefined;
  remoteHost?: string | undefined;
  remoteUser?: string | undefined;
  reason?: string | undefined;
  reason_code?: string | undefined;
  workspaceKind?: OpenWorkspaceKind | undefined;
  workspacePath?: string | undefined;
  worktreePath?: string | undefined;
}

interface OpenBubbleErrorOptions extends ErrorOptions {
  context?: OpenBubbleErrorContext | undefined;
}

export class OpenBubbleError extends Error {
  public readonly context: OpenBubbleErrorContext | undefined;

  public constructor(message: string, options?: OpenBubbleErrorOptions) {
    super(message, options);
    this.name = "OpenBubbleError";
    this.context = options?.context;
  }
}

export function createOpenBubbleError(input: {
  message: string;
  context: OpenBubbleErrorContext;
  cause?: unknown;
}): OpenBubbleError {
  return new OpenBubbleError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function renderOpenCommand(
  commandTemplate: string,
  worktreePath: string
): string {
  const template = commandTemplate.trim();
  if (template.length === 0) {
    throw createOpenBubbleError({
      message: "open_command cannot be empty.",
      context: {
        commandTemplate,
        reason: "empty_open_command",
        reason_code: "OPEN_COMMAND_EMPTY"
      }
    });
  }

  const quotedWorktreePath = shellQuote(worktreePath);
  if (template.includes(worktreePathPlaceholder)) {
    const rendered = template.split(worktreePathPlaceholder).join(quotedWorktreePath);
    assertNoUnsupportedPlaceholders({
      template: rendered,
      bubbleId: undefined,
      reason_code: "OPEN_COMMAND_PLACEHOLDER_INVALID",
      workspaceKind: localOpenWorkspaceKind
    });
    return rendered;
  }

  assertNoUnsupportedPlaceholders({
    template,
    bubbleId: undefined,
    reason_code: "OPEN_COMMAND_PLACEHOLDER_INVALID",
    workspaceKind: localOpenWorkspaceKind
  });
  return `${template} ${quotedWorktreePath}`;
}

function findTemplatePlaceholders(template: string): string[] {
  return Array.from(
    template.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/gu),
    (match) => match[1] ?? ""
  ).filter((placeholder) => placeholder.length > 0);
}

function assertNoUnsupportedPlaceholders(input: {
  template: string;
  bubbleId: string | undefined;
  reason_code: string;
  workspaceKind: OpenWorkspaceKind;
}): void {
  const placeholders = findTemplatePlaceholders(input.template);
  if (placeholders.length === 0) {
    return;
  }

  throw createOpenBubbleError({
    message:
      `Open command template for ${input.workspaceKind} contains unsupported `
      + `or unresolved placeholders: ${placeholders.join(", ")}.`,
    context: {
      ...(input.bubbleId !== undefined ? { bubbleId: input.bubbleId } : {}),
      commandTemplate: input.template,
      reason: "open_command_placeholder_invalid",
      reason_code: input.reason_code,
      workspaceKind: input.workspaceKind
    }
  });
}

function replaceRemotePlaceholder(
  template: string,
  placeholder: RemotePlaceholderName,
  value: string | undefined,
  input: {
    bubbleId: string;
    workspaceKind: OpenWorkspaceKind;
  }
): string {
  if (!template.includes(`{{${placeholder}}}`)) {
    return template;
  }

  if (value === undefined) {
    throw createOpenBubbleError({
      message:
        `Remote open command for '${input.bubbleId}' requires placeholder `
        + `{{${placeholder}}}, but no value is available.`,
      context: {
        bubbleId: input.bubbleId,
        commandTemplate: template,
        reason: "open_remote_placeholder_unresolved",
        reason_code: "OPEN_REMOTE_PLACEHOLDER_UNRESOLVED",
        workspaceKind: input.workspaceKind
      }
    });
  }

  return template.split(`{{${placeholder}}}`).join(shellQuote(value));
}

function assertSupportedRemotePlaceholderContexts(input: {
  bubbleId: string;
  template: string;
}): void {
  const placeholders = findTemplatePlaceholders(input.template);
  for (const placeholder of placeholders) {
    if (
      placeholder !== "remote_alias"
      && placeholder !== "remote_authority"
      && placeholder !== "remote_clone_path"
      && placeholder !== "remote_host"
      && placeholder !== "remote_user"
    ) {
      continue;
    }

    const token = `{{${placeholder}}}`;
    let searchStart = 0;
    while (true) {
      const index = input.template.indexOf(token, searchStart);
      if (index < 0) {
        break;
      }
      const previous = index === 0 ? "" : input.template[index - 1] ?? "";
      const nextIndex = index + token.length;
      const next =
        nextIndex >= input.template.length ? "" : input.template[nextIndex] ?? "";
      const hasSupportedBoundaryBefore =
        previous.length === 0 || /\s/u.test(previous);
      const hasSupportedBoundaryAfter =
        next.length === 0 || /\s/u.test(next);
      if (!hasSupportedBoundaryBefore || !hasSupportedBoundaryAfter) {
        throw createOpenBubbleError({
          message:
            `Remote open command for '${input.bubbleId}' uses placeholder `
            + `${token} in an unsupported embedded context. Use the placeholder `
            + "as a standalone argument, or use the canonical VS Code Remote SSH URI literal "
            + `"${defaultRemoteFolderUriTemplate}".`,
          context: {
            bubbleId: input.bubbleId,
            commandTemplate: input.template,
            reason: "open_remote_placeholder_context_invalid",
            reason_code: "OPEN_REMOTE_PLACEHOLDER_CONTEXT_INVALID",
            workspaceKind: remoteOpenWorkspaceKind
          }
        });
      }
      searchStart = nextIndex;
    }
  }
}

function replaceRemoteFolderUriTemplate(
  template: string,
  input: RemoteOpenContext
): string {
  if (!template.includes(defaultRemoteFolderUriTemplate)) {
    return template;
  }

  return template
    .split(defaultRemoteFolderUriTemplate)
    .join(buildDefaultRemoteFolderUri(input));
}

function encodeVsCodeRemoteAuthority(authority: string): string {
  return encodeURIComponent(authority).replaceAll("'", "%27");
}

function encodeVsCodeRemotePath(path: string): string {
  const segments = path.split("/");
  return segments
    .map((segment, index) => {
      if (segment.length === 0 && index === 0) {
        return "";
      }
      return encodeURIComponent(segment).replaceAll("'", "%27");
    })
    .join("/");
}

function buildDefaultRemoteFolderUri(input: RemoteOpenContext): string {
  return (
    `vscode-remote://ssh-remote+${encodeVsCodeRemoteAuthority(input.remoteAuthority)}`
    + encodeVsCodeRemotePath(input.remoteClonePath)
  );
}

function renderRemoteOpenCommand(input: {
  bubbleId: string;
  commandTemplate: string;
  remote: RemoteOpenContext;
}): string {
  const template = input.commandTemplate.trim();
  if (template.length === 0) {
    throw createOpenBubbleError({
      message: "open_remote_command cannot be empty.",
      context: {
        bubbleId: input.bubbleId,
        commandTemplate: input.commandTemplate,
        reason: "empty_open_remote_command",
        reason_code: "OPEN_REMOTE_COMMAND_EMPTY",
        workspaceKind: remoteOpenWorkspaceKind
      }
    });
  }

  let rendered = replaceRemoteFolderUriTemplate(template, input.remote);
  assertSupportedRemotePlaceholderContexts({
    bubbleId: input.bubbleId,
    template: rendered
  });
  rendered = replaceRemotePlaceholder(rendered, "remote_alias", input.remote.remoteAlias, {
    bubbleId: input.bubbleId,
    workspaceKind: remoteOpenWorkspaceKind
  });
  rendered = replaceRemotePlaceholder(
    rendered,
    "remote_authority",
    input.remote.remoteAuthority,
    {
      bubbleId: input.bubbleId,
      workspaceKind: remoteOpenWorkspaceKind
    }
  );
  rendered = replaceRemotePlaceholder(
    rendered,
    "remote_clone_path",
    input.remote.remoteClonePath,
    {
      bubbleId: input.bubbleId,
      workspaceKind: remoteOpenWorkspaceKind
    }
  );
  rendered = replaceRemotePlaceholder(rendered, "remote_host", input.remote.remoteHost, {
    bubbleId: input.bubbleId,
    workspaceKind: remoteOpenWorkspaceKind
  });
  rendered = replaceRemotePlaceholder(rendered, "remote_user", input.remote.remoteUser, {
    bubbleId: input.bubbleId,
    workspaceKind: remoteOpenWorkspaceKind
  });

  assertNoUnsupportedPlaceholders({
    template: rendered,
    bubbleId: input.bubbleId,
    reason_code: "OPEN_REMOTE_PLACEHOLDER_INVALID",
    workspaceKind: remoteOpenWorkspaceKind
  });
  return rendered;
}

export const executeOpenCommand: OpenCommandExecutor = async (
  input: OpenCommandExecutionInput
): Promise<OpenCommandExecutionResult> =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("bash", ["-lc", input.command], {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (exitCode) => {
      resolvePromise({
        exitCode: exitCode ?? 1,
        stdout,
        stderr
      });
    });
  });

async function assertWorktreeExistsDefault(worktreePath: string): Promise<void> {
  await access(worktreePath, fsConstants.F_OK).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw createOpenBubbleError({
          message: `Bubble worktree does not exist yet: ${worktreePath}. Start the bubble before opening it.`,
          context: {
            worktreePath,
            reason: "worktree_missing",
            reason_code: "OPEN_WORKTREE_MISSING"
          },
          cause: error
        });
      }
      throw error;
    }
  );
}

async function resolveOpenCommandTemplate(input: {
  bubbleId: string;
  bubbleOpenCommand: string | undefined;
  bubbleOpenRemoteCommand: string | undefined;
  workspaceKind: OpenWorkspaceKind;
  loadPairflowGlobalConfig: () => ReturnType<typeof loadPairflowGlobalConfig>;
}): Promise<{
  commandTemplate: string;
  globalConfigWasConsulted: boolean;
}> {
  const bubbleTemplate =
    input.workspaceKind === localOpenWorkspaceKind
      ? input.bubbleOpenCommand
      : input.bubbleOpenRemoteCommand;
  if (bubbleTemplate !== undefined) {
    return {
      commandTemplate: bubbleTemplate,
      globalConfigWasConsulted: false
    };
  }

  try {
    const globalConfig = await input.loadPairflowGlobalConfig();
    const globalTemplate =
      input.workspaceKind === localOpenWorkspaceKind
        ? globalConfig.open_command
        : globalConfig.open_remote_command;
    if (globalTemplate !== undefined) {
      return {
        commandTemplate: globalTemplate,
        globalConfigWasConsulted: true
      };
    }
  } catch (error) {
    if (error instanceof OpenBubbleError) {
      throw error;
    }
    if (error instanceof SchemaValidationError) {
      throw createOpenBubbleError({
        message: `Invalid global Pairflow config while opening bubble '${input.bubbleId}': ${error.message}`,
        context: {
          bubbleId: input.bubbleId,
          reason: "invalid_global_config",
          reason_code: "OPEN_GLOBAL_CONFIG_INVALID"
        },
        cause: error
      });
    }

    const reason = error instanceof Error ? error.message : String(error);
    throw createOpenBubbleError({
      message: `Failed to load global Pairflow config while opening bubble '${input.bubbleId}': ${reason}`,
      context: {
        bubbleId: input.bubbleId,
        reason: "load_global_config_failed",
        reason_code: "OPEN_GLOBAL_CONFIG_LOAD_FAILED"
      },
      cause: error
    });
  }

  return {
    commandTemplate:
      input.workspaceKind === localOpenWorkspaceKind
        ? defaultOpenCommandTemplate
        : defaultOpenRemoteCommandTemplate,
    globalConfigWasConsulted: true
  };
}

async function readRemotePointerOrThrow(input: {
  bubbleId: string;
  remotePointerPath: string;
  readRemotePointerPort: (path: string) => Promise<BubbleRemotePointer | null>;
}): Promise<BubbleRemotePointer | null> {
  try {
    return await input.readRemotePointerPort(input.remotePointerPath);
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      throw createOpenBubbleError({
        message:
          `Remote open for '${input.bubbleId}' requires a valid remote pointer: `
          + `${error.message}`,
        context: {
          bubbleId: input.bubbleId,
          reason: "remote_pointer_invalid",
          reason_code: "OPEN_REMOTE_POINTER_INVALID",
          workspaceKind: remoteOpenWorkspaceKind
        },
        cause: error
      });
    }
    throw error;
  }
}

async function loadGlobalConfigOrThrow(
  input: {
    bubbleId: string;
    loadPairflowGlobalConfig: () => ReturnType<typeof loadPairflowGlobalConfig>;
  }
): Promise<PairflowGlobalConfig> {
  try {
    return await input.loadPairflowGlobalConfig();
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      throw createOpenBubbleError({
        message: `Invalid global Pairflow config while opening bubble '${input.bubbleId}': ${error.message}`,
        context: {
          bubbleId: input.bubbleId,
          reason: "invalid_global_config",
          reason_code: "OPEN_GLOBAL_CONFIG_INVALID"
        },
        cause: error
      });
    }

    const reason = error instanceof Error ? error.message : String(error);
    throw createOpenBubbleError({
      message: `Failed to load global Pairflow config while opening bubble '${input.bubbleId}': ${reason}`,
      context: {
        bubbleId: input.bubbleId,
        reason: "load_global_config_failed",
        reason_code: "OPEN_GLOBAL_CONFIG_LOAD_FAILED"
      },
      cause: error
    });
  }
}

function validateStartedRemotePointer(input: {
  bubbleId: string;
  remoteAlias: string;
  pointer: BubbleRemotePointerStarted;
}): BubbleRemotePointerStarted {
  if (
    input.pointer.host.trim().length > 0
    && input.pointer.remoteClonePath.trim().length > 0
    && input.pointer.remoteClonePath.startsWith("/")
  ) {
    return input.pointer;
  }

  throw createOpenBubbleError({
    message:
      `Remote open for '${input.bubbleId}' requires a valid started pointer with `
      + "host and absolute remote clone path.",
    context: {
      bubbleId: input.bubbleId,
      remoteAlias: input.remoteAlias,
      remoteHost: input.pointer.host,
      remoteClonePath: input.pointer.remoteClonePath,
      reason: "remote_pointer_invalid",
      reason_code: "OPEN_REMOTE_POINTER_INVALID",
      workspaceKind: remoteOpenWorkspaceKind
    }
  });
}

function resolveRemoteUserSupplement(input: {
  bubbleId: string;
  remoteAlias: string;
  startedPointer: BubbleRemotePointerStarted;
  globalConfig: PairflowGlobalConfig;
}): string | undefined {
  const remoteConfig = input.globalConfig.remotes?.[input.remoteAlias];
  if (remoteConfig === undefined) {
    return input.startedPointer.user;
  }

  if (remoteConfig.host !== input.startedPointer.host) {
    throw createOpenBubbleError({
      message:
        `Remote open for '${input.bubbleId}' refused host mismatch: pointer host `
        + `(${input.startedPointer.host}) does not match configured execution host `
        + `(${remoteConfig.host}).`,
      context: {
        bubbleId: input.bubbleId,
        remoteAlias: input.remoteAlias,
        remoteHost: remoteConfig.host,
        reason: "remote_host_drift",
        reason_code: "OPEN_REMOTE_HOST_DRIFT",
        workspaceKind: remoteOpenWorkspaceKind
      }
    });
  }

  if (
    input.startedPointer.user !== undefined
    && remoteConfig.user !== undefined
    && remoteConfig.user !== input.startedPointer.user
  ) {
    throw createOpenBubbleError({
      message:
        `Remote open for '${input.bubbleId}' refused ambiguous authority: pointer user `
        + `(${input.startedPointer.user}) does not match configured remote user `
        + `(${remoteConfig.user}).`,
      context: {
        bubbleId: input.bubbleId,
        remoteAlias: input.remoteAlias,
        remoteHost: input.startedPointer.host,
        remoteUser: remoteConfig.user,
        reason: "remote_authority_ambiguous",
        reason_code: "OPEN_REMOTE_AUTHORITY_AMBIGUOUS",
        workspaceKind: remoteOpenWorkspaceKind
      }
    });
  }

  return input.startedPointer.user ?? remoteConfig.user;
}

function remoteCommandNeedsRemoteConfig(
  commandTemplate: string,
  remoteUser: string | undefined,
  globalConfigWasConsulted: boolean
): boolean {
  const remoteIdentityIsNeeded =
    commandTemplate.includes("{{remote_user}}")
    || commandTemplate.includes("{{remote_authority}}")
    || commandTemplate.includes(defaultRemoteFolderUriTemplate);

  if (!remoteIdentityIsNeeded) {
    return false;
  }

  if (globalConfigWasConsulted) {
    return true;
  }

  return remoteUser === undefined;
}

async function enrichRemoteOpenContext(input: {
  bubbleId: string;
  commandTemplate: string;
  globalConfigWasConsulted: boolean;
  remoteBase: RemoteOpenBaseContext;
  loadGlobalConfigOnce: () => Promise<PairflowGlobalConfig>;
}): Promise<RemoteOpenContext> {
  const globalConfig = remoteCommandNeedsRemoteConfig(
    input.commandTemplate,
    input.remoteBase.remoteUser,
    input.globalConfigWasConsulted
  )
    ? await input.loadGlobalConfigOnce()
    : undefined;

  const remoteUser =
    globalConfig !== undefined
      ? resolveRemoteUserSupplement({
          bubbleId: input.bubbleId,
          remoteAlias: input.remoteBase.remoteAlias,
          startedPointer: {
            kind: "started",
            host: input.remoteBase.remoteHost,
            ...(input.remoteBase.remoteUser !== undefined
              ? { user: input.remoteBase.remoteUser }
              : {}),
            instanceId: "open-context-supplement",
            remoteClonePath: input.remoteBase.remoteClonePath,
            tmuxSession: "open-context-supplement",
            startedAt: "1970-01-01T00:00:00.000Z"
          },
          globalConfig
        })
      : input.remoteBase.remoteUser;

  return {
    remoteAlias: input.remoteBase.remoteAlias,
    remoteHost: input.remoteBase.remoteHost,
    ...(remoteUser !== undefined ? { remoteUser } : {}),
    remoteAuthority:
      remoteUser !== undefined
        ? `${remoteUser}@${input.remoteBase.remoteHost}`
        : input.remoteBase.remoteHost,
    remoteClonePath: input.remoteBase.remoteClonePath
  };
}

async function resolveOpenExecutionContext(input: {
  bubbleId: string;
  bubblePaths: {
    worktreePath: string;
    remotePointerPath: string;
  };
  bubbleConfig: {
    executor?: {
      type: "ssh";
      remote: string;
    } | undefined;
  } & {
    open_command?: string | undefined;
    open_remote_command?: string | undefined;
  };
  assertWorktreeExists: (worktreePath: string) => Promise<void>;
  readRemotePointerPort: (path: string) => Promise<BubbleRemotePointer | null>;
}): Promise<
  | {
      workspaceKind: typeof localOpenWorkspaceKind;
      workspacePath: string;
      worktreePath: string;
    }
  | {
      workspaceKind: typeof remoteOpenWorkspaceKind;
      workspacePath: string;
      remoteBase: RemoteOpenBaseContext;
    }
> {
  const executor = input.bubbleConfig.executor;
  if (executor?.type !== "ssh") {
    await input.assertWorktreeExists(input.bubblePaths.worktreePath);
    return {
      workspaceKind: localOpenWorkspaceKind,
      workspacePath: input.bubblePaths.worktreePath,
      worktreePath: input.bubblePaths.worktreePath
    };
  }

  const remotePointer = await readRemotePointerOrThrow({
    bubbleId: input.bubbleId,
    remotePointerPath: input.bubblePaths.remotePointerPath,
    readRemotePointerPort: input.readRemotePointerPort
  });

  if (remotePointer === null || remotePointer.kind === "created") {
    throw createOpenBubbleError({
      message:
        `Remote bubble '${input.bubbleId}' is not started yet. Run `
        + `\`pairflow bubble start --id ${input.bubbleId}\` first.`,
      context: {
        bubbleId: input.bubbleId,
        remoteAlias: executor.remote,
        ...(remotePointer?.host !== undefined && remotePointer.host.trim().length > 0
          ? { remoteHost: remotePointer.host }
          : {}),
        reason: "remote_open_start_required",
        reason_code: "OPEN_REMOTE_START_REQUIRED",
        workspaceKind: remoteOpenWorkspaceKind
      }
    });
  }

  const startedPointer = validateStartedRemotePointer({
    bubbleId: input.bubbleId,
    remoteAlias: executor.remote,
    pointer: remotePointer
  });

  return {
    workspaceKind: remoteOpenWorkspaceKind,
    workspacePath: startedPointer.remoteClonePath,
    remoteBase: {
      remoteAlias: executor.remote,
      remoteHost: startedPointer.host,
      ...(startedPointer.user !== undefined ? { remoteUser: startedPointer.user } : {}),
      remoteClonePath: startedPointer.remoteClonePath
    }
  };
}

export async function openBubbleRuntime(
  input: OpenBubbleInput,
  dependencies: OpenBubbleDependencies
): Promise<OpenBubbleResult> {
  if (dependencies.resolveBubbleById === undefined) {
    throw createOpenBubbleError({
      message: "Open bubble requires a bubble resolver dependency.",
      context: {
        bubbleId: input.bubbleId,
        reason: "open_bubble_dependency_missing",
        reason_code: "OPEN_DEPENDENCY_MISSING"
      }
    });
  }

  const resolveBubble = dependencies.resolveBubbleById;
  const assertWorktreeExists =
    dependencies.assertWorktreeExists ?? assertWorktreeExistsDefault;
  const loadGlobalConfig =
    dependencies.loadPairflowGlobalConfig ?? loadPairflowGlobalConfig;
  const readRemotePointerPort = dependencies.readRemotePointer ?? readRemotePointer;
  let cachedGlobalConfigPromise: Promise<PairflowGlobalConfig> | undefined;
  const loadGlobalConfigOnce = (): Promise<PairflowGlobalConfig> => {
    cachedGlobalConfigPromise ??= loadGlobalConfigOrThrow({
      bubbleId: input.bubbleId,
      loadPairflowGlobalConfig: loadGlobalConfig
    });
    return cachedGlobalConfigPromise;
  };

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const executionContext = await resolveOpenExecutionContext({
    bubbleId: resolved.bubbleId,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    assertWorktreeExists,
    readRemotePointerPort
  });

  const commandTemplateResolution = await resolveOpenCommandTemplate({
    bubbleId: resolved.bubbleId,
    bubbleOpenCommand: resolved.bubbleConfig.open_command,
    bubbleOpenRemoteCommand: resolved.bubbleConfig.open_remote_command,
    workspaceKind: executionContext.workspaceKind,
    loadPairflowGlobalConfig: loadGlobalConfigOnce
  });
  const commandTemplate = commandTemplateResolution.commandTemplate;
  const remoteContext =
    executionContext.workspaceKind === remoteOpenWorkspaceKind
      ? await enrichRemoteOpenContext({
          bubbleId: resolved.bubbleId,
          commandTemplate,
          globalConfigWasConsulted:
            commandTemplateResolution.globalConfigWasConsulted,
          remoteBase: executionContext.remoteBase,
          loadGlobalConfigOnce
        })
      : undefined;
  const command =
    executionContext.workspaceKind === localOpenWorkspaceKind
      ? renderOpenCommand(commandTemplate, executionContext.worktreePath)
      : renderRemoteOpenCommand({
          bubbleId: resolved.bubbleId,
          commandTemplate,
          remote: remoteContext
            ?? (() => {
              throw createOpenBubbleError({
                message: "Remote open requires resolved remote context.",
                context: {
                  bubbleId: resolved.bubbleId,
                  reason: "remote_open_context_missing",
                  reason_code: "OPEN_DEPENDENCY_MISSING",
                  workspaceKind: remoteOpenWorkspaceKind
                }
              });
            })()
        });
  const runCommand = dependencies.executeOpenCommand ?? executeOpenCommand;
  const executed = await runCommand({
    command,
    cwd: resolved.repoPath
  });

  if (executed.exitCode !== 0) {
    const details = executed.stderr.trim() || executed.stdout.trim();
    throw createOpenBubbleError({
      message:
        details.length > 0
          ? `Open command failed with exit code ${executed.exitCode}: ${details}`
          : `Open command failed with exit code ${executed.exitCode}.`,
      context: {
        bubbleId: resolved.bubbleId,
        command,
        cwd: resolved.repoPath,
        exitCode: executed.exitCode,
        reason: "open_command_failed",
        reason_code: "OPEN_COMMAND_FAILED",
        workspaceKind: executionContext.workspaceKind,
        workspacePath: executionContext.workspacePath,
        ...(executionContext.workspaceKind === localOpenWorkspaceKind
          ? { worktreePath: executionContext.worktreePath }
          : {
              remoteAuthority: remoteContext?.remoteAuthority,
              remoteAlias: remoteContext?.remoteAlias,
              remoteClonePath: remoteContext?.remoteClonePath,
              remoteHost: remoteContext?.remoteHost,
              ...(remoteContext?.remoteUser !== undefined
                ? { remoteUser: remoteContext.remoteUser }
                : {})
            })
      }
    });
  }

  return {
    bubbleId: resolved.bubbleId,
    workspaceKind: executionContext.workspaceKind,
    workspacePath: executionContext.workspacePath,
    ...(executionContext.workspaceKind === localOpenWorkspaceKind
      ? { worktreePath: executionContext.worktreePath }
      : { remoteAuthority: remoteContext?.remoteAuthority }),
    command
  };
}
