# 🚀 EasyQR — Real-Time Cross-Device QR Sync Platform


<p align="center">
  <b>A production-grade system that syncs QR scans from mobile to desktop in real-time.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success"/>
  <img src="https://img.shields.io/badge/Phase-2%20Completed-blue"/>
  <img src="https://img.shields.io/badge/WebSockets-Real--Time-purple"/>
  <img src="https://img.shields.io/badge/Mobile-Optimized-green"/>
</p>

---

## 🧠 What is EasyQR?

**EasyQR** is a **real-time, cross-device QR synchronization platform** that enables:

- 📱 Scanning a QR code on a **mobile device**
- 🌐 Secure real-time transmission via **WebSockets**
- 🖥 Instant reflection on a **desktop dashboard**
- 🔐 Session-based authentication using **JWT**
- ⚡ Zero refresh, zero polling, true real-time UX

This project is built with **production architecture**, **clear state management**, and **enterprise-grade UX clarity**.

---

## 🧩 Tech Stack

| Layer | Technology |
|-----|------------|
| Frontend | HTML · CSS · JavaScript |
| Mobile Scanner | ZXing |
| Real-Time Layer | WebSockets (WSS) |
| Backend | Node.js · Express |
| Auth | JWT |
| Tunneling | Ngrok |
| UI Design | Animated CSS · Glassmorphism |

---

## 🧭 Project Architecture

```text
Mobile Scanner
   ↓ (Camera Scan)
WebSocket (WSS)
   ↓
Node.js Server (Port 3000)
   ↓
WebSocket Broadcast
   ↓
Desktop UI (Live Update)
```
>One scan. One session. Instant sync.

🧱 Project Phases Overview
--------------------------

---

# 🧭 Project Roadmap — 8 Phase Execution Plan

> A **systematic, production-first roadmap** designed to transform a simple idea  
> into a **real-time, cross-device, secure scanning platform**.

---

## 🧱 Phase 1 — Core Architecture & Session System

**Objective:** Establish the foundational backend architecture.

### 🔑 Key Deliverables
- UUID-based session creation
- Secure JWT token generation
- Stateless session identification
- REST API foundation
- Health-check endpoints

### 🧠 Why It Matters
This phase ensures **identity, security, and scalability** from day one.

```text
Client → Session API → JWT → Secure Identity
```
✔ Production-ready backend base

✔ Stateless & scalable design

# 📱 Phase 2 — Mobile Scanner Engine

>Objective: Enable real-time barcode & QR scanning on mobile devices.

## 🔑 Key Deliverables

- ZXing-powered scanner

- Rear-camera prioritization

- Permission-safe camera access

- Visual scanning indicators

- Auto-reset after detection

### 🧠 Why It Matters

>Mobile is the primary input surface.

- This phase ensures reliability, speed, and UX clarity.

✔ iOS + Android compatible

✔ Zero silent failures

# 🔄 Phase 3 — Real-Time Scan Synchronization

> Objective: Sync mobile scan data live to desktop.

## 🔑 Key Deliverables

- WebSocket (WSS) bridge

- JWT-authenticated connections

- Session-based routing

- Instant scan propagation

- Multi-client handling


>Mobile → WebSocket → Node Server → Desktop

### 🧠 Why It Matters

Transforms scanning from isolated action to live system behavior.

✔ Real-time

✔ Zero refresh required

# 🖥 Phase 4 — Desktop Control Panel

> Objective: Provide a live desktop dashboard for scan consumption.

## 🔑 Key Deliverables

- Session creation UI

- Live connection status

- Scan result rendering

- Visual state indicators

- Elegant desktop UI

### 🧠 Why It Matters

# 🎨 Phase 5 — UX Polish & State Visibility

> Objective: Eliminate ambiguity through visual feedback.

## 🔑 Key Deliverables

- Explicit scan states

- Animated transitions

- Status indicators (Idle → Scanning → Detected)

- Error-safe UI paths

Idle → Camera Ready → Scanning → Detected → Reset

### 🧠 Why It Matters

- Great systems explain themselves to users.

✔ No dead states

✔ No confusion

# 🔐 Phase 6 — Security Hardening

> Objective: Protect data flow and session integrity.

## 🔑 Key Deliverables

- JWT verification on WebSocket

- Session isolation

- Token expiration handling

- Secure tunneling via Ngrok (WSS)

### 🧠 Why It Matters

 -Security is not optional — it’s architectural.

✔ Authenticated streams

✔ Secure real-time traffic

# 🧪 Phase 7 — End-to-End Testing & Validation

> Objective: Validate system behavior under real conditions.

## 🔑 Key Deliverables

- Cross-device testing (iOS, Android, Desktop)

- Network variability testing

- Multiple session handling

- Failure recovery validation

### 🧠 Why It Matters

- Confidence comes from proven execution, not assumptions.

✔ Production confidence

✔ Edge-case safe

# 📚 Phase 8 — Documentation & Presentation

> Objective: Make the system understandable, impressive, and transferable.

## 🔑 Key Deliverables

