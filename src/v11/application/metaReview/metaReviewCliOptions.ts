import { buildMetaReviewSubmitUsageLine } from "../../shared/metaReview/metaReviewSubmitGuidance.js";

export { parseBubbleMetaReviewCommandOptions } from "./metaReviewCliOptionParser.js";
export type {
  BubbleMetaReviewCommandOptions,
  BubbleMetaReviewHelpCommandOptions,
  BubbleMetaReviewLastReportCommandOptions,
  BubbleMetaReviewStatusCommandOptions
} from "./metaReviewCliOptionTypes.js";

export function getBubbleMetaReviewHelpText(): string {
  return [
    "Usage:",
    "  Operator projection commands:",
    "  pairflow bubble meta-review status --id <id> [--repo <path>] [--json] [--verbose]",
    "  pairflow bubble meta-review last-report --id <id> [--repo <path>] [--json] [--verbose]",
    "  Canonical actor submit:",
    `  ${buildMetaReviewSubmitUsageLine()}`,
    "  `status` and `last-report` are read-only projections.",
    "  If a meta-review gate stalls after snapshot persistence, use `pairflow bubble restart --id <id>` or trigger a fresh meta-review run through the active workflow.",
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
