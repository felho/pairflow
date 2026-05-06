import { readTranscriptEnvelopes } from "../transcript/transcriptDependencyDefaults.js";
import {
  resolveLatestSameRoundReviewerSnapshot,
  type LatestSameRoundReviewerSnapshot
} from "../../domain/metaReviewGate/reviewerSnapshot.js";

export type {
  LatestSameRoundReviewerSnapshot
} from "../../domain/metaReviewGate/reviewerSnapshot.js";

export async function readLatestSameRoundReviewerSnapshotFromTranscript(
  transcriptPath: string,
  round: number,
  dependencies: {
    readTranscriptEnvelopes?: typeof readTranscriptEnvelopes;
  } = {}
): Promise<LatestSameRoundReviewerSnapshot | undefined> {
  const readTranscript =
    dependencies.readTranscriptEnvelopes ?? readTranscriptEnvelopes;
  const transcript = await readTranscript(transcriptPath, {
    allowMissing: true
  });
  return resolveLatestSameRoundReviewerSnapshot(transcript, round);
}
