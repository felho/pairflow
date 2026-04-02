import type {
  MetaReviewLastReportViewV11 as MetaReviewLastReportView,
  MetaReviewRunResultV11 as MetaReviewRunResult,
  MetaReviewStatusViewV11 as MetaReviewStatusView
} from "./emitMetaReviewV11.js";
import type { MetaReviewGateResultV11 as MetaReviewGateResult } from "../metaReviewGate/emitMetaReviewGateV11.js";
import type { BubbleMetaReviewCommandOptions } from "./metaReviewCliOptions.js";

export type BubbleMetaReviewCommandResult =
  | {
    command: "run";
    run: MetaReviewRunResult;
  }
  | {
    command: "status";
    status: MetaReviewStatusView;
  }
  | {
    command: "last-report";
    lastReport: MetaReviewLastReportView;
  }
  | {
    command: "recover";
    recover: MetaReviewGateResult;
  };

export type BubbleMetaReviewExecutableCommandOptions = Exclude<
  BubbleMetaReviewCommandOptions,
  { help: true }
>;
