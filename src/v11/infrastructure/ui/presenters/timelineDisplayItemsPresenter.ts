import type {
  UiTimelineBadge,
  UiTimelineDisplayItem,
  UiTimelineDisplayTag,
  UiTimelineProgress
} from "../../../../contracts/ui/uiReadModel.js";
import type { TimelineEntryWithDisplay } from "./timelineDisplayPresenter.js";

function readDisplayBadgeLabel(
  entry: TimelineEntryWithDisplay,
  kind: UiTimelineBadge["kind"]
): string | null {
  const badge = entry.display.badges.find((candidate) => candidate.kind === kind);
  return badge?.label ?? null;
}

function hasDisplayGateFailureSplit(entry: TimelineEntryWithDisplay): boolean {
  return entry.display.validationFailure !== null && entry.display.syntheticApproval !== null;
}

function isMetaReviewHandoff(entry: TimelineEntryWithDisplay): boolean {
  return entry.type === "TASK" && entry.display.rowKind === "handoff";
}

interface TimelineDisplayItemBuildState {
  cleanRunsRequired: number;
  metaCleanRuns: number;
  metaRunPending: boolean;
}

function createDisplayItem(input: {
  entry: TimelineEntryWithDisplay;
  cleanRunTag: UiTimelineDisplayTag | null;
  gateFailed: boolean;
  synthetic?: boolean;
}): UiTimelineDisplayItem {
  const entry = input.entry;
  const syntheticApproval = input.synthetic === true
    ? entry.display.syntheticApproval
    : null;
  const sender =
    syntheticApproval !== null &&
    entry.display.role === "meta_reviewer" &&
    entry.display.senderLabel === "orchestrator"
      ? "meta-reviewer"
      : entry.display.senderLabel;
  const title = syntheticApproval?.label ?? entry.display.title;
  const summaryText = syntheticApproval?.label ?? entry.display.summaryText;
  return {
    id: syntheticApproval?.syntheticEntryId ?? entry.id,
    sourceEntryId: entry.id,
    ts: entry.ts,
    round: entry.round,
    role: input.gateFailed
      ? "system"
      : syntheticApproval !== null
        ? "meta_reviewer"
        : entry.display.role,
    senderLabel: input.gateFailed ? "orchestrator" : sender,
    title,
    summaryText,
    tone: input.gateFailed ? "danger" : syntheticApproval?.tone ?? entry.display.tone,
    badges: syntheticApproval !== null
      ? [{ kind: "recommendation", label: "approve", tone: "success" }]
      : entry.display.badges,
    cleanRunTag: input.cleanRunTag,
    gateFailed: input.gateFailed,
    blocked: !input.gateFailed && entry.display.rowKind === "blocked",
    convergence: entry.type === "CONVERGENCE"
  };
}

function readCleanRunProgress(entry: TimelineEntryWithDisplay): Extract<
  UiTimelineProgress,
  { kind: "clean_run" }
> | null {
  return entry.display.progress?.kind === "clean_run"
    ? entry.display.progress
    : null;
}

function updateDisplayStateForRecommendation(input: {
  entry: TimelineEntryWithDisplay;
  state: TimelineDisplayItemBuildState;
}): void {
  const metaRecommendation = readDisplayBadgeLabel(input.entry, "recommendation");
  const displayDecision = readDisplayBadgeLabel(input.entry, "decision");
  const cleanRunProgress = readCleanRunProgress(input.entry);

  if (cleanRunProgress !== null) {
    input.state.metaCleanRuns = cleanRunProgress.cleanRunCount;
    if (cleanRunProgress.cleanRunsRequired !== null) {
      input.state.cleanRunsRequired = cleanRunProgress.cleanRunsRequired;
    }
    input.state.metaRunPending = false;
    return;
  }

  if (metaRecommendation === "approve") {
    input.state.metaRunPending = false;
  } else if (
    metaRecommendation === "rework" ||
    metaRecommendation === "inconclusive" ||
    displayDecision === "rework"
  ) {
    input.state.metaCleanRuns = 0;
    input.state.metaRunPending = false;
  }
}

