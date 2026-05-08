import type { OpenWorkspaceKind } from "../../ports/openBubble.js";
import { shellQuote } from "../../shared/foundation/shellQuote.js";
import { createOpenBubbleError } from "./openBubbleError.js";

export const worktreePathPlaceholder = "{{worktree_path}}";
export const defaultOpenCommandTemplate = `cursor ${worktreePathPlaceholder}`;
export const defaultRemoteFolderUriTemplate =
  "vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}";
export const defaultOpenRemoteCommandTemplate =
  `code --folder-uri "${defaultRemoteFolderUriTemplate}"`;
export const localOpenWorkspaceKind = "local_worktree";
export const remoteOpenWorkspaceKind = "remote_clone";

type RemotePlaceholderName =
  | "remote_alias"
  | "remote_authority"
  | "remote_clone_path"
  | "remote_host"
  | "remote_user";

export interface RemoteOpenContext {
  remoteAlias: string;
  remoteHost: string;
  remoteUser?: string | undefined;
  remoteAuthority: string;
  remoteClonePath: string;
}

export interface RemoteOpenBaseContext {
  remoteAlias: string;
  remoteHost: string;
  remoteUser?: string | undefined;
  remoteClonePath: string;
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

export function renderOpenCommand(
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

export function renderRemoteOpenCommand(input: {
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
