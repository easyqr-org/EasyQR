import { useEffect, useMemo, useState } from "react";
import {
  createEasyQRClient,
  type CreateSessionResponse,
  type ScanPayload,
  type SessionState,
} from "@easyqr/sdk";

type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface UseEasyQRState {
  startHost: () => Promise<void>;
  disconnect: () => Promise<void>;
  state: ConnectionState;
  session: CreateSessionResponse | null;
  lastScan: ScanPayload[];
  error: string | null;
}

/*
 ✅ REAL SDK CONFIG
*/
const client = createEasyQRClient({
  baseUrl: "http://localhost:3000",
  projectId: "react_demo",
  apiKey:
    "9f6520686452c580f7773c19413b689627c5170491b4b6838390cff3d8a22a37",
});

export function useEasyQR(): UseEasyQRState {
  const sdk = useMemo(() => client, []);

  const [state, setState] = useState<ConnectionState>("idle");
  const [session, setSession] =
    useState<CreateSessionResponse | null>(null);
  const [lastScan, setLastScan] = useState<ScanPayload[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSessionState = (payload: {
      sessionId: string;
      state: SessionState;
    }) => {
      setSession((current) => {
        if (!current) return current;

        if (current.session.sessionId !== payload.sessionId)
          return current;

        return {
          ...current,
          session: {
            ...current.session,
            state: payload.state,
          },
        };
      });
    };

    const handleScanReceived = (payload: {
      scan: ScanPayload;
    }) => {
      setLastScan((prev) => [payload.scan, ...prev].slice(0, 20));
    };

    const handleConnectionOpen = () => {
      setState("connected");
      setError(null);
    };

    const handleConnectionClosed = () => {
      setState("disconnected");
    };

    const handleConnectionError = (payload: {
      code: string;
      message: string;
    }) => {
      setState("error");
      setError(`${payload.code}: ${payload.message}`);
    };

    sdk.on("session.state", handleSessionState);
    sdk.on("scan.received", handleScanReceived);
    sdk.on("connection.open", handleConnectionOpen);
    sdk.on("connection.closed", handleConnectionClosed);
    sdk.on("connection.error", handleConnectionError);

    return () => {
      sdk.off("session.state", handleSessionState);
      sdk.off("scan.received", handleScanReceived);
      sdk.off("connection.open", handleConnectionOpen);
      sdk.off("connection.closed", handleConnectionClosed);
      sdk.off("connection.error", handleConnectionError);
      void sdk.destroy();
    };
  }, [sdk]);

  const startHost = async () => {
    setState("connecting");
    setError(null);

    try {
      const created = await sdk.startHost();
      setSession(created);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unknown error";
      setState("error");
      setError(msg);
    }
  };

  const disconnect = async () => {
    try {
      await sdk.disconnect();
      setState("disconnected");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unknown error";
      setState("error");
      setError(msg);
    }
  };

  return {
    startHost,
    disconnect,
    state,
    session,
    lastScan,
    error,
  };
}