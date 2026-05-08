import { afterEach, describe, expect, it, vi } from "vitest";

import { AskHumanCommandError } from "../../src/v11/application/askHuman/askHumanCommandApi.js";
import * as actorEmitContextModule from "../../src/v11/shared/actorProtocol/actorEmitContext.js";
import * as actorProtocolModule from "../../src/v11/application/actorProtocol/emitActorProtocolV11.js";
import {
  getAskHumanHelpText,
  parseAskHumanCommandOptions,
  runAskHumanCommand
} from "../../src/cli/commands/agent/askHuman.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseAskHumanCommandOptions", () => {
  it("parses question and refs", () => {
    const parsed = parseAskHumanCommandOptions([
      "--question",
      "Need decision",
      "--ref",
      "artifact://notes/1.md",
      "--ref",
      "artifact://notes/2.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated ask-human options");
    }

    expect(parsed.question).toBe("Need decision");
    expect(parsed.refs).toEqual([
      "artifact://notes/1.md",
      "artifact://notes/2.md"
    ]);
  });

  it("supports help", () => {
    const parsed = parseAskHumanCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getAskHumanHelpText()).toContain("pairflow agent emit --kind human_question");
    expect(getAskHumanHelpText()).toContain("--execution-id <id>");
    expect(getAskHumanHelpText()).toContain("pairflow ask-human");
  });

  it("requires --question", () => {
    expect(() => parseAskHumanCommandOptions([])).toThrow(/--question/u);
  });
});

describe("runAskHumanCommand", () => {
  it("returns null on help", async () => {
    const result = await runAskHumanCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("fails closed with removal guidance instead of invoking the legacy ask-human flow", async () => {
    const resolveSpy = vi.spyOn(
      actorEmitContextModule,
      "resolveCompatActorEmitContextFromWorkspace"
    );
    const emitSpy = vi.spyOn(
      actorProtocolModule,
      "emitActorProtocolFromWorkspaceV11"
    );

    expect(() =>
      runAskHumanCommand(
        ["--question", "Need decision"],
        "/tmp/pairflow-repo"
      )
    ).toThrowError(AskHumanCommandError);
    expect(() =>
      runAskHumanCommand(
        ["--question", "Need decision"],
        "/tmp/pairflow-repo"
      )
    ).toThrow(/LEGACY_COMMAND_REMOVED/u);
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it("fails closed with removal guidance even when legacy args are missing", async () => {
    expect(() => runAskHumanCommand([], "/tmp/pairflow-repo")).toThrowError(
      AskHumanCommandError
    );
    expect(() => runAskHumanCommand([], "/tmp/pairflow-repo")).toThrow(
      /LEGACY_COMMAND_REMOVED/u
    );
  });
});
