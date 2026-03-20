export function buildKickoffWriteStateOptions(input: {
  expectedFingerprint: string;
}): {
  expectedFingerprint: string;
  expectedState: "RUNNING";
} {
  return {
    expectedFingerprint: input.expectedFingerprint,
    expectedState: "RUNNING"
  };
}
