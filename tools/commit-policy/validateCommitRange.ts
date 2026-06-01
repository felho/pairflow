import { spawnSync } from "node:child_process";

import {
  classifyCommitMessage,
  type CommitMessagePolicyResult
} from "./commitMessagePolicy.js";

export type CommitRangeValidationReasonCode =
  | "range_validated"
  | "range_contains_invalid_commit"
  | "rejected_missing_safe_range";

export type CommitRangeValidationEntry = {
  sha: string;
  header: string;
  result: CommitMessagePolicyResult;
};

export type CommitRangeValidationResult = {
  status: "validated" | "failed" | "not_validated";
  reason_code: CommitRangeValidationReasonCode;
  from?: string;
  to?: string;
  commits: CommitRangeValidationEntry[];
  message: string;
};

export type CommitRangeEndpoints = {
  from?: string;
  to?: string;
};

export function parseCommitRangeArgs(args: readonly string[]): CommitRangeEndpoints {
  const endpoints: CommitRangeEndpoints = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--from") {
      const value = args[index + 1];
      if (value !== undefined) {
        endpoints.from = value;
      }
      index += 1;
      continue;
    }
    if (arg === "--to") {
      const value = args[index + 1];
      if (value !== undefined) {
        endpoints.to = value;
      }
      index += 1;
    }
  }
  return endpoints;
}

function readCommitHeaders(from: string, to: string): CommitRangeValidationEntry[] {
  const gitResult = spawnSync(
    "git",
    ["log", "--format=%H%x00%B%x1e", `${from}..${to}`],
    { encoding: "utf8" }
  );
  if (gitResult.status !== 0) {
    throw new Error((gitResult.stderr || gitResult.stdout).trim());
  }

  return gitResult.stdout
    .split("\u001e")
    .map((record) => record.trim())
    .filter((record) => record.length > 0)
    .map((record) => {
      const separatorIndex = record.indexOf("\0");
      const sha = separatorIndex === -1 ? record : record.slice(0, separatorIndex);
      const message = separatorIndex === -1 ? "" : record.slice(separatorIndex + 1);
      const header = message.split(/\r?\n/u, 1)[0] ?? "";
      return {
        sha,
        header,
        result: classifyCommitMessage(message)
      };
    });
}

export function validateCommitRange(
  endpoints: CommitRangeEndpoints
): CommitRangeValidationResult {
  if (!endpoints.from || !endpoints.to) {
    return {
      status: "failed",
      reason_code: "rejected_missing_safe_range",
      commits: [],
      message:
        "Commit range was not validated: explicit --from and --to safe range endpoints are required."
    };
  }

  let commits: CommitRangeValidationEntry[];
  try {
    commits = readCommitHeaders(endpoints.from, endpoints.to);
  } catch (error) {
    return {
      status: "failed",
      reason_code: "rejected_missing_safe_range",
      from: endpoints.from,
      to: endpoints.to,
      commits: [],
      message: `Commit range was not validated: explicit safe range could not be resolved. ${String(error)}`
    };
  }

  if (commits.length === 0) {
    return {
      status: "failed",
      reason_code: "rejected_missing_safe_range",
      from: endpoints.from,
      to: endpoints.to,
      commits,
      message:
        "Commit range was not validated: explicit safe range contained no commits to check."
    };
  }

  const invalidCommits = commits.filter((entry) => entry.result.status === "rejected");
  if (invalidCommits.length > 0) {
    return {
      status: "failed",
      reason_code: "range_contains_invalid_commit",
      from: endpoints.from,
      to: endpoints.to,
      commits,
      message: `Commit range contains ${invalidCommits.length} invalid commit message(s).`
    };
  }

  return {
    status: "validated",
    reason_code: "range_validated",
    from: endpoints.from,
    to: endpoints.to,
    commits,
    message: `Commit range validated: ${commits.length} commit(s) checked.`
  };
}

export function formatCommitRangeValidationResult(
  result: CommitRangeValidationResult
): string {
  const lines = [
    `commit-policy range: ${result.status}`,
    `reason_code: ${result.reason_code}`,
    result.message
  ];

  if (result.status === "failed" && result.reason_code === "range_contains_invalid_commit") {
    for (const entry of result.commits) {
      if (entry.result.status === "rejected") {
        lines.push(
          `${entry.sha.slice(0, 12)} ${entry.header}`,
          `  class: ${entry.result.class}`,
          `  reason_code: ${entry.result.reason_code}`,
          `  ${entry.result.message}`
        );
      }
    }
  }

  return lines.join("\n");
}

function main(): number {
  const args = process.argv.slice(2);
  const result = validateCommitRange(
    parseCommitRangeArgs(args[0] === "--" ? args.slice(1) : args)
  );
  const output = formatCommitRangeValidationResult(result);
  if (result.status === "validated") {
    console.log(output);
    return 0;
  }
  console.error(output);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
