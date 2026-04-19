import { readFile } from "node:fs/promises";

import {
  metaReviewGateDependencyDefaults as metaReviewGateDependencyDefaultsV11,
  type MetaReviewGateDependencyDefaults
} from "../../defaults/metaReviewGate/metaReviewGateCommandDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../shared/transcript/transcriptDependencyDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";

let metaReviewGateDependencyDefaultsPromise:
  | Promise<MetaReviewGateDependencyDefaults>
  | undefined;

export type { MetaReviewGateDependencyDefaults };

export async function loadMetaReviewGateDependencyDefaults(): Promise<
  MetaReviewGateDependencyDefaults
> {
  metaReviewGateDependencyDefaultsPromise ??= Promise.resolve({
    ...metaReviewGateDependencyDefaultsV11,
    appendProtocolEnvelope,
    readFile,
    readTranscriptEnvelopes,
    readStateSnapshot,
    writeStateSnapshot
  });
  return metaReviewGateDependencyDefaultsPromise;
}
