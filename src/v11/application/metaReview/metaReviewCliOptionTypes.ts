interface BubbleMetaReviewCommandBase {
  id: string;
  repo?: string;
  json: boolean;
  verbose: boolean;
  help: false;
}

export interface BubbleMetaReviewStatusCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "status";
}

export interface BubbleMetaReviewLastReportCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "last-report";
}

export interface BubbleMetaReviewHelpCommandOptions {
  help: true;
}

export type BubbleMetaReviewCommandOptions =
  | BubbleMetaReviewStatusCommandOptions
  | BubbleMetaReviewLastReportCommandOptions
  | BubbleMetaReviewHelpCommandOptions;
