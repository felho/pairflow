import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { assertContractCaseShape, type ContractCase } from "./schema.js";

export interface ContractRunner<TOutput> {
  run(caseDef: ContractCase): Promise<TOutput>;
}

export interface ContractRunResult<TOutput = unknown> {
  caseDef: ContractCase;
  output: TOutput;
}

export async function readContractCase(casePath: string): Promise<ContractCase> {
  const absolutePath = resolve(casePath);
  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  assertContractCaseShape(parsed);
  return parsed;
}

export async function runContractCase<TOutput>(
  runner: ContractRunner<TOutput>,
  casePath: string
): Promise<ContractRunResult<TOutput>> {
  const caseDef = await readContractCase(casePath);
  const output = await runner.run(caseDef);
  return {
    caseDef,
    output
  };
}
