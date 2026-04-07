import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runTmux } from "../../../infrastructure/channel/tmux/tmuxManager.js";
import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage
} from "../../../infrastructure/channel/tmux/tmuxInput.js";
import { isNonEmptyString } from "../../validation/primitives.js";
import type {
  MetaReviewLiveRunnerInput,
  MetaReviewLiveRunnerOutput
} from "./metaReviewLiveRunContract.js";
import { runMetaReviewCommand } from "./metaReviewLiveRunnerCommand.js";
import {
  buildMetaReviewPaneMarkers,
  resolveMetaReviewRunnerTimeoutMs
} from "./metaReviewLiveRunnerConfig.js";
import {
  parseMetaReviewRunnerOutput,
  truncateForErrorOutput
} from "./metaReviewLiveRunnerParsing.js";
import {
  resolveMetaReviewerPaneTarget,
  waitForMetaReviewPaneOutput
} from "./metaReviewLiveRunnerPane.js";
import {
  buildCodexMetaReviewSchema,
  buildMetaReviewPrompt,
  buildPaneMetaReviewPrompt
} from "./metaReviewLiveRunnerPrompt.js";
import {
  buildCodexExecRunnerReport,
  buildCodexPaneRunnerReport
} from "./metaReviewLiveRunnerReport.js";

async function readAndParseMetaReviewOutputFile(outputPath: string): Promise<
  ReturnType<typeof parseMetaReviewRunnerOutput>
> {
  const rawOutput = await readFile(outputPath, "utf8");
  if (!isNonEmptyString(rawOutput)) {
    throw new Error("meta-review runner produced empty output.");
  }
  return parseMetaReviewRunnerOutput(rawOutput.trim());
}

export async function runCodexAgentLiveReview(
  input: MetaReviewLiveRunnerInput
): Promise<MetaReviewLiveRunnerOutput> {
  const scratchDir = await mkdtemp(
    join(tmpdir(), "pairflow-meta-review-runner-")
  );
  const schemaPath = join(scratchDir, "meta-review-output-schema.json");
  const outputPath = join(scratchDir, "meta-review-output.json");
  const timeoutMs = resolveMetaReviewRunnerTimeoutMs();
  try {
    await writeFile(schemaPath, buildCodexMetaReviewSchema(), "utf8");
    const prompt = buildMetaReviewPrompt(input);
    const commandResult = await runMetaReviewCommand({
      command: "codex",
      args: [
        "exec",
        "--cd",
        input.repoPath,
        "--sandbox",
        "read-only",
        "--ephemeral",
        "--add-dir",
        input.worktreePath,
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        prompt
      ],
      cwd: input.repoPath,
      timeoutMs
    });

    if (commandResult.exitCode !== 0) {
      const stderrTail = truncateForErrorOutput(commandResult.stderr, 1200);
      const stdoutTail = truncateForErrorOutput(commandResult.stdout, 1200);
      throw new Error(
        `meta-review runner command failed (exit ${commandResult.exitCode}). stderr=${JSON.stringify(stderrTail)} stdout=${JSON.stringify(stdoutTail)}`
      );
    }

    const parsed = await readAndParseMetaReviewOutputFile(outputPath);
    return {
      ...parsed,
      report_json: buildCodexExecRunnerReport(input)
    };
  } finally {
    await rm(scratchDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function runCodexPaneLiveReview(
  input: MetaReviewLiveRunnerInput
): Promise<MetaReviewLiveRunnerOutput> {
  const timeoutMs = resolveMetaReviewRunnerTimeoutMs();
  const targetPane = await resolveMetaReviewerPaneTarget({
    bubbleId: input.bubbleId,
    repoPath: input.repoPath
  });
  const markers = buildMetaReviewPaneMarkers(input.runId);

  await maybeAcceptClaudeTrustPrompt(runTmux, targetPane).catch(() => undefined);
  await sendAndSubmitTmuxPaneMessage(
    runTmux,
    targetPane,
    buildPaneMetaReviewPrompt(input)
  );

  const rawOutput = await waitForMetaReviewPaneOutput({
    targetPane,
    beginMarker: markers.beginMarker,
    endMarker: markers.endMarker,
    timeoutMs
  });
  const parsed = parseMetaReviewRunnerOutput(rawOutput);

  return {
    ...parsed,
    report_json: buildCodexPaneRunnerReport(input)
  };
}
