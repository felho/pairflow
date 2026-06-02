export type UiServiceStatus =
  | "running"
  | "stopped"
  | "stale"
  | "invalid"
  | "unmanaged";

export type UiServiceReasonCode =
  | "ui_service_already_running"
  | "ui_service_started"
  | "ui_service_stopped"
  | "ui_service_not_running"
  | "ui_service_stale_state"
  | "ui_service_invalid_state"
  | "ui_service_unmanaged_port"
  | "ui_service_identity_mismatch"
  | "ui_service_start_failed"
  | "ui_service_stop_failed";

export interface UiServiceState {
  pid: number;
  repoPath: string;
  host: string;
  port: number;
  url: string;
  startedAt: string;
  command: string[];
  cwd: string;
  executablePath: string;
  processStartTime: string;
  identityToken: string;
  stateVersion: 1;
}

export interface UiServiceStateReadResult {
  statePath: string;
  state: UiServiceState | null;
  invalidReason?: string | undefined;
}

export interface UiServiceProcessInfo {
  pid: number;
  command: string;
  processStartTime: string;
}

export interface UiServiceSpawnInput {
  command: string[];
  cwd: string;
  env: Record<string, string | undefined>;
  host: string;
  port: number;
}

export interface UiServiceSpawnResult {
  pid: number;
  processStartTime: string;
}

export interface UiServiceProcessStore {
  resolveStatePath(repoPath: string): string;
  withStateLock<T>(statePath: string, operation: () => Promise<T>): Promise<T>;
  waitForStateUnlock(statePath: string): Promise<boolean>;
  readState(statePath: string): Promise<UiServiceStateReadResult>;
  writeState(statePath: string, state: UiServiceState): Promise<void>;
  removeState(statePath: string): Promise<void>;
  inspectProcess(pid: number): Promise<UiServiceProcessInfo | null>;
  spawnService(input: UiServiceSpawnInput): Promise<UiServiceSpawnResult>;
  stopProcess(pid: number, expectedState?: UiServiceState): Promise<void>;
  isPortOpen(host: string, port: number): Promise<boolean>;
}