- Task-wise READMEs

- Architecture explanations

- GIF-based proofs



## 🧠 Why It Matters

- Great work deserves great presentation.

✔ Client-ready

✔ Recruiter-approved

**🚀 Eight phases. One cohesive system.**  
_Designed like a product. Built like an engineer._
## 🧩 **Key Features**

### 🔗 **1. QR Pairing**
- Desktop app generates a secure QR code  
- Phone scans → instant WebSocket connection  
- Token-based session validation

  
![QR Pairing](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjFxd2ZiNDFyYWx2dGg0cDh5bTZyMDIwdWVubThucGNodWg3MjlwaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LWocZxVYEzl8Y3LWIZ/giphy.gif)

### 🔌 **2. USB Session**
- Backup connection  
- Uses ADB reverse port  
- Same session security and handshake  

### 🛰️ **3. Real-Time Barcode Streaming**
- Ultra-low-latency WebSocket pipeline  
- Push barcode → immediate desktop display  

### 🧨 **4. Session Lifecycle**
CREATE → PAIR → CONNECTED → ACTIVE → TERMINATE

### 🖥️ **5. Windows Desktop App**
- Electron-based  
- QR generator  
- Session dashboard  
- Realtime barcode log  
- CSV export  

### 📱 **6. Mobile PWA Scanner**
- Camera scanning via getUserMedia  
- jsQR / ZXing for decoding  
- Auto-focus & vibration feedback  

---

<p align="center"><b>🏗️ SYSTEM ARCHITECTURE</b></p>


```text
                         ┌────────────────────────────┐
                         │        Desktop App         │
                         │     (Electron + React UI)  │
                         └──────────────┬─────────────┘
                                        │
                               WebSocket│
                                        │
                         ┌──────────────▼─────────────┐
                         │        Node.js Server      │
                         │    (Express + WS + Auth)   │
                         └──────────────┬─────────────┘
                      QR Pairing / USB  │
                                        │
                         ┌──────────────▼─────────────┐
                         │        Phone Scanner       │
                         │       (PWA / Web App)      │
                         └────────────────────────────┘
```
---

## 🧪 **Tech Stack**

### **Desktop**
- Electron  
- React  
- WebSocket client  
- QR generator  

### **Server**
- Node.js  
- Express  
- WS (WebSocket)  
- SQLite  

### **Mobile**
- PWA  
- jsQR / ZXing  
- Camera API  

---

[//]: # (<p align="center"><b>📁 Folder Structure</b></p>)

[//]: # (```text)

[//]: # (barcode-pairing/)

[//]: # (│)

[//]: # (├── desktop-app/)

[//]: # (│   ├── src/)

[//]: # (│   │   ├── main.js)

[//]: # (│   │   ├── preload.js)

[//]: # (│   │   └── renderer/)

[//]: # (│   ├── build/)

[//]: # (│   └── dist/)

[//]: # (│)

[//]: # (├── server/)

[//]: # (│   ├── src/)

[//]: # (│   │   ├── routes/)

[//]: # (│   │   ├── ws/)

[//]: # (│   │   ├── services/)

[//]: # (│   │   └── db/)

[//]: # (│   ├── tests/)

[//]: # (│   ├── .env.example)

[//]: # (│   └── package.json)

[//]: # (│)

[//]: # (├── mobile-scanner/)

[//]: # (│   ├── src/)

[//]: # (│   │   ├── index.html)

[//]: # (│   │   ├── scanner.js)

[//]: # (│   │   └── styles.css)

[//]: # (│   └── public/)

[//]: # (│)

[//]: # (├── docs/)

[//]: # (│   ├── SRS.md)

[//]: # (│   ├── ARCHITECTURE.md)

[//]: # (│   ├── API_SPEC.md)

[//]: # (│   └── USER_STORIES.md)

[//]: # (│)

[//]: # (└── README.md)

[//]: # ()
[//]: # (```)
---

## ⚙️ **Environment Variables**
```text
`server/.env.example`
PORT=3000
WS_PORT=4000
JWT_SECRET=replace_with_strong_key
SESSION_TTL_SECONDS=180
DATABASE_URL=sqlite:./data/dev.db
```
---

## ▶️ **Running the Project**

### **Server**
```bash
cd server
npm install
npm run dev

cd desktop-app
npm install
npm run dev

cd mobile-scanner
npm install
npm run dev

cd desktop-app
npm run build
npm run dist
```
🔐 Security Features
Signed QR payload
Token expiration
WS authentication
Sanitized barcode data
Session expiry & force-terminate

🧭 Roadmap
 BLE-based pairing
 Offline-first scanning mode
 Cloud sync with user accounts
 Multi-device session support
 
🤝 Contributing
Pull requests are welcome!
Follow the guidelines in CONTRIBUTING.md.

⭐ Support the Project
If you like this project, don’t forget to star the repository 🌟
Your support motivates future improvements!

📝 License
MIT License — Free to use and modify.

<p align="center"> <b>Built with ⚡ passion, 📱 creativity, and 🧠 innovation.</b> </p>

---
