export interface CheckKickoffStateFingerprintConflictInput {
  statePath: string;
  loadedFingerprint: string;
  readState: (
    statePath: string
  ) => Promise<{
    fingerprint: string;
  }>;
}

export async function hasKickoffStateFingerprintConflict(
  input: CheckKickoffStateFingerprintConflictInput
): Promise<boolean> {
  const latestState = await input.readState(input.statePath);
  return latestState.fingerprint !== input.loadedFingerprint;
}
