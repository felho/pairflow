import { describe, expect, it } from "vitest";

import { executeAskHumanExecution } from "../../../../src/v11/application/askHuman/askHumanExecution.js";

class AskHumanExecutionTestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanExecutionTestError";
  }
}

describe("executeAskHumanExecution", () => {
  it("appends HUMAN_QUESTION and persists WAITING_HUMAN transition", async () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const callOrder: string[] = [];

    const result = await executeAskHumanExecution(
      {
        now,
        routing: {
          nowIso: now.toISOString(),
          question: "Need migration decision?",
          refs: ["artifact://analysis.md"],
          resolved: {
            bubbleId: "b_ask_human_01",
            bubblePaths: {
              locksDir: "/repo/.pairflow/bubbles/b_ask_human_01/locks",
              transcriptPath: "/repo/.pairflow/bubbles/b_ask_human_01/transcript.ndjson",
              inboxPath: "/repo/.pairflow/bubbles/b_ask_human_01/inbox.ndjson",
              statePath: "/repo/.pairflow/bubbles/b_ask_human_01/state.json"
            }
          } as never,
          loadedState: {
            fingerprint: "fp_running_01"
          } as never,
          state: {
            state: "RUNNING",
            round: 2,
            active_agent: "codex",
            active_role: "implementer",
            active_since: "2026-02-21T12:00:00.000Z"
          } as never
        } as never,
        createError: (message) => new AskHumanExecutionTestError(message)
      },
      {
        appendProtocolEnvelope: async (input) => {
          callOrder.push("appendProtocolEnvelope");
          expect(input.lockPath).toBe(
            "/repo/.pairflow/bubbles/b_ask_human_01/locks/b_ask_human_01.lock"
          );
          expect(input.envelope.payload.question).toBe("Need migration decision?");
          return {
            envelope: {
              id: "msg_20260221_001"
            },
            sequence: 3
          } as never;
        },
        applyStateTransition: (state, transition) => {
          callOrder.push("applyStateTransition");
          expect(state.state).toBe("RUNNING");
          expect(transition).toEqual({
            to: "WAITING_HUMAN",
            lastCommandAt: "2026-02-21T12:10:00.000Z"
          });
          return {
            state: "WAITING_HUMAN"
          } as never;
        },
        writeStateSnapshot: async (statePath, state, options) => {
          callOrder.push("writeStateSnapshot");
          expect(statePath).toBe("/repo/.pairflow/bubbles/b_ask_human_01/state.json");
          expect(state.state).toBe("WAITING_HUMAN");
          expect(options).toEqual({
            expectedFingerprint: "fp_running_01",
            expectedState: "RUNNING"
          });
          return {
            state: {
              state: "WAITING_HUMAN"
            }
          } as never;
        }
      }
    );

    expect(callOrder).toEqual([
      "appendProtocolEnvelope",
      "applyStateTransition",
      "writeStateSnapshot"
    ]);
    expect(result).toMatchObject({
      appended: {
        envelope: {
          id: "msg_20260221_001"
        },
        sequence: 3
      },
      written: {
        state: {
          state: "WAITING_HUMAN"
        }
      }
    });
  });

  it("maps state write failures to transcript-first recovery error", async () => {
    await expect(
      executeAskHumanExecution(
        {
          now: new Date("2026-02-21T12:10:00.000Z"),
          routing: {
            nowIso: "2026-02-21T12:10:00.000Z",
            question: "Need input",
            refs: [],
            resolved: {
              bubbleId: "b_ask_human_02",
              bubblePaths: {
                locksDir: "/repo/.pairflow/bubbles/b_ask_human_02/locks",
                transcriptPath: "/repo/.pairflow/bubbles/b_ask_human_02/transcript.ndjson",
                inboxPath: "/repo/.pairflow/bubbles/b_ask_human_02/inbox.ndjson",
                statePath: "/repo/.pairflow/bubbles/b_ask_human_02/state.json"
              }
            } as never,
            loadedState: {
              fingerprint: "fp_running_02"
            } as never,
            state: {
              state: "RUNNING",
              round: 2,
              active_agent: "codex",
              active_role: "implementer",
              active_since: "2026-02-21T12:00:00.000Z"
            } as never
          } as never,
          createError: (message) => new AskHumanExecutionTestError(message)
        },
        {
          appendProtocolEnvelope: async () =>
            ({
              envelope: {
                id: "msg_20260221_777"
              },
              sequence: 3
            }) as never,
          applyStateTransition: (state) => state,
          writeStateSnapshot: async () => {
            throw new Error("State fingerprint mismatch; possible concurrent update.");
          }
        }
      )
    ).rejects.toMatchObject({
      name: "AskHumanExecutionTestError",
      message:
        "HUMAN_QUESTION msg_20260221_777 was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: State fingerprint mismatch; possible concurrent update."
    });
  });
});
