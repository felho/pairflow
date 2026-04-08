import { join } from "node:path";

import { resolveArchiveRootPath } from "../../archive/archivePaths.js";
import type {
  MetricsReportArchiveContext,
  MetricsReportWarningCounts
} from "../../../../shared/metrics/report/types.js";
import { loadArchiveReportContext } from "./archiveContextLoader.js";

export interface ReadArchiveReportContextInput {
  archiveRootPath?: string;
  repoPath?: string;
}

export interface ReadArchiveReportContextResult {
  context: MetricsReportArchiveContext;
  warningCounts: MetricsReportWarningCounts;
}

export async function readArchiveReportContext(
  input: ReadArchiveReportContextInput = {}
): Promise<ReadArchiveReportContextResult> {
  const warningCounts: MetricsReportWarningCounts = {};
  const archiveRootPath = input.archiveRootPath ?? resolveArchiveRootPath();
  const indexPath = join(archiveRootPath, "index.json");
  const context = await loadArchiveReportContext({
    indexPath,
    warningCounts,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {})
  });

  return {
    context,
    warningCounts
  };
}
