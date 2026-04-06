import { buildMetaReviewSubmitUsageLine } from "../../shared/metaReview/metaReviewSubmitGuidance.js";

export { parseBubbleMetaReviewCommandOptions } from "./metaReviewCliOptionParser.js";
export type {
  BubbleMetaReviewCommandOptions,
  BubbleMetaReviewHelpCommandOptions,
  BubbleMetaReviewLastReportCommandOptions,
  BubbleMetaReviewRecoverCommandOptions,
  BubbleMetaReviewStatusCommandOptions
} from "./metaReviewCliOptionTypes.js";

export function getBubbleMetaReviewHelpText(): string {
  return [
    "Usage:",
    "  Operator projection/recovery commands:",
    "  pairflow bubble meta-review status --id <id> [--repo <path>] [--json] [--verbose]",
    "  pairflow bubble meta-review last-report --id <id> [--repo <path>] [--json] [--verbose]",
    "  pairflow bubble meta-review recover --id <id> [--repo <path>] [--json]",
    "  Canonical actor submit:",
    `  ${buildMetaReviewSubmitUsageLine()}`,
    "  `status` and `last-report` are read-only projections; `recover` replays persisted snapshot routing only.",
    "  `pairflow bubble meta-review run` was removed; there is no operator live-run replacement.",
    "  Legacy `pairflow bubble meta-review submit` was removed; use the canonical actor emit command above.",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --json                Print structured JSON output",
    "  --verbose             Include additional detail in text output",
    "  -h, --help            Show this help"
  ].join("\n");
}
