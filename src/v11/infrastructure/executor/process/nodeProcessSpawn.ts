import { spawn } from "node:child_process";

import type {
  ProcessSpawnChild,
  ProcessSpawnOptions,
  ProcessSpawnPort
} from "../../../shared/ports/processSpawn.js";

export const nodeProcessSpawn: ProcessSpawnPort = (
  command: string,
  args: readonly string[],
  options: ProcessSpawnOptions = {}
): ProcessSpawnChild =>
  spawn(command, [...args], options) as ProcessSpawnChild;
