export { parseBubbleMetaReviewCommandOptions } from "./metaReviewCliOptionParser.js";
export type {
  BubbleMetaReviewCommandOptions,
  BubbleMetaReviewHelpCommandOptions,
  BubbleMetaReviewLastReportCommandOptions,
  BubbleMetaReviewRecoverCommandOptions,
  BubbleMetaReviewRunCommandOptions,
  BubbleMetaReviewStatusCommandOptions,
  BubbleMetaReviewSubmitCommandOptions
} from "./metaReviewCliOptionTypes.js";

export function getBubbleMetaReviewHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble meta-review run --id <id> [--repo <path>] [--depth standard|deep] [--json]",
    "  pairflow bubble meta-review status --id <id> [--repo <path>] [--json] [--verbose]",
    "  pairflow bubble meta-review last-report --id <id> [--repo <path>] [--json] [--verbose]",
    "  pairflow bubble meta-review recover --id <id> [--repo <path>] [--json]",
    "  pairflow bubble meta-review submit --id <id> --round <n> --recommendation approve|rework|inconclusive --summary <text> [--rework-target-message <text>] --report-json <json> [--repo <path>] [--json]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --depth <value>       run-only depth profile: standard|deep (default: standard)",
    "  --round <n>           submit-only round number (must equal active round)",
    "  --recommendation <v>  submit-only recommendation: approve|rework|inconclusive",
    "  --summary <text>      submit-only summary text",
    "  --rework-target-message <text>  submit-only rework target message",
    "  --report-json <json>  submit-only required report JSON object",
    "  --json                Print structured JSON output",
    "  --verbose             Include additional detail in text output",
    "  -h, --help            Show this help"
  ].join("\n");
}
