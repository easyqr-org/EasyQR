import { EasyQRError } from "../errors/EasyQRError.js";

interface WebSocketHandlers {
  onOpen?: () => void;
  onMessage?: (data: unknown) => void;
  onClose?: (code?: number, reason?: string) => void;
  onError?: (err: unknown) => void;
}

interface WebSocketConnection {
  close(): void;
}

interface WebSocketLike {
  onopen: null | (() => void);
  onmessage: null | ((event: { data?: unknown }) => void);
  onclose: null | ((event: { code?: number; reason?: string }) => void);
  onerror: null | ((event: unknown) => void);
  close: () => void;
}

type WebSocketConstructorLike = new (url: string) => WebSocketLike;

function parseMessage(raw: unknown): unknown {
  if (typeof raw !== "string") {
    return raw;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function connectWebSocket(
  url: string,
  handlers: WebSocketHandlers
): WebSocketConnection {
  const WSImpl = (globalThis as { WebSocket?: WebSocketConstructorLike })
    .WebSocket;
  if (!WSImpl) {
    handlers.onError?.(
      new EasyQRError("E_WS_CONNECT_FAILED", "WebSocket is not available")
    );
    return {
      close() {},
    };
  }

  let socket: WebSocketLike;
  try {
    socket = new WSImpl(url);
  } catch {
    handlers.onError?.(
      new EasyQRError("E_WS_CONNECT_FAILED", "Failed to create WebSocket")
    );
    return {
      close() {},
    };
  }

  socket.onopen = () => {
    handlers.onOpen?.();
  };

  socket.onmessage = (event) => {
    const parsed = parseMessage(event?.data);
    if (parsed === undefined) {
      return;
    }
    try {
      handlers.onMessage?.(parsed);
    } catch {
      // Ignore user callback errors to keep transport stable.
    }
  };

  socket.onclose = (event) => {
    handlers.onClose?.(event?.code, event?.reason);
  };

  socket.onerror = () => {
    handlers.onError?.(
      new EasyQRError("E_WS_CONNECT_FAILED", "WebSocket connection error")
    );
  };

  return {
    close() {
      try {
        socket.close();
      } catch {
        // Swallow close failures.
      }
    },
  };
}

