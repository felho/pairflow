import { buildMetaReviewSubmitUsageLine } from "../../../core/runtime/metaReviewSubmitGuidance.js";

export { parseBubbleMetaReviewCommandOptions } from "./metaReviewCliOptionParser.js";
export type {
  BubbleMetaReviewCommandOptions,
  BubbleMetaReviewHelpCommandOptions,
  BubbleMetaReviewLastReportCommandOptions,
  BubbleMetaReviewRecoverCommandOptions,
  BubbleMetaReviewRunCommandOptions,
  BubbleMetaReviewStatusCommandOptions
} from "./metaReviewCliOptionTypes.js";

export function getBubbleMetaReviewHelpText(): string {
  return [
    "Usage:",
    "  Operator commands:",
    "  pairflow bubble meta-review run --id <id> [--repo <path>] [--depth standard|deep] [--json]",
    "  pairflow bubble meta-review status --id <id> [--repo <path>] [--json] [--verbose]",
    "  pairflow bubble meta-review last-report --id <id> [--repo <path>] [--json] [--verbose]",
    "  pairflow bubble meta-review recover --id <id> [--repo <path>] [--json]",
    "  Canonical actor submit (Phase 4):",
    `  ${buildMetaReviewSubmitUsageLine()}`,
    "  Legacy `pairflow bubble meta-review submit` was removed; use the canonical actor emit command above.",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --depth <value>       run-only depth profile: standard|deep (default: standard)",
    "  --json                Print structured JSON output",
    "  --verbose             Include additional detail in text output",
    "  -h, --help            Show this help"
  ].join("\n");
}
