import { parseArgs } from "node:util";

import {
  asAttachBubbleErrorV11,
  attachBubbleV11,
  type AttachBubbleV11Dependencies,
  type AttachBubbleV11Result
} from "./emitAttachV11.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDependencyDefaults.js";

export interface BubbleAttachCommandOptions {
  id: string;
  repo?: string;
  portForward?: number[];
  help: false;
}

export interface BubbleAttachHelpCommandOptions {
  help: true;
}

export type ParsedBubbleAttachCommandOptions =
  | BubbleAttachCommandOptions
  | BubbleAttachHelpCommandOptions;

export interface BubbleAttachCommandDependencies
  extends Partial<AttachBubbleV11Dependencies> {
  attachBubble?: typeof attachBubbleV11;
}

function parsePortForwardValues(
  rawValues: string[] | undefined
): number[] | undefined {
  if (rawValues === undefined || rawValues.length === 0) {
    return undefined;
  }

  const ports = rawValues.map((rawValue) => {
    if (!/^\d+$/u.test(rawValue)) {
      throw new Error(
        `ATTACH_PORT_FORWARD_INVALID: Invalid --port-forward value "${rawValue}". Expected integer TCP port in range 1-65535. context: command_name=attach port_forward_value=${rawValue}.`
      );
    }
    const port = Number.parseInt(rawValue, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      throw new Error(
        `ATTACH_PORT_FORWARD_INVALID: Invalid --port-forward value "${rawValue}". Expected integer TCP port in range 1-65535. context: command_name=attach port_forward_value=${rawValue}.`
      );
    }
    return port;
  });

  return [...new Set(ports)].sort((left, right) => left - right);
}

export function getBubbleAttachHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble attach --id <id> [--repo <path>] [--port-forward <port>...]",
    "",
    "Options:",
    "  --id <id>                   Bubble id",
    "  --repo <path>               Optional repository path (defaults to cwd ancestry lookup)",
    "  --port-forward <port>       Repeatable local port forward override for remote attach",
    "  -h, --help                  Show this help",
    "",
    "Notes:",
    "  Local bubbles retain tmux attach behavior.",
    "  Remote bubbles use the persisted started pointer; --port-forward overrides pointer defaults for this CLI invocation only."
  ].join("\n");
}

export function parseBubbleAttachCommandOptions(
  args: string[]
): ParsedBubbleAttachCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      "port-forward": {
        type: "string",
        multiple: true
      },
      help: {
        type: "boolean",
        short: "h"
      }
    },
    strict: true,
    allowPositionals: false
  });

  if (parsed.values.help ?? false) {
    return { help: true };
  }

  const id = parsed.values.id;
  if (id === undefined) {
    throw new Error(
      "ATTACH_ID_REQUIRED: Missing required option: --id. context: command_name=attach."
    );
  }

  const portForward = parsePortForwardValues(parsed.values["port-forward"]);

  return {
    id,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    ...(portForward !== undefined ? { portForward } : {}),
    help: false
  };
}

export async function runBubbleAttachCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleAttachCommandDependencies = {}
): Promise<AttachBubbleV11Result | null> {
  const options = parseBubbleAttachCommandOptions(args);
  if (options.help) {
    return null;
  }

  const runAttachBubble = dependencies.attachBubble ?? attachBubbleV11;
  const attachDependencies: AttachBubbleV11Dependencies = {
    ...(dependencies.executeAttachCommand !== undefined
      ? { executeAttachCommand: dependencies.executeAttachCommand }
      : {}),
    ...(dependencies.checkTmuxSessionExists !== undefined
      ? { checkTmuxSessionExists: dependencies.checkTmuxSessionExists }
      : {}),
    ...(dependencies.writeYamlFile !== undefined
      ? { writeYamlFile: dependencies.writeYamlFile }
      : {}),
    ...(dependencies.checkLauncherAvailability !== undefined
      ? { checkLauncherAvailability: dependencies.checkLauncherAvailability }
      : {}),
    ...(dependencies.loadPairflowGlobalConfig !== undefined
      ? { loadPairflowGlobalConfig: dependencies.loadPairflowGlobalConfig }
      : {}),
    ...(dependencies.readRemotePointer !== undefined
      ? { readRemotePointer: dependencies.readRemotePointer }
      : {}),
    resolveBubbleById: dependencies.resolveBubbleById ?? resolveBubbleById
  };
  try {
    return await runAttachBubble(
      {
        bubbleId: options.id,
        ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
        cwd,
        ...(options.portForward !== undefined
          ? { portForwards: options.portForward }
          : {})
      },
      attachDependencies
    );
  } catch (error) {
    asAttachBubbleErrorV11(error);
  }
}
