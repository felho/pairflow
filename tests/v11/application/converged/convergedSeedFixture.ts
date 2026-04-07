import { emitPassFromWorkspace } from "../../../../src/v11/application/pass/passCommandOrchestration.js";

export async function seedConvergedCandidate(cwd: string): Promise<void> {
  await emitPassFromWorkspace({
    summary: "Implementation pass 1",
    cwd,
    now: new Date("2026-02-22T09:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 1 clean",
    noFindings: true,
    cwd,
    now: new Date("2026-02-22T09:02:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 2",
    cwd,
    now: new Date("2026-02-22T09:03:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 2 findings",
    findings: [
      {
        severity: "P2",
        title: "Round-2 non-blocking follow-up"
      }
    ],
    cwd,
    now: new Date("2026-02-22T09:03:10.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 3",
    cwd,
    now: new Date("2026-02-22T09:03:20.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 3 clean",
    noFindings: true,
    cwd,
    now: new Date("2026-02-22T09:03:30.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 4",
    cwd,
    now: new Date("2026-02-22T09:03:40.000Z")
  });
}
