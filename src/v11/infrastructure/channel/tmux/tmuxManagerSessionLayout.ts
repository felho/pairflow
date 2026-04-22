import type { TmuxRunner } from "../../../shared/ports/tmuxSessions.js";
import {
  applyBubbleTmuxSessionFrameHooks,
  applyBubbleTmuxSessionFrameSetup
} from "./tmuxManagerSessionFrame.js";

export interface LaunchBubbleSessionLayoutInput {
  runner: TmuxRunner;
  sessionName: string;
  workspacePath: string;
  statusPaneLabel: string;
  implementerPaneLabel: string;
  reviewerPaneLabel: string;
  metaReviewerPaneLabel: string;
  statusPaneHeight: number;
  tmuxPaneSeparators: number;
  placeholderCommand: string;
}

export interface LaunchBubbleSessionLayoutResult {
  implementerPaneId: string;
  reviewerPaneId: string;
  metaReviewerPaneId: string;
}

function parseTmuxPaneId(stdout: string, command: string[]): string {
  const paneId = stdout.trim();
  if (!/^%[0-9]+$/u.test(paneId)) {
    throw new Error(
      `TMUX_PANE_ID_PARSE_FAILED: context operation_id=tmux_parse_pane_id command=${JSON.stringify(command)} stdout=${JSON.stringify(stdout)}.`
    );
  }
  return paneId;
}

export async function launchBubbleSessionLayout(
  input: LaunchBubbleSessionLayoutInput
): Promise<LaunchBubbleSessionLayoutResult> {
  const statusPane = `${input.sessionName}:0.0`;
  const implementerPane = `${input.sessionName}:0.1`;
  const reviewerPane = `${input.sessionName}:0.2`;
  await applyBubbleTmuxSessionFrameSetup({
    runner: input.runner,
    sessionName: input.sessionName,
    statusPaneLabel: input.statusPaneLabel,
    implementerPaneLabel: input.implementerPaneLabel,
    reviewerPaneLabel: input.reviewerPaneLabel,
    metaReviewerPaneLabel: input.metaReviewerPaneLabel
  });
  const implementerSplitCommand = [
    "split-window",
    "-v",
    "-P",
    "-F",
    "#{pane_id}",
    "-t",
    statusPane,
    "-c",
    input.workspacePath,
    input.placeholderCommand
  ];
  const implementerSplit = await input.runner(implementerSplitCommand);
  const implementerPaneId = parseTmuxPaneId(implementerSplit.stdout, implementerSplitCommand);
  await input.runner([
    "resize-pane",
    "-t",
    statusPane,
    "-y",
    String(input.statusPaneHeight)
  ]);
  const reviewerSplitCommand = [
    "split-window",
    "-v",
    "-P",
    "-F",
    "#{pane_id}",
    "-t",
    implementerPane,
    "-c",
    input.workspacePath,
    input.placeholderCommand
  ];
  const reviewerSplit = await input.runner(reviewerSplitCommand);
  const reviewerPaneId = parseTmuxPaneId(reviewerSplit.stdout, reviewerSplitCommand);
  const metaReviewerSplitCommand = [
    "split-window",
    "-v",
    "-P",
    "-F",
    "#{pane_id}",
    "-t",
    reviewerPane,
    "-c",
    input.workspacePath,
    input.placeholderCommand
  ];
  const metaReviewerSplit = await input.runner(metaReviewerSplitCommand);
  const metaReviewerPaneId = parseTmuxPaneId(metaReviewerSplit.stdout, metaReviewerSplitCommand);
  await input.runner([
    "resize-pane",
    "-t",
    statusPane,
    "-y",
    String(input.statusPaneHeight)
  ]);
  await applyBubbleTmuxSessionFrameHooks({
    runner: input.runner,
    sessionName: input.sessionName,
    statusPane,
    implementerPaneId,
    reviewerPaneId,
    metaReviewerPaneId,
    statusPaneHeight: input.statusPaneHeight,
    tmuxPaneSeparators: input.tmuxPaneSeparators
  });
  return {
    implementerPaneId,
    reviewerPaneId,
    metaReviewerPaneId
  };
}
