import type { TmuxRunner } from "../../../shared/ports/tmuxSessions.js";

export interface ApplyBubbleTmuxSessionFrameSetupInput {
  runner: TmuxRunner;
  sessionName: string;
  statusPaneLabel: string;
  implementerPaneLabel: string;
  reviewerPaneLabel: string;
  metaReviewerPaneLabel: string;
}

export interface ApplyBubbleTmuxSessionFrameHooksInput {
  runner: TmuxRunner;
  sessionName: string;
  statusPane: string;
  implementerPaneId: string;
  reviewerPaneId: string;
  metaReviewerPaneId: string;
  statusPaneHeight: number;
  tmuxPaneSeparators: number;
}

function buildPaneBorderFormat(input: {
  statusPaneLabel: string;
  implementerPaneLabel: string;
  reviewerPaneLabel: string;
  metaReviewerPaneLabel: string;
}): string {
  return [
    "#{?#{==:#{pane_index},0},",
    input.statusPaneLabel,
    ",",
    "#{?#{==:#{pane_index},1},",
    input.implementerPaneLabel,
    ",",
    "#{?#{==:#{pane_index},2},",
    input.reviewerPaneLabel,
    ",",
    "#{?#{==:#{pane_index},3},",
    input.metaReviewerPaneLabel,
    ",pane-#{pane_index}}}}}"
  ].join("");
}

function buildResizeLayoutScript(input: {
  sessionName: string;
  statusPane: string;
  implementerPaneId: string;
  reviewerPaneId: string;
  metaReviewerPaneId: string;
  statusPaneHeight: number;
  tmuxPaneSeparators: number;
}): string {
  return [
    `tmux resize-pane -t ${input.statusPane} -y ${input.statusPaneHeight} 2>/dev/null || true`,
    `WINDOW_HEIGHT=$(tmux display-message -p -t ${input.sessionName}:0 '#{window_height}' 2>/dev/null || echo 0)`,
    "case \"$WINDOW_HEIGHT\" in ''|*[!0-9]*) WINDOW_HEIGHT=0 ;; esac",
    `REMAIN=$((WINDOW_HEIGHT - ${input.statusPaneHeight + input.tmuxPaneSeparators}))`,
    "if [ $REMAIN -lt 3 ]; then REMAIN=3; fi",
    "ROW=$((REMAIN / 3))",
    "if [ $ROW -lt 1 ]; then ROW=1; fi",
    "ROW_LAST=$((REMAIN - (ROW * 2)))",
    "if [ $ROW_LAST -lt 1 ]; then ROW_LAST=1; fi",
    `tmux resize-pane -t ${input.implementerPaneId} -y $ROW 2>/dev/null || true`,
    `tmux resize-pane -t ${input.reviewerPaneId} -y $ROW 2>/dev/null || true`,
    `tmux resize-pane -t ${input.metaReviewerPaneId} -y $ROW_LAST 2>/dev/null || true`
  ].join("; ");
}

function toTmuxRunShellCommand(script: string): string {
  const escaped = script.replaceAll("'", "'\\''");
  return `run-shell '${escaped}'`;
}

export async function applyBubbleTmuxSessionFrameSetup(
  input: ApplyBubbleTmuxSessionFrameSetupInput
): Promise<void> {
  const paneBorderFormat = buildPaneBorderFormat({
    statusPaneLabel: input.statusPaneLabel,
    implementerPaneLabel: input.implementerPaneLabel,
    reviewerPaneLabel: input.reviewerPaneLabel,
    metaReviewerPaneLabel: input.metaReviewerPaneLabel
  });

  await input.runner([
    "set-option",
    "-t",
    `${input.sessionName}:0`,
    "remain-on-exit",
    "on"
  ]);
  await input.runner([
    "set-window-option",
    "-t",
    `${input.sessionName}:0`,
    "pane-border-status",
    "top"
  ]);
  await input.runner([
    "set-window-option",
    "-t",
    `${input.sessionName}:0`,
    "pane-border-format",
    paneBorderFormat
  ]);
  await input.runner(["set-environment", "-g", "-u", "CLAUDECODE"]);
  await input.runner(["set-environment", "-t", input.sessionName, "-u", "CLAUDECODE"]);
  await input.runner(["set-environment", "-g", "-u", "NO_COLOR"]);
  await input.runner(["set-environment", "-t", input.sessionName, "-u", "NO_COLOR"]);
}

export async function applyBubbleTmuxSessionFrameHooks(
  input: ApplyBubbleTmuxSessionFrameHooksInput
): Promise<void> {
  const resizeLayoutScript = buildResizeLayoutScript({
    sessionName: input.sessionName,
    statusPane: input.statusPane,
    implementerPaneId: input.implementerPaneId,
    reviewerPaneId: input.reviewerPaneId,
    metaReviewerPaneId: input.metaReviewerPaneId,
    statusPaneHeight: input.statusPaneHeight,
    tmuxPaneSeparators: input.tmuxPaneSeparators
  });
  const resizeLayoutHookCommand = toTmuxRunShellCommand(resizeLayoutScript);

  await input.runner([
    "set-hook",
    "-t",
    input.sessionName,
    "client-resized",
    resizeLayoutHookCommand
  ]);
  await input.runner([
    "set-hook",
    "-t",
    input.sessionName,
    "window-resized",
    resizeLayoutHookCommand
  ]);
  await input.runner(["run-shell", resizeLayoutScript]);
}
