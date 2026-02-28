export type SessionState =
  | "CREATED"
  | "WAITING_MOBILE"
  | "ACTIVE"
  | "CLOSED"
  | "EXPIRED";

export interface SessionInfo {
  sessionId: string;
  projectId: string;
  state: SessionState;
  expiresAt: number;
}

export interface CreateSessionRequest {
  context?: Record<string, unknown>;
}

export interface CreateSessionResponse {
  session: SessionInfo;
  desktopUrl: string;
  mobileUrl: string;
  token: string;
}

export interface ScanPayload {
  sessionId: string;
  value: string;
  format: string;
  timestamp: number;
  source?: string;
}
