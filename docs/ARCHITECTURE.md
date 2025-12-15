# 🏗️ EasyQR — System Architecture

## 📌 Overview

EasyQR is a session-based phone-to-desktop communication system designed to enable secure pairing and real-time data exchange using QR codes and WebSockets.

Phase 1 establishes the **core communication backbone** of the system, focusing entirely on architecture, session management, and connectivity.

---

## 🎯 Architecture Goals

- Secure session-based pairing
- Real-time, low-latency communication
- Clear separation of responsibilities
- Scalable foundation for future features

---

## 🧠 High-Level Architecture

```text
                         ┌────────────────────────────┐
                         │        Desktop App         │
                         │   (Electron + Renderer UI) │
                         └──────────────┬─────────────┘
                                        │
                               HTTP + WS│
                                        │
                         ┌──────────────▼─────────────┐
                         │        Backend Server      │
                         │   (Node.js + Express + WS) │
                         └──────────────┬─────────────┘
                        QR Pairing / JWT│
                                        │
                         ┌──────────────▼─────────────┐
                         │        Mobile Client        │
                         │      (Web / PWA Client)     │
                         └────────────────────────────┘
```
🧩 Component Responsibilities

🖥️ Desktop Application
```bash
Initiates session creation
Requests session token from server
Generates QR payload
Opens WebSocket connection
Updates UI based on session state
```

🌐 Backend Server
```bash
Creates and manages sessions
Issues short-lived JWT tokens
Validates WebSocket handshake
Tracks session lifecycle
Emits connection state events
```
📱 Mobile Client
```bash
Scans QR code
Extracts session credentials
Establishes WebSocket connection
Participates as a session endpoint
```
🔁 Data Flow (Phase 1)
```text
Desktop → POST /create-session
Server  → sessionId + JWT
Desktop → QR rendered
Client  → QR scanned
Client  → WebSocket connect
Server  → token validated
Server  → CONNECTED event
Desktop → Status updated
```
🧬 Session Lifecycle
```bash
PENDING → CONNECTED → TERMINATED
```
State Definitions
```bash
PENDING: Session created, awaiting pairing
CONNECTED: Desktop and client successfully linked
TERMINATED: Session closed or expired
```
🔐 Security Considerations
```text
Short-lived JWT tokens (30 minutes)
Unique sessionId per session
Token validation before WebSocket upgrade
Server-controlled session lifecycle
No client-side session trust
```
🧠 Design Decisions
```text
Why QR-Based Pairing?
Eliminates manual input
Fast and user-friendly
Proven industry pattern
```
Why WebSockets?
```bash
Bidirectional real-time communication
Efficient session management
Low latency compared to polling
Why In-Memory Sessions (Phase 1)?
Faster iteration
Simpler debugging
Easy migration to Redis/DB later
```
📦 Phase Scope Boundary
```text
✔ Included in Phase 1
Core architecture
Session management
Secure connectivity
Documentation
```
🚫 Excluded from Phase 1
```text
Barcode scanning
UI/UX polish
Persistent storage
```
