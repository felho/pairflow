import type { OpenWorkspaceKind } from "../../ports/openBubble.js";

export interface OpenBubbleErrorContext {
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
