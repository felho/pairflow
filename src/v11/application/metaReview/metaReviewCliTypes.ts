import type {
  MetaReviewLastReportViewV11 as MetaReviewLastReportView,
  MetaReviewStatusViewV11 as MetaReviewStatusView
} from "./emitMetaReviewV11.js";
import type { BubbleMetaReviewCommandOptions } from "./metaReviewCliOptions.js";

export type BubbleMetaReviewCommandResult =
  | {
    command: "status";
    status: MetaReviewStatusView;
  }
  | {
    command: "last-report";
    lastReport: MetaReviewLastReportView;
  };

export type BubbleMetaReviewExecutableCommandOptions = Exclude<
  BubbleMetaReviewCommandOptions,
  { help: true }
>;
