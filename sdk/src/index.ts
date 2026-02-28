export { createEasyQRClient } from "./client/easyqrClient.js";
export { EasyQRError } from "./errors/EasyQRError.js";

export type { EasyQRClient } from "./client/easyqrClient.js";
export type { EasyQRClientConfig, ConnectOptions } from "./types/config.js";
export type {
  CreateSessionRequest,
  CreateSessionResponse,
  ScanPayload,
  SessionInfo,
  SessionState,
} from "./types/session.js";
export type {
  EasyQREventMap,
  EasyQREventName,
  EasyQREventHandler,
} from "./types/events.js";
export type { EasyQRErrorCode } from "./types/errors.js";
