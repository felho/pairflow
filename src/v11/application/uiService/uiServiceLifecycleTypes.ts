import type {
  UiServiceReasonCode,
  UiServiceStatus
} from "../../ports/uiServiceProcessStore.js";

export type UiServiceCommand = "start" | "stop" | "status" | "restart";

export interface UiServiceCommandOptions {
  command: UiServiceCommand;
  repoPath: string;
  repoFilters: string[];
  host: string;
  port: number;
  endpointFilter?: boolean | undefined;
  endpointHostFilter?: boolean | undefined;
  endpointPortFilter?: boolean | undefined;
  assetsDir?: string | undefined;
  cliEntrypoint: string;
  now?: Date | undefined;
}

export interface UiServiceLifecycleResult {
  command: UiServiceCommand;
  status: UiServiceStatus;
  reasonCode: UiServiceReasonCode;
  statePath: string;
  stateVersion?: 1 | undefined;
  pid?: number | undefined;
  url?: string | undefined;
  message: string;
  exitCode: 0 | 1;
}
