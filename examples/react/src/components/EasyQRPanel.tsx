import { useEasyQR } from "../hooks/useEasyQR";
import type { EasyQRClientConfig } from "@easyqr/sdk";

interface Props {
  config: EasyQRClientConfig;
}

export default function EasyQRPanel({ config }: Props) {
  const { startHost, disconnect, state, session, lastScan, error } = useEasyQR(config);

  return (
    <div style={{ maxWidth: 760, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>EasyQR React Starter</h1>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
        <button onClick={() => void startHost()}>Create Session</button>
        <button onClick={() => void disconnect()}>Disconnect</button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div><strong>Connection State:</strong> {state}</div>
        <div><strong>Session ID:</strong> {session?.session.sessionId || "-"}</div>
        <div><strong>Session State:</strong> {session?.session.state || "-"}</div>
        <div>
          <strong>Mobile URL:</strong>{" "}
          {session ? (
            <a href={session.mobileUrl} target="_blank" rel="noreferrer">Open Mobile</a>
          ) : (
            "-"
          )}
        </div>
      </div>

      {error ? (
        <div style={{ color: "#b00020", marginBottom: "1rem" }}>
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      <div>
        <h2>Live Scan Values</h2>
        {lastScan.length === 0 ? <div>No scans yet.</div> : null}
        <ul>
          {lastScan.map((scan, idx) => (
            <li key={`${scan.sessionId}-${scan.timestamp}-${idx}`}>
              {scan.value} ({scan.format}) @ {new Date(scan.timestamp).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
