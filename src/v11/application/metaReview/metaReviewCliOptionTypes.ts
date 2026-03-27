import type { MetaReviewDepthV11 as MetaReviewDepth } from "./emitMetaReviewV11.js";
import type { MetaReviewSubmissionPayload } from "../../../types/protocol.js";

interface BubbleMetaReviewCommandBase {
  id: string;
  repo?: string;
  json: boolean;
  verbose: boolean;
  help: false;
}

export interface BubbleMetaReviewRunCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "run";
  depth: MetaReviewDepth;
}

export interface BubbleMetaReviewStatusCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "status";
}

export interface BubbleMetaReviewLastReportCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "last-report";
}

export interface BubbleMetaReviewRecoverCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "recover";
}

export interface BubbleMetaReviewSubmitCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "submit";
  round: number;
  recommendation: MetaReviewSubmissionPayload["recommendation"];
  summary: string;
  reworkTargetMessage: string | null;
  reportJson: Record<string, unknown>;
}

export interface BubbleMetaReviewHelpCommandOptions {
  help: true;
}

export type BubbleMetaReviewCommandOptions =
  | BubbleMetaReviewRunCommandOptions
  | BubbleMetaReviewStatusCommandOptions
  | BubbleMetaReviewLastReportCommandOptions
  | BubbleMetaReviewRecoverCommandOptions
  | BubbleMetaReviewSubmitCommandOptions
  | BubbleMetaReviewHelpCommandOptions;
