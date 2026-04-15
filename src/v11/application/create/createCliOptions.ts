export { parseBubbleCreateCommandOptions } from "./createCliOptionParser.js";
export type { BubbleCreateCommandOptions } from "./createCliOptionTypes.js";

export function getBubbleCreateHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble create --id <id> --repo <path> --base <branch> --review-artifact-type <document|code> ((--task <text> | --task-file <path>) | --ideation)",
    "",
    "Options:",
    "  --id <id>             Bubble id (max 40 chars, e.g. b_feature_x_01)",
    "  --repo <path>         Repository path",
    "  --base <branch>       Base branch",
    "  --review-artifact-type <document|code>  Required explicit ownership type",
    "  --ideation            Create ideation bubble without task payload (requires explicit kickoff later)",
    "  --task <text>         Inline task text",
    "  --task-file <path>    Task input from file",
    "  --remote <alias>      Configure the bubble for remote execution using a global [remotes.<name>] alias",
    "  --bootstrap-command <cmd>    Optional worktree bootstrap command run by bubble start",
    "  --pairflow-command-profile <external|self_host>  Pairflow CLI command profile (default: external)",
    "  --reviewer-brief <text>      Optional inline reviewer brief",
    "  --reviewer-brief-file <path> Optional reviewer brief from file",
    "  --accuracy-critical          Enforce reviewer verification payload gate",
    "  -h, --help            Show this help"
  ].join("\n");
}
