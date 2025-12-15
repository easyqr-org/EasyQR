# 🧱 PHASE 1 — Core Architecture & Session System

<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZHVpYjM1N2J2bHFnbHhvdm40d2g0N2x4cWRrZXRnNXN6aDdwM3p4MSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LMt9638dO8dftAjtco/giphy.gif" width="420" />
</p>

---

## 🎯 Phase Goal

By the end of **Phase 1**, the system should **talk correctly** — no polish, no distractions.

You will be able to:

- ✅ Create a session from **Desktop**
- ✅ Pair **Phone ↔ Desktop** using **QR**
- ✅ Establish a **live WebSocket connection**
- ✅ See **“Connected”** state on Desktop  

🚫 No barcode scanning  
🚫 No UI polish  
🧠 **Pure architecture & communication**

---

## 🧠 Mental Model (Read This First)

Think of the system like a pipeline:

Desktop creates session
↓
Server stores session
↓
Desktop shows QR
↓
Phone scans QR
↓
Phone connects to server
↓
Server links phone ↔ desktop
↓
Desktop sees "Connected"

Once this clicks — everything else becomes easy.

---

## 📦 Phase 1 — Task Breakdown

---

### 🔹 TASK 1 — Finalize Folder & Project Setup

**Objective**  
Create a clean base so future work never breaks.

**Steps**
```bash
EasyQR/
├── server/
├── desktop-app/
└── mobile-scanner/
git init
```
Push base structure to GitHub.
✅ Success Check

Repo has folders
No code yet
Clean commit
chore: initial project structure

🔹 TASK 2 — Setup Backend Server (Node + Express)
Objective
Backend that can create sessions and later accept WebSocket connections.
Steps
```bash
cd server
npm init -y
npm install express cors uuid jsonwebtoken ws
```
```text
File Structure
server/
├── src/
│   ├── index.js
│   └── sessionStore.js

```
index.js should
Start Express server
Create /health endpoint
✅ Success Check
localhost:3000/health returns:
{ "status": "ok" }

🔹 TASK 3 — Create Session Logic (CRITICAL)
Objective
Server creates and manages sessions.
Session Contains

sessionId
token (JWT, valid 2–3 mins)
createdAt
status = PENDING
API
POST /create-session
Example Session
```bash
{
  "sessionId": "abc123",
  "status": "PENDING"
}
Response
{
  "sessionId": "abc123",
  "token": "jwt_here"
}
```
✅ Success Check
API returns sessionId + token

🔹 TASK 4 — Create WebSocket Server
Objective
Allow devices to connect using sessionId + token.
Steps

Start WebSocket server using ws
Validate JWT
Match session
Mark session as CONNECTED
Handshake Payload
```bash
{
  "sessionId": "abc123",
  "token": "jwt_here"
}
```
✅ Success Check
Session abc123 connected

🔹 TASK 5 — Desktop App (Electron – Minimal)
Objective
Desktop can talk to the backend.
Structure
```text
desktop-app/
├── main.js
└── renderer/
```
UI
Button: Create Session
Text: Session Status
Action
Button → POST /create-session
✅ Success Check
Clicking button logs sessionId

🔹 TASK 6 — Generate QR Code on Desktop
Objective
QR should carry everything needed to connect.
QR Payload
```bash
{
  "sessionId": "abc123",
  "token": "jwt_here",
  "server": "ws://localhost:4000"
}
```
Steps
Install QR library
Render QR in Desktop UI
✅ Success Check
QR visible
Phone camera can scan it

🔹 TASK 7 — Mobile Scanner: QR → WebSocket
Objective
Phone scans QR and connects to server.
Steps

Create basic web page
Access camera
Decode QR
Open WebSocket using payload
✅ Success Check
Server logs phone connected
Desktop receives connection update

🔹 TASK 8 — Session State Sync
Objective
Desktop must reflect real-time session state.
Server Message
```bash
{ "type": "CONNECTED" }
Desktop
Listen to WebSocket
Update UI
✅ Success Check
UI changes: Waiting → Connected

🏁 Phase 1 Completion Checklist
You are DONE when:
✅ Server runs
✅ Session API works
✅ QR is generated
✅ Phone scans QR
✅ WebSocket connects
✅ Desktop shows Connected

learnings:- 
Client–Server Architecture
Session-based communication
WebSockets (real-time systems)
Token-based security
System-level thinking



