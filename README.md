# EasyQR
A fast, secure barcode-scanning ecosystem that pairs your phone with a desktop using QR or USB. Real-time sync, smooth sessions, instant scan flow, and a clean Windows app—built for speed, reliability, and a powerful scanning experience.
<h1 align="center">📱➡️🖥️ PairCode Connect  
A Smart Phone-to-Desktop Barcode Scanning System</h1>

<p align="center">
  <img src="https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExdG95bnZsdGlmOXdkb2h2MGpqMGRzNWhuODRyZHZhaG92ZHJvOGY1NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/qgQUggAC3Pfv687qPC/giphy.gif" width="220"/>
</p>

<p align="center">
  <b>A blazing-fast, secure, and modern system that pairs your phone with your desktop using QR or USB, enabling instant barcode scanning and real-time data transfer.</b>
</p>

---

## 🚀 **Project Overview**
PairCode Connect transforms any smartphone into a high-speed barcode scanner paired directly with a Windows desktop app.  
It supports:

- 🔗 **QR-based pairing**
- 🔌 **USB session connection**
- 📡 **Real-time barcode streaming**
- 🔐 **Secure token-based authentication**
- 🧭 **Session creation & termination**
- 🖥️ **Windows desktop application interface**
- 🌐 **PWA-based mobile scanner**
- 🧩 **Bliski desktop scanner integration (optional)**

This project is built for speed, reliability, and smooth workflow automation.

---

![Scanner Animation](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzNxZ2ZxYjh1MGh4NXowMmJhZWlvZTkwY2U4Z244MnZ6M2tjYWZpMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/iIqmM5tTjmpOB9mpbn/giphy.gif)

---

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

<p align="center"><b>📁 Folder Structure</b></p>

```text
barcode-pairing/
│
├── desktop-app/
│   ├── src/
│   │   ├── main.js
│   │   ├── preload.js
│   │   └── renderer/
│   ├── build/
│   └── dist/
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── ws/
│   │   ├── services/
│   │   └── db/
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── mobile-scanner/
│   ├── src/
│   │   ├── index.html
│   │   ├── scanner.js
│   │   └── styles.css
│   └── public/
│
├── docs/
│   ├── SRS.md
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   └── USER_STORIES.md
│
└── README.md

```
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

<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2RqZDA1NTJhamQxY2c1ZWR2Zno0bHlsbjQ0dnVuanlmeGkwaGNzcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MTbya3k32GED2EyPEX/giphy.gif" width="420" alt="Project Animation"/>
</p>
