import { readFile } from "node:fs/promises";

import { classifyCommitMessage } from "./commitMessagePolicy.js";

export async function validateCommitMessageFile(
  messageFilePath: string
): Promise<number> {
  const content = await readFile(messageFilePath, "utf8");
  const result = classifyCommitMessage(content);
  const output = [
    `commit-policy: ${result.status}`,
    `class: ${result.class}`,
    `reason_code: ${result.reason_code}`,
    result.message
  ].join("\n");

  if (result.status === "accepted") {
    console.log(output);
    return 0;
  }

  console.error(output);
  return 1;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const messageFilePath = args[0] === "--" ? args[1] : args[0];
  if (messageFilePath === undefined || messageFilePath.length === 0) {
    console.error(
      [
        "commit-policy: rejected",
        "reason_code: rejected_empty",
        "Missing commit message file path.",
        "See docs/commit-message-guidance.md."
      ].join("\n")
    );
    return 1;
  }

  try {
    return await validateCommitMessageFile(messageFilePath);
  } catch (error) {
    console.error(
      [
        "commit-policy: rejected",
        "reason_code: rejected_empty",
        `Unable to read commit message file: ${String(error)}`,
        "See docs/commit-message-guidance.md."
      ].join("\n")
    );
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}
