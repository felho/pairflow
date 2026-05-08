export type ProcessSpawnStdio =
  | "pipe"
  | "ignore"
  | "inherit"
  | [
      "pipe" | "ignore" | "inherit",
      "pipe" | "ignore" | "inherit",
      "pipe" | "ignore" | "inherit"
    ];

export interface ProcessSpawnOptions {
  cwd?: string | undefined;
  env?: NodeJS.ProcessEnv | undefined;
  stdio?: ProcessSpawnStdio | undefined;
}

export type ProcessSpawnReadable = NodeJS.ReadableStream;

export type ProcessSpawnWritable = NodeJS.WritableStream;

export interface ProcessSpawnChild {
  stdin: ProcessSpawnWritable | null;
  stdout: ProcessSpawnReadable | null;
  stderr: ProcessSpawnReadable | null;
  kill(signal?: NodeJS.Signals | number): boolean;
  on(event: "close", listener: (exitCode: number | null) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  once(event: "close", listener: (exitCode: number | null) => void): this;
  once(event: "error", listener: (error: Error) => void): this;
}

export interface ProcessSpawnPipeChild extends ProcessSpawnChild {
  stdin: ProcessSpawnWritable;
  stdout: ProcessSpawnReadable;
  stderr: ProcessSpawnReadable;
}

export type ProcessSpawnPort = (
  command: string,
  args: readonly string[],
  options?: ProcessSpawnOptions
) => ProcessSpawnChild;
