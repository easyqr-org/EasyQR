import type { EasyQRClientConfig, ConnectOptions } from "../types/config.js";
import type {
  EasyQREventHandler,
  EasyQREventMap,
  EasyQREventName,
} from "../types/events.js";
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  ScanPayload,
  SessionState,
} from "../types/session.js";
import { createSessionRequest } from "../transport/http.js";
import { connectWebSocket } from "../transport/ws.js";
import { createEmitter } from "../events/emitter.js";
import { EasyQRError } from "../errors/EasyQRError.js";

export interface EasyQRClient {
  createSession(input: CreateSessionRequest): Promise<CreateSessionResponse>;
  startHost(input?: CreateSessionRequest): Promise<CreateSessionResponse>;
  startMobile(sessionId: string): Promise<void>;
  connectHost(options: ConnectOptions): Promise<void>;
  connectMobile(options: ConnectOptions): Promise<void>;
  disconnect(sessionId?: string): Promise<void>;
  on<TEvent extends EasyQREventName>(
    event: TEvent,
    handler: EasyQREventHandler<TEvent>
  ): void;
  off<TEvent extends EasyQREventName>(
    event: TEvent,
    handler: EasyQREventHandler<TEvent>
  ): void;
  destroy(): Promise<void>;
}

export function createEasyQRClient(config: EasyQRClientConfig): EasyQRClient {
  let activeConnection: { close(): void } | null = null;
  let activeSessionId: string | null = null;
  let activeRole: "HOST" | "MOBILE" | null = null;
  let currentSessionId: string | undefined;
  let connectionRole: "HOST" | "MOBILE" | undefined;
  let connected = false;
  let manualDisconnectPending = false;
  const emitter = createEmitter<EasyQREventMap>();

  function toWsBaseUrl(baseUrl: string): string {
    const normalized = new URL(baseUrl);
    normalized.protocol = normalized.protocol === "https:" ? "wss:" : "ws:";
    normalized.pathname = "/ws";
    normalized.search = "";
    return normalized.toString();
  }

  function buildWsUrl(
    baseUrl: string,
    role: "HOST" | "MOBILE",
    options: ConnectOptions
  ): string {
    const wsUrl = new URL(toWsBaseUrl(baseUrl));
    wsUrl.searchParams.set("sessionId", options.sessionId);
    wsUrl.searchParams.set("role", role);
    return wsUrl.toString();
  }

  function emitConnectionError(error: unknown): void {
    if (error instanceof EasyQRError) {
      emitter.emit("connection.error", {
        code: error.code,
        message: error.message,
      });
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown connection error";
    emitter.emit("connection.error", {
      code: "E_WS_CONNECT_FAILED",
      message,
    });
  }

  function mapWsMessage(message: unknown): void {
    if (!message || typeof message !== "object") {
      return;
    }

    const frame = message as {
      type?: unknown;
      sessionId?: unknown;
      state?: unknown;
      payload?: unknown;
    };
    if (frame.type === "SESSION_STATE") {
      if (typeof frame.sessionId !== "string" || typeof frame.state !== "string") {
        return;
      }
      if (!isSessionState(frame.state)) {
        return;
      }
      emitter.emit("session.state", {
        sessionId: frame.sessionId,
        state: frame.state,
      });
      return;
    }

    if (frame.type === "SCAN") {
      if (!isScanPayload(frame.payload)) {
        return;
      }
      emitter.emit("scan.received", {
        scan: frame.payload,
      });
    }
  }

  function isSessionState(value: string): value is SessionState {
    return (
      value === "CREATED" ||
      value === "WAITING_MOBILE" ||
      value === "ACTIVE" ||
      value === "CLOSED" ||
      value === "EXPIRED"
    );
  }

  function isScanPayload(payload: unknown): payload is ScanPayload {
    if (!payload || typeof payload !== "object") return false;
    const scan = payload as Record<string, unknown>;
    return (
      typeof scan.sessionId === "string" &&
      typeof scan.value === "string" &&
      typeof scan.format === "string" &&
      typeof scan.timestamp === "number"
    );
  }

  function openConnection(role: "HOST" | "MOBILE", options: ConnectOptions): void {
    if (!options.sessionId) {
      throw new EasyQRError("E_INTERNAL", "Missing sessionId for WebSocket connect");
    }
    if (connected || activeConnection) {
      throw new EasyQRError("E_INTERNAL", "Connection already active");
    }
    activeSessionId = options.sessionId;
    activeRole = role;
    currentSessionId = options.sessionId;
    connectionRole = role;
    connected = true;
    manualDisconnectPending = false;
    activeConnection = connectWebSocket(buildWsUrl(config.baseUrl, role, options), {
      onOpen: () => {
        if (currentSessionId && connectionRole) {
          emitter.emit("connection.open", {
            sessionId: currentSessionId,
            role: connectionRole,
          });
        }
      },
      onMessage: (data) => {
        mapWsMessage(data);
      },
      onClose: (_code, reason) => {
        if (manualDisconnectPending) {
          manualDisconnectPending = false;
          return;
        }
        connected = false;
        activeConnection = null;
        activeRole = null;
        connectionRole = undefined;
        currentSessionId = undefined;
        emitter.emit("connection.closed", {
          sessionId: activeSessionId || undefined,
          reason,
        });
      },
      onError: (error) => {
        emitConnectionError(error);
      },
    });
  }

  return {
    async createSession(input: CreateSessionRequest): Promise<CreateSessionResponse> {
      return createSessionRequest(config, input);
    },
    async startHost(input: CreateSessionRequest = {}): Promise<CreateSessionResponse> {
      if (connected || activeConnection) {
        throw new EasyQRError("E_INTERNAL", "Cannot start host while already connected");
      }
      const session = await createSessionRequest(config, input);
      currentSessionId = session.session.sessionId;
      openConnection("HOST", { sessionId: currentSessionId });
      return session;
    },
    async startMobile(sessionId: string): Promise<void> {
      if (!sessionId) {
        throw new EasyQRError("E_INTERNAL", "Missing sessionId for mobile start");
      }
      currentSessionId = sessionId;
      openConnection("MOBILE", { sessionId });
    },
    async connectHost(options: ConnectOptions): Promise<void> {
      openConnection("HOST", options);
    },
    async connectMobile(options: ConnectOptions): Promise<void> {
      if (!options.sessionId) {
        throw new EasyQRError("E_INTERNAL", "Missing sessionId for mobile connect");
      }
      openConnection("MOBILE", options);
    },
    async disconnect(_sessionId?: string): Promise<void> {
      if (activeConnection) {
        manualDisconnectPending = true;
        activeConnection.close();
        connected = false;
        emitter.emit("connection.closed", {
          sessionId: activeSessionId || undefined,
          reason: "client_disconnect",
        });
        activeConnection = null;
      }
      currentSessionId = undefined;
      connectionRole = undefined;
      activeSessionId = null;
      activeRole = null;
    },
    on<TEvent extends EasyQREventName>(
      event: TEvent,
      handler: EasyQREventHandler<TEvent>
    ): void {
      emitter.on(event, handler);
    },
    off<TEvent extends EasyQREventName>(
      event: TEvent,
      handler: EasyQREventHandler<TEvent>
    ): void {
      emitter.off(event, handler);
    },
    async destroy(): Promise<void> {
      await this.disconnect();
      emitter.clear();
      activeConnection = null;
      activeSessionId = null;
      activeRole = null;
      currentSessionId = undefined;
      connectionRole = undefined;
      connected = false;
      manualDisconnectPending = false;
    },
  };
}
