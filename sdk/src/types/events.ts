import type { ScanPayload, SessionState } from "./session.js";

export interface EasyQREventMap {
  "session.state": { sessionId: string; state: SessionState };
  "scan.received": { scan: ScanPayload };
  "connection.open": { sessionId: string; role: "HOST" | "MOBILE" };
  "connection.closed": { sessionId?: string; reason?: string };
  "connection.error": { code: string; message: string };
}

export type EasyQREventName = keyof EasyQREventMap;

export type EasyQREventHandler<TEvent extends EasyQREventName> = (
  payload: EasyQREventMap[TEvent]
) => void;