function cleanRunTagForEntry(input: {
  entry: TimelineEntryWithDisplay;
  rerunCleanRunCount: number | null;
  state: TimelineDisplayItemBuildState;
}): {
  tag: UiTimelineDisplayTag | null;
  badges: UiTimelineBadge[];
} {
  const cleanRunProgress = readCleanRunProgress(input.entry);
  const displayCleanRunCount = cleanRunProgress?.cleanRunCount ?? null;
  if (cleanRunProgress?.cleanRunsRequired !== null && cleanRunProgress?.cleanRunsRequired !== undefined) {
    input.state.cleanRunsRequired = cleanRunProgress.cleanRunsRequired;
  }
  const cleanRunCount = input.rerunCleanRunCount ?? displayCleanRunCount;
  const replaceApproveWithCleanRun =
    cleanRunCount !== null && cleanRunCount < input.state.cleanRunsRequired;
  const tag =
    (input.rerunCleanRunCount !== null || replaceApproveWithCleanRun) && cleanRunCount !== null
      ? {
          label: cleanRunProgress?.label ?? `clean ${cleanRunCount}`,
          tone: "success" as const
        }
      : null;
  const badges = replaceApproveWithCleanRun
    ? input.entry.display.badges.filter((badge) => !(
        badge.kind === "recommendation" && badge.label === "approve"
      ))
    : input.entry.display.badges;
  return { tag, badges };
}

export function buildTimelineDisplayItems(input: {
  entries: TimelineEntryWithDisplay[];
  cleanRunsRequired?: number | null | undefined;
}): UiTimelineDisplayItem[] {
  const state: TimelineDisplayItemBuildState = {
    cleanRunsRequired: input.cleanRunsRequired ?? 1,
    metaCleanRuns: 0,
    metaRunPending: false
  };
  const items: UiTimelineDisplayItem[] = [];

  for (const entry of input.entries) {
    if (hasDisplayGateFailureSplit(entry)) {
      items.push(createDisplayItem({
        entry,
        cleanRunTag: null,
        gateFailed: false,
        synthetic: true
      }));
      state.metaCleanRuns += 1;
      state.metaRunPending = false;

      items.push(createDisplayItem({
        entry,
        cleanRunTag: null,
        gateFailed: true
      }));
      state.metaCleanRuns = 0;
      continue;
    }

    if (isMetaReviewHandoff(entry)) {
      const handoffAttempt =
        entry.display.progress?.kind === "meta_review_handoff"
          ? entry.display.progress.handoffAttempt
          : null;
      if (handoffAttempt === null) {
        continue;
      }
      if (!state.metaRunPending) {
        if (handoffAttempt > 1) {
          const nextCleanRunCount = Math.max(state.metaCleanRuns + 1, handoffAttempt - 1);
          if (state.cleanRunsRequired > 1 && nextCleanRunCount < state.cleanRunsRequired) {
            state.metaCleanRuns = nextCleanRunCount;
            state.metaRunPending = true;
            items.push(createDisplayItem({
              entry,
              cleanRunTag: { label: `clean ${nextCleanRunCount}`, tone: "success" },
              gateFailed: false
            }));
          }
          continue;
        }
        state.metaRunPending = true;
        continue;
      }

      const nextCleanRunCount = Math.max(state.metaCleanRuns + 1, handoffAttempt - 1);
      if (state.cleanRunsRequired > 1 && nextCleanRunCount < state.cleanRunsRequired) {
        state.metaCleanRuns = nextCleanRunCount;
        state.metaRunPending = true;
        items.push(createDisplayItem({
          entry,
          cleanRunTag: { label: `clean ${nextCleanRunCount}`, tone: "success" },
          gateFailed: false
        }));
      }
      continue;
    }

    updateDisplayStateForRecommendation({ entry, state });
    const cleanRun = cleanRunTagForEntry({
      entry,
      rerunCleanRunCount: null,
      state
    });
    items.push({
      ...createDisplayItem({
        entry,
        cleanRunTag: cleanRun.tag,
        gateFailed: false
      }),
      badges: cleanRun.badges
    });
  }

  return items;
}
